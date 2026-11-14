import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Flame, Clock, FileText, Play, Calendar, Loader2, AlertCircle,
  CheckCircle2, Zap, Target, TrendingUp, Sparkles, ChevronRight, Search,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { dailyMockGenerate, type DailyMockDifficulty } from '@/lib/exam-api';
import { cn } from '@/lib/utils';

interface MockTestInfo {
  id: string;
  title: string;
  duration_min: number;
  total_marks: number;
}

const DIFFICULTY_OPTIONS: { key: DailyMockDifficulty; label: string }[] = [
  { key: 'ANY', label: 'Mixed' },
  { key: 'EASY', label: 'Easy' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HARD', label: 'Hard' },
];

interface DailyMockRow {
  mock_test_id: string;
  for_date: string;
  mock_test: MockTestInfo | MockTestInfo[] | null;
}

export function DppStudentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [difficulty, setDifficulty] = useState<DailyMockDifficulty>('ANY');

  const { data: todayMock, isLoading } = useQuery<DailyMockRow | null>({
    queryKey: ['dpp-today', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('user_daily_mocks')
        .select(`
          mock_test_id, for_date,
          mock_test:mock_test_id(id, title, duration_min, total_marks)
        `)
        .eq('user_id', user.id)
        .eq('for_date', today)
        .maybeSingle();
      return data as DailyMockRow | null;
    },
    enabled: !!user,
  });

  const { data: history, isLoading: historyLoading } = useQuery<DailyMockRow[]>({
    queryKey: ['dpp-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_daily_mocks')
        .select(`
          mock_test_id, for_date,
          mock_test:mock_test_id(id, title, duration_min, total_marks)
        `)
        .eq('user_id', user.id)
        .order('for_date', { ascending: false })
        .limit(14);
      return (data || []) as DailyMockRow[];
    },
    enabled: !!user,
  });

  const { data: streak } = useQuery<number>({
    queryKey: ['dpp-streak', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('user_daily_mocks')
        .select('for_date')
        .eq('user_id', user.id)
        .order('for_date', { ascending: false })
        .limit(60);
      if (!data || data.length === 0) return 0;
      const dates = new Set(data.map((row) => row.for_date));
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (!dates.has(todayKey) && !dates.has(yesterday)) return 0;
      let count = 0;
      const cursor = new Date(dates.has(todayKey) ? todayKey : yesterday);
      while (dates.has(cursor.toISOString().split('T')[0])) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return count;
    },
    enabled: !!user,
  });

  const { data: weeklyCount } = useQuery<number>({
    queryKey: ['dpp-weekly-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { count } = await supabase
        .from('user_daily_mocks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('for_date', weekAgo);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleStart = async () => {
    setError(null);
    if (todayMock?.mock_test_id) {
      navigate(`/mocks/${todayMock.mock_test_id}`);
      return;
    }
    setGenerating(true);
    const result = await dailyMockGenerate(difficulty);
    setGenerating(false);
    if ('error' in result) {
      setError(result.error);
    } else if (!result.mock_test_id) {
      setError('Attempt a few mocks first so we can find the chapters that need the most practice.');
    } else {
      navigate(`/mocks/${result.mock_test_id}`);
    }
  };

  const getMockInfo = (row: DailyMockRow | null | undefined): MockTestInfo | null => {
    if (!row?.mock_test) return null;
    const mt = row.mock_test;
    return Array.isArray(mt) ? mt[0] : mt;
  };

  const todayMockData = getMockInfo(todayMock);
  const hasToday = !!todayMock?.mock_test_id;

  const filteredHistory = (history || []).filter((h) => {
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      if (new Date(h.for_date) < cutoff) return false;
    }
    if (historySearch) {
      const mock = getMockInfo(h);
      const title = mock?.title || 'Daily Practice';
      if (!title.toLowerCase().includes(historySearch.toLowerCase()) && !h.for_date.includes(historySearch)) return false;
    }
    return true;
  });

  const stats = [
    { icon: Flame, label: 'Current Streak', value: `${streak ?? 0}`, suffix: 'days', color: 'text-amber-300', bg: 'bg-amber-500/20', ring: 'ring-amber-500/20' },
    { icon: Calendar, label: 'This Week', value: `${weeklyCount ?? 0}`, suffix: 'sets', color: 'text-govt-300', bg: 'bg-govt-500/20', ring: 'ring-govt-500/20' },
    { icon: Target, label: 'Total Sets', value: `${history?.length ?? 0}`, suffix: 'all-time', color: 'text-emerald-300', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/20' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('dpp.title')}</h1>
            <p className="text-sm text-navy-400">{t('dpp.desc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" className="w-fit">
              <Flame className="mr-1 h-3.5 w-3.5" />
              {streak ?? 0} day streak
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => navigate('/dpp/custom')}>
              Build custom test
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Today's DPP — hero card */}
        <Card className={cn(
          'relative overflow-hidden border-white/10 bg-[#11121c] transition-colors duration-500',
        )}>
          {hasToday && <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />}
          {!hasToday && <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-govt-500/10 blur-3xl" />}
          <CardContent className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500',
                hasToday ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-govt-500 shadow-govt-500/20',
              )}>
                {hasToday ? <CheckCircle2 className="h-8 w-8" /> : <Flame className="h-8 w-8" />}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-govt-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-govt-300">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {hasToday ? "Today's DPP is ready" : t('dpp.todaySet')}
                </h2>
                <p className="mt-1 text-sm text-navy-300">
                  {hasToday && todayMockData?.title
                    ? todayMockData.title
                    : 'Generate a personalized practice set across Physics, Chemistry, and Maths'}
                </p>
                {!hasToday && (
                  <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Difficulty">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={difficulty === opt.key}
                        disabled={generating}
                        onClick={() => setDifficulty(opt.key)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                          difficulty === opt.key ? 'bg-govt-500/20 text-govt-300' : 'bg-white/5 text-navy-400 hover:bg-white/10',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {hasToday && todayMockData && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-navy-400">
                    <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-medium">
                      <FileText className="h-3.5 w-3.5" /> {t('dpp.questions')}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-medium">
                      <Clock className="h-3.5 w-3.5" /> {todayMockData.duration_min} {t('dpp.minutes')}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-medium">
                      <Target className="h-3.5 w-3.5" /> {todayMockData.total_marks} marks
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={handleStart} disabled={generating || isLoading} className="shrink-0">
              {generating ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</>
              ) : (
                <><Play className="h-5 w-5" /> {hasToday ? 'Continue' : t('dpp.startDate')}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="border-white/10 bg-white/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-300', s.bg, s.ring)}>
                    <Icon className={cn('h-5 w-5', s.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
                    <p className="text-xs text-navy-400">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Why DPP works — info card */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            {[
              { icon: Zap, title: 'Daily consistency', desc: 'Short, focused sets keep your prep momentum alive every day.' },
              { icon: Target, title: 'Targeted practice', desc: 'Questions drawn from your weakest chapters based on real performance.' },
              { icon: TrendingUp, title: 'Track progress', desc: 'Your streak and weekly count show exactly how consistent you are.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-govt-500/20 text-govt-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-navy-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Previous sets */}
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-400">{t('dpp.previousSets')}</h2>
            {(history || []).length > 0 && (
              <span className="text-xs text-navy-500">{filteredHistory.length} of {history?.length} shown</span>
            )}
          </div>

          {(history || []).length > 0 && !historyLoading && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex gap-1.5">
                {([
                  { key: 'all', label: 'All' },
                  { key: '7d', label: 'Last 7 days' },
                  { key: '30d', label: 'Last 30 days' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setDateFilter(opt.key)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      dateFilter === opt.key ? 'bg-govt-500/20 text-govt-300' : 'bg-white/5 text-navy-400 hover:bg-white/10',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative sm:ml-auto sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
                <input
                  type="text"
                  placeholder="Search by title or date..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
                />
              </div>
            </div>
          )}

          {historyLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (history || []).length === 0 ? (
            <Card className="border-dashed border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-navy-500">
                  <Calendar className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-300">{t('dpp.noSets')}</p>
                  <p className="mt-1 text-xs text-navy-500">Generate your first set above to get started.</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredHistory.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-navy-500">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-300">No sets match your search</p>
                  <p className="mt-1 text-xs text-navy-500">Try a different keyword or time range.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setHistorySearch(''); setDateFilter('all'); }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredHistory.map((h, i) => {
                const mock = getMockInfo(h);
                return (
                  <Card
                    key={i}
                    className="group cursor-pointer border-white/10 bg-[#11121c] transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-white/20"
                    onClick={() => navigate(`/mocks/${h.mock_test_id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/20 text-govt-300 transition-transform duration-300 group-hover:scale-110">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{mock?.title || 'Daily Practice'}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {h.for_date}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {mock?.duration_min ?? 30} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-govt-500/20 px-2.5 py-1 text-xs font-bold text-govt-300">
                          {mock?.total_marks ?? 60} marks
                        </span>
                        <ChevronRight className="h-4 w-4 text-navy-500 transition-transform group-hover:translate-x-1 group-hover:text-govt-300" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
