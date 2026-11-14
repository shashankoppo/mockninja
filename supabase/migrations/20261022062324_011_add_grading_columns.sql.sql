/*
# Add grading columns to responses

1. Purpose
- Add is_correct (boolean) and awarded_marks (numeric) columns to responses table.
- These are set ONLY by the server grading function during submit — never by the client.

2. Changes
- responses.is_correct (boolean, nullable) — whether the student's answer was correct
- responses.awarded_marks (numeric, nullable) — marks awarded (positive for correct, negative for wrong, 0 for unattempted)

3. Security
- No RLS changes. responses has no INSERT/UPDATE/DELETE policies for students.
- All writes go through the exam Edge Function using the service role key.
- Students can only SELECT their own responses (existing policy).
*/

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS is_correct boolean,
  ADD COLUMN IF NOT EXISTS awarded_marks numeric;
