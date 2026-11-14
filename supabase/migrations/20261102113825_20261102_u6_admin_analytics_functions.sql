/*
# U6: Admin analytics aggregate functions

All functions are SECURITY DEFINER, callable by authenticated (admin check inside).
They return aggregate data only — no personal data.
*/

CREATE OR REPLACE FUNCTION public.admin_signups_per_day(p_days int DEFAULT 30)
RETURNS TABLE(date text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  p_days := LEAST(GREATEST(p_days, 1), 365);

  RETURN QUERY
  SELECT
    to_char(d::date, 'YYYY-MM-DD') AS date,
    COALESCE(c.cnt, 0) AS count
  FROM generate_series(current_date - (p_days - 1), current_date, '1 day') d
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM profiles
    WHERE created_at::date = d::date
  ) c ON true
  ORDER BY d;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_active_students_per_day(p_days int DEFAULT 30)
RETURNS TABLE(date text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  p_days := LEAST(GREATEST(p_days, 1), 365);

  RETURN QUERY
  SELECT
    to_char(d::date, 'YYYY-MM-DD') AS date,
    COALESCE(c.cnt, 0) AS count
  FROM generate_series(current_date - (p_days - 1), current_date, '1 day') d
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT a.user_id) AS cnt
    FROM attempts a
    WHERE a.started_at::date = d::date
  ) c ON true
  ORDER BY d;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_attempts_per_day(p_days int DEFAULT 30)
RETURNS TABLE(date text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  p_days := LEAST(GREATEST(p_days, 1), 365);

  RETURN QUERY
  SELECT
    to_char(d::date, 'YYYY-MM-DD') AS date,
    COALESCE(c.cnt, 0) AS count
  FROM generate_series(current_date - (p_days - 1), current_date, '1 day') d
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM attempts a
    WHERE a.status = 'SUBMITTED' AND a.submitted_at::date = d::date
  ) c ON true
  ORDER BY d;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_avg_score_by_type(p_days int DEFAULT 30)
RETURNS TABLE(category text, avg_pct numeric, attempt_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  p_days := LEAST(GREATEST(p_days, 1), 365);

  RETURN QUERY
  SELECT
    COALESCE(m.category, 'Unknown') AS category,
    CASE WHEN m.total_marks > 0
      THEN round(avg((a.score * 100.0) / m.total_marks), 1)
      ELSE 0
    END AS avg_pct,
    count(*) AS attempt_count
  FROM attempts a
  JOIN mock_tests m ON m.id = a.mock_test_id
  WHERE a.status = 'SUBMITTED'
    AND a.submitted_at >= now() - (p_days || ' days')::interval
  GROUP BY m.category
  ORDER BY avg_pct DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_completion_rate(p_days int DEFAULT 30)
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  p_days := LEAST(GREATEST(p_days, 1), 365);

  RETURN QUERY
  SELECT a.status, count(*) AS count
  FROM attempts a
  WHERE a.started_at >= now() - (p_days || ' days')::interval
  GROUP BY a.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_question_coverage()
RETURNS TABLE(subject text, difficulty text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    s.name AS subject,
    q.difficulty,
    count(*) AS count
  FROM questions q
  JOIN chapters c ON c.id = q.chapter_id
  JOIN subjects s ON s.id = c.subject_id
  WHERE q.review_status = 'PUBLISHED'
  GROUP BY s.name, q.difficulty
  ORDER BY s.name, q.difficulty;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_open_vs_resolved_reports()
RETURNS TABLE(report_status text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT qr.status AS report_status, count(*) AS count
  FROM question_reports qr
  GROUP BY qr.status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_signups_per_day(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_active_students_per_day(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_attempts_per_day(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_avg_score_by_type(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_completion_rate(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_question_coverage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_open_vs_resolved_reports() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_signups_per_day(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_students_per_day(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_attempts_per_day(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_avg_score_by_type(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_completion_rate(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_question_coverage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_open_vs_resolved_reports() TO authenticated;
