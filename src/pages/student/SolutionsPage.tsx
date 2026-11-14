import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Lightbulb,
  RotateCcw,
  Share2,
  Target,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Math as MathTex } from '@/components/Math';
import { cn } from '@/lib/utils';
import { examResults, type ResultItem, type ResultsData } from '@/lib/exam-api';
import { SolutionsShareDialog } from '@/components/student/SolutionsShareDialog';

export function SolutionsPage() {
  const { attemptId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'unattempted' | 'correct'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!attemptId) {
        setError('Open solutions from a submitted mock to review its questions.');
        setLoading(false);
        return;
      }
      const result = await examResults(attemptId);
      if (!mounted) return;
      if ('error' in result) setError(result.error);
      else {
        setData(result);
        setExpanded(new Set(result.results.map((item) => item.question_id)));
      }
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [attemptId]);

  const counts = useMemo(() => {
    const results = data?.results ?? [];
    return {
      all: results.length,
      wrong: results.filter((item) => item.is_correct === false).length,
      unattempted: results.filter((item) => item.is_correct === null).length,
      correct: results.filter((item) => item.is_correct === true).length,
    };
  }, [data]);

  const filteredResults = useMemo(() => {
    if (!data) return [];
    return data.results.filter((item) => {
      if (filter === 'wrong') return item.is_correct === false;
      if (filter === 'unattempted') return item.is_correct === null;
      if (filter === 'correct') return item.is_correct === true;
      return true;
    });
  }, [data, filter]);

  const toggleQuestion = (questionId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !data) {
    return (
      <StudentLayout>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-navy-900">Solutions unavailable</h1>
            <p className="mt-1 text-sm text-navy-500">{error || t('exam.loadError')}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/mocks')}>{t('results.backToMocks')}</Button>
        </div>
      </StudentLayout>
    );
  }

  const tabs: { key: typeof filter; label: string; color: string }[] = [
    { key: 'all', label: 'All questions', color: 'bg-navy-100 text-navy-700' },
    { key: 'wrong', label: 'Needs another look', color: 'bg-red-100 text-red-700' },
    { key: 'unattempted', label: 'Skipped', color: 'bg-amber-100 text-amber-700' },
    { key: 'correct', label: 'Correct', color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/results/${data.attempt.id}`)}
            className="flex items-center gap-1 text-sm text-navy-500 transition-colors hover:text-navy-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to results
          </button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </Button>
        </div>

        <Card className="overflow-hidden border-govt-200">
          <div className="bg-gradient-to-br from-govt-900 via-govt-800 to-navy-900 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
                  <Lightbulb className="h-3.5 w-3.5 text-saffron-300" />
                  Learn from every attempt
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Detailed solutions</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {data.mock_test.title} · Review the correct method, your response, and the exact reason behind each mark.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                <SummaryStat label="Questions" value={counts.all} />
                <SummaryStat label="Correct" value={counts.correct} tone="success" />
                <SummaryStat label="To revisit" value={counts.wrong + counts.unattempted} tone="warning" />
              </div>
            </div>
          </div>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">Turn mistakes into marks</p>
                <p className="text-sm text-navy-500">Re-attempt the wrong questions without changing this original score.</p>
              </div>
            </div>
            <Button onClick={() => navigate(`/exam/${data.attempt.id}/reattempt`)} disabled={counts.wrong === 0}>
              <RotateCcw className="h-4 w-4" />
              Re-attempt wrong questions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Question-by-question solutions</CardTitle>
              <p className="mt-1 text-sm text-navy-500">Every answer includes the worked solution and a clear answer check.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={() => setExpanded(new Set(filteredResults.map((item) => item.question_id)))}>Expand all</Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(new Set())}>Collapse all</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-2 border-b border-navy-100 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                    filter === tab.key ? 'bg-govt-800 text-white shadow-sm' : `${tab.color} hover:opacity-80`,
                  )}
                >
                  {tab.label} <span className="ml-1 opacity-70">{counts[tab.key]}</span>
                </button>
              ))}
            </div>

            {filteredResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-4 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-navy-800">Nothing in this filter</p>
                <p className="mt-1 text-sm text-navy-500">Choose another view to continue reviewing the attempt.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResults.map((item, index) => (
                  <SolutionCard
                    key={item.question_id}
                    item={item}
                    index={index}
                    expanded={expanded.has(item.question_id)}
                    onToggle={() => toggleQuestion(item.question_id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <SolutionsShareDialog open={shareOpen} onClose={() => setShareOpen(false)} mockTitle={data.mock_test.title} />
      </div>
    </StudentLayout>
  );
}

function SummaryStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <div className="min-w-[72px] rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
      <div className={cn('text-xl font-bold', tone === 'success' && 'text-emerald-300', tone === 'warning' && 'text-saffron-300')}>{value}</div>
      <div className="mt-0.5 text-2xs text-white/65">{label}</div>
    </div>
  );
}

function SolutionCard({ item, index, expanded, onToggle, t }: { item: ResultItem; index: number; expanded: boolean; onToggle: () => void; t: (key: string) => string }) {
  const correct = item.is_correct === true;
  const skipped = item.is_correct === null;
  const correctOption = (item.answer_json as { option?: string } | null)?.option;
  const studentOption = (item.student_answer as { option?: string } | null)?.option;
  const correctValue = (item.answer_json as { value?: number } | null)?.value;
  const studentValue = (item.student_answer as { value?: number } | null)?.value;

  return (
    <article className={cn(
      'overflow-hidden rounded-xl border transition-shadow hover:shadow-card',
      correct ? 'border-emerald-200' : skipped ? 'border-amber-200' : 'border-red-200',
    )}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left sm:px-5" aria-expanded={expanded}>
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          correct ? 'bg-emerald-100 text-emerald-700' : skipped ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
        )}>
          Q{item.position || index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="text-2xs">{item.subject_name}</Badge>
            <Badge variant="neutral" className="text-2xs">{item.type}</Badge>
            <span className="text-2xs text-navy-400">{item.chapter_name}</span>
          </span>
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-navy-900">
            {correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : skipped ? <MinusCircle className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
            {correct ? 'Correct answer' : skipped ? 'Not attempted' : 'Review this mistake'}
          </span>
        </span>
        <span className={cn('hidden rounded-md px-2 py-1 text-xs font-bold sm:inline', item.awarded_marks > 0 ? 'bg-emerald-100 text-emerald-700' : item.awarded_marks < 0 ? 'bg-red-100 text-red-700' : 'bg-navy-100 text-navy-500')}>
          {item.awarded_marks > 0 ? '+' : ''}{item.awarded_marks} marks
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-navy-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-navy-100 bg-navy-50/30 p-4 sm:p-5">
          <div className="rounded-xl border border-navy-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-400">Question</p>
              <span className="flex items-center gap-1 text-xs text-navy-400"><Clock3 className="h-3.5 w-3.5" />{formatDuration(item.time_spent_sec)}</span>
            </div>
            <div className="prose-exam text-navy-900"><MathTex display>{item.statement_tex}</MathTex></div>
          </div>

          {item.type === 'MCQ' && item.options_json && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-400">Answer check</p>
              {item.options_json.map((option) => {
                const isCorrect = option.id === correctOption;
                const isStudent = option.id === studentOption;
                return (
                  <div key={option.id} className={cn('flex items-center gap-3 rounded-lg border-2 bg-white px-3 py-2.5 text-sm', isCorrect ? 'border-emerald-400' : isStudent ? 'border-red-400' : 'border-navy-200')}>
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold', isCorrect ? 'bg-emerald-500 text-white' : isStudent ? 'bg-red-500 text-white' : 'bg-navy-100 text-navy-600')}>{option.id.toUpperCase()}</span>
                    <MathTex>{option.text}</MathTex>
                    <span className="ml-auto shrink-0 text-2xs font-semibold text-right">
                      {isCorrect && <span className="text-emerald-600">Correct answer</span>}
                      {isStudent && !isCorrect && <span className="text-red-600">Your answer</span>}
                      {isStudent && isCorrect && <span className="block text-emerald-600">Your answer</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {item.type === 'NUMERICAL' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AnswerBox label={t('exam.correctAnswer')} value={correctValue ?? '—'} tone="success" />
              <AnswerBox label={t('exam.yourAnswer')} value={studentValue ?? t('exam.notAttempted')} tone={correct ? 'neutral' : 'error'} />
            </div>
          )}

          <div className="mt-4 rounded-xl border border-govt-200 bg-govt-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-govt-800"><Lightbulb className="h-4 w-4 text-govt-600" />Step-by-step solution</div>
            {item.solution_tex ? <div className="prose-exam text-navy-800"><MathTex display>{item.solution_tex}</MathTex></div> : <p className="text-sm text-navy-500">A detailed solution for this question is being prepared.</p>}
          </div>
        </div>
      )}
    </article>
  );
}

function AnswerBox({ label, value, tone }: { label: string; value: string | number; tone: 'success' | 'error' | 'neutral' }) {
  return (
    <div className={cn('rounded-xl border-2 p-3', tone === 'success' ? 'border-emerald-300 bg-emerald-50' : tone === 'error' ? 'border-red-300 bg-red-50' : 'border-navy-200 bg-white')}>
      <div className={cn('text-xs font-medium', tone === 'success' ? 'text-emerald-600' : tone === 'error' ? 'text-red-600' : 'text-navy-500')}>{label}</div>
      <div className={cn('mt-1 font-bold', tone === 'success' ? 'text-emerald-700' : tone === 'error' ? 'text-red-700' : 'text-navy-700')}>{value}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}
