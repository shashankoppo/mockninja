/*
# Post-test feedback and ratings

1. New table: test_feedback
- `id` identifies one feedback response.
- `user_id` is filled from the signed-in session and owns the response.
- `attempt_id` links feedback to a submitted exam attempt.
- `mock_test_id` links the response to the test for staff reporting.
- `rating` is a required 1-to-5 experience rating.
- `review` is an optional short review.
- `feedback` is an optional general comment.
- `created_at` and `updated_at` record the response timestamps.

2. Security
- Row-level security is enabled.
- Students can read, create, update, and delete only their own feedback.
- Staff can read feedback for review and reporting.
- Ownership is derived from auth.uid() and cannot be forged through the normal insert path.

3. Integrity
- A student can submit at most one response for each attempt.
- Feedback must refer to the same student who owns the attempt.
- Feedback is intended for completed attempts only; the insert policy checks SUBMITTED status.

4. Important notes
- The migration is idempotent.
- No exam timing, grading, or response data is changed.
*/

CREATE TABLE IF NOT EXISTS public.test_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text CHECK (review IS NULL OR char_length(trim(review)) BETWEEN 2 AND 500),
  feedback text CHECK (feedback IS NULL OR char_length(trim(feedback)) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attempt_id)
);

CREATE INDEX IF NOT EXISTS test_feedback_mock_test_idx
  ON public.test_feedback (mock_test_id, created_at DESC);

ALTER TABLE public.test_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_feedback TO authenticated;

DROP POLICY IF EXISTS "feedback_select_own_or_staff" ON public.test_feedback;
CREATE POLICY "feedback_select_own_or_staff" ON public.test_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_staff());

DROP POLICY IF EXISTS "feedback_insert_own_submitted" ON public.test_feedback;
CREATE POLICY "feedback_insert_own_submitted" ON public.test_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.attempts a
      WHERE a.id = attempt_id
        AND a.user_id = auth.uid()
        AND a.mock_test_id = mock_test_id
        AND a.status = 'SUBMITTED'
    )
  );

DROP POLICY IF EXISTS "feedback_update_own" ON public.test_feedback;
CREATE POLICY "feedback_update_own" ON public.test_feedback
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_delete_own" ON public.test_feedback;
CREATE POLICY "feedback_delete_own" ON public.test_feedback
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_staff_update" ON public.test_feedback;
CREATE POLICY "feedback_staff_update" ON public.test_feedback
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE OR REPLACE FUNCTION public.touch_test_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS test_feedback_touch_updated_at ON public.test_feedback;
CREATE TRIGGER test_feedback_touch_updated_at
  BEFORE UPDATE ON public.test_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_test_feedback();

REVOKE EXECUTE ON FUNCTION public.touch_test_feedback() FROM PUBLIC, anon, authenticated;
