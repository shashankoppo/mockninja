import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Target, BookOpen, TrendingUp, ChevronRight, CheckCircle2, Flame, Award, Clock, Zap } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt } from '@/components/common/Belt';

export function StudyPlanPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weekKey = new Date().toISOString().slice(0, 7);

  const completions = useQuery({
    queryKey: ['study-plan-completions', user?.id, weekKey],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from('study_plan_completions')
        .select('day_name')
        .eq('user_id', user.id)
        .eq('week_key', weekKey);
      if (error) throw error;
      return new Set<string>((data || []).map((r: { day_name: string }) => r.day_name));
    },
    enabled: !!user,
  });

  const completedDays = completions.data ?? new Set<string>();

  const toggleDay = async (day: string) => {
    if (!user) return;
    if (completedDays.has(day)) {
      const { error } = await supabase
        .from('study_plan_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('week_key', weekKey)
        .eq('day_name', day);
      if (!error) void queryClient.invalidateQueries({ queryKey: ['study-plan-completions', user.id, weekKey] });
    } else {
      const { error } = await supabase
        .from('study_plan_completions')
        .insert({ user_id: user.id, week_key: weekKey, day_name: day });
      if (!error) void queryClient.invalidateQueries({ queryKey: ['study-plan-completions', user.id, weekKey] });
    }
  };

  const { data: mastery, isLoading } = useQuery({
    queryKey: ['mastery-plan', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, evidence_count, latest_answer_at')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: chapters } = useQuery({
    queryKey: ['chapters-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id, subject:subject_id(name)')
        .order('subject_id')
        .order('ordinal');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ['attempts-plan', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test_id, mock_test:mock_test_id(title, total_marks)')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: focusTopics } = useQuery({
    queryKey: ['focus-topics-plan', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('student_focus_topics')
        .select('chapter_id, position')
        .eq('user_id', user.id)
        .order('position');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak-plan', user?.id],
    queryFn: async () => {
      if (!user) return { streak: 0, thisWeek: 0 };
      const { data } = await supabase
        .from('attempts')
        .select('submitted_at')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(30);
      const attemptDates = new Set((data || []).filter((a) => a.submitted_at).map((a) => new Date(a.submitted_at).toLocaleDateString('en-CA')));
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thisWeek = (data || []).filter((a) => a.submitted_at && new Date(a.submitted_at) >= weekAgo).length;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        if (attemptDates.has(d.toLocaleDateString('en-CA'))) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      return { streak, thisWeek };
    },
    enabled: !!user,
  });

  const masteryMap = new Map((mastery || []).map((m: any) => [m.chapter_id, m]));

  const weakChapters = (chapters || [])
    .map((ch: any) => {
      const m = masteryMap.get(ch.id) as any;
      const isFocus = (focusTopics || []).some((f: any) => f.chapter_id === ch.id);
      return {
        id: ch.id,
        name: ch.name,
        subject: (ch.subject as any)?.name || 'Other',
        belt: m?.belt || 'UNRATED',
        score: m?.score ?? 0,
        evidence: m?.evidence_count ?? 0,
        isFocus,
      };
    })
    .filter((ch: any) => ch.belt === 'UNRATED' || ch.belt === 'WHITE' || ch.belt === 'YELLOW' || ch.isFocus)
    .sort((a: any, b: any) => {
      if (a.isFocus && !b.isFocus) return -1;
      if (!a.isFocus && b.isFocus) return 1;
      return a.score - b.score;
    })
    .slice(0, 5);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekPlan = days.map((day, i) => {
    const chapter = weakChapters[i % Math.max(weakChapters.length, 1)];
    const isWeekend = i >= 5;
    return {
      day,
      chapter,
      hours: isWeekend ? 0 : (chapter ? 2 : 0),
      isReview: isWeekend && i === 5,
      isMock: isWeekend && i === 6,
    };
  });

  const recentScores = (attempts || []).slice(0, 5).reverse().map((a: any) => {
    const mt = a.mock_test as any;
    const pct = mt?.total_marks ? Math.round(((a.score ?? 0) / mt.total_marks) * 100) : 0;
    return { pct, title: mt?.title || '', score: a.score ?? 0, total: mt?.total_marks ?? 0, date: a.submitted_at };
  });

  const totalAttempts = (attempts || []).length;
  const avgScore = totalAttempts > 0
    ? Math.round((attempts || []).reduce((s: number, a: any) => s + (a.score ?? 0), 0) / totalAttempts)
    : 0;

  const completedCount = completedDays.size;
  const weeklyGoal = 5;
  const goalProgress = Math.min(100, (completedCount / weeklyGoal) * 100);
  const streak = (streakData as { streak: number })?.streak ?? 0;
  const thisWeek = (streakData as { thisWeek: number })?.thisWeek ?? 0;

  const selectedDayPlan = weekPlan.find((d) => d.day === selectedDay);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('studyPlanTitle' as string) || 'Study Plan'}</h1>
          <p className="text-sm text-navy-400">{t('studyPlanDesc' as string) || 'Your personalized plan based on real performance data.'}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/20 text-govt-300">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAttempts}</p>
              <p className="text-xs text-navy-400">Tests taken</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{avgScore}</p>
              <p className="text-xs text-navy-400">Avg score</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{streak}</p>
              <p className="text-xs text-navy-400">Day streak</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-500/20 text-saffron-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{weakChapters.length}</p>
              <p className="text-xs text-navy-400">Weak chapters</p>
            </div>
          </div>
        </div>

        {/* Weekly goal tracker */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-govt-300" />
                <CardTitle className="text-lg text-white">Weekly Goal</CardTitle>
              </div>
              <Badge variant={completedCount >= weeklyGoal ? 'success' : 'neutral'}>
                {completedCount}/{weeklyGoal} done
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={goalProgress} className="h-3" indicatorClassName="bg-govt-500" />
            <div className="mt-2 flex items-center justify-between text-xs text-navy-400">
              <span>{completedCount} study days completed this week</span>
              <span>{Math.max(0, weeklyGoal - completedCount)} to go</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly schedule */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-govt-300" />
              <CardTitle className="text-lg text-white">This Week</CardTitle>
            </div>
            <CardDescription className="text-navy-400">
              {weakChapters.length > 0
                ? 'Tap a day to mark it complete. Tap again to see details.'
                : 'Take more tests to get a personalized study plan.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {weekPlan.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    toggleDay(d.day);
                    setSelectedDay(selectedDay === d.day ? null : d.day);
                  }}
                  aria-pressed={completedDays.has(d.day)}
                  className={cn(
                    'relative w-full rounded-lg border p-2 text-center transition-[transform,color,background-color,border-color] hover:-translate-y-0.5',
                    completedDays.has(d.day) ? 'border-emerald-500/40 bg-emerald-500/10' : d.isMock ? 'border-govt-500/20 bg-govt-500/5' : d.isReview ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-white/5',
                  )}
                >
                  {completedDays.has(d.day) && <CheckCircle2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-400" />}
                  <p className="mb-1 text-xs font-semibold text-navy-300">{d.day}</p>
                  {d.isMock ? (
                    <div className="flex h-12 flex-col items-center justify-center">
                      <Target className="h-4 w-4 text-govt-300" />
                      <span className="mt-0.5 text-2xs text-govt-300">Mock</span>
                    </div>
                  ) : d.isReview ? (
                    <div className="flex h-12 flex-col items-center justify-center">
                      <BookOpen className="h-4 w-4 text-amber-300" />
                      <span className="mt-0.5 text-2xs text-amber-300">Review</span>
                    </div>
                  ) : d.chapter ? (
                    <div className="flex h-12 flex-col items-center justify-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-2xs font-bold text-navy-300">
                        {d.hours}h
                      </div>
                      <span className="mt-0.5 truncate text-2xs text-navy-500" title={d.chapter.name}>
                        {d.chapter.subject.slice(0, 3)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-12 items-center justify-center text-navy-600">—</div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected day detail */}
            {selectedDayPlan && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-navy-400" />
                    <p className="text-sm font-semibold text-white">{selectedDayPlan.day} plan</p>
                    {completedDays.has(selectedDayPlan.day) && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>Close</Button>
                </div>
                <div className="mt-2">
                  {selectedDayPlan.isMock ? (
                    <p className="text-sm text-navy-300">Take a full mock test to assess your overall readiness. <Link to="/mocks" className="font-semibold text-govt-300">Browse mocks</Link></p>
                  ) : selectedDayPlan.isReview ? (
                    <p className="text-sm text-navy-300">Review your mistake notebook and re-attempt wrong questions. <Link to="/mistake-notebook" className="font-semibold text-govt-300">Open notebook</Link></p>
                  ) : selectedDayPlan.chapter ? (
                    <div>
                      <p className="text-sm text-navy-200">
                        Study <span className="font-semibold text-white">{selectedDayPlan.chapter.name}</span> ({selectedDayPlan.chapter.subject})
                      </p>
                      <p className="mt-1 text-xs text-navy-400">
                        Current: {selectedDayPlan.chapter.belt} belt, {Math.round(selectedDayPlan.chapter.score)}% mastery
                      </p>
                      <Link to={`/mocks?chapter=${selectedDayPlan.chapter.id}`} className="mt-2 inline-block">
                        <Button variant="outline" size="sm">Practice this chapter <ChevronRight className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-navy-500">No specific plan for this day.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak chapters and next tests */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-[#11121c]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-govt-300" />
                <CardTitle className="text-lg text-white">Recommended Chapters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {weakChapters.length === 0 ? (
                <p className="py-4 text-center text-sm text-navy-500">
                  No weak chapters detected yet. Take mock tests to build your study plan.
                </p>
              ) : (
                <div className="space-y-2">
                  {weakChapters.map((ch: any) => (
                    <div key={ch.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Belt level={ch.belt || 'UNRATED'} size="xs" showLabel />
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-white">{ch.name}</span>
                          <span className="text-xs text-navy-400">{ch.subject}</span>
                        </div>
                      </div>
                      <Link to={`/mocks?chapter=${ch.id}`}>
                        <Button variant="ghost" size="sm">
                          Practice <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#11121c]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-saffron-300" />
                <CardTitle className="text-lg text-white">Next Tests</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {totalAttempts === 0 ? (
                <p className="py-4 text-center text-sm text-navy-500">
                  Take your first mock test to get personalized recommendations.
                </p>
              ) : (
                <div className="space-y-2">
                  {weakChapters.slice(0, 3).map((ch: any, i: number) => (
                    <div key={ch.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-medium text-white">
                        {ch.subject} Practice — {ch.name}
                      </p>
                      <p className="text-xs text-navy-400">
                        Focus on {ch.belt === 'UNRATED' ? 'new chapter' : `improve from ${Math.round(ch.score)}%`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/mocks" className="mt-3 inline-block">
                <Button variant="outline" size="sm">Browse all mocks</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent trend */}
        {recentScores.length > 0 && (
          <Card className="border-white/10 bg-[#11121c]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                <CardTitle className="text-lg text-white">Recent Trend</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                {recentScores.map((s, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center">
                    <div
                      className={cn(
                        'w-full rounded-t transition-[height]',
                        s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 40 ? 'bg-amber-500' : 'bg-red-500',
                      )}
                      style={{ height: `${Math.max(s.pct, 5)}px` }}
                    />
                    <span className="mt-1 text-2xs text-navy-400">{s.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                {recentScores.map((s, i) => (
                  <span key={i} className="text-2xs text-navy-500">
                    {s.date ? new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {totalAttempts < 3 && (
          <Card className="border-dashed border-white/10 bg-white/5">
            <CardContent className="flex items-center gap-4 py-6">
              <Zap className="h-8 w-8 text-navy-500" />
              <p className="text-sm text-navy-400">
                Your study plan improves as you take more tests. Take at least 3 mocks for a fully personalized plan.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
