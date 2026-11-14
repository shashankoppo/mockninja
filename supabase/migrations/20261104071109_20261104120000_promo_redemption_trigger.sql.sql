/*
# Record promo code redemptions via trigger

1. Summary
The `promo_codes.used_count` column was documented as "incremented on redemption" but nothing in the schema or code actually incremented it. This migration adds a trigger on `transactions` that increments `used_count` when a transaction's status transitions to `SUCCESS` and decrements it when it transitions away from `SUCCESS`. This is server-enforced and cannot be bypassed by any client code path.

2. Changes
- New function `sync_promo_used_count()` (PL/pgSQL, SECURITY DEFINER, pinned search_path) that compares OLD.status vs NEW.status and updates `promo_codes.used_count` accordingly.
- New trigger `transactions_promo_used_count_sync` firing AFTER UPDATE on `transactions`.
- Updated `validate_promo_code` per-user check to count only non-FAILED transactions (previously counted all rows including FAILED and PENDING, which blocked legitimate reuse after a failed or abandoned payment).

3. Security
- The trigger function is SECURITY DEFINER with `search_path = public` so it can update `promo_codes` regardless of caller RLS.
- No new grants on `promo_codes` (the trigger runs as owner).
- `sync_promo_used_count` is not callable directly: no EXECUTE grant to anon or authenticated (only the trigger fires it).

4. Important notes
- The increment/decrement is idempotent per row: if the same row is updated multiple times while staying SUCCESS, no change occurs (only a transition to or from SUCCESS triggers the update).
- If a transaction is inserted directly with status `SUCCESS` (e.g. by a payment webhook), the trigger does NOT fire on INSERT — only on UPDATE transitions. A future payment-webhook migration should either insert as PENDING then update to SUCCESS, or add an INSERT trigger.
- The per-user validation fix means a FAILED or REFUNDED transaction no longer counts toward `max_uses_per_user`.
*/

-- ─── trigger function: sync promo_codes.used_count on transaction status change ───

CREATE OR REPLACE FUNCTION sync_promo_used_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when promo_code_id is set and status actually changed
  IF NEW.promo_code_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'SUCCESS' AND OLD.status <> 'SUCCESS' THEN
      UPDATE promo_codes SET used_count = used_count + 1, updated_at = now() WHERE id = NEW.promo_code_id;
    ELSIF OLD.status = 'SUCCESS' AND NEW.status <> 'SUCCESS' THEN
      UPDATE promo_codes SET used_count = GREATEST(used_count - 1, 0), updated_at = now() WHERE id = NEW.promo_code_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_promo_used_count_sync ON transactions;
CREATE TRIGGER transactions_promo_used_count_sync
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_promo_used_count();

REVOKE EXECUTE ON FUNCTION sync_promo_used_count() FROM PUBLIC, anon;

-- ─── fix per-user validation: count only non-FAILED transactions ───

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code text,
  p_plan_slug text,
  p_amount int
)
RETURNS TABLE(
  valid boolean,
  discount_inr int,
  final_amount int,
  message text,
  promo_code_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code record;
  v_discount int;
  v_count int;
BEGIN
  SELECT * INTO v_code FROM promo_codes WHERE UPPER(code) = UPPER(p_code) AND is_active = true LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, p_amount, 'Invalid or expired promo code', NULL::uuid;
    RETURN;
  END IF;

  -- Check date validity
  IF now() < v_code.valid_from THEN
    RETURN QUERY SELECT false, 0, p_amount, 'This promo code is not active yet', NULL::uuid;
    RETURN;
  END IF;

  IF v_code.valid_until IS NOT NULL AND now() > v_code.valid_until THEN
    RETURN QUERY SELECT false, 0, p_amount, 'This promo code has expired', NULL::uuid;
    RETURN;
  END IF;

  -- Check max uses (count only successful redemptions)
  IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN
    RETURN QUERY SELECT false, 0, p_amount, 'This promo code has reached its usage limit', NULL::uuid;
    RETURN;
  END IF;

  -- Check plan restriction
  IF v_code.plan_slugs IS NOT NULL AND jsonb_array_length(v_code.plan_slugs) > 0 THEN
    IF NOT v_code.plan_slugs ? p_plan_slug THEN
      RETURN QUERY SELECT false, 0, p_amount, 'This promo code is not valid for the selected plan', NULL::uuid;
      RETURN;
    END IF;
  END IF;

  -- Calculate discount
  IF v_code.discount_type = 'PERCENTAGE' THEN
    v_discount := LEAST((p_amount * v_code.discount_value) / 100, p_amount);
  ELSE
    v_discount := LEAST(v_code.discount_value, p_amount);
  END IF;

  -- Check per-user usage (count only non-FAILED transactions: PENDING and SUCCESS both block reuse)
  SELECT count(*) INTO v_count FROM transactions
    WHERE promo_code_id = v_code.id AND user_id = auth.uid() AND status <> 'FAILED';
  IF v_count >= v_code.max_uses_per_user THEN
    RETURN QUERY SELECT false, 0, p_amount, 'You have already used this promo code the maximum number of times', NULL::uuid;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_discount, p_amount - v_discount, 'Promo code applied successfully', v_code.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION validate_promo_code(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_promo_code(text, text, int) TO authenticated;
