/*
# Support inquiries and safe admin profile editing

1. New Tables
- `support_inquiries` stores contact-form submissions so staff can review and update them.
- `id` is a generated identifier.
- `name`, `email`, `subject`, and `message` contain the visitor's submitted details.
- `status` tracks OPEN, IN_PROGRESS, or RESOLVED.
- `internal_notes` stores staff-only review notes.
- `handled_by`, `created_at`, `updated_at`, and `resolved_at` support ownership and audit-friendly timestamps.

2. Security
- Row-level security is enabled on `support_inquiries`.
- Anonymous and signed-in visitors may insert only the four public contact fields.
- Only staff may read, update, or delete inquiry rows; deletion is intentionally not granted to preserve support history.
- Staff policies use `is_staff()` and never trust a client-supplied staff identity.
- Grants are limited to the verbs and columns required by the public form and staff dashboard.

3. Modified Tables
- No existing table is changed.

4. Important Notes
- Pricing continues to use the existing staff-managed `homepage_content` row with section key `pricing`.
- Admin personal details continue to use the existing `profiles.full_name` and `profiles.avatar_url` fields.
*/

CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(trim(email)) BETWEEN 3 AND 320),
  subject text NOT NULL DEFAULT 'General support' CHECK (char_length(trim(subject)) BETWEEN 2 AND 160),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  internal_notes text,
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_inquiries_status_created_idx
  ON public.support_inquiries (status, created_at DESC);

ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;

GRANT INSERT (name, email, subject, message) ON public.support_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE (status, internal_notes, handled_by, resolved_at, updated_at) ON public.support_inquiries TO authenticated;

DROP POLICY IF EXISTS "public_insert_support_inquiries" ON public.support_inquiries;
CREATE POLICY "public_insert_support_inquiries"
  ON public.support_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'OPEN' AND handled_by IS NULL AND resolved_at IS NULL);

DROP POLICY IF EXISTS "staff_select_support_inquiries" ON public.support_inquiries;
CREATE POLICY "staff_select_support_inquiries"
  ON public.support_inquiries FOR SELECT
  TO authenticated
  USING (is_staff());

DROP POLICY IF EXISTS "staff_update_support_inquiries" ON public.support_inquiries;
CREATE POLICY "staff_update_support_inquiries"
  ON public.support_inquiries FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff() AND status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED'));

CREATE OR REPLACE FUNCTION public.touch_support_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'RESOLVED' AND OLD.status <> 'RESOLVED' THEN
    NEW.resolved_at = COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status <> 'RESOLVED' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_inquiries_touch_updated_at ON public.support_inquiries;
CREATE TRIGGER support_inquiries_touch_updated_at
  BEFORE UPDATE ON public.support_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_inquiry();

REVOKE EXECUTE ON FUNCTION public.touch_support_inquiry() FROM PUBLIC, anon, authenticated;
