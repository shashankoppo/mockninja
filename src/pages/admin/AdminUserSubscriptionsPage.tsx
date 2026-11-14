import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { EXPIRY_ALERT_DAYS } from '@/lib/subscription-expiry';
import { RefreshCw, Search, XCircle } from 'lucide-react';

type StatusFilter = 'ALL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  plan: { name: string; price_inr: number } | null;
  profile: { email: string; full_name: string | null } | null;
}

interface RawSubscriptionRow extends Omit<SubscriptionRow, 'plan' | 'profile'> {
  plan: { name: string; price_inr: number } | { name: string; price_inr: number }[] | null;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

const statusVariant: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  CANCELLED: 'error',
  EXPIRED: 'neutral',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : '—';
}

function isPaidActive(row: SubscriptionRow) {
  return row.status === 'ACTIVE' && (row.plan?.price_inr ?? 0) > 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(value: string | null, now: number): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - now) / DAY_MS);
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) return <Badge variant="error">Expired</Badge>;
  if (days === 0) return <Badge variant="error">Expires today</Badge>;
  const label = `${days} ${days === 1 ? 'day' : 'days'} left`;
  if (days <= EXPIRY_ALERT_DAYS) return <Badge variant="warning">{label}</Badge>;
  return <Badge variant="neutral">{label}</Badge>;
}

export function AdminUserSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: rows, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-user-subscriptions', statusFilter],
    queryFn: async (): Promise<SubscriptionRow[]> => {
      let query = supabase
        .from('user_subscriptions')
        .select('id, user_id, status, started_at, expires_at, plan:plan_id(name, price_inr)')
        .order('started_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'ALL') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;

      const raw = (data ?? []) as unknown as RawSubscriptionRow[];
      const userIds = [...new Set(raw.map((row) => row.user_id))];
      const profilesById = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        if (profileError) throw profileError;
        for (const profile of (profiles ?? []) as ProfileRow[]) profilesById.set(profile.id, profile);
      }

      return raw.map((row) => {
        const plan = Array.isArray(row.plan) ? row.plan[0] ?? null : row.plan;
        const profile = profilesById.get(row.user_id);
        return {
          ...row,
          plan,
          profile: profile ? { email: profile.email, full_name: profile.full_name } : null,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows ?? [];
    return (rows ?? []).filter((row) => {
      const email = row.profile?.email?.toLowerCase() ?? '';
      const name = row.profile?.full_name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });
  }, [rows, search]);

  const now = Date.now();
  const expiringSoon = (rows ?? []).filter((row) => {
    if (!isPaidActive(row)) return false;
    const days = daysUntil(row.expires_at, now);
    return days !== null && days >= 0 && days <= EXPIRY_ALERT_DAYS;
  });

  const cancelSubscription = async (row: SubscriptionRow) => {
    setCancellingId(row.id);
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'CANCELLED', expires_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'ACTIVE')
      .select('id');
    setCancellingId(null);
    setConfirmingId(null);
    if (error) {
      toast.error('Could not cancel this subscription. Please try again.');
      return;
    }
    if (!data || data.length === 0) {
      toast.error('This subscription was already changed. Refresh the list and check again.');
      return;
    }
    toast.success('Paid subscription cancelled.');
    await queryClient.invalidateQueries({ queryKey: ['admin-user-subscriptions'] });
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'EXPIRED', label: 'Expired' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-govt-300">Admin</p>
          <h1 className="mt-1 text-2xl font-bold govt-heading">User subscriptions</h1>
          <p className="mt-1 text-sm text-navy-300">View each student's plan and cancel paid access when needed.</p>
        </div>

        {expiringSoon.length > 0 && (
          <div role="status" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            {expiringSoon.length} paid {expiringSoon.length === 1 ? 'subscription expires' : 'subscriptions expire'} within {EXPIRY_ALERT_DAYS} days.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Subscriptions</CardTitle>
                <CardDescription>Newest first, up to 200 rows.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      statusFilter === filter.value
                        ? 'border-govt-500 bg-govt-500 text-white'
                        : 'border-navy-200 text-navy-600 hover:border-govt-400'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <label className="relative sm:ml-auto sm:w-72">
                <span className="sr-only">Search by name or email</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email"
                  className="input pl-9"
                />
              </label>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                Subscriptions could not be loaded. Refresh the page to try again.
              </div>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-navy-300">No subscriptions match this view.</p>
            )}

            {!isLoading && !isError && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy-200 text-xs uppercase tracking-wide text-navy-400">
                      <th className="py-3 pr-4 font-semibold">Student</th>
                      <th className="py-3 pr-4 font-semibold">Plan</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 pr-4 font-semibold">Started</th>
                      <th className="py-3 pr-4 font-semibold">Expires</th>
                      <th className="py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const paid = isPaidActive(row);
                      const confirming = confirmingId === row.id;
                      const busy = cancellingId === row.id;
                      return (
                        <tr key={row.id} className="border-b border-navy-100 align-middle transition-colors hover:bg-navy-50/60">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-navy-900">{row.profile?.full_name || 'No name'}</p>
                            <p className="text-xs text-navy-400">{row.profile?.email || row.user_id}</p>
                          </td>
                          <td className="py-3 pr-4 text-navy-700">
                            {row.plan ? `${row.plan.name}${row.plan.price_inr > 0 ? ` (Rs ${row.plan.price_inr})` : ''}` : 'Unknown plan'}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusVariant[row.status] ?? 'neutral'}>{row.status}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-navy-600">{formatDate(row.started_at)}</td>
                          <td className="py-3 pr-4">
                            <p className="text-navy-600">{formatDate(row.expires_at)}</p>
                            {row.status === 'ACTIVE' && <div className="mt-1"><ExpiryBadge days={daysUntil(row.expires_at, now)} /></div>}
                          </td>
                          <td className="py-3 text-right">
                            {paid && !confirming && (
                              <Button variant="outline" size="sm" onClick={() => setConfirmingId(row.id)}>
                                <XCircle className="h-4 w-4" /> Cancel plan
                              </Button>
                            )}
                            {paid && confirming && (
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingId(null)}>
                                  Keep
                                </Button>
                                <Button size="sm" disabled={busy} onClick={() => cancelSubscription(row)}>
                                  {busy ? 'Cancelling...' : 'Confirm cancel'}
                                </Button>
                              </div>
                            )}
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
      </div>
    </AdminLayout>
  );
}
