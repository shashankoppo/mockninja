import { useTranslation } from 'react-i18next';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSubscriptionPlans } from '@/features/home/services/queries';

interface SubPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  billing_period: string;
  features_json: string[];
  is_active: boolean;
  sort_order: number;
  mock_quota?: number | null;
}

const FALLBACK_PLANS: SubPlan[] = [
  { id: 'f', name: 'Free', slug: 'free', description: 'Start building your practice habit.', price_inr: 0, billing_period: 'MONTHLY', features_json: ['3 free mock tests', 'Chapter practice', 'Daily practice problems', 'Basic score report'], is_active: true, sort_order: 0, mock_quota: null },
  { id: 'p', name: 'Pro', slug: 'pro', description: 'Go deeper with complete JEE practice tools.', price_inr: 499, billing_period: 'MONTHLY', features_json: ['Unlimited mock tests', 'Full-length mocks', 'Custom mock generator', 'Mistake re-attempt', 'Performance analytics', 'Priority support'], is_active: true, sort_order: 1, mock_quota: null },
  { id: 'e', name: 'Elite', slug: 'elite', description: 'Maximum prep with everything unlocked.', price_inr: 999, billing_period: 'MONTHLY', features_json: ['Everything in Pro', 'AI-powered doubt solver', 'Personalised study plan', 'Priority support', 'Early access to new features'], is_active: true, sort_order: 2, mock_quota: null },
];

function periodLabel(billing: string): string {
  if (billing === 'YEARLY') return '/year';
  if (billing === 'QUARTERLY') return '/quarter';
  if (billing === 'ONE_TIME') return 'one-time';
  if (billing === 'LIFETIME') return 'lifetime';
  return '/month';
}

export function PricingPage() {
  const { t } = useTranslation();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const activePlans = (plans && plans.length > 0 ? plans : FALLBACK_PLANS) as SubPlan[];
  const popularSlug = 'pro';

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-govt-300">Simple plans</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('pricing.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-navy-500">{t('pricing.subtitle')}</p>
          {isLoading && <p className="mt-2 text-xs text-navy-400">Loading the latest plan details…</p>}
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activePlans.map((plan) => {
            const isFree = plan.price_inr === 0;
            const isPopular = plan.slug === popularSlug;
            const features = plan.features_json || [];
            return (
              <Card
                key={plan.id || plan.slug}
                className={cn(
                  'group relative flex flex-col transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover',
                  isPopular && 'border-govt-300/50 shadow-glow-vibe ring-1 ring-govt-300/20',
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="bg-gradient-to-r from-govt-500 to-vibe-500 text-white">
                      <Sparkles className="h-3 w-3" /> {t('plans.mostPopular')}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl govt-heading">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {isFree ? (
                      <span className="text-4xl font-bold text-navy-900">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-navy-900">₹{plan.price_inr}</span>
                        <span className="ml-2 text-sm text-navy-500">{periodLabel(plan.billing_period)}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  {plan.mock_quota !== null && (
                    <p className="mb-4 text-sm font-semibold text-navy-900">{plan.mock_quota} mock tests included</p>
                  )}
                  <ul className="mb-6 space-y-3">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-teal-300" />
                        <span className="text-navy-200">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="mt-auto">
                    <Button variant={isPopular ? 'primary' : 'outline'} fullWidth size="lg">
                      {isFree ? 'Start Free' : `Go ${plan.name}`}
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-navy-400">
                    {isFree ? t('plans.noCardRequired') : t('plans.cancelAnytime')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
