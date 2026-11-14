import { Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Plan } from './PlanCard';

const periodShort: Record<string, string> = {
  MONTHLY: 'mo',
  QUARTERLY: 'qtr',
  YEARLY: 'yr',
};

interface PlanComparisonTableProps {
  plans: Plan[];
  currentPlanId: string | undefined;
}

export function PlanComparisonTable({ plans, currentPlanId }: PlanComparisonTableProps) {
  const allFeatures = [...new Set(plans.flatMap((p) => p.features_json || []))];
  if (allFeatures.length === 0) return null;

  return (
    <Card>
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-lg font-semibold text-white">Compare plans</h2>
        <p className="mt-1 text-sm text-navy-300">See exactly what each plan includes.</p>
      </div>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th scope="col" className="px-6 py-4 text-left font-semibold text-navy-300">Feature</th>
              {plans.map((p) => (
                <th scope="col" key={p.id} className="px-4 py-4 text-center font-semibold text-white">
                  <span>{p.name}</span>
                  {p.id === currentPlanId && (
                    <span className="ml-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Current
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th scope="row" className="px-6 py-4 text-left font-semibold text-navy-200">Price</th>
              {plans.map((p) => (
                <td key={p.id} className="px-4 py-4 text-center font-bold text-white">
                  {p.price_inr === 0 ? 'Free' : `₹${p.price_inr}/${periodShort[p.billing_period] ?? 'mo'}`}
                </td>
              ))}
            </tr>
            {allFeatures.map((feat) => (
              <tr key={feat} className="border-b border-white/5 last:border-0">
                <th scope="row" className="px-6 py-3.5 text-left font-normal text-navy-200">{feat}</th>
                {plans.map((p) => {
                  const has = (p.features_json || []).includes(feat);
                  return (
                    <td key={p.id} className="px-4 py-3.5 text-center">
                      {has ? (
                        <Check className="mx-auto h-4 w-4 text-govt-300" aria-label="Included" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-white/25" aria-label="Not included" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
