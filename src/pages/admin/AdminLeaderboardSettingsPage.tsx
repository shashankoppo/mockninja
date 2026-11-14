import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface LeaderboardSettings {
  enabled: boolean;
  min_cohort: number;
  min_questions_per_chapter: number;
  min_total: number;
  list_size: number;
  subjects_shown: number[];
}

interface SubjectOption {
  id: number;
  name: string;
}

const DEFAULTS: LeaderboardSettings = {
  enabled: true,
  min_cohort: 30,
  min_questions_per_chapter: 8,
  min_total: 50,
  list_size: 50,
  subjects_shown: [],
};

const INPUT_CLASS =
  'w-full rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none';

type NumericField = 'min_cohort' | 'min_questions_per_chapter' | 'min_total' | 'list_size';

export function AdminLeaderboardSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeaderboardSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: saved, isLoading, isError } = useQuery({
    queryKey: ['admin-leaderboard-settings'],
    queryFn: async () => {
      const { data: row, error: rowError } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'LEADERBOARD_SETTINGS')
        .maybeSingle();
      if (rowError) throw rowError;
      return { ...DEFAULTS, ...(row?.value as Partial<LeaderboardSettings> | undefined) };
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['admin-leaderboard-subjects'],
    queryFn: async () => {
      const { data: rows, error: subjectsError } = await supabase.from('subjects').select('id, name').order('id');
      if (subjectsError) throw subjectsError;
      return (rows ?? []) as SubjectOption[];
    },
  });

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  const setNumber = (field: NumericField, value: string) => {
    setForm((current) => ({ ...current, [field]: Number(value) }));
  };

  const toggleSubject = (id: number) => {
    setForm((current) => ({
      ...current,
      subjects_shown: current.subjects_shown.includes(id)
        ? current.subjects_shown.filter((s) => s !== id)
        : [...current.subjects_shown, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_save_leaderboard_settings', { p_settings: form });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    toast.success('Leaderboard settings saved');
    queryClient.invalidateQueries({ queryKey: ['admin-leaderboard-settings'] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Leaderboard Settings</h1>
          <p className="text-sm text-navy-500">Decide when the public leaderboard shows rankings and which subjects it covers.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {isError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load the leaderboard settings. Refresh the page to try again.
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-navy-500">Loading settings...</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rules</CardTitle>
              <CardDescription>Changes apply to the leaderboard as soon as you save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="flex items-center gap-3 text-sm font-medium text-navy-700">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((current) => ({ ...current, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-navy-300"
                />
                Show the leaderboard to students
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700">Minimum opted-in students</label>
                  <input type="number" min={1} value={form.min_cohort} onChange={(e) => setNumber('min_cohort', e.target.value)} className={INPUT_CLASS} />
                  <p className="text-xs text-navy-500">The leaderboard stays empty until this many students have opted in.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700">Minimum questions per chapter</label>
                  <input type="number" min={0} value={form.min_questions_per_chapter} onChange={(e) => setNumber('min_questions_per_chapter', e.target.value)} className={INPUT_CLASS} />
                  <p className="text-xs text-navy-500">A chapter counts only after a student answers this many questions in it.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700">Minimum total questions</label>
                  <input type="number" min={0} value={form.min_total} onChange={(e) => setNumber('min_total', e.target.value)} className={INPUT_CLASS} />
                  <p className="text-xs text-navy-500">A student is ranked only after reaching this many questions in the subject.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-700">List size</label>
                  <input type="number" min={1} value={form.list_size} onChange={(e) => setNumber('list_size', e.target.value)} className={INPUT_CLASS} />
                  <p className="text-xs text-navy-500">Maximum number of students shown for each subject.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-navy-700">Subjects shown</p>
                <p className="text-xs text-navy-500">
                  {form.subjects_shown.length === 0
                    ? 'No subject selected, so every subject is shown.'
                    : 'Only the selected subjects are shown.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => {
                    const selected = form.subjects_shown.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSubject(subject.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-sm transition-colors',
                          selected
                            ? 'border-govt-600 bg-govt-600 text-white'
                            : 'border-navy-300 bg-white text-navy-700 hover:border-govt-500',
                        )}
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg bg-navy-50 p-4 text-sm text-navy-700">
                Students under 18 need guardian consent before they can appear on the leaderboard. This rule is always on and cannot be changed here.
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
