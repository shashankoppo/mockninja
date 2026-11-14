export type QuestionType = 'MCQ' | 'NUMERICAL';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ReviewStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'REJECTED';
export type QuestionSource = 'HUMAN' | 'IMPORTED' | 'AI_GENERATED';
export type Licence = 'OWNED' | 'LICENSED' | 'PUBLIC_DOMAIN' | 'UNKNOWN';
export type MockMode = 'PRACTICE' | 'EXAM';
export type MockStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type MockAccess = 'FREE' | 'PREMIUM';
export type MockKind = 'STANDARD' | 'DAILY_TARGET' | 'MISTAKE_REATTEMPT' | 'CUSTOM_TOPICS' | 'AI_STUDIO';
export type MockVisibility = 'PUBLIC' | 'PRIVATE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'REATTEMPT' | 'EXPIRED';

export interface Subject {
  id: number;
  name: string;
}

export interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  class_level: number;
  ordinal: number;
}

export interface McqOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  chapter_id: number;
  type: QuestionType;
  difficulty: Difficulty;
  statement_tex: string;
  options_json: McqOption[] | null;
  answer_json: Record<string, unknown> | null;
  tolerance: number | null;
  solution_tex: string | null;
  review_status: ReviewStatus;
  source: QuestionSource;
  created_at: string;
  reviewed_by: string | null;
  image_path: string | null;
  licence: Licence;
  source_reference: string | null;
}

export interface ImportBatch {
  id: string;
  created_by: string | null;
  file_name: string;
  rows_total: number;
  rows_ok: number;
  rows_failed: number;
  status: 'PENDING' | 'COMPLETED' | 'PARTIAL' | 'ROLLED_BACK';
  created_at: string;
}

export interface QuestionWithChapter extends Question {
  chapter: { id: number; name: string; subject_id: number };
  subject_name: string;
}

export interface MockTest {
  id: string;
  title: string;
  category: string;
  mode: MockMode;
  duration_min: number;
  total_marks: number;
  access: MockAccess;
  status: MockStatus;
  kind: MockKind;
  visibility: MockVisibility;
  marking_scheme: Record<string, unknown>;
  created_at: string;
  question_paper_path: string | null;
}

export interface MockTestQuestion {
  mock_test_id: string;
  question_id: string;
  position: number;
  section: string | null;
}

export interface MockTestWithCount extends MockTest {
  question_count: number;
}

export interface ChapterWithSubject extends Chapter {
  subject: Subject;
}
