import { type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, ClipboardList, Award, TrendingUp, Trophy, Calendar, NotebookPen,
  Flame, BookOpen, Bookmark, History, User, LogOut, ChevronDown,
  ShieldCheck, Bell, Menu, X, Target, BarChart3, Settings, CreditCard, Flag, Receipt,
  Layers,
} from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { GradCapAvatar } from '@/components/common/GradCapAvatar';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface NavGroup {
  label: string;
  items: { to: string; labelKey: string; icon: typeof Home }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', labelKey: 'nav.home', icon: Home },
      { to: '/mocks', labelKey: 'nav.mocks', icon: ClipboardList },
      { to: '/attempted-tests', labelKey: 'nav.attemptedTests', icon: History },
      { to: '/dpp', labelKey: 'nav.dpp', icon: Flame },
      { to: '/series', labelKey: 'nav.testSeries', icon: Layers },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/mastery', labelKey: 'nav.mastery', icon: Award },
      { to: '/focus', labelKey: 'nav.focus', icon: Target },
      { to: '/mistake-notebook', labelKey: 'nav.mistakeNotebook', icon: NotebookPen },
      { to: '/bookmarks', labelKey: 'nav.savedQuestions', icon: Bookmark },
      { to: '/resources', labelKey: 'nav.resources', icon: BookOpen },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/performance', labelKey: 'nav.progress', icon: BarChart3 },
      { to: '/analytics', labelKey: 'nav.analytics', icon: TrendingUp },
      { to: '/leaderboard', labelKey: 'nav.leaderboard', icon: Trophy },
      { to: '/study-plan', labelKey: 'nav.studyPlan', icon: Calendar },
      { to: '/subscription', labelKey: 'nav.subscription', icon: CreditCard },
      { to: '/billing', labelKey: 'Billing', icon: Receipt },
      { to: '/report-question', labelKey: 'nav.reportQuestion', icon: Flag },
    ],
  },
];

const mobileNavItems = [
  { to: '/dashboard', labelKey: 'nav.home', icon: Home },
  { to: '/mocks', labelKey: 'nav.mocks', icon: ClipboardList },
  { to: '/dpp', labelKey: 'nav.dpp', icon: Flame },
  { to: '/performance', labelKey: 'nav.progress', icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.myProfile', icon: User }
];

function TricolorBar() {
  return (
    <div className="tricolor-bar" aria-hidden>
      <span /><span /><span />
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || 'S';
}

interface NotifItem {
  icon: typeof Bell;
  title: string;
  desc: string;
  to: string;
  color: string;
}

const NOTIF_TYPE_LABELS: Record<string, { title: string; icon: typeof Bell; color: string }> = {
  INACTIVE_2D: { title: 'Inactivity reminder', icon: TrendingUp, color: 'text-amber-300 bg-amber-500/15' },
  INACTIVE_3D: { title: 'Final inactivity reminder', icon: TrendingUp, color: 'text-amber-300 bg-amber-500/15' },
  GUARDIAN_CONSENT: { title: 'Guardian consent', icon: ShieldCheck, color: 'text-vibe-300 bg-vibe-500/15' },
  UNSUBSCRIBE: { title: 'Unsubscribe confirmation', icon: Bell, color: 'text-navy-300 bg-white/10' },
  SUPPORT_INQUIRY: { title: 'Support ticket received', icon: Bell, color: 'text-govt-300 bg-govt-500/15' },
  SUPPORT_REPLY: { title: 'Support reply received', icon: Bell, color: 'text-govt-300 bg-govt-500/15' },
};

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifLog = [] } = useQuery({
    queryKey: ['notification-log-recent', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, type, sent_at')
        .eq('user_id', user.id)
        .gte('sent_at', sevenDaysAgo)
        .order('sent_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as { id: string; type: string; sent_at: string }[];
    },
    enabled: !!user,
  });

  const { data: inProgress = [] } = useQuery({
    queryKey: ['notif-in-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select('id, mock_test:mock_test_id(title)')
        .eq('user_id', user.id)
        .eq('status', 'IN_PROGRESS')
        .limit(2);
      if (error) throw error;
      return (data || []) as { id: string; mock_test: { title?: string } | null }[];
    },
    enabled: !!user,
  });

  const { data: dailyMock } = useQuery({
    queryKey: ['notif-daily-mock', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_daily_mocks')
        .select('mock_test_id, for_date')
        .eq('user_id', user.id)
        .order('for_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { mock_test_id: string; for_date: string } | null;
    },
    enabled: !!user,
  });

  const items: NotifItem[] = [];

  (inProgress || []).forEach((a) => {
    items.push({
      icon: ClipboardList,
      title: 'Resume your test',
      desc: a.mock_test?.title || 'In-progress attempt',
      to: `/exam/${a.id}`,
      color: 'text-govt-300 bg-govt-500/15',
    });
  });

  if (dailyMock) {
    items.push({
      icon: Flame,
      title: 'Daily mock ready',
      desc: "Today's target mock is waiting",
      to: '/dashboard',
      color: 'text-saffron-300 bg-saffron-500/15',
    });
  }

  (notifLog || []).forEach((n) => {
    const label = NOTIF_TYPE_LABELS[n.type] || { title: n.type, icon: Bell, color: 'text-navy-300 bg-white/10' };
    items.push({
      icon: label.icon,
      title: label.title,
      desc: new Date(n.sent_at).toLocaleString(),
      to: '/notifications',
      color: label.color,
    });
  });

  const notifCount = notifLog.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-white/10 bg-[#191923]/95 text-white shadow-[0_18px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl animate-scale-in">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Notifications</p>
        {notifCount > 0 && (
          <Link to="/notifications" onClick={onClose} className="text-xs font-medium text-govt-300 hover:text-govt-200">
            View all
          </Link>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bell className="h-6 w-6 text-navy-600" />
            <p className="text-sm text-navy-400">No notifications yet</p>
          </div>
        ) : (
          items.map((n, i) => {
            const Icon = n.icon;
            return (
              <Link
                key={i}
                to={n.to}
                onClick={onClose}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', n.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="truncate text-xs text-navy-400">{n.desc}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProfileMenu({ fullName, email, role, avatarUrl, onSignOut }: { fullName: string; email: string; role?: string; avatarUrl?: string | null; onSignOut: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="tap-target flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
      >
        <GradCapAvatar name={fullName || 'Student'} avatarUrl={avatarUrl} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-medium text-navy-200 xl:inline xl:max-w-36">
          {fullName || 'Student'}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-navy-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-white/10 bg-[#191923]/95 text-white shadow-[0_18px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl animate-scale-in">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{fullName || 'Student'}</p>
            <p className="truncate text-xs text-navy-500">{email}</p>
          </div>
          <div className="p-2">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4 text-navy-500" />
              Dashboard
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <User className="h-4 w-4 text-navy-500" />
              {t('nav.myProfile')}
            </Link>
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4 text-navy-500" />
              Account
            </Link>
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-govt-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ShieldCheck className="h-4 w-4 text-govt-300" />
                Admin Console
              </Link>
            )}
            <div className="my-1 border-t border-white/10" />
            <button
              onClick={onSignOut}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifBadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: count = 0 } = useQuery({
    queryKey: ['notification-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count: c, error } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
      return c ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notification_log')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (!error) queryClient.invalidateQueries({ queryKey: ['notification-unread-count', user.id] });
  };
  if (count === 0) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); void markAllRead(); }}
      className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vibe-500 px-1 text-2xs font-bold text-white ring-2 ring-[#11121c] transition-colors hover:bg-vibe-400"
      aria-label="Mark all notifications as read"
    >
      {count > 9 ? '9+' : count}
    </button>
  );
}

export function StudentLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLElement>(null);
  const savedScrollRef = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = savedScrollRef.current;
    }
  }, [location.pathname]);

  const handleNavClick = () => {
    if (sidebarScrollRef.current) {
      savedScrollRef.current = sidebarScrollRef.current.scrollTop;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="workspace-surface flex min-h-screen flex-col bg-[#0d0e15] text-white">
      <TricolorBar />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e15]/90 text-white backdrop-blur-xl">
        <div className="container-app flex h-14 items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="tap-target inline-flex shrink-0 items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo to="/dashboard" variant="workspace" />
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white tap-target"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <NotifBadge />
              </button>
              {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
            </div>

            <ThemeSwitcher />
            <LanguageSwitcher className="hidden text-navy-300 hover:bg-white/10 hover:text-white lg:inline-flex" />

            {profile && (
              <ProfileMenu
                fullName={profile.full_name || ''}
                email={profile.email || ''}
                role={profile.role}
                avatarUrl={profile.avatar_url}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#101117]/90 shadow-[12px_0_30px_-28px_rgba(0,0,0,.8)] backdrop-blur md:block">
          <nav ref={sidebarScrollRef} className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3 [overscroll-behavior:contain]">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-wider text-navy-400">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={handleNavClick}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                          active
                            ? 'bg-gradient-to-r from-govt-500/20 to-vibe-500/10 text-white shadow-[inset_3px_0_0_#a78bfa]'
                            : 'text-navy-300 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon className={cn('h-5 w-5 transition-colors', active ? 'text-govt-300' : 'text-navy-500 group-hover:text-govt-300')} />
                        {t(item.labelKey)}
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-r from-govt-500 to-govt-500" />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="border-t border-white/10 pt-3">
              <NavLink
                to="/settings"
                onClick={handleNavClick}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  location.pathname === '/settings'
                    ? 'bg-gradient-to-r from-govt-50 to-govt-50 text-govt-700 shadow-sm'
                    : 'text-navy-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <User className={cn('h-5 w-5', location.pathname === '/settings' ? 'text-govt-300' : 'text-navy-500 group-hover:text-govt-300')} />
                {t('nav.myProfile')}
              </NavLink>
            </div>
          </nav>
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[min(18rem,calc(100vw-2rem))] overflow-y-auto border-r border-white/10 bg-[#101117] shadow-xl animate-slide-in-left">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <BrandLogo to="/dashboard" variant="workspace" />
                <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-navy-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-3">
                {navGroups.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-wider text-navy-400">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = location.pathname.startsWith(item.to);
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={cn(
                              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                              active
                                ? 'bg-gradient-to-r from-govt-50 to-govt-50 text-govt-700 shadow-sm'
                                : 'text-navy-300 hover:bg-white/5 hover:text-white',
                            )}
                          >
                            <Icon className={cn('h-5 w-5', active ? 'text-govt-300' : 'text-navy-500 group-hover:text-govt-300')} />
                            {t(item.labelKey)}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3">
                  <NavLink
                    to="/settings"
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      location.pathname === '/settings'
                        ? 'bg-gradient-to-r from-govt-500/20 to-vibe-500/10 text-white shadow-sm'
                        : 'text-navy-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <User className="h-5 w-5 text-navy-500 group-hover:text-govt-300" />
                    {t('nav.myProfile')}
                  </NavLink>
                </div>
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 pb-24 md:pb-8">
          <div className="container-app py-4 sm:py-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#11121c]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-24px_rgba(0,0,0,.8)] backdrop-blur-lg md:hidden">
        <div className="flex items-stretch justify-around">
          {mobileNavItems.map((tab) => {
            const active = location.pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-2xs font-semibold transition-colors tap-target',
                  active ? 'bg-gradient-to-r from-govt-300 to-vibe-300 bg-clip-text text-transparent' : 'text-navy-400'
                )}
              >
                <Icon className={cn('h-5 w-5 transition-colors', active ? 'text-govt-300' : 'text-navy-500')} aria-hidden />
                <span>{t(tab.labelKey)}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
