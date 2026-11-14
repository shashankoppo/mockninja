import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, Loader2, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useEmailOtpEnabled } from '@/lib/site-settings';

interface VerifyEmailLocationState {
  email?: string;
  password?: string;
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { data: emailOtpEnabled } = useEmailOtpEnabled();
  const navState = (location.state ?? {}) as VerifyEmailLocationState;

  // Prefer email from navigation state (passed from signup).
  // Fall back to the logged-in user's email if a session already exists
  // (e.g. email confirmation is OFF and signUp returned a session immediately).
  const email = navState.email ?? session?.user?.email ?? null;
  const password = navState.password ?? null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // If admin has disabled OTP, skip this page entirely.
    if (emailOtpEnabled === false) {
      navigate('/onboarding', { replace: true });
      return;
    }
    // If we have no email at all, the user arrived here directly — send them to signup.
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, emailOtpEnabled, navigate]);

  if (!email) return null;

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);

    // Verify the OTP code.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: 'email',
    });

    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }

    // If the user doesn't have a session yet (email confirmation was ON),
    // sign them in now that their email is verified.
    if (!session && password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (signInError) {
        setError('Email verified, but automatic sign-in failed. Please log in manually.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }
    } else {
      setLoading(false);
    }

    setVerified(true);
    toast.success('Email verified successfully!');
    setTimeout(() => navigate('/onboarding', { replace: true }), 1500);
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    toast.success('Verification code sent to your email.');
  };

  return (
    <div className="auth-page flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="public" />
        </div>

        <Card className="auth-form-card">
          <CardContent className="p-6 sm:p-8">
            {verified ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                  <Check className="h-8 w-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Email Verified!</h1>
                <p className="text-sm text-navy-300">Redirecting you to setup...</p>
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-navy-400" />
              </div>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-govt-500/15 ring-1 ring-govt-400/20">
                    <Mail className="h-7 w-7 text-govt-300" />
                  </div>
                  <h1 className="mb-1 text-2xl font-bold text-white">Verify your email</h1>
                  <p className="text-sm text-navy-300">
                    Enter the 6-digit code we sent to{' '}
                    <span className="font-semibold text-white">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium text-navy-200">
                      Verification code
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="auth-input text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>

                  <Button type="submit" variant="primary" fullWidth loading={loading}>
                    Verify email
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-5 flex flex-col items-center gap-3">
                  <p className="text-xs text-navy-400">Didn't receive a code?</p>
                  <Button variant="outline" size="sm" onClick={handleResend} loading={resending}>
                    <RefreshCw className="h-4 w-4" />
                    Resend code
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-navy-500">
          Wrong email?{' '}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/signup', { replace: true });
            }}
            className="font-medium text-govt-300 hover:text-govt-200"
          >
            Sign up again
          </button>
        </p>
      </div>
    </div>
  );
}
