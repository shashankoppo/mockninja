// Exam Edge Function: start, get, save, submit+grade, results
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExamQuestion {
  id: string;
  type: 'MCQ' | 'NUMERICAL';
  statement_tex: string;
  options_json: { id: string; text: string }[] | null;
  chapter_id: number;
  difficulty: string;
  position: number;
  section: string | null;
}

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
    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle();
    if (callerProfile?.status === 'SUSPENDED') {
      return new Response(JSON.stringify({ error: 'Your account is suspended and cannot use exam actions.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (req.method === 'GET' ? 'get' : 'submit');

    // ─── START: create a new attempt ───
    if (action === 'start') {
      const { mock_test_id } = await req.json();
      if (!mock_test_id) {
        return new Response(JSON.stringify({ error: 'mock_test_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const [{ data: profile }, { data: mockTest }] = await Promise.all([
        serviceClient.from('profiles').select('exam_timer_mode, exam_timer_minutes').eq('id', user.id).maybeSingle(),
        serviceClient.from('mock_tests').select('duration_min, status, access, marking_scheme, total_marks').eq('id', mock_test_id).maybeSingle(),
      ]);

      if (!profile) {
        const { error: profileError } = await serviceClient.from('profiles').upsert(
          {
            id: user.id,
            email: user.email ?? null,
            full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );
        if (profileError) {
          return new Response(JSON.stringify({ error: 'Your profile could not be found. Please sign out and sign in again.' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!mockTest || mockTest.status !== 'PUBLISHED') {
        return new Response(JSON.stringify({ error: 'Mock test is not available' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (mockTest.access === 'PREMIUM') {
        const { data: subs } = await serviceClient
          .from('user_subscriptions')
          .select('status, expires_at, plan:subscription_plans(price_inr)')
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE');
        const nowMs = Date.now();
        const hasPaidPlan = (subs ?? []).some((s: { expires_at: string | null; plan: { price_inr: number } | null }) =>
          (s.plan?.price_inr ?? 0) > 0 && (!s.expires_at || new Date(s.expires_at).getTime() > nowMs));
        if (!hasPaidPlan) {
          return new Response(JSON.stringify({ error: 'This mock test needs an active paid plan. Choose a plan to unlock premium mocks.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const timerMode = profile?.exam_timer_mode || 'STANDARD';
      const isUntimed = timerMode === 'UNTIMED';
      const durationMin = isUntimed
        ? null
        : timerMode === 'CUSTOM' && profile?.exam_timer_minutes
          ? profile.exam_timer_minutes
          : mockTest.duration_min;

      // Check for existing in-progress attempt
      const { data: existing } = await serviceClient
        .from('attempts')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('mock_test_id', mock_test_id)
        .eq('status', 'IN_PROGRESS')
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ attempt_id: existing.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: watermarkRow, error: watermarkError } = await serviceClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'WATERMARK_POLICY')
        .maybeSingle();

      if (watermarkError) {
        return new Response(JSON.stringify({ error: watermarkError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Snapshot the marking scheme at start time so a mid-exam rule change
      // cannot alter the grading of this attempt.
      const blueprintSnapshot = {
        marking_scheme: (mockTest as Record<string, unknown>)?.marking_scheme ?? {},
        total_marks: (mockTest as Record<string, unknown>)?.total_marks ?? 0,
      };

      const { data: attempt, error: attError } = await serviceClient
        .from('attempts')
        .insert({
          user_id: user.id,
          mock_test_id,
          status: 'IN_PROGRESS',
          duration_min: durationMin,
          is_untimed: isUntimed,
          watermark_snapshot: watermarkRow?.value ?? null,
          blueprint_snapshot: blueprintSnapshot,
        })
        .select('id')
        .single();

      if (attError) {
        return new Response(JSON.stringify({ error: attError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ attempt_id: attempt.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── GET: fetch questions for an attempt ───
    if (action === 'get' && req.method === 'GET') {
      const attemptId = url.searchParams.get('attempt_id');
      if (!attemptId) {
        return new Response(JSON.stringify({ error: 'attempt_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership
      const { data: attempt, error: attError } = await serviceClient
        .from('attempts')
        .select('id, status, mock_test_id, started_at, submitted_at, score, duration_min, is_untimed, watermark_snapshot')
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (attError || !attempt) {
        return new Response(JSON.stringify({ error: 'Attempt not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch mock test details
      const { data: mockTest } = await serviceClient
        .from('mock_tests')
        .select('id, title, duration_min, total_marks, marking_scheme, mode, meta_json')
        .eq('id', attempt.mock_test_id)
        .maybeSingle();

      // Fetch questions — DO NOT send answer_json, solution_tex, or tolerance to client
      const { data: mtqs, error: mtqError } = await serviceClient
        .from('mock_test_questions')
        .select('question_id, position, section')
        .eq('mock_test_id', attempt.mock_test_id)
        .order('position');

      if (mtqError) {
        return new Response(JSON.stringify({ error: mtqError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const questionIds = (mtqs || []).map((m) => m.question_id);
      if (questionIds.length === 0) {
        return new Response(JSON.stringify({
          attempt, mock_test: mockTest, questions: [], responses: {},
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: questions, error: qError } = await serviceClient
        .from('questions')
        .select('id, type, statement_tex, options_json, chapter_id, difficulty')
        .in('id', questionIds);

      if (qError) {
        return new Response(JSON.stringify({ error: qError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch chapter→subject mapping for sorting
      const chapterIds = new Set((questions || []).map((q) => q.chapter_id).filter((id) => id > 0));
      let subjectSortMap = new Map<number, string>();
      if (chapterIds.size > 0) {
        const { data: chapters } = await serviceClient
          .from('chapters')
          .select('id, subject_id, subject:subject_id ( name )')
          .in('id', Array.from(chapterIds));
        for (const c of chapters || []) {
          const sName = (c.subject as { name?: string })?.name || 'Other';
          subjectSortMap.set(c.id, sName);
        }
      }

      const SUBJECT_ORDER = ['Physics', 'Chemistry', 'Mathematics', 'Maths'];

      // Merge with position/section, strip answer fields
      const questionMap = new Map((questions || []).map((q) => [q.id, q]));
      const examQuestions: ExamQuestion[] = (mtqs || []).map((mtq) => {
        const q = questionMap.get(mtq.question_id);
        return {
          id: mtq.question_id,
          type: q?.type || 'MCQ',
          statement_tex: q?.statement_tex || '',
          options_json: q?.options_json || null,
          chapter_id: q?.chapter_id || 0,
          difficulty: q?.difficulty || 'MEDIUM',
          position: mtq.position,
          section: mtq.section,
        };
      });

      // Sort: by subject order (Physics → Chemistry → Maths), then Section A (MCQ) before Section B (NUMERICAL), then position
      examQuestions.sort((a, b) => {
        const subjA = subjectSortMap.get(a.chapter_id) || 'Other';
        const subjB = subjectSortMap.get(b.chapter_id) || 'Other';
        const siA = SUBJECT_ORDER.indexOf(subjA);
        const siB = SUBJECT_ORDER.indexOf(subjB);
        const subjCmp = (siA === -1 ? 999 : siA) - (siB === -1 ? 999 : siB);
        if (subjCmp !== 0) return subjCmp;
        // MCQ (Section A) before NUMERICAL (Section B)
        const typeCmp = (a.type === 'MCQ' ? 0 : 1) - (b.type === 'MCQ' ? 0 : 1);
        if (typeCmp !== 0) return typeCmp;
        return a.position - b.position;
      });

      // Fetch existing responses (student's saved answers)
      const { data: responses } = await serviceClient
        .from('responses')
        .select('question_id, answer, time_spent_sec, flagged')
        .eq('attempt_id', attemptId);

      const responseMap: Record<string, { answer: unknown; time_spent_sec: number; flagged: boolean }> = {};
      for (const r of responses || []) {
        responseMap[r.question_id] = {
          answer: r.answer,
          time_spent_sec: r.time_spent_sec || 0,
          flagged: r.flagged || false,
        };
      }

      return new Response(JSON.stringify({
        attempt,
        mock_test: mockTest,
        questions: examQuestions,
        responses: responseMap,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── SAVE: upsert a single response (autosave) ───
    if (action === 'save') {
      const { attempt_id, question_id, answer, time_spent_sec, flagged } = await req.json();
      if (!attempt_id || !question_id) {
        return new Response(JSON.stringify({ error: 'attempt_id and question_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership
      const { data: attempt } = await serviceClient
        .from('attempts')
        .select('id, status')
        .eq('id', attempt_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!attempt) {
        return new Response(JSON.stringify({ error: 'Attempt not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (attempt.status !== 'IN_PROGRESS') {
        return new Response(JSON.stringify({ error: 'Attempt already submitted' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert response (unique constraint on attempt_id + question_id)
      const { error: upsertError } = await serviceClient
        .from('responses')
        .upsert({
          attempt_id,
          question_id,
          answer: answer || null,
          time_spent_sec: time_spent_sec || 0,
          flagged: flagged || false,
        }, { onConflict: 'attempt_id,question_id' });

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── SUBMIT: grade the attempt ───
    if (action === 'submit') {
      const { attempt_id, responses: clientResponses } = await req.json();
      if (!attempt_id) {
        return new Response(JSON.stringify({ error: 'attempt_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership and status
      const { data: attempt } = await serviceClient
        .from('attempts')
        .select('id, status, mock_test_id, blueprint_snapshot')
        .eq('id', attempt_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!attempt) {
        return new Response(JSON.stringify({ error: 'Attempt not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (attempt.status !== 'IN_PROGRESS') {
        return new Response(JSON.stringify({ error: 'Attempt already submitted' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use the blueprint snapshot (frozen at start time) if available;
      // fall back to the live mock_tests value for attempts started before this feature.
      const snapshot = (attempt as Record<string, unknown>)?.blueprint_snapshot as
        { marking_scheme?: Record<string, unknown>; total_marks?: number } | null;
      let markingScheme: Record<string, unknown>;
      if (snapshot?.marking_scheme && Object.keys(snapshot.marking_scheme).length > 0) {
        markingScheme = snapshot.marking_scheme;
      } else {
        const { data: mockTest } = await serviceClient
          .from('mock_tests')
          .select('marking_scheme')
          .eq('id', attempt.mock_test_id)
          .maybeSingle();
        markingScheme = (mockTest?.marking_scheme || {}) as Record<string, unknown>;
      }

      const ms = markingScheme as {
        mcq?: { correct?: number; wrong?: number };
        numerical?: { correct?: number; wrong?: number };
      };
      const mcqCorrect = ms.mcq?.correct ?? 4;
      const mcqWrong = ms.mcq?.wrong ?? -1;
      const numCorrect = ms.numerical?.correct ?? 4;
      const numWrong = ms.numerical?.wrong ?? -1;

      // Fetch all questions for this mock test (with answers)
      const { data: mtqs } = await serviceClient
        .from('mock_test_questions')
        .select('question_id')
        .eq('mock_test_id', attempt.mock_test_id);

      const questionIds = (mtqs || []).map((m) => m.question_id);
      const { data: questions } = await serviceClient
        .from('questions')
        .select('id, type, answer_json, tolerance')
        .in('id', questionIds);

      const qMap = new Map((questions || []).map((q) => [q.id, q]));

      // Grade every question from the server-owned question set.
      let totalScore = 0;
      const gradedResults: { question_id: string; is_correct: boolean | null; awarded_marks: number }[] = [];
      const submittedResponses = new Map(
        (Array.isArray(clientResponses) ? clientResponses : []).map((response: { question_id: string; answer: unknown; time_spent_sec?: number; flagged?: boolean }) => [response.question_id, response]),
      );

      for (const questionId of questionIds) {
        const question = qMap.get(questionId);
        if (!question) continue;

        const cr = submittedResponses.get(questionId) as { question_id: string; answer: unknown; time_spent_sec?: number; flagged?: boolean } | undefined;
        const answer = cr?.answer ?? null;
        const attempted = answer !== null && answer !== undefined;
        let isCorrect: boolean | null = null;
        let awardedMarks = 0;

        if (attempted && question.type === 'MCQ') {
          const correctOption = (question.answer_json as { option?: string })?.option;
          const studentOption = (answer as { option?: string })?.option;
          isCorrect = Boolean(studentOption && studentOption === correctOption);
          awardedMarks = isCorrect ? mcqCorrect : mcqWrong;
        } else if (attempted && question.type === 'NUMERICAL') {
          const correctValue = Number((question.answer_json as { value?: number | string })?.value);
          const tolerance = Number(question.tolerance ?? 0);
          const studentValue = Number((answer as { value?: number | string })?.value);
          if (Number.isFinite(studentValue) && Number.isFinite(correctValue)) {
            isCorrect = Math.abs(studentValue - correctValue) <= tolerance;
            awardedMarks = isCorrect ? numCorrect : numWrong;
          } else {
            isCorrect = false;
            awardedMarks = numWrong;
          }
        }

        totalScore += awardedMarks;
        const { error: responseError } = await serviceClient.from('responses').upsert({
          attempt_id,
          question_id: questionId,
          answer,
          time_spent_sec: cr?.time_spent_sec || 0,
          flagged: cr?.flagged || false,
          is_correct: isCorrect,
          awarded_marks: awardedMarks,
        }, { onConflict: 'attempt_id,question_id' });
        if (responseError) throw responseError;

        gradedResults.push({ question_id: questionId, is_correct: isCorrect, awarded_marks: awardedMarks });
      }

      // Mark attempt as submitted with the server-calculated score.
      const { error: attemptUpdateError } = await serviceClient
        .from('attempts')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          score: totalScore,
        })
        .eq('id', attempt_id);
      if (attemptUpdateError) throw attemptUpdateError;

      // Refresh mastery scores for this user
      await serviceClient.rpc('refresh_mastery', { p_user: user.id });

      return new Response(JSON.stringify({
        success: true,
        attempt_id,
        score: totalScore,
        graded: gradedResults,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── RESULTS: fetch graded attempt with questions + answers + solutions ───
    if (action === 'results' && req.method === 'GET') {
      const attemptId = url.searchParams.get('attempt_id');
      if (!attemptId) {
        return new Response(JSON.stringify({ error: 'attempt_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: attempt } = await serviceClient
        .from('attempts')
        .select('id, status, mock_test_id, started_at, submitted_at, score, blueprint_snapshot')
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!attempt) {
        return new Response(JSON.stringify({ error: 'Attempt not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: mockTest } = await serviceClient
        .from('mock_tests')
        .select('id, title, total_marks, marking_scheme')
        .eq('id', attempt.mock_test_id)
        .maybeSingle();

      // If the attempt has a blueprint snapshot, use its frozen marking_scheme and total_marks
      // so the results page shows the scheme the student was actually graded with.
      const snapshot = (attempt as Record<string, unknown>)?.blueprint_snapshot as
        { marking_scheme?: Record<string, unknown>; total_marks?: number } | null;
      const mockTestForResult = snapshot?.marking_scheme
        ? { ...mockTest, marking_scheme: snapshot.marking_scheme, total_marks: snapshot.total_marks ?? mockTest?.total_marks }
        : mockTest;

      const { data: mtqs } = await serviceClient
        .from('mock_test_questions')
        .select('question_id, position')
        .eq('mock_test_id', attempt.mock_test_id)
        .order('position');

      const questionIds = (mtqs || []).map((m) => m.question_id);
      if (questionIds.length === 0) {
        return new Response(JSON.stringify({ attempt, mock_test: mockTestForResult, results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // For results, include answer_json, solution_tex, tolerance, chapter info
      const { data: questions } = await serviceClient
        .from('questions')
        .select('id, type, statement_tex, options_json, answer_json, tolerance, solution_tex, difficulty, chapter_id')
        .in('id', questionIds);

      const { data: chapters } = await serviceClient
        .from('chapters')
        .select('id, name, subject_id, subject:subject_id ( name )');

      const { data: responses } = await serviceClient
        .from('responses')
        .select('question_id, answer, is_correct, awarded_marks, time_spent_sec, flagged')
        .eq('attempt_id', attemptId);

      const qMap = new Map((questions || []).map((q) => [q.id, q]));
      const chMap = new Map((chapters || []).map((c: Record<string, unknown>) => [c.id, c]));
      const rMap = new Map((responses || []).map((r) => [r.question_id, r]));

      const results = (mtqs || []).map((mtq) => {
        const q = qMap.get(mtq.question_id);
        const ch = q ? chMap.get(q.chapter_id) : null;
        const r = rMap.get(mtq.question_id);
        const subjectName = (ch?.subject as { name?: string })?.name || '';
        return {
          question_id: mtq.question_id,
          position: mtq.position,
          type: q?.type || 'MCQ',
          statement_tex: q?.statement_tex || '',
          options_json: q?.options_json || null,
          answer_json: q?.answer_json || null,
          tolerance: q?.tolerance || 0,
          solution_tex: q?.solution_tex || null,
          difficulty: q?.difficulty || 'MEDIUM',
          chapter_name: ch?.name || '',
          subject_name: subjectName,
          student_answer: r?.answer || null,
          is_correct: r?.is_correct ?? null,
          awarded_marks: r?.awarded_marks ?? 0,
          time_spent_sec: r?.time_spent_sec || 0,
          flagged: r?.flagged || false,
        };
      });

      return new Response(JSON.stringify({
        attempt,
        mock_test: mockTestForResult,
        results,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
