import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock, CalendarClock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Check, X, LayoutGrid, GraduationCap, Flag, FileText, Info, Maximize, FileWarning,
} from 'lucide-react';
import { Math as MathTex } from '@/components/Math';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { examGet, examSave, examSubmit, type ExamData } from '@/lib/exam-api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { NumericalKeypad } from '@/components/exam/NumericalKeypad';
import { Scratchpad } from '@/components/exam/Scratchpad';
import { PaletteSymbol, PaletteLegend } from '@/components/exam/PaletteSymbol';
import { PreStartFlow } from '@/components/exam/PreStartFlow';
import { BookmarkButton, useBookmarkStatus } from '@/components/exam/BookmarkButton';
import { BrandLogo } from '@/components/common/BrandLogo';

interface AnswerState {
  answer: unknown;
  committedAnswer: unknown;
  timeSpent: number;
  flagged: boolean;
  visited: boolean;
}

const SUBJECT_ORDER = ['Physics', 'Chemistry', 'Mathematics', 'Maths'];

function playAlertBeep(frequency: number, duration: number) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.05);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio not available — visual alert still shows
  }
}

import { QUESTION_STATES, toPaletteStatus, type QuestionState, type PaletteStatus } from '@/exam/questionStates';
import { paletteShapeFor } from '@/components/exam/PaletteSymbol';

const STRICT_MODE = true;

export function ExamPage() {
  const { attemptId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preStart, setPreStart] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [integrityNotice, setIntegrityNotice] = useState<string | null>(null);
  const [switchWarning, setSwitchWarning] = useState(false);
  const [switchCount, setSwitchCount] = useState(0);
  const lastSwitchRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const lastAlertedRef = useRef<number | null>(null);
  const questionIds = data?.questions.map((q) => q.id) ?? [];
  const { data: bookmarkedIds } = useBookmarkStatus(questionIds, profile?.id);

  // Auto-enter fullscreen once when the exam screen first loads (preStart dismissed). Guard with a ref so it fires once, not on every re-render.
  const fullscreenRequestedRef = useRef(false);
  useEffect(() => {
    if (loading || preStart || showThankYou) return;
    if (fullscreenRequestedRef.current) return;
    fullscreenRequestedRef.current = true;
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) return;
    el.requestFullscreen?.().catch(() => {});
  }, [loading, preStart, showThankYou]);

  // Exit fullscreen on error or thank-you screen
  useEffect(() => {
    if ((error || showThankYou) && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [error, showThankYou]);

  const questionStartRef = useRef(Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const currentIdxRef = useRef(currentIdx);
  currentIdxRef.current = currentIdx;
  const submittingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attemptId || loading) return;
    localStorage.setItem(`exam-position:${attemptId}`, String(currentIdx));
  }, [attemptId, loading, currentIdx]);

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    (async () => {
      const result = await examGet(attemptId);
      if (!mounted) return;
      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setData(result);
      const init: Record<string, AnswerState> = {};
      for (const q of result.questions) {
        const saved = result.responses[q.id];
        init[q.id] = {
          answer: saved?.answer ?? null,
          committedAnswer: saved?.answer ?? null,
          timeSpent: saved?.time_spent_sec ?? 0,
          flagged: saved?.flagged ?? false,
          visited: !!saved,
        };
      }
      if (result.questions[0]) init[result.questions[0].id].visited = true;
      setAnswers(init);
      const savedIdx = Number(localStorage.getItem(`exam-position:${attemptId}`));
      if (Number.isInteger(savedIdx) && savedIdx >= 0 && savedIdx < result.questions.length) {
        setCurrentIdx(savedIdx);
      }
      const startedAt = new Date(result.attempt.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      if (result.attempt.is_untimed) {
        setTimeLeft(-1);
      } else {
        const durationMin = result.attempt.duration_min ?? result.mock_test.duration_min;
        const total = durationMin * 60;
        setTimeLeft(Math.max(0, total - elapsed));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [attemptId]);

  const handleSubmitFinal = useCallback(async () => {
    if (!data || !attemptId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const q = data.questions[currentIdxRef.current];
    const elapsed = q ? Math.floor((Date.now() - questionStartRef.current) / 1000) : 0;
    const snapshot = { ...answersRef.current };
    if (q) {
      snapshot[q.id] = {
        ...snapshot[q.id],
        timeSpent: (snapshot[q.id]?.timeSpent || 0) + elapsed,
        visited: true,
      };
    }
    await new Promise((r) => setTimeout(r, 100));

    const responses = data.questions.map((qq) => {
      const a = snapshot[qq.id];
      const finalAnswer = a?.committedAnswer ?? a?.answer ?? null;
      return {
        question_id: qq.id,
        answer: finalAnswer,
        time_spent_sec: a?.timeSpent ?? 0,
        flagged: a?.flagged ?? false,
      };
    });
    const result = await examSubmit(attemptId, responses);
    if ('success' in result) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      localStorage.removeItem(`exam-position:${attemptId}`);
      setShowThankYou(true);
    } else {
      setSubmitting(false);
      submittingRef.current = false;
      setError(result.error);
    }
  }, [data, attemptId]);

  useEffect(() => {
    if (loading || preStart || showThankYou || submitting || !questionStartedAt) return;
    const updateQuestionClock = () => {
      setQuestionElapsed(Math.floor((Date.now() - questionStartedAt.getTime()) / 1000));
    };
    updateQuestionClock();
    const interval = setInterval(updateQuestionClock, 1000);
    return () => clearInterval(interval);
  }, [loading, preStart, showThankYou, submitting, questionStartedAt]);

  useEffect(() => {
    if (timeLeft < 0 || loading || preStart) return;
    if (timeLeft === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittingRef.current) {
            setShowTimeUp(true);
            handleSubmitFinal();
          }
          return 0;
        }
        const next = prev - 1;
        if (next <= 300 && next > 0) {
          if (lastAlertedRef.current === null || next < lastAlertedRef.current) {
            const shouldBeep = next === 300 || next === 60 || next === 30 || next === 10 || (next <= 5 && next > 0);
            if (shouldBeep) {
              playAlertBeep(next <= 10 ? 900 : 660, next <= 10 ? 0.25 : 0.18);
              lastAlertedRef.current = next;
            }
          }
          if (next === 300) {
            setTimeWarning('5 minutes remaining');
          } else if (next === 60) {
            setTimeWarning('1 minute remaining');
          } else if (next === 30) {
            setTimeWarning('30 seconds remaining');
          } else if (next === 10) {
            setTimeWarning('10 seconds left!');
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, loading, preStart, handleSubmitFinal]);

  useEffect(() => {
    if (timeWarning) {
      const id = setTimeout(() => setTimeWarning(null), 4000);
      return () => clearTimeout(id);
    }
  }, [timeWarning]);

  const accumulateTime = useCallback(() => {
    if (!data) return;
    const q = data.questions[currentIdxRef.current];
    if (!q) return;
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...prev[q.id], timeSpent: (prev[q.id]?.timeSpent || 0) + elapsed, visited: true },
    }));
  }, [data]);

  const navigateTo = useCallback((idx: number) => {
    if (idx < 0 || !data || idx >= data.questions.length) return;
    accumulateTime();
    const nextStartedAt = new Date();
    setCurrentIdx(idx);
    questionStartRef.current = nextStartedAt.getTime();
    setQuestionStartedAt(nextStartedAt);
    setQuestionElapsed(0);
  }, [accumulateTime, data]);

  const saveAndNext = useCallback(async () => {
    if (!data || !attemptId) return;
    const q = data.questions[currentIdxRef.current];
    if (!q) return;
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
    const ans = answersRef.current[q.id];
    const totalTime = (ans?.timeSpent || 0) + elapsed;
    const hasAnswer = ans?.answer !== null && ans?.answer !== undefined;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...prev[q.id], committedAnswer: ans?.answer ?? null, flagged: false, timeSpent: totalTime, visited: true },
    }));
    await examSave(attemptId, q.id, hasAnswer ? ans?.answer : null, totalTime, false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
    if (currentIdxRef.current < data.questions.length - 1) {
      setCurrentIdx(currentIdxRef.current + 1);
      questionStartRef.current = Date.now();
    } else {
      setShowSubmitConfirm(true);
    }
  }, [data, attemptId, accumulateTime]);

  const markReviewAndNext = useCallback(async () => {
    if (!data || !attemptId) return;
    const q = data.questions[currentIdxRef.current];
    if (!q) return;
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
    const ans = answersRef.current[q.id];
    const totalTime = (ans?.timeSpent || 0) + elapsed;
    const hasAnswer = ans?.answer !== null && ans?.answer !== undefined;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        flagged: true,
        committedAnswer: ans?.answer ?? null,
        timeSpent: totalTime,
        visited: true,
      },
    }));
    await examSave(attemptId, q.id, hasAnswer ? ans?.answer : null, totalTime, true);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
    if (currentIdxRef.current < data.questions.length - 1) {
      const nextStartedAt = new Date();
      setCurrentIdx(currentIdxRef.current + 1);
      questionStartRef.current = nextStartedAt.getTime();
      setQuestionStartedAt(nextStartedAt);
      setQuestionElapsed(0);
    } else {
      setShowSubmitConfirm(true);
    }
  }, [data, attemptId]);

  const clearResponse = useCallback(() => {
    if (!data) return;
    const q = data.questions[currentIdxRef.current];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...prev[q.id], answer: null, committedAnswer: null, flagged: false, visited: true },
    }));
  }, [data]);

  const selectAnswer = useCallback((answer: unknown) => {
    if (!data) return;
    const q = data.questions[currentIdxRef.current];
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], answer, visited: true } }));
  }, [data]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPaletteStatus = (qId: string): PaletteStatus => {
    const a = answers[qId];
    if (!a || !a.visited) return 'not-visited';
    const hasCommitted = a.committedAnswer !== null && a.committedAnswer !== undefined;
    if (a.flagged && hasCommitted) return 'answered-marked';
    if (a.flagged) return 'marked';
    if (hasCommitted) return 'answered';
    return 'not-answered';
  };

  const questions = data?.questions ?? [];

  const subjectGroups = useMemo(() => {
    if (!data) return [];
    const groups: { name: string; indices: number[] }[] = [];
    const seen = new Map<string, number>();
    data.questions.forEach((q, idx) => {
      const subject = q.section || 'All Questions';
      let gi = seen.get(subject);
      if (gi === undefined) { gi = groups.length; groups.push({ name: subject, indices: [] }); seen.set(subject, gi); }
      groups[gi].indices.push(idx);
    });
    groups.sort((a, b) => {
      const ai = SUBJECT_ORDER.indexOf(a.name);
      const bi = SUBJECT_ORDER.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return groups;
  }, [data]);

  const activeSubjectIdx = useMemo(() => {
    const idx = subjectGroups.findIndex((g) => g.indices.includes(currentIdx));
    return idx === -1 ? 0 : idx;
  }, [subjectGroups, currentIdx]);

  const sectionGroups = useMemo(() => {
    const indices = subjectGroups[activeSubjectIdx]?.indices ?? [];
    const sections: { name: string; indices: number[] }[] = [];
    const seen = new Map<string, number>();
    indices.forEach((qIdx) => {
      const q = questions[qIdx];
      const sectionName = q.type === 'MCQ' ? 'Section A' : 'Section B';
      let si = seen.get(sectionName);
      if (si === undefined) { si = sections.length; sections.push({ name: sectionName, indices: [] }); seen.set(sectionName, si); }
      sections[si].indices.push(qIdx);
    });
    // Ensure Section A (MCQ) always appears before Section B (Numerical)
    sections.sort((a, b) => {
      if (a.name === 'Section A' && b.name === 'Section B') return -1;
      if (a.name === 'Section B' && b.name === 'Section A') return 1;
      return 0;
    });
    return sections;
  }, [subjectGroups, activeSubjectIdx, questions]);

  const activeSectionIdx = useMemo(() => {
    const idx = sectionGroups.findIndex((s) => s.indices.includes(currentIdx));
    return idx === -1 ? 0 : idx;
  }, [sectionGroups, currentIdx]);

  const paletteIndices = sectionGroups[activeSectionIdx]?.indices ?? subjectGroups[activeSubjectIdx]?.indices ?? questions.map((_, i) => i);

  const markingScheme = data?.mock_test.marking_scheme as {
    mcq?: { correct?: number; wrong?: number };
    numerical?: { correct?: number; wrong?: number };
  } | undefined;
  const mcqCorrect = markingScheme?.mcq?.correct ?? 4;
  const mcqWrong = markingScheme?.mcq?.wrong ?? -1;
  const numCorrect = markingScheme?.numerical?.correct ?? 4;
  const numWrong = markingScheme?.numerical?.wrong ?? -1;

  const isExamMode = data?.mock_test.mode === 'EXAM';

  // Fullscreen handling
  const requestFullscreen = useCallback(async () => {
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && isExamMode && !preStart && !submitting && !showThankYou) {
        setIntegrityNotice(t('exam.leftFullscreen'));
        setTimeout(() => setIntegrityNotice(null), 4000);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isExamMode, preStart, submitting, showThankYou, t]);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    supabase
      .from('integrity_events')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId)
      .eq('event_type', 'WINDOW_SWITCH')
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('integrity count load failed', error);
          return;
        }
        setSwitchCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  useEffect(() => {
    if (!isExamMode || preStart || submitting || showThankYou) return;
    const onSwitch = () => {
      if (!document.hidden && document.hasFocus()) return;
      const now = Date.now();
      if (now - lastSwitchRef.current < 1000) return;
      lastSwitchRef.current = now;
      setSwitchCount((c) => c + 1);
      setSwitchWarning(true);
      if (attemptId) {
        void supabase.from('integrity_events').insert({
          attempt_id: attemptId,
          event_type: 'WINDOW_SWITCH',
          occurred_at: new Date(now).toISOString(),
        }).then(({ error }) => {
          if (error) console.error('integrity event save failed', error);
        });
      }
    };
    document.addEventListener('visibilitychange', onSwitch);
    window.addEventListener('blur', onSwitch);
    return () => {
      document.removeEventListener('visibilitychange', onSwitch);
      window.removeEventListener('blur', onSwitch);
    };
  }, [isExamMode, preStart, submitting, showThankYou, attemptId]);

  // beforeunload warning in exam mode
  useEffect(() => {
    if (!isExamMode || preStart || showThankYou) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isExamMode, preStart, showThankYou]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF]">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFF] p-4">
        <AlertCircle className="h-10 w-10 text-error" />
        <p className="text-navy-700">{error || t('exam.loadError')}</p>
        <Button variant="outline" onClick={() => navigate('/mocks')}>{t('exam.backToMocks')}</Button>
      </div>
    );
  }

  if (data.attempt.status !== 'IN_PROGRESS') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFF] p-4">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="text-navy-700">{t('exam.alreadySubmitted')}</p>
        <Button variant="primary" onClick={() => navigate(`/results/${attemptId}`)}>{t('exam.viewResults')}</Button>
      </div>
    );
  }

  // Pre-start flow
  if (preStart) {
    return (
      <PreStartFlow
        examData={data}
        candidateName={profile?.full_name || profile?.email || 'Student'}
        onStart={() => {
          const startedAt = new Date();
          setPreStart(false);
          questionStartRef.current = startedAt.getTime();
          setQuestionStartedAt(startedAt);
          setQuestionElapsed(0);
          if (isExamMode) requestFullscreen();
        }}
      />
    );
  }

  // Thank-you screen
  if (showThankYou) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#FAFAFF] to-[#F5F3FF] p-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-govt-100 shadow-lg shadow-govt-200 animate-scale-in">
          <CheckCircle2 className="h-12 w-12 text-govt-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy-900">{t('exam.submittedTitle')}</h1>
          <p className="mt-2 text-sm text-navy-500">{t('exam.submittedDesc')}</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => navigate(`/results/${attemptId}`)} className="animate-slide-up">
          {t('exam.continueToResults')}
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-navy-400">{t('app.independent')}</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAns = answers[currentQ.id];
  const currentQuestionTime = (currentAns?.timeSpent ?? 0) + questionElapsed;
  const isNumerical = currentQ.type === 'NUMERICAL';
  const currentCorrect = isNumerical ? numCorrect : mcqCorrect;
  const currentWrong = isNumerical ? numWrong : mcqWrong;

  const counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 };
  for (const q of questions) {
    const s = getPaletteStatus(q.id);
    if (s === 'answered') counts.answered++;
    else if (s === 'not-answered') counts.notAnswered++;
    else if (s === 'not-visited') counts.notVisited++;
    else if (s === 'marked') counts.marked++;
    else if (s === 'answered-marked') counts.answeredMarked++;
  }

  const legendRows = [
    { status: 'not-visited' as const, label: t('exam.notVisited'), count: counts.notVisited },
    { status: 'not-answered' as const, label: t('exam.notAnswered'), count: counts.notAnswered },
    { status: 'answered' as const, label: t('exam.answered'), count: counts.answered },
    { status: 'marked' as const, label: t('exam.markedForReview'), count: counts.marked },
    { status: 'answered-marked' as const, label: t('exam.answeredMarked'), count: counts.answeredMarked },
  ];

  const paletteGrid = (
    <div className="grid grid-cols-5 gap-2">
      {paletteIndices.map((qIdx) => {
        const q = questions[qIdx];
        const status = getPaletteStatus(q.id);
        return (
          <button
            key={q.id}
            onClick={() => { navigateTo(qIdx); setShowMobilePalette(false); }}
            className={cn(
              'relative flex h-11 w-11 items-center justify-center text-xs font-bold transition-[color,background-color,border-color,box-shadow]',
              paletteShapeFor(status),
              qIdx === currentIdx && 'ring-2 ring-govt-600 ring-offset-1',
            )}
          >
            {qIdx + 1}
            {status === 'answered-marked' && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4CAF50] ring-2 ring-white">
                <Check className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Per-section counts for submit summary
  const summaryRows = subjectGroups.map((sg) => {
    const sectionA = sg.indices.filter((i) => questions[i].type === 'MCQ');
    const sectionB = sg.indices.filter((i) => questions[i].type === 'NUMERICAL');
    return { subject: sg.name, sectionA, sectionB };
  });

  const watermark = (data.attempt.watermark_snapshot as Record<string, unknown> | null) || {};
  const watermarkEnabled = watermark.enabled !== false;
  const watermarkText = `Candidate ID ${(attemptId || '').slice(0, 8).toUpperCase()}`;
  const watermarkOpacity = typeof watermark.opacity === 'number' ? Math.min(0.1, Math.max(0.03, watermark.opacity)) : 0.06;
  const watermarkPosition = watermark.layout === 'SINGLE' ? 'exam-watermark-single' : 'exam-watermark-diagonal';
  const watermarkCount = watermark.layout === 'SINGLE' ? 1 : 12;

  return (
    <div ref={containerRef} className="relative flex h-screen flex-col overflow-hidden bg-[#FAFAFF]">
      {watermarkEnabled && <div className={cn('pointer-events-none absolute inset-0 z-20 overflow-hidden', watermarkPosition)} aria-hidden>
        {Array.from({ length: watermarkCount }, (_, index) => <span key={index} style={{ opacity: watermarkOpacity }}>{watermarkText}</span>)}
      </div>}
      {/* NTA-style candidate header */}
      <header className="relative z-30 flex min-h-[68px] shrink-0 items-center justify-between border-b border-[#E5E4F2] bg-white px-4 py-2 shadow-sm transition-shadow">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo
            to="/dashboard"
            variant="workspace"
            tone="light"
            iconSrc="/images/mock-ninja-icon-transparent.png"
            iconClassName=""
            className="hidden origin-left scale-[0.7] sm:block"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-navy-900 sm:text-base">{data.mock_test.title}</p>
            <p className="truncate text-xs text-navy-500">{data.mock_test.mode === 'EXAM' ? 'JEE Main pattern' : 'Practice mode'} · {questions.length} questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors sm:px-3 sm:py-2',
            timeLeft < 0 ? 'bg-emerald-50' : timeLeft < 300 ? 'bg-red-50' : timeLeft < 900 ? 'bg-amber-50' : 'bg-govt-50',
          )}>
            <Clock className={cn(
              'h-5 w-5',
              timeLeft < 0 ? 'text-emerald-700' : timeLeft < 300 ? 'text-red-600' : timeLeft < 900 ? 'text-amber-600' : 'text-govt-700',
            )} />
            <div>
              <p className="text-2xs font-medium text-navy-500">{timeLeft < 0 ? 'Mode' : 'Time Left'}</p>
              {timeLeft < 0 ? (
                <p className="font-mono text-lg font-bold text-emerald-700">Untimed</p>
              ) : (
                <p className={cn('font-mono text-lg font-bold tabular-nums', timeLeft < 300 ? 'text-red-600' : timeLeft < 900 ? 'text-amber-600' : 'text-govt-900')}>
                  {formatTime(timeLeft)}
                </p>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-govt-100 text-sm font-bold text-govt-700">
              {(profile?.full_name?.trim() || profile?.email?.trim() || 'Student').charAt(0).toUpperCase()}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-navy-900">{profile?.full_name || 'Student'}</p>
              <p className="text-2xs text-navy-500">Candidate</p>
            </div>
          </div>
          <button onClick={() => setShowInstructions(true)} className="tap-target inline-flex items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-100" title="Exam instructions">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Subject + section tabs */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#E5E4F2] bg-white px-4 py-2">
        {subjectGroups.map((g, i) => (
          <button
            key={g.name}
            onClick={() => navigateTo(g.indices[0])}
            className={cn(
              'tap-target rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 sm:text-base',
              i === activeSubjectIdx ? 'bg-govt-700 text-white' : 'bg-[#F5F3FF] text-navy-600 hover:bg-[#F5F3FF]',
            )}
          >
            {g.name}
          </button>
        ))}
        {sectionGroups.length > 1 && (
          <div className="ml-2 flex items-center gap-1.5 border-l border-[#E5E4F2] pl-2">
            {sectionGroups.map((s, i) => (
              <button
                key={s.name}
                onClick={() => navigateTo(s.indices[0])}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                  i === activeSectionIdx ? 'bg-navy-900 text-white' : 'text-navy-500 hover:bg-[#F5F3FF]',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowScratchpad(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E4F2] px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:bg-[#F5F3FF]"
          >
            {t('exam.scratchpad')}
          </button>
          <button
            onClick={() => setShowQuestionPaper(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E4F2] px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:bg-[#F5F3FF]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('exam.questionPaper')}</span>
          </button>
          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E4F2] px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:bg-[#F5F3FF]"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('exam.instructions')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - candidate info */}
        <aside className="hidden w-[180px] shrink-0 flex-col border-r border-[#E5E4F2] bg-white p-3 lg:flex">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-govt-100 text-govt-700 ring-2 ring-govt-50">
              <GraduationCap className="h-8 w-8" />
            </div>
            <p className="mt-2 text-xs font-medium text-navy-700">{profile?.full_name || 'Candidate'}</p>
          </div>
          <div className="border-t border-[#E5E4F2] pt-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-navy-400">{t('exam.subjectSection')}</p>
            {subjectGroups.map((g, i) => (
              <button
                key={g.name}
                onClick={() => navigateTo(g.indices[0])}
                className={cn(
                  'mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors',
                  i === activeSubjectIdx ? 'bg-govt-50 font-medium text-govt-700' : 'text-navy-600 hover:bg-[#F5F3FF]',
                )}
              >
                <span>{g.name}</span>
                <span className="text-navy-400">{g.indices.length}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center - question area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Question content */}
          <div className="flex-1 overflow-y-auto bg-[#FAFAFF] p-4 md:p-6">
            <div className="mx-auto w-full max-w-3xl">
              {/* NTA-style question metadata */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-govt-100 bg-white px-4 py-3 shadow-sm transition-[box-shadow] hover:shadow-card">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-navy-900">{t('exam.question')} No. {currentIdx + 1}</span>
                  <span className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    isNumerical
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-govt-200 bg-govt-50 text-govt-700',
                  )}>
                    {isNumerical ? 'Section B' : 'Section A'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-navy-600">
                  <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1">
                    <span className="text-navy-500">{t('exam.marksCorrect')}:</span>
                    <strong className="text-emerald-700">+{currentCorrect}</strong>
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1">
                    <span className="text-navy-500">{t('exam.negativeMarks')}:</span>
                    <strong className="text-red-600">{currentWrong}</strong>
                  </span>
                  <span className="hidden items-center gap-1 rounded-md bg-navy-50 px-2 py-1 sm:flex">
                    <span className="text-navy-500">{t('exam.questionType')}:</span>
                    <strong className="text-navy-700">{isNumerical ? t('exam.numericalValue') : 'MCQ'}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-govt-700">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    <strong className="font-mono tabular-nums">{formatTime(currentQuestionTime)}</strong>
                  </span>
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-xl border border-[#E5E4F2] bg-white p-5 shadow-sm transition-shadow hover:shadow-card md:p-7">
                <div className="mb-4 flex items-center justify-between border-b border-[#E5E4F2] pb-3 text-xs">
                  <span className="font-medium text-navy-600">Question {currentIdx + 1} of {questions.length}</span>
                  <span className="flex items-center gap-1 font-medium text-govt-700">
                    <Clock className="h-3 w-3" />
                    {formatTime(currentQuestionTime)}
                  </span>
                </div>
                {/* Question statement with enhanced typography */}
                <div className="mb-6 text-navy-900">
                  <div className="prose-exam">
                    <MathTex display>{currentQ.statement_tex}</MathTex>
                  </div>
                </div>

                {currentQ.type === 'MCQ' && currentQ.options_json ? (
                  <div className="space-y-2.5">
                    {currentQ.options_json.map((opt, optIdx) => {
                      const selectedAns = currentAns?.answer as { option?: string } | null;
                      const isSelected = selectedAns?.option === opt.id;
                      const labelChar = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => selectAnswer({ option: opt.id })}
                          className={cn(
                            'group/opt flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors duration-200',
                            isSelected
                              ? 'border-govt-500 bg-govt-50 shadow-sm'
                              : 'border-[#E5E4F2] bg-white hover:border-govt-300 hover:bg-govt-50/30',
                          )}
                        >
                          <span className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                            isSelected
                              ? 'border-govt-600 bg-govt-600 text-white scale-110'
                              : 'border-[#E5E4F2] bg-white text-navy-600 group-hover/opt:border-govt-300',
                          )}>
                            {labelChar}
                          </span>
                          <span className="pt-0.5 text-sm leading-relaxed text-navy-900">
                            <MathTex>{opt.text}</MathTex>
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-govt-600 animate-scale-in" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                      <p className="text-sm font-medium text-amber-800">{t('exam.useKeypad')}</p>
                      <p className="mt-0.5 text-xs text-amber-600">{t('exam.usePaperRough')}</p>
                    </div>
                    <NumericalKeypad
                      value={currentAns?.answer ? String((currentAns.answer as { value?: number | string })?.value ?? '') : ''}
                      onChange={(val) => {
                        const numVal = val === '' || val === '-' ? null : parseFloat(val);
                        selectAnswer({ value: numVal });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E5E4F2] bg-white px-3 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <button
                onClick={markReviewAndNext}
                className="flex items-center gap-1.5 rounded-lg border border-govt-600 px-3 py-2 text-xs font-medium text-govt-700 transition-[color,background-color,border-color,box-shadow] hover:bg-govt-600 hover:text-white hover:shadow-sm md:text-sm tap-target"
              >
                <Flag className="h-3.5 w-3.5" />
                {t('exam.markReviewNext')}
              </button>
              <button
                onClick={clearResponse}
                className="rounded-lg border border-[#E5E4F2] px-3 py-2 text-xs font-medium text-navy-600 transition-[background-color,box-shadow] hover:bg-[#FAFAFF] hover:shadow-sm md:text-sm tap-target"
              >
                {t('exam.clearResponse')}
              </button>
              <BookmarkButton
                questionId={currentQ.id}
                attemptId={attemptId}
                isBookmarked={bookmarkedIds?.has(currentQ.id) ?? false}
              />
              <button
                onClick={() => navigate(`/report-question?attemptId=${attemptId}&questionId=${currentQ.id}&mockTestId=${data.mock_test.id}`, {
                  state: { questionNumber: currentIdx + 1, statement: currentQ.statement_tex, mockTitle: data.mock_test.title },
                })}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 transition-[background-color,box-shadow] hover:bg-amber-50 hover:shadow-sm md:text-sm tap-target"
                title="Report this question"
              >
                <FileWarning className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Report</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {savedIndicator && (
                <span className="hidden items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 sm:flex animate-fade-in">
                  <CheckCircle2 className="h-3 w-3" /> {t('exam.saved')}
                </span>
              )}
              <button
                onClick={() => navigateTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 rounded-lg border border-[#E5E4F2] px-3 py-2 text-xs font-medium text-navy-600 transition-[background-color,opacity] hover:bg-[#FAFAFF] disabled:opacity-30 disabled:hover:bg-transparent md:text-sm tap-target"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('exam.previous')}
              </button>
              <button
                onClick={() => navigateTo(currentIdx + 1)}
                disabled={currentIdx === questions.length - 1}
                className="flex items-center gap-1 rounded-lg border border-[#E5E4F2] px-3 py-2 text-xs font-medium text-navy-600 transition-[background-color,opacity] hover:bg-[#FAFAFF] disabled:opacity-30 disabled:hover:bg-transparent md:text-sm tap-target"
              >
                {t('exam.next')}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={saveAndNext}
                className="flex items-center gap-1 rounded-lg bg-govt-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-[background-color,box-shadow] hover:bg-govt-700 hover:shadow-md md:text-sm tap-target"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('exam.saveNext')}
              </button>
            </div>
          </div>
        </main>

        {/* Right sidebar - question palette */}
        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-[#E5E4F2] bg-white p-3 xl:flex">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-govt-100 text-xs font-bold text-govt-700">
              {(profile?.full_name?.trim() || profile?.email?.trim() || 'Student').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-navy-700">{profile?.full_name || 'Candidate'}</span>
          </div>
          <PaletteLegend rows={legendRows} />
          <div className="mb-2 mt-3">
            <p className="mb-1 text-xs font-semibold text-navy-900">
              {subjectGroups[activeSubjectIdx]?.name} — {sectionGroups[activeSectionIdx]?.name || 'All'}
            </p>
          </div>
          <h3 className="mb-2 text-sm font-bold text-navy-900">{t('exam.chooseQuestion')}</h3>
          <div className="flex-1 overflow-y-auto">{paletteGrid}</div>
          <Button variant="primary" fullWidth onClick={() => setShowSubmitConfirm(true)} className="mt-3">
            {t('exam.submit')}
          </Button>
        </aside>
      </div>

      {/* Footer disclaimer */}
      <div className="shrink-0 border-t border-[#E5E4F2] bg-white py-1.5 text-center">
        <p className="text-2xs text-navy-400">{t('app.independent')}</p>
      </div>

      {/* Window switch warning */}
      {switchWarning && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="switch-warning-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-white p-6 text-navy-900 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">{t('exam.warning')}</p>
            <h2 id="switch-warning-title" className="mt-1 text-xl font-bold">{t('exam.windowSwitchTitle')}</h2>
            <p className="mt-2 text-sm text-navy-600">{t('exam.windowSwitchDesc', { count: switchCount })}</p>
            <Button fullWidth className="mt-5" onClick={() => { setSwitchWarning(false); void requestFullscreen(); }}>{t('exam.returnToExam')}</Button>
          </div>
        </div>
      )}

      {/* Integrity notice */}
      {integrityNotice && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-navy-900/90 px-4 py-2 text-sm text-white shadow-lg animate-fade-in xl:bottom-4">
          {integrityNotice}
        </div>
      )}

      {/* Timer warning banner */}
      {timeWarning && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-scale-in">
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-600/95 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur">
            <Clock className="h-5 w-5 animate-pulse" />
            {timeWarning}
          </div>
        </div>
      )}

      {/* Mobile palette FAB */}
      <button
        onClick={() => setShowMobilePalette(true)}
        className="fixed bottom-[70px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-govt-700 text-white shadow-lg xl:hidden"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {/* Mobile palette drawer */}
      {showMobilePalette && (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setShowMobilePalette(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">{t('exam.chooseQuestion')}</h3>
              <button onClick={() => setShowMobilePalette(false)}>
                <X className="h-5 w-5 text-navy-500" />
              </button>
            </div>
            <PaletteLegend rows={legendRows} />
            <div className="my-3 flex-1 overflow-y-auto">{paletteGrid}</div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => { setShowMobilePalette(false); setShowSubmitConfirm(true); }}
            >
              {t('exam.submit')}
            </Button>
          </div>
        </div>
      )}

      {/* Question Paper panel */}
      {showScratchpad && <Scratchpad onClose={() => setShowScratchpad(false)} />}

      {showQuestionPaper && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setShowQuestionPaper(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E4F2] p-4">
              <h3 className="text-sm font-bold text-navy-900">{t('exam.questionPaper')}</h3>
              <button onClick={() => setShowQuestionPaper(false)}>
                <X className="h-5 w-5 text-navy-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {subjectGroups.map((sg) => (
                <div key={sg.name} className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-navy-900">{sg.name}</h4>
                  {sg.indices.map((qIdx) => (
                    <button
                      key={questions[qIdx].id}
                      onClick={() => { navigateTo(qIdx); setShowQuestionPaper(false); }}
                      className={cn(
                        'mb-2 w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-[#FAFAFF]',
                        qIdx === currentIdx ? 'border-govt-400 bg-govt-50' : 'border-[#E5E4F2]',
                      )}
                    >
                      <span className="font-bold text-navy-900">Q{qIdx + 1}.</span>{' '}
                      <span className="text-navy-600">
                        <MathTex>{questions[qIdx].statement_tex.slice(0, 80) + (questions[qIdx].statement_tex.length > 80 ? '…' : '')}</MathTex>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      {showInstructions && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInstructions(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-navy-900">{t('exam.generalInstructions')}</h3>
              <button onClick={() => setShowInstructions(false)}>
                <X className="h-5 w-5 text-navy-500" />
              </button>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-navy-700">
              <p>{t('exam.instrTimer1')}</p>
              <p>{t('exam.instrAnswering1')}</p>
              <p>{t('exam.instrMarkEval')}</p>
              <p>{t('exam.instrRule1')}</p>
              <p>{t('exam.instrRule3')}</p>
              <p>{t('exam.instrDisclaimer')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation modal - NTA Exam Summary */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-navy-900">{t('exam.examSummary')}</h2>
            </div>
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E4F2] text-xs text-navy-500">
                    <th className="py-2 text-left">{t('exam.subjectSection')}</th>
                    <th className="py-2 text-center">{t('exam.totalQuestions')}</th>
                    <th className="py-2 text-center">{t('exam.answered')}</th>
                    <th className="py-2 text-center">{t('exam.notAnswered')}</th>
                    <th className="py-2 text-center">{t('exam.markedForReview')}</th>
                    <th className="py-2 text-center">{t('exam.answeredMarked')}</th>
                    <th className="py-2 text-center">{t('exam.notVisited')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => {
                    const allIndices = [...row.sectionA, ...row.sectionB];
                    const getStats = (indices: number[]) => {
                      let a = 0, na = 0, nv = 0, m = 0, am = 0;
                      for (const i of indices) {
                        const s = getPaletteStatus(questions[i].id);
                        if (s === 'answered') a++;
                        else if (s === 'not-answered') na++;
                        else if (s === 'not-visited') nv++;
                        else if (s === 'marked') m++;
                        else if (s === 'answered-marked') am++;
                      }
                      return { a, na, nv, m, am };
                    };
                    const stats = getStats(allIndices);
                    return (
                      <tr key={row.subject} className="border-b border-[#E5E4F2]">
                        <td className="py-2 font-medium text-navy-900">{row.subject}</td>
                        <td className="py-2 text-center">{allIndices.length}</td>
                        <td className="py-2 text-center text-emerald-600">{stats.a}</td>
                        <td className="py-2 text-center text-red-500">{stats.na}</td>
                        <td className="py-2 text-center text-govt-700">{stats.m}</td>
                        <td className="py-2 text-center text-govt-700">{stats.am}</td>
                        <td className="py-2 text-center text-navy-400">{stats.nv}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">{t('exam.submitConfirmMsg')}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                {t('exam.no')}
              </Button>
              <Button
                variant="primary"
                loading={submitting}
                onClick={() => { setShowSubmitConfirm(false); handleSubmitFinal(); }}
              >
                {t('exam.yes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Time up overlay */}
      {showTimeUp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/80 backdrop-blur-sm">
          <div className="rounded-xl bg-white p-8 text-center shadow-2xl animate-scale-in">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-navy-900">{t('exam.timeUp')}</h2>
            <p className="mt-1 text-sm text-navy-500">{t('exam.timeUpDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
