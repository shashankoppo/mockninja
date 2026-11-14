import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { XCircle, Ban, RotateCcw, ArrowLeft, LifeBuoy, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  invoice_number: string;
  amount_inr: number;
  status: string;
  payment_method: string;
  failure_reason: string | null;
}

export function PaymentFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const txnId = searchParams.get('txn') || '';
  const isCancelled = searchParams.get('state') === 'cancelled';

  const { data: txn, isLoading } = useQuery({
    queryKey: ['checkout-txn-fail', txnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, invoice_number, amount_inr, status, payment_method, failure_reason')
        .eq('id', txnId)
        .maybeSingle();
      if (error) throw error;
      return data as Transaction | null;
    },
    enabled: !!txnId,
  });

  const isPending = txn?.status === 'PENDING';
  const Icon = isCancelled ? Ban : isPending ? Clock : XCircle;
  const title = isCancelled ? 'Payment Cancelled' : isPending ? 'Payment Pending' : 'Payment Failed';
  const message = isCancelled
    ? 'You cancelled the payment. No charges were made.'
    : isPending
      ? 'Your payment is still being processed. We will update the status shortly.'
      : txn?.failure_reason || 'Your payment could not be processed. This can happen due to insufficient funds, an expired card, or a network issue.';

  return (
    <StudentLayout>
      <div className="mx-auto max-w-lg py-8">
        <Card className="border-white/10 bg-[#11121c]">
          <CardContent className="p-8 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isCancelled ? 'bg-white/10' : isPending ? 'bg-amber-500/15' : 'bg-vibe-500/15'}`}>
              <Icon className={`h-9 w-9 ${isCancelled ? 'text-navy-400' : isPending ? 'text-amber-400' : 'text-vibe-400'}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="mt-2 text-sm text-navy-400">{message}</p>

            {txn && (
              <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-white/[.02] p-4 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-navy-400">Reference</span>
                  <span className="font-mono text-white">{txn.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Amount</span>
                  <span className="text-white">₹{txn.amount_inr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Method</span>
                  <span className="text-white">{txn.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Status</span>
                  <Badge variant={isPending ? 'warning' : 'error'}>
                    {isCancelled ? 'CANCELLED' : isPending ? 'PENDING' : 'FAILED'}
                  </Badge>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {isCancelled ? (
                <>
                  <Button variant="primary" onClick={() => navigate('/subscription')}>
                    <RotateCcw className="h-4 w-4" /> Browse Plans
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4" /> Dashboard
                  </Button>
                </>
              ) : isPending ? (
                <>
                  <Button variant="primary" onClick={() => navigate('/billing')}>
                    <Clock className="h-4 w-4" /> View Billing
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4" /> Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" onClick={() => navigate('/subscription')}>
                    <RotateCcw className="h-4 w-4" /> Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/contact')}>
                    <LifeBuoy className="h-4 w-4" /> Contact Support
                  </Button>
                </>
              )}
            </div>

            <div className="mt-4">
              <Link to="/dashboard" className="text-xs text-navy-400 underline">
                Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
