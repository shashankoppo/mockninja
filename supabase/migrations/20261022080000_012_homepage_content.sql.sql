/*
# Homepage content tables and public RPCs
Adds testimonials, faqs, homepage_content tables + SECURITY DEFINER RPCs
for public homepage. All callable by anon + authenticated.
Rollback: DROP all functions and tables.
*/
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  score_label text,
  quote text NOT NULL,
  belt text,
  verified boolean NOT NULL DEFAULT false,
  consent_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_published_testimonials" ON public.testimonials;
CREATE POLICY "select_published_testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (status='PUBLISHED' AND consent_confirmed=true);
DROP POLICY IF EXISTS "staff_crud_testimonials" ON public.testimonials;
CREATE POLICY "staff_crud_testimonials" ON public.testimonials
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_published_faqs" ON public.faqs;
CREATE POLICY "select_published_faqs" ON public.faqs
  FOR SELECT TO anon, authenticated USING (status='PUBLISHED');
DROP POLICY IF EXISTS "staff_crud_faqs" ON public.faqs;
CREATE POLICY "staff_crud_faqs" ON public.faqs
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE IF NOT EXISTS public.homepage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_published_homepage_content" ON public.homepage_content;
CREATE POLICY "select_published_homepage_content" ON public.homepage_content
  FOR SELECT TO anon, authenticated USING (status='PUBLISHED');
DROP POLICY IF EXISTS "staff_crud_homepage_content" ON public.homepage_content;
CREATE POLICY "staff_crud_homepage_content" ON public.homepage_content
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE OR REPLACE FUNCTION public.public_platform_stats()
RETURNS TABLE (registered_students bigint, mock_attempts bigint, published_questions bigint, available_series bigint, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.profiles), (SELECT count(*) FROM public.attempts WHERE status='SUBMITTED'), (SELECT count(*) FROM public.questions WHERE review_status='PUBLISHED'), (SELECT count(*) FROM public.mock_tests WHERE status='PUBLISHED' AND visibility='PUBLIC'), now();
$$;
REVOKE EXECUTE ON FUNCTION public.public_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_platform_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_testimonials()
RETURNS TABLE (id uuid, name text, score_label text, quote text, belt text, verified boolean, sort_order int)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id, name, score_label, quote, belt, verified, sort_order FROM public.testimonials WHERE status='PUBLISHED' AND consent_confirmed=true ORDER BY sort_order, created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.public_testimonials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_testimonials() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_faqs()
RETURNS TABLE (id uuid, question text, answer text, sort_order int)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id, question, answer, sort_order FROM public.faqs WHERE status='PUBLISHED' ORDER BY sort_order, created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.public_faqs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_faqs() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_homepage_content()
RETURNS TABLE (section_key text, content_json jsonb)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT section_key, content_json FROM public.homepage_content WHERE status='PUBLISHED';
$$;
REVOKE EXECUTE ON FUNCTION public.public_homepage_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_homepage_content() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_featured_tests(p_limit int DEFAULT 9)
RETURNS TABLE (id uuid, title text, category text, duration_min int, total_marks int, access text, mode text, kind text, question_count bigint, is_featured boolean, featured_order int)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT mt.id, mt.title, mt.category, mt.duration_min, mt.total_marks, mt.access, mt.mode, mt.kind, COALESCE(cnt.qcount,0), COALESCE((mt.meta_json->>'is_featured')::boolean,false), COALESCE((mt.meta_json->>'featured_order')::int,999) FROM public.mock_tests mt LEFT JOIN (SELECT mock_test_id, count(*) AS qcount FROM public.mock_test_questions GROUP BY mock_test_id) cnt ON cnt.mock_test_id=mt.id WHERE mt.status='PUBLISHED' AND mt.visibility='PUBLIC' AND mt.kind='STANDARD' ORDER BY is_featured DESC, featured_order ASC, mt.created_at DESC LIMIT p_limit;
$$;
REVOKE EXECUTE ON FUNCTION public.public_featured_tests(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_featured_tests(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_exam_categories()
RETURNS TABLE (category text, test_count bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT category, count(*)::bigint FROM public.mock_tests WHERE status='PUBLISHED' AND visibility='PUBLIC' AND kind='STANDARD' AND category IS NOT NULL GROUP BY category ORDER BY category;
$$;
REVOKE EXECUTE ON FUNCTION public.public_exam_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_exam_categories() TO anon, authenticated;
