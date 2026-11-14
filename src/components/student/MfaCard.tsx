import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Trash2, Smartphone, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400 tracking-[0.3em] text-center font-mono';

export function MfaCard() {
  const [loading, setLoading] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: statusError } = await supabase.auth.mfa.listFactors();
      if (statusError) {
        if (mounted) setError(statusError.message);
        return;
      }
      const totp = data.totp.find((f) => f.status === 'verified');
      if (mounted) setEnrolled(!!totp);
    })();
    return () => { mounted = false; };
  }, []);

  const startEnroll = async () => {
    setLoading(true);
    setError(null);
    setSecret(null);
    setVerifyCode('');
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setLoading(false);
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start MFA enrollment.');
      return;
    }
    setFactorId(data.id);
    setSecret(data.totp.secret);
  };

  const cancelEnroll = () => {
    setFactorId(null);
    setSecret(null);
    setVerifyCode('');
    setError(null);
  };

  const verify = async () => {
    if (!factorId) return;
    const code = verifyCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setLoading(false);
      setError(challengeError?.message ?? 'Could not create MFA challenge.');
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    toast.success('Two-step sign-in is now enabled on your account.');
    setEnrolled(true);
    cancelEnroll();
  };

  const performUnenroll = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const id = data?.totp.find((f) => f.status === 'verified')?.id;
    if (!id) return;
    setUnenrolling(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id });
    setUnenrolling(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    toast.success('Two-step sign-in turned off.');
    setEnrolled(false);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-navy-400" />
          Two-step sign-in
        </CardTitle>
        <CardDescription>
          Add a one-time code from an authenticator app (Google Authenticator, Authy, etc.) as a second step after your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {enrolled === null ? (
          <div className="flex items-center gap-3 p-4 text-sm text-navy-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your security settings...
          </div>
        ) : enrolled ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">Enabled</p>
                <p className="text-xs text-navy-300">You need your password and a 6-digit code to sign in.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setConfirmUnenroll(true)} disabled={unenrolling}>
              {unenrolling && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Turn off
            </Button>
          </div>
        ) : secret ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-govt-500/20 bg-govt-500/5 p-4">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-govt-300" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Add this key to your authenticator app</p>
                <p className="text-xs text-navy-400">
                  Open Google Authenticator, Authy, or a similar app, choose "Add account" and "Enter setup key", then paste this key:
                </p>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="break-all font-mono text-sm text-white">{secret}</p>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="mfa-verify-code" className="mb-1 block text-sm font-medium text-navy-300">
                Enter the 6-digit code from your app
              </label>
              <div className="flex gap-2">
                <input
                  id="mfa-verify-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={INPUT_CLASS}
                  placeholder="000000"
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={verify} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelEnroll} disabled={loading}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-navy-400" />
              <div>
                <p className="text-sm font-medium text-white">Not set up</p>
                <p className="text-xs text-navy-400">Your account uses password-only sign-in.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={startEnroll} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Set up
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmUnenroll}
        onClose={() => setConfirmUnenroll(false)}
        onConfirm={performUnenroll}
        title="Turn off two-step sign-in?"
        message="You will only need your password to sign in."
        confirmLabel="Turn off"
        destructive
      />
    </Card>
  );
}
