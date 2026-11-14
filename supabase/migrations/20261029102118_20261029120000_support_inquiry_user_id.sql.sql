/*
# Add user_id to support_inquiries for student ticket tracking

1. Modified Tables
- `support_inquiries`: adds nullable `user_id` column (uuid FK → auth.users ON DELETE SET NULL).
  When a signed-in student submits a support inquiry, their user_id is stored so they can
  track their own tickets. Anonymous (logged-out) submissions keep user_id NULL.

2. Security
- New RLS policy: authenticated users can SELECT their own support_inquiries (user_id = auth.uid()).
- Existing policies (anon insert, staff read/update) remain unchanged.
- Grant SELECT on support_inquiries TO authenticated (column-scoped: id, subject, status, message, created_at, updated_at, resolved_at).

3. Important Notes
- The ContactPage form will set user_id when the student is signed in.
- Students see only tickets they submitted while logged in.
- Staff still have full access via is_staff() policies from migration 019.
*/

ALTER TABLE public.support_inquiries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT SELECT (id, subject, status, message, created_at, updated_at, resolved_at, user_id)
  ON public.support_inquiries TO authenticated;

DROP POLICY IF EXISTS "select_own_support_inquiries" ON public.support_inquiries;
CREATE POLICY "select_own_support_inquiries"
  ON public.support_inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
