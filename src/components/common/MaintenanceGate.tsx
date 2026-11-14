import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useSiteSettings } from '@/lib/site-settings';

const BYPASS_PREFIXES = ['/admin', '/login', '/dev'];

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profile, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = useSiteSettings();

  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return <>{children}</>;
  if (authLoading) return null;
  if (profile?.role === 'ADMIN') return <>{children}</>;
  if (isLoading) return null;
  if (!settings?.maintenanceMode) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4 py-16">
      <div className="max-w-md rounded-2xl border border-white/10 bg-[#111a2e] p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold text-[#ffffff]">We are under maintenance</h1>
        <p className="mt-3 text-sm text-[#cbd5e1]">
          Mock Ninja is temporarily unavailable while we make improvements. Please check back shortly.
        </p>
      </div>
    </div>
  );
}
