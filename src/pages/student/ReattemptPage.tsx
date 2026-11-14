import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, FileText, Target, BookOpen, ChevronRight, Info, Loader2, AlertCircle } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mistakeReattempt } from '@/lib/exam-api';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function ReattemptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: wrongCount } = useQuery({
    queryKey: ['wrong-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('responses')
        .select('question_id', { count: 'exact', head: true })
        .eq('is_correct', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: unattemptedCount } = useQuery({
    queryKey: ['unattempted-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: attempts } = await supabase
        .from('attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED');
      if (!attempts || attempts.length === 0) return 0;
      const attemptIds = attempts.map((a) => a.id);
      const { count } = await supabase
        .from('responses')
        .select('question_id', { count: 'exact', head: true })
        .in('attempt_id', attemptIds)
        .is('answer', null);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleRetryIncorrect = async () => {
    setError(null);
    setLoadingMode('retry');
    const result = await mistakeReattempt();
    setLoadingMode(null);
    if ('error' in result) {
      setError(result.error);
    } else {
      navigate(`/mocks/${result.mock_test_id}`);
    }
  };

  const handleFullRetake = async () => {
    setError(null);
    setLoadingMode('retake');
    const { data: attempts } = await supabase
      .from('attempts')
      .select('mock_test_id')
      .eq('user_id', user?.id)
      .eq('status', 'SUBMITTED')
      .order('submitted_at', { ascending: false })
      .limit(1);
    setLoadingMode(null);
    if (attempts && attempts.length > 0) {
      navigate(`/mocks/${attempts[0].mock_test_id}`);
    } else {
      setError('No previous attempts to retake.');
    }
  };

  const modes = [
    {
      icon: RotateCcw,
      title: 'Full Retake',
      desc: 'Take the entire test again from scratch. Creates a new attempt linked to the original.',
      color: 'border-govt-200 bg-govt-50',
      iconBg: 'bg-govt-600',
      action: handleFullRetake,
      loadingKey: 'retake',
      disabled: false,
    },
    {
      icon: Target,
      title: 'Retry Incorrect',
      desc: 'Re-attempt only the questions you got wrong last time.',
      color: 'border-red-200 bg-red-50',
      iconBg: 'bg-red-500',
      action: handleRetryIncorrect,
      loadingKey: 'retry',
      disabled: (wrongCount ?? 0) === 0,
      badge: `${wrongCount ?? 0} wrong`,
    },
    {
      icon: FileText,
      title: 'Practice Unanswered',
      desc: 'Practice the questions you did not attempt.',
      color: 'border-amber-200 bg-amber-50',
      iconBg: 'bg-amber-500',
      action: handleRetryIncorrect,
      loadingKey: 'unanswered',
      disabled: (unattemptedCount ?? 0) === 0,
      badge: `${unattemptedCount ?? 0} skipped`,
    },
    {
      icon: BookOpen,
      title: 'New Targeted Practice',
      desc: 'Get new questions from your weak chapters.',
      color: 'border-saffron-200 bg-saffron-50',
      iconBg: 'bg-saffron-600',
      action: handleRetryIncorrect,
      loadingKey: 'targeted',
      disabled: (wrongCount ?? 0) === 0,
      badge: `${wrongCount ?? 0} weak`,
    },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('reattempt.title') || 'Re-attempt'}</h1>
          <p className="text-sm text-navy-500">{t('reattempt.desc') || 'Revisit your mistakes and turn them into mastery.'}</p>
        </div>

        <Card className="border-govt-200 bg-govt-50">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="h-5 w-5 shrink-0 text-govt-600" />
            <p className="text-sm text-govt-800">
              Reattempts never overwrite your original attempt. Your first-attempt scores remain on the leaderboard.
              "Mastered on Reattempt" is tracked per question only.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((m) => {
            const Icon = m.icon;
            const isLoading = loadingMode === m.loadingKey;
            return (
              <Card key={m.title} className={cn('transition-[box-shadow] hover:shadow-md', m.color)}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', m.iconBg)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{m.title}</CardTitle>
                      <CardDescription>{m.desc}</CardDescription>
                    </div>
                    {m.badge && (
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-navy-600">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    fullWidth
                    disabled={m.disabled || isLoading}
                    onClick={m.action}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Building...
                      </>
                    ) : (
                      <>
                        Start <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
