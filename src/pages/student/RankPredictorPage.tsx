import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

type RankEstimate =
  | { state: 'locked' }
  | { state: 'not_ready' }
  | { state: 'insufficient_cohort'; cohort_size: number; min_cohort: number }
  | { state: 'ready'; score: number; cohort_size: number; min_cohort: number; percentile: number };

function isRankEstimate(value: unknown): value is RankEstimate {
  if (!value || typeof value !== 'object') return false;
  const state = (value as { state?: unknown }).state;
  return state === 'locked' || state === 'not_ready' || state === 'insufficient_cohort' || state === 'ready';
}

export function RankPredictorPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<RankEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_rank_estimate', { p_attempt_id: attemptId });
      if (cancelled) return;
      if (rpcError || !isRankEstimate(data)) {
        setError('We could not load your rank estimate. Please try again.');
      } else {
        setEstimate(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/results/${attemptId}`)}>
          Back to results
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Rank predictor</CardTitle>
            <CardDescription>
              This is an estimate from Mock Ninja practice tests, not an official JEE rank. It shows how your score compares with other students who took the same test on Mock Ninja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <Skeleton className="h-32 w-full" />}

            {!loading && error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && estimate?.state === 'locked' && (
              <div className="space-y-3">
                <p className="text-sm text-navy-600">The rank predictor is available on paid plans.</p>
                <Button variant="primary" size="sm" onClick={() => navigate('/pricing')}>
                  View plans
                </Button>
              </div>
            )}

            {!loading && !error && estimate?.state === 'not_ready' && (
              <p className="text-sm text-navy-600">Your estimate appears once this test has been submitted and graded.</p>
            )}

            {!loading && !error && estimate?.state === 'insufficient_cohort' && (
              <p className="text-sm text-navy-600">
                Not enough students have taken this test yet. An estimate needs at least {estimate.min_cohort} students
                ({estimate.cohort_size} so far).
              </p>
            )}

            {!loading && !error && estimate?.state === 'ready' && (
              <div className="space-y-2">
                <p className="text-sm text-navy-600">Your score</p>
                <p className="text-3xl font-semibold text-navy-900">{estimate.score}</p>
                <p className="text-sm text-navy-600">
                  Estimated to be ahead of about {estimate.percentile}% of the {estimate.cohort_size} students who took this test on Mock Ninja.
                </p>
                <p className="text-xs text-navy-400">
                  This is not a promise of any rank in an official exam.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
