import { useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check, Lock, ShieldCheck, ArrowLeft, Loader2, Tag, CreditCard,
  AlertCircle, Sparkles, Zap, Crown, Gift,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  billing_period: string;
  features_json: string[];
}

const planIcons: Record<string, typeof Crown> = { free: Sparkles, pro: Zap, elite: Crown };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (data: unknown) => void) => void;
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const planSlug = searchParams.get('plan') || 'pro';

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; promoId: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; discount: number } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const scriptLoadedRef = useRef(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['checkout-plan', planSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_inr, billing_period, features_json')
        .eq('slug', planSlug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Plan | null;
    },
  });

  const originalAmount = plan?.price_inr || 0;
  const promoDiscount = appliedPromo?.discount || 0;
  const referralDiscount = appliedReferral?.discount || 0;
  const totalDiscount = promoDiscount + referralDiscount;
  const finalAmount = useMemo(() => Math.max(0, originalAmount - totalDiscount), [originalAmount, totalDiscount]);
  const gstAmount = Math.round(finalAmount * 0.18);
  const totalAmount = finalAmount + gstAmount;

  const validatePromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Enter a promo code first');
      return;
    }
    setValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: promoCode.trim(),
        p_plan_slug: planSlug,
        p_amount: originalAmount,
      });
      if (error) throw error;
      const row = data?.[0];
      if (row?.valid) {
        setAppliedPromo({ code: promoCode.trim().toUpperCase(), discount: row.discount_inr, promoId: row.promo_code_id });
        toast.success(row.message || 'Promo code applied!');
      } else {
        setAppliedPromo(null);
        toast.error(row?.message || 'Invalid promo code');
      }
    } catch {
      toast.error('Could not validate promo code');
    }
    setValidating(false);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const validateReferral = async () => {
    if (!referralCode.trim()) {
      toast.error('Enter a referral code first');
      return;
    }
    setReferralLoading(true);
    try {
      const { data, error } = await supabase.rpc('apply_referral_discount', {
        p_code: referralCode.trim(),
        p_amount: originalAmount,
      });
      if (error) throw error;
      const row = data?.[0];
      if (row?.valid) {
        setAppliedReferral({ code: referralCode.trim().toUpperCase(), discount: row.discount_inr });
        toast.success(`Referral applied — 20% off (₹${row.discount_inr} saved)!`);
      } else {
        setAppliedReferral(null);
        toast.error('Invalid or expired referral code');
      }
    } catch {
      toast.error('Could not validate referral code');
    }
    setReferralLoading(false);
  };

  const removeReferral = () => {
    setAppliedReferral(null);
    setReferralCode('');
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    if (scriptLoadedRef.current && window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', () => { scriptLoadedRef.current = true; resolve(true); });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => { scriptLoadedRef.current = true; resolve(true); };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!plan || totalAmount <= 0) return;
    setPaying(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk || !window.Razorpay) {
        toast.error('Could not load payment gateway. Please check your connection and try again.');
        setPaying(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-order`;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Your session has expired. Please sign in again.');
        setPaying(false);
        return;
      }
      const orderResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planSlug,
          promoCode: appliedPromo?.code,
          referralCode: appliedReferral?.code,
        }),
      });

      if (!orderResponse.ok) {
        const errData = await orderResponse.json().catch(() => ({}));
        toast.error(errData.error || 'Could not initiate payment. Please try again.');
        setPaying(false);
        return;
      }

      const order = await orderResponse.json();

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount * 100,
        currency: order.currency,
        name: 'Mock Ninja',
        description: `${order.planName} Plan`,
        order_id: order.orderId,
        prefill: {
          name: order.studentName,
          email: order.studentEmail,
        },
        theme: { color: '#0f766e' },
        handler: (_response: RazorpayResponse) => {
          window.location.href = `/payment/success?txn=${order.txnId}`;
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info('Payment cancelled. No charges were made.');
          },
        },
      });

      rzp.on('payment.failed', (data: unknown) => {
        const failData = data as { error?: { description?: string } };
        toast.error(failData.error?.description || 'Payment failed. Please try again.');
        window.location.href = `/payment/failure?txn=${order.txnId}`;
      });

      rzp.open();
    } catch {
      toast.error('Something went wrong. Please try again.');
      setPaying(false);
    }
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

  if (!plan) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-navy-500" />
          <h2 className="mt-4 text-lg font-semibold text-white">Plan not found</h2>
          <p className="mt-2 text-sm text-navy-400">This plan may have been deactivated. Please choose another plan.</p>
          <Link to="/subscription" className="mt-4 inline-block">
            <Button variant="outline">Back to plans</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const Icon = planIcons[plan.slug] || Sparkles;
  const periodLabel = plan.billing_period === 'YEARLY' ? '/year' : '/month';

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/subscription">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Checkout</h1>
            <p className="text-sm text-navy-400">Review your order and complete payment</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Payment info */}
          <div className="space-y-5">
            {/* Payment methods info */}
            <Card className="border-white/10 bg-[#11121c]">
              <CardHeader>
                <CardTitle className="text-base text-white">Payment Method</CardTitle>
                <CardDescription className="text-navy-400">Pay securely via Razorpay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/15 text-govt-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">UPI, Card, Net Banking, Wallets</p>
                    <p className="text-xs text-navy-400">All major payment methods supported</p>
                  </div>
                  <Check className="h-5 w-5 text-govt-400" />
                </div>
              </CardContent>
            </Card>

            {/* Security notice */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-200">Secure Payment</p>
                <p className="text-xs text-emerald-200/70">Your payment is processed through Razorpay's encrypted gateway. We never store your card details.</p>
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="space-y-4">
            <Card className="border-white/10 bg-[#11121c]">
              <CardHeader>
                <CardTitle className="text-base text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Plan info */}
                <div className="flex items-center gap-3 rounded-xl bg-white/[.03] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/15 text-govt-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{plan.name} Plan</p>
                    <p className="text-xs text-navy-400">{plan.description}</p>
                  </div>
                  <Badge variant="neutral">{plan.billing_period}</Badge>
                </div>

                {/* Promo code */}
                <div>
                  <label className="text-xs font-medium text-navy-300">Promo Code</label>
                  {appliedPromo ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-govt-400/30 bg-govt-500/10 px-3 py-2">
                      <Tag className="h-4 w-4 text-govt-300" />
                      <span className="flex-1 text-sm font-semibold text-govt-200">{appliedPromo.code}</span>
                      <span className="text-xs text-govt-300">-₹{appliedPromo.discount}</span>
                      <button onClick={removePromo} className="text-navy-400 hover:text-white">
                        <span className="text-lg">×</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={validatePromo}
                        loading={validating}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {/* Referral code */}
                <div>
                  <label className="text-xs font-medium text-navy-300">Referral Code (20% off)</label>
                  {appliedReferral ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                      <Gift className="h-4 w-4 text-emerald-300" />
                      <span className="flex-1 text-sm font-semibold text-emerald-200">{appliedReferral.code}</span>
                      <span className="text-xs text-emerald-300">-₹{appliedReferral.discount}</span>
                      <button onClick={removeReferral} className="text-navy-400 hover:text-white">
                        <span className="text-lg">×</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="Enter referral code"
                        className="flex-1 rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-emerald-400 focus:outline-none"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={validateReferral}
                        loading={referralLoading}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between text-navy-300">
                    <span>Plan price ({periodLabel})</span>
                    <span className="text-white">₹{originalAmount}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Promo discount</span>
                      <span>-₹{promoDiscount}</span>
                    </div>
                  )}
                  {referralDiscount > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Referral discount (20%)</span>
                      <span>-₹{referralDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-navy-300">
                    <span>GST (18%)</span>
                    <span>₹{gstAmount}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-white">₹{totalAmount}</span>
                  </div>
                </div>

                <Button variant="primary" fullWidth size="lg" onClick={handlePayment} loading={paying} disabled={totalAmount <= 0}>
                  <Lock className="h-4 w-4" />
                  {paying ? 'Processing...' : `Pay ₹${totalAmount}`}
                </Button>

                <p className="text-center text-xs text-navy-500">
                  By proceeding, you agree to our <Link to="/terms" className="text-govt-300 underline">Terms</Link>
                </p>
              </CardContent>
            </Card>

            {/* Features included */}
            <Card className="border-white/10 bg-[#11121c]">
              <CardHeader>
                <CardTitle className="text-sm text-white">What's included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(plan.features_json || []).map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-navy-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
