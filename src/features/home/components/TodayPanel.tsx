import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Zap, RotateCcw, Target, CheckCircle2, Loader2, Play,
  ChevronRight, ArrowRight, AlertCircle, type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { dailyMockGenerate, mistakeReattempt } from '@/lib/exam-api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type TabKey = 'target' | 'dpp' | 'mistakes' | 'focus';

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

const toneClasses = {
  govt: 'bg-govt-500/20 text-govt-300',
  success: 'bg-emerald-500/20 text-emerald-300',
  saffron: 'bg-saffron-500/20 text-saffron-300',
  amber: 'bg-amber-500/20 text-amber-300',
  cyan: 'bg-cyan-500/20 text-cyan-300',
} as const;

type Tone = keyof typeof toneClasses;

function TaskRow({ icon: Icon, tone, title, description, action }: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-navy-300">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function TodayPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [reattempting, setReattempting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('target');
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { data: dailyMock } = useQuery({
    queryKey: ['today-panel-daily-mock', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_daily_mocks')
        .select('mock_test_id, for_date')
        .eq('user_id', user.id)
        .eq('for_date', today)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: mt } = await supabase
        .from('mock_tests')
        .select('id, title, duration_min, total_marks')
        .eq('id', data.mock_test_id)
        .maybeSingle();
      return { ...data, mock_test: mt };
    },
    enabled: !!user,
  });

  const { data: dailyAttempt } = useQuery({
    queryKey: ['today-panel-daily-attempt', dailyMock?.mock_test_id],
    queryFn: async () => {
      if (!user || !dailyMock) return null;
      const { data, error } = await supabase
        .from('attempts')
        .select('id, status, score')
        .eq('user_id', user.id)
        .eq('mock_test_id', dailyMock.mock_test_id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!dailyMock,
  });

  const { data: wrongCount } = useQuery({
    queryKey: ['today-panel-wrong', user?.id],
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

  const { data: focusTopics } = useQuery({
    queryKey: ['today-panel-focus', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('student_focus_topics')
        .select('chapter_id, chapter:chapters ( name )')
        .eq('user_id', user.id)
        .order('position');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleGenerateDaily = async () => {
    setGenerating(true);
    const result = await dailyMockGenerate();
    setGenerating(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(t('dashboard.dailyReady'));
      queryClient.invalidateQueries({ queryKey: ['today-panel-daily-mock', user?.id] });
    }
  };

  const handleReattempt = async () => {
    setReattempting(true);
    const result = await mistakeReattempt();
    setReattempting(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(t('dashboard.reattemptReady'));
      navigate(`/mocks/${result.mock_test_id}`);
    }
  };

  const tabs: TabDef[] = [
    { key: 'target', label: 'Target Mock', icon: Zap },
    { key: 'dpp', label: 'Daily Practice', icon: CheckCircle2 },
    ...((wrongCount ?? 0) > 0 ? [{ key: 'mistakes' as const, label: 'Redo mistakes', icon: RotateCcw }] : []),
    ...((focusTopics ?? []).length > 0 ? [{ key: 'focus' as const, label: 'Focus topics', icon: Target }] : []),
  ];
  const activeDef = tabs.find((tb) => tb.key === activeTab) ?? tabs[0];

  const targetDone = dailyAttempt?.status === 'SUBMITTED';
  const tasksDone = [
    targetDone,
    !!dailyMock,
    (wrongCount ?? 0) === 0 && (targetDone || !!dailyMock),
  ].filter(Boolean).length;
  const tasksTotal = 3;
  const progressPct = Math.round((tasksDone / tasksTotal) * 100);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = tabs.findIndex((tb) => tb.key === activeDef.key);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setActiveTab(next.key);
    tabRefs.current[next.key]?.focus();
  };

  const renderTargetTab = () => {
    if (targetDone && dailyAttempt) {
      return (
        <TaskRow
          icon={CheckCircle2}
          tone="success"
          title="Daily target complete"
          description={`Score: ${dailyAttempt.score ?? '—'} marks`}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate(`/results/${dailyAttempt.id}`)}>
              View results <ChevronRight className="h-4 w-4" />
            </Button>
          }
        />
      );
    }
    if (dailyAttempt?.status === 'IN_PROGRESS') {
      return (
        <TaskRow
          icon={Zap}
          tone="govt"
          title={dailyMock?.mock_test?.title || 'Daily Target Mock'}
          description={dailyMock?.mock_test ? `${dailyMock.mock_test.duration_min} min · ${dailyMock.mock_test.total_marks} marks` : 'In progress'}
          action={
            <Button variant="primary" onClick={() => navigate(`/exam/${dailyAttempt.id}`)}>
              <Play className="h-4 w-4" /> Resume
            </Button>
          }
        />
      );
    }
    if (dailyMock) {
      return (
        <TaskRow
          icon={Zap}
          tone="govt"
          title={dailyMock.mock_test?.title || 'Daily Target Mock'}
          description={dailyMock.mock_test ? `${dailyMock.mock_test.duration_min} min · ${dailyMock.mock_test.total_marks} marks` : 'Ready to start'}
          action={
            <Button variant="primary" onClick={() => navigate(`/mocks/${dailyMock.mock_test_id}`)}>
              <Play className="h-4 w-4" /> Start
            </Button>
          }
        />
      );
    }
    return (
      <TaskRow
        icon={Zap}
        tone="govt"
        title="No daily mock yet"
        description="Generate a short test from your weak chapters"
        action={
          <Button variant="primary" onClick={handleGenerateDaily} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate
          </Button>
        }
      />
    );
  };

  const renderPracticeTab = () => (
    <TaskRow
      icon={CheckCircle2}
      tone="saffron"
      title="Daily Practice Problems"
      description={dailyMock ? "Today's set is ready" : 'Build your streak with daily practice'}
      action={
        <Button variant="primary" onClick={() => navigate('/dpp')}>
          {dailyMock ? 'Continue' : 'Start'} <ArrowRight className="h-4 w-4" />
        </Button>
      }
    />
  );

  const renderMistakesTab = () => (
    <TaskRow
      icon={RotateCcw}
      tone="amber"
      title="Re-attempt your mistakes"
      description={`${wrongCount ?? 0} questions ready for focused practice`}
      action={
        <Button variant="primary" onClick={handleReattempt} disabled={reattempting} loading={reattempting}>
          <RotateCcw className="h-4 w-4" /> Reattempt
        </Button>
      }
    />
  );

  const renderFocusTab = () => {
    const names = (focusTopics ?? [])
      .slice(0, 2)
      .map((ft: { chapter: { name: string } | { name: string }[] | null }) =>
        Array.isArray(ft.chapter) ? ft.chapter[0]?.name : ft.chapter?.name,
      )
      .filter(Boolean)
      .join(', ');
    return (
      <TaskRow
        icon={Target}
        tone="cyan"
        title={`${(focusTopics ?? []).length} focus topics`}
        description={`${names}${(focusTopics ?? []).length > 2 ? '...' : ''}`}
        action={
          <Button variant="primary" onClick={() => navigate('/focus')}>
            Manage <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    );
  };

  const renderActiveTab = (): ReactNode => {
    switch (activeDef.key) {
      case 'target': return renderTargetTab();
      case 'dpp': return renderPracticeTab();
      case 'mistakes': return renderMistakesTab();
      case 'focus': return renderFocusTab();
      default: return null;
    }
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-[#11121c]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Zap className="h-5 w-5 text-govt-300" aria-hidden="true" />
              Today
            </h2>
            <p className="text-sm text-navy-400">Your daily practice, all in one place</p>
          </div>
          {!compact && (
            <div role="img" aria-label={`${tasksDone} of ${tasksTotal} daily tasks done`} className="relative h-9 w-9 shrink-0">
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="currentColor"
                  strokeWidth="3" strokeDasharray={`${(progressPct / 100) * 94.2} 94.2`}
                  className="text-govt-400 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-2xs font-bold text-white">
                {tasksDone}/{tasksTotal}
              </span>
            </div>
          )}
        </div>

        {!compact && (
          <div className="mb-4">
            <Progress value={progressPct} className="h-1.5" indicatorClassName="bg-govt-500" />
          </div>
        )}

        <div
          role="tablist"
          aria-label="Daily practice options"
          className="mb-4 flex gap-1.5 overflow-x-auto rounded-lg bg-white/5 p-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.key === activeDef.key;
            return (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[tab.key] = el; }}
                type="button"
                role="tab"
                id={`today-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls="today-panel-content"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govt-400',
                  selected ? 'bg-govt-500/20 text-govt-300' : 'text-navy-400 hover:text-white',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          key={activeDef.key}
          role="tabpanel"
          id="today-panel-content"
          aria-labelledby={`today-tab-${activeDef.key}`}
          className="animate-fade-in rounded-lg border border-white/10 bg-white/5 p-4"
        >
          {renderActiveTab()}
        </div>

        {!compact && (
          <div className="mt-4 flex items-start gap-2 text-xs text-navy-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
            <p>
              Questions are chosen from your weakest chapters based on past attempts. Daily practice
              keeps your mastery scores fresh and your belts moving.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
