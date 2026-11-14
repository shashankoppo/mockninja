import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Calendar, Gift, ShieldCheck, AlertCircle, ChevronRight, Check,
  Sparkles, PartyPopper, BookOpen, Target, Zap, GraduationCap, ArrowLeft,
  Mail, Users, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Confetti } from '@/components/common/Confetti';

const STEPS_META: { icon: LucideIcon; color: string; ring: string; glow: string }[] = [
  { icon: User, color: 'from-govt-500/30 to-emerald-500/20 text-govt-300', ring: 'ring-govt-400/20', glow: 'bg-govt-500/20' },
  { icon: Gift, color: 'from-amber-500/30 to-orange-500/20 text-amber-300', ring: 'ring-amber-400/20', glow: 'bg-amber-500/20' },
  { icon: ShieldCheck, color: 'from-emerald-500/30 to-teal-500/20 text-emerald-300', ring: 'ring-emerald-400/20', glow: 'bg-emerald-500/20' },
];

const SIDE_FEATURES: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  { icon: BookOpen, title: 'Realistic mock tests', desc: 'NTA-style scoring', color: 'text-govt-300 bg-govt-500/15' },
  { icon: TrendingUp, title: 'Mastery tracking', desc: 'Earn belt levels', color: 'text-emerald-300 bg-emerald-500/15' },
  { icon: Zap, title: 'Daily practice', desc: 'Personalized sets', color: 'text-saffron-300 bg-saffron-500/15' },
  { icon: Target, title: 'Focus topics', desc: 'Target weak areas', color: 'text-govt-300 bg-govt-500/15' },
];

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [birthYear, setBirthYear] = useState('');
  const [entrySource, setEntrySource] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consentSent, setConsentSent] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [finished, setFinished] = useState(false);

  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - parseInt(birthYear, 10) : null;
  const isMinor = age !== null && age < 18;
  const totalSteps = isMinor ? 3 : 2;

  const goToStep = (s: number, dir: 'forward' | 'back') => {
    setDirection(dir);
    setError(null);
    setStep(s);
  };

  const persistAndFinish = async (savedFullName?: string, savedEntrySource?: string) => {
    const updates: Record<string, string | number | null> = {};
    if (savedFullName?.trim()) updates.full_name = savedFullName.trim();
    if (birthYear) updates.birth_year = parseInt(birthYear, 10);
    if (savedEntrySource) updates.entry_source = savedEntrySource;
    if (referralCode.trim()) updates.referral_code_used = referralCode.trim();

    if (Object.keys(updates).length > 0 && user) {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    }
    await refreshProfile();
    setFinished(true);
  };

  const handleSkip = async () => {
    setError(null);
    setLoading(true);
    await persistAndFinish(fullName, entrySource);
    setLoading(false);
  };

  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError(t('onboarding.nameRequired'));
      return;
    }
    const year = parseInt(birthYear, 10);
    if (isNaN(year) || year < 1980 || year > currentYear) {
      setError(t('onboarding.invalidYear'));
      return;
    }
    goToStep(2, 'forward');
  };

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const updates: Record<string, string | number | null> = {
      full_name: fullName.trim(),
      birth_year: parseInt(birthYear, 10),
    };
    if (entrySource) updates.entry_source = entrySource;
    if (referralCode.trim()) updates.referral_code_used = referralCode.trim();

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user!.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    if (isMinor) {
      goToStep(3, 'forward');
      setLoading(false);
    } else {
      await refreshProfile();
      setFinished(true);
      setLoading(false);
    }
  };

  const handleConsent = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ guardian_email: guardianEmail.trim() })
      .eq('id', user!.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { error: fnError } = await supabase.functions.invoke('guardian-consent', {
      body: JSON.stringify({ guardian_email: guardianEmail.trim() }),
    });

    setLoading(false);

    if (fnError) {
      setError(fnError.message);
      return;
    }

    setConsentSent(true);
    await refreshProfile();
    setFinished(true);
  };

  useEffect(() => {
    if (finished) {
      const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 4500);
      return () => clearTimeout(timer);
    }
  }, [finished, navigate]);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const inputClass =
    'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-[color,background-color,border-color,box-shadow] duration-300 focus:border-govt-400/60 focus:outline-none focus:ring-2 focus:ring-govt-400/30 focus:bg-white/[0.08] hover:border-white/25';

  const iconInputClass =
    'w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-[color,background-color,border-color,box-shadow] duration-300 focus:border-govt-400/60 focus:outline-none focus:ring-2 focus:ring-govt-400/30 focus:bg-white/[0.08] hover:border-white/25';

  const selectClass =
    'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white transition-[color,background-color,border-color,box-shadow] duration-300 focus:border-govt-400/60 focus:outline-none focus:ring-2 focus:ring-govt-400/30 focus:bg-white/[0.08] hover:border-white/25 cursor-pointer appearance-none';

  if (finished) {
    return <SuccessScreen fullName={fullName} t={t} navigate={navigate} />;
  }

  return (
    <div className="auth-page relative flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-transparent">
        <div className="container-app flex h-16 items-center justify-between gap-2">
          <BrandLogo to="/" variant="workspace" tone="dark" />
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-govt-300" />
            {t('onboarding.step1Desc')}
          </div>
        </div>
      </header>

      {/* Main two-panel layout */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 lg:py-12">
        <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">

          {/* Left: decorative panel (hidden on mobile) */}
          <div className="hidden lg:flex lg:w-[42%] flex-col justify-center animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 backdrop-blur-xl">
              <div className="relative">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-govt-500/30 to-govt-500/20 text-govt-200 ring-1 ring-govt-400/20 animate-float-icon">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  {t('onboarding.welcomeAboard')}, {profile?.email?.split('@')[0] || 'aspirant'}!
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-slate-400">
                  {t('onboarding.step1Desc')}
                </p>

                <div className="space-y-3">
                  {SIDE_FEATURES.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.title}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 backdrop-blur-sm transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06] animate-slide-in-right"
                        style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: 'both' }}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${f.color} transition-transform duration-300 hover:scale-110`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{f.title}</p>
                          <p className="text-xs text-slate-400">{f.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>Trusted by 10,000+ aspirants</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form panel */}
          <div className="flex flex-1 flex-col justify-center">
            {/* Progress indicator */}
            <div className="mb-8 flex items-center justify-center gap-1.5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
                const meta = STEPS_META[s - 1];
                const Icon = meta.icon;
                const isActive = step === s;
                const isDone = step > s;
                return (
                  <div key={s} className="flex items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-[transform,color,background-color,border-color,box-shadow] duration-500 ${
                        isActive
                          ? 'border-govt-400 bg-govt-500/20 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-110'
                          : isDone
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/15 bg-white/5 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="h-5 w-5 animate-check-pop" /> : <Icon className="h-5 w-5" />}
                    </div>
                    {s < totalSteps && (
                      <div className="relative mx-1.5 h-0.5 w-10 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`absolute inset-0 rounded-full transition-[width] duration-500 ${step > s ? 'bg-emerald-400/50 w-full' : 'w-0'}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Glass card */}
            <div className="auth-form-card rounded-3xl animate-card-glow">
              <div className="p-6 sm:p-8">
                {step === 1 && (
                  <StepShell key="step1" direction={direction} meta={STEPS_META[0]} title={t('onboarding.step1Title')} desc={t('onboarding.step1Desc')}>
                    <form onSubmit={handleStep1} className="space-y-5">
                      {error && <ErrorBanner message={error} />}
                      <Field label={t('onboarding.fullName')} delay={100}>
                        <input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder={t('onboarding.fullNamePlaceholder')} autoFocus />
                      </Field>
                      <Field label={t('onboarding.birthYear')} delay={160} hint={t('onboarding.birthYearHint')}>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input id="birthYear" type="number" required min="1980" max={currentYear} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={iconInputClass} placeholder="2008" />
                        </div>
                      </Field>
                      <Button type="submit" variant="primary" fullWidth className="animate-fade-in-up" style={{ animationDelay: '220ms' }}>
                        {t('common.start')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <SkipButton onClick={handleSkip} loading={loading} text={t('onboarding.skipSetup')} />
                    </form>
                  </StepShell>
                )}

                {step === 2 && (
                  <StepShell key="step2" direction={direction} meta={STEPS_META[1]} title={t('onboarding.step2Title')} desc={t('onboarding.step2Desc')}>
                    <form onSubmit={handleStep2} className="space-y-5">
                      {error && <ErrorBanner message={error} />}
                      <Field label={t('onboarding.entrySource')} delay={100}>
                        <div className="relative">
                          <select id="entrySource" value={entrySource} onChange={(e) => setEntrySource(e.target.value)} className={selectClass}>
                            <option value="" className="bg-[#191923] text-white">{t('onboarding.selectOption')}</option>
                            <option value="FRIEND" className="bg-[#191923] text-white">{t('onboarding.sourceFriend')}</option>
                            <option value="TEACHER" className="bg-[#191923] text-white">{t('onboarding.sourceTeacher')}</option>
                            <option value="YOUTUBE" className="bg-[#191923] text-white">{t('onboarding.sourceYoutube')}</option>
                            <option value="INSTAGRAM" className="bg-[#191923] text-white">{t('onboarding.sourceInstagram')}</option>
                            <option value="SEARCH" className="bg-[#191923] text-white">{t('onboarding.sourceSearch')}</option>
                            <option value="OTHER" className="bg-[#191923] text-white">{t('onboarding.sourceOther')}</option>
                          </select>
                          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                        </div>
                      </Field>
                      <Field label={t('onboarding.referralCode')} delay={160} hint={t('onboarding.referralOptional')}>
                        <input id="referralCode" type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className={inputClass} placeholder={t('onboarding.referralPlaceholder')} />
                      </Field>
                      <div className="flex gap-2.5 animate-fade-in-up" style={{ animationDelay: '220ms' }}>
                        <Button type="button" variant="outline" onClick={() => goToStep(1, 'back')}>
                          <ArrowLeft className="h-4 w-4" />
                          {t('common.back')}
                        </Button>
                        <Button type="submit" variant="primary" fullWidth loading={loading}>
                          {isMinor ? t('onboarding.next') : t('onboarding.finish')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <SkipButton onClick={handleSkip} loading={loading} text={t('onboarding.skipSetup')} />
                    </form>
                  </StepShell>
                )}

                {step === 3 && (
                  <StepShell key="step3" direction={direction} meta={STEPS_META[2]} title={t('onboarding.step3Title')} desc={t('onboarding.step3Desc')}>
                    {consentSent ? (
                      <div className="space-y-5 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 animate-check-pop">
                          <Check className="h-8 w-8 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-300">{t('onboarding.consentSent')}</p>
                        <Button variant="primary" onClick={() => setFinished(true)}>
                          {t('onboarding.goToDashboard')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleConsent} className="space-y-5">
                        {error && <ErrorBanner message={error} />}
                        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-4 text-sm text-amber-200/90 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          <span>{t('onboarding.consentNotice')}</span>
                        </div>
                        <Field label={t('onboarding.guardianEmail')} delay={160} hint={t('onboarding.guardianEmailHint')}>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input id="guardianEmail" type="email" required value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className={iconInputClass} placeholder="parent@example.com" />
                          </div>
                        </Field>
                        <div className="flex gap-2.5 animate-fade-in-up" style={{ animationDelay: '220ms' }}>
                          <Button type="button" variant="outline" onClick={() => goToStep(2, 'back')}>
                            <ArrowLeft className="h-4 w-4" />
                            {t('common.back')}
                          </Button>
                          <Button type="submit" variant="primary" fullWidth loading={loading}>
                            {t('onboarding.sendConsent')}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <SkipButton onClick={handleSkip} loading={loading} text={t('onboarding.skipForNow')} />
                      </form>
                    )}
                  </StepShell>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function StepShell({
  direction, meta, title, desc, children,
}: {
  direction: 'forward' | 'back';
  meta: { icon: LucideIcon; color: string; ring: string; glow: string };
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const Icon = meta.icon;
  return (
    <div className={`space-y-6 ${direction === 'forward' ? 'animate-step-in' : 'animate-step-in-reverse'}`}>
      <div className="flex items-start gap-4">
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.color} ring-1 ${meta.ring}`}>
          <Icon className="h-7 w-7 animate-fade-in-up" style={{ animationDelay: '60ms' }} />
          <div className={`absolute inset-0 rounded-2xl ${meta.glow} blur-xl opacity-50 -z-10`} />
        </div>
        <div className="pt-1">
          <h1 className="text-xl font-bold text-white animate-fade-in-up" style={{ animationDelay: '30ms' }}>{title}</h1>
          <p className="mt-1 text-sm text-slate-400 animate-fade-in-up" style={{ animationDelay: '60ms' }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label, hint, delay, children,
}: {
  label: string;
  hint?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <label className="text-sm font-medium text-slate-200">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SkipButton({ onClick, loading, text }: { onClick: () => void; loading: boolean; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full pt-1 text-center text-sm text-slate-500 transition-colors duration-200 hover:text-slate-300"
    >
      {text}
    </button>
  );
}

function SuccessScreen({ fullName, t, navigate }: { fullName: string; t: (k: string) => string; navigate: (path: string, opts?: { replace?: boolean }) => void }) {
  const firstName = fullName.trim().split(' ')[0] || 'there';
  return (
    <div className="auth-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <Confetti />
      <div className="relative z-10 w-full max-w-lg text-center animate-success-rise">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-govt-500/30 to-emerald-500/20 ring-1 ring-govt-400/30 animate-bounce-slow">
          <PartyPopper className="h-10 w-10 text-govt-300" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">{t('onboarding.welcomeAboard')}, {firstName}!</h1>
        <p className="mb-8 text-sm text-slate-400">{t('onboarding.setupComplete')}</p>

        <div className="auth-form-card mb-8 rounded-2xl p-6 text-left">
          <h2 className="mb-5 text-sm font-semibold text-slate-300">{t('onboarding.youAreReady')}</h2>
          <div className="space-y-3">
            <SummaryItem icon={BookOpen} label={t('onboarding.summaryMocks')} delay={200} />
            <SummaryItem icon={Target} label={t('onboarding.summaryFocus')} delay={320} />
            <SummaryItem icon={Zap} label={t('onboarding.summaryDaily')} delay={440} />
          </div>
        </div>

        <Button variant="primary" onClick={() => navigate('/dashboard', { replace: true })}>
          {t('onboarding.goToDashboard')}
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="mt-4 text-xs text-slate-500">{t('onboarding.autoRedirect')}</p>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, delay }: { icon: typeof BookOpen; label: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08] animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-govt-500/20 to-emerald-500/10 text-govt-300">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm text-slate-200">{label}</span>
      <Check className="ml-auto h-4 w-4 text-emerald-400" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/[0.08] p-3.5 text-sm text-red-300 animate-shake">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
