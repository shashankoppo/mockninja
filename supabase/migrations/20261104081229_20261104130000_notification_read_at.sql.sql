/*
# Add read_at to notification_log for unread tracking

1. Summary
The notification bell badge currently counts all notifications from the last 7 days, not just unread ones. This migration adds a `read_at` column so notifications can be marked as read, and the badge can show only unread count.

2. Changes
- notification_log: new column `read_at timestamptz` (nullable, null = unread).
- Index on (user_id, read_at) for fast unread count queries.

3. Security
- No policy changes. Students already have SELECT on their own notification_log rows. We add UPDATE so students can mark their own notifications as read.

4. Important notes
- Existing rows get read_at = null (unread). The badge will show the total count for existing rows until they are marked read. This is acceptable since the count was already showing before.
*/

ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notification_log_user_read_at
  ON notification_log(user_id, read_at);

DROP POLICY IF EXISTS "student_update_own_notifications" ON notification_log;
CREATE POLICY "student_update_own_notifications" ON notification_log
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
