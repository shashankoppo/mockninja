import { useState, useMemo, Fragment, type FormEvent } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Eye, Check, Copy, FileQuestion,
  ListFilter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Download, Upload, AlertCircle, CheckCircle2, Loader2, FileText,
  RotateCcw, Columns3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { buildQuestionBankCsv, downloadCsvFile } from '@/lib/question-export';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Math } from '@/components/Math';
import {
  useSubjects, useChapters, usePagedQuestions, fetchAllQuestionsForExport, useQuestionCounts, useImportBatches,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { QuestionWithChapter, QuestionType, Difficulty, ReviewStatus, Licence } from '@/lib/types';

const statusColors: Record<ReviewStatus, string> = {
  DRAFT: 'bg-white/5 text-navy-300',
  REVIEW: 'bg-amber-500/15 text-amber-300',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300',
  REJECTED: 'bg-red-500/15 text-red-300',
};

const difficultyColors: Record<Difficulty, string> = {
  EASY: 'bg-emerald-500/15 text-emerald-300',
  MEDIUM: 'bg-amber-500/15 text-amber-300',
  HARD: 'bg-red-500/15 text-red-300',
};

const licenceColors: Record<Licence, string> = {
  OWNED: 'bg-emerald-500/15 text-emerald-300',
  LICENSED: 'bg-sky-500/15 text-sky-300',
  PUBLIC_DOMAIN: 'bg-white/5 text-navy-300',
  UNKNOWN: 'bg-red-500/15 text-red-300',
};

const PAGE_SIZE = 25;

type SortColumn = 'created_at' | 'type' | 'difficulty' | 'review_status' | 'source' | 'licence';

interface FormData {
  id: string | null;
  chapter_id: string;
  type: QuestionType;
  difficulty: Difficulty;
  statement_tex: string;
  options: { id: string; text: string }[];
  answer_option: string;
  numerical_answer: string;
  tolerance: string;
  solution_tex: string;
  review_status: ReviewStatus;
  image_path: string | null;
  licence: Licence;
  source_reference: string;
}

const emptyForm: FormData = {
  id: null,
  chapter_id: '',
  type: 'MCQ',
  difficulty: 'MEDIUM',
  statement_tex: '',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ],
  answer_option: 'a',
  numerical_answer: '',
  tolerance: '0',
  solution_tex: '',
  review_status: 'DRAFT',
  image_path: null,
  licence: 'UNKNOWN',
  source_reference: '',
};

export function AdminQuestionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<{
    subjectId?: number; status?: string; difficulty?: string; type?: string;
    licence?: string; source?: string; chapterId?: number;
  }>({});
  const [sortBy, setSortBy] = useState<SortColumn>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['status', 'type', 'difficulty', 'licence', 'chapter', 'statement']),
  );

  const { data: subjects } = useSubjects();
  const { data: chapters } = useChapters();
  const { data: counts } = useQuestionCounts();
  const { data: batches } = useImportBatches();
  const paged = usePagedQuestions({
    page,
    pageSize: PAGE_SIZE,
    search,
    subjectId: filters.subjectId,
    chapterId: filters.chapterId,
    status: filters.status,
    difficulty: filters.difficulty,
    type: filters.type,
    licence: filters.licence,
    source: filters.source,
    sortBy,
    sortDir,
  });

  const questions = paged.data?.items ?? [];
  const total = paged.data?.total ?? 0;
  const totalPages = globalThis.Math.max(1, globalThis.Math.ceil(total / PAGE_SIZE));

  const filteredChapters = useMemo(() => {
    if (!filters.subjectId) return chapters ?? [];
    return (chapters ?? []).filter((c) => c.subject_id === filters.subjectId);
  }, [chapters, filters.subjectId]);

  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const updateFilter = (key: string, value: string) => {
    const v = value || undefined;
    setFilters((prev) => ({ ...prev, [key]: v, ...(key === 'subjectId' ? { chapterId: undefined } : {}) }));
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (q: QuestionWithChapter) => {
    const opts = (q.options_json ?? []) as { id: string; text: string }[];
    const answerOpt = (q.answer_json as { option?: string } | null)?.option ?? 'a';
    const numAnswer = String((q.answer_json as { value?: number } | null)?.value ?? '');
    setForm({
      id: q.id,
      chapter_id: String(q.chapter_id),
      type: q.type,
      difficulty: q.difficulty,
      statement_tex: q.statement_tex,
      options: opts.length === 4 ? opts : emptyForm.options,
      answer_option: answerOpt,
      numerical_answer: numAnswer,
      tolerance: q.tolerance?.toString() || '0',
      solution_tex: q.solution_tex ?? '',
      review_status: q.review_status,
      image_path: q.image_path ?? null,
      licence: q.licence ?? 'UNKNOWN',
      source_reference: q.source_reference ?? '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleDuplicate = (q: QuestionWithChapter) => {
    const opts = (q.options_json ?? []) as { id: string; text: string }[];
    setForm({
      ...emptyForm,
      id: null,
      chapter_id: String(q.chapter_id),
      type: q.type,
      difficulty: q.difficulty,
      statement_tex: q.statement_tex + ' (copy)',
      options: opts.length === 4 ? opts : emptyForm.options,
      answer_option: (q.answer_json as { option?: string } | null)?.option ?? 'a',
      numerical_answer: String((q.answer_json as { value?: number } | null)?.value ?? ''),
      tolerance: q.tolerance?.toString() || '0',
      solution_tex: q.solution_tex ?? '',
      review_status: 'DRAFT',
      licence: q.licence ?? 'UNKNOWN',
      source_reference: q.source_reference ?? '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!form.chapter_id) {
      setError(t('admin.selectChapter'));
      setSaving(false);
      return;
    }
    if (!form.statement_tex.trim()) {
      setError(t('admin.statementRequired'));
      setSaving(false);
      return;
    }

    if (form.type === 'MCQ') {
      const hasEmptyOpt = form.options.some((o) => !o.text.trim());
      if (hasEmptyOpt) {
        setError('All four options must have text.');
        setSaving(false);
        return;
      }
    } else {
      if (!form.numerical_answer.trim()) {
        setError('Numerical answer is required.');
        setSaving(false);
        return;
      }
    }

    if (form.review_status === 'PUBLISHED' && form.licence === 'UNKNOWN') {
      setError('Cannot publish a question with licence UNKNOWN. Set a licence first.');
      setSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      chapter_id: parseInt(form.chapter_id, 10),
      type: form.type,
      difficulty: form.difficulty,
      statement_tex: form.statement_tex,
      solution_tex: form.solution_tex || null,
      review_status: form.review_status,
      image_path: form.image_path,
      licence: form.licence,
      source_reference: form.source_reference || null,
    };

    if (form.type === 'MCQ') {
      payload.options_json = form.options.map((o) => ({ id: o.id, text: o.text }));
      payload.answer_json = { option: form.answer_option };
      payload.tolerance = null;
    } else {
      payload.options_json = null;
      payload.answer_json = { value: parseFloat(form.numerical_answer) || 0 };
      payload.tolerance = parseFloat(form.tolerance) || 0;
    }

    if (form.review_status === 'PUBLISHED' && !form.id) {
      payload.reviewed_by = user?.id;
    }

    let result;
    if (form.id) {
      result = await supabase.from('questions').update(payload).eq('id', form.id);
    } else {
      payload.created_by = user?.id;
      payload.source = 'HUMAN';
      result = await supabase.from('questions').insert(payload);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setShowForm(false);
    paged.refetch();
    toast.success(form.id ? 'Question updated' : 'Question created');
  };

  const handleDelete = async (id: string) => {
    const { error: delError } = await supabase.from('questions').delete().eq('id', id);
    if (delError) {
      setError(delError.message);
      return;
    }
    paged.refetch();
    toast.success('Question deleted');
  };

  const handlePublish = async (q: QuestionWithChapter) => {
    if (q.licence === 'UNKNOWN') {
      toast.error('Cannot publish: licence is UNKNOWN. Set a licence first.');
      return;
    }
    const { error: pubError } = await supabase
      .from('questions')
      .update({ review_status: 'PUBLISHED', reviewed_by: user?.id })
      .eq('id', q.id);
    if (pubError) {
      setError(pubError.message);
      return;
    }
    paged.refetch();
    toast.success('Question published');
  };

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error: bulkError } = await supabase
      .from('questions')
      .update({ review_status: 'PUBLISHED', reviewed_by: user?.id })
      .in('id', ids)
      .neq('licence', 'UNKNOWN');
    if (bulkError) {
      toast.error('Failed to publish questions');
      return;
    }
    toast.success(`${ids.length} questions published`);
    setSelectedIds(new Set());
    paged.refetch();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error: delError } = await supabase.from('questions').delete().in('id', ids);
    if (delError) {
      toast.error('Failed to delete questions');
      return;
    }
    toast.success(`${ids.length} questions deleted`);
    setSelectedIds(new Set());
    paged.refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const downloadBatchHistory = () => {
    if (!batches || batches.length === 0) return;
    const headers = ['File Name', 'Status', 'Rows OK', 'Rows Failed', 'Rows Total', 'Created At'];
    const rows = batches.map((b) => [b.file_name, b.status, b.rows_ok, b.rows_failed, b.rows_total, new Date(b.created_at).toLocaleString()]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCsvFile('import-history.csv', csv);
  };

  const handleExportQuestions = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllQuestionsForExport({ search, ...filters, sortBy, sortDir });
      if (rows.length === 0) {
        toast.error('No questions match the current filters');
        return;
      }
      downloadCsvFile('question-bank.csv', buildQuestionBankCsv(rows));
      toast.success(`Exported ${rows.length} questions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export questions');
    } finally {
      setExporting(false);
    }
  };

  const handleRollbackBatch = async (batchId: string) => {
    const { error: rbError } = await supabase.rpc('rollback_import_batch', { p_batch_id: batchId });
    if (rbError) {
      toast.error(rbError.message);
      return;
    }
    toast.success('Import batch rolled back');
    paged.refetch();
  };

  const SortHeader = ({ col, label }: { col: SortColumn; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-semibold uppercase text-navy-400 hover:text-navy-200"
    >
      {label}
      {sortBy === col && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('admin.questionBank')}</h1>
            <p className="text-sm text-navy-400">{t('admin.questionBankDesc')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportQuestions} disabled={exporting || total === 0}>
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <a href="/admin/import">
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </a>
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('admin.newQuestion')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">{error}</div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-300">
                <FileQuestion className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-navy-200">{counts?.total ?? '—'}</div>
                <div className="text-xs text-navy-400">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-300">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-300">{counts?.published ?? '—'}</div>
                <div className="text-xs text-navy-400">Published</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-300">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-navy-200">{counts?.draft ?? '—'}</div>
                <div className="text-xs text-navy-400">Draft</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-300">
                <ListFilter className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-navy-200">{counts?.review ?? '—'}</div>
                <div className="text-xs text-navy-400">Review</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-300">
                <span className="text-xs font-bold">MCQ</span>
              </div>
              <div>
                <div className="text-lg font-bold text-navy-200">{counts?.mcq ?? '—'}</div>
                <div className="text-xs text-navy-400">MCQ</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-300">
                <span className="text-xs font-bold">NUM</span>
              </div>
              <div>
                <div className="text-lg font-bold text-navy-200">{counts?.numerical ?? '—'}</div>
                <div className="text-xs text-navy-400">Numerical</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={cn('flex items-center gap-3 p-3', (counts?.unknownLicence ?? 0) > 0 && 'ring-1 border-red-500/30')}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-300">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-red-700">{counts?.unknownLicence ?? '—'}</div>
                <div className="text-xs text-navy-400">Unknown licence</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder={t('admin.searchQuestions')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="w-full rounded-lg border border-white/10 bg-[#11121c] py-2.5 pl-10 pr-3 text-sm text-navy-200 placeholder:text-navy-400 focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
            />
          </div>
          <select
            value={filters.subjectId ?? ''}
            onChange={(e) => updateFilter('subjectId', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
          >
            <option value="">{t('admin.allSubjects')}</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filters.chapterId ?? ''}
            onChange={(e) => updateFilter('chapterId', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
            disabled={!filters.subjectId}
          >
            <option value="">{t('admin.allChapters')}</option>
            {filteredChapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Class {c.class_level})</option>
            ))}
          </select>
          <select
            value={filters.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="NUMERICAL">{t('admin.numerical')}</option>
          </select>
          <select
            value={filters.difficulty ?? ''}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
          >
            <option value="">{t('admin.allDifficulty')}</option>
            <option value="EASY">{t('admin.easy')}</option>
            <option value="MEDIUM">{t('admin.medium')}</option>
            <option value="HARD">{t('admin.hard')}</option>
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
          >
            <option value="">{t('admin.allStatuses')}</option>
            <option value="DRAFT">{t('admin.draft')}</option>
            <option value="REVIEW">{t('admin.review')}</option>
            <option value="PUBLISHED">{t('admin.published')}</option>
            <option value="REJECTED">{t('admin.rejected')}</option>
          </select>
          <select
            value={filters.licence ?? ''}
            onChange={(e) => updateFilter('licence', e.target.value)}
            className="rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
          >
            <option value="">All Licences</option>
            <option value="OWNED">Owned</option>
            <option value="LICENSED">Licensed</option>
            <option value="PUBLIC_DOMAIN">Public Domain</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnChooser(!showColumnChooser)}
              className="h-[42px]"
            >
              <Columns3 className="h-4 w-4" />
            </Button>
            {showColumnChooser && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-white/10 bg-[#11121c] p-2 shadow-lg">
                <p className="mb-1 text-xs font-semibold text-navy-400">Show columns</p>
                {['status', 'type', 'difficulty', 'licence', 'chapter', 'statement', 'source'].map((col) => (
                  <label key={col} className="flex items-center gap-2 py-1 text-sm capitalize text-navy-200">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="h-4 w-4 rounded border-white/10"
                    />
                    {col}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Import batches */}
        {batches && batches.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-200">Recent import batches</h3>
                <button
                  onClick={downloadBatchHistory}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-govt-300 hover:bg-govt-500/10"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </button>
              </div>
              <div className="space-y-1.5">
                {batches.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-navy-400" />
                      <span className="font-medium text-navy-200">{b.file_name}</span>
                      <Badge
                        variant="neutral"
                        className={
                          b.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-300'
                          : b.status === 'PARTIAL' ? 'bg-amber-500/15 text-amber-300'
                          : b.status === 'ROLLED_BACK' ? 'bg-red-500/15 text-red-300'
                          : 'bg-white/5 text-navy-300'
                        }
                      >
                        {b.status}
                      </Badge>
                      <span className="text-xs text-navy-400">
                        {b.rows_ok} ok / {b.rows_failed} failed / {b.rows_total} total
                      </span>
                    </div>
                    {b.status !== 'ROLLED_BACK' && b.status !== 'PENDING' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setRollbackId(b.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Roll back
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-govt-500/30 bg-govt-500/10 px-4 py-2.5">
            <span className="text-sm font-medium text-govt-200">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              <Button variant="outline" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
              <Button variant="primary" size="sm" onClick={handleBulkPublish}>
                <Check className="h-4 w-4" />
                Publish All
              </Button>
            </div>
          </div>
        )}

        {/* Data table */}
        {paged.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : paged.isError ? (
          <ErrorState
            title={t('admin.loadError')}
            action={<Button variant="outline" size="sm" onClick={() => paged.refetch()}>{t('common.loading')}</Button>}
          />
        ) : questions.length === 0 ? (
          <EmptyState title={t('admin.noQuestions')} description={t('admin.noQuestionsDesc')} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-white/10 lg:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white/5">
                  <tr className="border-b border-white/10">
                    <th className="w-10 p-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="flex h-5 w-5 items-center justify-center rounded border-2 border-white/10 transition-colors hover:border-govt-500"
                      >
                        {selectedIds.size === questions.length && questions.length > 0 && <Check className="h-3 w-3 text-govt-300" />}
                      </button>
                    </th>
                    {visibleColumns.has('status') && <th className="p-3 text-left"><SortHeader col="review_status" label="Status" /></th>}
                    {visibleColumns.has('type') && <th className="p-3 text-left"><SortHeader col="type" label="Type" /></th>}
                    {visibleColumns.has('difficulty') && <th className="p-3 text-left"><SortHeader col="difficulty" label="Diff" /></th>}
                    {visibleColumns.has('licence') && <th className="p-3 text-left"><SortHeader col="licence" label="Licence" /></th>}
                    {visibleColumns.has('chapter') && <th className="p-3 text-left">Chapter</th>}
                    {visibleColumns.has('statement') && <th className="p-3 text-left">Statement</th>}
                    {visibleColumns.has('source') && <th className="p-3 text-left"><SortHeader col="source" label="Source" /></th>}
                    <th className="p-3 text-left"><SortHeader col="created_at" label="Created" /></th>
                    <th className="w-32 p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <Fragment key={q.id}>
                      <tr
                        className={cn(
                          'border-b border-white/5 transition-colors hover:bg-white/5/50',
                          selectedIds.has(q.id) && 'bg-govt-500/10',
                        )}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => toggleSelect(q.id)}
                            className="flex h-5 w-5 items-center justify-center rounded border-2 border-white/10 transition-colors hover:border-govt-500"
                          >
                            {selectedIds.has(q.id) && <Check className="h-3 w-3 text-govt-300" />}
                          </button>
                        </td>
                        {visibleColumns.has('status') && (
                          <td className="p-3">
                            <Badge variant="neutral" className={statusColors[q.review_status]}>
                              {t(`admin.${q.review_status.toLowerCase()}`)}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.has('type') && (
                          <td className="p-3">
                            <Badge variant="neutral" className="bg-govt-500/15 text-govt-300">{q.type}</Badge>
                          </td>
                        )}
                        {visibleColumns.has('difficulty') && (
                          <td className="p-3">
                            <Badge variant="neutral" className={difficultyColors[q.difficulty]}>
                              {t(`admin.${q.difficulty.toLowerCase()}`)}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.has('licence') && (
                          <td className="p-3">
                            <Badge variant="neutral" className={licenceColors[q.licence ?? 'UNKNOWN']}>
                              {q.licence ?? 'UNKNOWN'}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.has('chapter') && (
                          <td className="p-3 text-xs text-navy-400">
                            {q.subject_name} · {q.chapter.name}
                          </td>
                        )}
                        {visibleColumns.has('statement') && (
                          <td className="max-w-xs p-3">
                            <div className="truncate text-navy-200">
                              <Math>{q.statement_tex}</Math>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('source') && (
                          <td className="p-3 text-xs text-navy-400">{q.source}</td>
                        )}
                        <td className="p-3 text-xs text-navy-400">
                          {new Date(q.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                              className="rounded-lg p-2 text-navy-400 hover:bg-white/5"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {q.review_status !== 'PUBLISHED' && (
                              <button
                                onClick={() => handlePublish(q)}
                                className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-500/10"
                                title={t('admin.publish')}
                                disabled={q.licence === 'UNKNOWN'}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDuplicate(q)}
                              className="rounded-lg p-2 text-navy-400 hover:bg-white/5"
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEdit(q)}
                              className="rounded-lg p-2 text-navy-300 hover:bg-white/5"
                              title={t('admin.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(q.id)}
                              className="rounded-lg p-2 text-error hover:bg-error/5"
                              title={t('admin.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === q.id && (
                        <tr className="bg-white/5/30">
                          <td colSpan={10} className="p-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-semibold text-navy-400">Full statement:</span>
                                <div className="mt-1 rounded-lg border border-white/10 bg-[#11121c] p-3 text-white">
                                  <Math display>{q.statement_tex}</Math>
                                </div>
                              </div>
                              {q.type === 'MCQ' && q.options_json && (
                                <div className="flex flex-wrap gap-2">
                                  {q.options_json.map((opt) => {
                                    const isCorrect = (q.answer_json as { option?: string })?.option === opt.id;
                                    return (
                                      <span
                                        key={opt.id}
                                        className={cn(
                                          'rounded-lg border px-3 py-1.5 text-sm',
                                          isCorrect
                                            ? 'border-emerald-300 bg-emerald-500/15 text-emerald-300'
                                            : 'border-white/10 bg-[#11121c] text-navy-300',
                                        )}
                                      >
                                        <span className="font-bold">{opt.id.toUpperCase()}.</span> {opt.text}
                                        {isCorrect && <Check className="ml-1 inline h-3 w-3" />}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {q.type === 'NUMERICAL' && (
                                <div className="text-sm text-navy-300">
                                  Answer: <span className="font-bold text-emerald-300">
                                    {(q.answer_json as { value?: number })?.value ?? '—'}
                                  </span> ±{q.tolerance ?? 0}
                                </div>
                              )}
                              {q.solution_tex && (
                                <div>
                                  <span className="text-xs font-semibold text-navy-400">Solution:</span>
                                  <div className="mt-1 rounded-lg border border-white/10 bg-[#11121c] p-3 text-white">
                                    <Math display>{q.solution_tex}</Math>
                                  </div>
                                </div>
                              )}
                              {q.source_reference && (
                                <div className="text-xs text-navy-400">Source ref: {q.source_reference}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={toggleSelectAll}
                  className="flex h-5 w-5 items-center justify-center rounded border-2 border-white/10 transition-colors hover:border-govt-500"
                >
                  {selectedIds.size === questions.length && questions.length > 0 && <Check className="h-3 w-3 text-govt-300" />}
                </button>
                <span className="text-xs text-navy-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${questions.length} selected` : 'Select all'}
                </span>
              </div>
              {questions.map((q) => (
                <Card key={q.id} className={cn(selectedIds.has(q.id) && 'ring-2 ring-govt-400')}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => toggleSelect(q.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-white/10"
                        >
                          {selectedIds.has(q.id) && <Check className="h-3 w-3 text-govt-300" />}
                        </button>
                        <Badge variant="neutral" className={statusColors[q.review_status]}>
                          {t(`admin.${q.review_status.toLowerCase()}`)}
                        </Badge>
                        <Badge variant="neutral" className={difficultyColors[q.difficulty]}>
                          {t(`admin.${q.difficulty.toLowerCase()}`)}
                        </Badge>
                        <Badge variant="neutral" className="bg-govt-500/15 text-govt-300">{q.type}</Badge>
                        <Badge variant="neutral" className={licenceColors[q.licence ?? 'UNKNOWN']}>
                          {q.licence ?? 'UNKNOWN'}
                        </Badge>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                          className="rounded-lg p-2 text-navy-400 hover:bg-white/5"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(q)}
                          className="rounded-lg p-2 text-navy-300 hover:bg-white/5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(q.id)}
                          className="rounded-lg p-2 text-error hover:bg-error/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="truncate text-sm text-navy-200">
                      <Math>{q.statement_tex}</Math>
                    </div>
                    <div className="text-xs text-navy-400">{q.subject_name} · {q.chapter.name}</div>
                    {expandedId === q.id && q.solution_tex && (
                      <div className="rounded-lg border border-white/10 bg-[#11121c] p-2 text-sm text-white">
                        <Math display>{q.solution_tex}</Math>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-navy-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{globalThis.Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(globalThis.Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-navy-300">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(globalThis.Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#11121c] shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#11121c] p-4">
              <h2 className="text-lg font-bold text-navy-200">
                {form.id ? t('admin.editQuestion') : t('admin.newQuestion')}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-navy-400 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">{error}</div>
              )}

              {/* Subject + Chapter */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">{t('admin.chapter')}</label>
                  <select
                    value={form.chapter_id}
                    onChange={(e) => setForm({ ...form, chapter_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                  >
                    <option value="">{t('admin.selectChapter')}</option>
                    {(chapters ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subject.name} · {c.name} (Class {c.class_level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">{t('admin.type')}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'MCQ' })}
                      className={cn(
                        'flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors',
                        form.type === 'MCQ' ? 'border-govt-500 bg-govt-500/10 text-govt-300' : 'border-white/10 text-navy-400 hover:border-white/20',
                      )}
                    >
                      MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'NUMERICAL' })}
                      className={cn(
                        'flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors',
                        form.type === 'NUMERICAL' ? 'border-govt-500 bg-govt-500/10 text-govt-300' : 'border-white/10 text-navy-400 hover:border-white/20',
                      )}
                    >
                      {t('admin.numerical')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Difficulty + Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">{t('admin.difficulty')}</label>
                  <div className="flex gap-2">
                    {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm({ ...form, difficulty: d })}
                        className={cn(
                          'flex-1 rounded-lg border-2 py-2 text-xs font-medium transition-colors',
                          form.difficulty === d
                            ? d === 'EASY' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : d === 'MEDIUM' ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                              : 'border-red-500 bg-red-500/15 text-red-300'
                            : 'border-white/10 text-navy-400 hover:border-white/10',
                        )}
                      >
                        {t(`admin.${d.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">{t('admin.status')}</label>
                  <select
                    value={form.review_status}
                    onChange={(e) => setForm({ ...form, review_status: e.target.value as ReviewStatus })}
                    className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                  >
                    <option value="DRAFT">{t('admin.draft')}</option>
                    <option value="REVIEW">{t('admin.review')}</option>
                    <option value="PUBLISHED">{t('admin.published')}</option>
                    <option value="REJECTED">{t('admin.rejected')}</option>
                  </select>
                </div>
              </div>

              {/* Licence + Source Reference */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">Licence</label>
                  <select
                    value={form.licence}
                    onChange={(e) => setForm({ ...form, licence: e.target.value as Licence })}
                    className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="OWNED">Owned</option>
                    <option value="LICENSED">Licensed</option>
                    <option value="PUBLIC_DOMAIN">Public Domain</option>
                  </select>
                  {form.review_status === 'PUBLISHED' && form.licence === 'UNKNOWN' && (
                    <p className="text-xs text-red-300">Cannot publish with licence UNKNOWN.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-navy-200">Source reference (optional)</label>
                  <input
                    type="text"
                    value={form.source_reference}
                    onChange={(e) => setForm({ ...form, source_reference: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                    placeholder="Book title, URL, or licence holder"
                  />
                </div>
              </div>

              {/* Statement */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-200">{t('admin.statement')} (TeX)</label>
                <textarea
                  value={form.statement_tex}
                  onChange={(e) => setForm({ ...form, statement_tex: e.target.value })}
                  rows={3}
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                  placeholder="A body is thrown at angle \\theta..."
                />
              </div>

              <MediaUpload
                folder={`questions/${form.id ?? 'new'}`}
                accept="image/png,image/jpeg,image/webp"
                label="Question image (optional)"
                value={form.image_path}
                onChange={(path) => setForm({ ...form, image_path: path })}
              />

              {/* Live preview */}
              {form.statement_tex && (
                <div className="rounded-lg border border-govt-500/20 bg-govt-500/10 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs font-medium text-govt-300">
                    <Eye className="h-3 w-3" />
                    {t('admin.preview')}
                  </div>
                  <Math display>{form.statement_tex}</Math>
                </div>
              )}

              {/* MCQ options */}
              {form.type === 'MCQ' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-navy-200">{t('admin.options')}</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, answer_option: opt.id })}
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-colors',
                          form.answer_option === opt.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/10 text-navy-400 hover:border-navy-400',
                        )}
                      >
                        {opt.id.toUpperCase()}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...form.options];
                          newOpts[i] = { ...opt, text: e.target.value };
                          setForm({ ...form, options: newOpts });
                        }}
                        placeholder={t('admin.optionText')}
                        className="flex-1 rounded-lg border border-white/10 bg-[#11121c] px-3 py-2 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                      />
                      {form.answer_option === opt.id && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-300">
                          <Check className="h-3 w-3" /> Correct
                        </span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-navy-400">{t('admin.correctOptionHint')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-navy-200">{t('admin.numericalAnswer')}</label>
                    <input
                      type="number"
                      step="any"
                      value={form.numerical_answer}
                      onChange={(e) => setForm({ ...form, numerical_answer: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                      placeholder="42.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-navy-200">{t('admin.tolerance')}</label>
                    <input
                      type="number"
                      step="any"
                      value={form.tolerance}
                      onChange={(e) => setForm({ ...form, tolerance: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                      placeholder="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Solution */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-200">{t('admin.solution')} (TeX, optional)</label>
                <textarea
                  value={form.solution_tex}
                  onChange={(e) => setForm({ ...form, solution_tex: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-[#11121c] px-3 py-2.5 text-sm text-navy-200 focus:border-govt-500 focus:outline-none"
                  placeholder="Using v^2 = u^2 + 2as..."
                />
              </div>

              {/* Solution preview */}
              {form.solution_tex && (
                <div className="rounded-lg border border-govt-500/20 bg-govt-500/10 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs font-medium text-govt-300">
                    <Eye className="h-3 w-3" />
                    {t('admin.preview')}
                  </div>
                  <Math display>{form.solution_tex}</Math>
                </div>
              )}

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

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete question"
        message={t('admin.confirmDelete')}
        confirmLabel="Delete"
        destructive
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected questions"
        message={`Delete ${selectedIds.size} selected questions? This cannot be undone.`}
        confirmLabel="Delete all"
        destructive
      />

      <ConfirmDialog
        open={rollbackId !== null}
        onClose={() => setRollbackId(null)}
        onConfirm={() => rollbackId && handleRollbackBatch(rollbackId)}
        title="Roll back import batch"
        message="Roll back this import batch? All questions from this batch that are not published or linked to mocks will be deleted."
        confirmLabel="Roll back"
        destructive
      />
    </AdminLayout>
  );
}
