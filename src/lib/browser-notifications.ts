import { supabase } from '@/lib/supabase';

const LAST_SEEN_KEY = 'mock-ninja-notification-seen-at';

export type BrowserNotificationKind = 'DAILY_PRACTICE' | 'SUPPORT_REPLY' | 'INACTIVE_2D' | 'INACTIVE_3D';

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

function notificationCopy(type: string): { title: string; body: string } {
  if (type === 'SUPPORT_REPLY') {
    return { title: 'Support replied', body: 'Your Mock Ninja support ticket has a new reply.' };
  }
  return { title: 'Daily practice reminder', body: 'Your next practice session is ready on Mock Ninja.' };
}

export function showBrowserNotification(type: string): void {
  if (!canNotify()) return;
  const copy = notificationCopy(type);
  const notification = new Notification(copy.title, {
    body: copy.body,
    icon: '/images/mock-ninja-icon-transparent.png',
    tag: `mock-ninja-${type}`,
  });
  notification.onclick = () => {
    window.focus();
    window.location.href = type === 'SUPPORT_REPLY' ? '/notifications' : '/dpp';
  };
}

export async function enableBrowserNotifications(userId: string): Promise<{ enabled: boolean; message: string }> {
  if (!('Notification' in window)) {
    return { enabled: false, message: 'This browser does not support notifications.' };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { enabled: false, message: 'Notification permission was not granted.' };
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      const json = existingSubscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
        await supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });
      }
    }
  }

  localStorage.removeItem(LAST_SEEN_KEY);
  return { enabled: true, message: 'Browser notifications are enabled.' };
}

export async function disableBrowserNotifications(userId: string): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
      await subscription.unsubscribe();
    }
  }
}

export function watchBrowserNotifications(userId: string): () => void {
  let active = true;
  const deliverNew = (rows: Array<{ id: string; type: string; sent_at: string }>) => {
    if (!active) return;
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || new Date(0).toISOString();
    const fresh = rows.filter((row) => new Date(row.sent_at).getTime() > new Date(lastSeen).getTime());
    fresh.slice(0, 3).forEach((row) => showBrowserNotification(row.type));
    if (rows[0]?.sent_at) localStorage.setItem(LAST_SEEN_KEY, rows[0].sent_at);
  };

  const loadRecent = async () => {
    const { data } = await supabase
      .from('notification_log')
      .select('id, type, sent_at')
      .eq('user_id', userId)
      .in('type', ['DAILY_PRACTICE', 'SUPPORT_REPLY', 'INACTIVE_2D', 'INACTIVE_3D'])
      .order('sent_at', { ascending: false })
      .limit(20);
    if (data) deliverNew(data);
  };

  void loadRecent();
  const interval = window.setInterval(() => { void loadRecent(); }, 60_000);
  const channel = supabase
    .channel(`browser-notifications-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `user_id=eq.${userId}` }, (payload) => {
      const row = payload.new as { id: string; type: string; sent_at: string };
      showBrowserNotification(row.type);
      localStorage.setItem(LAST_SEEN_KEY, row.sent_at);
    })
    .subscribe();

  return () => {
    active = false;
    window.clearInterval(interval);
    void supabase.removeChannel(channel);
  };
}
