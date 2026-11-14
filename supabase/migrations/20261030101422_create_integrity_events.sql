/*
# Create integrity_events (exam window-switch log)

1. New Tables
- `integrity_events`: one row per recorded exam integrity signal (currently window/tab switches).
  - `id` uuid primary key
  - `attempt_id` uuid, references attempts(id), cascades on delete
  - `user_id` uuid, defaults to auth.uid()
  - `event_type` text, currently only 'WINDOW_SWITCH'
  - `occurred_at` timestamptz, when the browser reported the event
  - `created_at` timestamptz

2. Security
- RLS enabled.
- Students may insert events only for their own attempt while it is IN_PROGRESS.
- Students may read their own events; staff (is_staff()) may read all.
- No update or delete policies: events are append-only.
- Grants: authenticated gets SELECT and INSERT only.
*/

CREATE TABLE IF NOT EXISTS integrity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('WINDOW_SWITCH')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integrity_events_attempt_idx ON integrity_events (attempt_id);

ALTER TABLE integrity_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON integrity_events TO authenticated;

DROP POLICY IF EXISTS "select_own_or_staff_integrity_events" ON integrity_events;
CREATE POLICY "select_own_or_staff_integrity_events" ON integrity_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_staff());

DROP POLICY IF EXISTS "insert_own_in_progress_integrity_events" ON integrity_events;
CREATE POLICY "insert_own_in_progress_integrity_events" ON integrity_events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM attempts a
      WHERE a.id = integrity_events.attempt_id
        AND a.user_id = auth.uid()
        AND a.status = 'IN_PROGRESS'
    )
  );
