import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, Clock, Target, TrendingUp, Award,
  Lightbulb, Zap, AlertTriangle, RotateCcw, BookOpen, BarChart3, Timer, TrendingDown, Star,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Math as MathTex } from '@/components/Math';
import { ResultShareCard } from '@/components/student/ResultShareCard';
import { IntegrityEventsCard } from '@/components/student/IntegrityEventsCard';
import { cn } from '@/lib/utils';
import { examResults, type ResultsData, type ResultItem } from '@/lib/exam-api';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { Belt, normalizeBelt, beltName, beltRank, type BeltLevel } from '@/components/common/Belt';

interface DifficultyStat {
  correct: number;
  wrong: number;
  unattempted: number;
  total: number;
  marks: number;
}

interface ChapterStat {
  chapter: string;
  subject: string;
  correct: number;
  wrong: number;
  unattempted: number;
  total: number;
  marks: number;
  accuracy: number;
}

export function ResultsPage() {
  const { attemptId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [showSolutions, setShowSolutions] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackReview, setFeedbackReview] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    (async () => {
      const result = await examResults(attemptId);
      if (!mounted) return;
      if ('error' in result) {
        setError(result.error);
      } else {
        setData(result);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId || !user) return;
    let mounted = true;
    (async () => {
      const { data: feedback } = await supabase
        .from('test_feedback')
        .select('rating, review, feedback')
        .eq('attempt_id', attemptId)
        .maybeSingle();
      if (!mounted || !feedback) return;
      setFeedbackRating(feedback.rating);
      setFeedbackReview(feedback.review || '');
      setFeedbackComment(feedback.feedback || '');
      setFeedbackSaved(true);
    })();
    return () => { mounted = false; };
  }, [attemptId, user]);

  const [topBelt, setTopBelt] = useState<BeltLevel | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const cacheKey = `belt-snapshot:${user.id}`;
    (async () => {
      const { data: mastery } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, chapter:chapter_id ( name )')
        .eq('user_id', user.id);
      if (!mounted || !mastery) return;
      const prevRaw = sessionStorage.getItem(cacheKey);
      const isFirstSnapshot = prevRaw === null;
      const prev: Record<string, string> = prevRaw ? JSON.parse(prevRaw) : {};
      const next: Record<string, string> = {};
      let best: BeltLevel | null = null;
      for (const m of mastery) {
        const chName = (m.chapter as { name?: string } | null)?.name || `#${m.chapter_id}`;
        const newBelt = normalizeBelt(m.belt);
        next[m.chapter_id] = newBelt;
        if (best === null || beltRank(newBelt) > beltRank(best)) best = newBelt;
        if (!isFirstSnapshot && beltRank(newBelt) > beltRank(prev[m.chapter_id])) {
          toast.success(
            <span className="flex items-center gap-3">
              <Belt level={newBelt} size="sm" shine />
              <span>{`${chName}: ${beltName(newBelt)} belt. Nicely done.`}</span>
            </span>,
          );
        }
      }
      setTopBelt(best);
      sessionStorage.setItem(cacheKey, JSON.stringify(next));
    })();
    return () => { mounted = false; };
  }, [user]);

  const saveFeedback = async () => {
    if (!attemptId || !data || feedbackRating < 1 || feedbackSaving) return;
    setFeedbackSaving(true);
    const payload = {
      attempt_id: attemptId,
      mock_test_id: data.mock_test.id,
      rating: feedbackRating,
      review: feedbackReview.trim() || null,
      feedback: feedbackComment.trim() || null,
    };
    const { error } = await supabase.from('test_feedback').upsert(payload, { onConflict: 'user_id,attempt_id' });
    setFeedbackSaving(false);
    if (error) {
      toast.error('Could not save your feedback. Please try again.');
      return;
    }
    setFeedbackSaved(true);
    toast.success('Thanks for helping us improve Mock Ninja.');
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const score = data.attempt.score ?? 0;
    const totalMarks = data.mock_test.total_marks;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const correct = data.results.filter((r) => r.is_correct === true).length;
    const wrong = data.results.filter((r) => r.is_correct === false).length;
    const unattempted = data.results.filter((r) => r.is_correct === null).length;
    const total = data.results.length;
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
    const totalTime = data.results.reduce((sum, r) => sum + (r.time_spent_sec || 0), 0);
    const avgTimePerQ = total > 0 ? Math.round(totalTime / total) : 0;

    const positiveMarks = data.results.reduce((sum, r) => sum + (r.awarded_marks > 0 ? r.awarded_marks : 0), 0);
    const negativeMarks = data.results.reduce((sum, r) => sum + (r.awarded_marks < 0 ? r.awarded_marks : 0), 0);

    const subjectMap: Record<string, { correct: number; wrong: number; total: number; marks: number; time: number }> = {};
    for (const r of data.results) {
      const subj = r.subject_name || 'Unknown';
      if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, wrong: 0, total: 0, marks: 0, time: 0 };
      subjectMap[subj].total++;
      subjectMap[subj].marks += r.awarded_marks;
      subjectMap[subj].time += r.time_spent_sec || 0;
      if (r.is_correct === true) subjectMap[subj].correct++;
      if (r.is_correct === false) subjectMap[subj].wrong++;
    }

    const difficultyMap: Record<string, DifficultyStat> = {
      EASY: { correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0 },
      MEDIUM: { correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0 },
      HARD: { correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0 },
    };
    for (const r of data.results) {
      const diff = (r.difficulty || 'MEDIUM').toUpperCase();
      if (!difficultyMap[diff]) difficultyMap[diff] = { correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0 };
      difficultyMap[diff].total++;
      difficultyMap[diff].marks += r.awarded_marks;
      if (r.is_correct === true) difficultyMap[diff].correct++;
      else if (r.is_correct === false) difficultyMap[diff].wrong++;
      else difficultyMap[diff].unattempted++;
    }

    const chapterMap: Record<string, ChapterStat> = {};
    for (const r of data.results) {
      const ch = r.chapter_name || 'Unknown';
      const subj = r.subject_name || 'Unknown';
      const key = `${subj}::${ch}`;
      if (!chapterMap[key]) {
        chapterMap[key] = { chapter: ch, subject: subj, correct: 0, wrong: 0, unattempted: 0, total: 0, marks: 0, accuracy: 0 };
      }
      const cs = chapterMap[key];
      cs.total++;
      cs.marks += r.awarded_marks;
      if (r.is_correct === true) cs.correct++;
      else if (r.is_correct === false) cs.wrong++;
      else cs.unattempted++;
    }
    const chapterStats = Object.values(chapterMap).map((cs) => ({
      ...cs,
      accuracy: cs.correct + cs.wrong > 0 ? Math.round((cs.correct / (cs.correct + cs.wrong)) * 100) : 0,
    }));

    return {
      score, totalMarks, percentage, correct, wrong, unattempted, total, accuracy,
      totalTime, avgTimePerQ, subjectMap, difficultyMap, chapterStats,
      positiveMarks, negativeMarks,
    };
  }, [data]);

  const insights = useMemo(() => {
    if (!stats) return [];
    const items: { icon: typeof Lightbulb; color: string; bg: string; text: string }[] = [];

    if (stats.accuracy < 80) {
      items.push({
        icon: Target,
        color: 'text-amber-600',
        bg: 'insight-card-warning',
        text: t('results.insightAccuracy', { acc: stats.accuracy }),
      });
    }

    if (stats.negativeMarks < 0) {
      items.push({
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'insight-card-danger',
        text: t('results.insightNegativeMarks', { marks: Math.abs(stats.negativeMarks) }),
      });
    }

    const speedComment = stats.avgTimePerQ < 45
      ? t('results.insightSpeedFast')
      : stats.avgTimePerQ > 120
        ? t('results.insightSpeedSlow')
        : t('results.insightSpeedGood');
    items.push({
      icon: Zap,
      color: stats.avgTimePerQ > 120 ? 'text-red-600' : stats.avgTimePerQ < 45 ? 'text-amber-600' : 'text-emerald-600',
      bg: stats.avgTimePerQ > 120 ? 'insight-card-danger' : stats.avgTimePerQ < 45 ? 'insight-card-warning' : 'insight-card-success',
      text: t('results.insightSpeed', { time: formatDuration(stats.avgTimePerQ), comment: speedComment }),
    });

    const subjectEntries = Object.entries(stats.subjectMap);
    if (subjectEntries.length > 0) {
      const best = subjectEntries.reduce((a, b) => (a[1].marks > b[1].marks ? a : b));
      const worst = subjectEntries.reduce((a, b) => (a[1].marks < b[1].marks ? a : b));
      if (best[0] !== worst[0]) {
        items.push({
          icon: TrendingUp,
          color: 'text-emerald-600',
          bg: 'insight-card-success',
          text: t('results.insightStrong', { subject: best[0] }),
        });
        items.push({
          icon: TrendingDown,
          color: 'text-red-600',
          bg: 'insight-card-danger',
          text: t('results.insightWeak', { subject: worst[0] }),
        });
      }
    }

    if (stats.unattempted > 0) {
      items.push({
        icon: BookOpen,
        color: 'text-govt-600',
        bg: 'insight-card-info',
        text: t('results.insightUnattempted', { count: stats.unattempted }),
      });
    }

    return items;
  }, [stats, t]);

  const filteredResults = useMemo(() => {
    if (!data) return [];
    return data.results.filter((r) => {
      if (filter === 'correct') return r.is_correct === true;
      if (filter === 'wrong') return r.is_correct === false;
      if (filter === 'unattempted') return r.is_correct === null;
      return true;
    });
  }, [data, filter]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !data || !stats) {
    return (
      <StudentLayout>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <p className="text-navy-600">{error || t('exam.loadError')}</p>
          <Button variant="outline" onClick={() => navigate('/mocks')}>{t('results.backToMocks')}</Button>
        </div>
      </StudentLayout>
    );
  }

  const scoreColor = stats.percentage >= 70 ? 'text-emerald-600' : stats.percentage >= 40 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = stats.percentage >= 70 ? 'from-emerald-500 to-emerald-600' : stats.percentage >= 40 ? 'from-amber-500 to-amber-600' : 'from-red-500 to-red-600';

  const fmtMarks = (m: number) => {
    const rounded = Math.round(m * 100) / 100;
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  };

  const filterTabs: { key: typeof filter; label: string; count: number; color: string }[] = [
    { key: 'all', label: t('exam.filter_all'), count: stats.total, color: 'bg-navy-200 text-navy-700' },
    { key: 'correct', label: t('exam.filter_correct'), count: stats.correct, color: 'bg-emerald-100 text-emerald-700' },
    { key: 'wrong', label: t('exam.filter_wrong'), count: stats.wrong, color: 'bg-red-100 text-red-700' },
    { key: 'unattempted', label: t('exam.filter_unattempted'), count: stats.unattempted, color: 'bg-gray-100 text-gray-600' },
  ];

  const difficultyColors: Record<string, { bar: string; text: string; bg: string }> = {
    EASY: { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    MEDIUM: { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    HARD: { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  };

  const difficultyLabels: Record<string, string> = {
    EASY: t('results.easy'),
    MEDIUM: t('results.medium'),
    HARD: t('results.hard'),
  };

  const sortedChapters = [...stats.chapterStats].sort((a, b) => a.marks - b.marks);
  const weakChapters = sortedChapters.filter((c) => c.accuracy < 60).slice(0, 5);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <button
          onClick={() => navigate('/mocks')}
          className="flex items-center gap-1 text-sm text-navy-500 transition-colors hover:text-navy-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('results.backToMocks')}
        </button>

        {/* Score hero card with radial */}
        <Card className="overflow-hidden">
          <div className={cn('bg-gradient-to-r p-6 text-white', scoreBg)}>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{data.mock_test.title}</h2>
                <p className="mt-1 text-sm text-white/80">{t('mocks.ntaPattern')}</p>
              </div>
              {/* Radial score gauge */}
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - stats.percentage / 100)}`}
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums">{stats.percentage}%</span>
                  <span className="text-2xs text-white/70">{t('results.score')}</span>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {/* Score breakdown: gain vs loss vs net */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <div className="text-xs font-medium text-emerald-600">{t('results.scoreGain')}</div>
                <div className="mt-1 text-xl font-bold text-emerald-700">+{fmtMarks(stats.positiveMarks)}</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-xs font-medium text-red-600">{t('results.scoreLoss')}</div>
                <div className="mt-1 text-xl font-bold text-red-700">{fmtMarks(stats.negativeMarks)}</div>
              </div>
              <div className={cn('rounded-xl border p-3 text-center', stats.score >= 0 ? 'border-govt-200 bg-govt-50' : 'border-red-200 bg-red-50')}>
                <div className={cn('text-xs font-medium', stats.score >= 0 ? 'text-govt-600' : 'text-red-600')}>{t('results.netScore')}</div>
                <div className={cn('mt-1 text-xl font-bold', stats.score >= 0 ? 'text-govt-700' : 'text-red-700')}>
                  {stats.score > 0 ? '+' : ''}{fmtMarks(stats.score)} / {stats.totalMarks}
                </div>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                <div className="text-2xl font-bold text-emerald-700">{stats.correct}</div>
                <div className="text-xs text-navy-500">{t('exam.correct')}</div>
              </div>
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <XCircle className="mx-auto mb-1 h-5 w-5 text-red-600" />
                <div className="text-2xl font-bold text-red-700">{stats.wrong}</div>
                <div className="text-xs text-navy-500">{t('exam.wrong')}</div>
              </div>
              <div className="rounded-xl bg-navy-50 p-4 text-center">
                <MinusCircle className="mx-auto mb-1 h-5 w-5 text-navy-400" />
                <div className="text-2xl font-bold text-navy-700">{stats.unattempted}</div>
                <div className="text-xs text-navy-500">{t('exam.skipped')}</div>
              </div>
              <div className="rounded-xl bg-govt-50 p-4 text-center">
                <Target className="mx-auto mb-1 h-5 w-5 text-govt-600" />
                <div className={cn('text-2xl font-bold', scoreColor)}>{stats.accuracy}%</div>
                <div className="text-xs text-navy-500">{t('results.accuracy')}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-navy-100 pt-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-navy-400" />
                <span className="text-navy-500">{t('results.accuracy')}</span>
                <span className="font-bold text-navy-900">{stats.accuracy}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-navy-400" />
                <span className="text-navy-500">{t('results.totalTime')}</span>
                <span className="font-bold text-navy-900">{formatDuration(stats.totalTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-navy-400" />
                <span className="text-navy-500">{t('results.avgTime')}</span>
                <span className="font-bold text-navy-900">{formatDuration(stats.avgTimePerQ)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultShareCard
          belt={topBelt}
          title={data.mock_test.title}
          score={stats.score}
          totalMarks={stats.totalMarks}
          percentage={stats.percentage}
          accuracy={stats.accuracy}
          correct={stats.correct}
          wrong={stats.wrong}
        />

        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-navy-900">Rank predictor</p>
              <p className="text-sm text-navy-600">See an estimate of how your score compares with other students on this test.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/rank-predictor/${data.attempt.id}`)}>
              View estimate
            </Button>
          </CardContent>
        </Card>

        <IntegrityEventsCard attemptId={data.attempt.id} attemptStartedAt={data.attempt.started_at} />

        {/* Post-test feedback */}
        <Card className="theme-feedback-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[var(--text)]">
              <Star className="h-5 w-5 text-amber-500" />
              How was this test experience?
            </CardTitle>
            <p className="text-sm text-[var(--text-2)]">Your rating and feedback help us improve future mocks.</p>
          </CardHeader>
          <CardContent>
            {feedbackSaved ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Feedback saved. Thank you for helping us improve.</span>
                <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setFeedbackSaved(false)}>Edit</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--text)]">Rate this test</p>
                  <div className="flex gap-1" role="radiogroup" aria-label="Test rating">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFeedbackRating(rating)}
                        className="tap-target inline-flex items-center justify-center rounded-lg p-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-govt-400"
                        aria-label={`${rating} out of 5 stars`}
                        aria-pressed={feedbackRating === rating}
                      >
                        <Star className={cn('h-7 w-7', rating <= feedbackRating ? 'fill-amber-400 text-amber-500' : 'text-navy-300')} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-navy-700">Short review
                    <input value={feedbackReview} onChange={(event) => setFeedbackReview(event.target.value)} maxLength={500} placeholder="What worked well?" className="theme-feedback-input mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-govt-500 focus:ring-2 focus:ring-govt-200" />
                  </label>
                  <label className="text-sm font-medium text-navy-700">General feedback
                    <textarea value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} maxLength={2000} rows={2} placeholder="Tell us what we can improve." className="theme-feedback-input mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-govt-500 focus:ring-2 focus:ring-govt-200" />
                  </label>
                </div>
                <Button variant="primary" size="sm" onClick={saveFeedback} disabled={feedbackRating === 0} loading={feedbackSaving}>Send feedback</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <Card className="insight-panel overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                {t('results.insights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins, i) => {
                  const Icon = ins.icon;
                  return (
                    <div key={i} className={cn('insight-card flex items-start gap-3', ins.bg)}>
                      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ins.color)} />
                      <p>{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Difficulty breakdown + Time distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Difficulty breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-govt-600" />
                {t('results.difficultyBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.difficultyMap).map(([diff, ds]) => {
                  const dc = difficultyColors[diff] || difficultyColors.MEDIUM;
                  const acc = ds.correct + ds.wrong > 0 ? Math.round((ds.correct / (ds.correct + ds.wrong)) * 100) : 0;
                  return (
                    <div key={diff}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-navy-900">{difficultyLabels[diff] || diff}</span>
                        <span className="text-xs text-navy-500">
                          {ds.correct}/{ds.total} {t('exam.correct')} · {acc}%
                        </span>
                      </div>
                      <div className="flex h-6 overflow-hidden rounded-lg bg-navy-100">
                        <div className="bg-emerald-500 transition-[width]" style={{ width: `${(ds.correct / ds.total) * 100}%` }} />
                        <div className="bg-red-400 transition-[width]" style={{ width: `${(ds.wrong / ds.total) * 100}%` }} />
                        <div className="bg-navy-200 transition-[width]" style={{ width: `${(ds.unattempted / ds.total) * 100}%` }} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />{ds.correct} {t('exam.correct')}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" />{ds.wrong} {t('exam.wrong')}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-navy-200" />{ds.unattempted} {t('results.unattempted')}</span>
                        <span className={cn('ml-auto font-bold', ds.marks > 0 ? 'text-emerald-600' : ds.marks < 0 ? 'text-red-600' : 'text-navy-500')}>
                          {fmtMarks(ds.marks)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Time distribution by subject */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Timer className="h-5 w-5 text-govt-600" />
                {t('results.timeSplit')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.subjectMap).map(([subj, s]) => {
                  const pct = stats.totalTime > 0 ? Math.round((s.time / stats.totalTime) * 100) : 0;
                  return (
                    <div key={subj}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-navy-900">{subj}</span>
                        <span className="text-xs text-navy-500">{formatDuration(s.time)} · {pct}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-navy-100">
                        <div className="h-full rounded-full bg-govt-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                        <span>{s.correct} {t('exam.correct')}</span>
                        <span>{s.wrong} {t('exam.wrong')}</span>
                        <span className={cn('ml-auto font-bold', s.marks > 0 ? 'text-emerald-600' : s.marks < 0 ? 'text-red-600' : 'text-navy-500')}>
                          {fmtMarks(s.marks)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject-wise breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exam.subjectBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-navy-200">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-xs uppercase text-navy-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t('results.subject')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('results.correct')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('results.wrong')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('results.accuracy')}</th>
                    <th className="px-4 py-2 text-right font-medium">{t('results.marks')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {Object.entries(stats.subjectMap).map(([subj, s]) => {
                    const acc = s.correct + s.wrong > 0 ? Math.round((s.correct / (s.correct + s.wrong)) * 100) : 0;
                    const accColor = acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-red-600';
                    const barColor = acc >= 70 ? 'bg-emerald-500' : acc >= 40 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <tr key={subj} className="hover:bg-navy-50/50">
                        <td className="px-4 py-3 font-medium text-navy-900">{subj}</td>
                        <td className="px-3 py-3 text-center text-emerald-600">{s.correct}</td>
                        <td className="px-3 py-3 text-center text-red-600">{s.wrong}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-100">
                              <div className={cn('h-full rounded-full', barColor)} style={{ width: `${acc}%` }} />
                            </div>
                            <span className={cn('text-xs font-medium', accColor)}>{acc}%</span>
                          </div>
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right font-bold',
                          s.marks > 0 ? 'text-emerald-600' : s.marks < 0 ? 'text-red-600' : 'text-navy-500',
                        )}>
                          {fmtMarks(s.marks)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Chapter-wise analysis */}
        {stats.chapterStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-govt-600" />
                {t('results.chapterAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {sortedChapters.map((cs) => {
                  const accColor = cs.accuracy >= 70 ? 'text-emerald-600' : cs.accuracy >= 40 ? 'text-amber-600' : 'text-red-600';
                  const barColor = cs.accuracy >= 70 ? 'bg-emerald-500' : cs.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={`${cs.subject}::${cs.chapter}`} className="rounded-lg border border-navy-200 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-navy-900">{cs.chapter}</span>
                          <Badge variant="neutral" className="text-2xs">{cs.subject}</Badge>
                        </div>
                        <span className={cn('text-sm font-bold', cs.marks > 0 ? 'text-emerald-600' : cs.marks < 0 ? 'text-red-600' : 'text-navy-500')}>
                          {fmtMarks(cs.marks)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-100">
                          <div className={cn('h-full rounded-full transition-[width]', barColor)} style={{ width: `${cs.accuracy}%` }} />
                        </div>
                        <span className={cn('w-10 text-right text-xs font-medium', accColor)}>{cs.accuracy}%</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                        <span>{cs.correct} {t('exam.correct')}</span>
                        <span>{cs.wrong} {t('exam.wrong')}</span>
                        <span>{cs.unattempted} {t('results.unattempted')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action plan */}
        <Card className="border-govt-200 bg-govt-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-govt-600" />
              {t('results.actionPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate(`/exam/${attemptId}/reattempt`)}
                className="flex items-center gap-3 rounded-xl border border-navy-200 bg-white p-4 text-left transition-[border-color,box-shadow] hover:border-govt-300 hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <RotateCcw className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{t('results.reattemptWrong')}</p>
                  <p className="text-xs text-navy-500">{t('results.reattemptWrongDesc')}</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/focus')}
                className="flex items-center gap-3 rounded-xl border border-navy-200 bg-white p-4 text-left transition-[border-color,box-shadow] hover:border-govt-300 hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{t('results.practiceWeak')}</p>
                  <p className="text-xs text-navy-500">
                    {weakChapters.length > 0
                      ? weakChapters.map((c) => c.chapter).join(', ').slice(0, 50)
                      : t('results.practiceWeakDesc')}
                  </p>
                </div>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/solution/${data.attempt.id}`)}>
                {t('results.viewAllSolutions')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/mocks')}>
                {t('results.backToMocks')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question-wise solutions (collapsible) */}
        {showSolutions && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">{t('exam.questionReview')}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {filterTabs.map((ft) => (
                    <button
                      key={ft.key}
                      onClick={() => setFilter(ft.key)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        filter === ft.key ? 'bg-govt-700 text-white' : ft.color + ' hover:opacity-80',
                      )}
                    >
                      {ft.label}
                      <span className={cn('rounded px-1 text-2xs', filter === ft.key ? 'bg-white/20' : 'bg-white/50')}>
                        {ft.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-navy-400">{t('results.noQuestions')}</p>
                ) : (
                  filteredResults.map((r, idx) => (
                    <ResultQuestionCard key={r.question_id} r={r} idx={idx} t={t} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}

function ResultQuestionCard({ r, idx, t }: { r: ResultItem; idx: number; t: (key: string) => string }) {
  const fmtMarks = (m: number) => {
    const rounded = Math.round(m * 100) / 100;
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  };
  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 transition-[color,background-color,border-color,box-shadow] hover:shadow-card',
        r.is_correct === true ? 'border-emerald-200 bg-emerald-50/40'
        : r.is_correct === false ? 'border-red-200 bg-red-50/40'
        : 'border-navy-200 bg-navy-50/20',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-navy-900">Q{r.position || idx + 1}</span>
          <Badge variant="neutral" className="text-xs">{r.subject_name}</Badge>
          <Badge variant="neutral" className="text-xs">{r.type}</Badge>
          {r.difficulty && (
            <span className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium',
              r.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-600'
              : r.difficulty === 'HARD' ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-600',
            )}>
              {r.difficulty}
            </span>
          )}
          {r.chapter_name && (
            <span className="hidden text-xs text-navy-400 sm:inline">{r.chapter_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {r.is_correct === true && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          {r.is_correct === false && <XCircle className="h-5 w-5 text-red-600" />}
          {r.is_correct === null && <MinusCircle className="h-5 w-5 text-navy-400" />}
          <span className={cn(
            'rounded-md px-2 py-0.5 text-xs font-bold',
            r.awarded_marks > 0 ? 'bg-emerald-100 text-emerald-700'
            : r.awarded_marks < 0 ? 'bg-red-100 text-red-700'
            : 'bg-navy-100 text-navy-500',
          )}>
            {fmtMarks(r.awarded_marks)}
          </span>
        </div>
      </div>

      <div className="mb-3 text-sm leading-relaxed text-navy-800">
        <MathTex display>{r.statement_tex}</MathTex>
      </div>

      {r.type === 'MCQ' && r.options_json && (
        <div className="mb-3 space-y-1.5">
          {r.options_json.map((opt) => {
            const correctOpt = (r.answer_json as { option?: string })?.option;
            const studentOpt = (r.student_answer as { option?: string } | null)?.option;
            const isCorrect = opt.id === correctOpt;
            const isStudent = opt.id === studentOpt;
            return (
              <div
                key={opt.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm',
                  isCorrect ? 'border-emerald-400 bg-emerald-50'
                  : isStudent ? 'border-red-400 bg-red-50'
                  : 'border-navy-200 bg-white',
                )}
              >
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold',
                  isCorrect ? 'bg-emerald-500 text-white'
                  : isStudent ? 'bg-red-500 text-white'
                  : 'bg-navy-100 text-navy-600',
                )}>
                  {opt.id.toUpperCase()}
                </span>
                <MathTex>{opt.text}</MathTex>
                {isCorrect && <span className="ml-auto text-xs font-medium text-emerald-600">{t('exam.correctAnswer')}</span>}
                {isStudent && !isCorrect && <span className="ml-auto text-xs font-medium text-red-600">{t('exam.yourAnswer')}</span>}
                {isStudent && isCorrect && <span className="ml-auto text-xs font-medium text-emerald-600">{t('exam.yourAnswer')}</span>}
              </div>
            );
          })}
        </div>
      )}

      {r.type === 'NUMERICAL' && (
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3">
            <div className="text-xs font-medium text-emerald-600">{t('exam.correctAnswer')}</div>
            <div className="mt-0.5 font-bold text-emerald-700">
              {(r.answer_json as { value?: number })?.value ?? '—'}
            </div>
          </div>
          <div className={cn(
            'rounded-lg border-2 p-3',
            r.is_correct === false ? 'border-red-300 bg-red-50' : 'border-navy-200 bg-white',
          )}>
            <div className={cn('text-xs font-medium', r.is_correct === false ? 'text-red-600' : 'text-navy-500')}>
              {t('exam.yourAnswer')}
            </div>
            <div className={cn('mt-0.5 font-bold', r.is_correct === false ? 'text-red-700' : 'text-navy-700')}>
              {(r.student_answer as { value?: number } | null)?.value ?? t('exam.notAttempted')}
            </div>
          </div>
        </div>
      )}

      {r.solution_tex && (
        <div className="mt-3 rounded-lg border border-govt-200 bg-govt-50 p-3">
          <div className="mb-1 text-xs font-semibold text-govt-700">{t('exam.solution')}</div>
          <div className="text-sm text-navy-800">
            <MathTex display>{r.solution_tex}</MathTex>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
