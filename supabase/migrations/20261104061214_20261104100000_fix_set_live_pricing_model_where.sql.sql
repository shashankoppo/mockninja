/*
# Fix "UPDATE requires a WHERE clause" in live pricing switch

1. Modified functions
- `set_live_pricing_model(text)` now includes an explicit WHERE clause on its
  UPDATE of `subscription_plans`, so the database accepts it.

2. Behaviour
- Same as before: only admins may call it; it marks plans of the chosen pricing
  model (and free plans) as active and the others inactive.

3. Security
- SECURITY INVOKER is kept, so the existing admin-only update policy still applies.
- Execute grants are unchanged (CREATE OR REPLACE keeps them).
*/

CREATE OR REPLACE FUNCTION public.set_live_pricing_model(p_model text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can change the live pricing model' USING ERRCODE = '42501';
  END IF;
  IF p_model NOT IN ('TIERS', 'BUNDLES') THEN
    RAISE EXCEPTION 'Unknown pricing model' USING ERRCODE = '22023';
  END IF;
  UPDATE subscription_plans
  SET is_active = (pricing_model = p_model OR price_inr = 0),
      updated_at = now()
  WHERE id IS NOT NULL;
END;
$$;
