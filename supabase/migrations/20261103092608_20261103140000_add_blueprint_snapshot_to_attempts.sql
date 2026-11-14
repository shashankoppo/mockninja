/*
# Add blueprint_snapshot to attempts (exam blueprint versioning)

## Purpose
Freezes the marking scheme and total marks at the moment a student starts an exam.
This prevents a mid-exam rule change (e.g. admin editing the mock test's marking scheme)
from altering the grading of a running or already-completed attempt.

## Changes
1. Adds `blueprint_snapshot` (jsonb, nullable) to the `attempts` table.
   - Stored at exam start time by the exam edge function.
   - Contains: { marking_scheme, total_marks }
   - Read at grading time; if present, the snapshot's values are used instead of the live mock_tests values.
   - Existing attempts (pre-migration) have NULL and will fall back to the live mock_tests values — no behavior change for past attempts.

## Security
- No new RLS policies needed — the column is on an existing RLS-protected table.
- The column is only written by the service-role client (exam edge function), never by the frontend.
- Students can read their own attempt row (existing SELECT policy), which now includes this column.
*/

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS blueprint_snapshot jsonb;
