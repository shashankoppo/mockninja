/*
# MOCK NINJA — Fix security advisor findings (006_fix_advisor_findings.sql)

## Purpose
Addresses security advisor findings:
1. v_inactive_for_nudge view: change from SECURITY DEFINER to SECURITY INVOKER
   (default). The view reads profiles which the nudge Edge Function accesses
   via service role, so INVOKER is correct.
2. can_go_public: change from SECURITY DEFINER to SECURITY INVOKER. Students
   can already read their own profile via RLS, so INVOKER works. The function
   only reads birth_year and guardian_consent_at from the caller's own row.

## Functions left as SECURITY DEFINER (intentional)
- is_staff(): called inside RLS policies; needs to read profiles.role
  regardless of which rows the caller can see.
- get_leaderboard(): needs to read ALL opted-in students' mastery_scores,
  which RLS would restrict to own-only under INVOKER.
- build_daily_target_mock(), refresh_mastery(): service-role only, not
  callable by authenticated or anon.
*/

-- Fix v_inactive_for_nudge: recreate as SECURITY INVOKER (default)
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

-- Fix can_go_public: change to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.can_go_public(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.can_go_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_go_public(uuid) TO authenticated;
