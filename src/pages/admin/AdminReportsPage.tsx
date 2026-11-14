import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, FileQuestion, Award, Activity, Clock } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ReportStats {
  totalAttempts: number;
  totalStudents: number;
  totalQuestions: number;
  publishedQuestions: number;
  avgScore: number;
  recentAttempts: { id: string; score: number; total_marks: number; title: string; submitted_at: string; student_name: string }[];
  difficultyBreakdown: { difficulty: string; count: number }[];
  subjectPerformance: { subject: string; avgPct: number; attemptCount: number }[];
  dailyAttempts: { date: string; count: number }[];
}

export function AdminReportsPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery<ReportStats>({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const [attempts, students, questions, publishedQ] = await Promise.all([
        supabase.from('attempts').select('id, score, submitted_at, mock_test_id, user_id', { count: 'exact' }).eq('status', 'SUBMITTED').order('submitted_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('review_status', 'PUBLISHED'),
      ]);

      const attemptData = attempts.data || [];
      const mockIds = [...new Set(attemptData.map((a) => a.mock_test_id))];
      const userIds = [...new Set(attemptData.map((a) => a.user_id))];

      const [mocks, profiles] = await Promise.all([
        mockIds.length > 0
          ? supabase.from('mock_tests').select('id, title, total_marks').in('id', mockIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const mockMap = new Map((mocks.data || []).map((m: { id: string; title: string; total_marks: number }) => [m.id, m]));
      const profileMap = new Map((profiles.data || []).map((p: { id: string; full_name: string | null }) => [p.id, p]));

      const recentAttempts = attemptData.slice(0, 10).map((a) => {
        const mt = mockMap.get(a.mock_test_id);
        const p = profileMap.get(a.user_id);
        return {
          id: a.id,
          score: a.score ?? 0,
          total_marks: mt?.total_marks ?? 0,
          title: mt?.title || 'Untitled',
          submitted_at: a.submitted_at || '',
          student_name: p?.full_name || 'Unknown',
        };
      });

      const avgScore = attemptData.length > 0
        ? attemptData.reduce((sum, a) => {
            const mt = mockMap.get(a.mock_test_id);
            const total = mt?.total_marks ?? 1;
            return sum + ((a.score ?? 0) / total) * 100;
          }, 0) / attemptData.length
        : 0;

      // Difficulty breakdown
      const { data: diffData } = await supabase
        .from('questions')
        .select('difficulty')
        .eq('review_status', 'PUBLISHED');

      const diffCounts: Record<string, number> = {};
      for (const q of diffData || []) {
        diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
      }
      const difficultyBreakdown = Object.entries(diffCounts).map(([difficulty, count]) => ({ difficulty, count }));

      // Subject performance from responses
      const { data: respData } = await supabase
        .from('responses')
        .select('is_correct, awarded_marks, question:question_id ( chapter:chapter_id ( subject:subject_id ( name ) ) )')
        .eq('is_correct', 'not.null');

      const subjStats: Record<string, { total: number; correct: number; marks: number }> = {};
      for (const r of respData || []) {
        const subjName = ((r.question as { chapter?: { subject?: { name?: string } } })?.chapter?.subject?.name) || 'Unknown';
        if (!subjStats[subjName]) subjStats[subjName] = { total: 0, correct: 0, marks: 0 };
        subjStats[subjName].total++;
        subjStats[subjName].marks += r.awarded_marks ?? 0;
        if (r.is_correct) subjStats[subjName].correct++;
      }
      const subjectPerformance = Object.entries(subjStats).map(([subject, s]) => ({
        subject,
        avgPct: s.total > 0 ? (s.correct / s.total) * 100 : 0,
        attemptCount: s.total,
      }));

      // Daily attempts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentAtt } = await supabase
        .from('attempts')
        .select('submitted_at')
        .eq('status', 'SUBMITTED')
        .gte('submitted_at', sevenDaysAgo.toISOString());

      const dayCounts: Record<string, number> = {};
      for (const a of recentAtt || []) {
        if (!a.submitted_at) continue;
        const day = new Date(a.submitted_at).toISOString().split('T')[0];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
      const dailyAttempts = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalAttempts: attempts.count ?? 0,
        totalStudents: students.count ?? 0,
        totalQuestions: questions.count ?? 0,
        publishedQuestions: publishedQ.count ?? 0,
        avgScore: Math.round(avgScore),
        recentAttempts,
        difficultyBreakdown,
        subjectPerformance,
        dailyAttempts,
      };
    },
  });

  const maxDailyCount = Math.max(...(stats?.dailyAttempts.map((d) => d.count) || [1]), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 govt-heading">{t('admin.reportsTitle')}</h1>
          <p className="text-sm text-navy-500">{t('admin.reportsDesc')}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-govt-100 text-govt-700">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-navy-900 govt-heading">{stats?.totalAttempts ?? 0}</p>
                    <p className="text-xs text-navy-500">{t('admin.statAttempts')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-india-100 text-india-700">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-navy-900 govt-heading">{stats?.avgScore ?? 0}%</p>
                    <p className="text-xs text-navy-500">{t('admin.avgScore')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-navy-900 govt-heading">{stats?.totalStudents ?? 0}</p>
                    <p className="text-xs text-navy-500">{t('admin.statStudents')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <FileQuestion className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-navy-900 govt-heading">{stats?.publishedQuestions ?? 0}</p>
                    <p className="text-xs text-navy-500">{t('admin.publishedQs')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily attempts chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg govt-heading">{t('admin.dailyAttempts')}</CardTitle>
                <CardDescription>{t('admin.dailyAttemptsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && stats.dailyAttempts.length > 0 ? (
                  <div className="flex items-end gap-3" style={{ height: '160px' }}>
                    {stats.dailyAttempts.map((d) => (
                      <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
                        <div
                          className="w-full rounded-t bg-govt-500 transition-[height,background-color] hover:bg-govt-600"
                          style={{ height: `${Math.max((d.count / maxDailyCount) * 100, 5)}%` }}
                        />
                        <div className="absolute -top-6 hidden whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-xs text-white group-hover:block">
                          {d.count} {t('admin.statAttempts')}
                        </div>
                        <span className="mt-2 text-xs text-navy-400">
                          {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-navy-400">{t('admin.noData')}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Subject performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg govt-heading">{t('admin.subjectPerformance')}</CardTitle>
                  <CardDescription>{t('admin.subjectPerformanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats && stats.subjectPerformance.length > 0 ? (
                    <div className="space-y-3">
                      {stats.subjectPerformance.map((s) => (
                        <div key={s.subject}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-navy-700">{s.subject}</span>
                            <span className="text-navy-500">{Math.round(s.avgPct)}% · {s.attemptCount} {t('admin.responses')}</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-navy-100">
                            <div
                              className={cn(
                                'h-full rounded-full transition-[width]',
                                s.avgPct >= 60 ? 'bg-india-500' : s.avgPct >= 35 ? 'bg-amber-500' : 'bg-red-500',
                              )}
                              style={{ width: `${Math.min(s.avgPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">{t('admin.noData')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Difficulty breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg govt-heading">{t('admin.difficultyBreakdown')}</CardTitle>
                  <CardDescription>{t('admin.difficultyBreakdownDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats && stats.difficultyBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {stats.difficultyBreakdown.map((d) => {
                        const total = stats.difficultyBreakdown.reduce((sum, x) => sum + x.count, 0);
                        const pct = total > 0 ? (d.count / total) * 100 : 0;
                        const colors: Record<string, string> = {
                          EASY: 'bg-emerald-500',
                          MEDIUM: 'bg-amber-500',
                          HARD: 'bg-red-500',
                        };
                        return (
                          <div key={d.difficulty}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium text-navy-700">{t(`admin.${d.difficulty.toLowerCase()}`)}</span>
                              <span className="text-navy-500">{d.count} {t('admin.questions')}</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-navy-100">
                              <div
                                className={cn('h-full rounded-full transition-[width]', colors[d.difficulty] || 'bg-navy-400')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">{t('admin.noData')}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent attempts table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg govt-heading">
                  <TrendingUp className="h-5 w-5 text-govt-600" />
                  {t('admin.recentAttempts')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && stats.recentAttempts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-200 text-left text-xs text-navy-500">
                          <th className="pb-2 pr-4 font-medium">{t('admin.student')}</th>
                          <th className="pb-2 pr-4 font-medium">{t('admin.mockTest')}</th>
                          <th className="pb-2 pr-4 font-medium">{t('admin.score')}</th>
                          <th className="pb-2 font-medium">{t('admin.submitted')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentAttempts.map((a) => {
                          const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
                          return (
                            <tr key={a.id} className="border-b border-navy-100 last:border-0">
                              <td className="py-3 pr-4 font-medium text-navy-700">{a.student_name}</td>
                              <td className="py-3 pr-4 text-navy-600">{a.title}</td>
                              <td className="py-3 pr-4">
                                <span className="font-bold text-navy-900">{a.score}</span>
                                <span className="text-navy-400"> / {a.total_marks}</span>
                                <Badge
                                  variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error'}
                                  className="ml-2 text-xs"
                                >
                                  {pct}%
                                </Badge>
                              </td>
                              <td className="py-3 text-navy-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-navy-400">{t('admin.noAttemptsYet')}</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
