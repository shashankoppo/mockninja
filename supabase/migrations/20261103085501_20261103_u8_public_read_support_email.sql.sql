/*
# Let public pages read the support email setting

1. Changes
- Replace the public read policy on platform_settings so it also allows the support_email key.

2. Why
- Terms, support and billing pages show the support address to logged-out visitors. The policy stays an explicit allowlist of keys.

3. Security
- Only the one non-sensitive key is added. Admin read and write policies are unchanged.
*/

DROP POLICY IF EXISTS public_read_site_flags ON platform_settings;

CREATE POLICY public_read_site_flags ON platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY['maintenance_mode'::text, 'announcement_bar'::text, 'support_email'::text]));
