/*
# Browser push subscriptions and support replies

1. New Tables
- `push_subscriptions`: stores one browser's Web Push subscription for its signed-in owner.
- `id` (uuid), `user_id` (uuid owner), `endpoint` (unique browser endpoint), `p256dh` and `auth` (subscription keys), `created_at`, `last_seen_at`.

2. Modified Tables
- `support_inquiries`: adds nullable `public_reply` and `replied_at`. Staff can write a response that the ticket owner can read.
- `notification_log`: expands the allowed notification types to include `DAILY_PRACTICE` and `SUPPORT_REPLY`.

3. Security
- Row-level security is enabled on `push_subscriptions`.
- Authenticated users may only insert, read, update, or delete their own browser subscription rows.
- Browser subscription ownership defaults to `auth.uid()` and cannot be reassigned through the client.
- Students may read `public_reply` and `replied_at` only for their own support inquiries. Existing staff policies remain in place.
- No anonymous access is granted to browser subscriptions or support replies.

4. Important Notes
- The browser permission flow remains opt-in and only runs after the student clicks Enable browser notifications.
- This migration does not expose private staff notes.
*/

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (char_length(endpoint) BETWEEN 20 AND 2000),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 10 AND 500),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 10 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "select_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "select_own_push_subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "insert_own_push_subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "update_own_push_subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "delete_own_push_subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.support_inquiries
  ADD COLUMN IF NOT EXISTS public_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

GRANT SELECT (id, subject, status, message, created_at, updated_at, resolved_at, user_id, public_reply, replied_at)
  ON public.support_inquiries TO authenticated;
GRANT UPDATE (public_reply, replied_at) ON public.support_inquiries TO authenticated;

DROP POLICY IF EXISTS "select_own_support_inquiries" ON public.support_inquiries;
CREATE POLICY "select_own_support_inquiries" ON public.support_inquiries FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_staff());

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_type_check;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_type_check
  CHECK (type IN ('INACTIVE_2D','INACTIVE_3D','GUARDIAN_CONSENT','UNSUBSCRIBE','SUPPORT_INQUIRY','DAILY_PRACTICE','SUPPORT_REPLY'));
