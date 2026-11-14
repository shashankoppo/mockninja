/*
# Allow self-update of profiles.full_name

1. Purpose
- The admin profile editor (and any signed-in user) needs to update their own display name.
- The existing column-level UPDATE grant on profiles covers avatar_url and notification flags but not full_name.
- This migration adds full_name to the allowed self-update column set.

2. Security
- No new tables or policies.
- RLS still applies: the existing UPDATE policy restricts updates to the user's own row (auth.uid() = id).
- Only widens the column grant for full_name on profiles for authenticated users.
- No role escalation, no sensitive columns (role, email, etc.) exposed.
*/

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, notif_mock_reminders, notif_streak_alerts, notif_weekly_report, notif_leaderboard_updates, notif_new_tests) ON public.profiles TO authenticated;
