import { useTranslation } from 'react-i18next';
import { Users, FileText, ClipboardList, BookOpen } from 'lucide-react';
import { usePlatformStats } from '@/features/home/services/queries';
import { SectionError, SectionSkeleton } from './States';

function formatIndianNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

export function TrustStatsSection() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = usePlatformStats();

  if (isLoading) return <SectionSkeleton count={4} />;
  if (isError || !data) return <SectionError onRetry={() => refetch()} />;

  const metrics: { value: number; label: string; icon: typeof Users }[] = [
    { value: data.registered_students, label: t('home.statStudents'), icon: Users },
    { value: data.mock_attempts, label: t('home.statAttempts'), icon: ClipboardList },
    { value: data.published_questions, label: t('home.statQuestions'), icon: FileText },
    { value: data.available_series, label: t('home.statSeries'), icon: BookOpen },
  ].filter((m) => m.value > 0);

  if (metrics.length < 2) return null;

  const updatedDate = new Date(data.updated_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <section className="border-b border-navy-200 bg-white" aria-label="Platform statistics">
      <div className="container-app py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-govt-50 text-govt-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-3xl font-bold text-govt-700 govt-heading">{formatIndianNumber(m.value)}</p>
                <p className="mt-1 text-xs text-navy-500">{m.label}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-navy-400">{t('home.statsUpdated', { date: updatedDate })}</p>
      </div>
    </section>
  );
}
