import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useChapters } from '@/lib/queries';
import { cn } from '@/lib/utils';

type Difficulty = 'ANY' | 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'ANY', label: 'Mixed' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

const COUNT_OPTIONS = [5, 10, 15, 20, 25, 30];
const MAX_CHAPTERS = 30;

export function CustomPracticePage() {
  const navigate = useNavigate();
  const { data: chapters, isLoading, isError, refetch } = useChapters();
  const [selected, setSelected] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('ANY');
  const [count, setCount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, { id: number; name: string }[]>();
    for (const ch of chapters ?? []) {
      const key = ch.subject?.name ?? 'Other';
      const list = map.get(key) ?? [];
      list.push({ id: ch.id, name: ch.name });
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [chapters]);

  const toggleChapter = (id: number) => {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= MAX_CHAPTERS) return prev;
      return [...prev, id];
    });
  };

  const selectAll = () => {
    setError(null);
    const all = (chapters ?? []).map((ch) => ch.id).slice(0, MAX_CHAPTERS);
    setSelected(all);
  };

  const clearAll = () => {
    setError(null);
    setSelected([]);
  };

  const toggleSubject = (subjectName: string, ids: number[]) => {
    setError(null);
    setSelected((prev) => {
      const allIn = ids.every((id) => prev.includes(id));
      if (allIn) return prev.filter((c) => !ids.includes(c));
      const room = MAX_CHAPTERS - prev.length;
      const toAdd = ids.filter((id) => !prev.includes(id)).slice(0, room);
      return [...prev, ...toAdd];
    });
  };

  const toggleCollapse = (subjectName: string) => {
    setCollapsedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectName)) next.delete(subjectName);
      else next.add(subjectName);
      return next;
    });
  };

  const handleBuild = async () => {
    if (selected.length === 0) {
      setError('Select at least one chapter.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('build_custom_practice_test', {
      p_chapter_ids: selected,
      p_difficulty: difficulty,
      p_count: count,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || 'We could not build this practice test. Please try different settings.');
      return;
    }
    if (!data || typeof data !== 'string') {
      setError('We could not build this practice test. Please try different settings.');
      return;
    }
    navigate(`/mocks/${data}`);
  };

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <button
          type="button"
          onClick={() => navigate('/dpp')}
          className="inline-flex items-center gap-2 text-sm text-navy-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to daily practice
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Build a custom practice test</h1>
            <p className="text-sm text-navy-400">Choose chapters, difficulty and size. We pick fresh questions for you.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/dpp/custom/history')}>
            View your past tests
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card className="border-white/10 bg-[#11121c]">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">Chapters</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-navy-400">{selected.length} of {MAX_CHAPTERS} selected</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-medium text-govt-300 transition-colors hover:text-govt-200"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-navy-400 transition-colors hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {isError && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                <span>Chapters could not be loaded.</span>
                <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
              </div>
            )}

            {!isLoading && !isError && grouped.map(([subjectName, list]) => {
              const allSubjectIds = list.map((ch) => ch.id);
              const selectedInSubject = allSubjectIds.filter((id) => selected.includes(id));
              const isCollapsed = collapsedSubjects.has(subjectName);
              return (
                <div key={subjectName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(subjectName)}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-400 transition-colors hover:text-navy-200"
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {subjectName}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSubject(subjectName, allSubjectIds)}
                      className="text-xs font-medium text-govt-300 transition-colors hover:text-govt-200"
                    >
                      {selectedInSubject.length === allSubjectIds.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <span className="text-xs text-navy-500">({selectedInSubject.length}/{allSubjectIds.length})</span>
                  </div>
                  {!isCollapsed && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((ch) => {
                        const on = selected.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleChapter(ch.id)}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-200',
                              on
                                ? 'border-govt-400 bg-govt-500/15 text-white'
                                : 'border-white/10 bg-white/5 text-navy-200 hover:border-white/20 hover:bg-white/10',
                            )}
                          >
                            <span>{ch.name}</span>
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                on ? 'border-govt-400 bg-govt-500 text-white' : 'border-white/20',
                              )}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#11121c]">
          <CardContent className="space-y-4 p-6 sm:space-y-6">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-white">Difficulty</h2>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={difficulty === d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-colors duration-200',
                      difficulty === d.value
                        ? 'border-govt-400 bg-govt-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-navy-300 hover:bg-white/10',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-white">Number of questions</h2>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={count === n}
                    onClick={() => setCount(n)}
                    className={cn(
                      'min-w-14 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200',
                      count === n
                        ? 'border-govt-400 bg-govt-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-navy-300 hover:bg-white/10',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-navy-400">
                {selected.length === 0 ? 'Pick at least one chapter to continue.' : `${count} questions from ${selected.length} chapter${selected.length > 1 ? 's' : ''}`}
              </p>
              <Button
                onClick={handleBuild}
                loading={submitting}
                disabled={selected.length === 0 || submitting}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {submitting ? 'Building test' : 'Build and start test'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
