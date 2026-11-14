/*
# Add phone OTP and referral discount support

1. Changes to existing tables
- `profiles`: add `phone` (text, nullable), `phone_verified` (boolean, default false), `referral_code_used` (text, nullable)
- `transactions`: add `referral_discount_inr` (int, default 0)

2. New tables
- `referral_codes`: stores auto-generated referral codes for each user

3. Functions
- `generate_referral_code()`: SECURITY INVOKER, generates a unique 8-char code
- `apply_referral_discount(p_code text, p_amount int)`: validates referral code, computes 20% discount
- `generate_invoice_number()`: generates sequential invoice numbers

4. Security
- RLS enabled on referral_codes. Users can read any code (needed to validate). Only owner can insert.
- Profile columns are user-editable through existing UPDATE policy.
*/

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code_used text;

-- Add referral_discount_inr to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_discount_inr int DEFAULT 0;

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  times_used int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON referral_codes TO authenticated;
GRANT INSERT ON referral_codes TO authenticated;

DROP POLICY IF EXISTS "select_own_referral_code" ON referral_codes;
CREATE POLICY "select_own_referral_code"
ON referral_codes FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_referral_code" ON referral_codes;
CREATE POLICY "insert_own_referral_code"
ON referral_codes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Generate a unique 8-char referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_code text;
  v_user_id uuid := auth.uid();
  v_existing text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT code INTO v_existing FROM referral_codes WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  LOOP
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
  END LOOP;

  INSERT INTO referral_codes (user_id, code) VALUES (v_user_id, v_code);
  RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;

-- Validate and apply referral discount (20%)
CREATE OR REPLACE FUNCTION apply_referral_discount(p_code text, p_amount int)
RETURNS TABLE(valid boolean, discount_inr int, referrer_user_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_referral record;
  v_discount int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_referral FROM referral_codes WHERE code = upper(p_code);
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL::uuid;
    RETURN;
  END IF;

  IF v_referral.user_id = auth.uid() THEN
    RETURN QUERY SELECT false, 0, NULL::uuid;
    RETURN;
  END IF;

  v_discount := LEAST(p_amount, ROUND(p_amount * 0.20));

  UPDATE referral_codes SET times_used = times_used + 1 WHERE id = v_referral.id;

  RETURN QUERY SELECT true, v_discount, v_referral.user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_referral_discount(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_referral_discount(text, int) TO authenticated;

-- Invoice number sequence and function
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_num text;
BEGIN
  SELECT 'MN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0') INTO v_num;
  RETURN v_num;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
