import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white animate-slide-down">
      <WifiOff className="h-4 w-4" aria-hidden />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
