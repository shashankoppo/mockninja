import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  RefreshCw, Search, CheckCircle2, XCircle, Clock, AlertCircle,
  RotateCcw, TrendingUp, DollarSign, Receipt, X, Eye,
} from 'lucide-react';

interface Transaction {
  id: string;
  invoice_number: string;
  user_id: string;
  plan_id: string | null;
  amount_inr: number;
  original_amount_inr: number;
  discount_inr: number;
  status: string;
  payment_method: string | null;
  failure_reason: string | null;
  refund_amount_inr: number;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  plan?: { name: string } | null;
  user?: { email: string; full_name: string | null } | null;
  promo?: { code: string } | null;
}

interface RefundRequest {
  id: string;
  transaction_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  transaction?: { invoice_number: string; amount_inr: number } | null;
  user?: { email: string; full_name: string | null } | null;
}

type StatusFilter = 'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUND_PENDING' | 'REFUNDED';

const statusConfig: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }> = {
  SUCCESS: { label: 'Success', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
  PENDING: { label: 'Pending', variant: 'warning' },
  REFUND_PENDING: { label: 'Refund Pending', variant: 'warning' },
  REFUNDED: { label: 'Refunded', variant: 'neutral' },
};

export function AdminTransactionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [refundView, setRefundView] = useState<RefundRequest | null>(null);
  const [refundNote, setRefundNote] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin-transactions', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('id, invoice_number, user_id, plan_id, amount_inr, original_amount_inr, discount_inr, status, payment_method, failure_reason, refund_amount_inr, refund_reason, refunded_at, created_at, plan:plan_id(name), user:user_id(email, full_name), promo:promo_code_id(code)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'ALL') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        plan: row.plan?.[0] ?? null,
        user: row.user?.[0] ?? null,
        promo: row.promo?.[0] ?? null,
      })) as Transaction[];
    },
  });

  const { data: refundRequests, isLoading: refundsLoading } = useQuery({
    queryKey: ['admin-refund-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_requests')
        .select('id, transaction_id, user_id, reason, status, admin_note, created_at, transaction:transaction_id(invoice_number, amount_inr), user:user_id(email, full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        transaction: row.transaction?.[0] ?? null,
        user: row.user?.[0] ?? null,
      })) as RefundRequest[];
    },
  });

  const filtered = (transactions || []).filter((t) => {
    if (!search) return true;
    const email = (t.user as { email?: string })?.email?.toLowerCase() || '';
    const inv = t.invoice_number?.toLowerCase() || '';
    return email.includes(search.toLowerCase()) || inv.includes(search.toLowerCase());
  });

  const totalRevenue = (transactions || []).filter((t) => t.status === 'SUCCESS').reduce((s, t) => s + t.amount_inr, 0);
  const successCount = (transactions || []).filter((t) => t.status === 'SUCCESS').length;
  const failedCount = (transactions || []).filter((t) => t.status === 'FAILED').length;
  const refundPending = (transactions || []).filter((t) => t.status === 'REFUND_PENDING').length;
  const openRefunds = (refundRequests || []).filter((r) => r.status === 'OPEN').length;

  const approveRefund = async (rr: RefundRequest) => {
    setActioningId(rr.id);
    const { error: rrError } = await supabase.from('refund_requests').update({
      status: 'APPROVED',
      admin_note: refundNote || null,
      processed_by: user?.id,
      processed_at: new Date().toISOString(),
    }).eq('id', rr.id);
    if (rrError) { toast.error(rrError.message); setActioningId(null); return; }

    const { error: txnError } = await supabase.from('transactions').update({
      status: 'REFUNDED',
      refunded_at: new Date().toISOString(),
      refunded_by: user?.id,
    }).eq('id', rr.transaction_id);
    setActioningId(null);
    if (txnError) { toast.error(txnError.message); return; }
    toast.success('Refund approved and transaction marked as refunded');
    setRefundView(null);
    setRefundNote('');
    queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
    queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
  };

  const rejectRefund = async (rr: RefundRequest) => {
    setActioningId(rr.id);
    const { error } = await supabase.from('refund_requests').update({
      status: 'REJECTED',
      admin_note: refundNote || null,
      processed_by: user?.id,
      processed_at: new Date().toISOString(),
    }).eq('id', rr.id);
    setActioningId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Refund request rejected');
    setRefundView(null);
    setRefundNote('');
    queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
  };

  const markFailed = async (txn: Transaction) => {
    setActioningId(txn.id);
    const { error } = await supabase.from('transactions').update({ status: 'FAILED', failure_reason: 'Marked as failed by admin' }).eq('id', txn.id);
    setActioningId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Transaction marked as failed');
    queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
  };

  const statusFilters: StatusFilter[] = ['ALL', 'SUCCESS', 'FAILED', 'PENDING', 'REFUND_PENDING', 'REFUNDED'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions & Refunds</h1>
          <p className="text-sm text-navy-400">Full visibility into payments, coupon redemptions, revenue, and refund requests.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><DollarSign className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">₹{totalRevenue}</p><p className="text-xs text-navy-400">Revenue</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/10 text-govt-300"><TrendingUp className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{successCount}</p><p className="text-xs text-navy-400">Successful</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibe-500/10 text-vibe-300"><XCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{failedCount}</p><p className="text-xs text-navy-400">Failed</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><RotateCcw className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{refundPending}</p><p className="text-xs text-navy-400">Refund Pending</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300"><AlertCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{openRefunds}</p><p className="text-xs text-navy-400">Open Requests</p></div></div></CardContent></Card>
        </div>

        {/* Refund requests section */}
        {(refundRequests || []).filter((r) => r.status === 'OPEN').length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/[.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                Pending Refund Requests ({(refundRequests || []).filter((r) => r.status === 'OPEN').length})
              </CardTitle>
              <CardDescription className="text-navy-400">Review and approve or reject student refund requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(refundRequests || []).filter((r) => r.status === 'OPEN').map((rr) => (
                <div key={rr.id} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{(rr.user as { full_name?: string })?.full_name || 'Student'}</span>
                        <span className="text-xs text-navy-400">{(rr.user as { email?: string })?.email}</span>
                        <span className="text-xs text-navy-500">· {(rr.transaction as { invoice_number?: string })?.invoice_number}</span>
                        <span className="text-xs text-navy-500">· ₹{(rr.transaction as { amount_inr?: number })?.amount_inr}</span>
                      </div>
                      <p className="mt-2 text-sm text-navy-200">{rr.reason}</p>
                      <p className="mt-1 text-xs text-navy-500">Submitted: {new Date(rr.created_at).toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setRefundView(rr); setRefundNote(''); }}>
                      <Eye className="h-4 w-4" /> Review
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Transactions table */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-white">All Transactions</CardTitle>
                <CardDescription className="text-navy-400">{filtered.length} transactions</CardDescription>
              </div>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
                <input
                  type="text"
                  placeholder="Search invoice or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[.04] py-2 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === s ? 'bg-govt-500 text-white' : 'bg-white/5 text-navy-300 hover:bg-white/10',
                  )}
                >
                  {s === 'ALL' ? 'All' : statusConfig[s]?.label || s}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="mx-auto h-10 w-10 text-navy-600" />
                <p className="mt-3 text-sm text-navy-400">No transactions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase text-navy-400">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Promo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((txn) => {
                      const sc = statusConfig[txn.status] || statusConfig.PENDING;
                      return (
                        <tr key={txn.id} className="hover:bg-white/[.02]">
                          <td className="px-4 py-3 font-mono text-xs text-navy-200">{txn.invoice_number}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white">{(txn.user as { full_name?: string })?.full_name || '—'}</p>
                            <p className="text-xs text-navy-500">{(txn.user as { email?: string })?.email || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-navy-200">{(txn.plan as { name?: string })?.name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">₹{txn.amount_inr}</span>
                            {txn.discount_inr > 0 && <span className="ml-1 text-xs text-emerald-300">(-₹{txn.discount_inr})</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-300">{(txn.promo as { code?: string })?.code || '—'}</td>
                          <td className="px-4 py-3"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                          <td className="px-4 py-3 text-xs text-navy-400">{new Date(txn.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTxn(txn)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {txn.status === 'PENDING' && (
                                <Button variant="ghost" size="sm" onClick={() => markFailed(txn)} loading={actioningId === txn.id}>
                                  <XCircle className="h-4 w-4 text-vibe-300" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction detail modal */}
        {selectedTxn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-lg border-white/15 bg-[#15161f]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Transaction Details</CardTitle>
                  <button onClick={() => setSelectedTxn(null)} className="text-navy-400 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DetailRow label="Invoice" value={selectedTxn.invoice_number} />
                <DetailRow label="Student" value={`${(selectedTxn.user as { full_name?: string })?.full_name || '—'} (${(selectedTxn.user as { email?: string })?.email || ''})`} />
                <DetailRow label="Plan" value={(selectedTxn.plan as { name?: string })?.name || '—'} />
                <DetailRow label="Original Amount" value={`₹${selectedTxn.original_amount_inr}`} />
                <DetailRow label="Discount" value={`₹${selectedTxn.discount_inr}`} />
                <DetailRow label="Final Amount" value={`₹${selectedTxn.amount_inr}`} />
                <DetailRow label="Payment Method" value={selectedTxn.payment_method || '—'} />
                <DetailRow label="Status" value={selectedTxn.status} />
                {selectedTxn.promo && <DetailRow label="Promo Code" value={(selectedTxn.promo as { code?: string })?.code || '—'} />}
                {selectedTxn.failure_reason && <DetailRow label="Failure Reason" value={selectedTxn.failure_reason} />}
                {selectedTxn.refund_reason && <DetailRow label="Refund Reason" value={selectedTxn.refund_reason} />}
                {selectedTxn.refunded_at && <DetailRow label="Refunded At" value={new Date(selectedTxn.refunded_at).toLocaleString()} />}
                <DetailRow label="Date" value={new Date(selectedTxn.created_at).toLocaleString()} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Refund review modal */}
        {refundView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-lg border-white/15 bg-[#15161f]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Review Refund Request</CardTitle>
                  <button onClick={() => setRefundView(null)} className="text-navy-400 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <DetailRow label="Student" value={(refundView.user as { full_name?: string })?.full_name || '—'} />
                  <DetailRow label="Email" value={(refundView.user as { email?: string })?.email || ''} />
                  <DetailRow label="Invoice" value={(refundView.transaction as { invoice_number?: string })?.invoice_number || ''} />
                  <DetailRow label="Amount" value={`₹${(refundView.transaction as { amount_inr?: number })?.amount_inr || 0}`} />
                  <div>
                    <p className="text-xs font-medium text-navy-400">Reason</p>
                    <p className="mt-1 rounded-lg bg-white/[.03] p-3 text-sm text-white">{refundView.reason}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-400">Admin Note (optional)</label>
                  <textarea
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note for internal reference..."
                    className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setRefundView(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => rejectRefund(refundView)} loading={actioningId === refundView.id}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button variant="success" onClick={() => approveRefund(refundView)} loading={actioningId === refundView.id}>
                    <CheckCircle2 className="h-4 w-4" /> Approve Refund
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy-400">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
