export interface PlatformStats {
  registered_students: number;
  mock_attempts: number;
  published_questions: number;
  available_series: number;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  score_label: string | null;
  quote: string;
  belt: string | null;
  verified: boolean;
  sort_order: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface FeaturedTest {
  id: string;
  title: string;
  category: string | null;
  duration_min: number;
  total_marks: number;
  access: string;
  mode: string;
  kind: string;
  question_count: number;
  is_featured: boolean;
  featured_order: number;
}

export interface ExamCategory {
  category: string;
  test_count: number;
}

export interface HomepageContent {
  [section_key: string]: Record<string, unknown>;
}

export interface PersonalizedSummary {
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  lastAttemptDate: string | null;
  weakChapters: { name: string; belt: string; score: number }[];
  hasData: boolean;
}
