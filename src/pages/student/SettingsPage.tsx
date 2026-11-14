import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Target, Globe, Shield, Download, Eye, EyeOff, Clock, Infinity as InfinityIcon, Settings2, Camera, Loader2, Trash2, Zap, Trophy, FileText, BookOpen, Gift, Copy, Check, Phone, Calendar, ShieldCheck, Award } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { ChangePasswordCard } from '@/components/student/ChangePasswordCard';
import { SignOutOtherDevicesCard } from '@/components/student/SignOutOtherDevicesCard';
import { MfaCard } from '@/components/student/MfaCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { GradCapAvatar } from '@/components/common/GradCapAvatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const MOCK_SIZES = [10, 15, 20, 30];

interface NotifPref {
  key: 'notif_mock_reminders' | 'notif_streak_alerts' | 'notif_weekly_report' | 'notif_leaderboard_updates' | 'notif_new_tests';
  label: string;
  desc: string;
  icon: typeof Bell;
}

const NOTIF_PREFS: NotifPref[] = [
  { key: 'notif_mock_reminders', label: 'Mock Test Reminders', desc: 'Get notified about daily practice and scheduled tests', icon: Zap },
  { key: 'notif_streak_alerts', label: 'Streak Alerts', desc: 'Warning when your daily streak is at risk', icon: Target },
  { key: 'notif_weekly_report', label: 'Weekly Performance Report', desc: 'A summary of your progress every week', icon: FileText },
  { key: 'notif_leaderboard_updates', label: 'Leaderboard Updates', desc: 'When your rank changes or someone overtakes you', icon: Trophy },
  { key: 'notif_new_tests', label: 'New Test Announcements', desc: 'Be the first to know when new tests are published', icon: BookOpen },
];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingNotif, setSavingNotif] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmAccountDeletion, setConfirmAccountDeletion] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<{ status: string; scheduled_for: string } | null>(null);

  const { data: referralData } = useQuery({
    queryKey: ['my-referral-code', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;
      return data as string;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (referralData) setReferralCode(referralData);
  }, [referralData]);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Referral code copied!');
  };

  const { data: deletionData } = useQuery({
    queryKey: ['account-deletion-request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('status, scheduled_for')
        .eq('user_id', user.id)
        .in('status', ['REQUESTED', 'SCHEDULED'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (deletionData) setDeletionRequest(deletionData);
  }, [deletionData]);

  const { data: publicProfile, isLoading: ppLoading } = useQuery({
    queryKey: ['public-profile-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('public_profiles')
        .select('handle, opt_in_leaderboard, opt_in_share')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['prefs', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('daily_mock_size, email_nudges, exam_timer_mode, exam_timer_minutes, notif_mock_reminders, notif_streak_alerts, notif_weekly_report, notif_leaderboard_updates, notif_new_tests, phone, created_at, entry_source, referral_code_used')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (prefs?.phone !== undefined) setEditPhone(prefs.phone || '');
  }, [prefs?.phone]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim() })
      .eq('id', user.id);
    setSavingName(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.saved'));
      await refreshProfile();
    }
  };

  const savePhone = async () => {
    if (!user) return;
    const trimmed = editPhone.trim();
    if (trimmed && !/^\+?[\d\s-]{10,15}$/.test(trimmed)) {
      toast.error('Please enter a valid phone number (10-15 digits).');
      return;
    }
    setSavingPhone(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: trimmed || null })
      .eq('id', user.id);
    setSavingPhone(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.saved'));
      queryClient.invalidateQueries({ queryKey: ['prefs', user.id] });
    }
  };

  const savePrefs = async (field: 'daily_mock_size' | 'email_nudges' | 'exam_timer_mode' | 'exam_timer_minutes', value: number | boolean | string) => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);
    setSavingPrefs(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.saved'));
      queryClient.invalidateQueries({ queryKey: ['prefs', user.id] });
    }
  };

  const saveNotif = async (key: NotifPref['key'], value: boolean) => {
    if (!user) return;
    setSavingNotif(key);
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', user.id);
    setSavingNotif(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.saved'));
      queryClient.invalidateQueries({ queryKey: ['prefs', user.id] });
    }
  };

  const savePublicProfile = async (field: 'handle' | 'opt_in_leaderboard' | 'opt_in_share', value: string | boolean) => {
    if (!user) return;
    setSavingPublic(true);
    const { error } = await supabase
      .from('public_profiles')
      .update({ [field]: value })
      .eq('user_id', user.id);
    setSavingPublic(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.saved'));
      queryClient.invalidateQueries({ queryKey: ['public-profile-settings', user.id] });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingAvatar(false);
      toast.error(upErr.message);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    setUploadingAvatar(false);
    if (dbErr) {
      toast.error(dbErr.message);
    } else {
      toast.success('Avatar updated');
      await refreshProfile();
    }
  };

  const handleAvatarRemove = async () => {
    if (!user || !profile?.avatar_url) return;
    setUploadingAvatar(true);
    const path = `${user.id}/avatar.${profile.avatar_url.split('.').pop()?.split('?')[0] || 'png'}`;
    await supabase.storage.from('avatars').remove([path]);
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    setUploadingAvatar(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Avatar removed');
      await refreshProfile();
    }
  };

  const requestAccountDeletion = async () => {
    if (!user) return;
    setDeletingAccount(true);
    const { data, error } = await supabase.functions.invoke('self-delete-user', { body: {} });
    setDeletingAccount(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Could not start account deletion');
      return;
    }
    if (data?.deleted) {
      await supabase.auth.signOut();
      return;
    }
    setDeletionRequest({ status: data.status, scheduled_for: data.scheduled_for });
    toast.success(`Account deletion scheduled for ${new Date(data.scheduled_for).toLocaleDateString('en-IN')}.`);
  };

  const cancelAccountDeletion = async () => {
    const { data, error } = await supabase.rpc('cancel_account_deletion');
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setDeletionRequest(null);
      toast.success('Account deletion cancelled.');
    }
  };

  const exportData = async () => {
    if (!user) return;
    const [attempts, responses, mastery, focus] = await Promise.all([
      supabase.from('attempts').select('*').eq('user_id', user.id),
      supabase.from('responses').select('*, attempt:attempt_id ( id )').in('attempt_id',
        (await supabase.from('attempts').select('id').eq('user_id', user.id)).data?.map(a => a.id) || []),
      supabase.from('mastery_scores').select('*').eq('user_id', user.id),
      supabase.from('student_focus_topics').select('*').eq('user_id', user.id),
    ]);

    const data = {
      profile,
      attempts: attempts.data,
      responses: responses.data,
      mastery_scores: mastery.data,
      focus_topics: focus.data,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nta-rankers-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('settings.exportDone'));
  };

  const avatarInitial = (profile?.full_name || user?.email || 'S').charAt(0).toUpperCase();

  const profileCompletion = useMemo(() => {
    let filled = 0;
    const total = 4;
    if (profile?.full_name) filled++;
    if (profile?.birth_year) filled++;
    if (prefs?.phone) filled++;
    if (profile?.avatar_url) filled++;
    return Math.round((filled / total) * 100);
  }, [profile, prefs?.phone]);

  const memberSince = prefs?.created_at ? new Date(prefs.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : null;
  const roleLabel = profile?.role === 'ADMIN' ? 'Administrator' : 'Student';

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
          <p className="text-sm text-navy-400">{t('settings.desc')}</p>
        </div>

        {/* Profile with avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-navy-400" />
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Profile completion */}
            {profileCompletion < 100 && (
              <div className="rounded-xl border border-govt-500/20 bg-govt-500/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Profile completion</p>
                  <span className="text-sm font-bold text-govt-300">{profileCompletion}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-govt-400 to-vibe-400 transition-[width] duration-500" style={{ width: `${profileCompletion}%` }} />
                </div>
                <p className="mt-2 text-xs text-navy-400">Complete your profile to get personalized recommendations and exam insights.</p>
              </div>
            )}

            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <GradCapAvatar name={profile?.full_name || 'Student'} avatarUrl={profile?.avatar_url} size="lg" className="ring-2 ring-navy-200" />
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                    <Camera className="h-4 w-4" />
                    {profile?.avatar_url ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {profile?.avatar_url && (
                    <Button variant="ghost" size="sm" onClick={handleAvatarRemove} disabled={uploadingAvatar}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-navy-400">JPG, PNG, or GIF. Max 2 MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-300">{t('settings.name')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
                />
                <Button variant="primary" onClick={saveName} disabled={savingName || editName.trim() === (profile?.full_name || '')}>
                  {savingName ? '…' : t('settings.save')}
                </Button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-300">Phone Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <Button variant="primary" onClick={savePhone} disabled={savingPhone || editPhone.trim() === (prefs?.phone || '')}>
                  {savingPhone ? '…' : t('settings.save')}
                </Button>
              </div>
              <p className="mt-1 text-xs text-navy-400">For exam notifications and OTP verification</p>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-300">{t('settings.email')}</label>
              <p className="text-sm text-navy-400">{profile?.email || user?.email}</p>
            </div>

            {/* Birth year */}
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-300">Birth Year</label>
              <p className="text-sm text-navy-400">{profile?.birth_year || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-navy-400" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-navy-400" />
                <div>
                  <p className="text-sm font-medium text-white">Role</p>
                  <p className="text-xs text-navy-400">Your access level on this platform</p>
                </div>
              </div>
              <span className="rounded-lg bg-govt-500/20 px-3 py-1 text-xs font-semibold text-govt-300">{roleLabel}</span>
            </div>
            {memberSince && (
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-navy-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Member Since</p>
                    <p className="text-xs text-navy-400">When you joined Mock Ninja</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-white">{memberSince}</span>
              </div>
            )}
            {prefs?.referral_code_used && (
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-navy-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Referred By</p>
                    <p className="text-xs text-navy-400">Code used at signup</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-medium text-govt-300">{prefs.referral_code_used}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <ChangePasswordCard email={profile?.email || user?.email || ''} />
        <MfaCard />
        <SignOutOtherDevicesCard />

        {/* Exam Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-navy-400" />
              {t('settings.preferences')}
            </CardTitle>
            <CardDescription>{t('settings.preferencesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-navy-300">{t('settings.dailyMockSize')}</label>
                  <div className="flex gap-2">
                    {MOCK_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => savePrefs('daily_mock_size', size)}
                        disabled={savingPrefs}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                          prefs?.daily_mock_size === size
                            ? 'bg-govt-500/20 text-white'
                            : 'bg-white/5 text-navy-400 hover:bg-white/10 border border-white/10',
                        )}
                      >
                        {size} {t('settings.questions')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer mode */}
                <div className="rounded-lg border border-white/10 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-navy-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Test Timer Mode</p>
                      <p className="text-xs text-navy-400">Customize how timers work during mock tests</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => savePrefs('exam_timer_mode', 'STANDARD')}
                      disabled={savingPrefs}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left transition-colors',
                        prefs?.exam_timer_mode === 'STANDARD' || !prefs?.exam_timer_mode
                          ? 'border-govt-500/40 bg-govt-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20',
                      )}
                    >
                      <Clock className="mb-1 h-4 w-4 text-navy-400" />
                      <p className="text-sm font-semibold text-white">Standard</p>
                      <p className="text-2xs text-navy-400">Use test duration</p>
                    </button>
                    <button
                      onClick={() => savePrefs('exam_timer_mode', 'CUSTOM')}
                      disabled={savingPrefs}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left transition-colors',
                        prefs?.exam_timer_mode === 'CUSTOM'
                          ? 'border-govt-500/40 bg-govt-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20',
                      )}
                    >
                      <Settings2 className="mb-1 h-4 w-4 text-navy-400" />
                      <p className="text-sm font-semibold text-white">Custom</p>
                      <p className="text-2xs text-navy-400">Set your own time</p>
                    </button>
                    <button
                      onClick={() => savePrefs('exam_timer_mode', 'UNTIMED')}
                      disabled={savingPrefs}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left transition-colors',
                        prefs?.exam_timer_mode === 'UNTIMED'
                          ? 'border-govt-500/40 bg-govt-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20',
                      )}
                    >
                      <InfinityIcon className="mb-1 h-4 w-4 text-emerald-300" />
                      <p className="text-sm font-semibold text-white">Untimed</p>
                      <p className="text-2xs text-navy-400">Practice mode</p>
                    </button>
                  </div>
                  {prefs?.exam_timer_mode === 'CUSTOM' && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/5 p-3">
                      <label className="text-sm font-medium text-navy-300">Duration (minutes):</label>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={prefs?.exam_timer_minutes ?? 180}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 600) {
                            savePrefs('exam_timer_minutes', val);
                          }
                        }}
                        className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
                      />
                      <span className="text-xs text-navy-400">Range: 1-600 min</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-navy-400" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {prefsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              NOTIF_PREFS.map((pref) => {
                const Icon = pref.icon;
                const enabled = prefs?.[pref.key] ?? true;
                const isSaving = savingNotif === pref.key;
                return (
                  <div key={pref.key} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-navy-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{pref.label}</p>
                        <p className="text-xs text-navy-400">{pref.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => saveNotif(pref.key, !enabled)}
                      disabled={isSaving}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        enabled ? 'bg-emerald-500' : 'bg-white/10',
                      )}
                    >
                      {isSaving && <Loader2 className="absolute left-1 top-0.5 h-5 w-5 animate-spin text-white" />}
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        enabled ? 'translate-x-5' : 'translate-x-0.5',
                      )} />
                    </button>
                  </div>
                );
              })
            )}
            {/* Email nudges master toggle */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-navy-400" />
                <div>
                  <p className="text-sm font-medium text-white">{t('settings.emailNudges')}</p>
                  <p className="text-xs text-navy-400">{t('settings.emailNudgesDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => savePrefs('email_nudges', !prefs?.email_nudges)}
                disabled={savingPrefs}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  prefs?.email_nudges ? 'bg-emerald-500' : 'bg-white/10',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  prefs?.email_nudges ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-navy-400" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>{t('settings.languageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium',
                  i18n.language === 'en' ? 'bg-govt-500/20 text-white' : 'bg-white/5 text-navy-400 border border-white/10',
                )}
              >English</button>
              <button
                onClick={() => i18n.changeLanguage('hi')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium',
                  i18n.language === 'hi' ? 'bg-govt-500/20 text-white' : 'bg-white/5 text-navy-400 border border-white/10',
                )}
              >Hindi</button>
            </div>
          </CardContent>
        </Card>

        {/* Public profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-navy-400" />
              {t('settings.publicProfile')}
            </CardTitle>
            <CardDescription>{t('settings.publicProfileDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ppLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !publicProfile ? (
              <p className="text-sm text-navy-400">{t('settings.noPublicProfile')}</p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy-300">{t('settings.handle')}</label>
                  <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white">
                    @{publicProfile.handle}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <div className="flex items-center gap-3">
                    {publicProfile.opt_in_leaderboard ? <Eye className="h-5 w-5 text-emerald-300" /> : <EyeOff className="h-5 w-5 text-navy-400" />}
                    <div>
                      <p className="text-sm font-medium text-white">{t('settings.optInLeaderboard')}</p>
                      <p className="text-xs text-navy-400">{t('settings.optInLeaderboardDesc')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => savePublicProfile('opt_in_leaderboard', !publicProfile.opt_in_leaderboard)}
                    disabled={savingPublic}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      publicProfile.opt_in_leaderboard ? 'bg-emerald-500' : 'bg-white/10',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                      publicProfile.opt_in_leaderboard ? 'translate-x-5' : 'translate-x-0.5',
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <div className="flex items-center gap-3">
                    {publicProfile.opt_in_share ? <Eye className="h-5 w-5 text-emerald-300" /> : <EyeOff className="h-5 w-5 text-navy-400" />}
                    <div>
                      <p className="text-sm font-medium text-white">{t('settings.optInShare')}</p>
                      <p className="text-xs text-navy-400">{t('settings.optInShareDesc')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => savePublicProfile('opt_in_share', !publicProfile.opt_in_share)}
                    disabled={savingPublic}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      publicProfile.opt_in_share ? 'bg-emerald-500' : 'bg-white/10',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                      publicProfile.opt_in_share ? 'translate-x-5' : 'translate-x-0.5',
                    )} />
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Referral program */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-govt-400" />
              Refer & Earn
            </CardTitle>
            <CardDescription>Share your referral code — friends get 20% off their first payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralCode ? (
              <div className="flex items-center gap-3 rounded-lg border border-govt-500/30 bg-govt-500/10 p-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-govt-300">Your Referral Code</p>
                  <p className="mt-1 text-xl font-bold tracking-wider text-white">{referralCode}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyReferralCode}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
            <p className="text-xs text-navy-400">
              Share this code with friends. When they sign up and use it during checkout, they get 20% off their first payment.
            </p>
          </CardContent>
        </Card>

        {/* Data & account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.dataAccount')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={exportData}
              className="flex w-full items-center gap-3 rounded-lg border border-white/10 p-3 text-left transition-colors hover:bg-white/5"
            >
              <Download className="h-5 w-5 text-navy-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{t('settings.exportData')}</p>
                <p className="text-xs text-navy-400">{t('settings.exportDataDesc')}</p>
              </div>
            </button>
            <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Delete account</p>
                  {deletionRequest ? (
                    <>
                      <p className="mt-1 text-xs text-navy-300">
                        Deletion is scheduled for {new Date(deletionRequest.scheduled_for).toLocaleDateString('en-IN')}. You can cancel during the grace period.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={cancelAccountDeletion}>Cancel deletion</Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-navy-400">Your account and personal practice data will be deleted after the grace period. Financial records are anonymised when legally required.</p>
                      <Button variant="destructive" size="sm" className="mt-3" onClick={() => setConfirmAccountDeletion(true)} disabled={deletingAccount}>
                        {deletingAccount ? 'Starting…' : 'Request account deletion'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmAccountDeletion}
        onClose={() => setConfirmAccountDeletion(false)}
        onConfirm={requestAccountDeletion}
        title="Delete your account"
        message="Delete your Mock Ninja account and practice history? This cannot be undone after the grace period."
        confirmLabel="Request deletion"
        destructive
      />
    </StudentLayout>
  );
}
