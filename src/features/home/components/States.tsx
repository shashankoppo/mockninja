import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SectionError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert" aria-live="assertive">
      <AlertCircle className="h-8 w-8 text-error" aria-hidden />
      <p className="text-sm text-navy-400">{t('home.errorLoading')}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-navy-200 hover:bg-white/10 tap-target"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t('home.retry')}
        </button>
      )}
    </div>
  );
}

export function SectionSkeleton({ count = 3, dark = false }: { count?: number; dark?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`rounded-xl border p-6 ${
            dark ? 'border-white/10 bg-white/5' : 'border-navy-200 bg-white'
          } animate-pulse`}
        >
          <div className={`mb-4 h-8 w-8 rounded-lg ${dark ? 'bg-white/10' : 'bg-navy-100'}`} />
          <div className={`mb-3 h-5 w-3/4 rounded ${dark ? 'bg-white/10' : 'bg-navy-100'}`} />
          <div className={`mb-2 h-4 w-full rounded ${dark ? 'bg-white/10' : 'bg-navy-100'}`} />
          <div className={`h-4 w-2/3 rounded ${dark ? 'bg-white/10' : 'bg-navy-100'}`} />
        </div>
      ))}
    </div>
  );
}
