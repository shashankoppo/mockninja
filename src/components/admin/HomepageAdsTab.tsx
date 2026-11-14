import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, RefreshCw, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { AD_KIND_LABELS, type AdItem, type AdKind } from '@/features/home/types/advertisements';

const EMPTY_AD: AdItem = {
  id: '', kind: 'TEST_SERIES', title: '', body: '', image_url: '', cta_label: '', cta_url: '', is_active: true,
};

export function HomepageAdsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdItem | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-homepage-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('content_json')
        .eq('section_key', 'advertisements')
        .maybeSingle();
      if (error) throw error;
      return (data?.content_json ?? { enabled: true, items: [] }) as { enabled?: boolean; items?: AdItem[] };
    },
  });

  const items = data?.items ?? [];

  const persist = async (nextItems: AdItem[]) => {
    const { error } = await supabase
      .from('homepage_content')
      .upsert(
        { section_key: 'advertisements', content_json: { enabled: data?.enabled !== false, items: nextItems } },
        { onConflict: 'section_key' },
      );
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['admin-homepage-ads'] });
    queryClient.invalidateQueries({ queryKey: ['home-content'] });
  };

  const save = async () => {
    if (!editing) return;
    const ad = { ...editing, title: editing.title.trim(), body: editing.body.trim(), cta_label: editing.cta_label.trim(), cta_url: editing.cta_url.trim(), image_url: editing.image_url.trim() };
    const isNew = ad.id === '';
    const nextItems = isNew
      ? [...items, { ...ad, id: crypto.randomUUID() }]
      : items.map((item) => (item.id === ad.id ? ad : item));
    setSaving(true);
    try {
      await persist(nextItems);
      toast.success(isNew ? 'Advertisement added' : 'Advertisement updated');
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save advertisement');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: AdItem) => {
    try {
      await persist(items.map((item) => (item.id === ad.id ? { ...item, is_active: !item.is_active } : item)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update advertisement');
    }
  };

  const performRemove = async (ad: AdItem) => {
    try {
      await persist(items.filter((item) => item.id !== ad.id));
      toast.success('Advertisement deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete advertisement');
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const canSave = editing !== null && editing.title.trim() !== '' && editing.cta_label.trim() !== '' && editing.cta_url.trim() !== '' && (editing.cta_url.startsWith('/') || /^https?:\/\//.test(editing.cta_url.trim()));

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-navy-500">Shown in the Advertisements section on the home page. Only active items appear.</p>
        <Button variant="primary" size="sm" onClick={() => setEditing({ ...EMPTY_AD })}>
          <Plus className="h-4 w-4" /> Add advertisement
        </Button>
      </div>

      {editing && (
        <Card className="border-govt-300 ring-1 ring-govt-200">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Type</label>
                <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as AdKind })} className="input w-full">
                  {(Object.keys(AD_KIND_LABELS) as AdKind[]).map((k) => <option key={k} value={k}>{AD_KIND_LABELS[k]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Title</label>
                <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input w-full" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">Description</label>
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={2} className="input w-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Button text</label>
                <input type="text" value={editing.cta_label} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Button link</label>
                <input type="text" placeholder="/mock-tests or https://…" value={editing.cta_url} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Image URL (optional)</label>
                <input type="text" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="input w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving || !canSave}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((ad) => (
          <Card key={ad.id} className={cn(!ad.is_active && 'opacity-60')}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{ad.title}</p>
                <p className="mt-0.5 text-xs text-navy-500">{AD_KIND_LABELS[ad.kind]} · {ad.cta_label} → {ad.cta_url}</p>
              </div>
              <button onClick={() => toggleActive(ad)} className="flex items-center gap-1 text-xs text-navy-600 hover:text-govt-700">
                {ad.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {ad.is_active ? 'Active' : 'Hidden'}
              </button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(ad)}><Edit3 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(ad)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-sm text-navy-400">No advertisements yet.</p>}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && performRemove(deleteTarget)}
        title="Delete advertisement"
        message={deleteTarget ? `Delete advertisement "${deleteTarget.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
