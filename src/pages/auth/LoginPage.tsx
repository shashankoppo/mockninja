import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertCircle, ChevronRight, Monitor, ShieldCheck, TrendingUp, KeyRound } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { BrandLogo } from '@/components/common/BrandLogo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useEmailOtpEnabled } from '@/lib/site-settings';

async function startTotpChallenge(): Promise<{ factorId: string; challengeId: string } | { error: string }> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: listError.message };
  const totpFactor = factors?.totp.find((f) => f.status === 'verified');
  if (!totpFactor) return { error: 'Two-step sign-in is required but no verified method was found.' };
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
  if (challengeError || !challenge) {
    return { error: challengeError?.message ?? 'Could not start two-step verification.' };
  }
  return { factorId: totpFactor.id, challengeId: challenge.id };
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';
  const { mfaPending, refreshMfaStatus, signOut } = useAuth();
  const { data: emailOtpEnabled } = useEmailOtpEnabled();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (!mfaPending) return;
    let cancelled = false;
    startTotpChallenge().then((result) => {
      if (cancelled) return;
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setMfaFactorId(result.factorId);
      setMfaChallengeId(result.challengeId);
    });
    return () => {
      cancelled = true;
    };
  }, [mfaPending]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (signInError) {
      setLoading(false);
      // If email confirmation is enabled and the user hasn't verified yet,
      // redirect them to the verification page instead of showing an error.
      const msg = signInError.message.toLowerCase();
      if (emailOtpEnabled && msg.includes('email') && (msg.includes('not confirmed') || msg.includes('not verified'))) {
        navigate('/verify-email', {
          replace: true,
          state: { email: normalizedEmail, password },
        });
        return;
      }
      setError(signInError.message);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);
    if (aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
      await refreshMfaStatus();
      return;
    }
    navigate(from, { replace: true });
  };

  const handleMfaVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !mfaChallengeId) {
      setError('Two-step verification could not start. Go back and sign in again.');
      return;
    }
    const code = mfaCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code,
    });
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }
    await refreshMfaStatus();
    setLoading(false);
    navigate(from, { replace: true });
  };

  const highlights = [
    { icon: Monitor, text: t('landing.feature1Title') },
    { icon: TrendingUp, text: t('landing.feature2Title') },
    { icon: ShieldCheck, text: t('landing.dataTeaserTitle') },
  ];

  return (
    <PublicLayout>
      <div className="auth-page flex min-h-[calc(100vh-4rem)]">
        {/* Left side - branding */}
        <div className="auth-brand-panel hidden w-1/2 items-center justify-center p-12 lg:flex">
          <div className="max-w-md text-white">
            <div className="mb-6">
              <BrandLogo variant="public" />
            </div>
            <h2 className="mb-3 text-3xl font-bold leading-tight">{t('landing.heroTitle')}</h2>
            <p className="mb-8 text-govt-200">{t('landing.heroSubtitle')}</p>
            <div className="space-y-4">
              {highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-white/10 p-3 backdrop-blur">
                    <Icon className="h-5 w-5 text-govt-300" />
                    <span className="text-sm font-medium">{h.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side - form */}
        <div className="auth-form-panel flex w-full items-center justify-center p-6 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <BrandLogo variant="public" />
            </div>

            <Card className="auth-form-card">
              <CardContent className="p-6 sm:p-8">
                <h1 className="mb-1 text-2xl font-bold text-white">{t('auth.loginTitle')}</h1>
                <p className="mb-6 text-sm text-navy-300">{t('auth.loginSubtitle')}</p>

                {mfaPending ? (
                  <form onSubmit={handleMfaVerify} className="space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-lg border border-govt-500/20 bg-govt-500/5 p-3 text-sm text-navy-200">
                      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-govt-300" />
                      <span>Enter the 6-digit code from your authenticator app.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="mfa-code" className="text-sm font-medium text-navy-200">
                        Verification code
                      </label>
                      <input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoComplete="one-time-code"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="auth-input tracking-[0.3em] text-center font-mono"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>

                    <Button type="submit" variant="primary" fullWidth loading={loading}>
                      Verify and sign in
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setMfaFactorId(null);
                        setMfaChallengeId(null);
                        setMfaCode('');
                        setError(null);
                        void signOut();
                      }}
                      className="w-full text-center text-xs font-medium text-navy-400 hover:text-white"
                    >
                      Back to sign in
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-navy-200">
                        {t('auth.email')}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                        <input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="auth-input"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="text-sm font-medium text-navy-200">
                        {t('auth.password')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                        <input
                          id="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="auth-input"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-xs font-medium text-govt-300 hover:text-govt-200">
                        Forgot password?
                      </Link>
                    </div>

                    <Button type="submit" variant="primary" fullWidth loading={loading}>
                      {t('common.login')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </form>
                )}

                <div className="my-5 flex items-center gap-3 text-xs text-navy-400">
                  <span className="h-px flex-1 bg-current opacity-20" />
                  or
                  <span className="h-px flex-1 bg-current opacity-20" />
                </div>
                <GoogleSignInButton onError={setError} />

                <p className="mt-6 text-center text-sm text-navy-400">
                  {t('auth.noAccount')}{' '}
                  <Link to="/signup" className="font-medium text-govt-300 hover:text-govt-200">
                    {t('common.signup')}
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
