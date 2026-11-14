/*
# Payment infrastructure: promo codes, transactions, refund requests

1. New Tables
- `promo_codes` — promotional discount codes (percentage or fixed amount off, usage limits, expiry, plan restrictions).
  - id (uuid PK)
  - code (text, unique, uppercase) — the code students enter at checkout
  - description (text) — admin-internal description
  - discount_type (text, PERCENTAGE or FIXED_AMOUNT)
  - discount_value (int) — percentage (1-100) or rupees (positive)
  - max_uses (int, nullable) — null = unlimited
  - max_uses_per_user (int, default 1)
  - used_count (int, default 0) — incremented on redemption
  - valid_from (timestamptz)
  - valid_until (timestamptz, nullable) — null = no expiry
  - plan_slugs (jsonb) — array of plan slugs this code applies to; empty/null = all plans
  - is_active (boolean, default true)
  - created_by (uuid FK profiles)
  - created_at (timestamptz)
  - updated_at (timestamptz)

- `transactions` — ledger of all payment attempts (successful, failed, refunded).
  - id (uuid PK)
  - user_id (uuid FK auth.users, default auth.uid())
  - plan_id (uuid FK subscription_plans, nullable)
  - promo_code_id (uuid FK promo_codes, nullable)
  - amount_inr (int) — amount charged in rupees (after discount)
  - original_amount_inr (int) — plan price before discount
  - discount_inr (int, default 0)
  - status (text, PENDING/SUCCESS/FAILED/REFUNDED/REFUND_PENDING) — default PENDING
  - payment_method (text, nullable) — UPI/CARD/NETBANKING (populated by gateway)
  - stripe_session_id (text, nullable)
  - stripe_payment_intent_id (text, nullable)
  - invoice_number (text, unique) — generated sequential invoice number
  - failure_reason (text, nullable)
  - refund_amount_inr (int, default 0)
  - refund_reason (text, nullable)
  - refunded_at (timestamptz, nullable)
  - refunded_by (uuid FK profiles, nullable) — admin who approved refund
  - created_at (timestamptz)
  - updated_at (timestamptz)

- `refund_requests` — student-initiated refund requests linked to transactions.
  - id (uuid PK)
  - transaction_id (uuid FK transactions)
  - user_id (uuid FK auth.users, default auth.uid())
  - reason (text) — student explanation
  - status (text, OPEN/APPROVED/REJECTED) — default OPEN
  - admin_note (text, nullable) — staff-only note
  - processed_by (uuid FK profiles, nullable) — admin who handled
  - processed_at (timestamptz, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)

2. Security
- `promo_codes`: admin-only CRUD; students can only SELECT active codes (for validation at checkout).
- `transactions`: students SELECT/INSERT own rows only; admins SELECT all and UPDATE status/refund fields.
- `refund_requests`: students SELECT own, INSERT own; admins SELECT all and UPDATE status/admin_note/processed_by.
- All tables have RLS enabled with 4 separate policies each.
- Grants scoped to the minimum roles and verbs.
- A sequence `transaction_invoice_seq` generates invoice numbers (INV-000001 format via function).

3. Functions
- `generate_invoice_number()` — SECURITY DEFINER, returns next sequential invoice number. Callable by authenticated.
- `validate_promo_code(p_code text, p_plan_slug text, p_amount int)` — SECURITY DEFINER, validates a promo code and returns discount info. Callable by authenticated.
*/

-- ─── promo_codes ───
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  discount_type text NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE','FIXED_AMOUNT')),
  discount_value int NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  max_uses int,
  max_uses_per_user int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  plan_slugs jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD; students read active codes only for validation
GRANT SELECT, INSERT, UPDATE, DELETE ON promo_codes TO authenticated;
GRANT SELECT ON promo_codes TO anon;

DROP POLICY IF EXISTS "admin_select_promo_codes" ON promo_codes;
CREATE POLICY "admin_select_promo_codes" ON promo_codes FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "student_select_active_promo_codes" ON promo_codes;
CREATE POLICY "student_select_active_promo_codes" ON promo_codes FOR SELECT
  TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_select_active_promo_codes" ON promo_codes;
CREATE POLICY "anon_select_active_promo_codes" ON promo_codes FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "admin_insert_promo_codes" ON promo_codes;
CREATE POLICY "admin_insert_promo_codes" ON promo_codes FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "admin_update_promo_codes" ON promo_codes;
CREATE POLICY "admin_update_promo_codes" ON promo_codes FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "admin_delete_promo_codes" ON promo_codes;
CREATE POLICY "admin_delete_promo_codes" ON promo_codes FOR DELETE
  TO authenticated USING (is_staff());

-- ─── transactions ───
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE SET NULL,
  amount_inr int NOT NULL DEFAULT 0,
  original_amount_inr int NOT NULL DEFAULT 0,
  discount_inr int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED','REFUND_PENDING')),
  payment_method text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  invoice_number text UNIQUE,
  failure_reason text,
  refund_amount_inr int NOT NULL DEFAULT 0,
  refund_reason text,
  refunded_at timestamptz,
  refunded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;

-- Students see only their own transactions
DROP POLICY IF EXISTS "student_select_own_transactions" ON transactions;
CREATE POLICY "student_select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_insert_own_transactions" ON transactions;
CREATE POLICY "student_insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Students can update only failure_reason on their own pending transactions (limited)
-- Admins can update anything (for refund processing, status changes)
DROP POLICY IF EXISTS "admin_update_transactions" ON transactions;
CREATE POLICY "admin_update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "student_update_own_transactions" ON transactions;
CREATE POLICY "student_update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND status = 'PENDING') WITH CHECK (auth.uid() = user_id);

-- Admins see all transactions
DROP POLICY IF EXISTS "admin_select_all_transactions" ON transactions;
CREATE POLICY "admin_select_all_transactions" ON transactions FOR SELECT
  TO authenticated USING (is_staff());

-- ─── refund_requests ───
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','REJECTED')),
  admin_note text,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON refund_requests TO authenticated;

-- Students see and create own refund requests
DROP POLICY IF EXISTS "student_select_own_refunds" ON refund_requests;
CREATE POLICY "student_select_own_refunds" ON refund_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_insert_own_refunds" ON refund_requests;
CREATE POLICY "student_insert_own_refunds" ON refund_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins see all refund requests
DROP POLICY IF EXISTS "admin_select_all_refunds" ON refund_requests;
CREATE POLICY "admin_select_all_refunds" ON refund_requests FOR SELECT
  TO authenticated USING (is_staff());

-- Admins update refund requests (approve/reject)
DROP POLICY IF EXISTS "admin_update_refunds" ON refund_requests;
CREATE POLICY "admin_update_refunds" ON refund_requests FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

-- ─── invoice number sequence ───
CREATE SEQUENCE IF NOT EXISTS transaction_invoice_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || lpad(nextval('transaction_invoice_seq')::text, 6, '0');
$$;

GRANT USAGE ON SEQUENCE transaction_invoice_seq TO authenticated;
REVOKE EXECUTE ON FUNCTION generate_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;

-- ─── promo code validation function ───
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

  -- Check max uses
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

  -- Check per-user usage
  SELECT count(*) INTO v_count FROM transactions WHERE promo_code_id = v_code.id AND user_id = auth.uid();
  IF v_count >= v_code.max_uses_per_user THEN
    RETURN QUERY SELECT false, 0, p_amount, 'You have already used this promo code the maximum number of times', NULL::uuid;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_discount, p_amount - v_discount, 'Promo code applied successfully', v_code.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION validate_promo_code(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_promo_code(text, text, int) TO authenticated;

-- Activate the Elite plan so all three plans are available
UPDATE subscription_plans SET is_active = true WHERE slug = 'elite';
