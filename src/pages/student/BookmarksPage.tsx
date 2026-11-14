import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bookmark, Trash2, Search, ChevronRight, SlidersHorizontal, BookOpen, CheckCircle2, Target } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Math as MathTex } from '@/components/Math';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface BookmarkWithQuestion {
  id: string;
  question_id: string;
  note: string | null;
  created_at: string;
  question: {
    id: string;
    type: string;
    difficulty: string;
    statement_tex: string;
    options_json: { id: string; text: string }[] | null;
    answer_json: Record<string, unknown> | null;
    solution_tex: string | null;
    chapter: { id: number; name: string; subject_id: number; subject: { name: string } };
  };
}

export function BookmarksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const { data: bookmarks, isLoading } = useQuery<BookmarkWithQuestion[]>({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('question_bookmarks')
        .select(`
          id, question_id, note, created_at,
          question:question_id (
            id, type, difficulty, statement_tex, options_json, answer_json,
            solution_tex,
            chapter:chapter_id (
              id, name, subject_id,
              subject:subject_id ( name )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as BookmarkWithQuestion[];
    },
    enabled: !!user,
  });

  const handleRemove = async (bookmarkId: string, questionId: string) => {
    const { error } = await supabase
      .from('question_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (error) {
      toast.error('Failed to remove bookmark');
      return;
    }

    toast.success('Bookmark removed');
    queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['bookmark-status'] });
  };

  const subjects = [...new Set((bookmarks || []).map((b) => b.question?.chapter?.subject?.name).filter(Boolean))] as string[];
  const savedStats = {
    total: bookmarks?.length ?? 0,
    withSolutions: (bookmarks || []).filter((bookmark) => Boolean(bookmark.question?.solution_tex)).length,
    hard: (bookmarks || []).filter((bookmark) => bookmark.question?.difficulty === 'HARD').length,
  };

  const filtered = (bookmarks || [])
    .filter((b) => {
      const q = b.question;
      if (!q) return false;
      if (subjectFilter !== 'all' && q.chapter?.subject?.name !== subjectFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (!search) return true;
      return (
        q.statement_tex.toLowerCase().includes(search.toLowerCase()) ||
        (q.chapter?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.chapter?.subject?.name || '').toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => sortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const difficultyColors: Record<string, string> = {
    EASY: 'bg-emerald-500/20 text-emerald-300',
    MEDIUM: 'bg-amber-500/20 text-amber-300',
    HARD: 'bg-red-500/20 text-red-300',
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11121c] shadow-card">
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-govt-300">
                <Bookmark className="h-3.5 w-3.5" /> Your personal revision bank
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Saved Questions</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-300">Keep important questions close, revisit the complete solution, and build a focused revision habit from the questions you choose.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-navy-200">
              <Target className="h-5 w-5 text-govt-300" />
              <span><strong className="text-white">{filtered.length}</strong> ready to review</span>
            </div>
          </div>
          <div className="grid grid-cols-1 border-t border-white/10 bg-white/5 sm:grid-cols-3">
            <SavedStat icon={Bookmark} label="Saved" value={savedStats.total} />
            <SavedStat icon={CheckCircle2} label="With solutions" value={savedStats.withSolutions} tone="success" />
            <SavedStat icon={BookOpen} label="Hard questions" value={savedStats.hard} tone="warning" />
          </div>
        </section>

        {/* Search and filters */}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search by question text, chapter, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-navy-400" />
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-navy-200">
            <option value="all">All subjects</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-navy-200">
            <option value="all">All levels</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-navy-200">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching bookmarks' : 'No bookmarks yet'}
            description={search ? 'Try a different search term.' : 'Bookmark questions during mock tests by clicking the bookmark button. They will appear here for quick review.'}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const q = b.question;
              if (!q) return null;
              const isExpanded = expandedId === b.id;
              const correctOpt = (q.answer_json as { option?: string } | null)?.option;
              const correctVal = (q.answer_json as { value?: number } | null)?.value;
              return (
                <Card key={b.id} className="border-white/10 bg-[#11121c] transition-shadow hover:shadow-card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral" className="text-xs">{q.chapter?.subject?.name || 'Unknown'}</Badge>
                          <Badge variant="neutral" className={cn('text-xs', difficultyColors[q.difficulty] || 'bg-white/10 text-navy-300')}>
                            {q.difficulty}
                          </Badge>
                          <span className="text-xs text-navy-400">{q.type}</span>
                          <span className="text-xs text-navy-400">{q.chapter?.name}</span>
                        </div>
                        <div className={cn('text-sm text-navy-200', !isExpanded && 'line-clamp-2')}>
                          <MathTex>{q.statement_tex}</MathTex>
                        </div>
                        {b.note && (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-navy-300">
                            <span className="font-semibold text-white">Note: </span>{b.note}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : b.id)}
                          className="rounded-lg p-2 text-navy-300 hover:bg-white/10"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                          aria-expanded={isExpanded}
                        >
                          <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                        </button>
                        <button
                          onClick={() => handleRemove(b.id, q.id)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                        {q.type === 'MCQ' && q.options_json && (
                          <div className="space-y-1.5">
                            {q.options_json.map((opt) => {
                              const isCorrect = opt.id === correctOpt;
                              return (
                                <div
                                  key={opt.id}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm',
                                    isCorrect ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5',
                                  )}
                                >
                                  <span className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold',
                                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/10 text-navy-300',
                                  )}>
                                    {opt.id.toUpperCase()}
                                  </span>
                                  <MathTex>{opt.text}</MathTex>
                                  {isCorrect && <span className="ml-auto text-xs font-medium text-emerald-300">Correct</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.type === 'NUMERICAL' && (
                          <div className="rounded-lg border-2 border-emerald-400/40 bg-emerald-500/10 p-3 text-sm">
                            <span className="text-xs font-medium text-emerald-300">Correct Answer: </span>
                            <span className="font-bold text-emerald-200">{correctVal ?? '—'}</span>
                          </div>
                        )}
                        {q.solution_tex && (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="mb-1 text-xs font-semibold text-govt-300">Solution</div>
                            <div className="text-sm text-navy-200">
                              <MathTex display>{q.solution_tex}</MathTex>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-navy-400">Bookmarked on {new Date(b.created_at).toLocaleDateString()}</p>
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

function SavedStat({ icon: Icon, label, value, tone = 'default' }: { icon: typeof Bookmark; label: string; value: number; tone?: 'default' | 'success' | 'warning' }) {
  const toneClass = tone === 'success' ? 'bg-emerald-500/15 text-emerald-300' : tone === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-govt-500/15 text-govt-300';
  return (
    <div className="flex items-center gap-3 border-r border-white/10 p-4 last:border-r-0 sm:p-5">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneClass)}><Icon className="h-4 w-4" /></div>
      <div><p className="text-xl font-bold text-white">{value}</p><p className="text-2xs text-navy-400">{label}</p></div>
    </div>
  );
}
