import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { AdminIntegrityAttemptPanel } from '@/pages/admin/AdminIntegrityAttemptPanel';
import { AdminIntegrityRetentionCard } from '@/components/admin/IntegrityRetentionCard';

interface AttemptRow {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  mock_test_id: string;
  mock_test: { title: string } | null;
}

interface EventRow {
  attempt_id: string;
  event_type: string;
  occurred_at: string;
}

interface MockOption {
  id: string;
  title: string;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none';

export function AdminIntegrityPage() {
  const [eventType, setEventType] = useState('');
  const [minCount, setMinCount] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [mockId, setMockId] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const { data: mocks = [] } = useQuery({
    queryKey: ['admin-integrity-mocks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mock_tests').select('id, title').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MockOption[];
    },
  });

  const { data: attempts, isLoading, isError } = useQuery({
    queryKey: ['admin-integrity-attempts', mockId, fromDate],
    queryFn: async () => {
      let query = supabase
        .from('attempts')
        .select('id, user_id, status, started_at, mock_test_id, mock_test:mock_tests(title)')
        .order('started_at', { ascending: false })
        .limit(200);
      if (mockId) query = query.eq('mock_test_id', mockId);
      if (fromDate) query = query.gte('started_at', new Date(fromDate).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AttemptRow[];
    },
  });

  const attemptIds = useMemo(() => (attempts ?? []).map((a) => a.id), [attempts]);

  const { data: events = [], isError: eventsError } = useQuery({
    queryKey: ['admin-integrity-events', attemptIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_events')
        .select('attempt_id, event_type, occurred_at')
        .in('attempt_id', attemptIds);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    enabled: attemptIds.length > 0,
  });

  const eventTypes = useMemo(() => Array.from(new Set(events.map((e) => e.event_type))).sort(), [events]);

  const rows = useMemo(() => {
    const byAttempt = new Map<string, Record<string, number>>();
    for (const event of events) {
      const counts = byAttempt.get(event.attempt_id) ?? {};
      counts[event.event_type] = (counts[event.event_type] ?? 0) + 1;
      byAttempt.set(event.attempt_id, counts);
    }
    return (attempts ?? []).map((attempt) => {
      const counts = byAttempt.get(attempt.id) ?? {};
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      const matching = eventType ? (counts[eventType] ?? 0) : total;
      return { attempt, counts, total, matching };
    }).filter((row) => row.matching >= minCount && row.matching > 0);
  }, [attempts, events, eventType, minCount]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Integrity Review</h1>
          <p className="text-sm text-navy-500">
            Review logged exam events. Events are records to look at, not findings. No penalty is applied automatically.
          </p>
        </div>

        <AdminIntegrityRetentionCard />

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-4">
            <label className="space-y-1.5 text-sm font-medium text-navy-700">
              Event type
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={INPUT_CLASS}>
                <option value="">All types</option>
                {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-navy-700">
              Minimum events
              <input type="number" min={1} value={minCount} onChange={(e) => setMinCount(Math.max(1, Number(e.target.value) || 1))} className={INPUT_CLASS} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-navy-700">
              Started on or after
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={INPUT_CLASS} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-navy-700">
              Mock
              <select value={mockId} onChange={(e) => setMockId(e.target.value)} className={INPUT_CLASS}>
                <option value="">All mocks</option>
                {mocks.map((mock) => <option key={mock.id} value={mock.id}>{mock.title}</option>)}
              </select>
            </label>
          </CardContent>
        </Card>

        {isError || eventsError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load integrity events. Refresh the page to try again.
          </div>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-navy-500">No attempts match these filters.</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                  <tr>
                    <th className="px-4 py-3">Mock</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Events by type</th>
                    <th className="px-4 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {rows.map(({ attempt, counts, total }) => (
                    <tr key={attempt.id} className={selectedAttemptId === attempt.id ? 'bg-govt-50' : undefined}>
                      <td className="px-4 py-3 font-medium text-navy-800">{attempt.mock_test?.title ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-navy-500">{attempt.user_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3"><Badge variant={attempt.status === 'SUBMITTED' ? 'success' : 'warning'}>{attempt.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-navy-500">{new Date(attempt.started_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-navy-700">
                        {total === 0 ? '—' : Object.entries(counts).map(([type, n]) => `${type}: ${n}`).join(' · ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAttemptId(attempt.id)}
                          className="rounded-lg border border-navy-300 px-3 py-1 text-xs font-medium text-navy-700 hover:border-govt-500"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {selectedAttemptId && (
          <AdminIntegrityAttemptPanel
            attemptId={selectedAttemptId}
            events={events.filter((e) => e.attempt_id === selectedAttemptId)}
            attemptStartedAt={attempts?.find((a) => a.id === selectedAttemptId)?.started_at ?? null}
            onClose={() => setSelectedAttemptId(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
