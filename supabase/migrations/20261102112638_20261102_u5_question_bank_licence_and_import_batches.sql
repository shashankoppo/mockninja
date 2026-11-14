/*
# U5: Question bank licence, source_reference, import_batches, and indexes

1. New columns on questions
- licence (text, CHECK in OWNED/LICENSED/PUBLIC_DOMAIN/UNKNOWN, default UNKNOWN)
- source_reference (text, nullable — e.g. book title, URL, or licence holder)

2. New table: import_batches
- id (uuid PK)
- created_by (uuid FK profiles, ON DELETE SET NULL)
- file_name (text)
- rows_total (int)
- rows_ok (int)
- rows_failed (int)
- status (text, CHECK in PENDING/COMPLETED/PARTIAL/ROLLED_BACK, default PENDING)
- created_at (timestamptz default now())

3. Indexes on questions
- chapter_id (for filtering by chapter)
- review_status (for filtering by status)
- type (for filtering by type)
- difficulty (for filtering by difficulty)
- source (for filtering by source)
- created_at (for sorting by date)

4. Rule: UNKNOWN licence cannot be PUBLISHED
- A trigger prevents UPDATE of review_status to PUBLISHED when licence = 'UNKNOWN'

5. Security
- import_batches: staff SELECT all, service_role INSERT/UPDATE
- Existing questions policies unchanged (staff full CRUD)
*/

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS licence text DEFAULT 'UNKNOWN'
    CHECK (licence IN ('OWNED', 'LICENSED', 'PUBLIC_DOMAIN', 'UNKNOWN'));

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source_reference text;

CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  rows_total int NOT NULL DEFAULT 0,
  rows_ok int NOT NULL DEFAULT 0,
  rows_failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COMPLETED', 'PARTIAL', 'ROLLED_BACK')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.import_batches TO authenticated;
GRANT INSERT, UPDATE ON public.import_batches TO service_role;

DROP POLICY IF EXISTS "staff_read_import_batches" ON public.import_batches;
CREATE POLICY "staff_read_import_batches"
  ON public.import_batches FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON public.questions(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_source ON public.questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_licence ON public.questions(licence);

-- Trigger: prevent publishing questions with UNKNOWN licence
CREATE OR REPLACE FUNCTION public.prevent_publish_unknown_licence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.review_status = 'PUBLISHED' AND NEW.licence = 'UNKNOWN' THEN
    RAISE EXCEPTION 'A question with licence UNKNOWN cannot be published. Set a licence first.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_publish_unknown_licence ON public.questions;
CREATE TRIGGER trg_prevent_publish_unknown_licence
  BEFORE UPDATE OF review_status ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_publish_unknown_licence();

REVOKE EXECUTE ON FUNCTION public.prevent_publish_unknown_licence() FROM PUBLIC, anon;
