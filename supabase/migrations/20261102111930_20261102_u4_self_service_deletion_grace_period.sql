/*
# Add student account deletion requests with a configurable grace period

1. Configuration
- Adds `ACCOUNT_DELETION_GRACE_DAYS` to `platform_settings` with a default of 7 days.
- A value of 0 schedules immediate deletion.

2. Functions
- `request_account_deletion()` creates or reuses the signed-in student's open deletion request.
- `cancel_account_deletion()` cancels the signed-in student's open request.
- Both functions use the caller identity from `auth.uid()` and never accept a target user id.

3. Security
- Functions run with SECURITY DEFINER and explicitly validate the signed-in caller.
- Only authenticated users can execute them.
- The existing deletion request RLS remains the source of truth for reading a user's own request.

4. Important notes
- The request function does not delete data from the browser.
- Immediate deletion is returned as a scheduled request for the account deletion Edge Function to complete.
- Existing completed, cancelled, or expired history is preserved.
*/

INSERT INTO public.platform_settings (key, value)
VALUES ('ACCOUNT_DELETION_GRACE_DAYS', '{"days": 7}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_days integer := 7;
  v_request public.deletion_requests;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT GREATEST(0, LEAST(90, COALESCE((value->>'days')::integer, 7)))
  INTO v_days
  FROM public.platform_settings
  WHERE key = 'ACCOUNT_DELETION_GRACE_DAYS';

  SELECT * INTO v_request
  FROM public.deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('REQUESTED', 'SCHEDULED')
  ORDER BY requested_at DESC
  LIMIT 1;

  IF v_request.id IS NULL THEN
    INSERT INTO public.deletion_requests (
      user_id, requested_by_role, source, status, requested_at, scheduled_for
    )
    SELECT
      v_user_id,
      p.role,
      'STUDENT',
      'SCHEDULED',
      now(),
      now() + make_interval(days => v_days)
    FROM public.profiles p
    WHERE p.id = v_user_id
    RETURNING * INTO v_request;
  END IF;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN jsonb_build_object(
    'request_id', v_request.id,
    'status', v_request.status,
    'scheduled_for', v_request.scheduled_for,
    'grace_days', v_days
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.deletion_requests
  SET status = 'CANCELLED'
  WHERE user_id = v_user_id
    AND status IN ('REQUESTED', 'SCHEDULED');

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;