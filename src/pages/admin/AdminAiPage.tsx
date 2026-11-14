import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { AiGenerateForm } from '@/components/admin/AiGenerateForm';
import { AiProviderSettingsCard } from '@/components/admin/AiProviderSettingsCard';
import { AiJobsTable } from '@/components/admin/AiJobsTable';

interface LedgerRow {
  id: string;
  purpose: 'STUDIO' | 'DAILY_TOPUP';
  tokens_in: number;
  tokens_out: number;
  cost_paise: number;
  created_at: string;
}

function useAiUsage() {
  return useQuery({
    queryKey: ['ai-usage-ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_ledger')
        .select('id, purpose, tokens_in, tokens_out, cost_paise, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
    },
  });
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function AdminAiPage() {
  const { data, isLoading, isError, refetch } = useAiUsage();

  const monthRows = (data ?? []).filter((r) => new Date(r.created_at).getTime() >= startOfMonth());
  const monthSpend = monthRows.reduce((sum, r) => sum + r.cost_paise, 0);
  const monthTokens = monthRows.reduce((sum, r) => sum + r.tokens_in + r.tokens_out, 0);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-navy-900">AI Question Studio</h1>
          <p className="text-sm text-navy-600">
            Generate questions for a chapter, review them, then publish. Jobs, provider settings, and spend are shown below.
          </p>
        </header>

        <AiGenerateForm />

        <AiProviderSettingsCard />

        <AiJobsTable />

        {isLoading && <Skeleton className="h-32 w-full" />}

        {isError && (
          <ErrorState
            title="Could not load AI usage"
            action={<button className="text-sm font-medium text-govt-600 underline" onClick={() => refetch()}>Try again</button>}
          />
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-navy-600">Spend this month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums text-navy-900">{formatRupees(monthSpend)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-navy-600">Tokens this month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums text-navy-900">{monthTokens.toLocaleString('en-IN')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-navy-600">Recorded calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums text-navy-900">{data.length}</p>
                </CardContent>
              </Card>
            </div>

            {data.length === 0 ? (
              <EmptyState title="No AI usage yet" description="Usage appears here once AI work is recorded." />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent usage</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-navy-500">
                      <tr>
                        <th className="py-2 pr-4 font-medium">When</th>
                        <th className="py-2 pr-4 font-medium">Purpose</th>
                        <th className="py-2 pr-4 text-right font-medium">Tokens in</th>
                        <th className="py-2 pr-4 text-right font-medium">Tokens out</th>
                        <th className="py-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 50).map((r) => (
                        <tr key={r.id} className="border-t border-navy-100 text-navy-800">
                          <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                          <td className="py-2 pr-4">{r.purpose === 'STUDIO' ? 'Studio' : 'Daily top-up'}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{r.tokens_in.toLocaleString('en-IN')}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{r.tokens_out.toLocaleString('en-IN')}</td>
                          <td className="py-2 text-right tabular-nums">{formatRupees(r.cost_paise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
