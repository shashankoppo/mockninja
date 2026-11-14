import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { MockQuestionCsvImport } from '@/components/admin/MockQuestionCsvImport';
import { Plus, X, Pencil, Trash2, ClipboardList, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Math } from '@/components/Math';
import { useMockTests, useQuestions, useChapters, useSubjects } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { MockMode, MockAccess, MockStatus, QuestionWithChapter } from '@/lib/types';

const statusColors: Record<MockStatus, string> = {
  DRAFT: 'bg-navy-100 text-navy-600',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

interface MockForm {
  id: string | null;
  title: string;
  category: string;
  mode: MockMode;
  duration_min: string;
  total_marks: string;
  access: MockAccess;
  status: MockStatus;
  mcqCorrect: string;
  mcqWrong: string;
  numCorrect: string;
  numWrong: string;
  question_paper_path: string | null;
}

const emptyMockForm: MockForm = {
  id: null,
  title: '',
  category: 'Full Syllabus',
  mode: 'EXAM',
  duration_min: '180',
  total_marks: '300',
  access: 'FREE',
  status: 'DRAFT',
  mcqCorrect: '4',
  mcqWrong: '-1',
  numCorrect: '4',
  numWrong: '0',
  question_paper_path: null,
};

const CATEGORY_OPTIONS = [
  { value: 'Full Syllabus', label: 'Full Syllabus' },
  { value: 'Subject Test', label: 'Subject Test' },
  { value: 'Chapter Test', label: 'Chapter Test' },
  { value: 'PYQ', label: 'PYQ (Previous Year Paper)' },
  { value: 'DPP', label: 'DPP (Daily Practice Problem)' },
];

const CATEGORY_FILTERS = ['All', 'Full Syllabus', 'Subject Test', 'Chapter Test', 'PYQ', 'DPP'] as const;

export function AdminMocksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [form, setForm] = useState<MockForm>(emptyMockForm);
  const [activeMockId, setActiveMockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionChapter, setQuestionChapter] = useState('');
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [mockSearch, setMockSearch] = useState('');

  const { data: mocks, isLoading, isError, refetch } = useMockTests();
  const { data: subjects } = useSubjects();
  const { data: chapters } = useChapters();
  const { data: allQuestions } = useQuestions({ status: 'PUBLISHED' });

  const openCreate = () => {
    setForm(emptyMockForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: typeof mocks extends (infer T)[] | undefined ? T : never) => {
    const ms = m.marking_scheme as Record<string, Record<string, number>>;
    setForm({
      id: m.id,
      title: m.title,
      category: m.category,
      mode: m.mode,
      duration_min: String(m.duration_min),
      total_marks: String(m.total_marks),
      access: m.access,
      status: m.status,
      mcqCorrect: String(ms?.mcq?.correct ?? 4),
      mcqWrong: String(ms?.mcq?.wrong ?? -1),
      numCorrect: String(ms?.numerical?.correct ?? 4),
      numWrong: String(ms?.numerical?.wrong ?? 0),
      question_paper_path: m.question_paper_path ?? null,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!form.title.trim()) {
      setError(t('admin.titleRequired'));
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      mode: form.mode,
      duration_min: parseInt(form.duration_min, 10) || 180,
      total_marks: parseInt(form.total_marks, 10) || 300,
      access: form.access,
      status: form.status,
      kind: 'STANDARD',
      visibility: 'PUBLIC',
      marking_scheme: {
        mcq: { correct: parseInt(form.mcqCorrect, 10) ?? 4, wrong: parseInt(form.mcqWrong, 10) ?? -1 },
        numerical: { correct: parseInt(form.numCorrect, 10) ?? 4, wrong: parseInt(form.numWrong, 10) ?? 0 },
      },
      question_paper_path: form.question_paper_path,
    };

    let result;
    if (form.id) {
      result = await supabase.from('mock_tests').update(payload).eq('id', form.id);
    } else {
      result = await supabase.from('mock_tests').insert(payload).select('id').maybeSingle();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setShowForm(false);
    refetch();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('mock_tests').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    refetch();
  };

  const handlePublish = async (id: string) => {
    const { error } = await supabase.from('mock_tests').update({ status: 'PUBLISHED' }).eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    refetch();
  };

  const openQuestionPicker = async (mockId: string) => {
    setActiveMockId(mockId);
    setQuestionSearch('');
    setQuestionChapter('');
    setError(null);

    const { data: existing } = await supabase
      .from('mock_test_questions')
      .select('question_id')
      .eq('mock_test_id', mockId);
    const existingIds = new Set((existing || []).map((r) => r.question_id));

    setLinkedIds(existingIds);
    setShowQuestions(true);
  };

  const toggleQuestion = async (q: QuestionWithChapter) => {
    if (!activeMockId) return;

    const isLinked = linkedIds.has(q.id);

    if (isLinked) {
      await supabase
        .from('mock_test_questions')
        .delete()
        .eq('mock_test_id', activeMockId)
        .eq('question_id', q.id);
      const next = new Set(linkedIds);
      next.delete(q.id);
      setLinkedIds(next);
      refetch();
    } else {
      const position = linkedIds.size + 1;
      const { error: insError } = await supabase
        .from('mock_test_questions')
        .insert({ mock_test_id: activeMockId, question_id: q.id, position, section: 'A' });
      if (insError) {
        setError(insError.message);
        return;
      }
      setLinkedIds(new Set(linkedIds).add(q.id));
      refetch();
    }
  };

  const filteredPickerQuestions = (allQuestions || []).filter((q) => {
    if (questionChapter && q.chapter_id !== parseInt(questionChapter, 10)) return false;
    if (!questionSearch) return true;
    return q.statement_tex.toLowerCase().includes(questionSearch.toLowerCase());
  });

  const filteredMocks = (mocks || []).filter((m) => {
    if (categoryFilter !== 'All') {
      const catLower = m.category.toLowerCase();
      if (categoryFilter === 'PYQ' && !catLower.includes('pyq')) return false;
      if (categoryFilter === 'DPP' && !catLower.includes('dpp')) return false;
      if (categoryFilter !== 'PYQ' && categoryFilter !== 'DPP' && catLower !== categoryFilter.toLowerCase()) return false;
    }
    if (mockSearch && !m.title.toLowerCase().includes(mockSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('admin.mockBuilder')}</h1>
            <p className="text-sm text-navy-400">{t('admin.mockBuilderDesc')}</p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('admin.newMock')}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">{error}</div>
        )}

        {/* Category filter + search bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  categoryFilter === cat ? 'bg-govt-600 text-white' : 'bg-white/5 text-navy-300 hover:bg-white/10',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder="Search mocks by title..."
              value={mockSearch}
              onChange={(e) => setMockSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : isError ? (
          <ErrorState title={t('admin.loadError')} action={<Button variant="outline" size="sm" onClick={() => refetch()}>{t('common.loading')}</Button>} />
        ) : filteredMocks.length === 0 ? (
          <EmptyState title={t('admin.noMocks')} description={t('admin.noMocksDesc')} />
        ) : (
          <div className="space-y-3">
            {filteredMocks.map((m) => (
              <Card key={m.id} className="transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" className={statusColors[m.status]}>
                        {t(`admin.${m.status.toLowerCase()}`)}
                      </Badge>
                      <Badge variant="neutral">{m.category}</Badge>
                      <Badge variant="neutral">{m.mode}</Badge>
                      <span className="text-xs text-navy-400">
                        {m.duration_min} min · {m.total_marks} marks
                      </span>
                    </div>
                    <h3 className="truncate font-semibold text-white">{m.title}</h3>
                    <p className="text-xs text-navy-400">
                      {m.question_count} {t('admin.questions')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openQuestionPicker(m.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-govt-400 hover:bg-govt-500/10"
                      title={t('admin.manageQuestions')}
                    >
                      <ClipboardList className="h-4 w-4" />
                      {t('admin.manageQuestions')}
                    </button>
                    {m.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => handlePublish(m.id)}
                        className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                        title={t('admin.publish')}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(m)}
                      className="rounded-lg p-2 text-navy-300 hover:bg-white/10"
                      title={t('admin.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="rounded-lg p-2 text-error hover:bg-error/5"
                      title={t('admin.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mock form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-[#11121c] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-bold text-white">
                {form.id ? t('admin.editMock') : t('admin.newMock')}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-navy-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">{error}</div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-300">{t('admin.title')}</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-navy-500 focus:border-govt-500 focus:outline-none"
                  placeholder="JEE Main Full Mock 1"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.category')}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.mode')}</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value as MockMode })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  >
                    <option value="PRACTICE">{t('admin.practice')}</option>
                    <option value="EXAM">{t('admin.exam')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.duration')} (min)</label>
                  <input
                    type="number"
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.totalMarks')}</label>
                  <input
                    type="number"
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.access')}</label>
                  <select
                    value={form.access}
                    onChange={(e) => setForm({ ...form, access: e.target.value as MockAccess })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  >
                    <option value="FREE">{t('admin.free')}</option>
                    <option value="PREMIUM">{t('admin.premium')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-300">{t('admin.status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as MockStatus })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-500 focus:outline-none"
                  >
                    <option value="DRAFT">{t('admin.draft')}</option>
                    <option value="PUBLISHED">{t('admin.published')}</option>
                    <option value="ARCHIVED">{t('admin.archived')}</option>
                  </select>
                </div>
              </div>

              <div className="px-1">
                <MediaUpload
                  folder={`papers/${form.id ?? 'new'}`}
                  accept="application/pdf"
                  label="Question paper (PDF)"
                  value={form.question_paper_path}
                  onChange={(path) => setForm({ ...form, question_paper_path: path })}
                />
              </div>

              {/* Marking scheme */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-3 text-sm font-medium text-navy-300">{t('admin.markingScheme')}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-navy-400">MCQ {t('admin.correct')}</label>
                    <input
                      type="number"
                      value={form.mcqCorrect}
                      onChange={(e) => setForm({ ...form, mcqCorrect: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-navy-400">MCQ {t('admin.wrong')}</label>
                    <input
                      type="number"
                      value={form.mcqWrong}
                      onChange={(e) => setForm({ ...form, mcqWrong: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-navy-400">{t('admin.numerical')} {t('admin.correct')}</label>
                    <input
                      type="number"
                      value={form.numCorrect}
                      onChange={(e) => setForm({ ...form, numCorrect: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-navy-400">{t('admin.numerical')} {t('admin.wrong')}</label>
                    <input
                      type="number"
                      value={form.numWrong}
                      onChange={(e) => setForm({ ...form, numWrong: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question picker dialog */}
      {showQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowQuestions(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-[#11121c] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-bold text-white">{t('admin.manageQuestions')}</h2>
              <button onClick={() => setShowQuestions(false)} className="rounded-lg p-2 text-navy-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4">
              <div className="flex gap-3">
                <div className="relative min-w-40 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <input
                    type="text"
                    placeholder={t('admin.searchQuestions')}
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-500 focus:outline-none"
                  />
                </div>
                <select
                  value={questionChapter}
                  onChange={(e) => setQuestionChapter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-500 focus:outline-none"
                >
                  <option value="">{t('admin.allChapters')}</option>
                  {(chapters || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-navy-400">
                {linkedIds.size} {t('admin.questionsLinked')}
              </p>
            </div>

            {activeMockId && (
              <div className="border-b border-white/10 p-4">
                <MockQuestionCsvImport
                  mockId={activeMockId}
                  startPosition={linkedIds.size + 1}
                  onImported={() => openQuestionPicker(activeMockId)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {filteredPickerQuestions.length === 0 ? (
                <p className="py-8 text-center text-sm text-navy-400">{t('admin.noPublishedQuestions')}</p>
              ) : (
                <div className="space-y-2">
                  {filteredPickerQuestions.map((q) => {
                    const isLinked = linkedIds.has(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                          isLinked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <button
                          onClick={() => toggleQuestion(q)}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                            isLinked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-navy-500'
                          }`}
                        >
                          {isLinked && <Plus className="h-3 w-3 rotate-45" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex gap-2 text-xs text-navy-400">
                            <span>{q.subject_name}</span>
                            <span>·</span>
                            <span>{q.chapter.name}</span>
                            <span>·</span>
                            <span>{q.difficulty}</span>
                          </div>
                          <div className="truncate text-sm text-navy-200">
                            <Math>{q.statement_tex}</Math>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete mock test"
        message={t('admin.confirmDeleteMock')}
        confirmLabel="Delete"
        destructive
      />
    </AdminLayout>
  );
}
