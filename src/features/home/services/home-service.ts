import { supabase } from '@/lib/supabase';
import type {
  PlatformStats,
  Testimonial,
  Faq,
  FeaturedTest,
  ExamCategory,
  HomepageContent,
} from './types';

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  const { data, error } = await supabase.rpc('public_platform_stats').maybeSingle();
  if (error) throw error;
  return data as PlatformStats | null;
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase.rpc('public_testimonials');
  if (error) return [];
  return (data || []) as Testimonial[];
}

export async function fetchFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase.rpc('public_faqs');
  if (error) throw error;
  return (data || []) as Faq[];
}

export async function fetchFeaturedTests(limit = 9): Promise<FeaturedTest[]> {
  const { data, error } = await supabase.rpc('public_featured_tests', { p_limit: limit });
  if (error) throw error;
  return (data || []) as FeaturedTest[];
}

export async function fetchFreeTests(limit = 6): Promise<FeaturedTest[]> {
  const { data, error } = await supabase
    .from('mock_tests')
    .select(`
      id, title, category, duration_min, total_marks, access, mode, kind,
      mock_test_questions(count)
    `)
    .eq('status', 'PUBLISHED')
    .eq('access', 'FREE')
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    duration_min: m.duration_min,
    total_marks: m.total_marks,
    access: m.access,
    mode: m.mode,
    kind: m.kind,
    question_count: (m.mock_test_questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
    is_featured: false,
    featured_order: 0,
  })) as FeaturedTest[];
}

export async function fetchExamCategories(): Promise<ExamCategory[]> {
  const { data, error } = await supabase.rpc('public_exam_categories');
  if (error) throw error;
  return (data || []) as ExamCategory[];
}

export async function fetchHomepageContent(): Promise<HomepageContent> {
  const { data, error } = await supabase.rpc('public_homepage_content');
  if (error) throw error;
  const result: HomepageContent = {};
  for (const row of data || []) {
    const r = row as { section_key: string; content_json: Record<string, unknown> };
    result[r.section_key] = r.content_json;
  }
  return result;
}

export function isSectionEnabled(content: HomepageContent | undefined, sectionKey: string): boolean {
  if (!content || !content[sectionKey]) return true;
  const c = content[sectionKey];
  return c.enabled !== false;
}

export function getSectionContent<T = Record<string, unknown>>(content: HomepageContent | undefined, sectionKey: string): T | undefined {
  return content?.[sectionKey] as T | undefined;
}
