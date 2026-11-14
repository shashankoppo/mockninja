import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const toggle = () => {
    const next = current === 'en' ? 'hi' : 'en';
    void i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-100 transition-colors tap-target',
        className
      )}
      aria-label={t('language.label')}
      title={t('language.label')}
    >
      <Globe className="h-4 w-4" aria-hidden />
      <span>{current === 'en' ? 'EN' : 'हिं'}</span>
    </button>
  );
}
