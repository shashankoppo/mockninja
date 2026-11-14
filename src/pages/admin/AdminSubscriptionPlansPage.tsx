import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import {
  CheckCircle2, RefreshCw, Save, Eye, EyeOff, Plus, Trash2, Pencil, X, Crown, Sparkles, Gift, Zap,
} from 'lucide-react';

type PricingModel = 'TIERS' | 'BUNDLES';

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_inr: number;
  billing_period: string;
  features_json: string[] | null;
  is_active: boolean;
  sort_order: number;
  pricing_model: PricingModel;
  mock_quota: number | null;
}

const PLANS_KEY = ['admin-subscription-plans'];

const MODEL_LABEL: Record<PricingModel, string> = {
  TIERS: 'Monthly tiers',
  BUNDLES: 'Mock bundles',
};

const BILLING_LABEL: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  ONE_TIME: 'One-time',
  LIFETIME: 'Lifetime',
};

const BILLING_SHORT: Record<string, string> = {
  MONTHLY: '/mo',
  QUARTERLY: '/quarter',
  YEARLY: '/year',
  ONE_TIME: ' one-time',
  LIFETIME: ' lifetime',
};

const PLAN_ICON: Record<string, typeof Gift> = {
  free: Gift,
  pro: Sparkles,
  elite: Crown,
  'full-syllabus': Zap,
  'maths-monthly': Zap,
  'maths-yearly': Crown,
};

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40';

function liveModelOf(plans: PlanRow[]): PricingModel {
  const paidActive = plans.filter((p) => p.is_active && p.price_inr > 0);
  return paidActive.length > 0 && paidActive.every((p) => p.pricing_model === 'BUNDLES') ? 'BUNDLES' : 'TIERS';
}

export function AdminSubscriptionPlansPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_inr, billing_period, features_json, is_active, sort_order, pricing_model, mock_quota')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as PlanRow[];
    },
  });

  const allPlans = plans || [];
  const liveModel = liveModelOf(allPlans);

  const refresh = () => queryClient.invalidateQueries({ queryKey: PLANS_KEY });

  const [modelConfirm, setModelConfirm] = useState<PricingModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanRow | null>(null);

  const switchModel = async (model: PricingModel) => {
    const label = MODEL_LABEL[model];
    setSwitching(true);
    const { error } = await supabase.rpc('set_live_pricing_model', { p_model: model });
    setSwitching(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${label} is now live`);
      refresh();
    }
  };

  const toggleActive = async (plan: PlanRow) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);
    if (error) toast.error(error.message);
    else {
      toast.success(plan.is_active ? 'Plan hidden' : 'Plan shown');
      refresh();
    }
  };

  const deletePlan = async (plan: PlanRow) => {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', plan.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Plan deleted');
      refresh();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Subscription Plans</h1>
            <p className="text-sm text-navy-500">Choose which pricing model students see, and manage its plans.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live pricing model</CardTitle>
                <p className="text-xs text-navy-500">Only the live model appears on the pricing and subscription pages. Free plans always stay visible.</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {(['TIERS', 'BUNDLES'] as PricingModel[]).map((model) => {
                  const isLive = liveModel === model;
                  const count = allPlans.filter((p) => p.pricing_model === model && p.price_inr > 0).length;
                  return (
                    <div key={model} className="flex items-center justify-between gap-3 rounded-xl border border-navy-200 p-4">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{MODEL_LABEL[model]}</p>
                        <p className="text-xs text-navy-500">{count} paid {count === 1 ? 'plan' : 'plans'}</p>
                      </div>
                      {isLive ? (
                        <Badge variant="success">Live</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={switching || count === 0} onClick={() => setModelConfirm(model)}>
                          {switching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                          Make live
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allPlans.map((plan) => {
                const Icon = PLAN_ICON[plan.slug] || Gift;
                return (
                  <Card key={plan.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-100 text-govt-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          <p className="text-xs text-navy-500">{MODEL_LABEL[plan.pricing_model]} · {BILLING_LABEL[plan.billing_period] ?? plan.billing_period}</p>
                        </div>
                      </div>
                      <Badge variant={plan.is_active ? 'success' : 'neutral'}>
                        {plan.is_active ? 'Shown' : 'Hidden'}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-navy-900">
                        ₹{plan.price_inr}
                        <span className="text-sm font-normal text-navy-500">{BILLING_SHORT[plan.billing_period] ?? ''}</span>
                      </p>
                      {plan.mock_quota !== null && (
                        <p className="mt-1 text-xs font-medium text-navy-700">{plan.mock_quota} mock tests included</p>
                      )}
                      <p className="mt-1 text-xs text-navy-500">{plan.description || 'No description'}</p>
                      <ul className="mt-3 space-y-1">
                        {(plan.features_json || []).slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-navy-600">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(plan)}>
                          {plan.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {plan.is_active ? 'Hide' : 'Show'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(plan)} className="text-red-600 hover:bg-red-50" aria-label={`Delete ${plan.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {(creating || editing) && (
          <PlanEditor
            plan={editing}
            onClose={() => { setCreating(false); setEditing(null); }}
            onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
          />
        )}

        <ConfirmDialog
          open={modelConfirm !== null}
          onClose={() => setModelConfirm(null)}
          onConfirm={() => modelConfirm && switchModel(modelConfirm)}
          title="Change live pricing model"
          message={modelConfirm ? `Make "${MODEL_LABEL[modelConfirm]}" the live pricing for students? Plans from the other model will be hidden from the pricing and subscription pages.` : ''}
          confirmLabel="Make live"
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deletePlan(deleteTarget)}
          title="Delete plan"
          message={deleteTarget ? `Delete the "${deleteTarget.name}" plan? This cannot be undone.` : ''}
          confirmLabel="Delete"
          destructive
        />
      </div>
    </AdminLayout>
  );
}

function PlanEditor({ plan, onClose, onSaved }: { plan: PlanRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price_inr: plan?.price_inr ?? 0,
    billing_period: plan?.billing_period || 'MONTHLY',
    pricing_model: plan?.pricing_model || 'TIERS',
    mock_quota: plan?.mock_quota === null || plan?.mock_quota === undefined ? '' : String(plan.mock_quota),
    features_json: (plan?.features_json || []).join('\n'),
    is_active: plan?.is_active ?? true,
    sort_order: plan?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const price = Number(form.price_inr);
    const quota = form.mock_quota.trim();
    const quotaNumber = quota === '' ? null : Number(quota);
    if (!name) {
      toast.error('Plan name is required');
      return;
    }
    if (!slug) {
      toast.error('Plan slug is required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Price must be 0 or more');
      return;
    }
    if (quotaNumber !== null && (!Number.isInteger(quotaNumber) || quotaNumber < 0)) {
      toast.error('Mock count must be a whole number of 0 or more');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      slug,
      description: form.description.trim() || null,
      price_inr: price,
      billing_period: form.billing_period,
      pricing_model: form.pricing_model,
      mock_quota: quotaNumber,
      features_json: form.features_json.split('\n').map((s) => s.trim()).filter(Boolean),
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };
    const { error } = plan
      ? await supabase.from('subscription_plans').update(payload).eq('id', plan.id)
      : await supabase.from('subscription_plans').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(plan ? 'Plan updated' : 'Plan created');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#11121c] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{plan ? 'Edit plan' : 'New plan'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/70">Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs text-white/70">Slug
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} />
            </label>
          </div>
          <label className="block text-xs text-white/70">Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/70">Pricing model
              <select value={form.pricing_model} onChange={(e) => setForm({ ...form, pricing_model: e.target.value as PricingModel })} className={inputClass}>
                <option value="TIERS">Monthly tiers</option>
                <option value="BUNDLES">Mock bundles</option>
              </select>
            </label>
            <label className="text-xs text-white/70">Billing
              <select value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value })} className={inputClass}>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
                <option value="ONE_TIME">One-time</option>
                <option value="LIFETIME">Lifetime</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs text-white/70">Price (₹)
              <input type="number" min={0} value={form.price_inr} onChange={(e) => setForm({ ...form, price_inr: Number(e.target.value) })} className={inputClass} />
            </label>
            <label className="text-xs text-white/70">Mock tests
              <input type="number" min={0} value={form.mock_quota} placeholder="None" onChange={(e) => setForm({ ...form, mock_quota: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs text-white/70">Sort order
              <input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={inputClass} />
            </label>
          </div>
          <label className="block text-xs text-white/70">Features (one per line)
            <textarea value={form.features_json} onChange={(e) => setForm({ ...form, features_json: e.target.value })} rows={4} className={inputClass} placeholder={'Access all mock tests\nDetailed solutions\nScore analysis'} />
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-transparent" />
            Shown to students
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.name.trim() || !form.slug.trim()}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
