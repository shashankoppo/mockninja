/*
# MOCK NINJA — Fix function execute grants (005_fix_function_grants.sql)

## Purpose
Explicitly revoke EXECUTE on security-sensitive functions from anon and
authenticated roles. REVOKE FROM PUBLIC alone is not sufficient on the
Supabase platform — the anon and authenticated roles may still have
explicit grants. This migration ensures:

- build_daily_target_mock: service role ONLY (called via Edge Function)
- refresh_mastery: service role ONLY (called by submit_attempt Edge Function)
- is_staff: authenticated only (used inside RLS policies)
- can_go_public: authenticated only (called from client)
- get_leaderboard: authenticated only (called from client)
- guard_profile_columns: no direct execute (trigger only)
- enforce_max_focus_topics: no direct execute (trigger only)
- handle_new_user: no direct execute (trigger only)
*/

REVOKE EXECUTE ON FUNCTION public.build_daily_target_mock(uuid, int, numeric, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_mastery(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_go_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_go_public(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int, int, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_max_focus_topics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
