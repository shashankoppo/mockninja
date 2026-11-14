/*
# MOCK NINJA — Patch 2 Fixes (004_patch2_fixes.sql)

## Purpose
Fixes three issues identified in Patch 2's own notes:
1. Adds an advisory transaction lock to build_daily_target_mock so two
   simultaneous dashboard loads cannot create two daily mocks.
2. Adds a marking_scheme jsonb column to mock_tests so every mock states
   its own scoring rules.
3. Confirms the guard_profile_columns trigger from 002 covers
   guardian_consent_at (it does — the trigger blocks any UPDATE to that
   column for non-staff).

## Modified Tables

### mock_tests
- marking_scheme (jsonb, default {"mcq":{"correct":4,"wrong":-1},"numerical":{"correct":4,"wrong":0}})

## Modified Functions

### build_daily_target_mock — CREATE OR REPLACE
- First statement is now: PERFORM pg_advisory_xact_lock(hashtext(p_user::text || p_for_date::text))
- Every other line is identical to the 003 version.
- REVOKE maintained.

## Notes
1. pg_advisory_xact_lock ensures that if two calls for the same user+date
   run simultaneously, the second waits for the first to commit, then finds
   the existing row and returns it instead of creating a duplicate.
2. The guard trigger from 002 already blocks guardian_consent_at changes
   for non-staff users. Confirmed here; no additional trigger needed.
*/

-- =============================================================
-- mock_tests — add marking_scheme column
-- =============================================================
ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS marking_scheme jsonb NOT NULL DEFAULT
  '{"mcq":{"correct":4,"wrong":-1},"numerical":{"correct":4,"wrong":0}}'::jsonb;

-- =============================================================
-- build_daily_target_mock — recreate with advisory lock
-- Identical to 003 version except for the first PERFORM line.
-- =============================================================
CREATE OR REPLACE FUNCTION public.build_daily_target_mock(
  p_user uuid,
  p_count int DEFAULT 15,
  p_hard_ratio numeric DEFAULT 0.7,
  p_for_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mock_id uuid;
  v_existing uuid;
  v_focus_chapters int[];
  v_weak_chapters int[];
  v_chapter_id int;
  v_q_id uuid;
  v_position int := 0;
  v_focus_count int;
  v_weak_count int;
  v_num_count int;
  v_target_num int;
  v_added int := 0;
BEGIN
  -- Advisory lock: prevents two simultaneous calls from creating two mocks
  PERFORM pg_advisory_xact_lock(hashtext(p_user::text || p_for_date::text));

  -- Check if mock already exists for this user+date
  SELECT mock_test_id INTO v_existing
  FROM public.user_daily_mocks
  WHERE user_id = p_user AND for_date = p_for_date;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Get focus chapter ids
  SELECT array_agg(chapter_id ORDER BY position) INTO v_focus_chapters
  FROM public.student_focus_topics
  WHERE user_id = p_user;

  -- Get weak chapters (lowest belts with at least 5 evidence)
  SELECT array_agg(chapter_id ORDER BY score ASC) INTO v_weak_chapters
  FROM public.mastery_scores
  WHERE user_id = p_user AND evidence_count >= 5
  LIMIT 10;

  -- If no focus topics and no weak chapters, return NULL (NEEDS_TOPICS)
  IF v_focus_chapters IS NULL AND v_weak_chapters IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create the private mock
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
    jsonb_build_object('requested', p_count, 'delivered', 0, 'for_date', p_for_date)
  )
  RETURNING id INTO v_mock_id;

  v_focus_count := CEIL(p_count * 0.7);
  v_weak_count := p_count - v_focus_count;
  v_target_num := CEIL(p_count * 0.2);

  -- Add questions from focus chapters (70%)
  IF v_focus_chapters IS NOT NULL THEN
    FOREACH v_chapter_id IN ARRAY v_focus_chapters
    LOOP
      EXIT WHEN v_added >= v_focus_count;
      SELECT q.id INTO v_q_id
      FROM public.questions q
      WHERE q.chapter_id = v_chapter_id
        AND q.review_status = 'PUBLISHED'
        AND q.id NOT IN (
          SELECT r.question_id FROM public.responses r
          JOIN public.attempts a ON a.id = r.attempt_id
          WHERE a.user_id = p_user
            AND (r.is_correct = true OR a.started_at > now() - interval '14 days')
        )
      ORDER BY random()
      LIMIT 1;

      IF v_q_id IS NOT NULL THEN
        INSERT INTO public.mock_test_questions (mock_test_id, question_id, position, section)
        VALUES (v_mock_id, v_q_id, v_position, 'Daily Target');
        v_position := v_position + 1;
        v_added := v_added + 1;
      END IF;
    END LOOP;
  END IF;

  -- Add questions from weak chapters (30%)
  v_added := 0;
  IF v_weak_chapters IS NOT NULL THEN
    FOREACH v_chapter_id IN ARRAY v_weak_chapters
    LOOP
      EXIT WHEN v_added >= v_weak_count;
      SELECT q.id INTO v_q_id
      FROM public.questions q
      WHERE q.chapter_id = v_chapter_id
        AND q.review_status = 'PUBLISHED'
        AND q.id NOT IN (
          SELECT r.question_id FROM public.responses r
          JOIN public.attempts a ON a.id = r.attempt_id
          WHERE a.user_id = p_user
            AND (r.is_correct = true OR a.started_at > now() - interval '14 days')
        )
      ORDER BY random()
      LIMIT 1;

      IF v_q_id IS NOT NULL THEN
        INSERT INTO public.mock_test_questions (mock_test_id, question_id, position, section)
        VALUES (v_mock_id, v_q_id, v_position, 'Daily Target');
        v_position := v_position + 1;
        v_added := v_added + 1;
      END IF;
    END LOOP;
  END IF;

  -- Update meta with delivered count
  UPDATE public.mock_tests
  SET meta_json = jsonb_build_object('requested', p_count, 'delivered', v_position, 'for_date', p_for_date)
  WHERE id = v_mock_id;

  -- Record in user_daily_mocks
  INSERT INTO public.user_daily_mocks (user_id, mock_test_id, for_date)
  VALUES (p_user, v_mock_id, p_for_date);

  RETURN v_mock_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.build_daily_target_mock(uuid, int, numeric, date) FROM PUBLIC;
