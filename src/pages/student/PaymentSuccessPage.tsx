import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Clock, Ban, Download, ArrowRight, Loader2,
  RotateCcw, LifeBuoy, AlertCircle, Receipt, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  invoice_number: string;
  amount_inr: number;
  original_amount_inr: number;
  discount_inr: number;
  status: string;
  payment_method: string;
  failure_reason: string | null;
  plan_id: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
}

type PaymentState = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';

const stateConfig: Record<PaymentState, {
  icon: typeof CheckCircle2;
  title: string;
  message: string;
  color: string;
  bg: string;
}> = {
  SUCCESS: {
    icon: CheckCircle2,
    title: 'Payment Successful!',
    message: 'Your plan is now active.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  PENDING: {
    icon: Clock,
    title: 'Payment Pending',
    message: 'Your payment is being processed. This usually takes a few minutes.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
  FAILED: {
    icon: XCircle,
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    color: 'text-vibe-400',
    bg: 'bg-vibe-500/15',
  },
  CANCELLED: {
    icon: Ban,
    title: 'Payment Cancelled',
    message: 'You cancelled the payment. No charges were made.',
    color: 'text-navy-400',
    bg: 'bg-white/10',
  },
};

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const txnId = searchParams.get('txn') || '';
  const [pollCount, setPollCount] = useState(0);

  const { data: txn, isLoading } = useQuery({
    queryKey: ['checkout-txn', txnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, invoice_number, amount_inr, original_amount_inr, discount_inr, status, payment_method, failure_reason, plan_id, created_at')
        .eq('id', txnId)
        .maybeSingle();
      if (error) throw error;
      return data as Transaction | null;
    },
    enabled: !!txnId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' && pollCount < 10 ? 3000 : false;
    },
  });

  useEffect(() => {
    if (txn?.status === 'PENDING') {
      setPollCount((c) => c + 1);
    }
  }, [txn?.status]);

  const { data: plan } = useQuery({
    queryKey: ['txn-plan', txn?.plan_id],
    queryFn: async () => {
      if (!txn?.plan_id) return null;
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('id', txn.plan_id)
        .maybeSingle();
      if (error) throw error;
      return data as Plan | null;
    },
    enabled: !!txn?.plan_id,
  });

  const currentState: PaymentState = (txn?.status as PaymentState) || 'PENDING';
  const config = stateConfig[currentState] || stateConfig.PENDING;
  const StateIcon = config.icon;

  const downloadInvoice = () => {
    if (!txn) return;
    const invoiceText = `MOCK NINJA — INVOICE
========================
Invoice No: ${txn.invoice_number}
Date: ${new Date(txn.created_at).toLocaleString()}

Plan: ${plan?.name || 'Subscription'}
Original Amount: ₹${txn.original_amount_inr}
Discount: -₹${txn.discount_inr}
Total Paid: ₹${txn.amount_inr}
Payment Method: ${txn.payment_method}
Status: ${txn.status}

Thank you for your purchase!
Independent practice platform. Not affiliated with NTA.`;
    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${txn.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-govt-400" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-lg py-8">
        <Card className="border-white/10 bg-[#11121c]">
          <CardContent className="p-8 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.bg}`}>
              <StateIcon className={`h-9 w-9 ${config.color}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{config.title}</h1>
            <p className="mt-2 text-sm text-navy-400">
              {txn?.failure_reason || (currentState === 'PENDING' && pollCount >= 10
                ? 'We have not received payment confirmation yet. Contact support with your invoice number if this continues.'
                : config.message)}
            </p>

            {currentState === 'PENDING' && pollCount < 10 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Checking for updates... ({pollCount}/10)</span>
              </div>
            )}

            {txn && (
              <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-white/[.02] p-4 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-navy-400">Invoice</span>
                  <span className="font-mono font-semibold text-white">{txn.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Plan</span>
                  <span className="text-white">{plan?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Amount</span>
                  <span className="font-bold text-white">₹{txn.amount_inr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Payment Method</span>
                  <span className="text-white">{txn.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Status</span>
                  <Badge variant={
                    currentState === 'SUCCESS' ? 'success' :
                    currentState === 'PENDING' ? 'warning' :
                    currentState === 'FAILED' ? 'error' : 'neutral'
                  }>{currentState}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Date</span>
                  <span className="text-white">{new Date(txn.created_at).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {currentState === 'SUCCESS' && (
                <>
                  <Button variant="outline" onClick={downloadInvoice} disabled={!txn}>
                    <Download className="h-4 w-4" /> Download Invoice
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              {currentState === 'PENDING' && (
                <>
                  <Button variant="outline" onClick={() => navigate('/billing')}>
                    <Receipt className="h-4 w-4" /> View Billing
                  </Button>
                  <Button variant="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['checkout-txn', txnId] })}>
                    <RefreshCw className="h-4 w-4" /> Refresh Status
                  </Button>
                </>
              )}
              {currentState === 'FAILED' && (
                <>
                  <Button variant="outline" onClick={() => navigate('/contact')}>
                    <LifeBuoy className="h-4 w-4" /> Contact Support
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/subscription')}>
                    <RotateCcw className="h-4 w-4" /> Try Again
                  </Button>
                </>
              )}
              {currentState === 'CANCELLED' && (
                <>
                  <Button variant="outline" onClick={() => navigate('/subscription')}>
                    <ArrowRight className="h-4 w-4" /> Browse Plans
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-4 text-xs">
              <Link to="/billing" className="text-govt-300 underline">Billing History</Link>
              <Link to="/subscription" className="text-govt-300 underline">Manage Plan</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
