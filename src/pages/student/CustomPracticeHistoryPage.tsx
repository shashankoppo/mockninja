import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type CustomSetRow = {
  id: string;
  mock_test_id: string;
  chapter_ids: number[];
  difficulty: string;
  question_count: number;
  created_at: string;
  mock_test: { title: string; total_marks: number } | null;
  attempts: { id: string; status: string; score: number | null; started_at: string | null; submitted_at: string | null }[];
};

const DIFFICULTY_LABEL: Record<string, string> = {
  ANY: 'Mixed',
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export function CustomPracticeHistoryPage() {
  const navigate = useNavigate();

  const { data: sets, isLoading, isError, refetch } = useQuery({
    queryKey: ['custom-practice-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_practice_sets')
        .select(
          'id, mock_test_id, chapter_ids, difficulty, question_count, created_at, mock_test:mock_test_id(title, total_marks), attempts(id, status, score, started_at, submitted_at)',
        )
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as CustomSetRow[];
    },
  });

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <button
          type="button"
          onClick={() => navigate('/dpp/custom')}
          className="inline-flex items-center gap-2 text-sm text-navy-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to practice builder
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Your custom practice tests</h1>
            <p className="text-sm text-navy-400">Every practice set you have built, with your latest attempt status.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-red-300">We could not load your practice history.</span>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (sets?.length ?? 0) === 0 && (
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-govt-500/15">
                <Sparkles className="h-6 w-6 text-govt-300" />
              </div>
              <p className="text-sm text-navy-300">You have not built any custom practice tests yet.</p>
              <Button onClick={() => navigate('/dpp/custom')}>Build your first test</Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (sets?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {sets!.map((s) => {
              const attempt = s.attempts?.[0] ?? null;
              const totalMarks = s.mock_test?.total_marks ?? 0;
              const status = attempt?.status;
              const statusVariant =
                status === 'SUBMITTED' ? 'success' : status === 'IN_PROGRESS' ? 'warning' : 'neutral';
              const scorePct =
                attempt?.score != null && totalMarks > 0
                  ? Math.round(((attempt.score as number) / totalMarks) * 100)
                  : null;
              return (
                <Card key={s.id} className="border-white/10 bg-[#11121c]">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {s.mock_test?.title ?? 'Custom practice test'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-400">
                          <span>{s.question_count} questions</span>
                          <span aria-hidden>·</span>
                          <span>{DIFFICULTY_LABEL[s.difficulty] ?? s.difficulty}</span>
                          <span aria-hidden>·</span>
                          <span>{s.chapter_ids.length} chapters</span>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(s.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status && (
                          <Badge variant={statusVariant as 'success' | 'warning' | 'neutral'}>{status}</Badge>
                        )}
                        {scorePct != null && (
                          <span className="text-sm font-semibold text-emerald-300">{scorePct}%</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {status === 'IN_PROGRESS' && attempt ? (
                        <Button size="sm" onClick={() => navigate(`/exam/${attempt.id}`)}>Resume</Button>
                      ) : status === 'SUBMITTED' && attempt ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/results/${attempt.id}`)}>
                          View result
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => navigate(`/mocks/${s.mock_test_id}`)}>Start test</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
