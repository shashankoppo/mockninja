import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, ChevronRight, Search, Layers, BookOpen, Zap, Award, Target, ChevronDown } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { usePublishedMocks } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const CATEGORY_ICONS: Record<string, typeof Layers> = {
  'FULL_SYLLABUS': Layers,
  'SUBJECT_TEST': BookOpen,
  'CHAPTER_TEST': Zap,
};

const CATEGORY_LABELS: Record<string, string> = {
  'FULL_SYLLABUS': 'Full Syllabus',
  'SUBJECT_TEST': 'Subject Test',
  'CHAPTER_TEST': 'Chapter Test',
};

const MODE_LABELS: Record<string, string> = {
  'PRACTICE': 'Practice',
  'EXAM': 'Exam Mode',
};

export function MocksPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showChapterPractice, setShowChapterPractice] = useState(false);

  const { data: mocks, isLoading, isError, refetch } = usePublishedMocks();

  const { data: chapters } = useQuery({
    queryKey: ['chapters-practice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject:subject_id ( id, name )')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (mocks || []).filter((m) => {
    if (category && m.category !== category) return false;
    if (!search) return true;
    return m.title.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const order: Record<string, number> = { 'FULL_SYLLABUS': 0, 'SUBJECT_TEST': 1, 'CHAPTER_TEST': 2 };
    return (order[a.category] ?? 3) - (order[b.category] ?? 3);
  });

  const categoryCounts: Record<string, number> = {};
  (mocks || []).forEach((m) => {
    const cat = m.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryList = Object.keys(categoryCounts).sort();

  const modeStyles: Record<string, { label: string; color: string }> = {
    PRACTICE: { label: MODE_LABELS.PRACTICE, color: 'bg-sky-500/20 text-sky-300' },
    EXAM: { label: MODE_LABELS.EXAM, color: 'bg-govt-500/20 text-govt-300' },
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('mocks.title')}</h1>
          <p className="text-sm text-navy-400">{t('mocks.desc')}</p>
        </div>

        {/* Chapterwise Practice Section */}
        <div className="rounded-xl border border-white/10 bg-[#11121c] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-govt-500/20 text-govt-300">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Chapterwise Practice</h2>
                <p className="text-xs text-navy-400">Focus on specific chapters with targeted practice tests</p>
              </div>
            </div>
            <button
              onClick={() => setShowChapterPractice((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-govt-300 transition-colors hover:bg-white/5"
            >
              {showChapterPractice ? 'Hide' : 'Explore'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', showChapterPractice && 'rotate-180')} />
            </button>
          </div>

          {showChapterPractice && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(chapters || []).slice(0, 18).map((ch) => {
                const subjectName = (ch.subject as { name?: string })?.name || 'Other';
                const subjectColor: Record<string, string> = {
                  Physics: 'bg-sky-500/20 text-sky-300 border-sky-500/20',
                  Chemistry: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
                  Mathematics: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
                  Maths: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
                };
                return (
                  <Link
                    key={ch.id}
                    to="/mocks"
                    onClick={() => setCategory('CHAPTER_TEST')}
                    className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20"
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
                      subjectColor[subjectName] || 'bg-white/10 text-navy-300 border-white/10',
                    )}>
                      {subjectName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white group-hover:text-govt-300">{ch.name}</p>
                      <p className="text-2xs text-navy-500">{subjectName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-navy-500 transition-transform group-hover:translate-x-0.5 group-hover:text-govt-300" />
                  </Link>
                );
              })}
              {chapters && chapters.length === 0 && (
                <p className="col-span-full py-4 text-center text-sm text-navy-500">No chapters available yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filter sidebar */}
          <aside className="lg:w-56 lg:shrink-0">
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#11121c] p-4">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">{t('mocks.categories')}</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setCategory('')}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                      !category ? 'bg-govt-500/20 font-medium text-govt-300' : 'text-navy-300 hover:bg-white/5',
                    )}
                  >
                    <span>{t('mocks.allCategories')}</span>
                    <span className="text-xs text-navy-500">{mocks?.length ?? 0}</span>
                  </button>
                  {categoryList.map((cat) => {
                    const count = categoryCounts[cat];
                    const Icon = CATEGORY_ICONS[cat] || FileText;
                    const label = CATEGORY_LABELS[cat] || cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                          category === cat ? 'bg-govt-500/20 font-medium text-govt-300' : 'text-navy-300 hover:bg-white/5',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                        <span className="text-xs text-navy-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
              <input
                type="text"
                placeholder={t('mocks.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
              />
            </div>

            {/* Mock cards */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 w-full" />)}
              </div>
            ) : isError ? (
              <ErrorState title={t('mocks.loadError')} action={<Button variant="outline" size="sm" onClick={() => refetch()}>{t('common.loading')}</Button>} />
            ) : filtered.length === 0 ? (
              <EmptyState title={t('mocks.noMocks')} description={t('mocks.noMocksDesc')} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((m) => {
                  const isFree = m.access === 'FREE';
                  const markingScheme = m.marking_scheme as { mcq?: { correct?: number; wrong?: number }; numerical?: { correct?: number; wrong?: number } } | undefined;
                  const modeKey = (m.mode || 'PRACTICE').toUpperCase();
                  const mode = modeStyles[modeKey] || modeStyles.PRACTICE;
                  return (
                    <Card key={m.id} className="group flex flex-col overflow-hidden border-white/10 bg-[#11121c] transition-colors hover:border-white/20">
                      <CardContent className="flex flex-1 flex-col p-0">
                        {/* Card top section */}
                        <div className="border-b border-white/10 p-5">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="neutral" className="text-xs">{CATEGORY_LABELS[m.category] || m.category}</Badge>
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', mode.color)}>
                                {mode.label}
                              </span>
                            </div>
                            {isFree ? (
                              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white">{t('mocks.free')}</span>
                            ) : (
                              <span className="rounded-full bg-govt-500 px-2.5 py-0.5 text-xs font-bold text-white">{t('mocks.premium')}</span>
                            )}
                          </div>

                          <h3 className="mb-1 font-semibold leading-snug text-white group-hover:text-govt-300">{m.title}</h3>
                          <p className="text-xs text-navy-400">{t('mocks.ntaPattern')}</p>
                        </div>

                        {/* Card meta section */}
                        <div className="flex-1 p-5">
                          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                            <div className="rounded-lg bg-white/5 py-2">
                              <Clock className="mx-auto mb-1 h-4 w-4 text-navy-400" />
                              <div className="text-sm font-bold text-white">{m.duration_min}</div>
                              <div className="text-2xs text-navy-400">{t('mocks.min')}</div>
                            </div>
                            <div className="rounded-lg bg-white/5 py-2">
                              <FileText className="mx-auto mb-1 h-4 w-4 text-navy-400" />
                              <div className="text-sm font-bold text-white">{m.question_count}</div>
                              <div className="text-2xs text-navy-400">{t('mocks.questions')}</div>
                            </div>
                            <div className="rounded-lg bg-white/5 py-2">
                              <Award className="mx-auto mb-1 h-4 w-4 text-navy-400" />
                              <div className="text-sm font-bold text-white">{m.total_marks}</div>
                              <div className="text-2xs text-navy-400">{t('mocks.marks')}</div>
                            </div>
                          </div>

                          {markingScheme?.mcq && (
                            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-navy-400">
                              <span>MCQ: <span className="text-emerald-300">+{markingScheme.mcq.correct ?? 4}</span> / <span className="text-red-400">{markingScheme.mcq.wrong ?? -1}</span></span>
                              {markingScheme?.numerical && (
                                <span className="text-navy-600">|</span>
                              )}
                              {markingScheme?.numerical && (
                                <span>Num: <span className="text-emerald-300">+{markingScheme.numerical.correct ?? 4}</span> / <span className="text-red-400">{markingScheme.numerical.wrong ?? -1}</span></span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* CTA */}
                        <div className="border-t border-white/10 p-3">
                          <Link to={`/mocks/${m.id}`}>
                            <Button variant="outline" fullWidth className="group-hover:border-govt-400 group-hover:text-govt-300">
                              {t('mocks.viewDetails')}
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
