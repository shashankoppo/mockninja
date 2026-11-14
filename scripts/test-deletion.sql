-- U4 FK Coverage Test
-- This test FAILS if any table with a foreign key to profiles.id or auth.users.id
-- is missing from the delete_user_data manifest AND lacks ON DELETE CASCADE or SET NULL.
-- Run with: psql $SUPABASE_DB_URL -f scripts/test-deletion.sql
--
-- A new table with a user FK must either:
--   1. Be added to the delete_user_data() manifest, OR
--   2. Have ON DELETE CASCADE or ON DELETE SET NULL on its FK constraint.
-- Otherwise this test reports it as a gap.

WITH user_fk_tables AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    con.conname AS constraint_name,
    con.confdeltype AS delete_rule
  FROM pg_constraint con
  JOIN pg_class c ON con.conrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_class ref ON con.confrelid = ref.oid
  JOIN pg_namespace refn ON ref.relnamespace = refn.oid
  WHERE con.contype = 'f'
    AND n.nspname = 'public'
    AND (refn.nspname = 'public' AND ref.relname = 'profiles'
         OR refn.nspname = 'auth' AND ref.relname = 'users')
),
manifest_tables AS (
  SELECT jsonb_array_elements_text(
    jsonb_build_array(
      'responses','attempts','mastery_scores','student_focus_topics',
      'user_daily_mocks','notification_log','push_subscriptions',
      'question_bookmarks','question_reports','test_feedback',
      'integrity_events','custom_practice_sets','mock_tests',
      'public_profiles','consent_events','support_inquiries',
      'ai_usage_ledger','transactions','refund_requests',
      'user_subscriptions','referral_codes','promo_codes',
      'questions','platform_settings','profiles',
      'mock_test_questions','deletion_requests','deletion_audit'
    )
  ) AS table_name
)
SELECT
  f.table_name,
  f.constraint_name,
  CASE
    WHEN f.delete_rule IN ('c', 'n') THEN 'CASCADE/SET NULL - OK'
    WHEN m.table_name IS NOT NULL THEN 'In manifest - OK'
    ELSE 'GAP - needs manifest entry or ON DELETE CASCADE/SET NULL'
  END AS status
FROM user_fk_tables f
LEFT JOIN manifest_tables m ON f.table_name = m.table_name
ORDER BY f.table_name;
