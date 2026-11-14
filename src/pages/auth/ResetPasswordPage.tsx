import { useState, type FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
  };

  return (
    <PublicLayout>
      <div className="auth-page flex min-h-[calc(100vh-4rem)]">
        <div className="auth-brand-panel hidden w-1/2 items-center justify-center p-12 lg:flex">
          <div className="max-w-md text-white">
            <div className="mb-6">
              <BrandLogo variant="public" />
            </div>
            <h2 className="mb-3 text-3xl font-bold leading-tight">Set a new password</h2>
            <p className="mb-8 text-govt-200">
              Choose a strong password to keep your account secure. Your new password takes effect immediately.
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
                {done ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-white">Password updated</h1>
                    <p className="text-sm text-navy-300">
                      Your password has been changed successfully. Redirecting you to your dashboard...
                    </p>
                  </div>
                ) : (
                  <>
                    <h1 className="mb-1 text-2xl font-bold text-white">Set a new password</h1>
                    <p className="mb-6 text-sm text-navy-300">
                      Enter your new password below. Make it at least 8 characters.
                    </p>

                    {!sessionReady && (
                      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Click the reset link in your email to activate this page, then set your new password.</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="password" className="text-sm font-medium text-navy-200">
                          New password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="auth-input pr-10"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="confirm" className="text-sm font-medium text-navy-200">
                          Confirm password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                          <input
                            id="confirm"
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="auth-input"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!sessionReady}>
                        Update password
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-navy-400">
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
