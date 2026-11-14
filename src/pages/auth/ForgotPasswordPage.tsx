import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <PublicLayout>
      <div className="auth-page flex min-h-[calc(100vh-4rem)]">
        <div className="auth-brand-panel hidden w-1/2 items-center justify-center p-12 lg:flex">
          <div className="max-w-md text-white">
            <div className="mb-6">
              <BrandLogo variant="public" />
            </div>
            <h2 className="mb-3 text-3xl font-bold leading-tight">Forgot your password?</h2>
            <p className="mb-8 text-govt-200">
              Enter your email and we'll send you a secure link to reset it. You'll be back to practising in no time.
            </p>
          </div>
        </div>

        <div className="auth-form-panel flex w-full items-center justify-center p-6 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <BrandLogo variant="public" />
            </div>

            <Card className="auth-form-card">
              <CardContent className="p-6 sm:p-8">
                {sent ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-white">Check your email</h1>
                    <p className="mb-6 text-sm text-navy-300">
                      If an account exists for <span className="font-semibold text-white">{email}</span>, we've sent a password reset link. Click the link in the email to set a new password.
                    </p>
                    <Link to="/login">
                      <Button variant="outline" fullWidth>
                        <ArrowLeft className="h-4 w-4" /> Back to login
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <h1 className="mb-1 text-2xl font-bold text-white">Reset your password</h1>
                    <p className="mb-6 text-sm text-navy-300">
                      Enter the email associated with your account and we'll send you a reset link.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-navy-200">
                          Email
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

                      <Button type="submit" variant="primary" fullWidth loading={loading}>
                        Send reset link
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-navy-400">
                      Remembered your password?{' '}
                      <Link to="/login" className="font-medium text-vibe-300 hover:text-vibe-200">
                        Back to login
                      </Link>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
