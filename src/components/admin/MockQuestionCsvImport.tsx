import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { useImportBatches } from '@/lib/queries';
import { parseQuestionCsv, QUESTION_CSV_TEMPLATE, type ParsedQuestion } from '@/lib/question-csv';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface MockQuestionCsvImportProps {
  mockId: string;
  startPosition: number;
  onImported: () => void;
}

export function MockQuestionCsvImport({ mockId, startPosition, onImported }: MockQuestionCsvImportProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedQuestion[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { data: batches } = useImportBatches();

  const validRows = parsed?.filter((q) => q.errors.length === 0) ?? [];
  const skippedRows = (parsed?.length ?? 0) - validRows.length;
  const invalidMessages = parsed?.filter((q) => q.errors.length > 0).slice(0, 5) ?? [];

  const handleFile = async (file: File) => {
    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File is too large. Maximum 5 MB.');
      return;
    }
    try {
      const parsedRows = parseQuestionCsv(await file.text());

      // Fetch valid chapter IDs from the database to prevent FK violations
      const { data: chapters } = await supabase.from('chapters').select('id').order('id');
      const chapterRows = chapters ?? [];
      const validChapterIds = new Set(chapterRows.map((c) => c.id));
      const legacyChapterIds = new Map(chapterRows.map((chapter, index) => [index + 1, chapter.id]));

      const validated = parsedRows.map((q) => {
        const errors = [...q.errors];
        const mappedChapterId = legacyChapterIds.get(q.chapter_id);
        const chapterId = validChapterIds.has(q.chapter_id) ? q.chapter_id : mappedChapterId ?? q.chapter_id;
        if (!validChapterIds.has(chapterId) && !errors.some((e) => e.includes('chapter_id'))) {
          errors.push(`Chapter ID ${q.chapter_id} does not exist in the database`);
        }
        return { ...q, chapter_id: chapterId, errors };
      });

      setParsed(validated);
    } catch (err) {
      setParsed(null);
      setFileError(err instanceof Error ? err.message : 'Could not read this file');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([QUESTION_CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mock_questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!user || validRows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });

    const arranged = [
      ...validRows.filter((q) => q.type === 'MCQ'),
      ...validRows.filter((q) => q.type === 'NUMERICAL'),
    ];

    const insertPayload = arranged.map((q) => ({
      chapter_id: q.chapter_id,
      type: q.type,
      difficulty: q.difficulty,
      statement_tex: q.statement_tex,
      options_json: q.options_json,
      answer_json: q.answer_json,
      tolerance: q.tolerance,
      solution_tex: q.solution_tex,
      licence: q.licence,
      source_reference: q.source_reference,
      review_status: 'PUBLISHED',
      source: 'IMPORTED',
      created_by: user.id,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('questions')
      .insert(insertPayload)
      .select('id');

    if (insertError || !inserted || inserted.length === 0) {
      setImporting(false);
      setProgress(null);
      toast.error(insertError?.message ?? 'No questions could be saved.');
      return;
    }

    const questionIds: string[] = inserted.map((row: { id: string }) => row.id);
    const succeeded = questionIds.length;
    const failed = arranged.length - succeeded;

    if (questionIds.length > 0) {
      const links = questionIds.map((question_id, i) => ({
        mock_test_id: mockId,
        question_id,
        position: startPosition + i,
        section: arranged[i].type === 'MCQ' ? 'A' : 'B',
      }));
      const { error: linkError } = await supabase.from('mock_test_questions').insert(links);
      if (linkError) {
        toast.error(linkError.message);
        setImporting(false);
        setProgress(null);
        queryClient.invalidateQueries({ queryKey: ['questions'] });
        return;
      }
    }

    // Record this upload in import_batches for history tracking
    await supabase.from('import_batches').insert({
      created_by: user.id,
      file_name: `mock-builder-${new Date().toISOString().slice(0, 10)}.csv`,
      rows_total: parsed?.length ?? arranged.length,
      rows_ok: succeeded,
      rows_failed: failed,
      status: failed === 0 ? 'COMPLETED' : 'PARTIAL',
    });

    setImporting(false);
    setProgress(null);
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    queryClient.invalidateQueries({ queryKey: ['mock-tests'] });
    queryClient.invalidateQueries({ queryKey: ['mock-test-question-count', mockId] });
    queryClient.invalidateQueries({ queryKey: ['mock-test-sections', mockId] });
    queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    if (succeeded > 0) {
      toast.success(`Added ${succeeded} questions to the mock`);
      setParsed(null);
      onImported();
    }
    if (failed > 0) toast.error(`${failed} questions could not be saved`);
  };

  const batchStatusColor = (status: string) =>
    status === 'COMPLETED' ? 'text-emerald-400'
    : status === 'PARTIAL' ? 'text-amber-400'
    : status === 'ROLLED_BACK' ? 'text-red-400'
    : 'text-navy-400';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Upload questions from CSV</p>
          <p className="text-xs text-navy-400">MCQs go to Section A and numericals to Section B. Use database chapter IDs such as 101, 102, or 201; older 1-based template IDs are converted automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" /> History
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Template
          </Button>
        </div>
      </div>

      {showHistory && batches && batches.length > 0 && (
        <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg border border-white/10 bg-white/5">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#1a1b28] text-navy-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">File</th>
                <th className="px-3 py-2 text-right font-medium">Questions</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {batches.slice(0, 12).map((b) => (
                <tr key={b.id} className="text-navy-300">
                  <td className="max-w-[140px] truncate px-3 py-2">{b.file_name}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-emerald-400">{b.rows_ok}</span>
                    {b.rows_failed > 0 && <span className="text-red-400"> / {b.rows_failed} fail</span>}
                    <span className="text-navy-500"> / {b.rows_total}</span>
                  </td>
                  <td className={`px-3 py-2 font-medium ${batchStatusColor(b.status)}`}>{b.status}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-navy-500">{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showHistory && (!batches || batches.length === 0) && (
        <p className="text-xs text-navy-500">No import history yet.</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
        <Upload className="h-4 w-4" /> Choose CSV file
      </Button>

      {fileError && <p className="text-xs text-red-300">{fileError}</p>}

      {importing && progress && (
        <div className="flex items-center gap-2 text-xs text-navy-300">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-navy-400 border-t-transparent" />
          Importing {progress.done} of {progress.total} questions...
        </div>
      )}

      {parsed && !importing && (
        <div className="space-y-2 text-xs text-navy-300">
          <p>
            {validRows.length} ready to add
            {skippedRows > 0 ? `, ${skippedRows} rows skipped because of errors` : ''}.
          </p>
          {invalidMessages.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-red-300">
              {invalidMessages.map((q, i) => (
                <li key={i}>{q.errors.join(', ')}</li>
              ))}
            </ul>
          )}
          <Button variant="primary" size="sm" onClick={handleImport} disabled={importing || validRows.length === 0} loading={importing}>
            Add {validRows.length} questions to mock
          </Button>
        </div>
      )}
    </div>
  );
}
