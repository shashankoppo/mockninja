import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, ChevronRight, Zap, BookOpen, Clock, CheckCircle2, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { FEATURE_AI } from '@/features/home/config/routes';
import { trackEvent } from '@/features/home/services/analytics';
import { useHomepageContent } from '@/features/home/services/queries';
import { PaletteSymbol } from '@/components/exam/PaletteSymbol';
import { STATE_ORDER, toPaletteStatus } from '@/exam/questionStates';

export function HeroSection() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const { data: content } = useHomepageContent();
  const signedIn = !!session;

  const heroContent = content?.hero as {
    headline?: string;
    subtitle?: string;
    primaryCta?: string;
  } | undefined;

  const headline = heroContent?.headline || t('home.heroHeadline');
  const subtitle = heroContent?.subtitle || t('home.heroSubtitle');
  const primaryCtaLabel = heroContent?.primaryCta || t('home.startFreeMock');

  const handleCtaClick = (ctaKey: string, destination: string) => {
    trackEvent({ event: 'primary_cta_click', cta_key: ctaKey, section: 'hero', destination_key: destination });
  };

  return (
    <section className="relative overflow-hidden bg-govt-900 text-white" aria-label="Hero">
      <div className="absolute inset-0 bg-gradient-to-br from-govt-900 via-govt-800 to-navy-900" aria-hidden />
      <div className="relative container-app py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="default" className="mb-5 border-govt-400/30 bg-govt-500/20 text-govt-200">
              <GraduationCap className="h-3 w-3" />
              {t('landing.badge')}
            </Badge>
            <h1 className="text-4xl font-bold leading-tight govt-heading sm:text-5xl">
              {headline}
            </h1>
            <p className="mt-5 text-lg text-govt-200">{subtitle}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={signedIn ? '/mocks' : '/signup'}
                onClick={() => handleCtaClick('start_free_mock', signedIn ? 'MOCKS' : 'SIGNUP')}
              >
                <Button size="lg" className="h-14 rounded-xl px-8 text-base font-semibold bg-white text-govt-800 shadow-lg shadow-black/20 hover:bg-navy-50 sm:text-lg">
                  {signedIn ? primaryCtaLabel : t('home.startFreeMock')}
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              {FEATURE_AI && (
                <Link to="/mocks" onClick={() => handleCtaClick('ai_practice', 'MOCKS')}>
                  <Button size="lg" variant="outline" className="border-govt-400 bg-transparent text-white hover:bg-govt-800/50">
                    <Zap className="h-5 w-5" />
                    {t('home.generateAiQuiz')}
                  </Button>
                </Link>
              )}
              <Link to="/mocks" onClick={() => handleCtaClick('explore_series', 'MOCKS')}>
                <Button size="lg" variant="outline" className="border-govt-400 bg-transparent text-white hover:bg-govt-800/50">
                  <BookOpen className="h-5 w-5" />
                  {t('home.exploreTestSeries')}
                </Button>
              </Link>
            </div>

            {signedIn && profile?.full_name && (
              <Link
                to="/dashboard"
                onClick={() => handleCtaClick('continue_prep', 'DASHBOARD')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-govt-200 hover:text-white"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {t('home.continuePrep')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-govt-200">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> {t('landing.trustNta')}</span>
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-emerald-400" /> {t('landing.trustPrivacy')}</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-emerald-400" /> {t('landing.trustBilingual')}</span>
            </div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  const { t } = useTranslation();
  const paletteDemo = STATE_ORDER.map((state, i) => ({
    num: i + 1,
    state,
  }));

  return (
    <div className="hidden lg:block" role="img" aria-label={t('home.heroVisualAlt')}>
      <div className="rounded-xl border border-white/10 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-100 pb-2">
          <span className="text-xs font-bold text-navy-900">Mock Ninja — JEE Main</span>
          <div className="flex items-center gap-1.5 rounded bg-govt-50 px-2 py-1 font-mono text-xs font-bold text-govt-700">
            <Clock className="h-3 w-3" /> 02:45:30
          </div>
        </div>
        <div className="flex gap-2 py-3">
          <span className="rounded-full bg-govt-700 px-3 py-1 text-xs font-medium text-white">Physics</span>
          <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-600">Chemistry</span>
          <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-600">Maths</span>
        </div>
        <div className="rounded-lg border border-navy-200 bg-navy-50 p-3">
          <p className="text-xs text-navy-500">Question 1 of 75</p>
          <p className="mt-2 text-sm text-navy-900">{t('landing.ntaSampleQ')}</p>
          <div className="mt-3 space-y-1.5">
            {['A', 'B', 'C', 'D'].map((opt, i) => (
              <div key={opt} className={`flex items-center gap-2 rounded border-2 p-2 text-xs ${i === 0 ? 'border-emerald-400 bg-emerald-50' : 'border-navy-200 bg-white'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded text-2xs font-bold ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-navy-100 text-navy-600'}`}>{opt}</span>
                <span className="text-navy-700">{t('landing.ntaSampleOpt')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {paletteDemo.map((p) => (
              <PaletteSymbol key={p.state} status={toPaletteStatus(p.state)} number={p.num} size="sm" />
            ))}
          </div>
          <span className="rounded bg-[#4CAF50] px-3 py-1 text-xs font-semibold text-white">{t('exam.saveNext')}</span>
        </div>
      </div>
    </div>
  );
}
