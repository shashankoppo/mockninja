/*
# Support inquiry notification type

1. Purpose
- The support-notify edge function inserts a row into notification_log with type 'SUPPORT_INQUIRY' when a new contact-form submission arrives.
- The existing CHECK constraint on notification_log.type needs to include this new value.

2. Changes
- Drop and recreate the CHECK constraint on notification_log.type to include 'SUPPORT_INQUIRY'.
- No new tables, no RLS changes.

3. Security
- notification_log is only written by the service role (edge functions); no policy changes needed.
*/

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_type_check;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_type_check
  CHECK (type IN ('INACTIVE_2D','INACTIVE_3D','GUARDIAN_CONSENT','UNSUBSCRIBE','SUPPORT_INQUIRY'));
