// Mistake Re-attempt Edge Function: build a private mock from the student's wrong answers
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Find all wrong responses from the user's submitted attempts
    const { data: wrongResponses, error: respError } = await serviceClient
      .from('responses')
      .select(`
        question_id,
        attempt:attempt_id ( id, status, user_id, mock_test_id )
      `)
      .eq('is_correct', false)
      .eq('attempt.user_id', user.id)
      .eq('attempt.status', 'SUBMITTED');

    if (respError) {
      return new Response(JSON.stringify({ error: respError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate question IDs (a student may have gotten the same question wrong in multiple attempts)
    const wrongQuestionIds = [...new Set(
      (wrongResponses || [])
        .map((r: { question_id: string }) => r.question_id)
    )];

    if (wrongQuestionIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No wrong answers to re-attempt yet.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit to 30 questions max, shuffle for variety
    const shuffled = [...wrongQuestionIds].sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, 30);

    // Get a default marking scheme from a standard mock
    const { data: refMock } = await serviceClient
      .from('mock_tests')
      .select('marking_scheme')
      .eq('status', 'PUBLISHED')
      .limit(1)
      .maybeSingle();

    const markingScheme = refMock?.marking_scheme || {
      mcq: { correct: 4, wrong: -1 },
      numerical: { correct: 4, wrong: 0 },
    };

    // Create a private MISTAKE_REATTEMPT mock
    const { data: newMock, error: mockError } = await serviceClient
      .from('mock_tests')
      .insert({
        title: 'Mistake Re-attempt',
        category: 'Mistake Re-attempt',
        mode: 'PRACTICE',
        duration_min: Math.min(180, selectedIds.length * 3),
        total_marks: selectedIds.length * 4,
        access: 'FREE',
        status: 'PUBLISHED',
        kind: 'MISTAKE_REATTEMPT',
        owner_user_id: user.id,
        visibility: 'PRIVATE',
        marking_scheme: markingScheme,
        meta_json: { question_count: selectedIds.length },
      })
      .select('id')
      .single();

    if (mockError) {
      return new Response(JSON.stringify({ error: mockError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link questions to the mock
    const mtqRows = selectedIds.map((questionId, i) => ({
      mock_test_id: newMock.id,
      question_id: questionId,
      position: i + 1,
      section: 'A',
    }));

    const { error: linkError } = await serviceClient
      .from('mock_test_questions')
      .insert(mtqRows);

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      mock_test_id: newMock.id,
      question_count: selectedIds.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

