/*
# Automated Daily Mock Generation via pg_cron

1. Extension
- Enable `pg_cron` extension (already available on the Supabase project, not yet installed).
- pg_cron runs scheduled SQL jobs inside the database.

2. New Function
- `auto_generate_daily_mocks()` — SECURITY DEFINER, executed by the cron job only.
  - Computes today's date in Asia/Kolkata (IST) to avoid midnight-IST mismatches.
  - Iterates all students who have `email_nudges = true` (opted into daily engagement).
  - For each student, checks if a daily mock already exists for today (idempotent).
  - If none exists, calls `build_daily_target_mock(p_user, p_count, p_hard_ratio, p_for_date)`.
  - Swallows per-student errors so one failure does not stop the batch.
  - Returns a summary of how many mocks were created vs skipped vs failed.

3. Cron Job
- Schedule: `30 0 * * *` (00:30 UTC = 6:00 AM IST) — generates fresh mocks every morning.
- Job name: `daily-mock-generation`.
- Uses `schedule` with `name` parameter for manageability.

4. Security
- `auto_generate_daily_mocks()` is SECURITY DEFINER so it can call `build_daily_target_mock` (also DEFINER, service-role-only).
- REVOKE EXECUTE from PUBLIC, anon, authenticated — only the postgres/cron role should call it.
- No RLS changes needed — no new tables.

5. Important Notes
- The function only generates mocks for students who opted into email nudges. This is the existing proxy for "wants daily engagement."
- If a student already has a daily mock for today (e.g., they generated it manually), it is skipped.
- Per-student failures are logged to raise notice but do not abort the batch.
- The cron job runs in the GMT timezone by default; the 00:30 UTC slot corresponds to 6:00 AM IST.
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create the batch generation function
CREATE OR REPLACE FUNCTION public.auto_generate_daily_mocks()
RETURNS TABLE(created int, skipped int, failed int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_for_date date;
  v_ist_text text;
  v_mock_id uuid;
  v_created int := 0;
  v_skipped int := 0;
  v_failed int := 0;
BEGIN
  -- Compute today's date in Asia/Kolkata
  v_ist_text := (now() AT TIME ZONE 'Asia/Kolkata')::text;
  v_for_date := v_ist_text::date;

  -- Iterate students who opted into daily engagement
  FOR v_student IN
    SELECT id, daily_mock_size
    FROM profiles
    WHERE role = 'STUDENT'
      AND email_nudges = true
  LOOP
    BEGIN
      -- Check if a daily mock already exists for this student today
      PERFORM 1
      FROM user_daily_mocks
      WHERE user_id = v_student.id
        AND for_date = v_for_date;

      IF FOUND THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Generate the daily mock
      v_mock_id := build_daily_target_mock(
        p_user := v_student.id,
        p_count := v_student.daily_mock_size,
        p_hard_ratio := 0.25,
        p_for_date := v_for_date
      );

      v_created := v_created + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'Failed to generate daily mock for student %: %', v_student.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped, v_failed;
END;
$$;

-- Lock down execution — only the postgres/cron role should call this
REVOKE EXECUTE ON FUNCTION public.auto_generate_daily_mocks() FROM PUBLIC, anon, authenticated;

-- Schedule the cron job (00:30 UTC = 6:00 AM IST)
SELECT cron.schedule(
  'daily-mock-generation',
  '30 0 * * *',
  $$SELECT auto_generate_daily_mocks();$$
);
