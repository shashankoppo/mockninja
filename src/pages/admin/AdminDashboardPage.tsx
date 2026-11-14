import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FileQuestion, ClipboardList, Users, ClipboardCheck, ChevronRight,
  Plus, BarChart3, CheckCircle2, TrendingUp, Clock, LifeBuoy,
  Zap, Trophy, ArrowRight, Sparkles, AlertCircle, Activity, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminPageDirectory } from '@/components/admin/AdminPageDirectory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface StatCounts {
  questions: number;
  publishedMocks: number;
  students: number;
  attempts: number;
  openInquiries: number;
  submittedToday: number;
}

interface RecentAttempt {
  id: string;
  status: string;
  score: number | null;
  started_at: string;
  mock_test: { title?: string } | null;
  profiles: { full_name?: string } | null;
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const { data: stats, isLoading } = useQuery<StatCounts>({
    queryKey: ['admin-stats-v2'],
    queryFn: async () => {
      const [questions, publishedMocks, students, attempts, openInquiries, todaySubmissions] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('mock_tests').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
        supabase.from('attempts').select('*', { count: 'exact', head: true }),
        supabase.from('support_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
        supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'SUBMITTED').gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        questions: questions.count ?? 0,
        publishedMocks: publishedMocks.count ?? 0,
        students: students.count ?? 0,
        attempts: attempts.count ?? 0,
        openInquiries: openInquiries.count ?? 0,
        submittedToday: todaySubmissions.count ?? 0,
      };
    },
  });

  const { data: maintenanceSetting } = useQuery<{ enabled: boolean }>({
    queryKey: ['admin-dashboard-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();
      if (error) throw error;
      return { enabled: data?.value?.enabled === true };
    },
  });

  const maintenanceMode = maintenanceSetting?.enabled === true;

  const toggleMaintenance = async () => {
    setSavingMaintenance(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: { enabled: !maintenanceMode }, updated_at: new Date().toISOString() })
      .eq('key', 'maintenance_mode');
    setSavingMaintenance(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`);
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    queryClient.invalidateQueries({ queryKey: ['site-settings'] });
  };

  const { data: recentAttempts, isLoading: recentLoading } = useQuery<RecentAttempt[]>({
    queryKey: ['admin-recent-attempts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attempts')
        .select('id, status, score, started_at, mock_test:mock_test_id(title), profiles:user_id(full_name)')
        .order('started_at', { ascending: false })
        .limit(5);
      return (data || []) as unknown as RecentAttempt[];
    },
  });

  const statCards = [
    { key: 'statQuestions', value: stats?.questions, icon: FileQuestion, color: 'text-govt-700', bg: 'bg-govt-50', ring: 'ring-govt-200', trend: '+' },
    { key: 'statMocks', value: stats?.publishedMocks, icon: ClipboardList, color: 'text-india-700', bg: 'bg-india-50', ring: 'ring-india-200', trend: '+' },
    { key: 'statStudents', value: stats?.students, icon: Users, color: 'text-saffron-700', bg: 'bg-saffron-50', ring: 'ring-saffron-200', trend: '+' },
    { key: 'statAttempts', value: stats?.attempts, icon: ClipboardCheck, color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200', trend: '+' },
  ] as const;

  const quickActions = [
    { key: 'actionQuestions', to: '/admin/questions', icon: Plus, desc: t('admin.stepQuestions'), color: 'bg-govt-50 text-govt-700 ring-govt-200' },
    { key: 'actionMocks', to: '/admin/mocks', icon: ClipboardList, desc: t('admin.stepMocks'), color: 'bg-india-50 text-india-700 ring-india-200' },
    { key: 'actionReports', to: '/admin/reports', icon: BarChart3, desc: t('admin.stepReports'), color: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { key: 'actionHomepage', to: '/admin/homepage', icon: Sparkles, desc: 'Edit homepage content', color: 'bg-govt-50 text-govt-700 ring-govt-200' },
    { key: 'actionSupport', to: '/admin/support', icon: LifeBuoy, desc: `${stats?.openInquiries ?? 0} open inquiries`, color: 'bg-red-50 text-red-700 ring-red-200', badge: stats?.openInquiries ?? 0 },
    { key: 'actionUsers', to: '/admin/users', icon: Users, desc: 'Manage user roles', color: 'bg-saffron-50 text-saffron-700 ring-saffron-200' },
  ] as const;

  const checklist = [
    { step: 1, key: 'stepQuestions', done: (stats?.questions ?? 0) > 0 },
    { step: 2, key: 'stepMocks', done: (stats?.publishedMocks ?? 0) > 0 },
    { step: 3, key: 'stepReports', done: false },
  ] as const;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 govt-heading">{t('admin.dashboardTitle')}</h1>
            <p className="text-sm text-navy-500">{t('admin.dashboardDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">{stats?.submittedToday ?? 0}</span>
              <span className="text-xs text-emerald-600">submitted today</span>
            </div>
            {(stats?.openInquiries ?? 0) > 0 && (
              <button
                onClick={() => navigate('/admin/support')}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 transition-colors hover:bg-red-100"
              >
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">{stats?.openInquiries}</span>
                <span className="text-xs text-red-600">open inquiries</span>
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)
            : statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.key} className="group transition-[transform,box-shadow] duration-300 hover:shadow-card hover:-translate-y-0.5">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110', card.bg, card.ring)}>
                        <Icon className={cn('h-6 w-6', card.color)} aria-hidden />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-navy-900 govt-heading tabular-nums">{card.value ?? 0}</p>
                        <p className="text-xs text-navy-500">{t(`admin.${card.key}`)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        <Card className={cn('overflow-hidden', maintenanceMode ? 'border-amber-300 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/40')}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', maintenanceMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-900">Maintenance mode</p>
                <p className="mt-0.5 text-xs text-navy-500">{maintenanceMode ? 'Students and visitors see the maintenance page.' : 'The platform is live for students and visitors.'}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={maintenanceMode}
              aria-label="Toggle maintenance mode"
              onClick={toggleMaintenance}
              disabled={savingMaintenance}
              className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-govt-500 focus:ring-offset-2', maintenanceMode ? 'bg-amber-500' : 'bg-emerald-500')}
            >
              {savingMaintenance && <RefreshCw className="absolute left-1 top-1 h-5 w-5 animate-spin text-white" />}
              <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', maintenanceMode ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg govt-heading">{t('admin.quickActions')}</CardTitle>
            <CardDescription>{t('admin.quickActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    onClick={() => navigate(action.to)}
                    className="group flex flex-col gap-3 rounded-xl border border-navy-200 p-4 text-left transition-[color,background-color,border-color,box-shadow] duration-300 hover:border-govt-300 hover:bg-govt-50/30 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110', action.color)}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      {'badge' in action && (action as { badge?: number }).badge ? (
                        <Badge variant="error">{(action as { badge: number }).badge}</Badge>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{t(`admin.${action.key}`) || action.key}</p>
                      <p className="text-xs text-navy-400">{action.desc}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-govt-700 transition-[gap] group-hover:gap-2">
                      {t('common.start')}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity + Getting started */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg govt-heading">
                  <Clock className="h-5 w-5 text-govt-600" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest student attempts across all mock tests</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/attempts')}>
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (recentAttempts || []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-400">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-navy-400">No attempts yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-navy-100">
                  {(recentAttempts || []).map((att) => {
                    const mock = att.mock_test as { title?: string } | null;
                    const profile = att.profiles as { full_name?: string } | null;
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-navy-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                            att.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                          )}>
                            {att.status === 'SUBMITTED' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy-900">
                              {profile?.full_name || 'Unknown student'}
                            </p>
                            <p className="truncate text-xs text-navy-500">
                              {mock?.title || 'Mock test'} · {new Date(att.started_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {att.score !== null && (
                            <span className="text-sm font-bold text-navy-900 tabular-nums">{Math.round(att.score)}</span>
                          )}
                          <Badge variant={att.status === 'SUBMITTED' ? 'success' : 'warning'}>
                            {att.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Getting started checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg govt-heading">{t('admin.gettingStarted')}</CardTitle>
              <CardDescription>Complete these steps to launch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                        item.done ? 'bg-india-600 text-white' : 'bg-navy-200 text-navy-500',
                      )}
                    >
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : item.step}
                    </div>
                    <span className={cn('text-sm transition-colors', item.done ? 'text-navy-400 line-through' : 'text-navy-700')}>
                      {t(`admin.${item.key}`)}
                    </span>
                  </div>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/homepage')}>
                    <Sparkles className="h-4 w-4" /> Edit homepage
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/support')}>
                    <LifeBuoy className="h-4 w-4" /> Check support inbox
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick links footer */}
        <div className="flex flex-wrap gap-2 border-t border-navy-200 pt-4">
          {[
            { to: '/admin/rankings', label: 'Top scorers', icon: Trophy },
            { to: '/admin/billing', label: 'AI usage', icon: Zap },
            { to: '/admin/content', label: 'Publish content', icon: ClipboardList },
            { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-2 text-xs font-medium text-navy-600 transition-colors hover:border-govt-300 hover:text-govt-700"
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </button>
            );
          })}
        </div>

        <AdminPageDirectory />
      </div>
    </AdminLayout>
  );
}
