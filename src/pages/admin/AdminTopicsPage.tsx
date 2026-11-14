import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Plus, Search, Pencil, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Subject {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  class_level: number;
  ordinal: number;
}

export function AdminTopicsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [chapterName, setChapterName] = useState('');
  const [classLevel, setClassLevel] = useState(11);
  const [ordinal, setOrdinal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('id');
      if (error) throw error;
      return data as Subject[];
    },
  });

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chapters').select('id, subject_id, name, class_level, ordinal').order('subject_id').order('ordinal');
      if (error) throw error;
      return data as Chapter[];
    },
  });

  const handleSave = async () => {
    if (!chapterName.trim()) return;
    setError(null);
    setSaving(true);

    try {
      if (editing) {
        const { error } = await supabase
          .from('chapters')
          .update({ name: chapterName.trim(), class_level: classLevel, ordinal })
          .eq('id', editing.id);
        if (error) throw error;
      } else if (adding !== null) {
        const { error } = await supabase
          .from('chapters')
          .insert({ subject_id: adding, name: chapterName.trim(), class_level: classLevel, ordinal });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['chapters-admin'] });
      setEditing(null);
      setAdding(null);
      setChapterName('');
      setOrdinal(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);

  const handleDelete = async (chapter: Chapter) => {
    const { error } = await supabase.from('chapters').delete().eq('id', chapter.id);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['chapters-admin'] });
  };

  const openEdit = (ch: Chapter) => {
    setEditing(ch);
    setAdding(null);
    setChapterName(ch.name);
    setClassLevel(ch.class_level);
    setOrdinal(ch.ordinal);
  };

  const openAdd = (subjectId: number) => {
    setAdding(subjectId);
    setEditing(null);
    setChapterName('');
    setClassLevel(11);
    setOrdinal(0);
  };

  const closeModal = () => {
    setEditing(null);
    setAdding(null);
    setChapterName('');
  };

  const filteredChapters = (chapters || []).filter((ch) =>
    !search || ch.name.toLowerCase().includes(search.toLowerCase()),
  );

  const chaptersBySubject = (subjectId: number) =>
    filteredChapters.filter((ch) => ch.subject_id === subjectId);

  const loading = subjectsLoading || chaptersLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{t('admin.topicsTitle' as string) || 'Topics'}</h1>
            <p className="text-sm text-navy-500">{t('admin.topicsDesc' as string) || 'Manage subject > chapter hierarchy.'}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-navy-300 py-2.5 pl-10 pr-4 text-sm focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {(subjects || []).map((subj) => {
              const subjChapters = chaptersBySubject(subj.id);
              return (
                <Card key={subj.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-govt-600" />
                        <CardTitle className="text-lg">{subj.name}</CardTitle>
                        <Badge variant="neutral">{subjChapters.length} chapters</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openAdd(subj.id)}>
                        <Plus className="h-4 w-4" /> Add Chapter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {subjChapters.length === 0 ? (
                      <p className="py-4 text-center text-sm text-navy-400">No chapters yet. Click "Add Chapter" to create one.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {subjChapters.map((ch) => (
                          <div key={ch.id} className="group flex items-center justify-between rounded-lg border border-navy-200 p-3">
                            <div>
                              <span className="text-sm font-medium text-navy-700">{ch.name}</span>
                              <div className="mt-0.5 text-xs text-navy-400">Class {ch.class_level}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(ch)}
                                className="rounded p-1 text-navy-400 opacity-0 transition-opacity hover:text-govt-600 group-hover:opacity-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(ch)}
                                className="rounded p-1 text-navy-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {(editing || adding !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">
                {editing ? 'Edit Chapter' : 'Add Chapter'}
              </h2>
              <button onClick={closeModal}>
                <X className="h-5 w-5 text-navy-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Chapter Name</label>
                <input
                  type="text"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  className="w-full rounded-lg border border-navy-300 px-3 py-2 text-sm focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
                  placeholder="e.g. Kinematics"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy-700">Class Level</label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(Number(e.target.value))}
                    className="w-full rounded-lg border border-navy-300 px-3 py-2 text-sm focus:border-govt-500 focus:outline-none"
                  >
                    <option value={11}>Class 11</option>
                    <option value={12}>Class 12</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy-700">Order</label>
                  <input
                    type="number"
                    value={ordinal}
                    onChange={(e) => setOrdinal(Number(e.target.value))}
                    className="w-full rounded-lg border border-navy-300 px-3 py-2 text-sm focus:border-govt-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !chapterName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Chapter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete chapter"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Questions in this chapter will be affected.` : ''}
        confirmLabel="Delete"
        destructive
      />
    </AdminLayout>
  );
}
