-- Allow anonymous (logged-out) visitors to read published public mock tests
-- and their questions, so the home page "Popular Mock Tests" and
-- "Free on Mock Ninja" sections render for everyone.

-- mock_tests: anon can read PUBLISHED + PUBLIC tests
DROP POLICY IF EXISTS "select_published_mocks_anon" ON public.mock_tests;
CREATE POLICY "select_published_mocks_anon" ON public.mock_tests
  FOR SELECT TO anon
  USING (status = 'PUBLISHED' AND visibility = 'PUBLIC');

-- mock_test_questions: anon can read questions whose parent mock is published + public
DROP POLICY IF EXISTS "select_mtq_anon" ON public.mock_test_questions;
CREATE POLICY "select_mtq_anon" ON public.mock_test_questions
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.mock_tests
    WHERE mock_tests.id = mock_test_questions.mock_test_id
      AND mock_tests.status = 'PUBLISHED'
      AND mock_tests.visibility = 'PUBLIC'
  ));
