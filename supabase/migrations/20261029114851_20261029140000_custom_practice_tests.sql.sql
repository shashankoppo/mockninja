/*
# Custom practice tests (student-built DPP sets)

1. New Tables
- `custom_practice_sets`: one row per practice test a student builds.
  - `id` (uuid, primary key)
  - `user_id` (uuid, defaults to the signed-in user)
  - `mock_test_id` (uuid, the generated test that the exam flow uses)
  - `chapter_ids` (int array, chapters chosen by the student)
  - `difficulty` (text: ANY, EASY, MEDIUM, HARD)
  - `question_count` (int, number of questions actually delivered)
  - `created_at` (timestamptz)

2. New Functions
- `build_custom_practice_test(p_chapter_ids, p_difficulty, p_count)`: validates the student's choices, picks published questions from the chosen chapters (unseen questions first), creates a private test owned by the caller, and records it in `custom_practice_sets`. Returns the new test id.

3. Security
- RLS enabled on `custom_practice_sets`; students can SELECT only their own rows.
- Students cannot insert, update or delete rows directly; creation happens only through the function.
- The function derives the owner from `auth.uid()` and is executable by `authenticated` only.

4. Notes
- Counts are bounded to 5-50 and chapters to 1-30 on the server.
- If fewer questions exist than requested, the test is built with what is available and `question_count` reflects the real number.
*/

CREATE TABLE IF NOT EXISTS public.custom_practice_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  chapter_ids integer[] NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('ANY', 'EASY', 'MEDIUM', 'HARD')),
  question_count integer NOT NULL CHECK (question_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_practice_sets_user_created_idx
  ON public.custom_practice_sets (user_id, created_at DESC);

ALTER TABLE public.custom_practice_sets ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.custom_practice_sets TO authenticated;

DROP POLICY IF EXISTS "select_own_custom_practice_sets" ON public.custom_practice_sets;
CREATE POLICY "select_own_custom_practice_sets" ON public.custom_practice_sets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.build_custom_practice_test(
  p_chapter_ids integer[],
  p_difficulty text,
  p_count integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_mock_id uuid;
  v_question record;
  v_position integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_chapter_ids IS NULL OR cardinality(p_chapter_ids) < 1 OR cardinality(p_chapter_ids) > 30 THEN
    RAISE EXCEPTION 'Select between 1 and 30 chapters';
  END IF;

  IF p_difficulty IS NULL OR p_difficulty NOT IN ('ANY', 'EASY', 'MEDIUM', 'HARD') THEN
    RAISE EXCEPTION 'Invalid difficulty';
  END IF;

  IF p_count IS NULL OR p_count < 5 OR p_count > 50 THEN
    RAISE EXCEPTION 'Question count must be between 5 and 50';
  END IF;

  INSERT INTO public.mock_tests (
    title, category, mode, duration_min, total_marks, access, status, kind,
    owner_user_id, visibility, meta_json
  )
  VALUES (
    'Custom Practice Test',
    'custom practice',
    'EXAM',
    p_count * 2,
    p_count * 4,
    'FREE',
    'PUBLISHED',
    'CUSTOM_TOPICS',
    v_user,
    'PRIVATE',
    jsonb_build_object('chapter_ids', p_chapter_ids, 'difficulty', p_difficulty, 'requested', p_count)
  )
  RETURNING id INTO v_mock_id;

  FOR v_question IN
    SELECT q.id
    FROM public.questions q
    WHERE q.chapter_id = ANY (p_chapter_ids)
      AND q.review_status = 'PUBLISHED'
      AND (p_difficulty = 'ANY' OR q.difficulty = p_difficulty)
    ORDER BY
      EXISTS (
        SELECT 1 FROM public.responses r
        JOIN public.attempts a ON a.id = r.attempt_id
        WHERE a.user_id = v_user AND r.question_id = q.id
      ),
      random()
    LIMIT p_count
  LOOP
    INSERT INTO public.mock_test_questions (mock_test_id, question_id, position, section)
    VALUES (v_mock_id, v_question.id, v_position, 'Practice');
    v_position := v_position + 1;
  END LOOP;

  IF v_position = 0 THEN
    RAISE EXCEPTION 'No questions match these filters';
  END IF;

  UPDATE public.mock_tests
  SET total_marks = v_position * 4,
      duration_min = v_position * 2,
      meta_json = jsonb_build_object('chapter_ids', p_chapter_ids, 'difficulty', p_difficulty, 'requested', p_count, 'delivered', v_position)
  WHERE id = v_mock_id;

  INSERT INTO public.custom_practice_sets (user_id, mock_test_id, chapter_ids, difficulty, question_count)
  VALUES (v_user, v_mock_id, p_chapter_ids, p_difficulty, v_position);

  RETURN v_mock_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.build_custom_practice_test(integer[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_custom_practice_test(integer[], text, integer) TO authenticated;
