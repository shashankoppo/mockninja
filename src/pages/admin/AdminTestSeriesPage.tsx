import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, X, Layers, FileText, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface SeriesRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  sort_order: number;
}

interface MockOption {
  id: string;
  title: string;
}

const INPUT_CLASS = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none';

const CATEGORIES = ['full syllabus', 'subject test', 'chapter test', 'previous year'];

export function AdminTestSeriesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('full syllabus');
  const [saving, setSaving] = useState(false);
  const [managingSeries, setManagingSeries] = useState<SeriesRow | null>(null);

  const { data: seriesList = [], isLoading } = useQuery<SeriesRow[]>({
    queryKey: ['admin-test-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_series')
        .select('id, title, description, category, status, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as SeriesRow[];
    },
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error('Not authenticated');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('test_series')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        status: 'PUBLISHED',
        sort_order: seriesList.length,
      })
      .select('id')
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Test series created');
    setTitle('');
    setDescription('');
    setCategory('full syllabus');
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ['admin-test-series'] });
    queryClient.invalidateQueries({ queryKey: ['test-series-list'] });
    if (data) setManagingSeries({ id: data.id, title: title.trim(), description: description.trim() || null, category, status: 'PUBLISHED', sort_order: seriesList.length });
  };

  const handleToggleStatus = async (s: SeriesRow) => {
    const newStatus = s.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    const { error } = await supabase.from('test_series').update({ status: newStatus }).eq('id', s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Series ${newStatus === 'PUBLISHED' ? 'published' : 'archived'}`);
    queryClient.invalidateQueries({ queryKey: ['admin-test-series'] });
    queryClient.invalidateQueries({ queryKey: ['test-series-list'] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Test Series</h1>
            <p className="text-sm text-navy-400">Create curated series that group published mock tests together.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" /> New series
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create test series</CardTitle>
              <CardDescription>Fill in the details below. The series will be published immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium text-navy-300">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} placeholder="e.g. JEE Main 2026 Full Syllabus Series" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-navy-300">
                Description
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT_CLASS} placeholder="What does this series cover?" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-navy-300">
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASS}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create series'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : seriesList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Layers className="h-10 w-10 text-navy-500" />
              <p className="text-sm font-medium text-white">No test series yet</p>
              <p className="text-xs text-navy-400">Click "New series" to create your first curated test series.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {seriesList.map((s) => (
              <Card key={s.id} className="border-white/10 bg-[#11121c]">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-navy-600" />
                    <div>
                      <p className="font-semibold text-white">{s.title}</p>
                      {s.description && <p className="text-xs text-navy-400 line-clamp-1">{s.description}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="neutral" className="text-xs">{s.category}</Badge>
                        <Badge variant={s.status === 'PUBLISHED' ? 'success' : 'warning'} className="text-xs">{s.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setManagingSeries(s)}>
                      <FileText className="h-4 w-4" /> Manage mocks
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(s)}>
                      {s.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {managingSeries && (
          <SeriesMockManager series={managingSeries} onClose={() => { setManagingSeries(null); queryClient.invalidateQueries({ queryKey: ['test-series-list'] }); }} />
        )}
      </div>
    </AdminLayout>
  );
}

function SeriesMockManager({ series, onClose }: { series: SeriesRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: mocksInSeries = [], isLoading } = useQuery<{ mock_test_id: string; position: number; mock_test: { title: string; duration_min: number; total_marks: number } }[]>({
    queryKey: ['series-mocks', series.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_series_mocks')
        .select('mock_test_id, position, mock_test:mock_test_id ( title, duration_min, total_marks )')
        .eq('test_series_id', series.id)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as { mock_test_id: string; position: number; mock_test: { title: string; duration_min: number; total_marks: number } }[];
    },
  });

  const { data: availableMocks = [] } = useQuery<MockOption[]>({
    queryKey: ['available-published-mocks', series.id],
    queryFn: async () => {
      const { data: tsm, error: tErr } = await supabase
        .from('test_series_mocks')
        .select('mock_test_id')
        .eq('test_series_id', series.id);
      if (tErr) throw tErr;
      const existing = (tsm || []).map((t) => t.mock_test_id);

      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title')
        .eq('status', 'PUBLISHED')
        .order('title');
      if (error) throw error;
      return (data || []).filter((m) => !existing.includes(m.id)) as MockOption[];
    },
  });

  const handleAdd = async (mockId: string) => {
    const nextPos = mocksInSeries.length;
    const { error } = await supabase
      .from('test_series_mocks')
      .insert({ test_series_id: series.id, mock_test_id: mockId, position: nextPos });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Mock added to series');
    queryClient.invalidateQueries({ queryKey: ['series-mocks', series.id] });
    queryClient.invalidateQueries({ queryKey: ['available-published-mocks', series.id] });
    queryClient.invalidateQueries({ queryKey: ['test-series-list'] });
  };

  const handleRemove = async (mockId: string) => {
    const { error } = await supabase
      .from('test_series_mocks')
      .delete()
      .eq('test_series_id', series.id)
      .eq('mock_test_id', mockId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Mock removed from series');
    queryClient.invalidateQueries({ queryKey: ['series-mocks', series.id] });
    queryClient.invalidateQueries({ queryKey: ['available-published-mocks', series.id] });
    queryClient.invalidateQueries({ queryKey: ['test-series-list'] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg text-white">Manage: {series.title}</CardTitle>
          <CardDescription>Add or remove published mock tests from this series.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-300">Mocks in series ({mocksInSeries.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-4 w-4" /> Add mock
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : mocksInSeries.length === 0 ? (
            <p className="text-sm text-navy-400">No mocks added yet.</p>
          ) : (
            <div className="space-y-2">
              {mocksInSeries.map((m, i) => (
                <div key={m.mock_test_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-govt-500/20 text-2xs font-bold text-govt-300">{i + 1}</span>
                    <span className="font-medium text-white">{m.mock_test.title}</span>
                    <span className="text-xs text-navy-400">{m.mock_test.duration_min} min · {m.mock_test.total_marks} marks</span>
                  </div>
                  <button onClick={() => handleRemove(m.mock_test_id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdd && (
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-navy-300">Available published mocks</h4>
              <button onClick={() => setShowAdd(false)} className="text-navy-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {availableMocks.length === 0 ? (
              <p className="text-sm text-navy-400">All published mocks are already in this series.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {availableMocks.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAdd(m.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-govt-400 hover:bg-govt-500/10"
                  >
                    <span className="font-medium text-white">{m.title}</span>
                    <ChevronRight className="h-4 w-4 text-navy-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
