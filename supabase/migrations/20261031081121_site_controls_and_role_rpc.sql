/*
# Site controls (maintenance, announcement bar), homepage ads, and role changes

1. Platform settings
- Anonymous and signed-in visitors can read only the `maintenance_mode` and `announcement_bar` rows, so the app can gate itself.
- Adds an `announcement_bar` row (disabled by default).

2. Homepage advertisements
- Adds an `advertisements` section to `homepage_content` (visible by default, no items). Existing staff policies manage it; public reads already go through `public_homepage_content()`.

3. Role changes
- New `admin_set_user_role(uuid, text)` function. Only ADMIN users can call it, and it accepts only STUDENT or ADMIN. The previous direct update of the role column was rejected by column privileges and failed silently.

Security
- Platform settings: new SELECT policy limited to the two public keys.
- Function is SECURITY DEFINER with search_path fixed, EXECUTE revoked from PUBLIC and anon, granted to authenticated.

Notes
- Existing EDITOR accounts are not changed by this migration.
*/

GRANT SELECT ON platform_settings TO anon;

DROP POLICY IF EXISTS "public_read_site_flags" ON platform_settings;
CREATE POLICY "public_read_site_flags" ON platform_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('maintenance_mode', 'announcement_bar'));

INSERT INTO platform_settings (key, value)
VALUES ('announcement_bar', '{"enabled": false, "text": "", "link_label": "", "link_url": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO homepage_content (section_key, content_json)
VALUES ('advertisements', '{"enabled": true, "items": []}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  IF p_role NOT IN ('STUDENT', 'ADMIN') THEN
    RAISE EXCEPTION 'Unsupported role: %', p_role;
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;
