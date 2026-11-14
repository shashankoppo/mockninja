/*
# MOCK NINJA — Base Schema (001_base.sql)

## Purpose
Creates the foundational tables for the MOCK NINJA JEE mock-test platform.
This is the base schema that Patch 1 (002_hardening.sql) and Patch 2 (003_patch2_focus_mastery.sql) build upon.

## New Tables

### profiles
- id (uuid, PK, references auth.users) — one row per auth user
- email (text) — denormalized for convenience
- full_name (text) — display name
- role (text, CHECK in STUDENT/EDITOR/ADMIN, default STUDENT) — authorization role
- referral_code (text, unique) — optional referral tracking
- referred_by (uuid, references profiles) — who referred this user
- entry_source (text) — how the user found the platform
- created_at (timestamptz) — row creation time
- Auto-created via trigger on auth.users insert

### subjects
- id (int, PK) — 1=Physics, 2=Chemistry, 3=Mathematics
- name (text) — subject name

### chapters
- id (int, PK)
- subject_id (int, FK to subjects) — which subject this chapter belongs to
- name (text) — chapter name (NCERT/JEE standard)
- class_level (int, CHECK 11 or 12) — Class 11 or 12
- ordinal (int) — display order within subject+class

### questions
- id (uuid, PK)
- chapter_id (int, FK to chapters)
- type (text, CHECK in MCQ/NUMERICAL)
- difficulty (text, CHECK in EASY/MEDIUM/HARD)
- statement_tex (text) — question text in TeX
- options_json (jsonb, nullable) — MCQ options with stable ids a/b/c/d; null for numerical
- answer_json (jsonb) — correct answer (option id for MCQ, value+tolerance for numerical)
- tolerance (numeric, nullable) — tolerance for numerical answers
- solution_tex (text, nullable) — solution explanation in TeX
- review_status (text, CHECK in DRAFT/REVIEW/PUBLISHED/REJECTED, default DRAFT)
- created_by (uuid, FK to profiles) — who created the question
- created_at (timestamptz)

### mock_tests
- id (uuid, PK)
- title (text)
- category (text) — e.g. "full syllabus", "subject test", "chapter test"
- mode (text, CHECK in PRACTICE/EXAM)
- duration_min (int) — test duration in minutes
- total_marks (int)
- access (text, CHECK in FREE/PREMIUM)
- status (text, CHECK in DRAFT/PUBLISHED/ARCHIVED, default DRAFT)
- proctoring_profile (text, nullable) — proctoring settings reference
- created_at (timestamptz)

### mock_test_questions
- mock_test_id (uuid, FK to mock_tests)
- question_id (uuid, FK to questions)
- position (int) — question order within the mock
- section (text) — section label (e.g. "Section A", "Section B")
- PK (mock_test_id, question_id)

### attempts
- id (uuid, PK)
- user_id (uuid, FK to profiles) — who took this attempt
- mock_test_id (uuid, FK to mock_tests)
- status (text, CHECK in IN_PROGRESS/SUBMITTED/REATTEMPT/EXPIRED)
- started_at (timestamptz) — when the student started
- submitted_at (timestamptz, nullable) — when submitted
- score (numeric, nullable) — final score, set by server grading

### responses
- id (uuid, PK)
- attempt_id (uuid, FK to attempts)
- question_id (uuid, FK to questions)
- answer (jsonb, nullable) — student's answer (option id or numeric string)
- time_spent_sec (int, nullable) — time spent on this question
- flagged (boolean, default false) — marked for review
- UNIQUE (attempt_id, question_id)

## Security
- No RLS enabled yet (that comes in 002_hardening.sql).
- The auto-profile trigger creates a profiles row for every new auth.users entry.

## Notes
1. RLS, policies, and the is_staff() function are added in 002_hardening.sql.
2. Focus topics, mastery scores, daily mocks, leaderboard, and public profiles are added in 003_patch2_focus_mastery.sql.
3. All student writes (attempts, responses) go through Edge Functions in later phases — students never insert/update these directly.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'EDITOR', 'ADMIN')),
  referral_code text UNIQUE,
  referred_by uuid REFERENCES profiles(id),
  entry_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new auth.users entry is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- subjects
-- =============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id int PRIMARY KEY,
  name text NOT NULL
);

-- =============================================================
-- chapters
-- =============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id int PRIMARY KEY,
  subject_id int NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_level int NOT NULL CHECK (class_level IN (11, 12)),
  ordinal int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

-- =============================================================
-- questions
-- =============================================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id int NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('MCQ', 'NUMERICAL')),
  difficulty text NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  statement_tex text NOT NULL,
  options_json jsonb,
  answer_json jsonb NOT NULL,
  tolerance numeric,
  solution_tex text,
  review_status text NOT NULL DEFAULT 'DRAFT' CHECK (review_status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON questions(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_type_difficulty ON questions(type, difficulty);

-- =============================================================
-- mock_tests
-- =============================================================
CREATE TABLE IF NOT EXISTS mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  mode text NOT NULL CHECK (mode IN ('PRACTICE', 'EXAM')),
  duration_min int NOT NULL,
  total_marks int NOT NULL,
  access text NOT NULL DEFAULT 'FREE' CHECK (access IN ('FREE', 'PREMIUM')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  proctoring_profile text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_tests_status ON mock_tests(status);

-- =============================================================
-- mock_test_questions
-- =============================================================
CREATE TABLE IF NOT EXISTS mock_test_questions (
  mock_test_id uuid NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  section text,
  PRIMARY KEY (mock_test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mtq_mock_test ON mock_test_questions(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mtq_question ON mock_test_questions(question_id);

-- =============================================================
-- attempts
-- =============================================================
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'REATTEMPT', 'EXPIRED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_mock_test ON attempts(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);

-- =============================================================
-- responses
-- =============================================================
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer jsonb,
  time_spent_sec int,
  flagged boolean NOT NULL DEFAULT false,
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_responses_attempt ON responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
