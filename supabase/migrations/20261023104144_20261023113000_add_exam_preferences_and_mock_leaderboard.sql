/*
# Add exam timer preferences and national mock leaderboard

1. Student timer preferences
- Add `profiles.exam_timer_mode` to choose STANDARD, CUSTOM, or UNTIMED exam behavior.
- Add `profiles.exam_timer_minutes` for a bounded custom duration.

2. Attempt snapshots
- Add `attempts.duration_min` so each attempt keeps the duration selected at start time.
- Add `attempts.is_untimed` so an active attempt is not changed by later profile edits.

3. National mock leaderboard
- Add `get_mock_leaderboard(uuid, int)` as an authenticated, security-definer function.
- It ranks submitted attempts from students who opted into the public leaderboard.
- It returns handles, scores, ranks, percentiles, and cohort size without exposing email addresses.

4. Security
- Existing authenticated profile ownership policies continue to protect student settings.
- Only authenticated users can execute the leaderboard function.
- The leaderboard only includes opted-in public profiles and published mock tests.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_timer_mode text NOT NULL DEFAULT 'STANDARD'
    CHECK (exam_timer_mode IN ('STANDARD', 'CUSTOM', 'UNTIMED'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_timer_minutes integer
    CHECK (exam_timer_minutes IS NULL OR exam_timer_minutes BETWEEN 1 AND 600);

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS duration_min integer
    CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 600);

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS is_untimed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_mock_leaderboard(
  p_mock_test_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  handle text,
  user_id uuid,
  score numeric,
  total_marks integer,
  percentage numeric,
  percentile numeric,
  rank bigint,
  cohort_size bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT
      pp.handle,
      a.user_id,
      MAX(a.score)::numeric AS score,
      mt.total_marks::integer AS total_marks
    FROM public.attempts a
    JOIN public.public_profiles pp ON pp.user_id = a.user_id
    JOIN public.mock_tests mt ON mt.id = a.mock_test_id
    WHERE a.mock_test_id = p_mock_test_id
      AND a.status = 'SUBMITTED'
      AND pp.opt_in_leaderboard = true
      AND mt.status = 'PUBLISHED'
    GROUP BY pp.handle, a.user_id, mt.total_marks
  ),
  ranked AS (
    SELECT
      eligible.*,
      RANK() OVER (ORDER BY eligible.score DESC) AS rank,
      COUNT(*) OVER () AS cohort_size
    FROM eligible
  )
  SELECT
    ranked.handle,
    ranked.user_id,
    ranked.score,
    ranked.total_marks,
    CASE WHEN ranked.total_marks > 0 THEN ROUND((ranked.score / ranked.total_marks) * 100, 2) ELSE 0 END AS percentage,
    CASE
      WHEN ranked.cohort_size <= 1 THEN 100::numeric
      ELSE ROUND(((ranked.cohort_size - ranked.rank)::numeric / (ranked.cohort_size - 1)) * 100, 2)
    END AS percentile,
    ranked.rank,
    ranked.cohort_size
  FROM ranked
  ORDER BY ranked.score DESC, ranked.handle ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

REVOKE EXECUTE ON FUNCTION public.get_mock_leaderboard(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mock_leaderboard(uuid, integer) TO authenticated;
