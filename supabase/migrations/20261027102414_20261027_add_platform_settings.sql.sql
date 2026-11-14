/*
# Add platform_settings table

1. New Tables
- `platform_settings`
  - `key` (text, primary key) — setting key, e.g. 'feature_mock_tests'
  - `value` (jsonb, default '{}'::jsonb) — flexible value store
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, nullable, references profiles)
2. Security
- Enable RLS on platform_settings.
- Only ADMIN role can SELECT, INSERT, UPDATE (via auth.uid() role check on profiles).
- Grant to authenticated for SELECT only (admin-only writes).
3. Notes
- Single-row-per-key design for flexible boolean/string/json settings.
- Seed default rows for known feature toggles.
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON platform_settings TO authenticated;

DROP POLICY IF EXISTS "admin_read_platform_settings" ON platform_settings;
CREATE POLICY "admin_read_platform_settings"
ON platform_settings FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "admin_write_platform_settings" ON platform_settings;
CREATE POLICY "admin_write_platform_settings"
ON platform_settings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "admin_update_platform_settings" ON platform_settings;
CREATE POLICY "admin_update_platform_settings"
ON platform_settings FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

INSERT INTO platform_settings (key, value) VALUES
  ('feature_mock_tests', '{"enabled": true}'::jsonb),
  ('feature_daily_practice', '{"enabled": true}'::jsonb),
  ('feature_mistake_notebook', '{"enabled": true}'::jsonb),
  ('feature_leaderboard', '{"enabled": true}'::jsonb),
  ('feature_ai_studio', '{"enabled": false}'::jsonb),
  ('feature_bookmarks', '{"enabled": true}'::jsonb),
  ('feature_study_plan', '{"enabled": true}'::jsonb),
  ('platform_name', '{"value": "NTA Rankers"}'::jsonb),
  ('support_email', '{"value": "support@mockninja.com"}'::jsonb),
  ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;