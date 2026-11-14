import { Check, Crown, CreditCard, Lock, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  billing_period: string;
  features_json: string[];
  is_active: boolean;
  sort_order: number;
  pricing_model?: 'TIERS' | 'BUNDLES';
  mock_quota?: number | null;
}

const planIcons: Record<string, typeof Crown> = {
  free: Sparkles,
  pro: Zap,
  elite: Crown,
};

const planAccents: Record<string, string> = {
  free: 'bg-sky-500/15 text-sky-300',
  pro: 'bg-govt-500/15 text-govt-300',
  elite: 'bg-amber-500/15 text-amber-300',
};

const periodSuffix: Record<string, string> = {
  MONTHLY: '/month',
  QUARTERLY: '/quarter',
  YEARLY: '/year',
  ONE_TIME: 'one-time',
  LIFETIME: 'lifetime',
};

export interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  isLocked: boolean;
  ctaLabel: string;
  isConfirming: boolean;
  currentPlanName: string | null;
  isPending: boolean;
  onSelect: (plan: Plan) => void;
  onConfirm: (plan: Plan) => void;
  onCancelConfirm: () => void;
}

export function PlanCard({
  plan,
  isCurrent,
  isLocked,
  ctaLabel,
  isConfirming,
  currentPlanName,
  isPending,
  onSelect,
  onConfirm,
  onCancelConfirm,
}: PlanCardProps) {
  const Icon = planIcons[plan.slug] || Sparkles;
  const accent = planAccents[plan.slug] || planAccents.free;
  const isFree = plan.price_inr === 0;
  const isPopular = plan.slug === 'pro';
  const features = plan.features_json || [];

  const badge = isCurrent ? 'Current plan' : isLocked ? 'Locked' : isPopular ? 'Most popular' : null;
  const badgeClass = isCurrent
    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
    : isLocked
      ? 'border-white/15 bg-white/5 text-navy-200'
      : 'border-saffron-400/30 bg-saffron-500/15 text-saffron-200';

  return (
    <Card
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'flex flex-col transition-[transform,border-color,box-shadow] duration-300 motion-safe:hover:-translate-y-1 hover:border-white/20',
        isPopular && !isCurrent && 'border-govt-400/40 shadow-glow-aurora',
        isCurrent && 'border-emerald-400/40',
      )}
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', accent)}>
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          {badge && (
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', badgeClass)}>
              {badge}
            </span>
          )}
        </div>

        <h2 className="mt-5 text-xl font-semibold text-white">{plan.name}</h2>
        <p className="mt-1 min-h-[2.5rem] text-sm leading-relaxed text-navy-300">{plan.description}</p>

        <div className="mt-5 flex items-baseline gap-1.5">
          {isFree ? (
            <span className="text-4xl font-bold text-white">Free</span>
          ) : (
            <>
              <span className="text-4xl font-bold text-white">₹{plan.price_inr}</span>
              <span className="text-sm text-navy-300">{periodSuffix[plan.billing_period] ?? '/month'}</span>
            </>
          )}
        </div>

        {plan.mock_quota !== null && (
          <p className="mt-4 text-sm font-semibold text-white">{plan.mock_quota} mock tests included</p>
        )}

        {isLocked && (
          <p className="mt-3 flex items-start gap-2 text-sm text-navy-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Premium mocks are locked. Purchase this plan to unlock them.</span>
          </p>
        )}
        {isCurrent && !isFree && (
          <p className="mt-3 flex items-start gap-2 text-sm font-medium text-emerald-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Premium mocks are unlocked.</span>
          </p>
        )}

        <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-6">
          {features.map((feat) => (
            <li key={feat} className="flex items-start gap-3 text-sm text-navy-200">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-300" aria-hidden />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {isCurrent ? (
            <Button variant="outline" fullWidth disabled>
              <Check className="h-4 w-4" aria-hidden /> Current plan
            </Button>
          ) : isConfirming ? (
            <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="text-sm leading-relaxed text-amber-100">
                Switching to {plan.name} ends your {currentPlanName ?? 'current'} plan right away. This cannot be undone here.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={onCancelConfirm} disabled={isPending}>
                  Keep plan
                </Button>
                <Button variant="destructive" onClick={() => onConfirm(plan)} loading={isPending}>
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant={isFree ? 'secondary' : 'primary'}
              fullWidth
              onClick={() => onSelect(plan)}
            >
              {isLocked ? (
                <Lock className="h-4 w-4" aria-hidden />
              ) : (
                !isFree && <CreditCard className="h-4 w-4" aria-hidden />
              )}
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
