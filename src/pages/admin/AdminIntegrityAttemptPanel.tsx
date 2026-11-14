import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type ReviewStatus = 'NONE' | 'NOTED' | 'FOLLOW_UP';

interface IntegrityEvent {
  event_type: string;
  occurred_at: string;
}

interface ReviewNote {
  id: string;
  reviewer_id: string;
  status: ReviewStatus;
  note: string;
  created_at: string;
}

interface AdminIntegrityAttemptPanelProps {
  attemptId: string;
  events: IntegrityEvent[];
  attemptStartedAt: string | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  NONE: 'No action',
  NOTED: 'Noted',
  FOLLOW_UP: 'Follow up',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none';

function formatOffset(occurredAt: string, startedAt: string | null): string {
  if (!startedAt) return new Date(occurredAt).toLocaleTimeString();
  const seconds = Math.max(0, Math.round((new Date(occurredAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `+${mins}:${secs}`;
}

export function AdminIntegrityAttemptPanel({ attemptId, events, attemptStartedAt, onClose }: AdminIntegrityAttemptPanelProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus>('NOTED');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: notes = [], isError: notesError } = useQuery({
    queryKey: ['admin-integrity-reviews', attemptId],
    queryFn: async () => {
      const { data, error: notesQueryError } = await supabase
        .from('integrity_reviews')
        .select('id, reviewer_id, status, note, created_at')
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: false });
      if (notesQueryError) throw notesQueryError;
      return (data ?? []) as ReviewNote[];
    },
  });

  const sortedEvents = [...events].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const handleAddNote = async () => {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_add_integrity_review', {
      p_attempt_id: attemptId,
      p_status: status,
      p_note: note,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNote('');
    toast.success('Review note saved');
    queryClient.invalidateQueries({ queryKey: ['admin-integrity-reviews', attemptId] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Attempt timeline</CardTitle>
          <CardDescription>Events are shown against the time since the attempt started.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-navy-800">Events</h2>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-navy-500">No events recorded for this attempt.</p>
          ) : (
            <ol className="space-y-2">
              {sortedEvents.map((event, index) => (
                <li key={`${event.occurred_at}-${index}`} className="flex items-center gap-3 rounded-lg bg-navy-50 px-3 py-2 text-sm">
                  <span className="w-20 font-mono text-xs text-navy-500">{formatOffset(event.occurred_at, attemptStartedAt)}</span>
                  <span className="font-medium text-navy-800">{event.event_type}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-navy-800">Review notes</h2>
          <p className="text-xs text-navy-500">Notes are kept as a history. Students cannot see them.</p>

          <div className="space-y-3 rounded-lg border border-navy-200 p-4">
            <label className="block space-y-1.5 text-sm font-medium text-navy-700">
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus)} className={INPUT_CLASS}>
                {(Object.keys(STATUS_LABELS) as ReviewStatus[]).map((key) => (
                  <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-navy-700">
              Note
              <textarea
                value={note}
                maxLength={1000}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end">
              <Button onClick={handleAddNote} disabled={saving}>{saving ? 'Saving...' : 'Add note'}</Button>
            </div>
          </div>

          {notesError ? (
            <p role="alert" className="text-sm text-red-700">Could not load review notes.</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-navy-500">No review notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((item) => (
                <li key={item.id} className="rounded-lg border border-navy-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-navy-500">
                    <span className="font-semibold text-navy-800">{STATUS_LABELS[item.status]}</span>
                    <span>{new Date(item.created_at).toLocaleString()} · reviewer {item.reviewer_id.slice(0, 8)}</span>
                  </div>
                  {item.note && <p className="mt-2 whitespace-pre-wrap text-navy-700">{item.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
