import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
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
  Plus, Trash2, Pencil, X, Save, RefreshCw, Tag, Eye, EyeOff,
  Calendar, Percent, IndianRupee, Users, Gift,
} from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  max_uses_per_user: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  plan_slugs: string[] | null;
  is_active: boolean;
  created_at: string;
}

export function AdminPromoCodesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: codes, isLoading } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PromoCode[];
    },
  });

  const toggleActive = async (code: PromoCode) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !code.is_active, updated_at: new Date().toISOString() })
      .eq('id', code.id);
    if (error) toast.error(error.message);
    else {
      toast.success(code.is_active ? 'Promo code deactivated' : 'Promo code activated');
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    }
  };

  const [deleteCode, setDeleteCode] = useState<PromoCode | null>(null);

  const performDeleteCode = async (code: PromoCode) => {
    if (code.used_count > 0) {
      toast.error('This code has been redeemed. Deactivate it instead to keep redemption history.');
      return;
    }
    const { error } = await supabase.from('promo_codes').delete().eq('id', code.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Promo code deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    }
  };

  const totalRedemptions = (codes || []).reduce((s, c) => s + c.used_count, 0);
  const activeCount = (codes || []).filter((c) => c.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
            <p className="text-sm text-navy-400">Create and manage promotional discount codes for subscriptions.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Code
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-500/10 text-govt-300"><Tag className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{(codes || []).length}</p><p className="text-xs text-navy-400">Total Codes</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><Eye className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{activeCount}</p><p className="text-xs text-navy-400">Active</p></div></div></CardContent></Card>
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><Gift className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-white">{totalRedemptions}</p><p className="text-xs text-navy-400">Total Redemptions</p></div></div></CardContent></Card>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (codes || []).length === 0 ? (
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="py-12 text-center">
              <Tag className="mx-auto h-10 w-10 text-navy-600" />
              <p className="mt-3 text-sm text-navy-400">No promo codes yet. Create one to offer discounts.</p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Create First Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(codes || []).map((code) => {
              const isExpired = code.valid_until && new Date(code.valid_until) < new Date();
              const isExhausted = code.max_uses !== null && code.used_count >= code.max_uses;
              return (
                <Card key={code.id} className={cn('border-white/10 bg-[#11121c] transition-[color,background-color,border-color,opacity]', !code.is_active && 'opacity-60')}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/10 text-govt-300">
                        {code.discount_type === 'PERCENTAGE' ? <Percent className="h-5 w-5" /> : <IndianRupee className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="font-mono text-base text-white">{code.code}</CardTitle>
                        <p className="text-xs text-navy-400">
                          {code.discount_type === 'PERCENTAGE' ? `${code.discount_value}% off` : `₹${code.discount_value} off`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={code.is_active ? 'success' : 'neutral'}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {code.description && <p className="text-xs text-navy-400">{code.description}</p>}
                    <div className="space-y-1.5 text-xs text-navy-300">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-navy-500" />
                        <span>Used: {code.used_count}{code.max_uses !== null ? ` / ${code.max_uses}` : ' (unlimited)'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-navy-500" />
                        <span>Valid: {new Date(code.valid_from).toLocaleDateString()}{code.valid_until ? ` — ${new Date(code.valid_until).toLocaleDateString()}` : ' (no expiry)'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-navy-500" />
                        <span>Per user: {code.max_uses_per_user}x{code.plan_slugs && code.plan_slugs.length > 0 ? ` · Plans: ${code.plan_slugs.join(', ')}` : ' · All plans'}</span>
                      </div>
                    </div>
                    {(isExpired || isExhausted) && (
                      <div className="rounded-lg bg-vibe-500/10 px-3 py-1.5 text-xs text-vibe-300">
                        {isExpired ? 'Expired' : isExhausted ? 'Usage limit reached' : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(code)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(code)}>
                        {code.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {code.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteCode(code)} className="text-vibe-300 hover:bg-vibe-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {(creating || editing) && (
          <PromoCodeEditor
            code={editing}
            userId={user?.id || null}
            onClose={() => { setCreating(false); setEditing(null); }}
            onSaved={() => { setCreating(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }); }}
          />
        )}

        <ConfirmDialog
          open={deleteCode !== null}
          onClose={() => setDeleteCode(null)}
          onConfirm={() => deleteCode && performDeleteCode(deleteCode)}
          title="Delete promo code"
          message={deleteCode ? `Delete promo code "${deleteCode.code}"? This cannot be undone.` : ''}
          confirmLabel="Delete"
          destructive
        />
      </div>
    </AdminLayout>
  );
}

function PromoCodeEditor({ code, userId, onClose, onSaved }: {
  code: PromoCode | null;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: code?.code || '',
    description: code?.description || '',
    discount_type: code?.discount_type || 'PERCENTAGE',
    discount_value: code?.discount_value ?? 10,
    max_uses: code?.max_uses ?? '',
    max_uses_per_user: code?.max_uses_per_user ?? 1,
    valid_from: code?.valid_from ? new Date(code.valid_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    valid_until: code?.valid_until ? new Date(code.valid_until).toISOString().slice(0, 10) : '',
    plan_slugs: (code?.plan_slugs || []).join(', '),
    is_active: code?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const maxUsesNumber = form.max_uses === '' ? null : Number(form.max_uses);
  const percentOutOfRange = form.discount_type === 'PERCENTAGE' && (form.discount_value < 1 || form.discount_value > 100);
  const formValid =
    form.code.trim().length > 0 &&
    form.discount_value >= 1 &&
    !percentOutOfRange &&
    form.max_uses_per_user >= 1 &&
    (maxUsesNumber === null || (maxUsesNumber >= 1 && maxUsesNumber >= (code?.used_count ?? 0))) &&
    (!form.valid_until || form.valid_until >= form.valid_from);

  const save = async () => {
    if (!formValid) return;
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ''),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_user: Number(form.max_uses_per_user),
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: form.valid_until ? new Date(form.valid_until + 'T23:59:59').toISOString() : null,
      plan_slugs: form.plan_slugs.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
      is_active: form.is_active,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { error } = code
      ? await supabase.from('promo_codes').update(payload).eq('id', code.id)
      : await supabase.from('promo_codes').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(code ? 'Promo code updated' : 'Promo code created');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg border-white/15 bg-[#15161f]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">{code ? 'Edit Promo Code' : 'New Promo Code'}</CardTitle>
            <button onClick={onClose} className="text-navy-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-navy-400">Code
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none" />
            </label>
            <label className="text-xs text-navy-400">Discount Type
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
              </select>
            </label>
          </div>
          <label className="text-xs text-navy-400">Description (internal)
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Diwali campaign..." className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs text-navy-400">{form.discount_type === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}
              <input type="number" min={1} max={form.discount_type === 'PERCENTAGE' ? 100 : undefined} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none" />
            </label>
            <label className="text-xs text-navy-400">Max Uses (blank = unlimited)
              <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="100" className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none" />
            </label>
            <label className="text-xs text-navy-400">Per User Limit
              <input type="number" min={1} value={form.max_uses_per_user} onChange={(e) => setForm({ ...form, max_uses_per_user: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-navy-400">Valid From
              <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none" />
            </label>
            <label className="text-xs text-navy-400">Valid Until (blank = no expiry)
              <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none" />
            </label>
          </div>
          <label className="text-xs text-navy-400">Plan Restrictions (comma-separated slugs, blank = all plans)
            <input value={form.plan_slugs} onChange={(e) => setForm({ ...form, plan_slugs: e.target.value })} placeholder="pro, elite" className="mt-1 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-200">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/[.04]" />
            Active (students can use this code)
          </label>
        </CardContent>
        <div className="flex justify-end gap-2 border-t border-white/10 p-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!formValid}>
            <Save className="h-4 w-4" /> {code ? 'Save Changes' : 'Create Code'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
