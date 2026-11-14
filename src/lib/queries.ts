import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ChapterWithSubject, QuestionWithChapter, MockTestWithCount, ImportBatch } from '@/lib/types';

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('id');
      if (error) throw error;
      return data;
    },
  });
}

export function useChapters(subjectId?: number) {
  return useQuery({
    queryKey: ['chapters', subjectId],
    queryFn: async () => {
      let query = supabase
        .from('chapters')
        .select('id, subject_id, name, class_level, ordinal, subject:id!inner(name)')
        .order('subject_id')
        .order('ordinal');
      if (subjectId) query = query.eq('subject_id', subjectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ChapterWithSubject[];
    },
  });
}

export function useQuestions(filters?: {
  chapterId?: number;
  subjectId?: number;
  status?: string;
  difficulty?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          id, chapter_id, type, difficulty, statement_tex, options_json, answer_json,
          tolerance, solution_tex, review_status, source, created_at, reviewed_by, image_path,
          licence, source_reference,
          chapter:chapter_id ( id, name, subject_id, subject:subject_id ( name ) )
        `)
        .order('created_at', { ascending: false });

      if (filters?.chapterId) query = query.eq('chapter_id', filters.chapterId);
      if (filters?.status) query = query.eq('review_status', filters.status);
      if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty);
      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.subjectId) {
        query = query.filter('chapter.subject_id', 'eq', filters.subjectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((q) => {
        const chapter = q.chapter as unknown as { id: number; name: string; subject_id: number; subject: { name: string } };
        return {
          ...q,
          chapter: { id: chapter.id, name: chapter.name, subject_id: chapter.subject_id },
          subject_name: chapter.subject.name,
        };
      }) as QuestionWithChapter[];
    },
  });
}

export function useMockTests(filters?: { status?: string; visibility?: string }) {
  return useQuery({
    queryKey: ['mock-tests', filters],
    queryFn: async () => {
      let query = supabase
        .from('mock_tests')
        .select(`
          id, title, category, mode, duration_min, total_marks, access, status,
          kind, visibility, marking_scheme, created_at, question_paper_path,
          mock_test_questions(count)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.visibility) query = query.eq('visibility', filters.visibility);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((m) => ({
        ...m,
        question_count: (m.mock_test_questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
      })) as MockTestWithCount[];
    },
  });
}

export function usePublishedMocks() {
  return useMockTests({ status: 'PUBLISHED', visibility: 'PUBLIC' });
}

export function useMockTest(id: string | undefined) {
  return useQuery({
    queryKey: ['mock-test', id],
    queryFn: async () => {
      if (!id) throw new Error('No id');
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, category, mode, duration_min, total_marks, access, status, kind, visibility, marking_scheme, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useMockTestQuestionCount(id: string | undefined) {
  return useQuery({
    queryKey: ['mock-test-question-count', id],
    queryFn: async () => {
      if (!id) throw new Error('No id');
      const { count, error } = await supabase
        .from('mock_test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('mock_test_id', id);
      if (error) throw error;
      return count;
    },
    enabled: !!id,
  });
}

export function useMockTestSections(id: string | undefined) {
  return useQuery({
    queryKey: ['mock-test-sections', id],
    queryFn: async () => {
      if (!id) throw new Error('No id');
      const { data, error } = await supabase
        .from('mock_test_questions')
        .select('question_id, section')
        .eq('mock_test_id', id);
      if (error) throw error;

      const { data: questions } = await supabase
        .from('questions')
        .select('id, type')
        .in('id', (data || []).map((d) => d.question_id));

      const typeMap = new Map((questions || []).map((q) => [q.id, q.type]));
      let mcqCount = 0;
      let numericalCount = 0;
      for (const mtq of data || []) {
        const type = typeMap.get(mtq.question_id);
        if (type === 'MCQ') mcqCount++;
        else if (type === 'NUMERICAL') numericalCount++;
      }
      return { mcq: mcqCount, numerical: numericalCount, total: mcqCount + numericalCount };
    },
    enabled: !!id,
  });
}

export interface PagedQuestionsParams {
  page: number;
  pageSize: number;
  search?: string;
  subjectId?: number;
  chapterId?: number;
  status?: string;
  difficulty?: string;
  type?: string;
  licence?: string;
  source?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PagedQuestionsResult {
  items: QuestionWithChapter[];
  total: number;
}

export type QuestionFilterParams = Omit<PagedQuestionsParams, 'page' | 'pageSize'>;

const QUESTION_SELECT = `
  id, chapter_id, type, difficulty, statement_tex, options_json, answer_json,
  tolerance, solution_tex, review_status, source, created_at, reviewed_by, image_path,
  licence, source_reference,
  chapter:chapter_id ( id, name, subject_id, subject:subject_id ( name ) )
`;

function buildQuestionsQuery(params: QuestionFilterParams) {
  const {
    search, subjectId, chapterId, status, difficulty,
    type, licence, source, sortBy = 'created_at', sortDir = 'desc',
  } = params;
  let query = supabase.from('questions').select(QUESTION_SELECT, { count: 'exact' });

  if (search) query = query.ilike('statement_tex', `%${search}%`);
  if (chapterId) query = query.eq('chapter_id', chapterId);
  if (status) query = query.eq('review_status', status);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (type) query = query.eq('type', type);
  if (licence) query = query.eq('licence', licence);
  if (source) query = query.eq('source', source);
  if (subjectId) query = query.filter('chapter.subject_id', 'eq', subjectId);

  const validSort = ['created_at', 'type', 'difficulty', 'review_status', 'source', 'licence'].includes(sortBy) ? sortBy : 'created_at';
  return query
    .order(validSort, { ascending: sortDir === 'asc' })
    .order('id', { ascending: true });
}

function mapQuestionRows<T extends { chapter: unknown }>(data: T[]): QuestionWithChapter[] {
  return data.map((q) => {
    const chapter = q.chapter as unknown as { id: number; name: string; subject_id: number; subject: { name: string } };
    return {
      ...q,
      chapter: { id: chapter.id, name: chapter.name, subject_id: chapter.subject_id },
      subject_name: chapter.subject.name,
    };
  }) as unknown as QuestionWithChapter[];
}

export async function fetchAllQuestionsForExport(params: QuestionFilterParams): Promise<QuestionWithChapter[]> {
  const batchSize = 1000;
  const rows: QuestionWithChapter[] = [];
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await buildQuestionsQuery(params).range(from, from + batchSize - 1);
    if (error) throw error;
    const batch = mapQuestionRows(data ?? []);
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }
  return rows;
}

export function usePagedQuestions(params: PagedQuestionsParams) {
  return useQuery({
    queryKey: ['questions-paged', params],
    queryFn: async () => {
      const { page, pageSize } = params;
      const from = (page - 1) * pageSize;
      const { data, error, count } = await buildQuestionsQuery(params).range(from, from + pageSize - 1);
      if (error) throw error;
      return { items: mapQuestionRows(data ?? []), total: count ?? 0 } as PagedQuestionsResult;
    },
    placeholderData: (prev) => prev,
  });
}

export function useImportBatches() {
  return useQuery({
    queryKey: ['import-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('id, created_by, file_name, rows_total, rows_ok, rows_failed, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ImportBatch[];
    },
  });
}

export function useQuestionCounts() {
  return useQuery({
    queryKey: ['question-counts'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      const { count: published } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'PUBLISHED');
      const { count: draft } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'DRAFT');
      const { count: review } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'REVIEW');
      const { count: mcq } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'MCQ');
      const { count: numerical } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'NUMERICAL');
      const { count: unknownLicence } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('licence', 'UNKNOWN');
      return {
        total: total ?? 0,
        published: published ?? 0,
        draft: draft ?? 0,
        review: review ?? 0,
        mcq: mcq ?? 0,
        numerical: numerical ?? 0,
        unknownLicence: unknownLicence ?? 0,
      };
    },
  });
}

export interface PublicSettings {
  site_name?: string;
  tagline?: string;
  support_email?: string;
  default_language?: string;
  seo_title?: string;
  seo_description?: string;
  share_image?: string;
  legal_entity_name?: string;
  copyright_line?: string;
  grievance_officer_name?: string;
  grievance_officer_email?: string;
  contact_desks?: Array<{
    label: string;
    type: string;
    email: string;
    phone: string;
    whatsapp: string;
    hours: string;
    address: string;
    response_time: string;
  }>;
  social_links?: Array<{ platform: string; url: string }>;
}

export function usePublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_settings');
      if (error) throw error;
      return (data ?? {}) as PublicSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
