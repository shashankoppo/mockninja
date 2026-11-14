import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, Calculator, Video, Lock, Search, ExternalLink, Layers, TrendingUp, ChevronRight } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const DIFFICULTY_FILTERS = [
  { key: 'all', label: 'All Levels' },
  { key: 'EASY', label: 'Easy' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HARD', label: 'Hard' },
] as const;

export function ResourcesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['resources-chapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id, class_level, subject:subject_id(name)')
        .order('subject_id')
        .order('ordinal');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: questionCounts } = useQuery({
    queryKey: ['resources-question-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('chapter_id, difficulty')
        .eq('review_status', 'PUBLISHED');
      if (error) throw error;
      const counts: Record<number, { total: number; easy: number; medium: number; hard: number }> = {};
      for (const q of data || []) {
        const cid = q.chapter_id as number;
        if (!counts[cid]) counts[cid] = { total: 0, easy: 0, medium: 0, hard: 0 };
        counts[cid].total++;
        if (q.difficulty === 'EASY') counts[cid].easy++;
        else if (q.difficulty === 'MEDIUM') counts[cid].medium++;
        else if (q.difficulty === 'HARD') counts[cid].hard++;
      }
      return counts;
    },
  });

  const { data: mastery } = useQuery({
    queryKey: ['resources-mastery', user?.id],
    queryFn: async () => {
      if (!user) return new Map<number, number>();
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, score')
        .eq('user_id', user.id);
      if (error) throw error;
      return new Map((data || []).map((m) => [m.chapter_id as number, m.score as number]));
    },
    enabled: !!user,
  });

  const subjects = [...new Set((chapters || []).map((c: any) => (c.subject as any)?.name || 'Other'))];

  const filtered = (chapters || []).filter((c: any) => {
    const subjName = (c.subject as any)?.name || 'Other';
    if (subjectFilter !== 'all' && subjName !== subjectFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resourceTypes = [
    { icon: FileText, label: 'Notes', color: 'bg-govt-500/20 text-govt-300', free: true },
    { icon: Calculator, label: 'Formulas', color: 'bg-emerald-500/20 text-emerald-300', free: true },
    { icon: BookOpen, label: 'Examples', color: 'bg-govt-500/20 text-govt-300', free: true },
    { icon: Video, label: 'Videos', color: 'bg-saffron-500/20 text-saffron-300', free: false },
  ];

  const totalQuestions = Object.values(questionCounts || {}).reduce((s, c) => s + c.total, 0);

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('resourcesTitle' as string) || 'Study Resources'}</h1>
          <p className="text-sm text-navy-300">{t('resourcesDesc' as string) || 'Notes, formula sheets, and learning materials by chapter.'}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/20">
                <Layers className="h-5 w-5 text-govt-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(chapters || []).length}</p>
                <p className="text-xs text-navy-400">Chapters</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <FileText className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalQuestions}</p>
                <p className="text-xs text-navy-400">Questions</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/20">
                <BookOpen className="h-5 w-5 text-govt-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{subjects.length}</p>
                <p className="text-xs text-navy-400">Subjects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resource type cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resourceTypes.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="rounded-xl border border-white/10 bg-[#11121c] p-4 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', r.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {!r.free && <Badge variant="warning"><Lock className="h-3 w-3" /> Premium</Badge>}
                </div>
                <p className="mt-2 text-sm font-medium text-white">{r.label}</p>
                <p className="text-xs text-navy-400">{r.free ? 'Practice companion' : 'Video lessons coming soon'}</p>
              </div>
            );
          })}
        </div>

        {/* Chapter-linked resources */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">By Chapter</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubjectFilter('all')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                subjectFilter === 'all' ? 'bg-govt-400 text-[#11121c]' : 'bg-white/5 text-navy-300 hover:bg-white/10',
              )}
            >
              All
            </button>
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  subjectFilter === s ? 'bg-govt-400 text-[#11121c]' : 'bg-white/5 text-navy-300 hover:bg-white/10',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty filter + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_FILTERS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficultyFilter(d.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  difficultyFilter === d.key ? 'bg-govt-500 text-white' : 'bg-white/5 border border-white/10 text-navy-300 hover:bg-white/10',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
            <input
              type="text"
              placeholder="Search chapters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#11121c] py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-navy-500" />
            <p className="text-navy-400">No chapters found.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c: any) => {
              const subjName = (c.subject as any)?.name || 'Other';
              const counts = (questionCounts as Record<number, { total: number; easy: number; medium: number; hard: number }> | undefined)?.[c.id];
              const score = (mastery as Map<number, number> | undefined)?.get(c.id);
              const hasProgress = score != null && score > 0;

              const difficultyCounts = counts
                ? [
                    { label: 'Easy', count: counts.easy, color: 'bg-emerald-500/20 text-emerald-300' },
                    { label: 'Med', count: counts.medium, color: 'bg-amber-500/20 text-amber-300' },
                    { label: 'Hard', count: counts.hard, color: 'bg-red-500/20 text-red-300' },
                  ].filter((d) => {
                    if (difficultyFilter === 'all') return true;
                    if (difficultyFilter === 'EASY') return d.label === 'Easy';
                    if (difficultyFilter === 'MEDIUM') return d.label === 'Med';
                    if (difficultyFilter === 'HARD') return d.label === 'Hard';
                    return true;
                  })
                : [];

              if (difficultyFilter !== 'all' && counts) {
                const filteredCount = difficultyFilter === 'EASY' ? counts.easy : difficultyFilter === 'MEDIUM' ? counts.medium : difficultyFilter === 'HARD' ? counts.hard : 0;
                if (filteredCount === 0) return null;
              }

              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-[#11121c] p-4 transition-colors hover:border-white/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="neutral" className="mb-2">{subjName}</Badge>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="mt-0.5 text-xs text-navy-400">Class {c.class_level}</p>
                    </div>
                    {counts && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{counts.total}</p>
                        <p className="text-2xs text-navy-400">questions</p>
                      </div>
                    )}
                  </div>

                  {/* Mastery progress bar */}
                  {hasProgress && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-2xs">
                        <span className="flex items-center gap-1 text-navy-400">
                          <TrendingUp className="h-3 w-3" /> Your mastery
                        </span>
                        <span className="font-semibold text-govt-300">{Math.round(score!)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-govt-500" style={{ width: `${Math.min(100, score!)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Difficulty breakdown */}
                  {counts && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {difficultyCounts.map((d) => (
                        <span key={d.label} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-2xs', d.color)}>
                          {d.label}: {d.count}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {resourceTypes.filter((r) => r.free).map((r) => {
                      const Icon = r.icon;
                      return (
                        <span key={r.label} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs', r.color)}>
                          <Icon className="h-3 w-3" />
                          {r.label}
                        </span>
                      );
                    })}
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-navy-400">
                      <Lock className="h-3 w-3" />
                      Videos
                    </span>
                  </div>
                  <Link to={`/mocks?chapter=${c.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-govt-400/10 px-3 py-2 text-xs font-semibold text-govt-300 transition-colors hover:bg-govt-400/20">
                    Practice this chapter <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
