/*
# U6: Site settings — contact desks, social links, global settings

Uses the existing platform_settings table (key-value JSONB) to store:
- SITE_GLOBAL: site name, tagline, support email, default language, SEO title/description, share image,
  maintenance banner, legal entity name, copyright line, grievance officer details
- CONTACT_DESKS: array of {label, type, email, phone, whatsapp, hours, address, response_time}
- SOCIAL_LINKS: array of {platform, url}

A get_public_settings() function returns only the published values (no admin-only fields).
*/

CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(
    (
      SELECT value
      FROM platform_settings
      WHERE key = 'SITE_GLOBAL_PUBLISHED'
    ),
    '{}'::jsonb
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO authenticated, anon;
