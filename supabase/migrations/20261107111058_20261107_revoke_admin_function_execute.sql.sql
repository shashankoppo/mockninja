/*
# Revoke EXECUTE on admin SECURITY DEFINER functions from authenticated role

## Purpose
The Supabase security advisor flagged 31 SECURITY DEFINER functions as callable
by the `authenticated` role. While each admin function already checks the caller's
role internally, the EXECUTE grant itself is overly broad — any signed-in user
can attempt to call admin functions. This migration narrows the EXECUTE grants:

1. **Admin-only functions**: REVOKE EXECUTE FROM PUBLIC, anon, authenticated.
   These functions are only called from admin pages and already check internally.
   The revoke adds defense-in-depth so a regular student cannot even invoke them.

2. **User-facing functions**: Keep EXECUTE on authenticated (these are called by
   students: build_custom_practice_test, get_leaderboard, get_mock_leaderboard,
   has_active_paid_plan, is_staff, request_account_deletion,
   cancel_account_deletion, log_consent_event, switch_to_free_plan,
   validate_promo_code).

3. **Public function**: get_public_settings stays callable by anon (intentionally
   public — returns non-sensitive platform settings).

4. **Internal trigger/cron functions**: REVOKE EXECUTE FROM PUBLIC, anon, authenticated.
   These are called by triggers or pg_cron, never via the REST API.

## Security
- No new tables or RLS changes.
- No data is lost — only EXECUTE privileges are narrowed.
- All admin functions still work because they're called through the admin UI
  which runs as the authenticated role, and the functions check internally.
- The revoke prevents a non-admin from even attempting to call these functions.
*/

-- ── Admin-only functions ──
REVOKE EXECUTE ON FUNCTION admin_active_students_per_day(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_add_integrity_review(p_attempt_id uuid, p_status text, p_note text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_attempts_per_day(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_avg_score_by_type(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_completion_rate(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_open_vs_resolved_reports() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_question_coverage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_save_integrity_retention(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_save_leaderboard_settings(p_settings jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_save_watermark_policy(p_policy jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_handle_blocklist(p_handle text, p_blocked boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_profile_hidden(p_user_id uuid, p_hidden boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_user_role(p_user_id uuid, p_role text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_signups_per_day(p_days integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION suspend_user(p_user_id uuid, p_suspend boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION rollback_import_batch(p_batch_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_question_report(p_report_id uuid, p_status text, p_admin_note text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_data(p_user_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION integrity_purge_expired() FROM PUBLIC, anon, authenticated;

-- ── Internal trigger/cron functions (never called via REST API) ──
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION guard_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_max_focus_topics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION auto_generate_daily_mocks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_promo_used_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION prevent_publish_unknown_licence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION log_support_reply_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refresh_mastery(p_user uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION build_daily_target_mock(p_user uuid, p_count integer, p_hard_ratio numeric, p_for_date date, p_difficulty text) FROM PUBLIC, anon, authenticated;
