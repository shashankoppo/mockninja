import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AnnouncementBarSettings {
  enabled: boolean;
  text: string;
  link_label: string;
  link_url: string;
  start_at: string | null;
  end_at: string | null;
}

export interface SiteSettings {
  maintenanceMode: boolean;
  announcement: AnnouncementBarSettings;
}

const DEFAULT_ANNOUNCEMENT: AnnouncementBarSettings = { enabled: false, text: '', link_label: '', link_url: '', start_at: null, end_at: null };

export const DEFAULT_SUPPORT_EMAIL = 'support@mockninja.in';

export function useSupportEmail() {
  return useQuery({
    queryKey: ['support-email'],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'support_email')
        .maybeSingle();
      if (error) throw error;
      const stored = (data?.value as { value?: unknown } | null)?.value;
      return typeof stored === 'string' && stored.trim() ? stored.trim() : DEFAULT_SUPPORT_EMAIL;
    },
    staleTime: 300_000,
  });
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'announcement_bar']);
      if (error) throw error;
      const rows = new Map((data || []).map((row) => [row.key as string, row.value as Record<string, unknown>]));
      const announcementRow = rows.get('announcement_bar') ?? {};
      return {
        maintenanceMode: rows.get('maintenance_mode')?.enabled === true,
        announcement: {
          enabled: announcementRow.enabled === true,
          text: typeof announcementRow.text === 'string' ? announcementRow.text : DEFAULT_ANNOUNCEMENT.text,
          link_label: typeof announcementRow.link_label === 'string' ? announcementRow.link_label : '',
          link_url: typeof announcementRow.link_url === 'string' ? announcementRow.link_url : '',
          start_at: typeof announcementRow.start_at === 'string' ? announcementRow.start_at : null,
          end_at: typeof announcementRow.end_at === 'string' ? announcementRow.end_at : null,
        },
      };
    },
    staleTime: 30_000,
  });
}

export function useEmailOtpEnabled() {
  return useQuery({
    queryKey: ['email-otp-enabled'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'feature_email_otp')
        .maybeSingle();
      if (error) throw error;
      return (data?.value as { enabled?: unknown } | null)?.enabled === true;
    },
    staleTime: 60_000,
  });
}

export function isAnnouncementVisible(settings: AnnouncementBarSettings, now: Date = new Date()): boolean {
  if (!settings.enabled || !settings.text.trim()) return false;
  const t = now.getTime();
  if (settings.start_at) {
    const start = new Date(settings.start_at).getTime();
    if (Number.isNaN(start) || t < start) return false;
  }
  if (settings.end_at) {
    const end = new Date(settings.end_at).getTime();
    if (Number.isNaN(end) || t >= end) return false;
  }
  return true;
}
