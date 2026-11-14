import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Award, ChevronRight, Target, Trophy, BookOpen } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt, beltProgress } from '@/components/common/Belt';
import { Link } from 'react-router-dom';

interface BeltDefinition {
  key: string;
  label: string;
  range: string;
  tile: string;
}

const BELTS: BeltDefinition[] = [
  { key: 'UNRATED', label: 'Unrated', range: 'No attempts yet', tile: 'border-navy-300 bg-white text-navy-700' },
  { key: 'WHITE', label: 'White', range: '0 to 14%', tile: 'border-navy-300 bg-white text-navy-800' },
  { key: 'YELLOW', label: 'Yellow', range: '15 to 34%', tile: 'border-saffron-500 bg-saffron-400 text-navy-900' },
  { key: 'GREEN', label: 'Green', range: '35 to 54%', tile: 'border-india-700 bg-india-600 text-white' },
  { key: 'BLUE', label: 'Blue', range: '55 to 74%', tile: 'border-govt-700 bg-govt-600 text-white' },
  { key: 'BROWN', label: 'Brown', range: '75 to 89%', tile: 'border-amber-900 bg-amber-700 text-white' },
  { key: 'BLACK', label: 'Black', range: '90% and above', tile: 'border-navy-950 bg-navy-900 text-white' },
];

const BELT_BY_KEY = Object.fromEntries(BELTS.map((belt) => [belt.key, belt]));

interface MasteryRow {
  chapter_id: number;
  belt: string;
  score: number;
  evidence_count: number;
  latest_answer_at: string | null;
  chapter: { id: number; name: string; subject_id: number; subject: { name: string } };
}

function beltFor(row: MasteryRow) {
  return BELT_BY_KEY[row.belt] ?? BELT_BY_KEY.UNRATED;
}

export function MasteryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [weakestFirst, setWeakestFirst] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mastery, isLoading } = useQuery({
    queryKey: ['mastery-scores', user?.id],
    queryFn: async () => {
      if (!user) return [] as MasteryRow[];
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, evidence_count, latest_answer_at, chapter:chapter_id(id, name, subject_id, subject:subject_id(name))')
        .eq('user_id', user.id)
        .order('chapter_id');
      if (error) throw error;
      return (data || []) as unknown as MasteryRow[];
    },
    enabled: !!user,
  });

  const summary = useMemo(() => {
    const rows = mastery || [];
    const rated = rows.filter((row) => row.belt !== 'UNRATED');
    const averageScore = rated.length
      ? Math.round(rated.reduce((sum, row) => sum + (row.score ?? 0), 0) / rated.length)
      : 0;
    return {
      total: rows.length,
      mastered: rows.filter((row) => ['BLUE', 'BROWN', 'BLACK'].includes(row.belt)).length,
      needsWork: rows.filter((row) => row.belt !== 'UNRATED' && (row.score ?? 0) < 35).length,
      averageScore,
    };
  }, [mastery]);

  const bySubject = (subjects || []).map((s) => ({
    ...s,
    chapters: (mastery || []).filter((m) => m.chapter.subject_id === s.id),
  }));
  const hasData = bySubject.some((s) => s.chapters.length > 0);

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('mastery.title' as string) || 'Chapter Mastery'}</h1>
          <p className="mt-1 text-sm text-navy-300">{t('mastery.desc' as string) || 'Track your belt progress across every chapter.'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={Trophy} label="Blue belt or higher" value={`${summary.mastered} of ${summary.total}`} />
          <SummaryTile icon={Target} label="Chapters needing practice" value={String(summary.needsWork)} />
          <SummaryTile icon={BookOpen} label="Average mastery" value={summary.total ? `${summary.averageScore}%` : '—'} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Belt guide</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-wrap items-stretch gap-2">
              {BELTS.map((belt, index) => (
                <li key={belt.key} className="flex items-center gap-2">
                  <div className="flex min-w-[96px] flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-2 text-center">
                    <Belt level={belt.key} size="sm" />
                    <span className="text-xs font-semibold text-white">{belt.label}</span>
                    <span className="text-2xs text-navy-300">{belt.range}</span>
                  </div>
                  {index < BELTS.length - 1 && <ChevronRight className="hidden h-4 w-4 text-navy-400 sm:block" />}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !hasData ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="mx-auto mb-3 h-12 w-12 text-navy-300" />
              <p className="font-medium text-white">No mastery data yet</p>
              <p className="mt-1 text-sm text-navy-300">Take a mock test to start building your mastery scores.</p>
              <Link to="/mocks" className="mt-4 inline-block">
                <Button variant="outline">{t('dashboard.browseMocks')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {bySubject.map((s) => {
              const chapters = [...s.chapters].sort((a, b) => weakestFirst
                ? (a.score ?? 0) - (b.score ?? 0)
                : a.chapter.name.localeCompare(b.chapter.name));
              return (
                <Card key={s.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">{s.name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setWeakestFirst((current) => !current)}>
                        {weakestFirst ? 'A–Z order' : 'Weakest first'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {chapters.map((m) => {
                        const belt = beltFor(m);
                        return (
                          <Link
                            key={m.chapter_id}
                            to={`/mocks?chapter=${m.chapter_id}`}
                            className="group rounded-lg border border-white/10 bg-white/5 p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-govt-400/50 hover:shadow-card"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <span className="text-sm font-semibold text-white group-hover:text-govt-300">{m.chapter.name}</span>
                              <Belt level={belt.key} size="xs" progress={m.belt === 'UNRATED' ? undefined : beltProgress(belt.key, m.score ?? 0)} evidenceCount={m.evidence_count} />
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-govt-500 transition-[width] duration-500"
                                style={{ width: `${Math.min(100, m.score ?? 0)}%` }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-navy-300">
                              <span>{belt.label} belt · {m.evidence_count} answered</span>
                              <span className="font-semibold text-white">{Math.round(m.score ?? 0)}%</span>
                            </div>
                          </Link>
                        );
                      })}
                      {chapters.length === 0 && (
                        <p className="col-span-full py-4 text-sm text-navy-300">No mastery data for this subject yet.</p>
                      )}
                    </div>
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

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-govt-500/15 text-govt-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-navy-300">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
