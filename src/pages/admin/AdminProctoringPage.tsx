import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { Activity, Clock, ShieldCheck } from 'lucide-react';

interface ProctoringAttempt {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  is_untimed: boolean;
  mock_test: { title: string; mode: string } | null;
}

const CARD_CLASS = 'border-white/10 bg-[#11121c]';

export function AdminProctoringPage() {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-proctoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempts')
        .select('id, user_id, status, started_at, submitted_at, is_untimed, mock_test:mock_test_id(title, mode)')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as ProctoringAttempt[];
    },
    staleTime: 60_000,
  });

  const attemptIds = (attempts || []).map((a) => a.id);
  const { data: switchCounts } = useQuery({
    queryKey: ['admin-proctoring-switches', attemptIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_events')
        .select('attempt_id')
        .eq('event_type', 'WINDOW_SWITCH')
        .in('attempt_id', attemptIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) counts[row.attempt_id] = (counts[row.attempt_id] ?? 0) + 1;
      return counts;
    },
    enabled: attemptIds.length > 0,
    staleTime: 60_000,
  });

  const list = attempts || [];
  const submittedCount = list.filter((a) => a.status === 'SUBMITTED').length;
  const inProgressCount = list.filter((a) => a.status === 'IN_PROGRESS').length;
  const untimedCount = list.filter((a) => a.is_untimed).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Proctoring</h1>
          <p className="text-sm text-navy-400">Review attempt integrity, timer modes, and submission patterns for the latest 50 attempts.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className={CARD_CLASS}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold text-white">{submittedCount}</p><p className="text-xs text-navy-400">Submitted</p></div>
            </CardContent>
          </Card>
          <Card className={CARD_CLASS}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><Activity className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold text-white">{inProgressCount}</p><p className="text-xs text-navy-400">In Progress</p></div>
            </CardContent>
          </Card>
          <Card className={CARD_CLASS}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/10 text-govt-300"><Clock className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold text-white">{untimedCount}</p><p className="text-xs text-navy-400">Untimed</p></div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.length === 0 ? (
          <Card className={CARD_CLASS}>
            <CardContent className="py-12 text-center text-sm text-navy-400">No attempts recorded yet.</CardContent>
          </Card>
        ) : (
          <Card className={CARD_CLASS}>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-white/[.03] text-left text-xs uppercase text-navy-400">
                  <tr>
                    <th className="px-4 py-3">Mock</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Timer Mode</th>
                    <th className="px-4 py-3">Window switches</th>
                    <th className="px-4 py-3">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {list.map((att) => (
                    <tr key={att.id} className="hover:bg-white/[.02]">
                      <td className="px-4 py-3 font-medium text-white">{att.mock_test?.title || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-navy-400">{att.user_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <Badge variant={att.status === 'SUBMITTED' ? 'success' : 'warning'}>{att.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {att.is_untimed ? <span className="text-emerald-300">Untimed</span> : <span className="text-navy-400">Standard</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(switchCounts?.[att.id] ?? 0) > 0
                          ? <span className="font-semibold text-amber-300">{switchCounts?.[att.id]}</span>
                          : <span className="text-navy-500">0</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-400">{new Date(att.started_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
