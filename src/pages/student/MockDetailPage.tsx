import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Clock, Award, ListChecks, Play, ChevronLeft, AlertCircle, Monitor, CheckCircle2, ShieldCheck, Hash, Trophy, Users, Medal, TrendingUp } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { useMockTest, useMockTestQuestionCount, useMockTestSections } from '@/lib/queries';
import { examStart } from '@/lib/exam-api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { PaletteSymbol } from '@/components/exam/PaletteSymbol';
import { QUESTION_STATES, STATE_ORDER, toPaletteStatus } from '@/exam/questionStates';

interface MockLeaderboardRow {
  user_id: string;
  handle: string;
  score: number;
  total_marks: number;
  percentage: number;
  percentile: number;
  rank: number;
  cohort_size: number;
}

export function MockDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: mock, isLoading, isError, refetch } = useMockTest(id);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: questionCount } = useMockTestQuestionCount(id);
  const { data: sections } = useMockTestSections(id);

  const { data: leaderboard, isLoading: lbLoading } = useQuery<MockLeaderboardRow[]>({
    queryKey: ['mock-leaderboard', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.rpc('get_mock_leaderboard', {
        p_mock_test_id: id,
        p_limit: 50,
      });
      if (error) throw error;
      return (data || []) as MockLeaderboardRow[];
    },
    enabled: !!id,
  });

  const myRank = leaderboard?.find((r) => r.user_id === user?.id);

  const handleStart = async () => {
    setError(null);
    setStarting(true);

    if (!mock || !user) {
      setStarting(false);
      return;
    }

    const result = await examStart(mock.id);
    setStarting(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    if (result.attempt_id) {
      navigate(`/exam/${result.attempt_id}`);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-96 w-full max-w-2xl" />
      </StudentLayout>
    );
  }

  if (isError || !mock) {
    return (
      <StudentLayout>
        <ErrorState title={t('mocks.loadError')} action={<Button variant="outline" size="sm" onClick={() => refetch()}>{t('common.loading')}</Button>} />
      </StudentLayout>
    );
  }

  const markingScheme = mock.marking_scheme as Record<string, Record<string, number>>;

  const modeLabel = mock.mode === 'EXAM' ? t('mocks.examMode') : t('mocks.practiceMode');

  const paletteLegend = STATE_ORDER.map((state) => ({
    state,
    label: QUESTION_STATES[state].label,
  }));

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <button
          onClick={() => navigate('/mocks')}
          className="flex items-center gap-1 text-sm text-navy-500 transition-colors hover:text-navy-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('mocks.backToMocks')}
        </button>

        {/* Header card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-govt-800 to-govt-700 p-6 text-white">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">{mock.category}</span>
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">{modeLabel}</span>
              {mock.access === 'FREE' ? (
                <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold">{t('mocks.free')}</span>
              ) : (
                <span className="rounded-full bg-saffron-500 px-3 py-0.5 text-xs font-bold">{t('mocks.premium')}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{mock.title}</h1>
            <p className="mt-1 text-sm text-govt-200">{t('mocks.ntaPattern')}</p>
          </div>

          <CardContent className="space-y-4 p-6 sm:space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-center">
                <Clock className="mx-auto mb-2 h-6 w-6 text-govt-600" />
                <div className="text-2xl font-bold text-navy-900 tabular-nums">{mock.duration_min}</div>
                <div className="text-xs text-navy-500">{t('mocks.minutes')}</div>
              </div>
              <div className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-center">
                <Award className="mx-auto mb-2 h-6 w-6 text-govt-600" />
                <div className="text-2xl font-bold text-navy-900 tabular-nums">{mock.total_marks}</div>
                <div className="text-xs text-navy-500">{t('mocks.marks')}</div>
              </div>
              <div className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-center">
                <ListChecks className="mx-auto mb-2 h-6 w-6 text-govt-600" />
                <div className="text-2xl font-bold text-navy-900">{questionCount !== null ? questionCount : '—'}</div>
                <div className="text-xs text-navy-500">{t('mocks.questions')}</div>
              </div>
            </div>

            {/* Section breakdown */}
            {sections && sections.total > 0 && (
              <div className="rounded-xl border border-navy-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-govt-600" />
                  <h3 className="text-sm font-semibold text-navy-900">{t('mocks.sectionsTitle')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-govt-200 bg-govt-50 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-govt-600">{t('mocks.sectionA')}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-navy-900">{sections.mcq}</span>
                      <span className="text-xs text-navy-400">{t('mocks.mcqQuestions')}</span>
                    </div>
                    <p className="mt-1 text-xs text-navy-500">{t('mocks.sectionADesc')}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">{t('mocks.sectionB')}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-navy-900">{sections.numerical}</span>
                      <span className="text-xs text-navy-400">{t('mocks.numericalQuestions')}</span>
                    </div>
                    <p className="mt-1 text-xs text-navy-500">{t('mocks.sectionBDesc')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* NTA interface info */}
            <div className="rounded-xl border border-govt-200 bg-govt-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-govt-600" />
                <h3 className="text-sm font-semibold text-navy-900">{t('mocks.ntaInterfaceTitle')}</h3>
              </div>
              <p className="mb-3 text-sm text-navy-600">{t('mocks.ntaInterfaceDesc')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {paletteLegend.map((p) => (
                  <div key={p.state} className="flex items-center gap-1.5 text-xs text-navy-600">
                    <PaletteSymbol status={toPaletteStatus(p.state)} number={0} size="sm" />
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Marking scheme */}
            <div className="rounded-lg border border-navy-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-900">{t('mocks.markingScheme')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="text-navy-600">MCQ {t('mocks.correct')}</span>
                  <span className="font-bold text-emerald-700">+{markingScheme?.mcq?.correct ?? 4}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-navy-600">MCQ {t('mocks.wrong')}</span>
                  <span className="font-bold text-red-700">{markingScheme?.mcq?.wrong ?? -1}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="text-navy-600">{t('mocks.numerical')} {t('mocks.correct')}</span>
                  <span className="font-bold text-emerald-700">+{markingScheme?.numerical?.correct ?? 4}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-navy-600">{t('mocks.numerical')} {t('mocks.wrong')}</span>
                  <span className="font-bold text-red-700">{markingScheme?.numerical?.wrong ?? -1}</span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-lg border border-navy-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-900">{t('mocks.rules')}</h3>
              <ul className="space-y-2 text-sm text-navy-600">
                {[t('mocks.rule1'), t('mocks.rule2'), t('mocks.rule3'), t('mocks.rule4')].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-govt-500" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-navy-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('mocks.serverGraded')}
            </div>

            {/* National Leaderboard */}
            {leaderboard && leaderboard.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-navy-900">National Leaderboard</h3>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-navy-500">
                    <Users className="h-3.5 w-3.5" />
                    {leaderboard[0]?.cohort_size} participants
                  </span>
                </div>

                {myRank && (
                  <div className="mb-3 flex items-center gap-4 rounded-lg border-2 border-govt-300 bg-govt-50 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-govt-700 text-white">
                      <span className="text-lg font-bold">#{myRank.rank}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy-900">Your Rank</p>
                      <p className="text-xs text-navy-500">
                        Score: {Math.round(myRank.score)}/{myRank.total_marks} · Percentile: {myRank.percentile.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-navy-400">Top {(100 - myRank.percentile).toFixed(1)}%</p>
                      <TrendingUp className="ml-auto h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {lbLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    leaderboard.slice(0, 10).map((row, idx) => {
                      const isYou = row.user_id === user?.id;
                      return (
                        <div
                          key={row.user_id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg p-2.5',
                            isYou ? 'border-2 border-govt-300 bg-govt-50' : idx < 3 ? 'bg-white' : 'bg-white/60',
                          )}
                        >
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                            row.rank === 1 ? 'bg-amber-100 text-amber-700'
                            : row.rank === 2 ? 'bg-neutral-200 text-neutral-700'
                            : row.rank === 3 ? 'bg-orange-100 text-orange-700'
                            : 'bg-navy-100 text-navy-500',
                          )}>
                            {row.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-navy-900">
                              {row.handle}
                              {isYou && <span className="ml-2 text-xs text-govt-600">(You)</span>}
                            </p>
                            <p className="text-xs text-navy-400">
                              {row.percentile.toFixed(1)}%ile
                            </p>
                          </div>
                          {idx < 3 && (
                            <Medal className={cn(
                              'h-4 w-4',
                              row.rank === 1 ? 'text-amber-500' : row.rank === 2 ? 'text-neutral-400' : 'text-orange-500',
                            )} />
                          )}
                          <span className="text-sm font-bold text-navy-900 tabular-nums">
                            {Math.round(row.score)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Start button */}
            <Button variant="primary" size="lg" fullWidth loading={starting} onClick={handleStart}>
              <Play className="h-5 w-5" />
              {t('mocks.startMock')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
