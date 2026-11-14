import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { isAllowedSocialUrl } from '@/lib/social-platforms';
import { DEFAULT_SUPPORT_EMAIL } from '@/lib/site-settings';
import {
  CheckCircle2, Clock, RefreshCw, Save, Search, Users, Trophy, ShieldCheck,
  CreditCard, FolderOpen, LayoutTemplate, LifeBuoy, Cog,
  TrendingUp, AlertTriangle, Eye, EyeOff, Activity, DollarSign, FileText,
  Bell, Lock, Database, BarChart3, X, Plus, Trash2, Pencil, Crown, Sparkles, Gift, Shield,
  Loader2, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────────────────── Exam Settings ──────────────────────────── */

export function AdminExamSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: mocks, isLoading } = useQuery({
    queryKey: ['admin-exam-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, mode, duration_min, total_marks, access, status, marking_scheme, proctoring_profile')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveSettings = async (mock: Record<string, unknown>) => {
    setSavingId(mock.id as string);
    setMessage(null);
    const { error } = await supabase.from('mock_tests').update({
      mode: mock.mode,
      duration_min: Number(mock.duration_min),
      total_marks: Number(mock.total_marks),
      access: mock.access,
      status: mock.status,
    }).eq('id', mock.id as string);
    setSavingId(null);
    if (error) setMessage(error.message);
    else {
      setMessage('Exam settings saved and are now live for new attempts.');
      queryClient.invalidateQueries({ queryKey: ['admin-exam-settings'] });
      queryClient.invalidateQueries({ queryKey: ['mock-tests'] });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.examSettingsTitle' as string) || 'Exam Settings'}</h1>
          <p className="text-sm text-navy-500">Manage duration, mode, access, and publishing settings students see in the exam flow.</p>
        </div>
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="space-y-3">
            {(mocks || []).map((mock: Record<string, unknown>) => (
              <Card key={mock.id as string}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{mock.title as string}</CardTitle>
                    <p className="text-xs text-navy-500">{mock.id as string}</p>
                  </div>
                  <Badge variant={mock.status === 'PUBLISHED' ? 'success' : mock.status === 'ARCHIVED' ? 'error' : 'neutral'}>{mock.status as string}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-5">
                    <label className="text-xs text-navy-500">Mode<select value={mock.mode as string} onChange={(e) => queryClient.setQueryData(['admin-exam-settings'], (rows: Record<string, unknown>[] = []) => rows.map((row) => row.id === mock.id ? { ...row, mode: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-navy-300 px-2 py-2 text-sm text-navy-900"><option value="EXAM">Exam</option><option value="PRACTICE">Practice</option></select></label>
                    <label className="text-xs text-navy-500">Duration (min)<input type="number" min="1" value={mock.duration_min as number} onChange={(e) => queryClient.setQueryData(['admin-exam-settings'], (rows: Record<string, unknown>[] = []) => rows.map((row) => row.id === mock.id ? { ...row, duration_min: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-navy-300 px-2 py-2 text-sm text-navy-900" /></label>
                    <label className="text-xs text-navy-500">Total marks<input type="number" min="0" value={mock.total_marks as number} onChange={(e) => queryClient.setQueryData(['admin-exam-settings'], (rows: Record<string, unknown>[] = []) => rows.map((row) => row.id === mock.id ? { ...row, total_marks: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-navy-300 px-2 py-2 text-sm text-navy-900" /></label>
                    <label className="text-xs text-navy-500">Access<select value={mock.access as string} onChange={(e) => queryClient.setQueryData(['admin-exam-settings'], (rows: Record<string, unknown>[] = []) => rows.map((row) => row.id === mock.id ? { ...row, access: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-navy-300 px-2 py-2 text-sm text-navy-900"><option value="FREE">Free</option><option value="PREMIUM">Premium</option></select></label>
                    <label className="text-xs text-navy-500">Status<select value={mock.status as string} onChange={(e) => queryClient.setQueryData(['admin-exam-settings'], (rows: Record<string, unknown>[] = []) => rows.map((row) => row.id === mock.id ? { ...row, status: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-navy-300 px-2 py-2 text-sm text-navy-900"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                  </div>
                  <div className="mt-4 flex justify-end"><Button size="sm" variant="primary" onClick={() => saveSettings(mock)} disabled={savingId === mock.id}>{savingId === mock.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Attempts ──────────────────────────── */

export function AdminAttemptsPage() {
  const { t } = useTranslation();
  const { data: attempts, isLoading, refetch } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attempts').select('id, user_id, mock_test_id, status, started_at, submitted_at, score, is_untimed, duration_min, mock_test:mock_test_id(title, total_marks)').order('started_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{t('admin.attemptsTitle' as string) || 'Attempts'}</h1>
            <p className="text-sm text-navy-500">Live view of student exam attempts and submission status.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                  <tr>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Timer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {(attempts || []).map((attempt: Record<string, unknown>) => {
                    const mock = attempt.mock_test as Record<string, unknown> | null;
                    return (
                      <tr key={attempt.id as string}>
                        <td className="px-4 py-3 font-medium text-navy-800">{mock?.title as string || 'Mock test'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-navy-500">{(attempt.user_id as string).slice(0, 8)}…</td>
                        <td className="px-4 py-3"><Badge variant={attempt.status === 'SUBMITTED' ? 'success' : attempt.status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>{attempt.status as string}</Badge></td>
                        <td className="px-4 py-3 text-xs text-navy-500">{new Date(attempt.started_at as string).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-navy-800">{attempt.score !== null ? Math.round(Number(attempt.score)) : '—'}{mock?.total_marks ? ` / ${mock.total_marks}` : ''}</td>
                        <td className="px-4 py-3 text-xs">{attempt.is_untimed ? <span className="text-emerald-600">Untimed</span> : <span className="text-navy-500">{attempt.duration_min ? `${attempt.duration_min} min` : '—'}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Users ──────────────────────────── */

export function AdminUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<Record<string, unknown> | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, referral_code, created_at, last_active_at, entry_source, birth_year, guardian_consent_at, suspended_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateRole = async (userId: string, role: string) => {
    setSavingId(userId);
    const { error } = await supabase.rpc('admin_set_user_role', { p_user_id: userId, p_role: role });
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Role changed to ${role}`);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const toggleSuspend = async (userId: string, currentStatus: string) => {
    setSavingId(userId);
    const { error } = await supabase.rpc('suspend_user', {
      p_user_id: userId,
      p_suspend: currentStatus !== 'SUSPENDED',
    });
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(currentStatus === 'SUSPENDED' ? 'User unsuspended' : 'User suspended');
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const confirmRemove = async () => {
    if (!removingUser) return;
    if (confirmEmail.trim().toLowerCase() !== String(removingUser.email || '').trim().toLowerCase()) {
      toast.error('Email does not match');
      return;
    }
    setRemoving(true);
    const { data, error } = await supabase.functions.invoke('admin-remove-user', {
      body: { target_id: removingUser.id },
    });
    setRemoving(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Could not remove user');
      return;
    }
    toast.success('User removed successfully');
    setRemovingUser(null);
    setConfirmEmail('');
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const filtered = (users || []).filter((u: Record<string, unknown>) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (!search) return true;
    const name = (u.full_name as string) || '';
    const email = (u.email as string) || '';
    return name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
  });

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    STUDENT: 'bg-blue-100 text-blue-700',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    PENDING_GUARDIAN: 'bg-amber-100 text-amber-700',
  };

  const isMinor = (u: Record<string, unknown>) => {
    const birthYear = Number(u.birth_year);
    if (!birthYear) return false;
    return new Date().getFullYear() - birthYear < 18;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.usersTitle' as string) || 'Users'}</h1>
          <p className="text-sm text-navy-500">Search users, manage roles, suspend accounts, and remove users with complete data deletion.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-navy-300 bg-white py-2.5 pl-10 pr-3 text-sm text-navy-900 placeholder:text-navy-400 focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_GUARDIAN">Pending guardian</option>
          </select>
        </div>

        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="grid gap-3">
            {filtered.map((u: Record<string, unknown>) => (
              <Card key={u.id as string}>
                <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-govt-100 font-bold text-govt-700">
                    {(u.full_name as string || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{u.full_name as string || 'No name'}</p>
                    <p className="truncate text-xs text-navy-500">{u.email as string}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-400">
                      {Boolean(u.entry_source) && <span>Source: {String(u.entry_source)}</span>}
                      <span>Joined: {new Date(u.created_at as string).toLocaleDateString()}</span>
                      {Boolean(u.last_active_at) && <span>Active: {new Date(String(u.last_active_at)).toLocaleDateString()}</span>}
                      {isMinor(u) && <span className="font-medium text-amber-600">Minor{Boolean(u.guardian_consent_at) ? ' · consent given' : ' · consent pending'}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', statusColors[u.status as string] || statusColors.ACTIVE)}>{u.status as string || 'ACTIVE'}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', roleColors[u.role as string] || roleColors.STUDENT)}>{u.role as string}</span>
                    <select
                      value={u.role as string}
                      onChange={(e) => updateRole(u.id as string, e.target.value)}
                      disabled={savingId === u.id || u.id === currentUser?.id}
                      className="rounded-lg border border-navy-300 px-2 py-1.5 text-xs text-navy-900"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {(u.role as string) !== 'ADMIN' && u.id !== currentUser?.id && (
                      <>
                        <button
                          onClick={() => toggleSuspend(u.id as string, u.status as string)}
                          disabled={savingId === u.id}
                          className={cn(
                            'flex h-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors',
                            u.status === 'SUSPENDED'
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          )}
                          title={u.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                        >
                          {u.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => { setRemovingUser(u); setConfirmEmail(''); }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50"
                          title="Remove user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedUser(expandedUser === u.id as string ? null : u.id as string)}
                  className="mt-3 text-xs font-medium text-govt-600 hover:text-govt-700"
                >
                  {expandedUser === u.id as string ? 'Hide details' : 'View consent history & attempts'}
                </button>
                {expandedUser === u.id as string && <UserDetailPanel userId={u.id as string} />}
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-navy-400">No users found.</p>}
          </div>
        )}

        {removingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-navy-900">Remove user permanently</h3>
              <p className="mb-1 text-sm text-navy-600">
                You are about to permanently delete <strong>{removingUser.full_name as string || 'this user'}</strong> and all their data.
              </p>
              <div className="mb-4 rounded-lg border border-navy-200 bg-navy-50 p-3 text-xs text-navy-600">
                <p className="mb-1 font-semibold text-navy-800">What will be deleted:</p>
                <ul className="space-y-0.5">
                  <li>Profile, attempts, responses, mastery scores, focus topics</li>
                  <li>Bookmarks, question reports, daily mocks, practice sets</li>
                  <li>Public profile, consent events, integrity events</li>
                  <li>Avatar storage files, personal mock tests</li>
                </ul>
                <p className="mb-1 mt-2 font-semibold text-navy-800">What will be kept (anonymised):</p>
                <ul className="space-y-0.5">
                  <li>Payment and invoice records (amounts stay, name removed)</li>
                  <li>Subscription history (plan stays, name removed)</li>
                  <li>Question authorship metadata (questions stay)</li>
                </ul>
              </div>
              <p className="mb-2 text-sm font-medium text-navy-700">
                Type the user's email to confirm: <span className="font-mono text-navy-900">{removingUser.email as string}</span>
              </p>
              <input
                type="text"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Type the email address…"
                className="mb-4 w-full rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setRemovingUser(null); setConfirmEmail(''); }} disabled={removing}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={confirmRemove}
                  disabled={removing || confirmEmail.trim().toLowerCase() !== String(removingUser.email || '').trim().toLowerCase()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {removing ? 'Removing…' : 'Delete permanently'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function UserDetailPanel({ userId }: { userId: string }) {
  const { data: consentEvents, isLoading: consentLoading } = useQuery({
    queryKey: ['admin-consent-events', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_events')
        .select('id, type, meta, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['admin-user-attempts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempts')
        .select('id, status, score, started_at, submitted_at, mock_test:mock_test_id(title, total_marks)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-navy-100 bg-navy-50 p-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-navy-500">Consent history</p>
        {consentLoading ? <Skeleton className="h-16 w-full" /> : consentEvents && consentEvents.length > 0 ? (
          <div className="space-y-1">
            {consentEvents.map((ev: Record<string, unknown>) => (
              <div key={ev.id as string} className="flex items-center gap-2 text-xs text-navy-600">
                <span className="rounded-full bg-govt-100 px-2 py-0.5 font-medium text-govt-700">{ev.type as string}</span>
                <span className="text-navy-400">{new Date(ev.created_at as string).toLocaleString()}</span>
                {ev.meta ? <span className="text-navy-400">· {JSON.stringify(ev.meta).slice(0, 80)}</span> : null}
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-navy-400">No consent events recorded.</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-navy-500">Recent attempts</p>
        {attemptsLoading ? <Skeleton className="h-16 w-full" /> : attempts && attempts.length > 0 ? (
          <div className="space-y-1">
            {attempts.map((att: Record<string, unknown>) => {
              const mock = att.mock_test as Record<string, unknown> | null;
              const score = Number(att.score) || 0;
              const total = Number(mock?.total_marks) || 0;
              return (
                <div key={att.id as string} className="flex items-center gap-2 text-xs text-navy-600">
                  <span className="font-medium text-navy-800">{mock?.title as string || 'Mock'}</span>
                  <span className="text-navy-400">{att.status as string}</span>
                  {att.status === 'SUBMITTED' && <span className="font-medium text-navy-700">{score}/{total}</span>}
                  <span className="text-navy-400">{new Date(att.started_at as string).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="text-xs text-navy-400">No attempts yet.</p>}
      </div>
    </div>
  );
}

/* ──────────────────────────── Deletion Requests ──────────────────────────── */

export function AdminDeletionRequestsPage() {
  const { t } = useTranslation();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('id, user_id, requested_by_role, source, status, requested_at, scheduled_for, completed_at, cancelled_at, profiles:user_id(full_name, email)')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const statusColors: Record<string, string> = {
    REQUESTED: 'bg-amber-100 text-amber-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Deletion Requests</h1>
          <p className="text-sm text-navy-500">Track student and admin-initiated account deletion requests.</p>
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                  <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Requested by</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Completed</th></tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {(requests || []).map((req: Record<string, unknown>) => {
                    const profile = req.profiles as Record<string, unknown> | null;
                    return (
                      <tr key={req.id as string}>
                        <td className="px-4 py-3 font-medium text-navy-800">{profile?.full_name as string || 'Unknown'}</td>
                        <td className="px-4 py-3 text-navy-600">{req.requested_by_role as string}</td>
                        <td className="px-4 py-3 text-navy-600">{req.source as string}</td>
                        <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', statusColors[req.status as string] || statusColors.REQUESTED)}>{req.status as string}</span></td>
                        <td className="px-4 py-3 text-xs text-navy-500">{new Date(req.requested_at as string).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-navy-500">{req.completed_at ? new Date(req.completed_at as string).toLocaleString() : '—'}</td>
                      </tr>
                    );
                  })}
                  {(!requests || requests.length === 0) && <tr><td colSpan={6} className="px-4 py-6 text-center text-navy-400">No deletion requests.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-govt-600" /> Deletion Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <DeletionAuditTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function DeletionAuditTable() {
  const { data: audit, isLoading } = useQuery({
    queryKey: ['admin-deletion-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deletion_audit')
        .select('id, subject_hash, actor_role, tables_cleared, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!audit || audit.length === 0) return <p className="py-4 text-center text-sm text-navy-400">No deletion audit entries.</p>;

  return (
    <div className="space-y-2">
      {audit.map((row: Record<string, unknown>) => (
        <div key={row.id as string} className="flex items-start gap-3 rounded-lg border border-navy-100 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-500">{row.actor_role as string === 'ADMIN' ? 'A' : row.actor_role as string === 'STUDENT' ? 'S' : 'Sys'}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-navy-500">{String(row.subject_hash).slice(0, 16)}…</p>
            <p className="mt-1 text-xs text-navy-400">{Object.keys(row.tables_cleared as Record<string, unknown> || {}).length} tables cleared</p>
          </div>
          <span className="shrink-0 text-xs text-navy-400">{new Date(row.created_at as string).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── Rankings ──────────────────────────── */

export function AdminRankingsPage() {
  const { t } = useTranslation();
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['admin-leaderboard', subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_subject_id: subjectId ?? 0,
        p_limit: 50,
      });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topAttempts } = useQuery({
    queryKey: ['admin-top-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, user_id, mock_test:mock_test_id(title, total_marks), profiles:user_id(full_name)')
        .eq('status', 'SUBMITTED')
        .order('score', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.rankingsTitle' as string) || 'Rankings'}</h1>
          <p className="text-sm text-navy-500">View top performers across subjects and mock tests.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-amber-500" /> Top Scorers (All Mocks)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                <tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Mock</th><th className="px-4 py-3">Score</th></tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {(topAttempts || []).map((att: Record<string, unknown>, idx: number) => {
                  const mock = att.mock_test as Record<string, unknown> | null;
                  const profile = att.profiles as Record<string, unknown> | null;
                  const score = Number(att.score) || 0;
                  const total = Number(mock?.total_marks) || 0;
                  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                  return (
                    <tr key={att.id as string}>
                      <td className="px-4 py-3"><span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-500')}>{idx + 1}</span></td>
                      <td className="px-4 py-3 font-medium text-navy-800">{profile?.full_name as string || 'Unknown'}</td>
                      <td className="px-4 py-3 text-navy-600">{mock?.title as string || '—'}</td>
                      <td className="px-4 py-3"><span className="font-bold text-navy-900">{score}</span><span className="text-navy-400">/{total} ({pct}%)</span></td>
                    </tr>
                  );
                })}
                {(!topAttempts || topAttempts.length === 0) && <tr><td colSpan={4} className="px-4 py-6 text-center text-navy-400">No submitted attempts yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-govt-600" /> Subject Mastery Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => setSubjectId(null)} className={cn('rounded-full px-3 py-1.5 text-sm font-medium', subjectId === null ? 'bg-govt-700 text-white' : 'bg-gray-100 text-navy-600 hover:bg-gray-200')}>All Subjects</button>
              {(subjects || []).map((s: Record<string, unknown>) => (
                <button key={s.id as number} onClick={() => setSubjectId(s.id as number)} className={cn('rounded-full px-3 py-1.5 text-sm font-medium', subjectId === s.id ? 'bg-govt-700 text-white' : 'bg-gray-100 text-navy-600 hover:bg-gray-200')}>{s.name as string}</button>
              ))}
            </div>
            {isLoading ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-1">
                {(leaderboard || []).slice(0, 15).map((row: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-navy-50">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-500">{idx + 1}</span>
                    <span className="flex-1 truncate text-sm font-medium text-navy-900">{row.handle as string}</span>
                    <span className="text-xs text-navy-400">{row.belt as string}</span>
                    <span className="text-sm font-bold text-navy-800 tabular-nums">{Math.round(Number(row.score))}</span>
                  </div>
                ))}
                {(!leaderboard || leaderboard.length === 0) && <p className="py-4 text-center text-sm text-navy-400">No leaderboard data yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Proctoring ──────────────────────────── */

/* ──────────────────────────── Billing ──────────────────────────── */

export function AdminBillingPage() {
  const { t } = useTranslation();
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['admin-ai-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_ledger')
        .select('id, purpose, tokens_in, tokens_out, cost_paise, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userCounts } = useQuery({
    queryKey: ['admin-billing-users'],
    queryFn: async () => {
      const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: students } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT');
      return { total: total ?? 0, students: students ?? 0 };
    },
  });

  const totalCost = (usage || []).reduce((sum: number, u: Record<string, unknown>) => sum + Number(u.cost_paise || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.billingTitle' as string) || 'Billing'}</h1>
          <p className="text-sm text-navy-500">Track AI usage costs and subscription metrics.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-100"><Users className="h-5 w-5 text-govt-700" /></div><div><p className="text-2xl font-bold text-navy-900">{userCounts?.total ?? '—'}</p><p className="text-xs text-navy-500">Total Users</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><CreditCard className="h-5 w-5 text-blue-700" /></div><div><p className="text-2xl font-bold text-navy-900">{userCounts?.students ?? '—'}</p><p className="text-xs text-navy-500">Students</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"><DollarSign className="h-5 w-5 text-amber-700" /></div><div><p className="text-2xl font-bold text-navy-900">₹{(totalCost / 100).toFixed(2)}</p><p className="text-xs text-navy-500">AI Cost (Total)</p></div></div></CardContent></Card>
        </div>

        {usageLoading ? <Skeleton className="h-48 w-full" /> : (
          <Card>
            <CardHeader><CardTitle className="text-base">AI Usage Ledger</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                  <tr><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Tokens In</th><th className="px-4 py-3">Tokens Out</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {(usage || []).map((u: Record<string, unknown>) => (
                    <tr key={u.id as string}>
                      <td className="px-4 py-3 font-medium text-navy-800">{u.purpose as string}</td>
                      <td className="px-4 py-3 tabular-nums text-navy-600">{u.tokens_in as number}</td>
                      <td className="px-4 py-3 tabular-nums text-navy-600">{u.tokens_out as number}</td>
                      <td className="px-4 py-3 font-semibold text-navy-800">₹{(Number(u.cost_paise) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-navy-500">{new Date(u.created_at as string).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!usage || usage.length === 0) && <tr><td colSpan={5} className="px-4 py-6 text-center text-navy-400">No AI usage recorded yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Resources ──────────────────────────── */

export function AdminResourcesPage() {
  const { t } = useTranslation();
  const { data: chapters, isLoading } = useQuery({
    queryKey: ['admin-resources-chapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, class_level, subject:subject_id(name), questions:questions(count)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.resourcesTitle' as string) || 'Resources'}</h1>
          <p className="text-sm text-navy-500">Chapter-wise question counts and resource availability.</p>
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(chapters || []).map((ch: Record<string, unknown>) => {
              const subject = ch.subject as Record<string, unknown> | null;
              const questions = ch.questions as { count: number }[] | null;
              const qCount = questions?.[0]?.count ?? 0;
              return (
                <Card key={ch.id as number}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-lg bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">{subject?.name as string || 'Other'}</span>
                      <span className="text-xs text-navy-400">Class {ch.class_level as number}</span>
                    </div>
                    <p className="text-sm font-semibold text-navy-900">{ch.name as string}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-navy-400" />
                      <span className="text-navy-500">{qCount} questions</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Content ──────────────────────────── */

export function AdminContentPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: mocks, isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, category, status, visibility, kind, mode')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleStatus = async (mock: Record<string, unknown>) => {
    setSavingId(mock.id as string);
    const newStatus = mock.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    await supabase.from('mock_tests').update({ status: newStatus }).eq('id', mock.id as string);
    setSavingId(null);
    queryClient.invalidateQueries({ queryKey: ['admin-content'] });
  };

  const categoryLabels: Record<string, string> = {
    FULL_SYLLABUS: 'Full Syllabus',
    SUBJECT_TEST: 'Subject Test',
    CHAPTER_TEST: 'Chapter Test',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.contentTitle' as string) || 'Content Management'}</h1>
          <p className="text-sm text-navy-500">Publish, archive, and manage mock test visibility.</p>
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="grid gap-3">
            {(mocks || []).map((mock: Record<string, unknown>) => (
              <Card key={mock.id as string}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-govt-100 text-govt-700">
                    <LayoutTemplate className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{mock.title as string}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-navy-400">
                      <span>{categoryLabels[mock.category as string] || mock.category as string}</span>
                      <span>{mock.kind as string}</span>
                      <span>{mock.mode as string}</span>
                      <span>Visibility: {mock.visibility as string}</span>
                    </div>
                  </div>
                  <Badge variant={mock.status === 'PUBLISHED' ? 'success' : mock.status === 'ARCHIVED' ? 'error' : 'neutral'}>{mock.status as string}</Badge>
                  <Button size="sm" variant={mock.status === 'PUBLISHED' ? 'outline' : 'primary'} onClick={() => toggleStatus(mock)} disabled={savingId === mock.id}>
                    {savingId === mock.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    {mock.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Support ──────────────────────────── */

export function AdminSupportPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, user_id, type, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ['admin-support-inquiries', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_inquiries')
        .select('id, name, email, subject, message, status, internal_notes, handled_by, created_at, updated_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'ALL') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const selected = (inquiries || []).find((i) => i.id === selectedId) || null;

  const updateInquiry = async (
    id: string,
    patch: { status?: string; internal_notes?: string },
  ) => {
    setSavingId(id);
    const payload: Record<string, unknown> = {};
    if (patch.status) {
      payload.status = patch.status;
      payload.handled_by = currentUser?.id;
    }
    if (patch.internal_notes !== undefined) payload.internal_notes = patch.internal_notes;
    const { error } = await supabase.from('support_inquiries').update(payload).eq('id', id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Inquiry updated');
      queryClient.invalidateQueries({ queryKey: ['admin-support-inquiries'] });
    }
  };

  const typeColors: Record<string, string> = {
    INACTIVE_2D: 'bg-amber-100 text-amber-700',
    INACTIVE_3D: 'bg-red-100 text-red-700',
    GUARDIAN_CONSENT: 'bg-blue-100 text-blue-700',
    UNSUBSCRIBE: 'bg-neutral-100 text-neutral-700',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.supportTitle' as string) || 'Support'}</h1>
          <p className="text-sm text-navy-500">Review contact-form submissions and manage their status. Notification log is shown below.</p>
        </div>

        {/* Support Inquiries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Inquiries</CardTitle>
            <CardDescription>Submitted through the public Contact page. Update status or add internal notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === s ? 'bg-govt-600 text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200',
                  )}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {inquiriesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (inquiries || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-navy-400">No inquiries in this view.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {(inquiries || []).map((inq) => (
                      <tr key={inq.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-navy-900">{inq.name}</p>
                          <p className="text-xs text-navy-500">{inq.email}</p>
                        </td>
                        <td className="px-4 py-3 text-navy-700">{inq.subject}</td>
                        <td className="px-4 py-3">
                          <select
                            value={inq.status}
                            onChange={(e) => updateInquiry(inq.id, { status: e.target.value })}
                            disabled={savingId === inq.id}
                            className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold border-0', statusColors[inq.status])}
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-navy-500">{new Date(inq.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(inq.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected && (
              <div className="mt-4 rounded-lg border border-navy-200 bg-navy-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-navy-900">{selected.name} · {selected.email}</h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs font-medium text-navy-500">Subject</p>
                <p className="mb-3 text-sm text-navy-800">{selected.subject}</p>
                <p className="text-xs font-medium text-navy-500">Message</p>
                <p className="mb-3 whitespace-pre-wrap text-sm text-navy-800">{selected.message}</p>
                <p className="text-xs font-medium text-navy-500">Internal Notes (staff only)</p>
                <textarea
                  value={selected.internal_notes || ''}
                  onChange={(e) => {
                    const updated = (inquiries || []).map((i) => i.id === selected.id ? { ...i, internal_notes: e.target.value } : i);
                    queryClient.setQueryData(['admin-support-inquiries', statusFilter], updated);
                  }}
                  rows={3}
                  className="input mt-1"
                  placeholder="Add notes for staff reference..."
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => updateInquiry(selected.id, { internal_notes: selected.internal_notes || '' })}
                    disabled={savingId === selected.id}
                  >
                    {savingId === selected.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Notes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Log</CardTitle>
            <CardDescription>Automated notifications sent to students.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {notificationsLoading ? <Skeleton className="h-48 w-full" /> : (
              <table className="w-full text-sm">
                <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                  <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Sent</th></tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {(notifications || []).map((n: Record<string, unknown>) => (
                    <tr key={n.id as string}>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', typeColors[n.type as string] || 'bg-navy-100 text-navy-600')}>{n.type as string}</span></td>
                      <td className="px-4 py-3 font-mono text-xs text-navy-500">{(n.user_id as string).slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-xs text-navy-500">{new Date(n.sent_at as string).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!notifications || notifications.length === 0) && <tr><td colSpan={3} className="px-4 py-6 text-center text-navy-400">No notifications sent yet.</td></tr>}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────── Settings ──────────────────────────── */

interface PlatformSetting {
  key: string;
  value: { enabled?: boolean; value?: string };
}

const FEATURE_TOGGLES: { key: string; label: string; desc: string; icon: typeof Bell }[] = [
  { key: 'feature_mock_tests', label: 'Mock Tests', desc: 'Show mock tests to students', icon: FileText },
  { key: 'feature_daily_practice', label: 'Daily Practice (DPP)', desc: 'Enable daily practice sets', icon: Bell },
  { key: 'feature_mistake_notebook', label: 'Mistake Notebook', desc: 'Let students review mistakes', icon: Activity },
  { key: 'feature_leaderboard', label: 'Leaderboard', desc: 'National and per-subject rankings', icon: Trophy },
  { key: 'feature_ai_studio', label: 'AI Studio', desc: 'AI-generated question practice', icon: BarChart3 },
  { key: 'feature_bookmarks', label: 'Bookmarks', desc: 'Save questions for later', icon: Eye },
  { key: 'feature_study_plan', label: 'Study Plan', desc: 'Personalized study schedules', icon: Clock },
  { key: 'feature_email_otp', label: 'Email OTP Verification', desc: 'Require 6-digit email code after signup', icon: ShieldCheck },
];

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [textEdits, setTextEdits] = useState<Record<string, string>>({});
  const [savingText, setSavingText] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['admin-settings-stats'],
    queryFn: async () => {
      const [profiles, chapters] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
      ]);
      return { profiles: profiles.count ?? 0, chapters: chapters.count ?? 0 };
    },
  });

  const { data: migrations } = useQuery({
    queryKey: ['admin-migrations'],
    queryFn: async () => {
      const { error } = await supabase.rpc('get_mock_leaderboard', { p_mock_test_id: '00000000-0000-0000-0000-000000000000', p_limit: 1 });
      return { rpcOk: !error };
    },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<PlatformSetting[]>({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('key, value');
      if (error) throw error;
      return (data || []) as PlatformSetting[];
    },
  });

  const settingsMap = new Map((settings || []).map((s) => [s.key, s.value]));

  const toggleFeature = async (key: string, enabled: boolean) => {
    setSavingKey(key);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: { enabled }, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', key);
    setSavingKey(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${key.replace('feature_', '').replace(/_/g, ' ')} ${enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    }
  };

  const saveTextSetting = async (key: string) => {
    const val = textEdits[key];
    if (val === undefined) return;
    setSavingText(key);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: { value: val }, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', key);
    setSavingText(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Setting saved');
      setTextEdits((prev) => { const next = { ...prev }; delete next[key]; return next; });
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      toast.error('Display name must be 2-120 characters.');
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmedName, avatar_url: avatarUrl.trim() || null })
      .eq('id', user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Your details have been updated.');
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-settings-stats'] });
      await refreshProfile();
    }
  };

  const platformName = textEdits['platform_name'] ?? settingsMap.get('platform_name')?.value ?? 'Mock Ninja';
  const supportEmail = textEdits['support_email'] ?? settingsMap.get('support_email')?.value ?? DEFAULT_SUPPORT_EMAIL;
  const maintenanceMode = settingsMap.get('maintenance_mode')?.enabled ?? false;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('admin.settingsTitle' as string) || 'Settings'}</h1>
          <p className="text-sm text-navy-500">System overview, admin info, and platform health.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govt-100"><Database className="h-5 w-5 text-govt-700" /></div><div><p className="text-2xl font-bold text-navy-900">{stats?.profiles ?? '—'}</p><p className="text-xs text-navy-500">Profiles</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><FolderOpen className="h-5 w-5 text-blue-700" /></div><div><p className="text-2xl font-bold text-navy-900">{stats?.chapters ?? '—'}</p><p className="text-xs text-navy-500">Chapters</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><Lock className="h-5 w-5 text-emerald-700" /></div><div><p className="text-2xl font-bold text-navy-900">RLS</p><p className="text-xs text-navy-500">All tables enabled</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"><Activity className="h-5 w-5 text-amber-700" /></div><div><p className="text-2xl font-bold text-navy-900">{migrations?.rpcOk ? 'OK' : '—'}</p><p className="text-xs text-navy-500">RPC Health</p></div></div></CardContent></Card>
        </div>

        {/* Admin Account */}
        <Card>
          <CardHeader><CardTitle className="text-base">Admin Account</CardTitle><CardDescription>Edit your personal details. Changes apply across the admin panel and dashboard.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-govt-700 text-lg font-bold text-white overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (profile?.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-navy-500">{profile?.email}</p>
                <p className="text-xs text-navy-400">Role: {profile?.role}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-navy-500">Display Name
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-navy-300 px-3 py-2 text-sm text-navy-900"
                />
              </label>
              <label className="text-xs text-navy-500">Avatar URL (optional)
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-navy-300 px-3 py-2 text-sm text-navy-900"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={saveProfile} disabled={savingProfile || fullName.trim().length < 2}>
                {savingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Configuration</CardTitle>
            <CardDescription>Core platform details shown across the site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-navy-500">Platform Name
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setTextEdits((p) => ({ ...p, platform_name: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-navy-300 px-3 py-2 text-sm text-navy-900"
                    />
                  </label>
                  <label className="text-xs text-navy-500">Support Email
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setTextEdits((p) => ({ ...p, support_email: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-navy-300 px-3 py-2 text-sm text-navy-900"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => saveTextSetting('platform_name')} disabled={savingText === 'platform_name'}>
                    {savingText === 'platform_name' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Platform Name
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => saveTextSetting('support_email')} disabled={savingText === 'support_email'}>
                    {savingText === 'support_email' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Support Email
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Toggles</CardTitle>
            <CardDescription>Enable or disable features visible to students. Changes take effect immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              FEATURE_TOGGLES.map((feat) => {
                const Icon = feat.icon;
                const enabled = settingsMap.get(feat.key)?.enabled ?? false;
                const isSaving = savingKey === feat.key;
                return (
                  <div key={feat.key} className="flex items-center justify-between rounded-lg border border-navy-200 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-navy-500" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{feat.label}</p>
                        <p className="text-xs text-navy-500">{feat.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFeature(feat.key, !enabled)}
                      disabled={isSaving}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        enabled ? 'bg-emerald-500' : 'bg-navy-200',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        enabled ? 'translate-x-5' : 'translate-x-0.5',
                      )} />
                    </button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className={cn(maintenanceMode && 'border-amber-300 bg-amber-50/50')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>When enabled, visitors and students see a maintenance page. Admins keep full access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-900">{maintenanceMode ? 'Currently ON' : 'Currently OFF'}</p>
                <p className="text-xs text-navy-500">{maintenanceMode ? 'Visitors and students cannot use the platform.' : 'Platform is fully operational.'}</p>
              </div>
              <button
                onClick={() => toggleFeature('maintenance_mode', !maintenanceMode)}
                disabled={savingKey === 'maintenance_mode'}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  maintenanceMode ? 'bg-amber-500' : 'bg-navy-200',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  maintenanceMode ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Features (static info) */}
        <Card>
          <CardHeader><CardTitle className="text-base">System Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Row Level Security', value: 'Enabled on all tables', icon: Lock, color: 'text-emerald-600' },
              { label: 'Server-side Grading', value: 'Edge function (exam)', icon: ShieldCheck, color: 'text-emerald-600' },
              { label: 'Timer Preferences', value: 'Standard / Custom / Untimed', icon: Clock, color: 'text-blue-600' },
              { label: 'National Leaderboard', value: 'Per-mock + per-subject', icon: Trophy, color: 'text-amber-600' },
              { label: 'Notification System', value: 'Inactive nudges + guardian consent', icon: Bell, color: 'text-navy-600' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-3 rounded-lg border border-navy-200 p-3">
                  <Icon className={cn('h-5 w-5', f.color)} />
                  <div>
                    <p className="text-sm font-medium text-navy-900">{f.label}</p>
                    <p className="text-xs text-navy-500">{f.value}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}


export function AdminSiteSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [global, setGlobal] = useState({
    site_name: 'Mock Ninja',
    tagline: 'Practice. Analyse. Excel.',
    support_email: DEFAULT_SUPPORT_EMAIL,
    default_language: 'en',
    seo_title: 'Mock Ninja — JEE Main Practice Platform',
    seo_description: 'Master JEE Main with NTA-style mock tests and practice questions.',
    share_image: '',
    legal_entity_name: '',
    copyright_line: '© 2026 Mock Ninja. All rights reserved.',
    grievance_officer_name: '',
    grievance_officer_email: '',
  });

  const [contactDesks, setContactDesks] = useState([
    { label: 'Support', type: 'SUPPORT', email: DEFAULT_SUPPORT_EMAIL, phone: '', whatsapp: '', hours: 'Mon–Fri, 9 AM–6 PM IST', address: '', response_time: '2 days' },
  ]);

  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([
    { platform: 'YouTube', url: '' },
    { platform: 'Instagram', url: '' },
    { platform: 'X', url: '' },
    { platform: 'Telegram', url: '' },
  ]);

  const { data: savedSettings } = useQuery({
    queryKey: ['site-settings-draft'],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['SITE_GLOBAL_DRAFT', 'CONTACT_DESKS_DRAFT', 'SOCIAL_LINKS_DRAFT', 'SITE_GLOBAL_PUBLISHED']);
      if (qError) throw qError;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.key] = row.value;
      }
      return map;
    },
  });

  // Load saved settings into state when first loaded
  useEffect(() => {
    if (savedSettings?.SITE_GLOBAL_DRAFT) {
      setGlobal((prev) => ({ ...prev, ...(savedSettings.SITE_GLOBAL_DRAFT as Record<string, string>) }));
    }
    if (savedSettings?.CONTACT_DESKS_DRAFT) {
      setContactDesks(savedSettings.CONTACT_DESKS_DRAFT as typeof contactDesks);
    }
    if (savedSettings?.SOCIAL_LINKS_DRAFT) {
      setSocialLinks(savedSettings.SOCIAL_LINKS_DRAFT as typeof socialLinks);
    }
  }, [savedSettings]);

  const validateEmail = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getSettingsError = (): string | null => {
    if (!validateEmail(global.support_email)) return 'Support email is invalid.';
    if (global.grievance_officer_email && !validateEmail(global.grievance_officer_email)) return 'Grievance officer email is invalid.';
    for (const link of socialLinks) {
      if (!isAllowedSocialUrl(link.platform, link.url)) {
        return `Social link for ${link.platform} must be an https link on that platform's domain.`;
      }
    }
    for (const desk of contactDesks) {
      if (desk.email && !validateEmail(desk.email)) return `Contact desk "${desk.label}" has an invalid email.`;
    }
    return null;
  };

  const handleSaveDraft = async () => {
    const validationError = getSettingsError();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);

    try {
      await supabase.from('platform_settings').upsert([
        { key: 'SITE_GLOBAL_DRAFT', value: global },
        { key: 'CONTACT_DESKS_DRAFT', value: contactDesks },
        { key: 'SOCIAL_LINKS_DRAFT', value: socialLinks },
      ], { onConflict: 'key' });
      toast.success('Draft saved');
      queryClient.invalidateQueries({ queryKey: ['site-settings-draft'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const validationError = getSettingsError();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      // Publish: copy draft values to published keys
      await supabase.from('platform_settings').upsert([
        { key: 'SITE_GLOBAL_PUBLISHED', value: { ...global, contact_desks: contactDesks, social_links: socialLinks } },
      ], { onConflict: 'key' });
      toast.success('Site settings published');
      queryClient.invalidateQueries({ queryKey: ['site-settings-draft'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const addContactDesk = () => {
    setContactDesks([...contactDesks, { label: '', type: 'SUPPORT', email: '', phone: '', whatsapp: '', hours: '', address: '', response_time: '' }]);
  };

  const removeContactDesk = (i: number) => {
    setContactDesks(contactDesks.filter((_, idx) => idx !== i));
  };

  const updateContactDesk = (i: number, field: string, value: string) => {
    const next = [...contactDesks];
    next[i] = { ...next[i], [field]: value };
    setContactDesks(next);
  };

  const updateSocialLink = (i: number, field: 'platform' | 'url', value: string) => {
    const next = [...socialLinks];
    next[i] = { ...next[i], [field]: value };
    setSocialLinks(next);
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'OTHER', url: '' }]);
  };

  const removeSocialLink = (i: number) => {
    setSocialLinks(socialLinks.filter((_, idx) => idx !== i));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Site Settings</h1>
          <p className="text-sm text-navy-500">Contact desks, social links, and global site settings. Edit a draft, then publish.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Global settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Global</CardTitle>
            <CardDescription>Site name, SEO, legal entity, and grievance officer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Site name</label>
                <input
                  type="text"
                  value={global.site_name}
                  onChange={(e) => setGlobal({ ...global, site_name: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Tagline</label>
                <input
                  type="text"
                  value={global.tagline}
                  onChange={(e) => setGlobal({ ...global, tagline: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Support email</label>
                <input
                  type="email"
                  value={global.support_email}
                  onChange={(e) => setGlobal({ ...global, support_email: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Default language</label>
                <select
                  value={global.default_language}
                  onChange={(e) => setGlobal({ ...global, default_language: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">SEO title</label>
                <input
                  type="text"
                  value={global.seo_title}
                  onChange={(e) => setGlobal({ ...global, seo_title: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">SEO description</label>
                <input
                  type="text"
                  value={global.seo_description}
                  onChange={(e) => setGlobal({ ...global, seo_description: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Share image URL</label>
                <input
                  type="text"
                  value={global.share_image}
                  onChange={(e) => setGlobal({ ...global, share_image: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Legal entity name</label>
                <input
                  type="text"
                  value={global.legal_entity_name}
                  onChange={(e) => setGlobal({ ...global, legal_entity_name: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Copyright line</label>
                <input
                  type="text"
                  value={global.copyright_line}
                  onChange={(e) => setGlobal({ ...global, copyright_line: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Grievance officer name</label>
                <input
                  type="text"
                  value={global.grievance_officer_name}
                  onChange={(e) => setGlobal({ ...global, grievance_officer_name: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Grievance officer email</label>
                <input
                  type="email"
                  value={global.grievance_officer_email}
                  onChange={(e) => setGlobal({ ...global, grievance_officer_email: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact desks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Contact Desks</CardTitle>
                <CardDescription>Support, grievance, press, and other contact points.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addContactDesk}>
                <Plus className="h-4 w-4" /> Add desk
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactDesks.map((desk, i) => (
              <div key={i} className="rounded-lg border border-navy-200 bg-navy-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-500">Desk {i + 1}</span>
                  <button onClick={() => removeContactDesk(i)} className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Label"
                    value={desk.label}
                    onChange={(e) => updateContactDesk(i, 'label', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <select
                    value={desk.type}
                    onChange={(e) => updateContactDesk(i, 'type', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  >
                    <option value="SUPPORT">Support</option>
                    <option value="GRIEVANCE">Grievance</option>
                    <option value="PRESS">Press</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input
                    type="email"
                    placeholder="Email"
                    value={desk.email}
                    onChange={(e) => updateContactDesk(i, 'email', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (+91...)"
                    value={desk.phone}
                    onChange={(e) => updateContactDesk(i, 'phone', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp number"
                    value={desk.whatsapp}
                    onChange={(e) => updateContactDesk(i, 'whatsapp', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Working hours"
                    value={desk.hours}
                    onChange={(e) => updateContactDesk(i, 'hours', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Postal address"
                    value={desk.address}
                    onChange={(e) => updateContactDesk(i, 'address', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Response time"
                    value={desk.response_time}
                    onChange={(e) => updateContactDesk(i, 'response_time', e.target.value)}
                    className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Social links */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Social Links</CardTitle>
                <CardDescription>Platform links. URLs must be https.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addSocialLink}>
                <Plus className="h-4 w-4" /> Add link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-3">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocialLink(i, 'platform', e.target.value)}
                  className="rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                >
                  <option value="YouTube">YouTube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="X">X</option>
                  <option value="Telegram">Telegram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                  className="flex-1 rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none"
                />
                <button onClick={() => removeSocialLink(i)} className="text-red-500 hover:text-red-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button variant="primary" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
