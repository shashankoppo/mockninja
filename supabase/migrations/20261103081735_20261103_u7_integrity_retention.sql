/*
# U7 step 3: integrity event retention and daily purge

## Plain-English summary
Staff can choose how many days exam integrity event records are kept (default 90, allowed 7 to 365) at /admin/integrity. A daily scheduled job deletes event records older than that. Review notes are kept. Every retention change is written to the audit log.

## 1. Changes
- platform_settings: new row INTEGRITY_RETENTION with { "days": 90 }.
- New function admin_save_integrity_retention(p_days integer): staff only, validates the range, writes an audit_log row.
- New function integrity_purge_expired(): deletes integrity_events rows whose occurred_at is older than the retention setting. Run only by the scheduler.
- New daily cron job integrity-event-purge at 03:15 UTC.

## 2. Security
- Both functions are SECURITY DEFINER with a fixed search path. The save function checks is_staff() itself. The purge function has EXECUTE revoked from PUBLIC, anon and authenticated, so only the scheduler can run it.
- integrity_events grants narrowed: anon loses all privileges; authenticated keeps SELECT and INSERT only. Students and staff cannot edit or delete event rows from the browser. Existing RLS policies are unchanged.

## 3. Notes
- integrity_reviews rows are not purged; they are part of the staff record of the review.
- The purge does not write an audit row, because it is not a staff action.
*/

INSERT INTO public.platform_settings (key, value)
VALUES ('INTEGRITY_RETENTION', jsonb_build_object('days', 90))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_save_integrity_retention(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 7 AND 365 THEN
    RAISE EXCEPTION 'Retention must be between 7 and 365 days';
  END IF;

  SELECT value INTO v_before FROM public.platform_settings WHERE key = 'INTEGRITY_RETENTION';

  INSERT INTO public.platform_settings (key, value)
  VALUES ('INTEGRITY_RETENTION', jsonb_build_object('days', p_days))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (
    auth.uid(),
    'INTEGRITY_RETENTION_SAVED',
    'INTEGRITY_RETENTION',
    v_before,
    jsonb_build_object('days', p_days)
  );

  RETURN p_days;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_integrity_retention(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_integrity_retention(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.integrity_purge_expired()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_deleted integer;
BEGIN
  SELECT COALESCE((value->>'days')::integer, 90) INTO v_days
  FROM public.platform_settings
  WHERE key = 'INTEGRITY_RETENTION';
  v_days := COALESCE(v_days, 90);

  DELETE FROM public.integrity_events
  WHERE occurred_at < now() - make_interval(days => v_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.integrity_purge_expired() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.integrity_events FROM anon;
REVOKE UPDATE, DELETE ON public.integrity_events FROM authenticated;
GRANT SELECT, INSERT ON public.integrity_events TO authenticated;

SELECT cron.schedule(
  'integrity-event-purge',
  '15 3 * * *',
  $$SELECT public.integrity_purge_expired();$$
);
