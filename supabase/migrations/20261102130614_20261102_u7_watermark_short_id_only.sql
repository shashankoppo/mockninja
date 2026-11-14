/*
# U7 step 4 follow-up: watermark content is a short candidate ID only

## Plain-English summary
The watermark can only show a short candidate ID. The handle option is removed because students have no public handle to show, and names and emails must never appear on the watermark.

## Changes
- admin_save_watermark_policy now accepts content = SHORT_ID only. Its other rules (opacity 3 to 10 percent, SINGLE or TILED layout, EXAM_ONLY or ALL_MODES scope, staff only, audit row) are unchanged.
- Existing WATERMARK_POLICY rows that already say SHORT_ID are unaffected.

## Security
- Function signature, grants and staff check are unchanged.
*/

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
  IF v_content IS DISTINCT FROM 'SHORT_ID' THEN
    RAISE EXCEPTION 'Content must be SHORT_ID';
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
