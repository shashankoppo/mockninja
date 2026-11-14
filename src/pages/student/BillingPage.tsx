import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Download, RotateCcw, Loader2, CheckCircle2, XCircle,
  Clock, AlertCircle, CreditCard, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { DEFAULT_SUPPORT_EMAIL, useSupportEmail } from '@/lib/site-settings';

interface Transaction {
  id: string;
  invoice_number: string;
  amount_inr: number;
  original_amount_inr: number;
  discount_inr: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  plan_id: string | null;
  plan?: { name: string } | null;
}

interface RefundRequest {
  id: string;
  transaction_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'neutral'; icon: typeof CheckCircle2 }> = {
  SUCCESS: { label: 'Success', variant: 'success', icon: CheckCircle2 },
  FAILED: { label: 'Failed', variant: 'error', icon: XCircle },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  REFUND_PENDING: { label: 'Refund Pending', variant: 'warning', icon: AlertCircle },
  REFUNDED: { label: 'Refunded', variant: 'neutral', icon: RotateCcw },
};

export function BillingPage() {
  const { data: supportEmail = DEFAULT_SUPPORT_EMAIL } = useSupportEmail();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refundTxnId, setRefundTxnId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['billing-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, invoice_number, amount_inr, original_amount_inr, discount_inr, status, payment_method, created_at, plan_id, plan:plan_id(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        plan: row.plan?.[0] ?? null,
      })) as Transaction[];
    },
    enabled: !!user,
  });

  const { data: refundRequests } = useQuery({
    queryKey: ['my-refund-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_requests')
        .select('id, transaction_id, reason, status, admin_note, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RefundRequest[];
    },
    enabled: !!user,
  });

  const { data: currentSub } = useQuery({
    queryKey: ['my-subscription-billing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, plan_id, status, expires_at, plan:plan_id(name, slug)')
        .eq('user_id', user!.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!user || !refundTxnId) throw new Error('Missing data');
      const { error } = await supabase.from('refund_requests').insert({
        transaction_id: refundTxnId,
        user_id: user.id,
        reason: refundReason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Refund request submitted. Our team will review it shortly.');
      setRefundTxnId(null);
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['my-refund-requests'] });
    },
    onError: () => {
      toast.error('Could not submit refund request. Please try again.');
    },
  });

  const downloadInvoice = (txn: Transaction) => {
    const planName = (txn.plan as { name?: string } | null)?.name || 'Subscription';
    const date = new Date(txn.created_at);
    const gstAmount = Math.round(txn.amount_inr - (txn.amount_inr / 1.18));
    const baseAmount = txn.amount_inr - gstAmount;
    const text = `MOCK NINJA
Independent practice platform. Not affiliated with NTA.
==========================================

INVOICE

Invoice No:  ${txn.invoice_number}
Date:        ${date.toLocaleDateString('en-IN')}
Time:        ${date.toLocaleTimeString('en-IN')}
Status:      ${txn.status}

------------------------------------------
BILLED TO: ${user?.email || 'Customer'}
------------------------------------------

ITEM:
  ${planName}
  Plan Price:                    Rs. ${txn.original_amount_inr}

${txn.discount_inr > 0 ? `DISCOUNTS:
  Promo/Referral Discount:       -Rs. ${txn.discount_inr}
` : ''}SUBTOTAL:                       Rs. ${baseAmount}
GST (18%):                       Rs. ${gstAmount}
------------------------------------------
TOTAL PAID:                      Rs. ${txn.amount_inr}
==========================================

Payment Method: ${txn.payment_method || 'N/A'}

This is a computer-generated invoice and does not
require a physical signature.

For billing queries: ${supportEmail}

Mock Ninja . Independent practice platform
Not affiliated with NTA.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${txn.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSpent = (transactions || []).filter((t) => t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount_inr, 0);
  const successCount = (transactions || []).filter((t) => t.status === 'SUCCESS').length;
  const refundCount = (refundRequests || []).filter((r) => r.status === 'OPEN').length;

  const refundTxnMap = new Map((refundRequests || []).map((r) => [r.transaction_id, r]));

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Transactions</h1>
          <p className="mt-1 text-sm text-navy-400">View your payment history, download invoices, and manage refund requests.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/10 text-govt-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₹{totalSpent}</p>
                <p className="text-xs text-navy-400">Total Spent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{successCount}</p>
                <p className="text-xs text-navy-400">Successful Payments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{refundCount}</p>
                <p className="text-xs text-navy-400">Open Refund Requests</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current plan */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <CardTitle className="text-base text-white">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {currentSub ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {(currentSub.plan as { name?: string })?.name || 'Active Plan'}
                  </p>
                  <p className="text-xs text-navy-400">
                    Status: Active{currentSub.expires_at ? ` · Expires ${new Date(currentSub.expires_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/subscription')}>
                  Manage Plan <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-navy-400">You are on the Free plan.</p>
                <Button variant="primary" size="sm" onClick={() => navigate('/subscription')}>
                  Upgrade <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <CardTitle className="text-base text-white">Transaction History</CardTitle>
            <CardDescription className="text-navy-400">All your past payments and their status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-govt-400" />
              </div>
            ) : (transactions || []).length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="mx-auto h-10 w-10 text-navy-600" />
                <p className="mt-3 text-sm text-navy-400">No transactions yet. Your payment history will appear here.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/subscription')}>
                  Browse Plans
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase text-navy-400">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(transactions || []).map((txn) => {
                      const sc = statusConfig[txn.status] || statusConfig.PENDING;
                      const SIcon = sc.icon;
                      const existingRefund = refundTxnMap.get(txn.id);
                      const canRefund = txn.status === 'SUCCESS' && !existingRefund;
                      return (
                        <tr key={txn.id} className="hover:bg-white/[.02]">
                          <td className="px-4 py-3 font-mono text-xs text-navy-200">{txn.invoice_number}</td>
                          <td className="px-4 py-3 text-white">{(txn.plan as { name?: string })?.name || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-white">₹{txn.amount_inr}</td>
                          <td className="px-4 py-3">
                            <Badge variant={sc.variant}>
                              <SIcon className="h-3 w-3" /> {sc.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-400">{new Date(txn.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => downloadInvoice(txn)} title="Download invoice">
                                <Download className="h-4 w-4" />
                              </Button>
                              {canRefund && (
                                <Button variant="ghost" size="sm" onClick={() => setRefundTxnId(txn.id)} title="Request refund">
                                  <RotateCcw className="h-4 w-4" />
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

        {/* Refund requests */}
        {(refundRequests || []).length > 0 && (
          <Card className="border-white/10 bg-[#11121c]">
            <CardHeader>
              <CardTitle className="text-base text-white">Refund Requests</CardTitle>
              <CardDescription className="text-navy-400">Track the status of your refund requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(refundRequests || []).map((rr) => (
                <div key={rr.id} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={rr.status === 'APPROVED' ? 'success' : rr.status === 'REJECTED' ? 'error' : 'warning'}>
                          {rr.status === 'OPEN' ? 'Pending Review' : rr.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </Badge>
                        <span className="text-xs text-navy-400">{new Date(rr.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-navy-200">{rr.reason}</p>
                      {rr.admin_note && (
                        <p className="mt-2 rounded-lg bg-white/[.03] p-2 text-xs text-navy-300">
                          <span className="font-semibold text-navy-200">Admin note: </span>{rr.admin_note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Refund request modal */}
        {refundTxnId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-md border-white/15 bg-[#15161f]">
              <CardHeader>
                <CardTitle className="text-lg text-white">Request Refund</CardTitle>
                <CardDescription className="text-navy-400">Please describe why you are requesting a refund.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  placeholder="Explain the reason for your refund request..."
                  className="w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                />
                <p className="text-xs text-navy-500">
                  Refunds are reviewed within 3-5 business days.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setRefundTxnId(null); setRefundReason(''); }}>Cancel</Button>
                  <Button
                    variant="primary"
                    onClick={() => refundMutation.mutate()}
                    loading={refundMutation.isPending}
                    disabled={refundReason.trim().length < 10}
                  >
                    Submit Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
