/*
# AI generation orchestration

1. New Tables
- `ai_generation_jobs`: one row per request to generate draft questions. Records who asked, which chapter, type, difficulty, requested count, provider and model used, status (QUEUED, RUNNING, SUCCEEDED, FAILED), how many questions were created or skipped, token counts, estimated cost in paise, and any error message.

2. Settings
- Seeds `platform_settings` key `AI_PROVIDER_SETTINGS` with the default provider (gemini), model, and per-million-token prices in paise. Admins can change these from the AI studio. Existing rows are left untouched.

3. Security
- Enable RLS on `ai_generation_jobs`.
- Staff (ADMIN) can read jobs through `is_staff()`. No client write policies: only the server (service role) creates and updates jobs.
- `ai_usage_ledger`: anon loses all access; authenticated loses write access. Only the server writes usage rows. Staff keep read access through the existing policy.

4. Notes
- Nothing is dropped or altered in existing tables beyond revoking unused client write grants on the usage ledger.
- The statements are idempotent and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  chapter_id integer NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('MCQ', 'NUMERICAL')),
  difficulty text NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  requested_count integer NOT NULL CHECK (requested_count BETWEEN 1 AND 10),
  provider text NOT NULL,
  model text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  skipped_count integer NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  tokens_in integer NOT NULL DEFAULT 0 CHECK (tokens_in >= 0),
  tokens_out integer NOT NULL DEFAULT 0 CHECK (tokens_out >= 0),
  cost_paise integer NOT NULL DEFAULT 0 CHECK (cost_paise >= 0),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_created_at_idx ON ai_generation_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_jobs_chapter_id_idx ON ai_generation_jobs (chapter_id);
CREATE INDEX IF NOT EXISTS ai_generation_jobs_requested_by_idx ON ai_generation_jobs (requested_by);

ALTER TABLE ai_generation_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai_generation_jobs FROM PUBLIC, anon;
GRANT SELECT ON ai_generation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_generation_jobs TO service_role;

DROP POLICY IF EXISTS "select_ai_jobs_staff" ON ai_generation_jobs;
CREATE POLICY "select_ai_jobs_staff" ON ai_generation_jobs FOR SELECT
  TO authenticated USING (is_staff());

INSERT INTO platform_settings (key, value)
SELECT 'AI_PROVIDER_SETTINGS', jsonb_build_object(
  'provider', 'gemini',
  'model', 'gemini-2.5-flash',
  'input_paise_per_million', 2500,
  'output_paise_per_million', 21000
)
WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = 'AI_PROVIDER_SETTINGS');

REVOKE ALL ON ai_usage_ledger FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ai_usage_ledger FROM authenticated;
