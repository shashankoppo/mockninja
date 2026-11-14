/*
# Study plan day completions

1. New Tables
- `study_plan_completions`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, not null, references profiles(id) ON DELETE CASCADE)
  - `week_key` (text, not null) — ISO year-month e.g. "2026-11" identifying the study week bucket
  - `day_name` (text, not null) — the day label the student marked complete (Mon..Sun)
  - `created_at` (timestamptz, default now())
  - UNIQUE(user_id, week_key, day_name) so a day can only be toggled once per week

2. Security
- Enable RLS.
- Grant SELECT, INSERT, DELETE to authenticated (only those verbs: toggle = insert/delete, no update needed).
- Owner-scoped policies: a student can only read/insert/delete their own completions.
- No service_role grant needed (the page reads/writes directly as the signed-in user).

3. Notes
- week_key is computed client-side as the current ISO year-month, matching the previous localStorage key scheme.
- ON DELETE CASCADE on user_id keeps completions in sync with profile deletion.
*/

CREATE TABLE IF NOT EXISTS public.study_plan_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  day_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT study_plan_completions_unique UNIQUE (user_id, week_key, day_name)
);

ALTER TABLE public.study_plan_completions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.study_plan_completions TO authenticated;

DROP POLICY IF EXISTS "select_own_study_plan_completions" ON public.study_plan_completions;
CREATE POLICY "select_own_study_plan_completions"
  ON public.study_plan_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_study_plan_completions" ON public.study_plan_completions;
CREATE POLICY "insert_own_study_plan_completions"
  ON public.study_plan_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_study_plan_completions" ON public.study_plan_completions;
CREATE POLICY "delete_own_study_plan_completions"
  ON public.study_plan_completions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
