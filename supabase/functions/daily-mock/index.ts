// Daily Target Mock Edge Function: generate or fetch today's daily mock for the student
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

    // Fetch the user's daily_mock_size preference (default 15)
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('daily_mock_size')
      .eq('id', user.id)
      .maybeSingle();

    const mockSize = profile?.daily_mock_size ?? 15;

    let difficulty = 'ANY';
    try {
      const body = await req.json();
      if (body && typeof body.difficulty === 'string') difficulty = body.difficulty;
    } catch {
      difficulty = 'ANY';
    }
    if (!['ANY', 'EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute today's date in Asia/Kolkata
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const forDate = istTime.toISOString().split('T')[0];

    // Check if a daily mock already exists for today
    const { data: existing } = await serviceClient
      .from('user_daily_mocks')
      .select('mock_test_id')
      .eq('user_id', user.id)
      .eq('for_date', forDate)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        mock_test_id: existing.mock_test_id,
        for_date: forDate,
        already_exists: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: mockTestId, error: buildError } = await serviceClient.rpc('build_daily_target_mock', {
      p_user: user.id,
      p_count: mockSize,
      p_for_date: forDate,
      p_difficulty: difficulty,
    });

    if (buildError) {
      return new Response(JSON.stringify({ error: buildError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      mock_test_id: mockTestId,
      for_date: forDate,
      already_exists: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
