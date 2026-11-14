import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Layout = 'SINGLE' | 'TILED';
type Scope = 'EXAM_ONLY' | 'ALL_MODES';

interface WatermarkPolicy {
  enabled: boolean;
  content: 'SHORT_ID';
  opacity: number;
  layout: Layout;
  scope: Scope;
}

const DEFAULTS: WatermarkPolicy = {
  enabled: true,
  content: 'SHORT_ID',
  opacity: 0.06,
  layout: 'TILED',
  scope: 'EXAM_ONLY',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none';

const PREVIEW_ID = 'ABCD1234';

export function AdminWatermarkSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WatermarkPolicy>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: saved, isLoading, isError } = useQuery({
    queryKey: ['admin-watermark-policy'],
    queryFn: async () => {
      const { data: row, error: rowError } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'WATERMARK_POLICY')
        .maybeSingle();
      if (rowError) throw rowError;
      return { ...DEFAULTS, ...(row?.value as Partial<WatermarkPolicy> | undefined) };
    },
  });

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  const opacityPercent = Math.round(form.opacity * 100);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_save_watermark_policy', { p_policy: form });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    toast.success('Watermark policy saved. New exam attempts will use it.');
    queryClient.invalidateQueries({ queryKey: ['admin-watermark-policy'] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Watermark Policy</h1>
          <p className="text-sm text-navy-500">
            A watermark is a deterrent. It discourages screenshots and photos but does not prevent copying.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {isError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load the watermark policy. Refresh the page to try again.
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-navy-500">Loading policy...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>A running exam keeps the policy it started with. Changes apply to attempts that start after you save.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex items-center gap-3 text-sm font-medium text-navy-700">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((current) => ({ ...current, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-navy-300"
                  />
                  Show the watermark
                </label>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700" htmlFor="watermark-opacity">Opacity: {opacityPercent}%</label>
                  <input
                    id="watermark-opacity"
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={opacityPercent}
                    onChange={(e) => setForm((current) => ({ ...current, opacity: Number(e.target.value) / 100 }))}
                    className="w-full"
                  />
                  <p className="text-xs text-navy-500">Between 3 and 10 percent so the text stays faint.</p>
                </div>

                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium text-navy-700">Layout</legend>
                  <div className="flex gap-2">
                    {(['TILED', 'SINGLE'] as Layout[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={form.layout === option}
                        onClick={() => setForm((current) => ({ ...current, layout: option }))}
                        className={cn(
                          'rounded-full border px-3 py-1 text-sm transition-colors',
                          form.layout === option
                            ? 'border-govt-600 bg-govt-600 text-white'
                            : 'border-navy-300 bg-white text-navy-700 hover:border-govt-500',
                        )}
                      >
                        {option === 'TILED' ? 'Tiled' : 'Single'}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700" htmlFor="watermark-scope">Where it appears</label>
                  <select
                    id="watermark-scope"
                    value={form.scope}
                    onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value as Scope }))}
                    className={INPUT_CLASS}
                  >
                    <option value="EXAM_ONLY">Exam screen only</option>
                    <option value="ALL_MODES">Exam screen and practice</option>
                  </select>
                </div>

                <div className="rounded-lg bg-navy-50 p-4 text-sm text-navy-700">
                  The watermark shows a short candidate ID only. Names, emails and handles are never shown.
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save policy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>Approximate look on the exam screen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-lg border border-navy-200 bg-white">
                  <p className="text-center text-sm text-navy-400">Sample question text</p>
                  {form.enabled && (
                    <div
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute inset-0 flex items-center justify-center',
                        form.layout === 'TILED' && 'flex-wrap content-around gap-8 p-6',
                      )}
                    >
                      {Array.from({ length: form.layout === 'TILED' ? 12 : 1 }, (_, index) => (
                        <span
                          key={index}
                          className="text-xs font-bold uppercase tracking-widest text-navy-900 whitespace-nowrap"
                          style={{ opacity: form.opacity }}
                        >
                          Candidate ID {PREVIEW_ID}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
