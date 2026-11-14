import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Loader2, Receipt, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { PlanCard, type Plan } from '@/components/student/subscription/PlanCard';
import { PlanComparisonTable } from '@/components/student/subscription/PlanComparisonTable';
import { PlanFaq } from '@/components/student/subscription/PlanFaq';
import { StudentLayout } from '@/layouts/StudentLayout';

interface UserSubscription {
  id: string;
  plan_id: string | null;
  status: string;
  expires_at: string | null;
}

export function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmPlanId, setConfirmPlanId] = useState<string | null>(null);

  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_inr, billing_period, features_json, is_active, sort_order, pricing_model, mock_quota')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const { data: currentSub } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, plan_id, status, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as UserSubscription | null;
    },
    enabled: !!user,
  });

  const planList = plans ?? [];
  const freePlan = planList.find((p) => p.price_inr === 0);
  const currentPlan = currentSub
    ? planList.find((p) => p.id === currentSub.plan_id)
    : freePlan;
  const currentPlanId = currentPlan?.id;
  const isPaidCurrent = !!currentPlan && currentPlan.price_inr > 0;

  const switchToFreeMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      const { data, error } = await supabase.rpc('switch_to_free_plan', { p_plan_id: plan.id });
      if (error) throw error;
      if (typeof data !== 'string') throw new Error('Unexpected response');
    },
    onSuccess: (_, plan) => {
      setConfirmPlanId(null);
      toast.success(`You're now on the ${plan.name} plan.`);
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
    onError: () => {
      toast.error('Could not change your plan. Please try again.');
    },
  });

  const handleSelect = (plan: Plan) => {
    if (plan.price_inr > 0) {
      navigate(`/checkout?plan=${plan.slug}`);
      return;
    }
    if (isPaidCurrent) {
      setConfirmPlanId(plan.id);
      return;
    }
    switchToFreeMutation.mutate(plan);
  };

  const getCtaLabel = (plan: Plan) => {
    if (plan.price_inr === 0) return 'Switch to Free';
    if (!currentPlan || currentPlan.price_inr === 0) return `Choose ${plan.name}`;
    return plan.price_inr > currentPlan.price_inr ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`;
  };

  const pendingPlanId = switchToFreeMutation.isPending ? switchToFreeMutation.variables?.id : undefined;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl space-y-10 pb-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-govt-300">Plans</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Choose your prep plan</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy-300">
          Start free and upgrade when you need more. You can change your plan at any time.
        </p>
      </header>

      {plansLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-govt-300" aria-label="Loading plans" />
        </div>
      ) : plansError ? (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-red-300" aria-hidden />
          <div>
            <p className="font-semibold text-white">We could not load the plans</p>
            <p className="mt-1 text-sm text-navy-300">Check your connection and try again.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetchPlans()}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </Button>
        </div>
      ) : planList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-navy-300">
          No plans are available right now. Please check back soon.
        </div>
      ) : (
        <section aria-label="Available plans" className="grid items-stretch gap-6 md:grid-cols-3">
          {planList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              isLocked={plan.price_inr > 0 && !isPaidCurrent}
              ctaLabel={getCtaLabel(plan)}
              isConfirming={confirmPlanId === plan.id}
              currentPlanName={currentPlan?.name ?? null}
              isPending={pendingPlanId === plan.id}
              onSelect={handleSelect}
              onConfirm={(p) => switchToFreeMutation.mutate(p)}
              onCancelConfirm={() => setConfirmPlanId(null)}
            />
          ))}
        </section>
      )}

      {planList.length > 0 && (
        <PlanComparisonTable plans={planList} currentPlanId={currentPlanId} />
      )}

      {/* Subscription management: validity, cancel */}
      {isPaidCurrent && currentSub && (
        <Card className="border-white/10 bg-[#11121c]">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Current plan: {currentPlan?.name}
                </p>
                <p className="text-xs text-navy-400">
                  Status: Active
                  {currentSub.expires_at
                    ? ` · Valid until ${new Date(currentSub.expires_at).toLocaleDateString()}`
                    : ' · No expiry'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/billing')}
              >
                <Receipt className="h-4 w-4" /> Billing
              </Button>
              {freePlan && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmPlanId(freePlan.id)}
                  className="text-vibe-300 hover:text-vibe-200"
                >
                  Cancel subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
              <Receipt className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Billing history</p>
              <p className="text-xs text-navy-300">View past payments and invoices</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
              View <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Secure payments</p>
              <p className="text-xs text-navy-300">UPI, cards, and net banking via encrypted gateway</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlanFaq />
      </div>
    </StudentLayout>
  );
}
