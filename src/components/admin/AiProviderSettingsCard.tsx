import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type ProviderName = 'gemini' | 'openai';

interface ProviderSettings {
  provider: ProviderName;
  model: string;
  input_paise_per_million: number;
  output_paise_per_million: number;
}

const DEFAULTS: ProviderSettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  input_paise_per_million: 2500,
  output_paise_per_million: 21000,
};

const PROVIDER_LABELS: Record<ProviderName, string> = {
  gemini: 'Google Gemini (needs GEMINI_API_KEY)',
  openai: 'OpenAI (needs OPENAI_API_KEY)',
};

const inputClass =
  'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none';

function parseSettings(value: unknown): ProviderSettings {
  const v = (value ?? {}) as Partial<ProviderSettings>;
  return {
    provider: v.provider === 'openai' ? 'openai' : 'gemini',
    model: typeof v.model === 'string' && v.model.trim() ? v.model : DEFAULTS.model,
    input_paise_per_million: Number.isFinite(v.input_paise_per_million) ? Number(v.input_paise_per_million) : DEFAULTS.input_paise_per_million,
    output_paise_per_million: Number.isFinite(v.output_paise_per_million) ? Number(v.output_paise_per_million) : DEFAULTS.output_paise_per_million,
  };
}

export function AiProviderSettingsCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProviderSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: saved, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-ai-provider-settings'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'AI_PROVIDER_SETTINGS')
        .maybeSingle();
      if (fetchError) throw fetchError;
      return parseSettings(data?.value);
    },
  });

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  const handleSave = async () => {
    const model = form.model.trim();
    if (!model) {
      setError('Enter a model name.');
      return;
    }
    if (!Number.isInteger(form.input_paise_per_million) || !Number.isInteger(form.output_paise_per_million)
      || form.input_paise_per_million < 0 || form.output_paise_per_million < 0) {
      setError('Prices must be whole numbers of paise, zero or more.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from('platform_settings')
      .update({ value: { ...form, model }, updated_at: new Date().toISOString() })
      .eq('key', 'AI_PROVIDER_SETTINGS');
    setSaving(false);
    if (saveError) {
      setError('Settings could not be saved. Try again.');
      return;
    }
    toast.success('AI provider settings saved');
    queryClient.invalidateQueries({ queryKey: ['admin-ai-provider-settings'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4" aria-hidden /> Provider and pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">Provider settings could not be loaded.</p>
            <button className="text-sm font-medium text-govt-600 underline" onClick={() => refetch()}>Try again</button>
          </div>
        )}
        {saved && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-navy-700">
                Provider
                <select
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as ProviderName }))}
                  className={inputClass}
                >
                  {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-navy-700">
                Model
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm text-navy-700">
                Input price (paise per million tokens)
                <input
                  type="number"
                  min={0}
                  value={form.input_paise_per_million}
                  onChange={(e) => setForm((f) => ({ ...f, input_paise_per_million: Number(e.target.value) }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm text-navy-700">
                Output price (paise per million tokens)
                <input
                  type="number"
                  min={0}
                  value={form.output_paise_per_million}
                  onChange={(e) => setForm((f) => ({ ...f, output_paise_per_million: Number(e.target.value) }))}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-sm text-navy-600">
              The provider key is read from server secrets. Changing the provider here does not store or show any key.
            </p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
              Save settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
