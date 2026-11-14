import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Target, RotateCcw, TrendingUp, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { usePersonalizedSummary } from '@/features/home/services/queries';

export function PersonalizedSection() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, isLoading } = usePersonalizedSummary();

  if (!session) {
    return (
      <section className="bg-navy-50 py-16" aria-label="Personalized preparation">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-govt-100 text-govt-700">
              <Target className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-navy-900 govt-heading">{t('home.personalizedTitle')}</h2>
            <p className="mt-3 text-navy-600">{t('home.personalizedSignedOutDesc')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/signup">
                <Button variant="primary">{t('common.signup')}<ChevronRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/mocks">
                <Button variant="outline">{t('home.startFreeMock')}<Play className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading || !data || !data.hasData) {
    return (
      <section className="bg-navy-50 py-16" aria-label="Personalized preparation">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-govt-100 text-govt-700">
              <BookOpen className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-navy-900 govt-heading">{t('home.personalizedTitle')}</h2>
            <p className="mt-3 text-navy-600">{t('home.personalizedNoDataDesc')}</p>
            <div className="mt-6">
              <Link to="/mocks">
                <Button variant="primary">{t('home.takeFirstMock')}<ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const actions: { icon: typeof Play; label: string; to: string; desc: string; color: string }[] = [
    { icon: Play, label: t('home.startNewMock'), to: '/mocks', desc: t('home.startNewMockDesc'), color: 'bg-govt-600' },
    { icon: RotateCcw, label: t('home.reattemptMistakes'), to: '/focus', desc: t('home.reattemptMistakesDesc'), color: 'bg-saffron-600' },
    { icon: Target, label: t('home.practiceWeakTopics'), to: '/focus', desc: t('home.practiceWeakTopicsDesc'), color: 'bg-india-600' },
  ];

  return (
    <section className="bg-navy-50 py-16" aria-label="Personalized preparation">
      <div className="container-app">
        <h2 className="text-2xl font-bold text-navy-900 govt-heading sm:text-3xl">{t('home.personalizedTitle')}</h2>
        <p className="mt-2 text-navy-500">{t('home.personalizedDesc')}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-govt-200 bg-govt-50 p-5">
            <p className="text-xs text-govt-600">{t('home.yourAvgScore')}</p>
            <p className="mt-1 text-2xl font-bold text-govt-800 govt-heading">{data.avgScore.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-5">
            <p className="text-xs text-saffron-700">{t('home.yourBestScore')}</p>
            <p className="mt-1 text-2xl font-bold text-saffron-800 govt-heading">{data.bestScore.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-india-200 bg-india-50 p-5">
            <p className="text-xs text-india-700">{t('home.mocksTaken')}</p>
            <p className="mt-1 text-2xl font-bold text-india-800 govt-heading">{data.totalAttempts}</p>
          </div>
        </div>

        {data.weakChapters.length > 0 && (
          <div className="mt-6 rounded-xl border border-navy-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-saffron-600" aria-hidden />
              <h3 className="text-sm font-bold text-navy-900">{t('home.yourWeakTopics')}</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.weakChapters.slice(0, 5).map((ch) => (
                <span key={ch.name} className="rounded-full bg-saffron-50 px-3 py-1 text-xs font-medium text-saffron-800 border border-saffron-200">
                  {ch.name} ({ch.belt})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.to}>
                <Card className="group flex items-center gap-4 p-4 transition-all hover:shadow-card-hover">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy-900">{action.label}</p>
                    <p className="text-xs text-navy-500 truncate">{action.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-navy-300 group-hover:text-govt-600" />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
