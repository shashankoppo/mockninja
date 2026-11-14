/*
# Harden awarded marks storage

1. Purpose
- Make `responses.awarded_marks` a reliable numeric result for every submitted question.
- Preserve `NULL` in `responses.is_correct` for unattempted questions while storing zero marks for them.

2. Modified table
- `responses.awarded_marks`
- Existing null values are normalized to `0`.
- A default of `0` is added for future response rows.
- The column is made NOT NULL so every saved response has an explicit mark value.

3. Security
- No new table or policy is created.
- Existing response access rules remain unchanged.
- The exam Edge Function remains the only server-side writer of grading fields.

4. Important notes
- Positive values represent marks for correct answers.
- Negative values represent penalties for wrong answers.
- Zero represents an unattempted question or a marking scheme that awards no marks.
*/

UPDATE public.responses
SET awarded_marks = 0
WHERE awarded_marks IS NULL;

ALTER TABLE public.responses
  ALTER COLUMN awarded_marks SET DEFAULT 0,
  ALTER COLUMN awarded_marks SET NOT NULL;
