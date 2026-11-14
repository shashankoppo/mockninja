/*
# Daily practice mock: chosen difficulty and full question fill

1. Function change
- build_daily_target_mock gains p_difficulty (ANY, EASY, MEDIUM or HARD; default ANY).
- Questions are picked by chapter priority: focus chapters first (in the student's order), then weak chapters (lowest score first), with random order inside each chapter.
- Previously only one question per chapter was taken per pass, so the mock could deliver far fewer questions than requested. It now fills up to the requested count from the eligible pool.
- Questions already in the same mock are never repeated across the focus and weak parts.
- If there are no focus topics, weak chapters fill the whole mock; if there are no weak chapters, focus chapters fill the whole mock.

2. Security
- The function still runs as SECURITY DEFINER and is callable only by the service role (and the scheduled job owner), as before.
- The function is recreated with the new signature; the old four-argument version is dropped so one definition remains.
*/

DROP FUNCTION IF EXISTS public.build_daily_target_mock(uuid, integer, numeric, date);

CREATE OR REPLACE FUNCTION public.build_daily_target_mock(
  p_user uuid,
  p_count integer DEFAULT 15,
  p_hard_ratio numeric DEFAULT 0.7,
  p_for_date date DEFAULT CURRENT_DATE,
  p_difficulty text DEFAULT 'ANY'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mock_id uuid;
  v_existing uuid;
  v_focus_chapters int[];
  v_weak_chapters int[];
  v_focus_count int;
  v_weak_count int;
  v_position int := 0;
  v_inserted int;
BEGIN
  IF p_difficulty IS NULL OR p_difficulty NOT IN ('ANY', 'EASY', 'MEDIUM', 'HARD') THEN
    RAISE EXCEPTION 'Invalid difficulty';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user::text || p_for_date::text));

  SELECT mock_test_id INTO v_existing
  FROM public.user_daily_mocks
  WHERE user_id = p_user AND for_date = p_for_date;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT array_agg(chapter_id ORDER BY position) INTO v_focus_chapters
  FROM public.student_focus_topics
  WHERE user_id = p_user;

  SELECT array_agg(chapter_id ORDER BY score ASC) INTO v_weak_chapters
  FROM public.mastery_scores
  WHERE user_id = p_user AND evidence_count >= 5;

  IF v_focus_chapters IS NULL AND v_weak_chapters IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.mock_tests (title, category, mode, duration_min, total_marks, access, status, kind, owner_user_id, visibility, meta_json)
  VALUES (
    'Daily Target Mock — ' || p_for_date,
    'daily target',
    'EXAM',
    30,
    p_count * 4,
    'FREE',
    'PUBLISHED',
    'DAILY_TARGET',
    p_user,
    'PRIVATE',
    jsonb_build_object('requested', p_count, 'delivered', 0, 'for_date', p_for_date, 'difficulty', p_difficulty)
  )
  RETURNING id INTO v_mock_id;

  IF v_focus_chapters IS NULL THEN
    v_focus_count := 0;
  ELSIF v_weak_chapters IS NULL THEN
    v_focus_count := p_count;
  ELSE
    v_focus_count := CEIL(p_count * 0.7);
  END IF;
  v_weak_count := p_count - v_focus_count;

  IF v_focus_chapters IS NOT NULL AND v_focus_count > 0 THEN
    WITH picked AS (
      SELECT q.id,
             row_number() OVER (ORDER BY array_position(v_focus_chapters, q.chapter_id), random()) AS rn
      FROM public.questions q
      WHERE q.chapter_id = ANY (v_focus_chapters)
        AND q.review_status = 'PUBLISHED'
        AND (p_difficulty = 'ANY' OR q.difficulty = p_difficulty)
        AND q.id NOT IN (
          SELECT r.question_id FROM public.responses r
          JOIN public.attempts a ON a.id = r.attempt_id
          WHERE a.user_id = p_user
            AND (r.is_correct = true OR a.started_at > now() - interval '14 days')
        )
        AND q.id NOT IN (SELECT mtq.question_id FROM public.mock_test_questions mtq WHERE mtq.mock_test_id = v_mock_id)
    )
    INSERT INTO public.mock_test_questions (mock_test_id, question_id, position, section)
    SELECT v_mock_id, picked.id, v_position + picked.rn - 1, 'Daily Target'
    FROM picked
    WHERE picked.rn <= v_focus_count;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_position := v_position + v_inserted;
  END IF;

  IF v_weak_chapters IS NOT NULL AND v_weak_count > 0 THEN
    WITH picked AS (
      SELECT q.id,
             row_number() OVER (ORDER BY array_position(v_weak_chapters, q.chapter_id), random()) AS rn
      FROM public.questions q
      WHERE q.chapter_id = ANY (v_weak_chapters)
        AND q.review_status = 'PUBLISHED'
        AND (p_difficulty = 'ANY' OR q.difficulty = p_difficulty)
        AND q.id NOT IN (
          SELECT r.question_id FROM public.responses r
          JOIN public.attempts a ON a.id = r.attempt_id
          WHERE a.user_id = p_user
            AND (r.is_correct = true OR a.started_at > now() - interval '14 days')
        )
        AND q.id NOT IN (SELECT mtq.question_id FROM public.mock_test_questions mtq WHERE mtq.mock_test_id = v_mock_id)
    )
    INSERT INTO public.mock_test_questions (mock_test_id, question_id, position, section)
    SELECT v_mock_id, picked.id, v_position + picked.rn - 1, 'Daily Target'
    FROM picked
    WHERE picked.rn <= v_weak_count;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_position := v_position + v_inserted;
  END IF;

  UPDATE public.mock_tests
  SET meta_json = jsonb_build_object('requested', p_count, 'delivered', v_position, 'for_date', p_for_date, 'difficulty', p_difficulty),
      total_marks = v_position * 4,
      duration_min = GREATEST(v_position * 2, 1)
  WHERE id = v_mock_id;

  INSERT INTO public.user_daily_mocks (user_id, mock_test_id, for_date)
  VALUES (p_user, v_mock_id, p_for_date);

  RETURN v_mock_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.build_daily_target_mock(uuid, integer, numeric, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_daily_target_mock(uuid, integer, numeric, date, text) TO service_role;
