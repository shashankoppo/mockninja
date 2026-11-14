/*
# Add student question reports

1. New table
- `question_reports` stores a student's report about a question encountered in a mock attempt.
- `id` uniquely identifies the report.
- `user_id` is filled from the signed-in session and identifies the reporter.
- `question_id`, `attempt_id`, and `mock_test_id` identify the reported question and context.
- `reason` records whether the issue is incorrect, ambiguous, a typo, an image problem, or another issue.
- `details` stores the student's explanation.
- `status`, `admin_note`, `resolved_by`, and `resolved_at` support staff review.
- `created_at` and `updated_at` provide an audit timeline.

2. Security
- Row-level security is enabled.
- Students may read their own reports and create reports only for themselves.
- Students cannot alter moderation or audit fields directly.
- Staff may read all reports.
- Staff status changes and notes go through a SECURITY DEFINER function that checks the caller's staff role.
- Direct table UPDATE and DELETE access is not granted to browser roles.

3. Important notes
- The browser never supplies the reporter identity; the database derives it from auth.uid().
- The report function validates allowed statuses and records the resolving staff member only for closed outcomes.
*/

CREATE TABLE IF NOT EXISTS question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES attempts(id) ON DELETE SET NULL,
  mock_test_id uuid REFERENCES mock_tests(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('INCORRECT', 'AMBIGUOUS', 'TYPO', 'IMAGE', 'OTHER')),
  details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  admin_note text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_reports_status_created_idx
  ON question_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS question_reports_user_created_idx
  ON question_reports (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS question_reports_user_attempt_question_idx
  ON question_reports (user_id, attempt_id, question_id)
  WHERE attempt_id IS NOT NULL;

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON question_reports TO authenticated;
GRANT INSERT (question_id, attempt_id, mock_test_id, reason, details) ON question_reports TO authenticated;

DROP POLICY IF EXISTS "question_reports_select_own_or_staff" ON question_reports;
CREATE POLICY "question_reports_select_own_or_staff" ON question_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_staff());

DROP POLICY IF EXISTS "question_reports_insert_own" ON question_reports;
CREATE POLICY "question_reports_insert_own" ON question_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_question_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE question_reports
  SET
    status = p_status,
    admin_note = NULLIF(trim(coalesce(p_admin_note, '')), ''),
    resolved_by = CASE WHEN p_status IN ('RESOLVED', 'DISMISSED') THEN auth.uid() ELSE NULL END,
    resolved_at = CASE WHEN p_status IN ('RESOLVED', 'DISMISSED') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_question_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_question_report(uuid, text, text) TO authenticated;
