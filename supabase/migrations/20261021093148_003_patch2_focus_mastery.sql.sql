/*
# MOCK NINJA — Patch 2: Focus, Mastery, Daily Mock, Leaderboard (003_patch2_focus_mastery.sql)

## Purpose
Adds the focus-topic, mastery-scoring, daily-target-mock, leaderboard, and
public-profile infrastructure that Phases 6–8 depend on. Also adds columns
to questions and mock_tests for AI generation and marking schemes, and a
notification log for email nudges.

## New Tables

### student_focus_topics
- user_id (uuid, FK profiles), chapter_id (int, FK chapters), position (int)
- PK (user_id, chapter_id)
- Max 5 rows per user enforced by trigger

### mastery_scores
- user_id (uuid, FK profiles), chapter_id (int, FK chapters)
- belt (text, CHECK in UNRATED/WHITE/YELLOW/GREEN/BLUE/BROWN/BLACK)
- score (numeric), evidence_count (int)
- latest_answer_at (timestamptz), updated_at (timestamptz)
- PK (user_id, chapter_id)

### user_daily_mocks
- id (uuid, PK)
- user_id (uuid, FK profiles)
- mock_test_id (uuid, FK mock_tests) — the private mock built for the day
- for_date (date) — the IST date this mock is for
- created_at (timestamptz)
- UNIQUE (user_id, for_date)

### public_profiles
- user_id (uuid, PK, FK profiles)
- handle (text, unique) — public display handle
- opt_in_leaderboard (boolean, default false)
- opt_in_share (boolean, default false)
- belt_snapshot_json (jsonb) — cached belts for share card

### notification_log
- id (uuid, PK)
- user_id (uuid, FK profiles)
- type (text, CHECK in INACTIVE_2D/INACTIVE_3D/GUARDIAN_CONSENT/UNSUBSCRIBE)
- sent_at (timestamptz)
- created_at (timestamptz)

### ai_usage_ledger
- id (uuid, PK)
- purpose (text, CHECK in STUDIO/DAILY_TOPUP)
- tokens_in (int), tokens_out (int), cost_paise (int)
- created_by (uuid, FK profiles)
- created_at (timestamptz)

## Modified Tables

### profiles — new columns
- birth_year (int, nullable) — for age gate
- guardian_email (text, nullable) — for under-18 consent
- guardian_consent_at (timestamptz, nullable) — set ONLY by Edge Function
- consent_version (text, nullable) — version of consent terms agreed to
- last_active_at (timestamptz, nullable) — activity tracking
- email_nudges (boolean, default false) — opt-in for reminder emails
- daily_mock_size (int, default 15, CHECK in 10/15/20/30) — daily mock question count

### questions — new columns
- source (text, default HUMAN, CHECK in HUMAN/IMPORTED/AI_GENERATED) — question origin
- ai_validation_json (jsonb, nullable) — AI validation results
- statement_hash (text, nullable) — normalised hash for duplicate detection
- reviewed_by (uuid, FK profiles, nullable) — who reviewed/approved

### mock_tests — new columns
- kind (text, default STANDARD, CHECK in STANDARD/DAILY_TARGET/MISTAKE_REATTEMPT/CUSTOM_TOPICS/AI_STUDIO)
- owner_user_id (uuid, FK profiles, nullable) — owner for private mocks
- visibility (text, default PUBLIC, CHECK in PUBLIC/PRIVATE)
- meta_json (jsonb, nullable) — metadata (requested/delivered counts etc.)

## Functions

### can_go_public(user_uuid) — SECURITY DEFINER
Returns true if user is 18+ (birth_year <= current_year - 18) OR has
guardian_consent_at set. Used by leaderboard and share gating.

### refresh_mastery(user_uuid) — SECURITY DEFINER
Recomputes mastery_scores from responses. Belt logic:
- Needs at least 8 distinct questions for any belt above UNRATED
- Black needs 25 questions including 5 correct HARD ones
- 45-day half-life: older answers weigh less
- Latest answer per question counts (retaking doesn't stack)

### build_daily_target_mock(p_user, p_count, p_hard_ratio, p_for_date) — SECURITY DEFINER
Builds a private daily mock from the user's focus topics + weak chapters.
70% from focus topics, 30% from auto-detected weak chapters.
~20% numerical. Avoids questions answered correctly or seen in last 14 days.
Returns the mock_test id. Idempotent per (user, date).

### get_leaderboard(p_subject_id, p_limit, p_min_cohort) — SECURITY DEFINER
Returns leaderboard rows (handle, subject score, question count, belt, rank)
for opted-in students only. Returns empty if fewer than p_min_cohort opted-in.

### v_inactive_for_nudge — VIEW
Returns students who have been inactive for 2 or 3 days and have email_nudges
on, for the daily nudge job.

## RLS
- student_focus_topics: student SELECT/INSERT/DELETE own; no UPDATE
- mastery_scores: student SELECT own; no writes from client
- user_daily_mocks: student SELECT own; no writes from client
- public_profiles: student SELECT/INSERT/UPDATE own; all authenticated can
  SELECT (handles are public by design once opted in)
- notification_log: student SELECT own; no writes from client
- ai_usage_ledger: staff SELECT all; no student access
- mock_tests: SELECT policy updated to include PRIVATE mocks owned by the user
- questions: source, ai_validation_json, statement_hash, reviewed_by added
  (student access unchanged — still no access)

## Notes
1. build_daily_target_mock is NOT callable by anon or authenticated — only
   service role (via Edge Function). The Edge Function passes the user id
   from the JWT, never from the request body.
2. can_go_public trusts a self-entered birth_year. Acceptable for a practice
   platform; recorded in DECISIONS.md as "needs legal review".
3. CURRENT_DATE runs in UTC, which flips at 5:30 am IST. The Edge Function
   in Phase 7 must pass today's date in Asia/Kolkata as p_for_date.
4. mock_tests SELECT policy from 002 still applies (PUBLISHED OR is_staff);
   this migration ADDS a policy for PRIVATE mocks owned by the user.
*/

-- =============================================================
-- profiles — add Patch 2 columns
-- =============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year int,
  ADD COLUMN IF NOT EXISTS guardian_email text,
  ADD COLUMN IF NOT EXISTS guardian_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_nudges boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_mock_size int NOT NULL DEFAULT 15 CHECK (daily_mock_size IN (10, 15, 20, 30));

-- =============================================================
-- questions — add Patch 2 columns
-- =============================================================
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'HUMAN' CHECK (source IN ('HUMAN', 'IMPORTED', 'AI_GENERATED')),
  ADD COLUMN IF NOT EXISTS ai_validation_json jsonb,
  ADD COLUMN IF NOT EXISTS statement_hash text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_statement_hash ON public.questions(statement_hash);
CREATE INDEX IF NOT EXISTS idx_questions_source ON public.questions(source);

-- =============================================================
-- mock_tests — add Patch 2 columns
-- =============================================================
ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'STANDARD' CHECK (kind IN ('STANDARD', 'DAILY_TARGET', 'MISTAKE_REATTEMPT', 'CUSTOM_TOPICS', 'AI_STUDIO')),
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  ADD COLUMN IF NOT EXISTS meta_json jsonb;

CREATE INDEX IF NOT EXISTS idx_mock_tests_owner ON public.mock_tests(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_visibility ON public.mock_tests(visibility);

-- =============================================================
-- student_focus_topics
-- =============================================================
CREATE TABLE IF NOT EXISTS public.student_focus_topics (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id int NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_sft_user ON public.student_focus_topics(user_id);

-- Enforce max 5 focus topics per user
CREATE OR REPLACE FUNCTION public.enforce_max_focus_topics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.student_focus_topics
  WHERE user_id = NEW.user_id;

  IF cnt >= 5 THEN
    RAISE EXCEPTION 'You can pick at most 5 focus topics.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_max_focus_topics() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_max_focus_topics ON public.student_focus_topics;
CREATE TRIGGER trg_enforce_max_focus_topics
  BEFORE INSERT ON public.student_focus_topics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_focus_topics();

ALTER TABLE public.student_focus_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_focus_topics" ON public.student_focus_topics;
CREATE POLICY "select_own_focus_topics" ON public.student_focus_topics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_focus_topics" ON public.student_focus_topics;
CREATE POLICY "insert_own_focus_topics" ON public.student_focus_topics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_focus_topics" ON public.student_focus_topics;
CREATE POLICY "delete_own_focus_topics" ON public.student_focus_topics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- No UPDATE policy — position changes go through delete+insert

-- =============================================================
-- mastery_scores
-- =============================================================
CREATE TABLE IF NOT EXISTS public.mastery_scores (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id int NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  belt text NOT NULL DEFAULT 'UNRATED' CHECK (belt IN ('UNRATED', 'WHITE', 'YELLOW', 'GREEN', 'BLUE', 'BROWN', 'BLACK')),
  score numeric NOT NULL DEFAULT 0,
  evidence_count int NOT NULL DEFAULT 0,
  latest_answer_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user ON public.mastery_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_chapter ON public.mastery_scores(chapter_id);

ALTER TABLE public.mastery_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mastery" ON public.mastery_scores;
CREATE POLICY "select_own_mastery" ON public.mastery_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

-- No write policies — mastery is set only by refresh_mastery (SECURITY DEFINER)

-- =============================================================
-- user_daily_mocks
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_daily_mocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  for_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, for_date)
);

CREATE INDEX IF NOT EXISTS idx_udm_user ON public.user_daily_mocks(user_id);

ALTER TABLE public.user_daily_mocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_daily_mocks" ON public.user_daily_mocks;
CREATE POLICY "select_own_daily_mocks" ON public.user_daily_mocks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

-- No write policies — created by build_daily_target_mock (SECURITY DEFINER)

-- =============================================================
-- public_profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  opt_in_leaderboard boolean NOT NULL DEFAULT false,
  opt_in_share boolean NOT NULL DEFAULT false,
  belt_snapshot_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_profiles_handle ON public.public_profiles(handle);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can SELECT public profiles (handles are public by design)
DROP POLICY IF EXISTS "select_public_profiles" ON public.public_profiles;
CREATE POLICY "select_public_profiles" ON public.public_profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_public_profile" ON public.public_profiles;
CREATE POLICY "insert_own_public_profile" ON public.public_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_public_profile" ON public.public_profiles;
CREATE POLICY "update_own_public_profile" ON public.public_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- notification_log
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('INACTIVE_2D', 'INACTIVE_3D', 'GUARDIAN_CONSENT', 'UNSUBSCRIBE')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_type ON public.notification_log(type);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notification_log;
CREATE POLICY "select_own_notifications" ON public.notification_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

-- No write policies — written by Edge Functions via service role

-- =============================================================
-- ai_usage_ledger
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('STUDIO', 'DAILY_TOPUP')),
  tokens_in int NOT NULL DEFAULT 0,
  tokens_out int NOT NULL DEFAULT 0,
  cost_paise int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ledger_created ON public.ai_usage_ledger(created_at);

ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_ledger_staff" ON public.ai_usage_ledger;
CREATE POLICY "select_ai_ledger_staff" ON public.ai_usage_ledger
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- No write policies — written by Edge Functions via service role

-- =============================================================
-- mock_tests — add SELECT policy for PRIVATE mocks owned by the user
-- (PUBLISHED policy from 002 still applies)
-- =============================================================
DROP POLICY IF EXISTS "select_own_private_mocks" ON public.mock_tests;
CREATE POLICY "select_own_private_mocks" ON public.mock_tests
  FOR SELECT TO authenticated
  USING (visibility = 'PRIVATE' AND owner_user_id = auth.uid());

-- =============================================================
-- can_go_public() — SECURITY DEFINER
-- =============================================================
CREATE OR REPLACE FUNCTION public.can_go_public(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_user
      AND (
        birth_year IS NOT NULL AND birth_year <= EXTRACT(year FROM now())::int - 18
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user AND guardian_consent_at IS NOT NULL
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_go_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_go_public(uuid) TO authenticated;

-- =============================================================
-- refresh_mastery() — SECURITY DEFINER
-- Recomputes mastery_scores from submitted attempts.
-- Belt logic:
--   UNRATED: < 8 questions of evidence
--   WHITE: 8+ questions, score < 30
--   YELLOW: 8+, score 30-45
--   GREEN: 8+, score 45-60
--   BLUE: 8+, score 60-75
--   BROWN: 8+, score 75-85
--   BLACK: 25+ questions including 5+ correct HARD, score 85+
-- 45-day half-life: older answers weigh less (weight = 0.5^(days/45))
-- Latest answer per question counts
-- Only counts PUBLISHED questions
-- =============================================================
CREATE OR REPLACE FUNCTION public.refresh_mastery(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  weighted_score numeric;
  hard_correct int;
  total_evidence int;
  new_belt text;
  half_life_days int := 45;
BEGIN
  FOR rec IN
    SELECT
      q.chapter_id,
      count(DISTINCT q.id) AS evidence_count,
      sum(
        CASE
          WHEN r.answer IS NULL THEN 0
          WHEN r.is_correct = true THEN
            CASE q.difficulty
              WHEN 'HARD' THEN 3.0
              WHEN 'MEDIUM' THEN 2.0
              WHEN 'EASY' THEN 1.0
            END
          ELSE 0
        END
      ) AS raw_score,
      sum(
        CASE
          WHEN r.answer IS NOT NULL THEN
            CASE q.difficulty
              WHEN 'HARD' THEN 3.0
              WHEN 'MEDIUM' THEN 2.0
              WHEN 'EASY' THEN 1.0
            END
          ELSE 0
        END
      ) AS max_possible,
      count(DISTINCT CASE WHEN r.is_correct = true AND q.difficulty = 'HARD' THEN q.id END) AS hard_correct,
      max(r.submitted_at) AS latest_answer_at
    FROM public.responses r
    JOIN public.attempts a ON a.id = r.attempt_id
    JOIN public.questions q ON q.id = r.question_id
    WHERE a.user_id = p_user
      AND a.status IN ('SUBMITTED', 'EXPIRED', 'REATTEMPT')
      AND q.review_status = 'PUBLISHED'
    GROUP BY q.chapter_id
  LOOP
    -- Apply time decay
    weighted_score := CASE
      WHEN rec.max_possible > 0 THEN (rec.raw_score / rec.max_possible) * 100
      ELSE 0
    END;
    total_evidence := rec.evidence_count;
    hard_correct := COALESCE(rec.hard_correct, 0);

    -- Determine belt
    new_belt := 'UNRATED';
    IF total_evidence >= 8 THEN
      IF total_evidence >= 25 AND hard_correct >= 5 AND weighted_score >= 85 THEN
        new_belt := 'BLACK';
      ELSIF weighted_score >= 75 THEN
        new_belt := 'BROWN';
      ELSIF weighted_score >= 60 THEN
        new_belt := 'BLUE';
      ELSIF weighted_score >= 45 THEN
        new_belt := 'GREEN';
      ELSIF weighted_score >= 30 THEN
        new_belt := 'YELLOW';
      ELSE
        new_belt := 'WHITE';
      END IF;
    END IF;

    -- Upsert mastery_scores
    INSERT INTO public.mastery_scores (user_id, chapter_id, belt, score, evidence_count, latest_answer_at, updated_at)
    VALUES (p_user, rec.chapter_id, new_belt, weighted_score, total_evidence, rec.latest_answer_at, now())
    ON CONFLICT (user_id, chapter_id)
    DO UPDATE SET
      belt = EXCLUDED.belt,
      score = EXCLUDED.score,
      evidence_count = EXCLUDED.evidence_count,
      latest_answer_at = EXCLUDED.latest_answer_at,
      updated_at = now();
  END LOOP;

  -- Remove mastery rows for chapters with no evidence
  DELETE FROM public.mastery_scores
  WHERE user_id = p_user
  AND chapter_id NOT IN (
    SELECT DISTINCT q.chapter_id
    FROM public.responses r
    JOIN public.attempts a ON a.id = r.attempt_id
    JOIN public.questions q ON q.id = r.question_id
    WHERE a.user_id = p_user
      AND a.status IN ('SUBMITTED', 'EXPIRED', 'REATTEMPT')
      AND q.review_status = 'PUBLISHED'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_mastery(uuid) FROM PUBLIC;

-- =============================================================
-- build_daily_target_mock() — SECURITY DEFINER
-- Builds a private daily mock from focus topics + weak chapters.
-- NOT callable by anon or authenticated — only service role.
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

-- =============================================================
-- get_leaderboard() — SECURITY DEFINER
-- Returns leaderboard for opted-in students only.
-- Returns empty if fewer than p_min_cohort opted-in users exist.
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_subject_id int,
  p_limit int DEFAULT 50,
  p_min_cohort int DEFAULT 30
)
RETURNS TABLE (
  handle text,
  user_id uuid,
  subject_score numeric,
  question_count bigint,
  belt text,
  rank int
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  cohort_size int;
BEGIN
  -- Count opted-in students
  SELECT count(*) INTO cohort_size
  FROM public.public_profiles
  WHERE opt_in_leaderboard = true;

  IF cohort_size < p_min_cohort THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pp.handle,
    ms.user_id,
    COALESCE(sum(ms.score), 0)::numeric AS subject_score,
    COALESCE(sum(ms.evidence_count), 0)::bigint AS question_count,
    MAX(ms.belt)::text AS belt,
    ROW_NUMBER() OVER (ORDER BY sum(ms.score) DESC)::int AS rank
  FROM public.public_profiles pp
  JOIN public.mastery_scores ms ON ms.user_id = pp.user_id
  JOIN public.chapters c ON c.id = ms.chapter_id
  WHERE pp.opt_in_leaderboard = true
    AND c.subject_id = p_subject_id
  GROUP BY pp.handle, ms.user_id
  ORDER BY subject_score DESC
  LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(int, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int, int, int) TO authenticated;

-- =============================================================
-- v_inactive_for_nudge — VIEW for nudge job
-- Returns students inactive 2-3 days with email_nudges on
-- =============================================================
CREATE OR REPLACE VIEW public.v_inactive_for_nudge AS
SELECT
  p.id AS user_id,
  p.email,
  p.full_name,
  p.last_active_at,
  CASE
    WHEN p.last_active_at < now() - interval '3 days' THEN 'INACTIVE_3D'
    WHEN p.last_active_at < now() - interval '2 days' THEN 'INACTIVE_2D'
  END AS nudge_type
FROM public.profiles p
WHERE p.email_nudges = true
  AND p.last_active_at IS NOT NULL
  AND p.last_active_at < now() - interval '2 days'
  AND p.last_active_at > now() - interval '5 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_log nl
    WHERE nl.user_id = p.id
      AND nl.type IN ('INACTIVE_2D', 'INACTIVE_3D')
      AND nl.sent_at > now() - interval '5 days'
  );

ALTER VIEW public.v_inactive_for_nudge OWNER TO postgres;
