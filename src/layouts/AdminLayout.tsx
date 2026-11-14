import { type ReactNode, useState, useRef, useLayoutEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, BookMarked, FileQuestion, Upload,
  ClipboardList, Settings, ListChecks, Trophy, ShieldCheck, Droplet,
  Users, CreditCard, FolderOpen, LayoutTemplate, LifeBuoy, BarChart3, ClipboardCheck, Megaphone,
  Cog, Menu, X, ChevronRight, Receipt, Tag, Activity, Globe, Layers, MessageSquareText, Bell,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ProfileMenu } from '@/layouts/StudentLayout';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { countExpiringPaidSubscriptions } from '@/lib/subscription-expiry';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end: boolean;
  badgeKey?: 'open-inquiries';
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', labelKey: 'admin.dashboardTitle', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/topics', labelKey: 'admin.topicsTitle', icon: BookMarked, end: false },
      { to: '/admin/questions', labelKey: 'admin.questionBank', icon: FileQuestion, end: false },
      { to: '/admin/question-reports', labelKey: 'admin.navQuestionReports', icon: ClipboardCheck, end: false },
      { to: '/admin/questions/import', labelKey: 'admin.importTitle', icon: Upload, end: false },
      { to: '/admin/mocks', labelKey: 'admin.mockBuilder', icon: ClipboardList, end: false },
      { to: '/admin/test-series', labelKey: 'admin.testSeriesTitle', icon: Layers, end: false },
      { to: '/admin/test-feedback', labelKey: 'admin.testFeedbackTitle', icon: MessageSquareText, end: false },
      { to: '/admin/homepage', labelKey: 'admin.actionHomepage', icon: LayoutTemplate, end: false },
      { to: '/admin/content', labelKey: 'admin.contentTitle', icon: FolderOpen, end: false },
      { to: '/admin/resources', labelKey: 'admin.resourcesTitle', icon: FolderOpen, end: false },
    ],
  },
  {
    label: 'Students',
    items: [
      { to: '/admin/attempts', labelKey: 'admin.attemptsTitle', icon: ListChecks, end: false },
      { to: '/admin/rankings', labelKey: 'admin.rankingsTitle', icon: Trophy, end: false },
      { to: '/admin/users', labelKey: 'admin.usersTitle', icon: Users, end: false },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/exam-settings', labelKey: 'admin.examSettingsTitle', icon: Settings, end: false },
      { to: '/admin/proctoring', labelKey: 'admin.proctoringTitle', icon: ShieldCheck, end: false },
      { to: '/admin/integrity', labelKey: 'admin.integrityTitle', icon: ClipboardCheck, end: false },
      { to: '/admin/settings/watermark', labelKey: 'admin.watermarksTitle', icon: Droplet, end: false },
      { to: '/admin/billing', labelKey: 'admin.billingTitle', icon: CreditCard, end: false },
      { to: '/admin/subscriptions', labelKey: 'admin.subscriptionPlans', icon: CreditCard, end: false },
      { to: '/admin/user-subscriptions', labelKey: 'admin.navUserSubscriptions', icon: CreditCard, end: false },
      { to: '/admin/announcement', labelKey: 'admin.navAnnouncement', icon: Megaphone, end: false },
      { to: '/admin/transactions', labelKey: 'admin.navTransactions', icon: Receipt, end: false },
      { to: '/admin/reconciliation', labelKey: 'admin.navReconciliation', icon: Activity, end: false },
      { to: '/admin/promo-codes', labelKey: 'admin.navPromoCodes', icon: Tag, end: false },
      { to: '/admin/support', labelKey: 'admin.supportTitle', icon: LifeBuoy, end: false, badgeKey: 'open-inquiries' },
      { to: '/admin/analytics', labelKey: 'admin.analyticsTitle', icon: BarChart3, end: false },
      { to: '/admin/ai', labelKey: 'admin.aiTitle', icon: Cog, end: false },
      { to: '/admin/settings', labelKey: 'admin.settingsTitle', icon: Cog, end: false },
      { to: '/admin/settings/site', labelKey: 'admin.siteSettingsTitle', icon: Globe, end: false },
      { to: '/admin/settings/leaderboard', labelKey: 'admin.leaderboardSettingsTitle', icon: Trophy, end: false },
    ],
  },
] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLElement>(null);
  const savedScrollRef = useRef(0);

  useLayoutEffect(() => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = savedScrollRef.current;
    }
  }, [location.pathname]);

  const handleNavClick = () => {
    if (sidebarScrollRef.current) {
      savedScrollRef.current = sidebarScrollRef.current.scrollTop;
    }
    setMobileOpen(false);
  };

  const { data: openInquiries } = useQuery({
    queryKey: ['admin-open-inquiries-badge'],
    queryFn: async () => {
      const { count } = await supabase
        .from('support_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN');
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: expiringSubscriptions } = useQuery({
    queryKey: ['admin-expiring-subscriptions-badge'],
    queryFn: countExpiringPaidSubscriptions,
    refetchInterval: 60_000,
  });

  const isActive = (item: { to: string; end: boolean }) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const renderNavGroups = (mobile: boolean) =>
    navGroups.map((group) => (
      <div key={group.label} className={mobile ? 'mb-3 px-3 pt-3' : undefined}>
        <p className={cn('mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider', mobile ? 'text-navy-500' : 'text-navy-400')}>
          {group.label}
        </p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const badge = item.badgeKey === 'open-inquiries' ? openInquiries ?? 0 : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={mobile ? () => setMobileOpen(false) : handleNavClick}
                className={cn(
                  mobile
                    ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
                    : 'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 tap-target',
                  mobile && (active ? 'bg-white/10 text-white' : 'text-navy-300 hover:bg-white/5 hover:text-white'),
                  !mobile && (active
                    ? 'bg-gradient-to-r from-govt-500/20 to-vibe-500/10 text-white shadow-[inset_3px_0_0_#22d3ee]'
                    : 'text-navy-300 hover:bg-white/5 hover:text-white'),
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    !mobile && cn('transition-colors', active ? 'text-govt-300' : 'text-navy-500 group-hover:text-govt-300'),
                  )}
                  aria-hidden
                />
                <span className={mobile ? 'flex-1' : 'flex-1 truncate'}>{t(item.labelKey)}</span>
                {badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
                {!mobile && active && <ChevronRight className="h-3.5 w-3.5 text-govt-600" />}
              </NavLink>
            );
          })}
        </div>
      </div>
    ));

  const navList = (
    <nav ref={sidebarScrollRef} className="flex-1 space-y-4 overflow-y-auto p-3 [overscroll-behavior:contain]">
      {renderNavGroups(false)}
    </nav>
  );

  return (
    <div className="workspace-surface flex min-h-screen bg-[#0d0e15] text-white">
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-40" aria-hidden>
        <span /><span /><span />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-white/10 bg-[#101117]/95 pt-1.5 shadow-[12px_0_30px_-28px_rgba(0,0,0,.8)] backdrop-blur md:flex">
        <BrandLogo to="/admin" variant="admin" className="h-16 border-b border-white/10 px-4" />
        {navList}
        <div className="border-t border-white/10 p-3">
          <LanguageSwitcher className="w-full justify-start text-navy-300 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-navy-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(17rem,calc(100vw-2rem))] flex-col bg-navy-900 pt-1.5 shadow-xl animate-slide-in-left">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <BrandLogo to="/admin" variant="admin" className="" />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-navy-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-navy-900">
              {renderNavGroups(true)}
            </div>
            <div className="border-t border-white/10 p-3">
              <LanguageSwitcher className="w-full justify-start text-navy-300 hover:bg-white/10 hover:text-white" />
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col md:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#0d0e15]/90 px-3 text-white backdrop-blur-xl sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="tap-target inline-flex shrink-0 items-center justify-center rounded-lg text-navy-300 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold tracking-wide text-navy-200">Admin Console</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/admin/user-subscriptions"
              className="tap-target relative inline-flex items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={`Subscription expiry alerts: ${expiringSubscriptions ?? 0} expiring soon`}
              title="Paid plans expiring soon"
            >
              <Bell className="h-5 w-5" aria-hidden />
              {(expiringSubscriptions ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-navy-900">
                  {expiringSubscriptions}
                </span>
              )}
            </Link>
            <ThemeSwitcher />
            <Link to="/dashboard" className="hidden text-sm font-semibold text-govt-300 transition-colors hover:text-white sm:inline">
              Exit admin
            </Link>
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
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
