import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertCircle, ChevronRight, Monitor, ShieldCheck, TrendingUp, Phone, Gift, User } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { BrandLogo } from '@/components/common/BrandLogo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useEmailOtpEnabled } from '@/lib/site-settings';

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: emailOtpEnabled } = useEmailOtpEnabled();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (phone && !/^\+?[\d\s-]{10,15}$/.test(phone.trim())) {
      setError('Please enter a valid phone number (10-15 digits).');
      return;
    }

    setLoading(true);

    const signUpData: Record<string, unknown> = { full_name: fullName.trim() };
    if (phone.trim()) signUpData.phone = phone.trim();
    if (referralCode.trim()) signUpData.referral_code = referralCode.trim().toUpperCase();

    const { error: signUpError, data: signUpResult } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: signUpData },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Store referral code and phone in profiles if user was created
    if (signUpResult.user) {
      try {
        const updates: Record<string, unknown> = { full_name: fullName.trim() };
        if (phone.trim()) updates.phone = phone.trim();
        if (referralCode.trim()) updates.referral_code_used = referralCode.trim().toUpperCase();
        await supabase.from('profiles').update(updates).eq('id', signUpResult.user.id);
      } catch {
        // Non-fatal — profile will be updated during onboarding
      }
    }

    setLoading(false);

    // If admin has enabled email OTP, redirect to the verification page.
    // Otherwise, go straight to onboarding.
    if (emailOtpEnabled) {
      navigate('/verify-email', {
        replace: true,
        state: { email: normalizedEmail, password },
      });
    } else {
      navigate('/onboarding', { replace: true });
    }
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
                <h1 className="mb-1 text-2xl font-bold text-white">{t('auth.signupTitle')}</h1>
                <p className="mb-6 text-sm text-navy-300">{t('auth.signupSubtitle')}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-sm font-medium text-navy-200">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                      <input
                        id="fullName"
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="auth-input"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

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
                    <label htmlFor="phone" className="text-sm font-medium text-navy-200">
                      Phone Number <span className="text-navy-500">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="auth-input"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <p className="text-xs text-navy-400">For exam notifications and OTP verification</p>
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
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        placeholder="••••••••"
                      />
                    </div>
                    <p className="text-xs text-navy-400">{t('auth.passwordHint')}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="referral" className="text-sm font-medium text-navy-200">
                      Referral Code <span className="text-navy-500">(optional — 20% off your first payment)</span>
                    </label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                      <input
                        id="referral"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="auth-input"
                        placeholder="ABCD1234"
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="primary" fullWidth loading={loading}>
                    {t('common.signup')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3 text-xs text-navy-400">
                  <span className="h-px flex-1 bg-current opacity-20" />
                  or
                  <span className="h-px flex-1 bg-current opacity-20" />
                </div>
                <GoogleSignInButton onError={setError} />

                <p className="mt-6 text-center text-sm text-navy-400">
                  {t('auth.haveAccount')}{' '}
                  <Link to="/login" className="font-medium text-govt-300 hover:text-govt-200">
                    {t('common.login')}
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
