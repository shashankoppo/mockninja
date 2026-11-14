/*
# Notify students when staff reply to support tickets

1. Modified Tables
- `support_inquiries`: existing `public_reply` and `replied_at` values now trigger a student notification.
- `notification_log`: receives `SUPPORT_REPLY` rows for the inquiry owner.

2. Security
- The trigger function is SECURITY DEFINER with a fixed search_path so students cannot forge notifications.
- The function runs only when a non-empty public reply changes and the inquiry has a user_id.
- It does not copy staff-only internal notes into the notification.

3. Important Notes
- The browser client reads the resulting notification through the existing owner-scoped notification policy.
- This is idempotent for unchanged replies and does not create notifications for anonymous inquiries.
*/

CREATE OR REPLACE FUNCTION public.log_support_reply_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL
    AND NEW.public_reply IS NOT NULL
    AND char_length(trim(NEW.public_reply)) > 0
    AND (OLD.public_reply IS DISTINCT FROM NEW.public_reply)
  THEN
    INSERT INTO public.notification_log (user_id, type, sent_at)
    VALUES (NEW.user_id, 'SUPPORT_REPLY', now());
    NEW.replied_at = COALESCE(NEW.replied_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_inquiry_reply_notification ON public.support_inquiries;
CREATE TRIGGER support_inquiry_reply_notification
  BEFORE UPDATE OF public_reply ON public.support_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.log_support_reply_notification();

REVOKE EXECUTE ON FUNCTION public.log_support_reply_notification() FROM PUBLIC, anon, authenticated;
