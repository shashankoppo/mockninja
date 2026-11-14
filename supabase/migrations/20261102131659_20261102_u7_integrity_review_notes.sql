/*
# U7 step 3: integrity review notes

## Plain-English summary
Staff can add review notes to an exam attempt. Each note has a status (NONE, NOTED or FOLLOW_UP) and a text note. Notes are kept as a history: nothing is edited or deleted, and the latest note sets the status shown. Every note also writes an audit log row. Integrity events are described as events, never as violations or cheating, and nothing in the system applies an automatic penalty.

## 1. New table
- integrity_reviews: id, attempt_id (the attempt reviewed), reviewer_id (staff member), status (NONE, NOTED or FOLLOW_UP), note (text, up to 1000 characters), created_at.

## 2. New function
- admin_add_integrity_review(p_attempt_id, p_status, p_note): staff only. Validates the status and note length, inserts the note and writes an audit_log row INTEGRITY_REVIEW_ADDED.

## 3. Security
- Row level security is enabled. Staff can read notes (is_staff()). No one can update or delete a note, and no direct insert is granted; all writes go through the function.
- authenticated gets SELECT only on the table. The function is granted to authenticated only.
- Students cannot read these notes at all, so they never reach a student through the API.

## 4. Notes
- Retention and purge of integrity events are not part of this migration.
*/

CREATE TABLE IF NOT EXISTS public.integrity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL CHECK (status IN ('NONE', 'NOTED', 'FOLLOW_UP')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrity_reviews_attempt ON public.integrity_reviews (attempt_id, created_at DESC);

ALTER TABLE public.integrity_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.integrity_reviews FROM anon, authenticated;
GRANT SELECT ON public.integrity_reviews TO authenticated;

DROP POLICY IF EXISTS "staff_read_integrity_reviews" ON public.integrity_reviews;
CREATE POLICY "staff_read_integrity_reviews" ON public.integrity_reviews
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.admin_add_integrity_review(p_attempt_id uuid, p_status text, p_note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_note text := COALESCE(btrim(p_note), '');
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('NONE', 'NOTED', 'FOLLOW_UP') THEN
    RAISE EXCEPTION 'Status must be NONE, NOTED or FOLLOW_UP';
  END IF;
  IF char_length(v_note) > 1000 THEN
    RAISE EXCEPTION 'Note must be 1000 characters or fewer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.attempts WHERE id = p_attempt_id) THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  INSERT INTO public.integrity_reviews (attempt_id, reviewer_id, status, note)
  VALUES (p_attempt_id, auth.uid(), p_status, v_note)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target, before_value, after_value)
  VALUES (auth.uid(), 'INTEGRITY_REVIEW_ADDED', p_attempt_id::text, NULL,
          jsonb_build_object('review_id', v_id, 'status', p_status, 'note', v_note));

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_add_integrity_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_integrity_review(uuid, text, text) TO authenticated;
