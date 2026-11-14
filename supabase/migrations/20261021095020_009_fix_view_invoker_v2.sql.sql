/*
# MOCK NINJA — Recreate v_inactive_for_nudge with explicit SECURITY INVOKER
Postgres 17 supports SECURITY INVOKER on views via CREATE VIEW ... WITH (security_invoker = true).
*/

DROP VIEW IF EXISTS public.v_inactive_for_nudge;

CREATE VIEW public.v_inactive_for_nudge
WITH (security_invoker = true) AS
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

ALTER VIEW public.v_inactive_for_nudge OWNER TO postgres;
