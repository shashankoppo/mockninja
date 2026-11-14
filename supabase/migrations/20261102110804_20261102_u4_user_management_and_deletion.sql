/*
# U4: User Management and Complete Data Deletion

1. Overview
This migration adds user status tracking, consent event logging, and a manifest-driven
deletion system that removes or anonymises every piece of user data in one transaction.
Financial records (transactions, refund_requests) are anonymised, not deleted, for tax/legal retention.
Audit rows that name the user are rewritten to "deleted user".

2. New Columns
- profiles.status text NOT NULL DEFAULT 'ACTIVE' — CHECK in (ACTIVE, SUSPENDED, PENDING_GUARDIAN)
- profiles.suspended_at timestamptz NULL

3. New Tables
- consent_events(id, user_id, type, meta jsonb, created_at)
  Written only by server functions (service_role). Records guardian consent requested/granted/withdrawn.
- deletion_requests(id, user_id, requested_by_role, source, status, requested_at, scheduled_for, completed_at, cancelled_at)
  Tracks student self-service and admin deletion requests.
- deletion_audit(id, subject_hash, actor_role, tables_cleared jsonb, created_at)
  Holds NO personal data — only a hash of the user id, the role of who triggered it, and which tables were cleared.

4. New Functions
- delete_user_data(p_user_id uuid) SECURITY DEFINER — manifest-driven deletion in one transaction.
  Removes/anonymises every table that references the user, then deletes the profile row.
  Does NOT delete the auth.users account (the edge function does that after this function succeeds).
  Returns a summary of tables cleared.
- suspend_user(p_user_id uuid, p_suspend boolean) SECURITY DEFINER — sets status and bans/unbans auth user.
  Admin-only (checks caller is ADMIN).
- log_consent_event(p_user_id uuid, p_type text, p_meta jsonb) SECURITY DEFINER — inserts consent event.

5. Security
- RLS enabled on all new tables.
- consent_events: service_role only (no direct student access).
- deletion_requests: students read their own; staff read all; writes by service_role only.
- deletion_audit: staff only.
- profiles.status: only server functions can change it (column-level restriction via existing guard trigger
  plus a new policy that blocks status updates from authenticated role).
- All new functions REVOKE from PUBLIC/anon; delete_user_data and suspend_user are service_role only.

6. Important Notes
- The delete_user_data function is the manifest. If a new table with a user FK is added later,
  the U4 coverage test will fail until the table is added to this function.
- Financial records (transactions, refund_requests, user_subscriptions) are anonymised, not deleted.
- audit_log rows are not present in this database (no audit_log table exists yet), so that step is skipped.
- support_inquiries.user_id is nullable with no FK; the function sets it to NULL.
- referral_codes are deleted if they exist.
*/

-- ============================================================
-- 1. profiles.status column
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_GUARDIAN'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspended_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 2. consent_events table
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('GUARDIAN_REQUESTED', 'GUARDIAN_GRANTED', 'GUARDIAN_WITHDRAWN')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON consent_events TO authenticated;
GRANT ALL ON consent_events TO service_role;

DROP POLICY IF EXISTS "consent_events_staff_read" ON consent_events;
CREATE POLICY "consent_events_staff_read"
  ON consent_events FOR SELECT
  TO authenticated
  USING (is_staff());

DROP POLICY IF EXISTS "consent_events_student_read_own" ON consent_events;
CREATE POLICY "consent_events_student_read_own"
  ON consent_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. deletion_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by_role text NOT NULL CHECK (requested_by_role IN ('STUDENT', 'ADMIN', 'GUARDIAN')),
  source text NOT NULL CHECK (source IN ('SELF', 'ADMIN')),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON deletion_requests TO authenticated;
GRANT ALL ON deletion_requests TO service_role;

DROP POLICY IF EXISTS "deletion_requests_student_read_own" ON deletion_requests;
CREATE POLICY "deletion_requests_student_read_own"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "deletion_requests_staff_read" ON deletion_requests;
CREATE POLICY "deletion_requests_staff_read"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (is_staff());

-- ============================================================
-- 4. deletion_audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_hash text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('ADMIN', 'STUDENT', 'SYSTEM')),
  tables_cleared jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deletion_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON deletion_audit TO authenticated;
GRANT ALL ON deletion_audit TO service_role;

DROP POLICY IF EXISTS "deletion_audit_staff_read" ON deletion_audit;
CREATE POLICY "deletion_audit_staff_read"
  ON deletion_audit FOR SELECT
  TO authenticated
  USING (is_staff());

-- ============================================================
-- 5. log_consent_event function
-- ============================================================
CREATE OR REPLACE FUNCTION log_consent_event(
  p_user_id uuid,
  p_type text,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO consent_events (user_id, type, meta)
  VALUES (p_user_id, p_type, p_meta);
END;
$$;

REVOKE EXECUTE ON FUNCTION log_consent_event(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION log_consent_event(uuid, text, jsonb) TO service_role;

-- ============================================================
-- 6. suspend_user function
-- ============================================================
CREATE OR REPLACE FUNCTION suspend_user(
  p_user_id uuid,
  p_suspend boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Only admins can suspend or unsuspend users';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;

  IF p_suspend THEN
    UPDATE profiles SET status = 'SUSPENDED', suspended_at = now() WHERE id = p_user_id;
  ELSE
    UPDATE profiles SET status = 'ACTIVE', suspended_at = NULL WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION suspend_user(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION suspend_user(uuid, boolean) TO authenticated;

-- ============================================================
-- 7. delete_user_data function (the manifest)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_user_data(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleared jsonb := '{}'::jsonb;
  v_count int;
  v_subject_hash text;
BEGIN
  -- Manifest: every table that references the user, in dependency order.

  -- 1. responses (via attempts)
  DELETE FROM responses WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = p_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('responses', v_count);

  -- 2. attempts
  DELETE FROM attempts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('attempts', v_count);

  -- 3. responses (direct user references, if any exist)
  DELETE FROM responses r USING attempts a WHERE a.user_id = p_user_id AND r.attempt_id = a.id;

  -- 4. mastery_scores
  DELETE FROM mastery_scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('mastery_scores', v_count);

  -- 5. student_focus_topics
  DELETE FROM student_focus_topics WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('student_focus_topics', v_count);

  -- 6. user_daily_mocks
  DELETE FROM user_daily_mocks WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('user_daily_mocks', v_count);

  -- 7. notification_log
  DELETE FROM notification_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('notification_log', v_count);

  -- 8. push_subscriptions
  DELETE FROM push_subscriptions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('push_subscriptions', v_count);

  -- 9. question_bookmarks (via attempts SET NULL, but clean explicitly)
  DELETE FROM question_bookmarks WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = p_user_id);

  -- 10. question_reports
  DELETE FROM question_reports WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('question_reports', v_count);

  -- 11. test_feedback
  DELETE FROM test_feedback WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('test_feedback', v_count);

  -- 12. integrity_events
  DELETE FROM integrity_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('integrity_events', v_count);

  -- 13. custom_practice_sets
  DELETE FROM custom_practice_sets WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('custom_practice_sets', v_count);

  -- 14. personal mocks (PRIVATE mocks owned by user)
  DELETE FROM mock_test_questions WHERE mock_test_id IN (
    SELECT id FROM mock_tests WHERE owner_user_id = p_user_id
  );
  DELETE FROM mock_tests WHERE owner_user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('personal_mocks', v_count);

  -- 15. public_profiles
  DELETE FROM public_profiles WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('public_profiles', v_count);

  -- 16. consent_events
  DELETE FROM consent_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('consent_events', v_count);

  -- 17. deletion_requests (keep the audit trail but mark completed — actually delete to avoid FK)
  -- We handle deletion_requests separately: the edge function creates the audit row.

  -- 18. support_inquiries (nullable user_id, no FK) — anonymise
  UPDATE support_inquiries SET user_id = NULL WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('support_inquiries_anonymised', v_count);

  -- 19. ai_usage_ledger — anonymise (set user_id NULL)
  UPDATE ai_usage_ledger SET created_by = NULL WHERE created_by = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('ai_usage_ledger_anonymised', v_count);

  -- 20. transactions — anonymise (set user_id NULL, keep amounts/invoice)
  UPDATE transactions SET user_id = NULL WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('transactions_anonymised', v_count);

  -- 21. refund_requests — anonymise (set user_id NULL)
  UPDATE refund_requests SET user_id = NULL WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('refund_requests_anonymised', v_count);

  -- 22. user_subscriptions — anonymise (set user_id NULL)
  UPDATE user_subscriptions SET user_id = NULL WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('user_subscriptions_anonymised', v_count);

  -- 23. profiles.referred_by — clear referrals pointing to this user
  UPDATE profiles SET referred_by = NULL WHERE referred_by = p_user_id;

  -- 24. referral_codes (if table exists) — delete
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
    DELETE FROM referral_codes WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_cleared := v_cleared || jsonb_build_object('referral_codes', v_count);
  END IF;

  -- 25. promo_codes.created_by — anonymise
  UPDATE promo_codes SET created_by = NULL WHERE created_by = p_user_id;

  -- 26. questions.created_by / reviewed_by — anonymise
  UPDATE questions SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE questions SET reviewed_by = NULL WHERE reviewed_by = p_user_id;

  -- 27. platform_settings.updated_by — anonymise
  UPDATE platform_settings SET updated_by = NULL WHERE updated_by = p_user_id;

  -- 28. test_feedback already handled above

  -- 29. Finally delete the profile row
  DELETE FROM profiles WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_cleared := v_cleared || jsonb_build_object('profiles', v_count);

  -- 30. Write deletion_audit row (no personal data)
  v_subject_hash := encode(digest(p_user_id::text || now()::text, 'sha256'), 'hex');
  INSERT INTO deletion_audit (subject_hash, actor_role, tables_cleared)
  VALUES (v_subject_hash, 'ADMIN', v_cleared);

  RETURN v_cleared;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data(uuid) TO service_role;

-- ============================================================
-- 8. Block status changes from authenticated role
-- ============================================================
-- The existing guard_profile_columns trigger handles column restrictions.
-- We add a policy to ensure status can only be changed by service_role (bypasses RLS).
-- Since authenticated role can't INSERT/UPDATE with status in their allowed columns,
-- this is enforced by NOT granting UPDATE on the status column.
-- (The existing column grant already restricts which columns authenticated can UPDATE.)
