import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Clock, Award, ListChecks, ChevronRight, ChevronLeft, Check, ShieldCheck } from 'lucide-react';
import { PaletteSymbol } from '@/components/exam/PaletteSymbol';
import { QUESTION_STATES, STATE_ORDER, toPaletteStatus } from '@/exam/questionStates';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/common/BrandLogo';
import type { ExamData } from '@/lib/exam-api';

interface PreStartFlowProps {
  examData: ExamData;
  candidateName: string;
  onStart: () => void;
}

type Phase = 'welcome' | 'instructions' | 'declaration';

const INSTRUCTION_PAGES = 4;

export function PreStartFlow({ examData, candidateName, onStart }: PreStartFlowProps) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [instructionPage, setInstructionPage] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const totalQuestions = examData.questions.length;
  const totalMarks = examData.mock_test.total_marks;
  const duration = examData.mock_test.duration_min;

  const subjects = Array.from(
    new Set(examData.questions.map((q) => q.section || 'All')),
  );

  const markingScheme = examData.mock_test.marking_scheme as {
    mcq?: { correct?: number; wrong?: number };
    numerical?: { correct?: number; wrong?: number };
  };
  const mcqCorrect = markingScheme?.mcq?.correct ?? 4;
  const mcqWrong = markingScheme?.mcq?.wrong ?? -1;
  const numCorrect = markingScheme?.numerical?.correct ?? 4;
  const numWrong = markingScheme?.numerical?.wrong ?? -1;

  const handleBegin = () => {
    onStart();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFF]">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-govt-200 bg-white px-4 text-navy-900 shadow-sm">
        <BrandLogo to="/dashboard" variant="workspace" tone="light" />
        <div className="flex items-center gap-3">
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="rounded-md border border-navy-200 bg-white px-2 py-1 text-xs text-navy-700 focus:outline-none"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-govt-100 text-xs font-bold text-govt-800">
              {candidateName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm font-medium text-navy-700 sm:inline">{candidateName}</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center p-4 pt-8 md:items-center">
        <div className="w-full max-w-3xl rounded-xl border border-[#E5E4F2] bg-white shadow-sm">
          {phase === 'welcome' && (
            <div className="prestart-welcome p-4 sm:p-6 md:p-8">
              <div className="prestart-hero mb-4 rounded-xl px-5 py-5 sm:px-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="prestart-badge">FULL SYLLABUS</span>
                  <span className="prestart-badge">{examData.mock_test.mode === 'EXAM' ? 'Exam Mode' : 'Practice Mode'}</span>
                  <span className="prestart-badge prestart-badge-success">Free</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{examData.mock_test.title}</h1>
                <p className="mt-1 text-xs text-white/70">{t('exam.independentPractice')}</p>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="prestart-stat"><Clock className="mx-auto mb-2 h-5 w-5 text-cyan-400" /><strong>{duration}</strong><span>minutes</span></div>
                <div className="prestart-stat"><Award className="mx-auto mb-2 h-5 w-5 text-cyan-400" /><strong>{totalMarks}</strong><span>marks</span></div>
                <div className="prestart-stat"><ListChecks className="mx-auto mb-2 h-5 w-5 text-cyan-400" /><strong>{totalQuestions}</strong><span>questions</span></div>
              </div>

              <div className="prestart-section mb-4">
                <h3 className="prestart-section-title">Section breakdown</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="prestart-breakdown prestart-breakdown-cyan"><strong>SECTION A</strong><span>{subjects.length > 0 ? Math.ceil(totalQuestions * 0.65) : totalQuestions} MCQs</span><small>Multiple choice — single correct option</small></div>
                  <div className="prestart-breakdown prestart-breakdown-amber"><strong>SECTION B</strong><span>{subjects.length > 0 ? Math.floor(totalQuestions * 0.35) : 0} Numerical</span><small>Numerical value — type your answer</small></div>
                </div>
              </div>

              <div className="prestart-info mb-4">
                <GraduationCap className="h-5 w-5 shrink-0 text-cyan-400" />
                <div><strong>NTA-style exam interface</strong><p>This mock uses the same layout as the actual JEE Main CBT — colour question palette, subject tabs, Save &amp; Next, Mark for Review, and a live timer.</p></div>
              </div>

              <div className="prestart-section mb-4">
                <h3 className="prestart-section-title">Marking scheme</h3>
                <div className="grid grid-cols-2 gap-2 text-xs sm:gap-3 sm:text-sm">
                  <div className="prestart-marking prestart-marking-positive"><span>MCQ correct</span><strong>+{mcqCorrect}</strong></div>
                  <div className="prestart-marking prestart-marking-negative"><span>MCQ wrong</span><strong>{mcqWrong}</strong></div>
                  <div className="prestart-marking prestart-marking-positive"><span>Numerical correct</span><strong>+{numCorrect}</strong></div>
                  <div className="prestart-marking prestart-marking-negative"><span>Numerical wrong</span><strong>{numWrong}</strong></div>
                </div>
              </div>

              <div className="prestart-section mb-4">
                <h3 className="prestart-section-title">Rules</h3>
                <ul className="space-y-2 text-xs text-white/80 sm:text-sm">
                  <li className="flex items-start gap-2"><span className="prestart-rule-dot" />The timer starts as soon as you begin. It cannot be paused.</li>
                  <li className="flex items-start gap-2"><span className="prestart-rule-dot" />Each MCQ has exactly one correct answer. Wrong answers get negative marks.</li>
                  <li className="flex items-start gap-2"><span className="prestart-rule-dot" />Numerical answers must be within the tolerance range to be marked correct.</li>
                  <li className="flex items-start gap-2"><span className="prestart-rule-dot" />You can flag questions for review and navigate freely between questions.</li>
                </ul>
              </div>

              <div className="mb-4 flex items-center justify-center gap-2 text-center text-[11px] text-white/50"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Server-graded — your answers are evaluated fairly, no client-side cheating.</div>
              <button
                onClick={() => { setPhase('instructions'); setInstructionPage(0); }}
                className="prestart-primary-button flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white tap-target"
              >
                <ChevronRight className="h-4 w-4" />
                Start mock
              </button>
            </div>
          )}

          {phase === 'instructions' && (
            <div className="flex flex-col" style={{ minHeight: '420px' }}>
              <div className="border-b border-[#E5E4F2] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy-900">{t('exam.generalInstructions')}</h2>
                  <span className="text-xs text-navy-400">
                    {instructionPage + 1} / {INSTRUCTION_PAGES}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E5E4F2]">
                  <div
                    className="h-full rounded-full bg-govt-600 transition-[width]"
                    style={{ width: `${((instructionPage + 1) / INSTRUCTION_PAGES) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {instructionPage === 0 && (
                  <div className="space-y-4 text-sm text-navy-700">
                    <h3 className="text-base font-semibold text-navy-900">{t('exam.instrTimerTitle')}</h3>
                    <p>{t('exam.instrTimer1')}</p>
                    <p>{t('exam.instrTimer2')}</p>
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-800">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{t('exam.instrTimer3')}</span>
                    </div>
                    <h3 className="pt-2 text-base font-semibold text-navy-900">{t('exam.instrPaletteTitle')}</h3>
                    <div className="space-y-2">
                      {STATE_ORDER.map((state) => (
                        <div key={state} className="flex items-center gap-3">
                          <PaletteSymbol status={toPaletteStatus(state)} number={0} size="sm" />
                          <span>{QUESTION_STATES[state].label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {instructionPage === 1 && (
                  <div className="space-y-4 text-sm text-navy-700">
                    <h3 className="text-base font-semibold text-navy-900">{t('exam.instrAnsweringTitle')}</h3>
                    <p>{t('exam.instrAnswering1')}</p>
                    <p>{t('exam.instrAnswering2')}</p>
                    <div className="space-y-2 rounded-lg bg-[#FAFAFF] p-4">
                      <div className="flex items-center gap-2"><span className="rounded bg-[#4CAF50] px-2 py-1 text-xs font-semibold text-white">{t('exam.saveNext')}</span><span>{t('exam.instrSaveNext')}</span></div>
                      <div className="flex items-center gap-2"><span className="rounded border border-[#7B1FA2] px-2 py-1 text-xs font-semibold text-[#7B1FA2]">{t('exam.markReviewNext')}</span><span>{t('exam.instrMarkNext')}</span></div>
                      <div className="flex items-center gap-2"><span className="rounded border border-[#E5E4F2] px-2 py-1 text-xs font-semibold text-navy-600">{t('exam.clearResponse')}</span><span>{t('exam.instrClear')}</span></div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <p>{t('exam.instrMarkEval')}</p>
                    </div>
                  </div>
                )}
                {instructionPage === 2 && (
                  <div className="space-y-4 text-sm text-navy-700">
                    <h3 className="text-base font-semibold text-navy-900">{t('exam.instrNavigationTitle')}</h3>
                    <p>{t('exam.instrNav1')}</p>
                    <p>{t('exam.instrNav2')}</p>
                    <p>{t('exam.instrNav3')}</p>
                    <h3 className="pt-2 text-base font-semibold text-navy-900">{t('exam.instrMarkingTitle')}</h3>
                    <p>{t('exam.instrMarking1')}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                        <span className="text-navy-600">MCQ {t('exam.correct')}</span>
                        <span className="font-bold text-emerald-700">+{mcqCorrect}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2">
                        <span className="text-navy-600">MCQ {t('exam.wrong')}</span>
                        <span className="font-bold text-red-700">{mcqWrong}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                        <span className="text-navy-600">{t('exam.numerical')} {t('exam.correct')}</span>
                        <span className="font-bold text-emerald-700">+{numCorrect}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2">
                        <span className="text-navy-600">{t('exam.numerical')} {t('exam.wrong')}</span>
                        <span className="font-bold text-red-700">{numWrong}</span>
                      </div>
                    </div>
                  </div>
                )}
                {instructionPage === 3 && (
                  <div className="space-y-4 text-sm text-navy-700">
                    <h3 className="text-base font-semibold text-navy-900">{t('exam.instrRulesTitle')}</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-500" /> {t('exam.instrRule1')}</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-500" /> {t('exam.instrRule2')}</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-500" /> {t('exam.instrRule3')}</li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-govt-500" /> {t('exam.instrRule4')}</li>
                    </ul>
                    <div className="rounded-lg border border-[#E5E4F2] bg-[#FAFAFF] p-3 text-center text-sm text-navy-600">
                      {t('exam.instrDisclaimer')}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#E5E4F2] px-6 py-4">
                <button
                  onClick={() => {
                    if (instructionPage === 0) setPhase('welcome');
                    else setInstructionPage(instructionPage - 1);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-[#E5E4F2] px-4 py-2 text-sm font-medium text-navy-600 transition-colors hover:bg-[#FAFAFF] tap-target"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('exam.previous')}
                </button>
                <button
                  onClick={() => {
                    if (instructionPage < INSTRUCTION_PAGES - 1) setInstructionPage(instructionPage + 1);
                    else setPhase('declaration');
                  }}
                  className="flex items-center gap-2 rounded-lg bg-govt-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-govt-700 tap-target"
                >
                  {t('exam.next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {phase === 'declaration' && (
            <div className="p-6 md:p-10">
              <div className="mb-6 flex flex-col items-center text-center">
                <ShieldCheck className="mb-3 h-12 w-12 text-govt-600" />
                <h2 className="text-xl font-bold text-navy-900">{t('exam.declarationTitle')}</h2>
              </div>

              <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E4F2] bg-[#FAFAFF] p-4 transition-colors hover:bg-[#F5F3FF]">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#E5E4F2] text-govt-600 focus:ring-govt-600"
                />
                <span className="text-sm text-navy-700">{t('exam.declarationText')}</span>
              </label>

              <div className="mb-6 rounded-lg border border-[#E5E4F2] bg-[#FAFAFF] p-3 text-center text-xs text-navy-500">
                {t('exam.instrDisclaimer')}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleBegin}
                  disabled={!agreed}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-semibold text-white transition-colors tap-target',
                    agreed ? 'bg-govt-800 hover:bg-govt-700' : 'cursor-not-allowed bg-[#E5E4F2]',
                  )}
                >
                  {t('exam.readyToBegin')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#E5E4F2] bg-white py-3 text-center">
        <p className="text-xs text-navy-400">{t('app.independent')}</p>
      </footer>
    </div>
  );
}
