/*
# Homepage content tables + public RPC functions

1. Purpose
   The landing page and exam navigator call several `public_*` RPC helpers
   that did not exist, causing PGRST202 errors on every homepage load.
   This migration creates the supporting content tables (testimonials,
   faqs, homepage_content) and all six read-only public RPC functions.

2. New Tables
   - testimonials (id, name, score_label, quote, belt, verified, sort_order, created_at)
   - faqs (id, question, answer, sort_order, created_at)
   - homepage_content (section_key text PK, content_json jsonb, updated_at)

3. New Functions (all SECURITY INVOKER, STABLE, read-only, EXECUTE to anon+authenticated)
   - public_platform_stats()        → aggregate counters
   - public_testimonials()          → verified testimonials
   - public_faqs()                  → FAQs
   - public_featured_tests(p_limit) → published public mock_tests
   - public_exam_categories()       → category + count of published public mocks
   - public_homepage_content()      → homepage_sections rows

4. Security
   - All three new tables: RLS enabled, SELECT granted to anon + authenticated
     (public marketing content), no writes from the frontend.
   - Functions are SECURITY INVOKER so they respect RLS on underlying tables.
   - EXECUTE granted to anon + authenticated so the public landing page works.
*/

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  score_label text,
  quote       text NOT NULL,
  belt        text,
  verified    boolean NOT NULL DEFAULT false,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.testimonials TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_testimonials" ON public.testimonials;
CREATE POLICY "public_read_testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question    text NOT NULL,
  answer      text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.faqs TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_faqs" ON public.faqs;
CREATE POLICY "public_read_faqs" ON public.faqs
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- homepage_content
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_content (
  section_key  text PRIMARY KEY,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.homepage_content TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_homepage_content" ON public.homepage_content;
CREATE POLICY "public_read_homepage_content" ON public.homepage_content
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Seed a few default FAQs so the page is not empty on first load
-- ---------------------------------------------------------------------------
INSERT INTO public.faqs (question, answer, sort_order) VALUES
  ('Is NTA Rankers free to use?', 'Yes. You can attempt free mock tests, daily practice problems, and previous year papers without paying. Premium features like full-length proctored mocks are available on a paid plan.', 1),
  ('How are mock tests generated?', 'Every test is built from a verified question bank tagged by chapter, subject, and difficulty. The platform assembles a balanced paper that mirrors the real NTA exam pattern.', 2),
  ('What is the belt system?', 'Each chapter earns a belt — White, Yellow, Green, Blue, Brown, or Black — based on your accuracy and the difficulty of questions you answer correctly. Belts update automatically after every attempt.', 3),
  ('Can I reattempt my mistakes?', 'Yes. The Mistake Notebook collects every question you got wrong and lets you generate a focused reattempt set so you can turn mistakes into marks.', 4),
  ('Do I need to create an account?', 'You can browse the public pages without an account, but attempting tests and tracking your progress requires a free account so your data is saved.', 5)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- public_platform_stats
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_platform_stats()
RETURNS TABLE (
  registered_students bigint,
  mock_attempts bigint,
  published_questions bigint,
  available_series bigint,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles)                                       AS registered_students,
    (SELECT count(*) FROM public.attempts WHERE status = 'SUBMITTED')           AS mock_attempts,
    (SELECT count(*) FROM public.questions WHERE review_status = 'PUBLISHED')    AS published_questions,
    (SELECT count(*) FROM public.mock_tests
       WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC')                      AS available_series,
    now()                                                                        AS updated_at;
$$;
GRANT EXECUTE ON FUNCTION public.public_platform_stats() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_testimonials
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_testimonials()
RETURNS TABLE (
  id uuid,
  name text,
  score_label text,
  quote text,
  belt text,
  verified boolean,
  sort_order int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    t.id, t.name, t.score_label, t.quote, t.belt, t.verified, t.sort_order
  FROM public.testimonials t
  WHERE t.verified = true
  ORDER BY t.sort_order NULLS LAST, t.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.public_testimonials() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_faqs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_faqs()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  sort_order int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT f.id, f.question, f.answer, f.sort_order
  FROM public.faqs f
  ORDER BY f.sort_order NULLS LAST, f.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.public_faqs() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_featured_tests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_featured_tests(p_limit int DEFAULT 9)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  duration_min int,
  total_marks int,
  access text,
  mode text,
  kind text,
  question_count bigint,
  is_featured boolean,
  featured_order int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    mt.id,
    mt.title,
    mt.category,
    mt.duration_min,
    mt.total_marks,
    mt.access,
    mt.mode,
    mt.kind,
    (SELECT count(*) FROM public.mock_test_questions mtq WHERE mtq.mock_test_id = mt.id) AS question_count,
    COALESCE((mt.meta_json->>'is_featured')::boolean, false)                          AS is_featured,
    COALESCE((mt.meta_json->>'featured_order')::int, 0)                               AS featured_order
  FROM public.mock_tests mt
  WHERE mt.status = 'PUBLISHED'
    AND mt.visibility = 'PUBLIC'
  ORDER BY is_featured DESC, featured_order ASC, mt.created_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.public_featured_tests(int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_exam_categories
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_exam_categories()
RETURNS TABLE (
  category text,
  test_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT mt.category, count(*) AS test_count
  FROM public.mock_tests mt
  WHERE mt.status = 'PUBLISHED' AND mt.visibility = 'PUBLIC'
  GROUP BY mt.category
  ORDER BY mt.category;
$$;
GRANT EXECUTE ON FUNCTION public.public_exam_categories() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_homepage_content
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_homepage_content()
RETURNS TABLE (
  section_key text,
  content_json jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT hc.section_key, hc.content_json
  FROM public.homepage_content hc
  ORDER BY hc.section_key;
$$;
GRANT EXECUTE ON FUNCTION public.public_homepage_content() TO anon, authenticated;
