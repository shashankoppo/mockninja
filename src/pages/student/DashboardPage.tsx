import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Award, Play, TrendingUp, BookOpen, ChevronRight, Zap, Loader2,
  Target, Flame, Trophy, ChevronLeft, AlertCircle,
  Calendar, ClipboardList, NotebookPen, Bookmark, BarChart3,
  Atom, FlaskConical, Sigma, Sparkles, ArrowRight,
  CalendarCheck, Timer, Gauge, Lightbulb, Layers,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { TodayPanel } from '@/features/home/components/TodayPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Belt, beltForScore } from '@/components/common/Belt';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ScoreTrendChart, type ScorePoint } from '@/components/student/ScoreTrendChart';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SubjectMastery {
  subject_id: number;
  subject_name: string;
  avg_mastery: number;
  rated_chapters: number;
  total_chapters: number;
  belt: string;
}

interface StudyStreak {
  streak_days: number;
  last_active: string | null;
  total_attempts_this_week: number;
  daily_goal: number;
  goal_progress: number;
}

interface DashboardData {
  subjects: SubjectMastery[];
  streak: StudyStreak;
  totalChapters: number;
  totalQuestions: number;
}

const subjectIcons: Record<string, typeof Atom> = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Mathematics: Sigma,
};


export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['dashboard-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select(`
          id, status, score, started_at, submitted_at, mock_test_id,
          mock_test:mock_test_id ( id, title, duration_min, total_marks )
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const submitted = (attempts || []).filter((a) => a.status === 'SUBMITTED');
  const lastAttempt = submitted[0];

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return { totalAttempts: 0, avgScore: 0, bestScore: 0, totalQuestions: 0 };
      const { data, error } = await supabase
        .from('attempts')
        .select('score, mock_test:mock_test_id ( total_marks )')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED');
      if (error) throw error;
      const all = data || [];
      const totalAttempts = all.length;
      const scores = all.map((a) => {
        const tm = (a.mock_test as { total_marks?: number })?.total_marks ?? 1;
        return tm > 0 ? ((a.score ?? 0) / tm) * 100 : 0;
      });
      return {
        totalAttempts,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0,
        bestScore: scores.length > 0 ? Math.round(Math.max(...scores)) : 0,
        totalQuestions: 0,
      };
    },
    enabled: !!user,
  });

  const { data: wrongCount } = useQuery({
    queryKey: ['wrong-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from('responses')
        .select('question_id, attempt:attempt_id ( user_id, status )')
        .eq('is_correct', false)
        .eq('attempt.user_id', user.id)
        .eq('attempt.status', 'SUBMITTED');
      if (error) throw error;
      const uniqueQs = new Set((data || []).map((r: { question_id: string }) => r.question_id));
      return uniqueQs.size;
    },
    enabled: !!user,
  });

  const { data: dashboardData, isLoading: ddLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-overview', user?.id],
    queryFn: async () => {
      if (!user) return { subjects: [], streak: { streak_days: 0, last_active: null, total_attempts_this_week: 0, daily_goal: 1, goal_progress: 0 }, totalChapters: 0, totalQuestions: 0 };

      const { data: subjects } = await supabase.from('subjects').select('id, name').order('id');
      const { data: chapters } = await supabase.from('chapters').select('id, subject_id, name').order('subject_id');
      const { data: mastery } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, evidence_count')
        .eq('user_id', user.id);

      const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
      const chapterSubjectMap = new Map((chapters || []).map((c) => [c.id, c.subject_id]));
      const chapterCountBySubject = new Map<number, number>();
      (chapters || []).forEach((c) => {
        chapterCountBySubject.set(c.subject_id, (chapterCountBySubject.get(c.subject_id) || 0) + 1);
      });

      const subjAgg: Record<number, { total: number; count: number; scores: number[] }> = {};
      (mastery || []).forEach((m) => {
        const subjId = chapterSubjectMap.get(m.chapter_id);
        if (subjId === undefined) return;
        if (!subjAgg[subjId]) subjAgg[subjId] = { total: 0, count: 0, scores: [] };
        subjAgg[subjId].total += 1;
        subjAgg[subjId].count += 1;
        subjAgg[subjId].scores.push(m.score || 0);
      });

      const subjectMastery: SubjectMastery[] = (subjects || []).map((s) => {
        const agg = subjAgg[s.id];
        const rated = agg?.count || 0;
        const total = chapterCountBySubject.get(s.id) || 0;
        const avgMastery = agg && agg.scores.length > 0
          ? Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length)
          : 0;

        return {
          subject_id: s.id,
          subject_name: subjectMap.get(s.id) || s.name,
          avg_mastery: avgMastery,
          rated_chapters: rated,
          total_chapters: total,
          belt: beltForScore(avgMastery),
        };
      });

      const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('submitted_at')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(30);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAttempts = (recentAttempts || []).filter((a) =>
        a.submitted_at && new Date(a.submitted_at) >= weekAgo
      );

      let streak = 0;
      const today = new Date();
      const attemptDates = new Set(
        (recentAttempts || [])
          .filter((a) => a.submitted_at)
          .map((a) => new Date(a.submitted_at!).toLocaleDateString('en-CA'))
      );
      for (let i = 0; i < 365; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dStr = d.toLocaleDateString('en-CA');
        if (attemptDates.has(dStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'PUBLISHED');

      return {
        subjects: subjectMastery,
        streak: {
          streak_days: streak,
          last_active: recentAttempts?.[0]?.submitted_at || null,
          total_attempts_this_week: weekAttempts.length,
          daily_goal: 1,
          goal_progress: weekAttempts.length > 0 ? 1 : 0,
        },
        totalChapters: chapters?.length || 0,
        totalQuestions: totalQuestions || 0,
      };
    },
    enabled: !!user,
  });

  const { data: bookmarkCount } = useQuery({
    queryKey: ['bookmark-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('question_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: focusTopics } = useQuery({
    queryKey: ['focus-topics-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('student_focus_topics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: availableMocks } = useQuery({
    queryKey: ['dashboard-available-mocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, category, duration_min, total_marks, access')
        .eq('status', 'PUBLISHED')
        .eq('visibility', 'PUBLIC')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: scoreTrend, isLoading: trendLoading } = useQuery<ScorePoint[]>({
    queryKey: ['dashboard-score-trend', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test:mock_test_id(total_marks)')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).reverse().map((a) => {
        const total = (a.mock_test as { total_marks?: number } | null)?.total_marks ?? 0;
        return {
          id: a.id,
          pct: total > 0 ? Math.round(((a.score ?? 0) / total) * 100) : 0,
          label: new Date(a.submitted_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
    },
    enabled: !!user,
  });

  const { data: resumeAttempt } = useQuery({
    queryKey: ['dashboard-resume-attempt', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('attempts')
        .select('id, started_at, mock_test:mock_test_id ( title, duration_min, total_marks )')
        .eq('user_id', user.id)
        .eq('status', 'IN_PROGRESS')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const firstName = profile?.full_name?.split(' ')[0] || '';

  const statCards = [
    { icon: Trophy, label: t('dashboard.bestScore'), value: stats ? `${stats.bestScore}%` : '—', color: 'text-govt-300', bg: 'bg-govt-500/20', ring: 'ring-govt-500/20', delay: '0ms', trend: stats && stats.bestScore >= 70 ? 'strong' : 'steady' },
    { icon: TrendingUp, label: t('dashboard.avgScore'), value: stats ? `${stats.avgScore}%` : '—', color: 'text-emerald-300', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/20', delay: '70ms', trend: stats && stats.avgScore >= 50 ? 'up' : 'steady' },
    { icon: BookOpen, label: t('dashboard.totalMocks'), value: stats?.totalAttempts ?? 0, color: 'text-saffron-300', bg: 'bg-saffron-500/20', ring: 'ring-saffron-500/20', delay: '140ms', trend: 'steady' },
    { icon: Target, label: t('dashboard.focusCount'), value: wrongCount ?? 0, color: 'text-red-400', bg: 'bg-red-500/20', ring: 'ring-red-500/20', delay: '210ms', trend: 'steady' },
  ];

  const quickActions = [
    { icon: ClipboardList, label: 'Mock Tests', desc: 'Browse all tests', to: '/mocks', color: 'bg-govt-500/20 text-govt-300 ring-govt-500/20' },
    { icon: Flame, label: 'Daily Practice', desc: "Today's DPP set", to: '/dpp', color: 'bg-saffron-500/20 text-saffron-300 ring-saffron-500/20' },
    { icon: NotebookPen, label: 'Mistake Notebook', desc: 'Review mistakes', to: '/mistake-notebook', color: 'bg-amber-500/20 text-amber-300 ring-amber-500/20' },
    { icon: Bookmark, label: 'Bookmarks', desc: `${bookmarkCount ?? 0} saved`, to: '/bookmarks', color: 'bg-sky-500/20 text-sky-300 ring-sky-500/20' },
    { icon: BarChart3, label: 'Performance', desc: 'Track progress', to: '/progress', color: 'bg-sky-500/20 text-sky-300 ring-sky-500/20' },
    { icon: Award, label: 'Mastery', desc: 'Belt levels', to: '/mastery', color: 'bg-govt-500/20 text-govt-300 ring-govt-500/20' },
    { icon: Calendar, label: 'Study Plan', desc: 'Your schedule', to: '/study-plan', color: 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/20' },
    { icon: Trophy, label: 'Leaderboard', desc: 'See rankings', to: '/leaderboard', color: 'bg-orange-500/20 text-orange-300 ring-orange-500/20' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome banner with streak */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#11121c] via-[#161725] to-[#11121c] p-4 text-white shadow-lg sm:p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-saffron-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#7dd3fc]" />
                <span className="text-xs font-medium text-[#bae6fd]">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl font-bold govt-heading sm:text-2xl lg:text-3xl">
                {firstName ? `${t('dashboard.welcome')}, ${firstName}` : t('dashboard.title')}
              </h1>
              <p className="mt-1.5 text-sm text-[#bfdbfe]">{t('dashboard.desc')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[#f8fafc] backdrop-blur-sm">
                  <Flame className="h-4 w-4 shrink-0 text-[#fb923c]" />
                  <span className="text-sm font-semibold">{dashboardData?.streak.streak_days ?? 0} day streak</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[#f8fafc] backdrop-blur-sm">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-[#6ee7b7]" />
                  <span className="text-sm font-semibold">{dashboardData?.streak.total_attempts_this_week ?? 0} this week</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[#f8fafc] backdrop-blur-sm">
                  <Target className="h-4 w-4 shrink-0 text-[#7dd3fc]" />
                  <span className="text-sm font-semibold">{focusTopics ?? 0} focus topics</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
              <LinkButton to="/mocks" icon={Play} label="Start a Mock" primary />
              <LinkButton to="/dpp" icon={Zap} label="Daily Practice" />
            </div>
          </div>
        </div>

        {resumeAttempt?.started_at && (
          <Card className="overflow-hidden border-white/10 bg-[#11121c]">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-govt-500/20 text-govt-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-govt-300">Continue where you left off</p>
                  <h2 className="mt-1 text-base font-bold text-white">
                    {(resumeAttempt.mock_test as { title?: string } | null)?.title || t('dashboard.untitled')}
                  </h2>
                  <p className="mt-1 text-sm text-navy-300">
                    Started {new Date(resumeAttempt.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <Button variant="primary" className="shrink-0" onClick={() => navigate(`/exam/${resumeAttempt.id}`)}>
                <Play className="h-4 w-4" />
                {t('dashboard.resume')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="group animate-slide-up"
                style={{ animationDelay: s.delay, animationFillMode: 'both' }}
              >
                <Card className="relative overflow-hidden transition-[transform,box-shadow] duration-500 ease-out hover:shadow-card-hover hover:-translate-y-1 hover:ring-1 hover:ring-govt-200">
                  <CardContent className="flex items-center gap-2.5 p-3 sm:p-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 sm:h-11 sm:w-11', s.bg, s.ring)}>
                      <Icon className={cn('h-5 w-5', s.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-bold tracking-tight text-white tabular-nums transition-colors duration-300 group-hover:text-govt-300 sm:text-2xl">{s.value}</div>
                      <div className="truncate text-xs font-medium text-navy-400">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Score Trend Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-govt-300" />
                Score Trend
              </CardTitle>
              <CardDescription className="text-navy-400">Your score on each submitted mock, oldest to newest</CardDescription>
            </div>
            <Badge variant="neutral" className="hidden sm:flex">
              {scoreTrend ? `${scoreTrend.length} mock${scoreTrend.length === 1 ? '' : 's'}` : '—'}
            </Badge>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : scoreTrend && scoreTrend.length > 0 ? (
              <ScoreTrendChart points={scoreTrend} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="h-10 w-10 text-navy-600" />
                <p className="mt-2 text-sm font-medium text-navy-400">No scores yet</p>
                <p className="text-xs text-navy-500">Submit a mock test to start your score trend</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unified daily practice panel */}
        <TodayPanel compact />

        {/* Subject Mastery Overview */}
        {ddLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : dashboardData && dashboardData.subjects.length > 0 ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-govt-300" />
                  Subject Mastery
                </CardTitle>
                <CardDescription>Your progress across all three subjects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mastery')}>
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {dashboardData.subjects.map((s) => {
                  const Icon = subjectIcons[s.subject_name] || BookOpen;
                  return (
                    <div
                      key={s.subject_id}
                      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-[transform,border-color] duration-400 ease-out hover:border-white/20 hover:-translate-y-0.5"
                      onClick={() => navigate('/mastery')}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/20 text-govt-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Belt level={s.belt} size="sm" showLabel />
                      </div>
                      <h4 className="font-semibold text-white">{s.subject_name}</h4>
                      <div className="mt-2 flex items-center justify-between text-xs text-navy-400">
                        <span>{s.rated_chapters}/{s.total_chapters} chapters</span>
                        <span className="font-bold text-white">{s.avg_mastery}%</span>
                      </div>
                      <Progress
                        value={s.avg_mastery}
                        className="mt-2 h-1.5"
                        indicatorClassName={cn(
                          s.avg_mastery >= 75 ? 'bg-emerald-500' :
                          s.avg_mastery >= 50 ? 'bg-govt-500' :
                          s.avg_mastery >= 25 ? 'bg-amber-500' : 'bg-red-400'
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Actions Grid */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-navy-400">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.label}
                  className="group cursor-pointer transition-[transform,box-shadow] duration-400 ease-out hover:shadow-card-hover hover:-translate-y-1"
                  onClick={() => navigate(action.to)}
                >
                  <CardContent className="flex flex-col items-center gap-2.5 p-3 text-center sm:p-4">
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3', action.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white transition-colors duration-300 group-hover:text-govt-300">{action.label}</p>
                      <p className="text-xs text-navy-400">{action.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Resume in-progress + Available mocks */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              {/* Last score card */}
              <div className="lg:col-span-1">
                {lastAttempt ? (
                  <Card className="h-full overflow-hidden">
                    <CardHeader className="border-b border-navy-100 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-govt-300" />
                        {t('dashboard.lastScore')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                      <div className="space-y-3">
                        <p className="font-semibold text-white">
                          {(lastAttempt.mock_test as { title?: string })?.title}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white">{lastAttempt.score ?? 0}</span>
                          <span className="text-lg text-navy-400">/ {(lastAttempt.mock_test as { total_marks?: number })?.total_marks ?? 0}</span>
                        </div>
                        {lastAttempt.submitted_at && (
                          <p className="flex items-center gap-1.5 text-xs text-navy-400">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(lastAttempt.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                        <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/results/${lastAttempt.id}`)}>
                          {t('dashboard.viewResults')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState
                    title={t('dashboard.noAttempts')}
                    description={t('dashboard.noAttemptsDesc')}
                    action={<Button variant="primary" size="sm" onClick={() => navigate('/mocks')}>Browse mocks</Button>}
                  />
                )}
              </div>

              {/* Available mocks */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="flex-row items-center justify-between border-b border-navy-100 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-govt-300" />
                      Recommended Tests
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/mocks')}>
                      View all <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3">
                    {availableMocks && availableMocks.length > 0 ? (
                      <div className="space-y-2">
                        {availableMocks.map((m) => (
                          <div
                            key={m.id}
                            className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20"
                            onClick={() => navigate(`/mocks/${m.id}`)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{m.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-400">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration_min}min</span>
                                <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {m.total_marks} marks</span>
                                <Badge variant={m.access === 'FREE' ? 'success' : 'warning'}>
                                  {m.access === 'FREE' ? 'Free' : 'Premium'}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-navy-400 transition-transform group-hover:translate-x-1 group-hover:text-govt-300" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-navy-300" />
                        <p className="mt-2 text-sm text-navy-400">No tests available yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent attempts */}
            {submitted.length > 1 && (
              <Card className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between border-b border-navy-100 pb-3">
                  <CardTitle className="text-lg">{t('dashboard.recentAttempts')}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}>
                    Full history <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-3 sm:p-5">
                  <div className="space-y-2">
                    {submitted.slice(0, 5).map((a) => {
                      const mt = a.mock_test as { title?: string; total_marks?: number };
                      const pct = mt?.total_marks ? Math.round(((a.score ?? 0) / mt.total_marks) * 100) : 0;
                      const pctColor = pct >= 70 ? 'bg-emerald-100 text-emerald-700'
                        : pct >= 40 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700';
                      return (
                        <div
                          key={a.id}
                          className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 sm:p-3 transition-colors hover:border-white/20"
                          onClick={() => navigate(`/results/${a.id}`)}
                        >
                          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-10 sm:w-10',
                              pctColor,
                            )}>
                              {pct}%
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium text-white">{mt?.title}</span>
                              {a.submitted_at && (
                                <p className="text-xs text-navy-400">
                                  {new Date(a.submitted_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <span className="font-bold text-white tabular-nums text-sm sm:text-base">
                              {a.score ?? 0} / {mt?.total_marks ?? 0}
                            </span>
                            <ChevronRight className="h-4 w-4 text-navy-400 transition-transform group-hover:translate-x-1 group-hover:text-govt-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Goal Tracker + Study Tip */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-govt-300" />
                    Weekly Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {dashboardData?.streak.total_attempts_this_week ?? 0}
                      </p>
                      <p className="text-xs text-navy-400">mocks this week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-govt-300">Target: 5</p>
                      <p className="text-xs text-navy-400">Keep going!</p>
                    </div>
                  </div>
                  <Progress
                    value={dashboardData?.streak.total_attempts_this_week ?? 0}
                    max={5}
                    className="mt-3 h-2"
                    indicatorClassName="bg-govt-500"
                  />
                  <div className="mt-2 flex justify-between text-xs text-navy-400">
                    <span>{Math.min(dashboardData?.streak.total_attempts_this_week ?? 0, 5)}/5 done</span>
                    <span>{Math.max(0, 5 - (dashboardData?.streak.total_attempts_this_week ?? 0))} to go</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#11121c]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-saffron-300" />
                    Study Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-navy-300">
                    {(wrongCount ?? 0) > 0
                      ? `You have ${wrongCount} wrong questions to re-attempt. Reviewing mistakes is the fastest way to improve your score.`
                      : 'Take a mock test to identify your weak areas. Consistent daily practice beats last-minute cramming.'
                    }
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate((wrongCount ?? 0) > 0 ? '/mistake-notebook' : '/mocks')}
                  >
                    {(wrongCount ?? 0) > 0 ? 'Review mistakes' : 'Take a mock'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

function LinkButton({ to, icon: Icon, label, primary }: { to: string; icon: typeof Play; label: string; primary?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors tap-target',
        primary
          ? 'bg-white/15 text-white shadow-sm hover:bg-white/20'
          : 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
