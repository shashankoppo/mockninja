import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Gift, LifeBuoy, Calendar, Copy, Check, Award, TrendingUp, Target, Camera, ChevronRight, Shield, Bell, BookOpen, Flame, Zap } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonalDetailsDialog } from '@/components/student/PersonalDetailsDialog';
import { GradCapAvatar } from '@/components/common/GradCapAvatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function AccountPage() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: attempts } = useQuery({
    queryKey: ['account-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('attempts')
        .select('id, score, submitted_at, mock_test_id, mock_test:mock_test_id(title, total_marks)')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: referralCount } = useQuery({
    queryKey: ['referral-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: masteryCount } = useQuery({
    queryKey: ['mastery-count-account', user?.id],
    queryFn: async () => {
      if (!user) return { rated: 0, black: 0 };
      const { data } = await supabase
        .from('mastery_scores')
        .select('belt')
        .eq('user_id', user.id);
      const rated = (data || []).filter((m: { belt: string }) => m.belt !== 'UNRATED').length;
      const black = (data || []).filter((m: { belt: string }) => m.belt === 'BLACK').length;
      return { rated, black };
    },
    enabled: !!user,
  });

  const { data: streakData } = useQuery({
    queryKey: ['account-streak', user?.id],
    queryFn: async () => {
      if (!user) return { streak: 0, thisWeek: 0 };
      const { data } = await supabase
        .from('attempts')
        .select('submitted_at')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false })
        .limit(30);
      const attemptDates = new Set((data || []).filter((a) => a.submitted_at).map((a) => new Date(a.submitted_at).toLocaleDateString('en-CA')));
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thisWeek = (data || []).filter((a) => a.submitted_at && new Date(a.submitted_at) >= weekAgo).length;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        if (attemptDates.has(d.toLocaleDateString('en-CA'))) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      return { streak, thisWeek };
    },
    enabled: !!user,
  });

  const totalAttempts = (attempts || []).length;
  const avgScore = totalAttempts > 0
    ? Math.round((attempts || []).reduce((s: number, a: { score?: number }) => s + (a.score ?? 0), 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0
    ? Math.max(...(attempts || []).map((a: { score?: number }) => a.score ?? 0))
    : 0;

  const referralCode = profile?.referral_code || '';
  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avatarInitial = (profile?.full_name || user?.email || 'S').charAt(0).toUpperCase();

  const stats = [
    { icon: Target, label: 'Tests Taken', value: totalAttempts, color: 'text-govt-300', bg: 'bg-govt-500/15' },
    { icon: TrendingUp, label: 'Avg Score', value: avgScore, color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
    { icon: Award, label: 'Best Score', value: bestScore, color: 'text-amber-300', bg: 'bg-amber-500/15' },
    { icon: Award, label: 'Chapters Rated', value: (masteryCount as { rated: number })?.rated ?? 0, color: 'text-navy-200', bg: 'bg-white/10' },
  ];

  const quickLinks = [
    { icon: Shield, label: 'Settings', desc: 'Profile, preferences, notifications', to: '/settings', color: 'bg-govt-500/15 text-govt-300' },
    { icon: BookOpen, label: 'Mastery', desc: 'Belt levels and chapter progress', to: '/mastery', color: 'bg-white/10 text-navy-100' },
    { icon: Target, label: 'Study Plan', desc: 'Your weekly schedule', to: '/study-plan', color: 'bg-emerald-500/15 text-emerald-300' },
    { icon: Zap, label: 'Daily Practice', desc: "Today's practice set", to: '/dpp', color: 'bg-amber-500/15 text-amber-300' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('accountTitle' as string) || 'Account'}</h1>
          <p className="text-sm text-navy-300">{t('accountDesc' as string) || 'Manage your plan, billing, and account settings.'}</p>
        </div>

        {/* Profile card with avatar */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-govt-700 via-govt-600 to-govt-800" />
          <CardContent className="-mt-10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <GradCapAvatar name={profile?.full_name || 'Student'} avatarUrl={profile?.avatar_url} size="lg" className="border-4 border-white shadow-lg" />
                <div className="pb-1">
                  <p className="text-lg font-bold text-white">{profile?.full_name || 'Student'}</p>
                  <p className="text-sm text-navy-300">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                    </span>
                    {profile?.entry_source && (
                      <Badge variant="neutral">{profile.entry_source}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Camera className="h-4 w-4" />
                Edit Profile
              </Button>
              {editOpen && <PersonalDetailsDialog onClose={() => setEditOpen(false)} />}
            </div>
          </CardContent>
        </Card>

        {/* Streak + this week banner */}
        {(streakData as { streak: number })?.streak ? (
          <div className="flex items-center gap-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Flame className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-200">
                {(streakData as { streak: number })?.streak} day streak!
              </p>
              <p className="text-xs text-amber-300">
                {(streakData as { thisWeek: number })?.thisWeek} tests completed this week. Keep it up!
              </p>
            </div>
          </div>
        ) : null}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-lg', s.bg)}>
                    <Icon className={cn('h-5 w-5', s.color)} />
                  </div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-navy-300">{s.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} to={link.to}>
                <Card className="group h-full cursor-pointer transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card">
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-110', link.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{link.label}</p>
                      <p className="text-xs text-navy-400">{link.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Referral card */}
        <Card className="border-govt-400/30 bg-govt-500/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-govt-300" />
              <CardTitle className="text-lg">Referral Program</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-navy-200">
                  Share your referral code with friends. You earn credits when they sign up.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-mono font-medium text-white">
                    {referralCode || '—'}
                  </code>
                  {referralCode && (
                    <Button variant="ghost" size="sm" onClick={copyReferral}>
                      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-govt-300">{referralCount ?? 0}</div>
                <div className="text-xs text-navy-300">Friends referred</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent attempts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Attempts</CardTitle>
              <Link to="/progress">
                <Button variant="ghost" size="sm">View all <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(attempts || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-navy-400">
                No attempts yet. Take a mock test to see your history here.
              </p>
            ) : (
              <div className="space-y-2">
                {(attempts || []).map((a: { id: string; score?: number; submitted_at: string; mock_test: { title?: string; total_marks?: number }[] }) => {
                  const mt = a.mock_test?.[0];
                  const pct = mt?.total_marks ? Math.round(((a.score ?? 0) / mt.total_marks) * 100) : 0;
                  return (
                    <Link key={a.id} to="/progress" className="block">
                      <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
                        <div>
                          <p className="text-sm font-medium text-white">{mt?.title || 'Mock Test'}</p>
                          <p className="text-xs text-navy-400">
                            {new Date(a.submitted_at).toLocaleDateString()} · {a.score ?? 0}/{mt?.total_marks ?? 0} marks
                          </p>
                        </div>
                        <Badge variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error'}>
                          {pct}%
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account sections */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Plan & Billing</CardTitle>
                    <p className="text-sm text-navy-300">Manage your subscription.</p>
                  </div>
                </div>
                <Badge variant="neutral">Free Plan</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/pricing">
                <Button variant="outline" size="sm">Upgrade to Premium</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Support</CardTitle>
                    <p className="text-sm text-navy-300">Get help and contact us.</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/contact">
                <Button variant="outline" size="sm">Contact Support</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
