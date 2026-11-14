/*
# MOCK NINJA — Hardening / Patch 1 (002_hardening.sql)

## Purpose
Enables Row Level Security on every base table, creates the is_staff() helper,
the profile-column guard trigger, and grants the minimum privileges needed.

## Security Changes

### Functions
- is_staff() — SECURITY DEFINER, fixed search_path. Returns true if the
  caller's profiles.role is EDITOR or ADMIN. Used inside RLS policies.
- guard_profile_columns() — BEFORE UPDATE trigger function on profiles.
  Prevents students from changing role, referral fields, or consent fields
  (guardian_consent_at added in 003; the trigger is created here and covers
  it because it blocks any UPDATE to those columns regardless of when added).

### RLS Enabled
- profiles, subjects, chapters, questions, mock_tests, mock_test_questions,
  attempts, responses

### Policies
- profiles: students SELECT/UPDATE own row only (UPDATE restricted to safe
  columns by the guard trigger). Staff full access.
- subjects, chapters: readable by all authenticated users (content metadata).
  Staff CRUD.
- questions: students have NO access (staff only). Staff full CRUD.
- mock_tests: students SELECT PUBLISHED public mocks only. Staff full CRUD.
- mock_test_questions: students SELECT for published mocks only. Staff full CRUD.
- attempts: students SELECT own only. No direct INSERT/UPDATE/DELETE (Edge
  Functions handle all writes via service role). Staff SELECT all.
- responses: students SELECT own only. No direct INSERT/UPDATE/DELETE. Staff
  SELECT all.

### Trigger
- BEFORE UPDATE on profiles → guard_profile_columns()

### Grants
- All SECURITY DEFINER functions have PUBLIC execute revoked; explicit grants
  added only where intended.
*/

-- =============================================================
-- is_staff() helper — SECURITY DEFINER
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('EDITOR', 'ADMIN')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- =============================================================
-- guard_profile_columns() — BEFORE UPDATE trigger
-- Prevents students from changing protected columns.
-- =============================================================
CREATE OR REPLACE FUNCTION public.guard_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is staff, allow the update (staff can change roles etc.)
  IF public.is_staff() THEN
    RETURN NEW;
  END IF;

  -- Students: block changes to protected columns
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Students cannot change their role';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Students cannot change their referral code';
  END IF;
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'Students cannot change their referrer';
  END IF;
  -- Consent fields (guardian_consent_at added in 003, covered here)
  IF NEW.guardian_consent_at IS DISTINCT FROM OLD.guardian_consent_at THEN
    RAISE EXCEPTION 'Students cannot set their own guardian consent';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_columns() FROM PUBLIC;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_guard_profile_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns();

-- =============================================================
-- Enable RLS on all tables
-- =============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- profiles policies
-- =============================================================
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_staff())
  WITH CHECK (auth.uid() = id OR public.is_staff());

-- No direct INSERT (auto-created by trigger) or DELETE from client

-- =============================================================
-- subjects policies — readable by all authenticated
-- =============================================================
DROP POLICY IF EXISTS "select_subjects" ON public.subjects;
CREATE POLICY "select_subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_subjects_staff" ON public.subjects;
CREATE POLICY "insert_subjects_staff" ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_subjects_staff" ON public.subjects;
CREATE POLICY "update_subjects_staff" ON public.subjects
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_subjects_staff" ON public.subjects;
CREATE POLICY "delete_subjects_staff" ON public.subjects
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- =============================================================
-- chapters policies — readable by all authenticated
-- =============================================================
DROP POLICY IF EXISTS "select_chapters" ON public.chapters;
CREATE POLICY "select_chapters" ON public.chapters
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_chapters_staff" ON public.chapters;
CREATE POLICY "insert_chapters_staff" ON public.chapters
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_chapters_staff" ON public.chapters;
CREATE POLICY "update_chapters_staff" ON public.chapters
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_chapters_staff" ON public.chapters;
CREATE POLICY "delete_chapters_staff" ON public.chapters
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- =============================================================
-- questions policies — STUDENT NO ACCESS, staff full CRUD
-- =============================================================
-- Students get no SELECT policy at all → zero rows visible
DROP POLICY IF EXISTS "select_questions_staff" ON public.questions;
CREATE POLICY "select_questions_staff" ON public.questions
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "insert_questions_staff" ON public.questions;
CREATE POLICY "insert_questions_staff" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_questions_staff" ON public.questions;
CREATE POLICY "update_questions_staff" ON public.questions
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_questions_staff" ON public.questions;
CREATE POLICY "delete_questions_staff" ON public.questions
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- =============================================================
-- mock_tests policies — students see PUBLISHED only, staff full
-- =============================================================
DROP POLICY IF EXISTS "select_published_mocks" ON public.mock_tests;
CREATE POLICY "select_published_mocks" ON public.mock_tests
  FOR SELECT TO authenticated
  USING (
    status = 'PUBLISHED'
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "insert_mocks_staff" ON public.mock_tests;
CREATE POLICY "insert_mocks_staff" ON public.mock_tests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_mocks_staff" ON public.mock_tests;
CREATE POLICY "update_mocks_staff" ON public.mock_tests
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_mocks_staff" ON public.mock_tests;
CREATE POLICY "delete_mocks_staff" ON public.mock_tests
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- =============================================================
-- mock_test_questions — students see for published mocks, staff full
-- =============================================================
DROP POLICY IF EXISTS "select_mtq" ON public.mock_test_questions;
CREATE POLICY "select_mtq" ON public.mock_test_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_tests
      WHERE mock_tests.id = mock_test_questions.mock_test_id
      AND (mock_tests.status = 'PUBLISHED' OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "insert_mtq_staff" ON public.mock_test_questions;
CREATE POLICY "insert_mtq_staff" ON public.mock_test_questions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_mtq_staff" ON public.mock_test_questions;
CREATE POLICY "update_mtq_staff" ON public.mock_test_questions
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_mtq_staff" ON public.mock_test_questions;
CREATE POLICY "delete_mtq_staff" ON public.mock_test_questions
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- =============================================================
-- attempts — students SELECT own, no direct write, staff SELECT all
-- =============================================================
DROP POLICY IF EXISTS "select_own_attempts" ON public.attempts;
CREATE POLICY "select_own_attempts" ON public.attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

-- No INSERT/UPDATE/DELETE policies for students — all writes via Edge Functions

-- =============================================================
-- responses — students SELECT own, no direct write, staff SELECT all
-- =============================================================
DROP POLICY IF EXISTS "select_own_responses" ON public.responses;
CREATE POLICY "select_own_responses" ON public.responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = responses.attempt_id
      AND (attempts.user_id = auth.uid() OR public.is_staff())
    )
  );

-- No INSERT/UPDATE/DELETE policies for students — all writes via Edge Functions

-- =============================================================
-- Revoke any default PUBLIC execute on functions
-- =============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_profile_columns() FROM PUBLIC;
