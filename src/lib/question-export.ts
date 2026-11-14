import type { QuestionWithChapter } from '@/lib/types';

const EXPORT_HEADERS = [
  'chapter_id', 'type', 'difficulty', 'statement_tex', 'option_a', 'option_b', 'option_c', 'option_d',
  'answer_option', 'answer_value', 'tolerance', 'solution_tex', 'licence', 'source_reference',
  'question_id', 'subject', 'chapter_name', 'source', 'review_status', 'created_at',
];

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function questionToRow(q: QuestionWithChapter): unknown[] {
  const options = (q.options_json ?? []) as { id: string; text: string }[];
  const answer = (q.answer_json ?? {}) as { option?: string; value?: number };
  const optionText = (id: string) => options.find((o) => o.id === id)?.text ?? '';
  const isMcq = q.type === 'MCQ';

  return [
    q.chapter.id,
    q.type,
    q.difficulty,
    q.statement_tex,
    isMcq ? optionText('a') : '',
    isMcq ? optionText('b') : '',
    isMcq ? optionText('c') : '',
    isMcq ? optionText('d') : '',
    isMcq ? answer.option ?? '' : '',
    isMcq ? '' : answer.value ?? '',
    isMcq ? '' : q.tolerance ?? 0,
    q.solution_tex ?? '',
    q.licence,
    q.source_reference ?? '',
    q.id,
    q.subject_name,
    q.chapter.name,
    q.source,
    q.review_status,
    q.created_at,
  ];
}

export function buildQuestionBankCsv(questions: QuestionWithChapter[]): string {
  const lines = [EXPORT_HEADERS, ...questions.map(questionToRow)];
  return lines.map((cells) => cells.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
