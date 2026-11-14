import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, Target, Gauge, BookOpen, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SubjectStat {
  subject: string;
  accuracy: number;
  avgTimePerQ: number;
  totalMarks: number;
  marksObtained: number;
  attempted: number;
  correct: number;
  wrong: number;
}

interface AttemptTrend {
  id: string;
  title: string;
  score: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  avgTimePerQ: number;
  submittedAt: string;
}

interface AnalyticsData {
  overallAccuracy: number;
  overallAvgTime: number;
  totalAttempts: number;
  bestPercentage: number;
  subjectStats: SubjectStat[];
  trend: AttemptTrend[];
}

export function PerformanceAnalytics() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['performance-analytics', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select(`
          id, score, started_at, submitted_at, mock_test_id,
          mock_test:mock_test_id ( id, title, total_marks )
        `)
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: true })
        .limit(20);

      if (aErr) throw aErr;
      const allAttempts = attempts || [];

      const attemptIds = allAttempts.map((a) => a.id);
      if (attemptIds.length === 0) {
        return {
          overallAccuracy: 0,
          overallAvgTime: 0,
          totalAttempts: 0,
          bestPercentage: 0,
          subjectStats: [],
          trend: [],
        };
      }

      const { data: responses, error: rErr } = await supabase
        .from('responses')
        .select(`
          is_correct, awarded_marks, time_spent_sec, question_id,
          question:question_id ( chapter:chapter_id ( subject:subject_id ( name ) ) )
        `)
        .in('attempt_id', attemptIds);

      if (rErr) throw rErr;
      const allResponses = responses || [];

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalTime = 0;
      let totalQs = 0;
      let bestPct = 0;

      const subjMap: Record<string, { correct: number; wrong: number; time: number; marks: number; totalMarks: number; attempted: number }> = {};

      for (const r of allResponses) {
        const q = r.question as unknown as { chapter: { subject: { name: string } } } | null;
        const subjName = q?.chapter?.subject?.name || 'Unknown';
        if (!subjMap[subjName]) {
          subjMap[subjName] = { correct: 0, wrong: 0, time: 0, marks: 0, totalMarks: 0, attempted: 0 };
        }
        const s = subjMap[subjName];
        s.attempted++;
        s.time += r.time_spent_sec || 0;
        s.marks += Number(r.awarded_marks || 0);
        if (r.is_correct === true) { s.correct++; totalCorrect++; }
        if (r.is_correct === false) { s.wrong++; totalWrong++; }
        totalTime += r.time_spent_sec || 0;
        totalQs++;
      }

      const subjectStats: SubjectStat[] = Object.entries(subjMap).map(([subject, s]) => ({
        subject,
        accuracy: s.correct + s.wrong > 0 ? Math.round((s.correct / (s.correct + s.wrong)) * 100) : 0,
        avgTimePerQ: s.attempted > 0 ? Math.round(s.time / s.attempted) : 0,
        totalMarks: 0,
        marksObtained: Math.round(s.marks),
        attempted: s.attempted,
        correct: s.correct,
        wrong: s.wrong,
      }));

      const trend: AttemptTrend[] = allAttempts.map((a) => {
        const mt = a.mock_test as { title?: string; total_marks?: number } | null;
        const totalMarks = mt?.total_marks ?? 0;
        const score = Number(a.score ?? 0);
        const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
        if (pct > bestPct) bestPct = pct;

        return {
          id: a.id,
          title: mt?.title || 'Mock Test',
          score,
          totalMarks,
          percentage: pct,
          accuracy: 0,
          avgTimePerQ: 0,
          submittedAt: a.submitted_at || a.started_at,
        };
      });

      return {
        overallAccuracy: totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0,
        overallAvgTime: totalQs > 0 ? Math.round(totalTime / totalQs) : 0,
        totalAttempts: allAttempts.length,
        bestPercentage: bestPct,
        subjectStats,
        trend,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Target className="h-10 w-10 text-navy-500" />
          <p className="text-sm font-medium text-navy-200">No analytics yet</p>
          <p className="max-w-sm text-xs text-navy-400">Take a mock test to see your accuracy, speed, and subject-wise trends here.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const summaryCards = [
    { icon: Target, label: 'Overall Accuracy', value: `${data.overallAccuracy}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { icon: Gauge, label: 'Avg Speed / Question', value: formatDuration(data.overallAvgTime), color: 'text-govt-400', bg: 'bg-govt-500/20' },
    { icon: TrendingUp, label: 'Best Score', value: `${data.bestPercentage}%`, color: 'text-saffron-400', bg: 'bg-saffron-500/20' },
    { icon: BookOpen, label: 'Total Attempts', value: String(data.totalAttempts), color: 'text-india-400', bg: 'bg-india-500/20' },
  ];

  const maxPct = 100;
  const sparkPath = data.trend.length > 1
    ? data.trend.map((t, i) => {
        const x = (i / (data.trend.length - 1)) * 100;
        const y = 100 - (t.percentage / maxPct) * 100;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', s.bg)}>
                  <Icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-white tabular-nums">{s.value}</div>
                  <div className="truncate text-xs text-navy-400">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score trend sparkline */}
      {data.trend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <TrendingUp className="h-4 w-4 text-govt-400" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-32 w-full">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(6,182,212,0.25)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0)" />
                  </linearGradient>
                </defs>
                <path
                  d={`${sparkPath} L 100 100 L 0 100 Z`}
                  fill="url(#trendGrad)"
                  stroke="none"
                />
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.trend.map((t) => {
                  const i = data.trend.indexOf(t);
                  const x = (i / (data.trend.length - 1)) * 100;
                  const y = 100 - (t.percentage / maxPct) * 100;
                  return (
                    <circle
                      key={t.id}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill={t.percentage >= 70 ? '#34d399' : t.percentage >= 40 ? '#fbbf24' : '#f87171'}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-navy-400">
              <span>{data.trend[0].title.slice(0, 20)}</span>
              <span>{data.trend[data.trend.length - 1].title.slice(0, 20)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject-wise breakdown */}
      {data.subjectStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Award className="h-4 w-4 text-govt-400" />
              Subject-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.subjectStats.map((s) => {
                const accColor = s.accuracy >= 70 ? 'text-emerald-400' : s.accuracy >= 40 ? 'text-amber-400' : 'text-red-400';
                const barColor = s.accuracy >= 70 ? 'bg-emerald-500' : s.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500';
                const speedColor = s.avgTimePerQ <= 60 ? 'text-emerald-400' : s.avgTimePerQ <= 120 ? 'text-amber-400' : 'text-red-400';
                return (
                  <div key={s.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{s.subject}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={cn('font-bold', accColor)}>{s.accuracy}% accuracy</span>
                        <span className={cn('flex items-center gap-1 font-medium', speedColor)}>
                          <Clock className="h-3 w-3" />
                          {formatDuration(s.avgTimePerQ)}/Q
                        </span>
                        <span className={cn('font-bold', s.marksObtained >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {s.marksObtained > 0 ? '+' : ''}{s.marksObtained} marks
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn('h-full rounded-full transition-[width]', barColor)}
                        style={{ width: `${s.accuracy}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-navy-400">
                      <span>{s.correct} correct</span>
                      <span>{s.wrong} wrong</span>
                      <span>{s.attempted} attempted</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent attempts list */}
      {data.trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-govt-400" />
              Recent Attempt Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.trend.slice().reverse().slice(0, 6).map((t) => {
                const pctColor = t.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-300' : t.percentage >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300';
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-200">{t.title}</p>
                      <p className="text-xs text-navy-400">
                        {new Date(t.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white tabular-nums">
                        {t.score} / {t.totalMarks}
                      </span>
                      <span className={cn('flex h-9 w-12 items-center justify-center rounded-lg text-xs font-bold', pctColor)}>
                        {t.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
