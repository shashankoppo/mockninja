import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NotebookPen, Search, RotateCcw, Archive, CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp, Undo2, XCircle, BookOpen, TrendingDown } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { mistakeReattempt } from '@/lib/exam-api';
import { Math as MathTex } from '@/components/Math';
import { cn } from '@/lib/utils';

export function MistakeNotebookPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = window.localStorage.getItem(`mistake-archive:${user.id}`);
    if (saved) setArchived(new Set(JSON.parse(saved) as string[]));
  }, [user]);

  const { data: mistakes, isLoading } = useQuery({
    queryKey: ['mistake-notebook', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('responses')
        .select(`
          question_id, is_correct, awarded_marks, answer, flagged, time_spent_sec,
          attempt:attempt_id(id, status, mock_test_id, mock_test:mock_test_id(title)),
          question:question_id(id, type, statement_tex, options_json, answer_json, difficulty, solution_tex, chapter:chapter_id(name, subject:subject_id(name)))
        `)
        .eq('attempt.user_id', user.id)
        .eq('attempt.status', 'SUBMITTED')
        .order('question_id');

      if (filter === 'wrong') q = q.eq('is_correct', false);
      if (filter === 'flagged') q = q.eq('flagged', true);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const allMistakes = mistakes || [];

  const subjects = [...new Set(allMistakes.map((m: any) => m.question?.chapter?.subject?.name).filter(Boolean))] as string[];

  const filtered = allMistakes.filter((m: any) => {
    if (!showArchived && archived.has(m.question_id)) return false;
    if (showArchived && !archived.has(m.question_id)) return false;
    const subjName = m.question?.chapter?.subject?.name;
    if (subjectFilter !== 'all' && subjName !== subjectFilter) return false;
    if (!search) return true;
    const q = m.question as any;
    return q?.statement_tex?.toLowerCase().includes(search.toLowerCase()) || q?.chapter?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const wrongCount = allMistakes.filter((m: any) => m.is_correct === false && !archived.has(m.question_id)).length;
  const flaggedCount = allMistakes.filter((m: any) => m.flagged && !archived.has(m.question_id)).length;
  const archivedCount = archived.size;

  const handleRetry = async () => {
    setError(null);
    setActionLoading('retry');
    const result = await mistakeReattempt();
    setActionLoading(null);
    if ('error' in result) {
      setError(result.error);
    } else {
      navigate(`/mocks/${result.mock_test_id}`);
    }
  };

  const handleArchive = (questionId: string) => {
    setArchived((prev) => {
      const next = new Set(prev).add(questionId);
      if (user) window.localStorage.setItem(`mistake-archive:${user.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleUnarchive = (questionId: string) => {
    setArchived((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      if (user) window.localStorage.setItem(`mistake-archive:${user.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: allMistakes.length - archivedCount, color: 'bg-white/10 text-navy-300' },
    { key: 'wrong' as const, label: 'Incorrect', count: wrongCount, color: 'bg-red-500/20 text-red-300' },
    { key: 'flagged' as const, label: 'Flagged', count: flaggedCount, color: 'bg-saffron-500/20 text-saffron-300' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('notebookTitle' as string) || 'Mistake Notebook'}</h1>
            <p className="text-sm text-navy-300">{t('notebookDesc' as string) || 'Your personal notebook of mistakes to review and re-attempt.'}</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleRetry} disabled={actionLoading === 'retry' || wrongCount === 0}>
            {actionLoading === 'retry' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Building...</>
            ) : (
              <><RotateCcw className="h-4 w-4" /> Re-attempt Wrong</>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{wrongCount}</p>
                  <p className="text-xs text-navy-400">Incorrect</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-500/20">
                  <BookOpen className="h-5 w-5 text-saffron-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{flaggedCount}</p>
                  <p className="text-xs text-navy-400">Flagged</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Archive className="h-5 w-5 text-navy-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{archivedCount}</p>
                  <p className="text-xs text-navy-400">Archived</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder="Search by question or chapter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-navy-500 focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((ft) => (
              <button
                key={ft.key}
                onClick={() => setFilter(ft.key)}
                role="tab"
                aria-selected={filter === ft.key}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === ft.key ? 'bg-govt-600 text-white' : ft.color + ' hover:opacity-80',
                )}
              >
                {ft.label}
                <span className={cn('rounded-full px-1.5 text-2xs', filter === ft.key ? 'bg-white/20' : 'bg-white/10')}>{ft.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject filter + archived toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <>
              <button
                onClick={() => setSubjectFilter('all')}
                className={cn('rounded-full px-3 py-1 text-xs font-medium', subjectFilter === 'all' ? 'bg-govt-600 text-white' : 'bg-white/10 text-navy-300')}
              >
                All Subjects
              </button>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={cn('rounded-full px-3 py-1 text-xs font-medium', subjectFilter === s ? 'bg-govt-600 text-white' : 'bg-white/10 text-navy-300')}
                >
                  {s}
                </button>
              ))}
            </>
          )}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn('ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', showArchived ? 'bg-govt-500/20 text-govt-300' : 'bg-white/10 text-navy-400')}
          >
            <Archive className="h-3 w-3" />
            {showArchived ? 'Show active' : `Archived (${archivedCount})`}
          </button>
        </div>

        {/* Mistake list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <NotebookPen className="mx-auto mb-3 h-12 w-12 text-navy-500" />
              <p className="text-navy-300">{showArchived ? 'No archived mistakes.' : 'No mistakes recorded yet.'}</p>
              <p className="mt-1 text-sm text-navy-400">{showArchived ? 'Archived items will appear here when you archive mistakes.' : 'Take a mock test to build your mistake notebook.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((m: any, idx: number) => {
              const q = m.question as any;
              if (!q) return null;
              const isExpanded = expandedId === m.question_id;
              const isArchived = archived.has(m.question_id);
              return (
                <Card key={`${m.question_id}-${idx}`} className={cn('border-l-4 transition-[color,background-color,border-color,opacity]', isArchived ? 'border-l-white/20 opacity-60' : m.is_correct === false ? 'border-l-red-500/60' : 'border-l-saffron-500/60')}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {q.chapter?.subject?.name && <Badge variant="neutral">{q.chapter.subject.name}</Badge>}
                        {q.chapter?.name && <Badge variant="neutral">{q.chapter.name}</Badge>}
                        <Badge variant={q.type === 'MCQ' ? 'default' : 'info'}>{q.type}</Badge>
                        {q.difficulty && <Badge variant={q.difficulty === 'HARD' ? 'error' : q.difficulty === 'MEDIUM' ? 'warning' : 'success'}>{q.difficulty}</Badge>}
                        {m.flagged && <Badge variant="warning">Flagged</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold', m.awarded_marks < 0 ? 'text-red-400' : 'text-navy-300')}>
                          {m.awarded_marks > 0 ? '+' : ''}{m.awarded_marks}
                        </span>
                        <button
                          onClick={() => isArchived ? handleUnarchive(m.question_id) : handleArchive(m.question_id)}
                          className="text-navy-400 transition-colors hover:text-govt-400"
                          title={isArchived ? 'Restore' : 'Archive'}
                        >
                          {isArchived ? <Undo2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m.question_id)}
                          className="text-navy-400 transition-colors hover:text-govt-400"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="mb-2 text-sm text-white">
                      <MathTex>{q.statement_tex}</MathTex>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 rounded-lg bg-white/5 p-3">
                        {/* Your answer */}
                        <div>
                          <p className="mb-1 text-xs font-semibold text-navy-400">Your Answer</p>
                          <p className="text-sm text-navy-200">
                            {m.type === 'MCQ' || q.type === 'MCQ'
                              ? (m.answer as any)?.option?.toUpperCase() ?? 'No answer'
                              : (m.answer as any)?.value ?? 'No answer'}
                          </p>
                        </div>
                        {/* Correct answer */}
                        {m.is_correct === false && (
                          <div>
                            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Correct Answer
                            </p>
                            <p className="text-sm text-emerald-300">
                              {q.type === 'MCQ'
                                ? (q.answer_json as any)?.option?.toUpperCase() ?? '—'
                                : (q.answer_json as any)?.value ?? '—'}
                            </p>
                          </div>
                        )}
                        {/* Solution */}
                        {q.solution_tex && (
                          <div>
                            <p className="mb-1 text-xs font-semibold text-navy-400">Solution</p>
                            <div className="text-sm text-navy-200">
                              <MathTex>{q.solution_tex}</MathTex>
                            </div>
                          </div>
                        )}
                        {/* Time spent */}
                        {m.time_spent_sec != null && (
                          <div className="flex items-center gap-2 text-xs text-navy-400">
                            <TrendingDown className="h-3 w-3" />
                            Time spent: {Math.floor(m.time_spent_sec / 60)}m {m.time_spent_sec % 60}s
                          </div>
                        )}
                      </div>
                    )}

                    {!isExpanded && m.is_correct === false && m.answer && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Correct: {q.type === 'MCQ'
                            ? (q.answer_json as any)?.option?.toUpperCase() ?? '—'
                            : (q.answer_json as any)?.value ?? '—'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
