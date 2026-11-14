/*
# Add SUPPORT_REPLY to notification_log CHECK constraint

1. Context
   - A trigger on support_inquiry_replies inserts notification_log rows with type 'SUPPORT_REPLY'.
   - The existing CHECK constraint does not include 'SUPPORT_REPLY', so those inserts fail silently.
2. Changes
   - Drop and recreate notification_log_type_check to include 'SUPPORT_REPLY'.
3. Security
   - No new tables, no policy changes. RLS on notification_log is unchanged.
*/

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_type_check;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_type_check
  CHECK (type IN ('INACTIVE_2D','INACTIVE_3D','GUARDIAN_CONSENT','UNSUBSCRIBE','SUPPORT_INQUIRY','SUPPORT_REPLY'));
