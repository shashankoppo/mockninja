import { useMemo, useState } from 'react';
import { MessageSquareText, RefreshCw, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type RatingFilter = 'ALL' | '1' | '2' | '3' | '4' | '5';

type TestFeedback = {
  id: string;
  user_id: string;
  attempt_id: string;
  mock_test_id: string;
  rating: number;
  review: string | null;
  feedback: string | null;
  created_at: string;
  mock_test: { title: string } | null;
};

const ratingFilters: RatingFilter[] = ['ALL', '5', '4', '3', '2', '1'];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn('h-4 w-4', star <= rating ? 'fill-amber-300 text-amber-300' : 'text-navy-600')} />
      ))}
    </span>
  );
}

export function AdminTestFeedbackPage() {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('ALL');
  const { data: feedback, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-test-feedback', ratingFilter],
    queryFn: async () => {
      let query = supabase
        .from('test_feedback')
        .select('id, user_id, attempt_id, mock_test_id, rating, review, feedback, created_at, mock_test:mock_test_id(title)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (ratingFilter !== 'ALL') query = query.eq('rating', Number(ratingFilter));
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TestFeedback[];
    },
  });

  const summary = useMemo(() => {
    const rows = feedback || [];
    return {
      count: rows.length,
      average: rows.length ? (rows.reduce((total, row) => total + row.rating, 0) / rows.length).toFixed(1) : '—',
    };
  }, [feedback]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.16em] text-govt-300">Student voice</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Test feedback</h1>
            <p className="mt-1 text-sm text-navy-300">See what students think after completing a mock test.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /> Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-navy-400">Responses</p><p className="mt-1 text-2xl font-bold text-white">{summary.count}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-navy-400">Average rating</p><div className="mt-1 flex items-center gap-2"><p className="text-2xl font-bold text-white">{summary.average}</p>{summary.average !== '—' && <Stars rating={Math.round(Number(summary.average))} />}</div></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {ratingFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setRatingFilter(filter)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', ratingFilter === filter ? 'bg-govt-500 text-white' : 'bg-white/10 text-navy-300 hover:bg-white/15 hover:text-white')}
            >
              {filter === 'ALL' ? 'All ratings' : `${filter} stars`}
            </button>
          ))}
        </div>

        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <Card><CardContent className="p-8 text-center"><p className="font-semibold text-white">Feedback could not be loaded</p><p className="mt-1 text-sm text-navy-400">Refresh the page and try again.</p><Button className="mt-4" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></CardContent></Card>}
        {!isLoading && !isError && (
          <div className="space-y-4">
            {(feedback || []).map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><MessageSquareText className="h-5 w-5" /></div>
                      <div><div className="flex flex-wrap items-center gap-3"><Stars rating={item.rating} /><Badge variant={item.rating >= 4 ? 'success' : item.rating <= 2 ? 'error' : 'warning'}>{item.rating}/5</Badge></div><p className="mt-1 text-xs text-navy-500">{item.mock_test?.title || 'Mock test'} · {new Date(item.created_at).toLocaleString()}</p></div>
                    </div>
                    <span className="font-mono text-[10px] text-navy-500">Student {item.user_id.slice(0, 8)}…</span>
                  </div>
                  {item.review && <div><p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Review</p><p className="mt-1 text-sm leading-6 text-navy-100">{item.review}</p></div>}
                  {item.feedback && <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Additional feedback</p><p className="mt-1 text-sm leading-6 text-navy-100">{item.feedback}</p></div>}
                </CardContent>
              </Card>
            ))}
            {feedback?.length === 0 && <Card><CardContent className="flex flex-col items-center p-10 text-center"><MessageSquareText className="h-10 w-10 text-emerald-300" /><p className="mt-3 font-semibold text-white">No feedback in this view</p><p className="mt-1 text-sm text-navy-400">Student responses will appear here after mock submissions.</p></CardContent></Card>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
