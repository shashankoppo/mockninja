import { useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileWarning, Send } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface ReportLocationState {
  questionNumber?: number;
  statement?: string;
  mockTitle?: string;
}

const reasons = [
  { value: 'INCORRECT', label: 'Incorrect answer or solution' },
  { value: 'AMBIGUOUS', label: 'Ambiguous or unclear wording' },
  { value: 'TYPO', label: 'Typo or formatting problem' },
  { value: 'IMAGE', label: 'Missing or incorrect image' },
  { value: 'OTHER', label: 'Something else' },
] as const;

type ReportReason = typeof reasons[number]['value'];

export function ReportQuestionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = (location.state as ReportLocationState | null) || {};
  const attemptId = searchParams.get('attemptId');
  const questionId = searchParams.get('questionId');
  const mockTestId = searchParams.get('mockTestId');
  const [reason, setReason] = useState<ReportReason>('INCORRECT');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const backToExam = () => {
    if (attemptId) navigate(`/exam/${attemptId}`);
    else navigate(-1);
  };

  const submitReport = async () => {
    if (!questionId || details.trim().length < 10) return;
    setSaving(true);
    const { error } = await supabase.from('question_reports').insert({
      question_id: questionId,
      attempt_id: attemptId || null,
      mock_test_id: mockTestId || null,
      reason,
      details: details.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error('This question may already have a report for this attempt. Please check your reports or try another question.');
      return;
    }
    setSubmitted(true);
    toast.success('Thanks. Your report has been sent to the review team.');
  };

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        <button onClick={backToExam} className="flex items-center gap-2 text-sm font-medium text-navy-300 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to exam
        </button>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-govt-300">Question feedback</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Report a question</h1>
          <p className="mt-1 text-sm text-navy-300">Tell us what needs checking. Your feedback helps keep every mock accurate and fair.</p>
        </div>

        {submitted ? (
          <Card className="border-emerald-400/30 bg-emerald-500/10">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              <h2 className="mt-4 text-xl font-bold text-white">Report received</h2>
              <p className="mt-2 max-w-md text-sm text-emerald-100/80">Our review team will check the question. You can return to your mock now.</p>
              <Button className="mt-6" variant="primary" onClick={backToExam}>Return to exam</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <FileWarning className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">{context.questionNumber ? `Question ${context.questionNumber}` : 'Question feedback'}</CardTitle>
                  <CardDescription>{context.mockTitle || 'Your mock test'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {context.statement && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Question statement</p>
                  <p className="text-sm leading-6 text-navy-100">{context.statement}</p>
                </div>
              )}

              {!questionId && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This report link is missing the question context. Return to the exam and use the report button there.
                </div>
              )}

              <label className="block text-sm font-medium text-navy-100">
                What is wrong?
                <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)} className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-govt-400 focus:outline-none">
                  {reasons.map((item) => <option key={item.value} value={item.value} className="bg-navy-900">{item.label}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium text-navy-100">
                Explain the issue
                <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={6} maxLength={2000} placeholder="Please describe the issue clearly so our review team can reproduce it…" className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm leading-6 text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none" />
                <span className="mt-1 block text-right text-xs text-navy-500">{details.length}/2000</span>
              </label>

              <div className="flex items-start gap-2 rounded-lg bg-white/5 p-3 text-xs leading-5 text-navy-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                Please report factual issues only. Your report is linked to this attempt so the team can review the exact question version you saw.
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={backToExam}>Cancel</Button>
                <Button variant="primary" onClick={submitReport} disabled={!questionId || details.trim().length < 10 || saving}>
                  <Send className="h-4 w-4" /> {saving ? 'Sending…' : 'Send report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
