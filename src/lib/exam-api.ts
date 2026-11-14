import { supabase } from '@/lib/supabase';

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export async function examStart(mockTestId: string): Promise<{ attempt_id: string } | { error: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam?action=start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mock_test_id: mockTestId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export interface ExamData {
  attempt: {
    id: string;
    status: string;
    mock_test_id: string;
    started_at: string;
    submitted_at: string | null;
    score: number | null;
    duration_min: number | null;
    is_untimed: boolean;
    watermark_snapshot?: Record<string, unknown> | null;
    blueprint_snapshot?: { marking_scheme: Record<string, unknown>; total_marks: number } | null;
  };
  mock_test: {
    id: string;
    title: string;
    duration_min: number;
    total_marks: number;
    marking_scheme: Record<string, unknown>;
    mode: string;
    meta_json: Record<string, unknown> | null;
  };
  questions: {
    id: string;
    type: 'MCQ' | 'NUMERICAL';
    statement_tex: string;
    options_json: { id: string; text: string }[] | null;
    chapter_id: number;
    difficulty: string;
    position: number;
    section: string | null;
  }[];
  responses: Record<string, { answer: unknown; time_spent_sec: number; flagged: boolean }>;
}

export async function examGet(attemptId: string): Promise<ExamData | { error: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam?action=get&attempt_id=${attemptId}`,
    { headers: { Authorization: `Bearer ${await getToken()}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export async function examSave(
  attemptId: string,
  questionId: string,
  answer: unknown,
  timeSpentSec: number,
  flagged: boolean,
): Promise<{ success: boolean } | { error: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam?action=save`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attempt_id: attemptId,
      question_id: questionId,
      answer,
      time_spent_sec: timeSpentSec,
      flagged,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export async function examSubmit(
  attemptId: string,
  responses: { question_id: string; answer: unknown; time_spent_sec: number; flagged: boolean }[],
): Promise<{ success: boolean; attempt_id: string; score: number } | { error: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam?action=submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attempt_id: attemptId, responses }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export interface ResultItem {
  question_id: string;
  position: number;
  type: 'MCQ' | 'NUMERICAL';
  statement_tex: string;
  options_json: { id: string; text: string }[] | null;
  answer_json: Record<string, unknown> | null;
  tolerance: number;
  solution_tex: string | null;
  difficulty: string;
  chapter_name: string;
  subject_name: string;
  student_answer: unknown;
  is_correct: boolean | null;
  awarded_marks: number;
  time_spent_sec: number;
  flagged: boolean;
}

export interface ResultsData {
  attempt: {
    id: string;
    status: string;
    mock_test_id: string;
    started_at: string;
    submitted_at: string | null;
    score: number | null;
    blueprint_snapshot?: { marking_scheme: Record<string, unknown>; total_marks: number } | null;
  };
  mock_test: {
    id: string;
    title: string;
    total_marks: number;
    marking_scheme: Record<string, unknown>;
  };
  results: ResultItem[];
}

export type DailyMockDifficulty = 'ANY' | 'EASY' | 'MEDIUM' | 'HARD';

export async function dailyMockGenerate(difficulty: DailyMockDifficulty = 'ANY'): Promise<{ mock_test_id: string; for_date: string; already_exists: boolean } | { error: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-mock`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export async function mistakeReattempt(): Promise<{ mock_test_id: string; question_count: number } | { error: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mistake-reattempt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export async function examResults(attemptId: string): Promise<ResultsData | { error: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam?action=results&attempt_id=${attemptId}`,
    { headers: { Authorization: `Bearer ${await getToken()}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}
