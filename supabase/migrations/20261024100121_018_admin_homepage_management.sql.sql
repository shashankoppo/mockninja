-- Add staff write policies for homepage_content, testimonials, faqs
-- and seed default homepage section configurations

-- homepage_content: staff can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "staff_write_homepage_content" ON public.homepage_content;
CREATE POLICY "staff_write_homepage_content" ON public.homepage_content
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- testimonials: staff can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "staff_write_testimonials" ON public.testimonials;
CREATE POLICY "staff_write_testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- faqs: staff can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "staff_write_faqs" ON public.faqs;
CREATE POLICY "staff_write_faqs" ON public.faqs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Seed default homepage_content rows for all manageable sections
INSERT INTO public.homepage_content (section_key, content_json) VALUES
  ('hero', '{"enabled": true, "badge": "Mock Ninja is live", "title": "Crack JEE Main with NTA-style mock tests", "subtitle": "Real exam screen, honest scoring, mastery tracking.", "ctaPrimary": "Start free mock", "ctaSecondary": "Browse mock tests"}'),
  ('stats_strip', '{"enabled": true, "stats": [{"value": "3", "label": "Subjects", "detail": "Physics, Chemistry, Mathematics"}, {"value": "75", "label": "Questions", "detail": "NTA-style practice set"}, {"value": "300", "label": "Total marks", "detail": "Honest server grading"}, {"value": "Daily", "label": "Smart practice", "detail": "A clear next step every day"}]}'),
  ('nta_showcase', '{"enabled": true, "badge": "NTA-Style CBT", "title": "The Real Exam Screen", "desc": "Same palette, tabs, timer, and action buttons as the actual JEE Main CBT.", "features": ["Full-length 75-question mock tests", "Subject tabs with palette navigation", "Timer with auto-submit", "Mark for review, save & next, save & mark"]}'),
  ('popular_mock_tests', '{"enabled": true, "title": "Popular Mock Tests", "subtitle": "Most attempted full-length and subject tests."}'),
  ('free_on_mock_ninja', '{"enabled": true, "title": "Free on Mock Ninja", "subtitle": "Start practicing with these free mock tests."}'),
  ('previous_year_papers', '{"enabled": true, "title": "Previous-Year Papers", "subtitle": "Practice with JEE Main papers by year, session, and shift."}'),
  ('subject_chapter_practice', '{"enabled": true, "title": "Subject & Chapter Practice", "subtitle": "Practice by subject, chapter, or topic with real question counts."}'),
  ('dpp', '{"enabled": true, "badge": "Daily", "title": "Daily Practice Problems", "desc": "Fresh problems every day across all subjects. Build consistency with timed or untimed practice."}'),
  ('daily_target_mock', '{"enabled": true, "title": "Daily Target Mock", "subtitle": "A short, personalized test each day built from your weakest topics."}'),
  ('performance_analytics', '{"enabled": true, "title": "Performance Analytics", "subtitle": "Scorecard, time analysis, and mistake review — all in one place."}'),
  ('reattempt_mistake', '{"enabled": true, "title": "Re-attempt & Mistake Notebook", "subtitle": "Four ways to turn mistakes into mastery."}'),
  ('study_plan', '{"enabled": true, "badge": "Personalized", "title": "Personalized Study Plan", "desc": "Recommended chapters, daily goals, and next tests — all driven by your real performance data."}'),
  ('mastery_tracking', '{"enabled": true, "title": "Chapter Mastery Tracking", "subtitle": "See your per-chapter progress and belt level for every topic."}'),
  ('ranking_system', '{"enabled": true, "title": "Student Ranking System", "desc": "Compare your scores with other students on test, series, and challenge leaderboards."}'),
  ('why_mock_ninja', '{"enabled": true, "title": "Why Mock Ninja?", "subtitle": "Every feature is backed by a shipped capability."}'),
  ('belt_system', '{"enabled": true, "title": "From White to Black", "subtitle": "Earn belts through verified chapter-level mastery."}'),
  ('pricing', '{"enabled": true, "title": "Free vs Premium", "subtitle": "Simple, transparent pricing. No fake timers or scarcity."}'),
  ('study_material', '{"enabled": true, "title": "Study Material & Learning Resources", "subtitle": "Chapter notes, formula sheets, and revision material."}'),
  ('testimonials', '{"enabled": true, "title": "What Students Say", "subtitle": "Real results from real students."}'),
  ('faqs', '{"enabled": true, "title": "Frequently Asked Questions", "subtitle": "Everything you need to know about Mock Ninja."}'),
  ('final_cta', '{"enabled": true, "title": "Ready to start?", "subtitle": "Join thousands of students preparing with Mock Ninja."}')
ON CONFLICT (section_key) DO NOTHING;
