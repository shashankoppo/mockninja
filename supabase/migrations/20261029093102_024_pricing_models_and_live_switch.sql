/*
# Second pricing model (bundles) managed from the admin panel

Plain-English summary
- Adds a second pricing model next to the existing monthly tiers. The second model sells
  bundles with a fixed number of mock tests: Full Syllabus (one-time), Maths Monthly
  (monthly) and Maths Yearly (one-time).
- Only one model is live at a time. The admin chooses the live model from the admin panel.
- Free plans stay live under both models.

1. Modified table: subscription_plans
- pricing_model (text, default 'TIERS', CHECK TIERS or BUNDLES): which model a plan belongs to.
  Existing plans become TIERS.
- mock_quota (int, nullable, CHECK >= 0): number of mock tests included per billing period.
  NULL means the plan does not state a mock count.

2. Seeded data (inserted only if the slug is missing)
- full-syllabus: 499 INR, ONE_TIME, 10 mocks, inactive.
- maths-monthly: 99 INR, MONTHLY, 4 mocks, inactive.
- maths-yearly: 1999 INR, ONE_TIME, 48 mocks, inactive.
Seeded bundles stay inactive so the live site does not change until an admin switches model.

3. New function: set_live_pricing_model(p_model text)
- Runs as the caller (SECURITY INVOKER), so the existing admin-only update policy applies.
- Rejects callers who are not ADMIN role in profiles.
- Sets is_active = true for plans of the chosen model and for every plan with price 0,
  and false for all other plans, in one statement.
- EXECUTE is revoked from PUBLIC and anon and granted to authenticated only.

4. Security
- No new tables and no policy changes. Row policies on subscription_plans are unchanged.

5. Notes
- Migration is idempotent: ADD COLUMN IF NOT EXISTS, insert guarded by NOT EXISTS.
- Existing monthly plans (Free, Pro, Elite) are not modified.
*/

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'TIERS'
    CHECK (pricing_model IN ('TIERS', 'BUNDLES'));

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS mock_quota integer
    CHECK (mock_quota IS NULL OR mock_quota >= 0);

INSERT INTO subscription_plans
  (name, slug, description, price_inr, billing_period, features_json, is_active, sort_order, pricing_model, mock_quota)
SELECT v.name, v.slug, v.description, v.price_inr, v.billing_period, v.features::jsonb, false, v.sort_order, 'BUNDLES', v.mock_quota
FROM (VALUES
  ('Full Syllabus', 'full-syllabus', 'Complete JEE PCM syllabus practice with full mock tests.', 499, 'ONE_TIME', '["Full syllabus mock tests","Detailed solutions","Score analysis"]', 10, 10),
  ('Maths Monthly', 'maths-monthly', 'Mathematics mock tests, renewed every month.', 99, 'MONTHLY', '["Mathematics mock tests","Detailed solutions","Score analysis"]', 11, 4),
  ('Maths Yearly', 'maths-yearly', 'Mathematics mock tests for a full year.', 1999, 'ONE_TIME', '["Mathematics mock tests","Detailed solutions","Score analysis"]', 12, 48)
) AS v(name, slug, description, price_inr, billing_period, features, sort_order, mock_quota)
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans p WHERE p.slug = v.slug);

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
      updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_live_pricing_model(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_live_pricing_model(text) TO authenticated;
