import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

interface JobRow {
  id: string;
  question_type: 'MCQ' | 'NUMERICAL';
  difficulty: string;
  requested_count: number;
  provider: string;
  model: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  created_count: number;
  skipped_count: number;
  cost_paise: number;
  error_message: string | null;
  created_at: string;
  chapter: { name: string } | null;
}

const STATUS_LABELS: Record<JobRow['status'], string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
};

const STATUS_CLASSES: Record<JobRow['status'], string> = {
  QUEUED: 'bg-navy-100 text-navy-800',
  RUNNING: 'bg-govt-100 text-govt-800',
  SUCCEEDED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function AiJobsTable() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-ai-jobs'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('ai_generation_jobs')
        .select('id, question_type, difficulty, requested_count, provider, model, status, created_count, skipped_count, cost_paise, error_message, created_at, chapter:chapter_id(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (rows ?? []) as unknown as JobRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generation jobs</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && (
          <ErrorState
            title="Could not load generation jobs"
            action={<button className="text-sm font-medium text-govt-600 underline" onClick={() => refetch()}>Try again</button>}
          />
        )}
        {data && data.length === 0 && (
          <EmptyState title="No jobs yet" description="Each generation request appears here with its outcome." />
        )}
        {data && data.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-navy-500">
              <tr>
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Chapter</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 text-right font-medium">Saved</th>
                <th className="py-2 pr-4 text-right font-medium">Skipped</th>
                <th className="py-2 pr-4 font-medium">Model</th>
                <th className="py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.map((job) => (
                <tr key={job.id} className="border-t border-navy-100 align-top text-navy-800">
                  <td className="py-2 pr-4">{new Date(job.created_at).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-4">
                    {job.chapter?.name ?? 'Unknown chapter'}
                    <span className="block text-xs text-navy-500">
                      {job.question_type === 'MCQ' ? 'Single choice' : 'Numerical'} · {job.difficulty.toLowerCase()} · {job.requested_count} requested
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                    {job.error_message && <span className="block pt-1 text-xs text-red-700">{job.error_message}</span>}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{job.created_count}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{job.skipped_count}</td>
                  <td className="py-2 pr-4">{job.provider} · {job.model}</td>
                  <td className="py-2 text-right tabular-nums">{formatRupees(job.cost_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
