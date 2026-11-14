import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  RefreshCw, AlertCircle, Clock, CheckCircle2, XCircle, Search,
  TrendingUp, DollarSign, Ban, Activity, Zap, Eye, X, ArrowRight,
} from 'lucide-react';

interface ReconciliationTxn {
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
  created_at: string;
  plan?: { name: string } | null;
  user?: { email: string; full_name: string | null } | null;
}

type FilterType = 'STALE_PENDING' | 'FAILED' | 'DISCREPANCIES' | 'ALL';

export function AdminReconciliationPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('STALE_PENDING');
  const [search, setSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<ReconciliationTxn | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin-reconciliation', filter],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('id, invoice_number, user_id, plan_id, amount_inr, original_amount_inr, discount_inr, status, payment_method, failure_reason, created_at, plan:plan_id(name), user:user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filter === 'STALE_PENDING') q = q.eq('status', 'PENDING');
      else if (filter === 'FAILED') q = q.eq('status', 'FAILED');
      else if (filter === 'DISCREPANCIES') q = q.or('status.eq.PENDING,failure_reason.neq.null');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        plan: row.plan?.[0] ?? null,
        user: row.user?.[0] ?? null,
      })) as ReconciliationTxn[];
    },
  });

  const filtered = (transactions || []).filter((t) => {
    if (!search) return true;
    const email = (t.user as { email?: string })?.email?.toLowerCase() || '';
    const inv = t.invoice_number?.toLowerCase() || '';
    return email.includes(search.toLowerCase()) || inv.includes(search.toLowerCase());
  });

  const stalePending = (transactions || []).filter((t) => {
    if (t.status !== 'PENDING') return false;
    const age = Date.now() - new Date(t.created_at).getTime();
    return age > 10 * 60 * 1000;
  }).length;

  const failedCount = (transactions || []).filter((t) => t.status === 'FAILED').length;
  const totalAtRisk = (transactions || [])
    .filter((t) => t.status === 'PENDING')
    .reduce((s, t) => s + t.amount_inr, 0);

  const forceStatus = async (txn: ReconciliationTxn, newStatus: string) => {
    setActioningId(txn.id);
    const { error } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        failure_reason: newStatus === 'FAILED' ? 'Manually marked as failed during reconciliation' : null,
      })
      .eq('id', txn.id);
    setActioningId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Transaction marked as ${newStatus}`);
    queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
  };

  const reprocess = async (txn: ReconciliationTxn) => {
    setActioningId(txn.id);
    if (!user) {
      toast.error('You must be signed in');
      setActioningId(null);
      return;
    }
    const { error: txnError } = await supabase
      .from('transactions')
      .update({ status: 'SUCCESS', failure_reason: null })
      .eq('id', txn.id);
    if (txnError) {
      toast.error(txnError.message);
      setActioningId(null);
      return;
    }
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: txn.user_id,
        plan_id: txn.plan_id,
        status: 'ACTIVE',
        started_at: new Date().toISOString(),
      });
    setActioningId(null);
    if (subError) {
      toast.error(subError.message);
      return;
    }
    toast.success('Payment reprocessed and subscription activated');
    queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
  };

  const filters: { key: FilterType; label: string; icon: typeof Clock }[] = [
    { key: 'STALE_PENDING', label: 'Stale Pending', icon: Clock },
    { key: 'FAILED', label: 'Failed', icon: XCircle },
    { key: 'DISCREPANCIES', label: 'Discrepancies', icon: AlertCircle },
    { key: 'ALL', label: 'All', icon: Activity },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Reconciliation</h1>
          <p className="text-sm text-navy-400">Monitor payment discrepancies, stale pending transactions, and failed events. Manually resolve stuck payments.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stalePending}</p>
                  <p className="text-xs text-navy-400">Stale Pending (&gt;10 min)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibe-500/10 text-vibe-300">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{failedCount}</p>
                  <p className="text-xs text-navy-400">Failed Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/10 text-govt-300">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">₹{totalAtRisk}</p>
                  <p className="text-xs text-navy-400">Amount at Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(transactions || []).length}</p>
                  <p className="text-xs text-navy-400">Total in View</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs + search */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => {
                  const FIcon = f.icon;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        filter === f.key ? 'bg-govt-500 text-white' : 'bg-white/5 text-navy-300 hover:bg-white/10',
                      )}
                    >
                      <FIcon className="h-3.5 w-3.5" /> {f.label}
                    </button>
                  );
                })}
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
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">All clear</p>
                  <p className="mt-1 text-xs text-navy-400">No discrepancies found in this view.</p>
                </div>
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
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Age</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((txn) => {
                      const age = Date.now() - new Date(txn.created_at).getTime();
                      const ageMin = Math.round(age / 60000);
                      const isStale = txn.status === 'PENDING' && ageMin > 10;
                      return (
                        <tr key={txn.id} className={cn('hover:bg-white/[.02]', isStale && 'bg-amber-500/[.03]')}>
                          <td className="px-4 py-3 font-mono text-xs text-navy-200">{txn.invoice_number}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white">{(txn.user as { full_name?: string })?.full_name || '—'}</p>
                            <p className="text-xs text-navy-500">{(txn.user as { email?: string })?.email || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-navy-200">{(txn.plan as { name?: string })?.name || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-white">₹{txn.amount_inr}</td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              txn.status === 'SUCCESS' ? 'success' :
                              txn.status === 'PENDING' ? 'warning' :
                              txn.status === 'FAILED' ? 'error' : 'neutral'
                            }>{txn.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-400">
                            {ageMin < 60 ? `${ageMin}m` : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`}
                            {isStale && <span className="ml-1 text-amber-400">⚠</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTxn(txn)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {txn.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => reprocess(txn)}
                                    loading={actioningId === txn.id}
                                    title="Mark as success and activate subscription"
                                  >
                                    <Zap className="h-4 w-4 text-emerald-300" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => forceStatus(txn, 'FAILED')}
                                    loading={actioningId === txn.id}
                                    title="Mark as failed"
                                  >
                                    <Ban className="h-4 w-4 text-vibe-300" />
                                  </Button>
                                </>
                              )}
                              {txn.status === 'FAILED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => forceStatus(txn, 'PENDING')}
                                  loading={actioningId === txn.id}
                                  title="Reset to pending"
                                >
                                  <RefreshCw className="h-4 w-4 text-amber-300" />
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

        {/* Detail modal */}
        {selectedTxn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-lg border-white/15 bg-[#15161f]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Transaction Details</CardTitle>
                  <button onClick={() => setSelectedTxn(null)} className="text-navy-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Invoice" value={selectedTxn.invoice_number} />
                <Row label="Student" value={`${(selectedTxn.user as { full_name?: string })?.full_name || '—'} (${(selectedTxn.user as { email?: string })?.email || ''})`} />
                <Row label="Plan" value={(selectedTxn.plan as { name?: string })?.name || '—'} />
                <Row label="Original" value={`₹${selectedTxn.original_amount_inr}`} />
                <Row label="Discount" value={`₹${selectedTxn.discount_inr}`} />
                <Row label="Final" value={`₹${selectedTxn.amount_inr}`} />
                <Row label="Method" value={selectedTxn.payment_method || '—'} />
                <Row label="Status" value={selectedTxn.status} />
                {selectedTxn.failure_reason && <Row label="Failure" value={selectedTxn.failure_reason} />}
                <Row label="Date" value={new Date(selectedTxn.created_at).toLocaleString()} />
                <div className="flex justify-end gap-2 pt-4">
                  {selectedTxn.status === 'PENDING' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { forceStatus(selectedTxn, 'FAILED'); setSelectedTxn(null); }}>
                        <Ban className="h-4 w-4" /> Mark Failed
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => { reprocess(selectedTxn); setSelectedTxn(null); }}>
                        <Zap className="h-4 w-4" /> Reprocess
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTxn(null)}>Close</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy-400">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
