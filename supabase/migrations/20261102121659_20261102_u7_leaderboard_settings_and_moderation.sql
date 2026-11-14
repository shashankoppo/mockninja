/*
# U7 step 5: leaderboard settings, audit log, profile hiding, handle blocklist

## Plain-English summary
Staff can now control how the public leaderboard behaves: whether it is on, the minimum number of opted-in students before it shows anything, the minimum questions per chapter and total before a student is ranked, the list size, and which subjects appear. Every change is recorded in a new audit log. Staff can hide a public profile from the leaderboard, and can keep a list of blocked handles. Students cannot change the hidden flag on their own profile.

## New tables
- audit_log: one row per staff change (actor, action, target, before and after values). Staff can read it. Nobody can write to it directly; only the admin functions below write rows.
- leaderboard_handle_blocklist: lowercase handles that must never appear on the leaderboard. Staff can read it; writes go through admin_set_handle_blocklist.

## Modified tables
- public_profiles: new column hidden_by_admin (boolean, default false). A trigger rejects any change to this column unless the caller is staff, so students cannot unhide themselves.
- platform_settings: new row LEADERBOARD_SETTINGS with defaults (enabled, min_cohort 30, min_questions_per_chapter 8, min_total 50, list_size 50, subjects_shown empty meaning all subjects).

## Functions
- get_leaderboard(p_subject_id, p_limit) replaces the previous three-argument version. The cohort size, per-chapter and total thresholds, list size, subject filter and on/off switch now come from LEADERBOARD_SETTINGS. The caller can no longer pass a cohort size. Hidden and blocklisted profiles are skipped.
- admin_save_leaderboard_settings(jsonb): staff only. Validates values, stores them, writes an audit row. The guardian consent rule is always stored as required and cannot be switched off.
- admin_set_profile_hidden(user, hidden): staff only, audited.
- admin_set_handle_blocklist(handle, blocked): staff only, audited.

## Security
- RLS enabled on both new tables. anon has no privileges on them; authenticated has SELECT only, restricted to staff by policy.
- Every new function revokes EXECUTE from PUBLIC and anon, and grants it to authenticated only. The trigger function is not callable by any client role.
- All functions set a fixed search_path.

## Notes
- The leaderboard will show nothing until at least min_cohort opted-in students exist (default 30). This is a behaviour change from the previous fixed cohort of 1 used by the student page.
- Existing migrations are not edited.
*/

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

DROP POLICY IF EXISTS "staff_read_audit_log" ON public.audit_log;
CREATE POLICY "staff_read_audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.leaderboard_handle_blocklist (
  handle text PRIMARY KEY CHECK (handle = lower(handle) AND char_length(handle) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.leaderboard_handle_blocklist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.leaderboard_handle_blocklist FROM anon, authenticated;
GRANT SELECT ON public.leaderboard_handle_blocklist TO authenticated;

DROP POLICY IF EXISTS "staff_read_handle_blocklist" ON public.leaderboard_handle_blocklist;
CREATE POLICY "staff_read_handle_blocklist" ON public.leaderboard_handle_blocklist
  FOR SELECT TO authenticated USING (public.is_staff());

ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS hidden_by_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_public_profile_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden_by_admin IS DISTINCT FROM OLD.hidden_by_admin AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can change profile visibility' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_public_profile_moderation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_public_profile_moderation ON public.public_profiles;
CREATE TRIGGER guard_public_profile_moderation
  BEFORE UPDATE ON public.public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_public_profile_moderation();

INSERT INTO public.platform_settings (key, value)
VALUES (
  'LEADERBOARD_SETTINGS',
  '{"enabled": true, "min_cohort": 30, "min_questions_per_chapter": 8, "min_total": 50, "list_size": 50, "subjects_shown": []}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_save_leaderboard_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_enabled boolean := (p_settings->>'enabled')::boolean;
  v_min_cohort int := (p_settings->>'min_cohort')::int;
  v_min_per_chapter int := (p_settings->>'min_questions_per_chapter')::int;
  v_min_total int := (p_settings->>'min_total')::int;
  v_list_size int := (p_settings->>'list_size')::int;
  v_subjects jsonb := COALESCE(p_settings->'subjects_shown', '[]'::jsonb);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF v_enabled IS NULL THEN
    RAISE EXCEPTION 'enabled must be true or false';
  END IF;
  IF v_min_cohort IS NULL OR v_min_cohort NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Minimum cohort must be between 1 and 10000';
  END IF;
  IF v_min_per_chapter IS NULL OR v_min_per_chapter NOT BETWEEN 0 AND 1000 THEN
    RAISE EXCEPTION 'Minimum questions per chapter must be between 0 and 1000';
  END IF;
  IF v_min_total IS NULL OR v_min_total NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Minimum total must be between 0 and 100000';
  END IF;
  IF v_list_size IS NULL OR v_list_size NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'List size must be between 1 and 500';
  END IF;
  IF jsonb_typeof(v_subjects) <> 'array'
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_subjects) e WHERE jsonb_typeof(e) <> 'number') THEN
    RAISE EXCEPTION 'subjects_shown must be a list of subject ids';
  END IF;

  SELECT value INTO v_before FROM public.platform_settings WHERE key = 'LEADERBOARD_SETTINGS';

  v_after := jsonb_build_object(
    'enabled', v_enabled,
    'min_cohort', v_min_cohort,
    'min_questions_per_chapter', v_min_per_chapter,
    'min_total', v_min_total,
    'list_size', v_list_size,
    'subjects_shown', v_subjects,
    'guardian_consent_required', true
  );

  INSERT INTO public.platform_settings (key, value)
  VALUES ('LEADERBOARD_SETTINGS', v_after)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (auth.uid(), 'LEADERBOARD_SETTINGS_SAVED', 'LEADERBOARD_SETTINGS', v_before, v_after);

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_profile_hidden(p_user_id uuid, p_hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before boolean;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT hidden_by_admin INTO v_before FROM public.public_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE public.public_profiles SET hidden_by_admin = p_hidden WHERE user_id = p_user_id;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (
    auth.uid(),
    'PROFILE_VISIBILITY_CHANGED',
    p_user_id::text,
    jsonb_build_object('hidden', v_before),
    jsonb_build_object('hidden', p_hidden)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_handle_blocklist(p_handle text, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle text := lower(btrim(p_handle));
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_handle) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Handle must be between 1 and 40 characters';
  END IF;

  IF p_blocked THEN
    INSERT INTO public.leaderboard_handle_blocklist (handle, created_by)
    VALUES (v_handle, auth.uid())
    ON CONFLICT (handle) DO NOTHING;
  ELSE
    DELETE FROM public.leaderboard_handle_blocklist WHERE handle = v_handle;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (
    auth.uid(),
    'HANDLE_BLOCKLIST_CHANGED',
    v_handle,
    jsonb_build_object('blocked', NOT p_blocked),
    jsonb_build_object('blocked', p_blocked)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_leaderboard(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_subject_id integer, p_limit integer DEFAULT 50)
RETURNS TABLE(handle text, user_id uuid, subject_score numeric, question_count bigint, belt text, rank integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb := COALESCE((SELECT value FROM public.platform_settings WHERE key = 'LEADERBOARD_SETTINGS'), '{}'::jsonb);
  v_min_cohort int := COALESCE((v->>'min_cohort')::int, 30);
  v_min_per_chapter int := COALESCE((v->>'min_questions_per_chapter')::int, 8);
  v_min_total bigint := COALESCE((v->>'min_total')::bigint, 50);
  v_list_size int := LEAST(p_limit, COALESCE((v->>'list_size')::int, 50));
  v_subjects jsonb := COALESCE(v->'subjects_shown', '[]'::jsonb);
  v_cohort int;
BEGIN
  IF NOT COALESCE((v->>'enabled')::boolean, false) THEN
    RETURN;
  END IF;
  IF jsonb_array_length(v_subjects) > 0 AND NOT (v_subjects @> to_jsonb(p_subject_id)) THEN
    RETURN;
  END IF;

  SELECT count(*)::int INTO v_cohort
  FROM public.public_profiles pp
  WHERE pp.opt_in_leaderboard = true
    AND pp.hidden_by_admin = false
    AND NOT EXISTS (SELECT 1 FROM public.leaderboard_handle_blocklist hb WHERE hb.handle = lower(pp.handle));

  IF v_cohort < v_min_cohort THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pp.handle,
    ms.user_id,
    COALESCE(sum(ms.score), 0)::numeric,
    COALESCE(sum(ms.evidence_count), 0)::bigint,
    MAX(ms.belt)::text,
    ROW_NUMBER() OVER (ORDER BY sum(ms.score) DESC)::int
  FROM public.public_profiles pp
  JOIN public.mastery_scores ms ON ms.user_id = pp.user_id
  JOIN public.chapters c ON c.id = ms.chapter_id
  WHERE pp.opt_in_leaderboard = true
    AND pp.hidden_by_admin = false
    AND NOT EXISTS (SELECT 1 FROM public.leaderboard_handle_blocklist hb WHERE hb.handle = lower(pp.handle))
    AND c.subject_id = p_subject_id
    AND ms.evidence_count >= v_min_per_chapter
  GROUP BY pp.handle, ms.user_id
  HAVING sum(ms.evidence_count) >= v_min_total
  ORDER BY sum(ms.score) DESC
  LIMIT v_list_size;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_save_leaderboard_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_leaderboard_settings(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_profile_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_hidden(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_handle_blocklist(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_handle_blocklist(text, boolean) TO authenticated;
