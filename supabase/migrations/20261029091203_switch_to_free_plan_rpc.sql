/*
# Atomic switch to the Free plan

1. What changes
- Adds a function `switch_to_free_plan(p_plan_id)` that a signed-in student calls to move onto the Free plan.
- Inside one transaction it cancels any currently ACTIVE subscription rows for that student and creates one new ACTIVE row for the Free plan.
- If the student already has an ACTIVE row for that plan, nothing is changed and the existing row id is returned.

2. Why
- Previously the browser made two separate writes. If one failed, a student could end up with two ACTIVE subscriptions.

3. Security
- The function runs as the caller (SECURITY INVOKER), so the existing per-user row policies on user_subscriptions still apply.
- It only accepts active plans with a price of zero. Paid plans still go through checkout.
- Execute permission is removed from PUBLIC and anon, and granted to authenticated only.

4. Notes
- Uses the existing status text values. Cancelled rows use the status CANCELLED.
- Idempotent: CREATE OR REPLACE and GRANT/REVOKE can be re-run safely.
*/

CREATE OR REPLACE FUNCTION public.switch_to_free_plan(p_plan_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_price integer;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT price_inr INTO v_price
  FROM subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan is not available' USING ERRCODE = 'P0002';
  END IF;

  IF v_price <> 0 THEN
    RAISE EXCEPTION 'Only free plans can be activated directly' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_existing
  FROM user_subscriptions
  WHERE user_id = v_user AND status = 'ACTIVE' AND plan_id = p_plan_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  UPDATE user_subscriptions
  SET status = 'CANCELLED'
  WHERE user_id = v_user AND status = 'ACTIVE';

  INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
  VALUES (v_user, p_plan_id, 'ACTIVE', now())
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.switch_to_free_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_to_free_plan(uuid) TO authenticated;
