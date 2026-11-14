/*
# U7 step 4: site-wide watermark policy with per-attempt snapshot

## Plain-English summary
Adds one platform-wide watermark policy that staff can change at /admin/settings/watermark. Each exam attempt copies the policy when it starts, so changes made during a running exam have no effect on it. Every policy change is written to the audit log.

## 1. Changes
- platform_settings: new row WATERMARK_POLICY with defaults (enabled true, content SHORT_ID, opacity 0.06, layout TILED, scope EXAM_ONLY).
- attempts: new nullable column watermark_snapshot (jsonb). Filled by the exam start action; left null for attempts created before this migration.
- New function admin_save_watermark_policy(jsonb): staff only. Validates each field, stores the policy, writes an audit_log row.

## 2. Security
- Function is SECURITY DEFINER with a fixed search path; EXECUTE revoked from PUBLIC and anon, granted to authenticated. The function itself checks is_staff().
- No new table, no change to attempt RLS.

## 3. Notes
- Opacity is limited to 0.03 to 0.10 per the upgrade pack.
- Content is either the student's handle or a short form of the attempt id. Email and real name are never used.
- Snapshot column is written only by the exam start action (service role).
*/

ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS watermark_snapshot jsonb;

INSERT INTO public.platform_settings (key, value)
VALUES ('WATERMARK_POLICY', jsonb_build_object(
  'enabled', true,
  'content', 'SHORT_ID',
  'opacity', 0.06,
  'layout', 'TILED',
  'scope', 'EXAM_ONLY'
))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_save_watermark_policy(p_policy jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_enabled boolean := (p_policy->>'enabled')::boolean;
  v_opacity numeric := (p_policy->>'opacity')::numeric;
  v_content text := p_policy->>'content';
  v_layout text := p_policy->>'layout';
  v_scope text := p_policy->>'scope';
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF v_enabled IS NULL THEN
    RAISE EXCEPTION 'enabled must be true or false';
  END IF;
  IF v_opacity IS NULL OR v_opacity NOT BETWEEN 0.03 AND 0.10 THEN
    RAISE EXCEPTION 'Opacity must be between 3 and 10 percent';
  END IF;
  IF v_content NOT IN ('HANDLE', 'SHORT_ID') THEN
    RAISE EXCEPTION 'Content must be HANDLE or SHORT_ID';
  END IF;
  IF v_layout NOT IN ('SINGLE', 'TILED') THEN
    RAISE EXCEPTION 'Layout must be SINGLE or TILED';
  END IF;
  IF v_scope NOT IN ('EXAM_ONLY', 'ALL_MODES') THEN
    RAISE EXCEPTION 'Scope must be EXAM_ONLY or ALL_MODES';
  END IF;

  SELECT value INTO v_before FROM public.platform_settings WHERE key = 'WATERMARK_POLICY';

  v_after := jsonb_build_object(
    'enabled', v_enabled,
    'content', v_content,
    'opacity', v_opacity,
    'layout', v_layout,
    'scope', v_scope
  );

  INSERT INTO public.platform_settings (key, value)
  VALUES ('WATERMARK_POLICY', v_after)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (auth.uid(), 'WATERMARK_POLICY_SAVED', 'WATERMARK_POLICY', v_before, v_after);

  RETURN v_after;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_watermark_policy(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_watermark_policy(jsonb) TO authenticated;
