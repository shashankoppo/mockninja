import { useState } from 'react';
import {
  Users, UserPlus, FileCheck, TrendingUp, Download, Loader2,
  BarChart3, Activity, Target, FileQuestion, AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type DateRange = 7 | 30 | 90;

interface DayPoint { date: string; count: number }
interface ScoreByType { category: string; avg_pct: number; attempt_count: number }
interface CompletionRow { status: string; count: number }
interface CoverageRow { subject: string; difficulty: string; count: number }
interface ReportRow { report_status: string; count: number }

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>(30);

  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ['analytics-signups', range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_signups_per_day', { p_days: range });
      if (error) throw error;
      return data as DayPoint[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeStudents, isLoading: activeLoading } = useQuery({
    queryKey: ['analytics-active', range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_active_students_per_day', { p_days: range });
      if (error) throw error;
      return data as DayPoint[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['analytics-attempts', range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_attempts_per_day', { p_days: range });
      if (error) throw error;
      return data as DayPoint[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: scoreByType, isLoading: scoreLoading } = useQuery({
    queryKey: ['analytics-score-type', range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_avg_score_by_type', { p_days: range });
      if (error) throw error;
      return data as ScoreByType[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: completion, isLoading: completionLoading } = useQuery({
    queryKey: ['analytics-completion', range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_completion_rate', { p_days: range });
      if (error) throw error;
      return data as CompletionRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: coverage, isLoading: coverageLoading } = useQuery({
    queryKey: ['analytics-coverage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_question_coverage');
      if (error) throw error;
      return data as CoverageRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_open_vs_resolved_reports');
      if (error) throw error;
      return data as ReportRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = signupsLoading || activeLoading || attemptsLoading || scoreLoading || completionLoading || coverageLoading || reportsLoading;

  const totalSignups = (signups ?? []).reduce((s, d) => s + d.count, 0);
  const totalActive = (activeStudents ?? []).reduce((s, d) => s + d.count, 0);
  const totalAttempts = (attempts ?? []).reduce((s, d) => s + d.count, 0);
  const maxSignup = Math.max(...(signups ?? []).map((d) => d.count), 1);
  const maxActive = Math.max(...(activeStudents ?? []).map((d) => d.count), 1);
  const maxAttempt = Math.max(...(attempts ?? []).map((d) => d.count), 1);

  const startedCount = (completion ?? []).filter((c) => c.status === 'IN_PROGRESS').reduce((s, c) => s + c.count, 0);
  const submittedCount = (completion ?? []).filter((c) => c.status === 'SUBMITTED').reduce((s, c) => s + c.count, 0);
  const completionRate = startedCount + submittedCount > 0 ? Math.round((submittedCount / (startedCount + submittedCount)) * 100) : 0;

  const exportCsv = (filename: string, rows: object[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MiniBarChart = ({ data, max, color, loading }: { data: DayPoint[]; max: number; color: string; loading: boolean }) => {
    if (loading) return <Skeleton className="h-32 w-full" />;
    if (data.length === 0) return <p className="py-8 text-center text-sm text-navy-400">No data</p>;
    const display = data.length > 60 ? data.filter((_, i) => i % Math.ceil(data.length / 60) === 0) : data;
    return (
      <div className="flex items-end gap-1" style={{ height: '120px' }}>
        {display.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className={cn('w-full rounded-t transition-all', color)}
              style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
            />
            <div className="absolute -top-6 hidden whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-xs text-white group-hover:block">
              {d.date}: {d.count}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Analytics</h1>
            <p className="text-sm text-navy-500">Aggregate platform metrics. No personal data.</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r as DateRange)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  range === r
                    ? 'border-govt-500 bg-govt-50 text-govt-700'
                    : 'border-navy-200 text-navy-500 hover:border-navy-300',
                )}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-india-100 text-india-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">{totalSignups}</div>
                <div className="text-xs text-navy-500">Sign-ups ({range}d)</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">{totalActive}</div>
                <div className="text-xs text-navy-500">Active students</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-100 text-govt-700">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">{totalAttempts}</div>
                <div className="text-xs text-navy-500">Attempts submitted</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">{completionRate}%</div>
                <div className="text-xs text-navy-500">Completion rate</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Daily charts */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-4 w-4 text-india-600" />
                    Sign-ups per day
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('signups.csv', signups ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={signups ?? []} max={maxSignup} color="bg-india-400" loading={signupsLoading} />
                  <p className="mt-2 text-xs text-navy-400">
                    Total: {totalSignups} new sign-ups in the last {range} days.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Active students per day
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('active-students.csv', activeStudents ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={activeStudents ?? []} max={maxActive} color="bg-emerald-400" loading={activeLoading} />
                  <p className="mt-2 text-xs text-navy-400">
                    Total: {totalActive} active student-days in the last {range} days.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCheck className="h-4 w-4 text-govt-600" />
                    Attempts submitted per day
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('attempts.csv', attempts ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={attempts ?? []} max={maxAttempt} color="bg-govt-400" loading={attemptsLoading} />
                  <p className="mt-2 text-xs text-navy-400">
                    Total: {totalAttempts} attempts submitted in the last {range} days.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Score by type + completion */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-govt-600" />
                    Average score by mock type
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('score-by-type.csv', scoreByType ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  {scoreByType && scoreByType.length > 0 ? (
                    <div className="space-y-3">
                      {scoreByType.map((s) => (
                        <div key={s.category}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-navy-700">{s.category}</span>
                            <span className="text-navy-500">{s.avg_pct}% · {s.attempt_count} attempts</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-navy-100">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                s.avg_pct >= 60 ? 'bg-emerald-500' : s.avg_pct >= 35 ? 'bg-amber-500' : 'bg-red-500',
                              )}
                              style={{ width: `${Math.min(s.avg_pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">No submitted attempts in this period.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-amber-600" />
                    Completion rate
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('completion.csv', completion ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  {completion && completion.length > 0 ? (
                    <div className="space-y-3">
                      {completion.map((c) => (
                        <div key={c.status} className="flex items-center justify-between rounded-lg border border-navy-200 bg-navy-50 px-4 py-2.5 text-sm">
                          <span className="font-medium text-navy-700">{c.status}</span>
                          <span className="font-bold text-navy-900">{c.count}</span>
                        </div>
                      ))}
                      <div className="rounded-lg border border-govt-300 bg-govt-50 px-4 py-3 text-sm">
                        <span className="font-semibold text-govt-800">Completion rate: {completionRate}%</span>
                        <span className="ml-2 text-navy-500">({submittedCount} submitted / {startedCount + submittedCount} started)</span>
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">No attempts in this period.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Question coverage + reports */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileQuestion className="h-4 w-4 text-navy-600" />
                    Question bank coverage
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('question-coverage.csv', coverage ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  {coverage && coverage.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-navy-200 text-left text-xs text-navy-500">
                            <th className="pb-2 pr-4">Subject</th>
                            <th className="pb-2 pr-4">Difficulty</th>
                            <th className="pb-2 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coverage.map((c) => (
                            <tr key={`${c.subject}-${c.difficulty}`} className="border-b border-navy-100 last:border-0">
                              <td className="py-2 pr-4 text-navy-700">{c.subject}</td>
                              <td className="py-2 pr-4 text-navy-500">{c.difficulty}</td>
                              <td className="py-2 text-right font-bold text-navy-900">{c.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">No published questions.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Open vs resolved reports
                  </CardTitle>
                  <button
                    onClick={() => exportCsv('reports.csv', reports ?? [])}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    <Download className="inline h-3 w-3" /> CSV
                  </button>
                </CardHeader>
                <CardContent>
                  {reports && reports.length > 0 ? (
                    <div className="space-y-2">
                      {reports.map((r) => (
                        <div key={r.report_status} className="flex items-center justify-between rounded-lg border border-navy-200 bg-navy-50 px-4 py-2.5 text-sm">
                          <span className="font-medium text-navy-700">{r.report_status || 'No status'}</span>
                          <span className="font-bold text-navy-900">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-navy-400">No question reports.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
