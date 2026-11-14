import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Eye, EyeOff, Save, RefreshCw, Plus, Trash2, Edit3, X,
  Star, HelpCircle, Flame, Gift, GripVertical, ArrowUp, ArrowDown, Check, Megaphone,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { HomepageAdsTab } from '@/components/admin/HomepageAdsTab';

type TabKey = 'sections' | 'hero' | 'testimonials' | 'faqs' | 'featured' | 'ads';

const SECTION_LABELS: Record<string, { label: string; group: string }> = {
  hero: { label: 'Hero Banner', group: 'Top' },
  stats_strip: { label: 'Stats Strip', group: 'Top' },
  nta_showcase: { label: 'NTA Exam Experience', group: 'Showcase' },
  popular_mock_tests: { label: 'Popular Mock Tests', group: 'Showcase' },
  free_on_mock_ninja: { label: 'Free on Mock Ninja', group: 'Showcase' },
  previous_year_papers: { label: 'Previous-Year Papers', group: 'Practice' },
  subject_chapter_practice: { label: 'Subject & Chapter Practice', group: 'Practice' },
  dpp: { label: 'Daily Practice Problems', group: 'Practice' },
  daily_target_mock: { label: 'Daily Target Mock', group: 'Practice' },
  performance_analytics: { label: 'Performance Analytics', group: 'Features' },
  reattempt_mistake: { label: 'Re-attempt & Mistake Notebook', group: 'Features' },
  study_plan: { label: 'Personalized Study Plan', group: 'Features' },
  mastery_tracking: { label: 'Chapter Mastery Tracking', group: 'Features' },
  ranking_system: { label: 'Student Ranking System', group: 'Features' },
  why_mock_ninja: { label: 'Why Mock Ninja?', group: 'About' },
  belt_system: { label: 'Belt System', group: 'About' },
  pricing: { label: 'Pricing Plans', group: 'About' },
  study_material: { label: 'Study Material', group: 'About' },
  advertisements: { label: 'Advertisements & Test Series', group: 'Social' },
  testimonials: { label: 'Testimonials', group: 'Social' },
  faqs: { label: 'FAQs', group: 'Social' },
  final_cta: { label: 'Final Call to Action', group: 'Social' },
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

export function AdminHomepagePage() {
  const [tab, setTab] = useState<TabKey>('sections');
  const { profile } = useAuth();

  const tabs: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'sections', label: 'Section Visibility', icon: LayoutDashboard },
    { key: 'hero', label: 'Hero & Stats', icon: Flame },
    { key: 'testimonials', label: 'Testimonials', icon: Star },
    { key: 'faqs', label: 'FAQs', icon: HelpCircle },
    { key: 'featured', label: 'Featured Tests', icon: Gift },
    { key: 'ads', label: 'Advertisements', icon: Megaphone },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Homepage Manager</h1>
          <p className="text-sm text-navy-500">Control which sections appear on the home page, edit content, manage testimonials, FAQs, and featured tests.</p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 border-b border-navy-200 pb-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'border-b-2 border-govt-600 bg-govt-50 text-govt-700' : 'text-navy-500 hover:text-navy-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'sections' && <SectionsTab />}
        {tab === 'hero' && <HeroTab />}
        {tab === 'testimonials' && <TestimonialsTab />}
        {tab === 'faqs' && <FaqsTab />}
        {tab === 'featured' && <FeaturedTab />}
        {tab === 'ads' && <HomepageAdsTab />}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────── Sections Visibility Tab ──────────────────────── */

function SectionsTab() {
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['admin-homepage-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('section_key, content_json, updated_at')
        .order('section_key');
      if (error) throw error;
      return data || [];
    },
  });

  const sectionMap = new Map((sections || []).map((s: any) => [s.section_key, s.content_json as any]));

  const toggleSection = async (key: string, current: boolean) => {
    setToggling(key);
    const existing = sectionMap.get(key) || {};
    const newContent = { ...existing, enabled: !current };

    const { error } = await supabase
      .from('homepage_content')
      .upsert({ section_key: key, content_json: newContent }, { onConflict: 'section_key' });

    setToggling(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${SECTION_LABELS[key]?.label || key} ${!current ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-homepage-sections'] });
      queryClient.invalidateQueries({ queryKey: ['home-content'] });
    }
  };

  const groups = [...new Set(SECTION_ORDER.map((k) => SECTION_LABELS[k].group))];

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-navy-600">
        Toggle sections on or off to control what appears on the public home page. Changes are live instantly.
      </div>
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-400">{group}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_ORDER.filter((k) => SECTION_LABELS[k].group === group).map((key) => {
              const content = sectionMap.get(key) || {};
              const enabled = content.enabled !== false;
              const label = SECTION_LABELS[key].label;
              return (
                <Card key={key} className={cn('transition-[opacity]', !enabled && 'opacity-50')}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      {enabled ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-navy-400" />}
                      <span className="text-sm font-medium text-navy-900">{label}</span>
                    </div>
                    <button
                      onClick={() => toggleSection(key, enabled)}
                      disabled={toggling === key}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        enabled ? 'bg-emerald-500' : 'bg-navy-200',
                      )}
                    >
                      {toggling === key && <RefreshCw className="absolute left-1 top-0.5 h-5 w-5 animate-spin text-white" />}
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        enabled ? 'translate-x-5' : 'translate-x-0.5',
                      )} />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Hero & Stats Tab ──────────────────────── */

function HeroTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [hero, setHero] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['admin-homepage-hero'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('section_key, content_json')
        .in('section_key', ['hero', 'stats_strip']);
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize local state when data loads
  if (!isLoading && hero === null && sections) {
    const heroData = (sections as any[]).find((s) => s.section_key === 'hero')?.content_json || {};
    const statsData = (sections as any[]).find((s) => s.section_key === 'stats_strip')?.content_json || {};
    setHero(heroData);
    setStats(statsData);
  }

  const save = async () => {
    if (!hero || !stats) return;
    setSaving(true);
    const [heroRes, statsRes] = await Promise.all([
      supabase.from('homepage_content').upsert(
        { section_key: 'hero', content_json: hero },
        { onConflict: 'section_key' },
      ),
      supabase.from('homepage_content').upsert(
        { section_key: 'stats_strip', content_json: stats },
        { onConflict: 'section_key' },
      ),
    ]);
    setSaving(false);
    if (heroRes.error || statsRes.error) {
      toast.error(heroRes.error?.message || statsRes.error?.message || 'Save failed');
    } else {
      toast.success('Hero and stats saved');
      queryClient.invalidateQueries({ queryKey: ['admin-homepage-hero'] });
      queryClient.invalidateQueries({ queryKey: ['home-content'] });
    }
  };

  if (isLoading || !hero || !stats) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hero Banner</CardTitle>
          <CardDescription>The main banner at the top of the home page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Badge Text">
            <input type="text" value={hero.badge || ''} onChange={(e) => setHero({ ...hero, badge: e.target.value })} className="input" />
          </Field>
          <Field label="Title">
            <textarea value={hero.title || ''} onChange={(e) => setHero({ ...hero, title: e.target.value })} rows={2} className="input" />
          </Field>
          <Field label="Subtitle">
            <textarea value={hero.subtitle || ''} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} rows={2} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary Button Text">
              <input type="text" value={hero.ctaPrimary || ''} onChange={(e) => setHero({ ...hero, ctaPrimary: e.target.value })} className="input" />
            </Field>
            <Field label="Secondary Button Text">
              <input type="text" value={hero.ctaSecondary || ''} onChange={(e) => setHero({ ...hero, ctaSecondary: e.target.value })} className="input" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stats Strip</CardTitle>
          <CardDescription>The row of key statistics below the hero banner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(stats.stats || []).map((s: any, i: number) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Value"
                value={s.value || ''}
                onChange={(e) => {
                  const next = [...(stats.stats || [])];
                  next[i] = { ...next[i], value: e.target.value };
                  setStats({ ...stats, stats: next });
                }}
                className="input"
              />
              <input
                type="text"
                placeholder="Label"
                value={s.label || ''}
                onChange={(e) => {
                  const next = [...(stats.stats || [])];
                  next[i] = { ...next[i], label: e.target.value };
                  setStats({ ...stats, stats: next });
                }}
                className="input"
              />
              <input
                type="text"
                placeholder="Detail"
                value={s.detail || ''}
                onChange={(e) => {
                  const next = [...(stats.stats || [])];
                  next[i] = { ...next[i], detail: e.target.value };
                  setStats({ ...stats, stats: next });
                }}
                className="input sm:col-span-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────── Testimonials Tab ──────────────────────── */

function TestimonialsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      name: editing.name,
      score_label: editing.score_label || null,
      quote: editing.quote,
      belt: editing.belt || null,
      verified: editing.verified ?? false,
      sort_order: editing.sort_order ?? 0,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from('testimonials').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('testimonials').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing.id ? 'Testimonial updated' : 'Testimonial added');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['home-testimonials'] });
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['home-testimonials'] });
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setEditing({ name: '', quote: '', score_label: '', belt: '', verified: false, sort_order: 0 })}>
          <Plus className="h-4 w-4" /> Add Testimonial
        </Button>
      </div>

      {editing && (
        <Card className="border-govt-300 ring-1 ring-govt-200">
          <CardHeader>
            <CardTitle className="text-base">{editing.id ? 'Edit Testimonial' : 'New Testimonial'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Student Name">
              <input type="text" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" />
            </Field>
            <Field label="Quote">
              <textarea value={editing.quote || ''} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} rows={3} className="input" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Score Label">
                <input type="text" placeholder="e.g. 285/300" value={editing.score_label || ''} onChange={(e) => setEditing({ ...editing, score_label: e.target.value })} className="input" />
              </Field>
              <Field label="Belt">
                <select value={editing.belt || ''} onChange={(e) => setEditing({ ...editing, belt: e.target.value || null })} className="input">
                  <option value="">None</option>
                  <option value="White">White</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Green">Green</option>
                  <option value="Blue">Blue</option>
                  <option value="Brown">Brown</option>
                  <option value="Black">Black</option>
                </select>
              </Field>
              <Field label="Sort Order">
                <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="input" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={editing.verified ?? false} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} className="h-4 w-4 rounded border-navy-300" />
              Verified student
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving || !editing.name || !editing.quote}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {(testimonials || []).map((tm: any) => (
          <Card key={tm.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy-900">{tm.name}</p>
                  {tm.belt && <Badge variant="neutral">{tm.belt} Belt</Badge>}
                  {tm.verified && <Badge variant="success"><Check className="h-3 w-3" /> Verified</Badge>}
                </div>
                <p className="mt-1 text-sm text-navy-600">"{tm.quote}"</p>
                {tm.score_label && <p className="mt-1 text-xs text-navy-400">{tm.score_label} · Order: {tm.sort_order}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(tm)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(tm.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(testimonials || []).length === 0 && (
          <p className="py-8 text-center text-sm text-navy-400">No testimonials yet. Add one to show on the home page.</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete testimonial"
        message="Delete this testimonial? It will be removed from the home page."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ──────────────────────── FAQs Tab ──────────────────────── */

function FaqsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      question: editing.question,
      answer: editing.answer,
      sort_order: editing.sort_order ?? 0,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from('faqs').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('faqs').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing.id ? 'FAQ updated' : 'FAQ added');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['home-faqs'] });
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['home-faqs'] });
    }
  };

  const move = async (id: string, direction: 'up' | 'down') => {
    const items = (faqs as any[]) || [];
    const idx = items.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];
    await Promise.all([
      supabase.from('faqs').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('faqs').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    queryClient.invalidateQueries({ queryKey: ['home-faqs'] });
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setEditing({ question: '', answer: '', sort_order: (faqs as any[])?.length || 0 })}>
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

      {editing && (
        <Card className="border-govt-300 ring-1 ring-govt-200">
          <CardHeader>
            <CardTitle className="text-base">{editing.id ? 'Edit FAQ' : 'New FAQ'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Question">
              <input type="text" value={editing.question || ''} onChange={(e) => setEditing({ ...editing, question: e.target.value })} className="input" />
            </Field>
            <Field label="Answer">
              <textarea value={editing.answer || ''} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} rows={4} className="input" />
            </Field>
            <Field label="Sort Order">
              <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="input" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving || !editing.question || !editing.answer}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {((faqs as any[]) || []).map((f, idx) => (
          <Card key={f.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(f.id, 'up')} disabled={idx === 0} className="text-navy-400 hover:text-govt-600 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(f.id, 'down')} disabled={idx === ((faqs as any[]) || []).length - 1} className="text-navy-400 hover:text-govt-600 disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-900">{f.question}</p>
                <p className="mt-1 text-sm text-navy-600">{f.answer}</p>
                <p className="mt-1 text-xs text-navy-400">Order: {f.sort_order}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(f.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {((faqs as any[]) || []).length === 0 && (
          <p className="py-8 text-center text-sm text-navy-400">No FAQs yet. Add one to show on the home page.</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete FAQ"
        message="Delete this FAQ? It will be removed from the home page."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ──────────────────────── Featured Tests Tab ──────────────────────── */

function FeaturedTab() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: mocks, isLoading } = useQuery({
    queryKey: ['admin-featured-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, category, access, status, visibility, meta_json, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleFeatured = async (mock: any) => {
    setSavingId(mock.id);
    const meta = mock.meta_json || {};
    const isFeatured = meta.is_featured === true;
    const newMeta = { ...meta, is_featured: !isFeatured };
    if (!isFeatured) {
      newMeta.featured_order = Date.now();
    }
    const { error } = await supabase
      .from('mock_tests')
      .update({ meta_json: newMeta })
      .eq('id', mock.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${mock.title} ${!isFeatured ? 'featured' : 'unfeatured'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-featured-tests'] });
      queryClient.invalidateQueries({ queryKey: ['home-featured-tests'] });
    }
  };

  const toggleVisibility = async (mock: any) => {
    setSavingId(mock.id);
    const newVis = mock.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    const { error } = await supabase
      .from('mock_tests')
      .update({ visibility: newVis })
      .eq('id', mock.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${mock.title} is now ${newVis}`);
      queryClient.invalidateQueries({ queryKey: ['admin-featured-tests'] });
      queryClient.invalidateQueries({ queryKey: ['home-featured-tests'] });
      queryClient.invalidateQueries({ queryKey: ['home-free-tests'] });
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const published = ((mocks as any[]) || []).filter((m) => m.status === 'PUBLISHED');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-navy-600">
        Feature tests to show them in the "Popular Mock Tests" section on the home page. Toggle visibility to control which tests appear publicly.
      </div>
      <div className="space-y-2">
        {published.map((mock: any) => {
          const isFeatured = mock.meta_json?.is_featured === true;
          const isPublic = mock.visibility === 'PUBLIC';
          return (
            <Card key={mock.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-govt-100 text-govt-700">
                  {isFeatured ? <Flame className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">{mock.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-navy-400">
                    <span>{mock.category}</span>
                    <Badge variant={mock.access === 'FREE' ? 'success' : 'neutral'}>{mock.access}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-navy-500">{isPublic ? 'Public' : 'Private'}</span>
                    <button
                      onClick={() => toggleVisibility(mock)}
                      disabled={savingId === mock.id}
                      className={cn('relative h-6 w-11 rounded-full transition-colors', isPublic ? 'bg-emerald-500' : 'bg-navy-200')}
                    >
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', isPublic ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-navy-500">Featured</span>
                    <button
                      onClick={() => toggleFeatured(mock)}
                      disabled={savingId === mock.id}
                      className={cn('relative h-6 w-11 rounded-full transition-colors', isFeatured ? 'bg-saffron-500' : 'bg-navy-200')}
                    >
                      {savingId === mock.id && <RefreshCw className="absolute left-1 top-0.5 h-5 w-5 animate-spin text-white" />}
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', isFeatured ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {published.length === 0 && (
          <p className="py-8 text-center text-sm text-navy-400">No published mock tests yet.</p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── Shared Field Component ──────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-navy-600">{label}</label>
      {children}
    </div>
  );
}
