import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, FileText,
  Download, ArrowRight, ArrowLeft, FileJson, FileSpreadsheet as FileCsv,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useImportBatches } from '@/lib/queries';
import { QUESTION_CSV_TEMPLATE } from '@/lib/question-csv';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'validate' | 'review' | 'done';
type ContentType = 'csv' | 'json';

interface ValidationError {
  row: number;
  statement: string;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  batch_id?: string;
  total: number;
  valid: number;
  invalid: number;
  imported?: number;
  failed?: number;
  errors: ValidationError[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

export function AdminImportPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [contentType, setContentType] = useState<ContentType>('csv');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: batches } = useImportBatches();

  const handleFile = async (f: File) => {
    setError(null);
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large (max 5MB).');
      return;
    }
    const name = f.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isJson = name.endsWith('.json');
    if (!isCsv && !isJson) {
      setError('Please upload a CSV or JSON file.');
      return;
    }
    setContentType(isJson ? 'json' : 'csv');
    setFile(f);
    try {
      const text = await f.text();
      setFileContent(text);
    } catch {
      setError('Failed to read file.');
      return;
    }
    setStep('validate');
  };

  const handleValidate = async () => {
    if (!file || !fileContent) return;
    setValidating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated.');
        setValidating(false);
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            file_content: fileContent,
            file_name: file.name,
            content_type: contentType,
            dry_run: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Validation failed.');
        setValidating(false);
        return;
      }
      setValidationResult(data);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !fileContent) return;
    setImporting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated.');
        setImporting(false);
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            file_content: fileContent,
            file_name: file.name,
            content_type: contentType,
            dry_run: false,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Import failed.');
        setImporting(false);
        return;
      }
      setImportResult(data);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['questions-paged'] });
      queryClient.invalidateQueries({ queryKey: ['question-counts'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      if (data.imported > 0) {
        toast.success(`${data.imported} questions imported as drafts`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([QUESTION_CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = () => {
    if (!validationResult?.errors.length) return;
    const header = 'row,statement,errors\n';
    const rows = validationResult.errors
      .map((e) => `${e.row},"${(e.statement || '').replace(/"/g, '""')}","${e.errors.join('; ').replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setValidationResult(null);
    setImportResult(null);
    setError(null);
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'validate', label: 'Validate' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Import Questions</h1>
          <p className="text-sm text-navy-400">
            Upload questions in bulk via CSV or JSON. Max {MAX_ROWS} rows / 5MB. All imports start as DRAFTS.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                  i <= currentStepIndex
                    ? 'border-govt-500 bg-govt-500/20 text-govt-300'
                    : 'border-white/10 text-navy-500',
                )}
              >
                {i + 1}
              </div>
              <span className={cn('text-sm', i <= currentStepIndex ? 'font-medium text-white' : 'text-navy-500')}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="h-px w-8 bg-white/10" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Card
              className={cn('border-2 border-dashed transition-colors', dragOver ? 'border-govt-500 bg-govt-500/10' : 'border-white/15')}
            >
              <CardContent
                className="flex flex-col items-center py-12"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
              >
                <Upload className="mb-4 h-12 w-12 text-navy-500" />
                <p className="text-sm font-medium text-white">Drag and drop your CSV or JSON file here</p>
                <p className="mt-1 text-xs text-navy-500">Max {MAX_ROWS} rows / 5MB per upload</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Button variant="outline" className="mt-4" onClick={() => fileRef.current?.click()}>
                  Choose file
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <FileCsv className="h-8 w-8 text-govt-400" />
                  <CardTitle className="text-base text-white">CSV Template</CardTitle>
                  <CardDescription>Download the template with all required columns including licence and source_reference.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4" /> Download template
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <FileJson className="h-8 w-8 text-sky-400" />
                  <CardTitle className="text-base text-white">JSON Format</CardTitle>
                  <CardDescription>
                    Upload a JSON array of objects with keys: chapter_id, type, difficulty, statement_tex, option_a-d, answer_option, answer_value, tolerance, solution_tex, licence, source_reference.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Recent batches */}
            {batches && batches.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Recent import batches</h3>
                  <div className="space-y-1.5">
                    {batches.slice(0, 10).map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-navy-400" />
                          <span className="font-medium text-navy-200">{b.file_name}</span>
                          <Badge
                            variant="neutral"
                            className={
                              b.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300'
                              : b.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300'
                              : b.status === 'ROLLED_BACK' ? 'bg-red-500/20 text-red-300'
                              : 'bg-white/10 text-navy-300'
                            }
                          >
                            {b.status}
                          </Badge>
                          <span className="text-xs text-navy-500">
                            {b.rows_ok} ok / {b.rows_failed} failed / {b.rows_total} total
                          </span>
                        </div>
                        <span className="text-xs text-navy-500">
                          {new Date(b.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <CardTitle className="text-base text-white">Validation</CardTitle>
                  <CardDescription>Server-side schema validation and dry run before any data is written.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <AlertCircle className="h-8 w-8 text-amber-400" />
                  <CardTitle className="text-base text-white">Error Report</CardTitle>
                  <CardDescription>Download a CSV of all validation errors with row numbers and descriptions.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <FileSpreadsheet className="h-8 w-8 text-govt-400" />
                  <CardTitle className="text-base text-white">Draft Only</CardTitle>
                  <CardDescription>Imported questions are assigned DRAFT status and must be reviewed before publishing.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Validate */}
        {step === 'validate' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-govt-400" />
                    <div>
                      <span className="text-sm font-medium text-white">{file?.name}</span>
                      <span className="ml-2 text-xs text-navy-500">
                        {(file?.size ?? 0 / 1024).toFixed(0)} KB · {contentType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button variant="primary" onClick={handleValidate} disabled={validating}>
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {validating ? 'Validating...' : 'Validate (dry run)'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{validationResult.total}</div>
                  <div className="text-xs text-navy-400">Total rows</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{validationResult.valid}</div>
                  <div className="text-xs text-navy-400">Valid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{validationResult.invalid}</div>
                  <div className="text-xs text-navy-400">With errors</div>
                </CardContent>
              </Card>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Validation errors</h3>
                  <Button variant="ghost" size="sm" onClick={downloadErrors}>
                    <Download className="h-4 w-4" /> Download error CSV
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {validationResult.errors.map((e, i) => (
                    <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-red-400">Row {e.row}</span>
                        <div className="flex-1">
                          <p className="truncate text-sm text-navy-200">{e.statement}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {e.errors.map((err, j) => (
                              <span key={j} className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">
                                {err}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('validate')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={importing || validationResult.valid === 0}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Importing...' : `Import ${validationResult.valid} questions`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && importResult && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Import complete</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="text-xl font-bold text-white">{importResult.total}</div>
                    <div className="text-xs text-navy-400">Total</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-400">{importResult.imported ?? 0}</div>
                    <div className="text-xs text-navy-400">Imported</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-400">{importResult.failed ?? 0}</div>
                    <div className="text-xs text-navy-400">Failed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-400">{importResult.invalid}</div>
                    <div className="text-xs text-navy-400">Validation errors</div>
                  </div>
                </div>
                {importResult.batch_id && (
                  <p className="mt-3 text-xs text-navy-500">Batch ID: {importResult.batch_id}</p>
                )}
              </CardContent>
            </Card>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Failed rows</h3>
                  <Button variant="ghost" size="sm" onClick={downloadErrors}>
                    <Download className="h-4 w-4" /> Download error CSV
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                      <span className="text-xs font-bold text-red-400">Row {e.row}:</span>
                      <span className="ml-2 text-navy-300">{e.errors.join('; ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <a href="/admin/questions">
                <Button variant="primary">
                  Go to question bank
                </Button>
              </a>
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
