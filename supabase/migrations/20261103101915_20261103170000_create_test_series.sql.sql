/*
# Create test_series table

1. Purpose
   - Groups published mock tests into named "test series" (e.g. "JEE Main 2026 Full Syllabus Series") so students can browse curated series and attempt each mock in order.
2. New Tables
   - `test_series`: id, title, description, category, status, sort_order, created_at, updated_at
   - `test_series_mocks`: join table linking series to mock_tests with position
3. Security
   - RLS enabled on both tables.
   - test_series: anon + authenticated SELECT on PUBLISHED series; admin writes via service role.
   - test_series_mocks: anon + authenticated SELECT; admin writes via service role.
   - No client write grants on either table (only service role writes).
4. Notes
   - Mock tests themselves remain in mock_tests with existing policies.
   - A series is "PUBLISHED" to be visible; drafts are admin-only.
*/

CREATE TABLE IF NOT EXISTS public.test_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'full syllabus',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_series_status ON public.test_series(status);
CREATE INDEX IF NOT EXISTS idx_test_series_sort ON public.test_series(sort_order);

CREATE TABLE IF NOT EXISTS public.test_series_mocks (
  test_series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (test_series_id, mock_test_id)
);

CREATE INDEX IF NOT EXISTS idx_tsm_series ON public.test_series_mocks(test_series_id);
CREATE INDEX IF NOT EXISTS idx_tsm_mock ON public.test_series_mocks(mock_test_id);

ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_series_mocks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.test_series TO anon, authenticated;
GRANT SELECT ON public.test_series_mocks TO anon, authenticated;

DROP POLICY IF EXISTS "select_published_test_series" ON public.test_series;
CREATE POLICY "select_published_test_series"
  ON public.test_series FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED' OR public.is_staff());

DROP POLICY IF EXISTS "select_test_series_mocks" ON public.test_series_mocks;
CREATE POLICY "select_test_series_mocks"
  ON public.test_series_mocks FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT ALL ON public.test_series TO service_role;
GRANT ALL ON public.test_series_mocks TO service_role;
