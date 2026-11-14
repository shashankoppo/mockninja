/*
# Subscription Plans

1. New Tables
- `subscription_plans`: stores the plans admins can create and students can subscribe to.
  - id (uuid PK), name, slug (unique), description, price_inr (integer rupees), billing_period, features_json (array of strings), is_active, sort_order, created_at, updated_at
- `user_subscriptions`: tracks which plan each student is on.
  - id (uuid PK), user_id (FK auth.users, default auth.uid()), plan_id (FK), status, started_at, expires_at, stripe_session_id, created_at

2. Security
- RLS enabled on both.
- subscription_plans: SELECT to anon+authenticated (public pricing), INSERT/UPDATE/DELETE admin-only.
- user_subscriptions: owner-scoped CRUD — student can read/create/update/delete only their own row.

3. Notes
- Stripe integration will be added once the project owner connects their Stripe account.
- Free plan auto-assigned via application logic, not a DB trigger.
*/

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  price_inr integer NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'MONTHLY',
  features_json jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON subscription_plans TO authenticated;

DROP POLICY IF EXISTS "plans_select_public" ON subscription_plans;
CREATE POLICY "plans_select_public" ON subscription_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "plans_insert_admin" ON subscription_plans;
CREATE POLICY "plans_insert_admin" ON subscription_plans FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "plans_update_admin" ON subscription_plans;
CREATE POLICY "plans_update_admin" ON subscription_plans FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "plans_delete_admin" ON subscription_plans;
CREATE POLICY "plans_delete_admin" ON subscription_plans FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO authenticated;

DROP POLICY IF EXISTS "subs_select_own" ON user_subscriptions;
CREATE POLICY "subs_select_own" ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subs_insert_own" ON user_subscriptions;
CREATE POLICY "subs_insert_own" ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subs_update_own" ON user_subscriptions;
CREATE POLICY "subs_update_own" ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subs_delete_own" ON user_subscriptions;
CREATE POLICY "subs_delete_own" ON user_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Seed default plans
INSERT INTO subscription_plans (name, slug, description, price_inr, billing_period, features_json, sort_order)
VALUES
  ('Free', 'free', 'Get started with basic practice', 0, 'MONTHLY', '["Access to free mock tests","Chapter-wise practice","Basic performance tracking"]'::jsonb, 0),
  ('Pro', 'pro', 'Everything you need for serious prep', 499, 'MONTHLY', '["All mock tests included","Full performance analytics","Mastery belt tracking","Daily target mock","Doubt support"]'::jsonb, 1),
  ('Elite', 'elite', 'Maximum prep with everything unlocked', 999, 'MONTHLY', '["Everything in Pro","AI-powered doubt solver","Personalised study plan","Priority support","Early access to new features"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;
