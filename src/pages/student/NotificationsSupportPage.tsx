import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, LifeBuoy, Clock, CheckCircle2, AlertCircle, Loader2,
  MessageSquare, ChevronRight, Plus, X, Send, Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { DEFAULT_SUPPORT_EMAIL, useSupportEmail } from '@/lib/site-settings';

interface SupportInquiry {
  id: string;
  subject: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface NotificationLog {
  id: string;
  type: string;
  sent_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral'; icon: typeof CheckCircle2 }> = {
  OPEN: { label: 'Open', variant: 'error', icon: AlertCircle },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning', icon: Clock },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
};

const notifTypeLabels: Record<string, string> = {
  INACTIVE_2D: 'Inactivity reminder',
  INACTIVE_3D: 'Final inactivity reminder',
  GUARDIAN_CONSENT: 'Guardian consent',
  UNSUBSCRIBE: 'Unsubscribe confirmation',
};

export function NotificationsSupportPage() {
  const { data: supportEmail = DEFAULT_SUPPORT_EMAIL } = useSupportEmail();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [search, setSearch] = useState('');

  const { data: inquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ['my-support-inquiries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('support_inquiries')
        .select('id, subject, status, message, created_at, updated_at, resolved_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SupportInquiry[];
    },
    enabled: !!user,
  });

  const { data: notifications, isLoading: notifLoading } = useQuery({
    queryKey: ['my-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, type, sent_at')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as NotificationLog[];
    },
    enabled: !!user,
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in');
      const { error } = await supabase.from('support_inquiries').insert({
        name: user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Your ticket has been submitted. We aim to resolve it within 2 days.');
      setShowNewTicket(false);
      setTicketSubject('');
      setTicketMessage('');
      queryClient.invalidateQueries({ queryKey: ['my-support-inquiries'] });
    },
    onError: () => {
      toast.error('Could not submit your ticket. Please try again.');
    },
  });

  const filteredInquiries = (inquiries || []).filter((inq) => {
    if (!search) return true;
    return inq.subject.toLowerCase().includes(search.toLowerCase()) ||
      inq.message.toLowerCase().includes(search.toLowerCase());
  });

  const openCount = (inquiries || []).filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const resolvedCount = (inquiries || []).filter((i) => i.status === 'RESOLVED').length;

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications & Support</h1>
            <p className="text-sm text-navy-400">Track your support tickets and review platform notifications.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowNewTicket(true)}>
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{openCount}</p>
                <p className="text-xs text-navy-400">Open Tickets</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{resolvedCount}</p>
                <p className="text-xs text-navy-400">Resolved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#11121c]">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/10 text-govt-300">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{notifications?.length ?? 0}</p>
                <p className="text-xs text-navy-400">Notifications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA banner */}
        <div className="flex items-start gap-3 rounded-xl border border-govt-400/20 bg-govt-500/5 p-4">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-govt-300" />
          <div>
            <p className="text-sm font-semibold text-govt-100">2-day resolution goal</p>
            <p className="mt-1 text-xs text-govt-100/70">
              We aim to resolve all support tickets within 2 business days. For urgent issues, reach us on WhatsApp or at {supportEmail}.
            </p>
          </div>
        </div>

        {/* Support tickets */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-white">My Support Tickets</CardTitle>
                <CardDescription className="text-navy-400">Track the status of your submitted tickets</CardDescription>
              </div>
              {(inquiries || []).length > 0 && (
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/[.04] py-2 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {inquiriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-govt-400" />
              </div>
            ) : (inquiries || []).length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-navy-500">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-300">No support tickets yet</p>
                  <p className="mt-1 text-xs text-navy-500">If you need help, click "New Ticket" to submit a request.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNewTicket(true)}>
                  <Plus className="h-4 w-4" /> Create a ticket
                </Button>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="py-8 text-center text-sm text-navy-400">No tickets match your search.</div>
            ) : (
              filteredInquiries.map((inq) => {
                const sc = statusConfig[inq.status] || statusConfig.OPEN;
                const SIcon = sc.icon;
                return (
                  <div key={inq.id} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={sc.variant}>
                            <SIcon className="h-3 w-3" /> {sc.label}
                          </Badge>
                          <span className="text-xs text-navy-400">{new Date(inq.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{inq.subject}</p>
                        <p className="mt-1 text-sm text-navy-300 line-clamp-2">{inq.message}</p>
                        {inq.resolved_at && (
                          <p className="mt-2 text-xs text-emerald-400">
                            Resolved on {new Date(inq.resolved_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-white/10 bg-[#11121c]">
          <CardHeader>
            <CardTitle className="text-base text-white">Notifications</CardTitle>
            <CardDescription className="text-navy-400">Automated reminders and alerts sent to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-govt-400" />
              </div>
            ) : (notifications || []).length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-navy-500">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm text-navy-400">No notifications yet.</p>
              </div>
            ) : (
              (notifications || []).map((n) => (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[.02] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-govt-500/10 text-govt-300">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{notifTypeLabels[n.type] || n.type}</p>
                    <p className="text-xs text-navy-400">{new Date(n.sent_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/contact">
            <Card className="border-white/10 bg-[#11121c] transition-[transform,border-color] hover:border-white/20 hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Contact Support</p>
                  <p className="text-xs text-navy-400">WhatsApp or email us at {supportEmail}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-navy-500" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/billing">
            <Card className="border-white/10 bg-[#11121c] transition-[transform,border-color] hover:border-white/20 hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Billing & Refunds</p>
                  <p className="text-xs text-navy-400">View transactions and request refunds</p>
                </div>
                <ChevronRight className="h-5 w-5 text-navy-500" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* New ticket modal */}
        {showNewTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-md border-white/15 bg-[#15161f]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">New Support Ticket</CardTitle>
                  <button onClick={() => setShowNewTicket(false)} className="text-navy-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-navy-300">Subject</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Briefly describe the issue"
                    className="w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-navy-300">Message</label>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your issue in detail..."
                    className="w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-navy-500">Resolution goal: within 2 business days.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    onClick={() => createTicketMutation.mutate()}
                    loading={createTicketMutation.isPending}
                    disabled={ticketSubject.trim().length < 3 || ticketMessage.trim().length < 10}
                  >
                    <Send className="h-4 w-4" /> Submit Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
