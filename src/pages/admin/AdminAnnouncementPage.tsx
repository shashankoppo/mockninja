import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Megaphone, RefreshCw, Save, CalendarClock, Eye, EyeOff, X, ArrowUpRight } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useSiteSettings, isAnnouncementVisible, type AnnouncementBarSettings } from '@/lib/site-settings';

const TEXT_MAX = 200;

function isValidLink(url: string) {
  return url === '' || url.startsWith('/') || /^https?:\/\//.test(url);
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function statusLabel(form: AnnouncementBarSettings): { text: string; tone: 'live' | 'scheduled' | 'expired' | 'hidden' } {
  if (!form.enabled || !form.text.trim()) return { text: 'Hidden', tone: 'hidden' };
  const now = new Date();
  if (form.start_at && new Date(form.start_at).getTime() > now.getTime()) return { text: 'Scheduled', tone: 'scheduled' };
  if (form.end_at && new Date(form.end_at).getTime() <= now.getTime()) return { text: 'Expired', tone: 'expired' };
  return { text: 'Live now', tone: 'live' };
}

const ANNOUNCEMENT_PRESETS = [
  {
    id: 'holiday',
    label: 'Holiday',
    description: 'Notice for holidays',
    fields: { text: 'Holiday notice: support replies may be slower today. Happy holidays from Mock Ninja!', link_label: 'Browse mock tests', link_url: '/mock-tests' },
  },
  {
    id: 'maintenance',
    label: 'Maintenance alert',
    description: 'Planned downtime',
    fields: { text: 'Scheduled maintenance: the site may be briefly unavailable. Thank you for your patience.', link_label: 'Contact support', link_url: '/contact' },
  },
  {
    id: 'flash-sale',
    label: 'Flash sale',
    description: 'Limited-time offer',
    fields: { text: 'Flash sale: limited-time discount on plans. Offer ends soon.', link_label: 'View offer', link_url: '/pricing' },
  },
] as const;

const TONE_STYLES: Record<string, string> = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  scheduled: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  expired: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  hidden: 'bg-white/10 text-navy-300 border-white/15',
};

export function AdminAnnouncementPage() {
  const { data, isLoading } = useSiteSettings();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Announcement Bar</h1>
          <p className="text-sm text-navy-500">Edit, schedule, and preview the banner shown at the top of every page.</p>
        </div>
        {isLoading || !data ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <AnnouncementForm key={JSON.stringify(data.announcement)} initial={data.announcement} />
        )}
      </div>
    </AdminLayout>
  );
}

function AnnouncementForm({ initial }: { initial: AnnouncementBarSettings }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<AnnouncementBarSettings>(initial);

  const status = useMemo(() => statusLabel(form), [form]);
  const previewVisible = isAnnouncementVisible(form);
  const previewKey = useMemo(() => JSON.stringify({ ...form }), [form]);

  const textValid = form.text.trim().length > 0 && form.text.length <= TEXT_MAX;
  const linkValid = isValidLink(form.link_url) && (form.link_url === '' || form.link_label.trim() !== '');
  const scheduleValid =
    (!form.start_at || !form.end_at || new Date(form.start_at).getTime() < new Date(form.end_at).getTime());

  const canSave = textValid && linkValid && scheduleValid;
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.enabled && !textValid) {
      toast.error(`Enter a message up to ${TEXT_MAX} characters.`);
      return;
    }
    if (!linkValid) {
      toast.error('Link must start with / or https:// and needs a label.');
      return;
    }
    if (!scheduleValid) {
      toast.error('End time must be after start time.');
      return;
    }
    setSaving(true);
    const payload: AnnouncementBarSettings = {
      ...form,
      text: form.text.trim(),
      link_label: form.link_label.trim(),
      link_url: form.link_url.trim(),
      start_at: form.start_at,
      end_at: form.end_at,
    };
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: payload, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', 'announcement_bar');
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Announcement bar saved');
    queryClient.invalidateQueries({ queryKey: ['site-settings'] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Bar settings</span>
              <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', TONE_STYLES[status.tone])}>{status.text}</span>
            </CardTitle>
            <CardDescription>{form.enabled ? 'Will show on every page when within the schedule.' : 'Hidden from visitors until you turn it on.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-navy-200 p-3">
              <span className="text-sm font-medium text-navy-900">Show announcement bar</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
                className={cn('relative h-6 w-11 rounded-full transition-colors', form.enabled ? 'bg-emerald-500' : 'bg-navy-200')}
              >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', form.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
            </label>

            <div>
              <p className="mb-2 text-xs font-medium text-navy-600">Quick presets</p>
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {ANNOUNCEMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setForm({ ...form, enabled: true, ...preset.fields })}
                    className="rounded-lg border border-navy-200 px-3 py-2 text-left text-xs transition-colors hover:border-navy-400 hover:bg-navy-50"
                  >
                    <span className="block font-semibold text-navy-900">{preset.label}</span>
                    <span className="mt-0.5 block text-navy-500">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">Message</label>
              <input
                type="text"
                value={form.text}
                maxLength={TEXT_MAX}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="e.g. New JEE Main test series is live"
                className="input w-full"
              />
              <p className="mt-1 text-xs text-navy-400">{form.text.length}/{TEXT_MAX}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Link label (optional)</label>
                <input type="text" value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="e.g. View plans" className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-navy-600">Link address (optional)</label>
                <input type="text" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/pricing or https://…" className="input w-full" />
              </div>
            </div>

            <div className="rounded-lg border border-navy-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-navy-500" />
                <p className="text-sm font-medium text-navy-900">Schedule (optional)</p>
              </div>
              <p className="mb-3 text-xs text-navy-500">Leave both blank to always show while enabled. Times are in your local timezone.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-600">Start (optional)</label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(form.start_at)}
                    onChange={(e) => setForm({ ...form, start_at: fromLocalInput(e.target.value) })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-600">End (optional)</label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(form.end_at)}
                    onChange={(e) => setForm({ ...form, end_at: fromLocalInput(e.target.value) })}
                    className="input w-full"
                  />
                </div>
              </div>
              {!scheduleValid && <p className="mt-2 text-xs text-amber-300">End time must be after start time.</p>}
              {(form.start_at || form.end_at) && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, start_at: null, end_at: null })}
                  className="mt-3 flex items-center gap-1 text-xs text-navy-400 hover:text-navy-200"
                >
                  <X className="h-3 w-3" /> Clear schedule
                </button>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={save} disabled={saving || (form.enabled && !canSave)}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save announcement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {previewVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Live preview
            </CardTitle>
            <CardDescription>
              {previewVisible ? 'This is how visitors see it right now.' : 'Not visible — disabled, outside schedule, or empty.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div key={previewKey} className="overflow-hidden rounded-xl border border-white/10">
              {previewVisible ? (
                <div role="region" aria-label="Announcement preview" className="announcement-bar">
                  <div className="announcement-bar-inner">
                    <span className="announcement-bar-icon" aria-hidden="true">
                      <Megaphone className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <div className="announcement-bar-copy">
                      <span className="announcement-bar-label">Latest update</span>
                      <div className="announcement-bar-scroll">
                        <div className="announcement-bar-track">
                          <span className="announcement-bar-message">{form.text}</span>
                          <span className="announcement-bar-message" aria-hidden="true">{form.text}</span>
                        </div>
                      </div>
                    </div>
                    {form.link_label && form.link_url && (
                      <span className="announcement-bar-link">
                        <span>{form.link_label}</span>
                        <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center bg-white/5 text-sm text-navy-400">
                  No announcement visible
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-xs text-navy-400">
              <p><span className="font-semibold text-navy-300">Status:</span> {status.text}</p>
              <p><span className="font-semibold text-navy-300">Message:</span> {form.text.trim() || '—'}</p>
              {form.link_label && <p><span className="font-semibold text-navy-300">Link:</span> {form.link_label} → {form.link_url || '—'}</p>}
              {form.start_at && <p><span className="font-semibold text-navy-300">Starts:</span> {new Date(form.start_at).toLocaleString()}</p>}
              {form.end_at && <p><span className="font-semibold text-navy-300">Ends:</span> {new Date(form.end_at).toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
