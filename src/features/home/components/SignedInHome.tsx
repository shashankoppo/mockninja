import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Play, ChevronRight, Sparkles, CalendarCheck,
  Flame, Target, Award, Calendar, ArrowRight, BookOpen,
  Atom, FlaskConical, Sigma,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Belt, beltForScore } from '@/components/common/Belt';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { TodayPanel } from '@/features/home/components/TodayPanel';

const subjectIcons: Record<string, typeof Atom> = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Mathematics: Sigma,
};


const warmLines = [
  'Every question you practise today brings you closer to your goal.',
  'Small, consistent steps add up. Keep going.',
  'Your effort today shapes your performance tomorrow.',
  'Practice with purpose — every attempt counts.',
  'You are building something real, one question at a time.',
];

interface SubjectMastery {
  subject_id: number;
  subject_name: string;
  avg_mastery: number;
  rated_chapters: number;
  total_chapters: number;
  belt: string;
}

interface ChapterBelt {
  chapter_id: number;
  chapter_name: string;
  belt: string;
  score: number;
  subject_name: string;
}

export function SignedInHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const warmIndex = new Date().getDate() % warmLines.length;
  const warmLine = warmLines[warmIndex];

  const { data: resumeAttempt } = useQuery({
    queryKey: ['home-resume-attempt', user?.id],
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

  const { data: lastResult } = useQuery({
    queryKey: ['home-last-result', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test:mock_test_id ( title, total_marks )')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: nextChapter } = useQuery({
    queryKey: ['home-next-chapter', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: mastery, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, chapter:chapters ( id, name )')
        .eq('user_id', user.id)
        .order('score', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!mastery) return null;
      const chapter = mastery.chapter as unknown as { id: number; name: string } | null;
      return chapter ? { id: chapter.id, name: chapter.name, score: mastery.score, belt: mastery.belt } : null;
    },
    enabled: !!user,
  });

  const { data: chapterBelts, isLoading: beltsLoading } = useQuery<ChapterBelt[]>({
    queryKey: ['home-chapter-belts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, chapter:chapters ( name, subject:subjects ( name ) )')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data || []).map((m) => {
        const ch = m.chapter as unknown as { name: string; subject: { name: string } } | null;
        return {
          chapter_id: m.chapter_id,
          chapter_name: ch?.name ?? 'Unknown',
          belt: m.belt,
          score: m.score ?? 0,
          subject_name: ch?.subject?.name ?? '',
        };
      });
    },
    enabled: !!user,
  });

  const { data: recentAttempts } = useQuery({
    queryKey: ['home-recent-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test:mock_test_id ( title, total_marks )')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: announcements } = useQuery({
    queryKey: ['home-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('key', 'announcement_text')
        .maybeSingle();
      if (error) return null;
      return data?.value as string | null;
    },
  });

  const { data: hasStudyPlan } = useQuery({
    queryKey: ['home-has-study-plan', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: focus, error } = await supabase
        .from('student_focus_topics')
        .select('chapter_id')
        .eq('user_id', user.id)
        .limit(1);
      if (error) return false;
      return (focus ?? []).length > 0;
    },
    enabled: !!user,
  });

  const { data: dashboardData, isLoading: ddLoading } = useQuery<{
    subjects: SubjectMastery[];
    streak: { streak_days: number };
  }>({
    queryKey: ['home-overview', user?.id],
    queryFn: async () => {
      if (!user) return { subjects: [], streak: { streak_days: 0 } };

      const { data: subjects } = await supabase.from('subjects').select('id, name').order('id');
      const { data: chapters } = await supabase.from('chapters').select('id, subject_id').order('subject_id');
      const { data: mastery } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score')
        .eq('user_id', user.id);

      const chapterSubjectMap = new Map((chapters || []).map((c) => [c.id, c.subject_id]));
      const chapterCountBySubject = new Map<number, number>();
      (chapters || []).forEach((c) => {
        chapterCountBySubject.set(c.subject_id, (chapterCountBySubject.get(c.subject_id) || 0) + 1);
      });

      const subjAgg: Record<number, { count: number; scores: number[] }> = {};
      (mastery || []).forEach((m) => {
        const subjId = chapterSubjectMap.get(m.chapter_id);
        if (subjId === undefined) return;
        if (!subjAgg[subjId]) subjAgg[subjId] = { count: 0, scores: [] };
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
          subject_name: s.name,
          avg_mastery: avgMastery,
          rated_chapters: rated,
          total_chapters: total,
          belt: beltForScore(avgMastery),
        };
      });

      const { data: recentSubs } = await supabase
        .from('attempts')
        .select('submitted_at')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(30);

      let streak = 0;
      const today = new Date();
      const attemptDates = new Set(
        (recentSubs || [])
          .filter((a) => a.submitted_at)
          .map((a) => new Date(a.submitted_at!).toLocaleDateString('en-CA'))
      );
      for (let i = 0; i < 365; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        if (attemptDates.has(d.toLocaleDateString('en-CA'))) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      return { subjects: subjectMastery, streak: { streak_days: streak } };
    },
    enabled: !!user,
  });

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* (a) Compact welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#11121c] via-[#161725] to-[#11121c] p-5 text-white shadow-lg sm:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-govt-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-govt-300" />
                <span className="text-xs font-medium text-navy-200">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl font-bold govt-heading sm:text-2xl">
                {firstName ? `${t('dashboard.welcome')}, ${firstName}` : t('dashboard.title')}
              </h1>
              <p className="mt-1 max-w-md text-sm text-navy-200">{warmLine}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  {dashboardData?.streak.streak_days ?? 0} day streak
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="primary" size="sm" onClick={() => navigate('/mocks')}>
                <Play className="h-4 w-4" /> Start a mock
              </Button>
            </div>
          </div>
        </div>

        {/* (b) Continue Learning strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Resume in-progress */}
          {resumeAttempt?.started_at ? (
            <Card className="overflow-hidden border-white/10 bg-[#11121c]">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-govt-300">Resume</p>
                <p className="truncate text-sm font-semibold text-white">
                  {(resumeAttempt.mock_test as { title?: string } | null)?.title || 'In-progress attempt'}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-navy-400">
                  <Clock className="h-3 w-3" />
                  {new Date(resumeAttempt.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <Button variant="primary" size="sm" className="mt-3 w-full" onClick={() => navigate(`/exam/${resumeAttempt.id}`)}>
                  <Play className="h-3.5 w-3.5" /> Continue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-navy-400">Resume</p>
                <p className="text-sm text-navy-400">No test in progress</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/mocks')}>
                  Browse mocks <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Last result */}
          {lastResult ? (
            <Card className="overflow-hidden border-white/10 bg-[#11121c]">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-emerald-300">Last result</p>
                <p className="truncate text-sm font-semibold text-white">
                  {(lastResult.mock_test as { title?: string })?.title || 'Mock test'}
                </p>
                <p className="mt-0.5 text-xs text-navy-400">
                  {lastResult.score ?? 0} / {(lastResult.mock_test as { total_marks?: number })?.total_marks ?? 0} marks
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate(`/results/${lastResult.id}`)}>
                  View results <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-navy-400">Last result</p>
                <p className="text-sm text-navy-400">No attempts yet</p>
                <p className="mt-0.5 text-xs text-navy-500">Submit a mock to see your score</p>
              </CardContent>
            </Card>
          )}

          {/* Next recommended chapter */}
          {nextChapter ? (
            <Card className="overflow-hidden border-white/10 bg-[#11121c]">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-saffron-300">Next up</p>
                <p className="truncate text-sm font-semibold text-white">{nextChapter.name}</p>
                <p className="mt-0.5 text-xs text-navy-400">Mastery: {nextChapter.score}% · {nextChapter.belt} belt</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/chapters')}>
                  Practise <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-navy-400">Next up</p>
                <p className="text-sm text-navy-400">Take a mock to get recommendations</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* (c) Unified Today panel */}
        <TodayPanel />

        {/* (d) Belts overview — 3 chapters */}
        {beltsLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : chapterBelts && chapterBelts.length > 0 ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-govt-300" />
                  Your belts
                </CardTitle>
                <CardDescription>Top chapters by mastery</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mastery')}>
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {chapterBelts.map((cb) => (
                  <div
                    key={cb.chapter_id}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-[transform,border-color] hover:border-white/20 hover:-translate-y-0.5"
                    onClick={() => navigate('/mastery')}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-govt-500/20 text-govt-300">
                        {(() => {
                          const Icon = subjectIcons[cb.subject_name] || BookOpen;
                          return <Icon className="h-4 w-4" />;
                        })()}
                      </div>
                      <Belt level={cb.belt} size="sm" showLabel />

                    </div>
                    <p className="truncate text-sm font-semibold text-white">{cb.chapter_name}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-navy-400">
                      <span>{cb.subject_name}</span>
                      <span className="font-bold text-white">{cb.score}%</span>
                    </div>
                    <Progress
                      value={cb.score}
                      className="mt-2 h-1.5"
                      indicatorClassName={cn(
                        cb.score >= 75 ? 'bg-emerald-500' :
                        cb.score >= 50 ? 'bg-govt-500' :
                        cb.score >= 25 ? 'bg-amber-500' : 'bg-red-400'
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* (e) Last 3 attempts */}
        {recentAttempts && recentAttempts.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent attempts</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}>
                Full history <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {recentAttempts.map((a) => {
                  const mt = a.mock_test as { title?: string; total_marks?: number };
                  const pct = mt?.total_marks ? Math.round(((a.score ?? 0) / mt.total_marks) * 100) : 0;
                  return (
                    <div
                      key={a.id}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 hover:border-white/20"
                      onClick={() => navigate(`/results/${a.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold',
                          pct >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          pct >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {pct}%
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{mt?.title}</p>
                          <p className="text-xs text-navy-400">
                            {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-white tabular-nums">
                        {a.score ?? 0} / {mt?.total_marks ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* (f) Published announcements */}
        {announcements && (
          <Card className="border-govt-500/30 bg-gradient-to-br from-govt-500/10 to-transparent">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-govt-500/20 text-govt-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xs font-bold uppercase tracking-wider text-govt-300">Latest update</p>
                <p className="mt-1 text-sm text-white">{announcements}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* (g) Study plan prompt */}
        {hasStudyPlan ? (
          <Card className="overflow-hidden border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Your study plan</p>
                  <p className="text-sm text-navy-300">Follow your personalised weekly schedule</p>
                </div>
              </div>
              <Button variant="primary" onClick={() => navigate('/study-plan')}>
                View plan <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-white/10 bg-white/5">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Set your target</p>
                  <p className="text-sm text-navy-300">Pick your focus topics to get a personalised study plan</p>
                </div>
              </div>
              <Button variant="primary" onClick={() => navigate('/focus')}>
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
