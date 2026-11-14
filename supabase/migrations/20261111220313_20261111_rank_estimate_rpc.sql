/*
# Rank estimate RPC for paid students

1. New function
- get_rank_estimate(p_attempt_id uuid) returns jsonb.
- Estimates where the caller's graded attempt sits among other students who took the same mock test.
- Returns only aggregate counts and a percentile for the caller. No other student's data is exposed.

2. Rules
- Caller must be signed in and must own the attempt.
- Caller must have an active paid plan (has_active_paid_plan). Otherwise state = 'locked' and no numbers are returned.
- The cohort is each student's best submitted score on the same mock test, in the same timed/untimed group.
- Cohort minimum comes from LEADERBOARD_SETTINGS.min_cohort (default 30). Below it, state = 'insufficient_cohort'.
- Percentile = (students with a lower best score + half of students with the same score) / cohort size, as a percent.

3. Security
- SECURITY DEFINER with a fixed search_path so the cohort can be read without exposing other rows.
- EXECUTE revoked from PUBLIC and anon; granted to authenticated only.

4. Notes
- This is an estimate from Mock Ninja practice tests. It is not an official exam rank and is never presented as one.
- No table or existing policy is changed.
*/

CREATE OR REPLACE FUNCTION public.get_rank_estimate(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mock uuid;
  v_score numeric;
  v_status text;
  v_untimed boolean;
  v_min int := COALESCE((SELECT (value->>'min_cohort')::int FROM public.platform_settings WHERE key = 'LEADERBOARD_SETTINGS'), 30);
  v_n bigint;
  v_below bigint;
  v_equal bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_active_paid_plan(v_uid) THEN
    RETURN jsonb_build_object('state', 'locked');
  END IF;

  SELECT a.mock_test_id, a.score, a.status, a.is_untimed
    INTO v_mock, v_score, v_status, v_untimed
  FROM public.attempts a
  WHERE a.id = p_attempt_id AND a.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'SUBMITTED' OR v_score IS NULL THEN
    RETURN jsonb_build_object('state', 'not_ready');
  END IF;

  WITH best AS (
    SELECT a.user_id, max(a.score) AS s
    FROM public.attempts a
    WHERE a.mock_test_id = v_mock
      AND a.status = 'SUBMITTED'
      AND a.score IS NOT NULL
      AND a.is_untimed = v_untimed
    GROUP BY a.user_id
  )
  SELECT count(*),
         count(*) FILTER (WHERE s < v_score),
         count(*) FILTER (WHERE s = v_score)
    INTO v_n, v_below, v_equal
  FROM best;

  IF v_n < v_min THEN
    RETURN jsonb_build_object('state', 'insufficient_cohort', 'cohort_size', v_n, 'min_cohort', v_min);
  END IF;

  RETURN jsonb_build_object(
    'state', 'ready',
    'score', v_score,
    'cohort_size', v_n,
    'min_cohort', v_min,
    'percentile', round(((v_below + 0.5 * v_equal) / v_n) * 100, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rank_estimate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rank_estimate(uuid) TO authenticated;
