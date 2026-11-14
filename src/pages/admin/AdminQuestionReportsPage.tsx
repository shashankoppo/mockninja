import { useState } from 'react';
import { ClipboardCheck, RefreshCw, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type ReportStatus = 'ALL' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

type QuestionReport = {
  id: string;
  user_id: string;
  question_id: string;
  attempt_id: string | null;
  mock_test_id: string | null;
  reason: string;
  details: string;
  status: Exclude<ReportStatus, 'ALL'>;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

const statusOptions: ReportStatus[] = ['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];

const statusVariant: Record<Exclude<ReportStatus, 'ALL'>, 'warning' | 'success' | 'error' | 'neutral'> = {
  OPEN: 'error',
  IN_REVIEW: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

export function AdminQuestionReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('OPEN');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: Exclude<ReportStatus, 'ALL'>; admin_note: string }>>({});

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['admin-question-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('question_reports')
        .select('id, user_id, question_id, attempt_id, mock_test_id, reason, details, status, admin_note, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'ALL') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QuestionReport[];
    },
  });

  const getDraft = (report: QuestionReport) => drafts[report.id] || { status: report.status, admin_note: report.admin_note || '' };

  const updateDraft = (report: QuestionReport, patch: Partial<{ status: Exclude<ReportStatus, 'ALL'>; admin_note: string }>) => {
    setDrafts((current) => ({ ...current, [report.id]: { ...getDraft(report), ...patch } }));
  };

  const saveReport = async (report: QuestionReport) => {
    const draft = getDraft(report);
    setSavingId(report.id);
    const { error } = await supabase.rpc('update_question_report', {
      p_report_id: report.id,
      p_status: draft.status,
      p_admin_note: draft.admin_note || null,
    });
    setSavingId(null);
    if (error) {
      toast.error('Could not update this report. Please try again.');
      return;
    }
    toast.success('Question report updated.');
    setDrafts((current) => {
      const next = { ...current };
      delete next[report.id];
      return next;
    });
    await queryClient.invalidateQueries({ queryKey: ['admin-question-reports'] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.16em] text-govt-300">Quality control</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Question reports</h1>
            <p className="mt-1 text-sm text-navy-300">Review student feedback about incorrect, ambiguous, or broken questions.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', statusFilter === status ? 'bg-govt-500 text-white' : 'bg-white/10 text-navy-300 hover:bg-white/15 hover:text-white')}>
              {status === 'ALL' ? 'All reports' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="space-y-4">
            {(reports || []).map((report) => {
              const draft = getDraft(report);
              return (
                <Card key={report.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><ClipboardCheck className="h-5 w-5" /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant[report.status]}>{report.status.replace('_', ' ')}</Badge><span className="text-xs font-semibold text-navy-300">{report.reason.replace('_', ' ')}</span></div>
                          <p className="mt-1 text-xs text-navy-500">Submitted {new Date(report.created_at).toLocaleString()} · Student {report.user_id.slice(0, 8)}…</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-navy-500">Question {report.question_id.slice(0, 8)}…</span>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-6 text-navy-100">{report.details}</div>
                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                      <label className="text-xs font-medium text-navy-300">Status<select value={draft.status} onChange={(event) => updateDraft(report, { status: event.target.value as Exclude<ReportStatus, 'ALL'> })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"><option value="OPEN" className="bg-navy-900">Open</option><option value="IN_REVIEW" className="bg-navy-900">In review</option><option value="RESOLVED" className="bg-navy-900">Resolved</option><option value="DISMISSED" className="bg-navy-900">Dismissed</option></select></label>
                      <label className="text-xs font-medium text-navy-300">Admin note<textarea value={draft.admin_note} onChange={(event) => updateDraft(report, { admin_note: event.target.value })} rows={2} maxLength={2000} placeholder="Add an internal review note…" className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-navy-500" /></label>
                      <Button variant="primary" size="sm" onClick={() => saveReport(report)} disabled={savingId === report.id}><Save className="h-4 w-4" /> {savingId === report.id ? 'Saving…' : 'Save'}</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!reports || reports.length === 0) && <Card><CardContent className="flex flex-col items-center p-10 text-center"><ClipboardCheck className="h-10 w-10 text-emerald-300" /><p className="mt-3 font-semibold text-white">No reports in this view</p><p className="mt-1 text-sm text-navy-400">New student feedback will appear here automatically.</p></CardContent></Card>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
