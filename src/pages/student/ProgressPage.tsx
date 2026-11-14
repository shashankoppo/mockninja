import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Award, TrendingUp, TrendingDown, Minus, Target, BookOpen } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt } from '@/components/common/Belt';

interface MasteryRow {
  chapter_id: number;
  belt: string;
  score: number;
  evidence_count: number;
  latest_answer_at: string | null;
}

interface ChapterInfo {
  id: number;
  name: string;
  subject_id: number;
  subject: { name: string };
}

const BELT_ORDER = ['UNRATED', 'WHITE', 'YELLOW', 'GREEN', 'BLUE', 'BROWN', 'BLACK'];

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'border-govt-500 bg-govt-50',
  Chemistry: 'border-emerald-500 bg-emerald-50',
  Mathematics: 'border-saffron-500 bg-saffron-50',
  Maths: 'border-saffron-500 bg-saffron-50',
};

export function ProgressPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: mastery, isLoading: masteryLoading } = useQuery({
    queryKey: ['mastery', user?.id],
    queryFn: async () => {
      if (!user) return [] as MasteryRow[];
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, evidence_count, latest_answer_at')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as MasteryRow[];
    },
    enabled: !!user,
  });

  const { data: chapters } = useQuery({
    queryKey: ['chapters-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id, subject:subject_id ( name )')
        .order('subject_id')
        .order('ordinal');
      if (error) throw error;
      return (data || []) as unknown as ChapterInfo[];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ['progress-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test_id, mock_test:mock_test_id ( title, total_marks )')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const masteryMap = new Map<number, MasteryRow>();
  for (const m of mastery || []) masteryMap.set(m.chapter_id, m);

  const subjects: Record<string, { chapters: { chapter: ChapterInfo; mastery: MasteryRow | undefined }[] }> = {};
  for (const ch of chapters || []) {
    const subjName = ch.subject.name;
    if (!subjects[subjName]) subjects[subjName] = { chapters: [] };
    subjects[subjName].chapters.push({ chapter: ch, mastery: masteryMap.get(ch.id) });
  }

  const sortedAttempts = [...(attempts || [])].reverse();
  const trendData = sortedAttempts.map((a) => {
    const mt = a.mock_test as { title?: string; total_marks?: number };
    const pct = mt?.total_marks ? ((a.score ?? 0) / mt.total_marks) * 100 : 0;
    return { id: a.id, pct, title: mt?.title || '', date: a.submitted_at, score: a.score ?? 0, total: mt?.total_marks ?? 0 };
  });
  const lastScore = trendData.length > 0 ? trendData[trendData.length - 1].pct : 0;
  const firstScore = trendData.length > 1 ? trendData[0].pct : lastScore;
  const trendDiff = lastScore - firstScore;

  const ratedChapters = (mastery || []).filter((m) => m.belt !== 'UNRATED');
  const sortedByScore = [...ratedChapters].sort((a, b) => b.score - a.score);
  const strengths = sortedByScore.slice(0, 5);
  const weaknesses = [...sortedByScore].reverse().slice(0, 5);

  const chapterName = (id: number) => chapters?.find((c) => c.id === id)?.name || `#${id}`;

  // SVG line chart
  const chartW = 600;
  const chartH = 160;
  const padding = 20;
  const maxPct = 100;
  const points = trendData.map((d, i) => {
    const x = padding + (trendData.length > 1 ? (i / (trendData.length - 1)) * (chartW - 2 * padding) : 0);
    const y = chartH - padding - (d.pct / maxPct) * (chartH - 2 * padding);
    return { x, y, pct: d.pct, label: d.title };
  });
  const pathD = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartH - padding} L ${points[0].x} ${chartH - padding} Z`
    : '';

  // Overall mastery ring
  const avgMastery = ratedChapters.length > 0
    ? Math.round(ratedChapters.reduce((s, m) => s + m.score, 0) / ratedChapters.length)
    : 0;
  const ringR = 32;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc - (avgMastery / 100) * ringCirc;

  if (masteryLoading) {
    return (
      <StudentLayout>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('progress.title')}</h1>
          <p className="text-sm text-navy-500">{t('progress.desc')}</p>
        </div>

        {/* Summary stats with mastery ring */}
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardContent className="flex flex-col items-center justify-center p-5">
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" role="img" aria-label={`Average mastery ${avgMastery}%`}>
                <circle cx="40" cy="40" r={ringR} fill="none" stroke="#E2E8F0" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r={ringR} fill="none"
                  stroke={avgMastery >= 70 ? '#158808' : avgMastery >= 40 ? '#F59E0B' : '#DC2626'}
                  strokeWidth="6" strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-1000"
                />
              </svg>
              <p className="mt-2 text-2xl font-bold text-navy-900">{avgMastery}%</p>
              <p className="text-xs text-navy-500">{t('progress.avgMastery')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-navy-500">{t('progress.lastScore')}</p>
                <p className="text-2xl font-bold text-navy-900">{Math.round(lastScore)}%</p>
              </div>
              {trendData.length > 1 && (
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  trendDiff > 0 ? 'text-emerald-600' : trendDiff < 0 ? 'text-red-600' : 'text-navy-400',
                )}>
                  {trendDiff > 0 ? <TrendingUp className="h-4 w-4" /> : trendDiff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  {trendDiff > 0 ? '+' : ''}{Math.round(trendDiff)}%
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-50 text-govt-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-navy-500">{t('progress.mocksTaken')}</p>
                <p className="text-2xl font-bold text-navy-900">{attempts?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-navy-500">{t('progress.ratedChapters')}</p>
                <p className="text-2xl font-bold text-navy-900">{ratedChapters.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score trend SVG chart */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('progress.scoreTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((v) => {
                  const y = chartH - padding - (v / maxPct) * (chartH - 2 * padding);
                  return (
                    <g key={v}>
                      <line x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                      <text x={4} y={y + 4} fill="#94A3B8" fontSize="10">{v}%</text>
                    </g>
                  );
                })}
                {/* Area */}
                {areaD && <path d={areaD} fill="url(#trendArea)" />}
                {/* Line */}
                {pathD && <path d={pathD} fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
                {/* Points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#1E40AF" stroke="white" strokeWidth="2">
                      <title>{p.label} — {Math.round(p.pct)}%</title>
                    </circle>
                    <text x={p.x} y={p.y - 10} fill="#334155" fontSize="9" textAnchor="middle" className="font-bold">
                      {Math.round(p.pct)}%
                    </text>
                  </g>
                ))}
              </svg>
              {trendData.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
                  {trendData.map((d, i) => (
                    <span key={d.id} className="text-xs text-navy-400">
                      #{i + 1}: {d.date ? new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'} · {d.title.length > 20 ? d.title.slice(0, 20) + '…' : d.title}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Strengths & weaknesses */}
        {ratedChapters.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  {t('progress.strengths')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {strengths.map((m, i) => (
                    <div key={m.chapter_id} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                        <span className="truncate text-sm font-medium text-navy-700">{chapterName(m.chapter_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-700">{Math.round(m.score)}%</span>
                        <Belt level={m.belt} size="xs" showLabel />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  {t('progress.weaknesses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weaknesses.map((m, i) => (
                    <div key={m.chapter_id} className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/50 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{i + 1}</span>
                        <span className="truncate text-sm font-medium text-navy-700">{chapterName(m.chapter_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-700">{Math.round(m.score)}%</span>
                        <Belt level={m.belt} size="xs" showLabel />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mastery belt matrix */}
        {Object.keys(subjects).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-govt-600" />
                {t('progress.beltMatrix')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {BELT_ORDER.map((belt) => (
                  <Belt key={belt} level={belt} size="xs" showLabel />
                ))}
              </div>
              <div className="space-y-5">
                {Object.entries(subjects).map(([subjName, { chapters: chs }]) => (
                  <div key={subjName}>
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-navy-700">{subjName}</h4>
                      <span className="text-xs text-navy-400">({chs.filter(c => c.mastery).length}/{chs.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {chs.map(({ chapter, mastery: m }) => {
                        const subjColor = SUBJECT_COLORS[subjName] || 'border-navy-200 bg-white';
                        return (
                          <div
                            key={chapter.id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border-l-4 p-3 transition-shadow hover:shadow-sm',
                              m ? subjColor : 'border-navy-200 bg-white',
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-navy-700">{chapter.name}</p>
                              {m ? (
                                <p className="text-xs text-navy-400">{Math.round(m.score)}% · {m.evidence_count} {t('progress.questions')}</p>
                              ) : (
                                <p className="text-xs text-navy-300">{t('progress.noData')}</p>
                              )}
                            </div>
                            <Belt level={m?.belt || 'UNRATED'} size="xs" showLabel />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title={t('progress.noData')} description={t('progress.noDataDesc')} />
        )}
      </div>
    </StudentLayout>
  );
}
