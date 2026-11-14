import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

interface StudentIntegrityEvent {
  event_type: string;
  occurred_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  WINDOW_SWITCH: 'Switched to another window or tab',
};

function formatOffset(occurredAt: string, startedAt: string): string {
  const seconds = Math.max(0, Math.round((new Date(occurredAt).getTime() - new Date(startedAt).getTime()) / 1000));
  return `+${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

interface IntegrityEventsCardProps {
  attemptId: string;
  attemptStartedAt: string;
}

export function IntegrityEventsCard({ attemptId, attemptStartedAt }: IntegrityEventsCardProps) {
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['exam-integrity-events', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_events')
        .select('event_type, occurred_at')
        .eq('attempt_id', attemptId)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StudentIntegrityEvent[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity log for this attempt</CardTitle>
        <CardDescription>
          Events recorded during the exam, shown with the time since the exam started. These are logged for review only. They are not a finding, and no penalty is applied.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p role="alert" className="text-sm text-red-700">Could not load the activity log. Refresh the page to try again.</p>
        ) : !events || events.length === 0 ? (
          <p className="text-sm text-navy-500">No events were recorded for this attempt.</p>
        ) : (
          <ol className="space-y-2">
            {events.map((event, index) => (
              <li key={`${event.occurred_at}-${index}`} className="flex items-center gap-3 rounded-lg bg-navy-50 px-3 py-2 text-sm">
                <span className="w-20 font-mono text-xs text-navy-500">{formatOffset(event.occurred_at, attemptStartedAt)}</span>
                <span className="text-navy-800">{EVENT_LABELS[event.event_type] ?? event.event_type}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
