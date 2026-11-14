import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const RETENTION_QUERY_KEY = ['admin-integrity-retention'];

export function AdminIntegrityRetentionCard() {
  const queryClient = useQueryClient();
  const [draftDays, setDraftDays] = useState('90');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: savedDays, isError } = useQuery({
    queryKey: RETENTION_QUERY_KEY,
    queryFn: async () => {
      const { data, error: readError } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'INTEGRITY_RETENTION')
        .maybeSingle();
      if (readError) throw readError;
      const days = (data?.value as { days?: unknown } | undefined)?.days;
      return typeof days === 'number' ? days : 90;
    },
  });

  useEffect(() => {
    if (savedDays !== undefined) setDraftDays(String(savedDays));
  }, [savedDays]);

  const parsed = Number(draftDays);
  const valid = Number.isInteger(parsed) && parsed >= 7 && parsed <= 365;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_save_integrity_retention', { p_days: parsed });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    toast.success('Retention period saved');
    queryClient.invalidateQueries({ queryKey: RETENTION_QUERY_KEY });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Keep event records for</CardTitle>
        <CardDescription>
          Event records older than this are deleted every day. Review notes are kept. Choose between 7 and 365 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="space-y-1.5 text-sm font-medium text-navy-700">
          Days
          <input
            type="number"
            min={7}
            max={365}
            value={draftDays}
            onChange={(e) => setDraftDays(e.target.value)}
            className="w-32 rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
          />
        </label>
        <Button onClick={handleSave} disabled={!valid || saving || isError}>
          {saving ? 'Saving...' : 'Save retention'}
        </Button>
        {!valid && <p className="text-sm text-red-700">Enter a whole number from 7 to 365.</p>}
        {isError && <p role="alert" className="text-sm text-red-700">Could not load the current setting.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  );
}
