import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, ChevronRight, Play, Info, Flame, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useFeaturedTests } from '@/features/home/services/queries';
import { SectionError, SectionSkeleton } from './States';
import { trackEvent } from '@/features/home/services/analytics';
import type { FeaturedTest } from '@/features/home/services/types';
import { cn } from '@/lib/utils';

export function PopularMockTestsSection({ categoryFilter }: { categoryFilter: string | null }) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useFeaturedTests(12);

  const header = (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-govt-500/15 px-3 py-1 text-xs font-bold text-govt-300 ring-1 ring-govt-400/30">
          <Flame className="h-3.5 w-3.5" />
          Trending now
        </div>
        <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Popular Mock Tests</h2>
        <p className="mt-2 text-navy-400">Most attempted full-length and subject tests — pick one and start in seconds.</p>
      </div>
      <Link to="/mocks" className="hidden shrink-0 sm:block">
        <Button variant="ghost" className="text-govt-300 hover:text-govt-200">
          View all tests
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );

  if (isLoading) return (
    <section className="landing-section py-16 sm:py-20" aria-label="Popular mock tests">
      <div className="container-app">
        {header}
        <SectionSkeleton count={4} dark />
      </div>
    </section>
  );
  if (isError) return (
    <section className="landing-section py-16 sm:py-20" aria-label="Popular mock tests">
      <div className="container-app">
        {header}
        <SectionError onRetry={() => refetch()} />
      </div>
    </section>
  );
  if (!data || data.length === 0) return null;

  const filtered = categoryFilter
    ? data.filter((test) => test.category?.toLowerCase() === categoryFilter.toLowerCase())
    : data;

  if (filtered.length === 0) return null;

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3, 12);

  return (
    <section className="landing-section py-16 sm:py-20" aria-label="Popular mock tests">
      <div className="container-app">
      {header}

      {topThree.length > 0 && (
        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          {topThree.map((test, idx) => (
            <HighlightCard key={test.id} test={test} position={idx} t={t} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((test, idx) => (
            <CompactCard key={test.id} test={test} position={idx + 3} t={t} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center sm:hidden">
        <Link to="/mocks">
          <Button variant="outline">View all tests <ChevronRight className="h-4 w-4" /></Button>
        </Link>
      </div>
      </div>
    </section>
  );
}

function HighlightCard({ test, position, t }: { test: FeaturedTest; position: number; t: (key: string) => string }) {
  const isFree = test.access === 'FREE';
  const handleCardClick = () => trackEvent({ event: 'popular_test_open', series_id: test.id, position, section: 'popular_mock_tests' });
  const rankColors = ['from-saffron-400 to-vibe-500', 'from-govt-400 to-aurora-500', 'from-aurora-400 to-govt-500'];
  const rankLabels = ['#1 Trending', '#2 Popular', '#3 Popular'];

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-premium">
      <div className={cn('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', rankColors[position] || rankColors[2])} />
      <div className="flex items-center justify-between p-5 pb-3">
        <Badge variant={isFree ? 'success' : 'neutral'}>
          {isFree ? t('mocks.free') : t('mocks.premium')}
        </Badge>
        <span className="text-xs font-bold text-navy-500">{rankLabels[position] || `#${position + 1}`}</span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="text-lg font-bold text-white govt-heading">{test.title}</h3>
        <p className="mt-1 text-xs text-navy-400">{test.category ? test.category.charAt(0).toUpperCase() + test.category.slice(1) : 'Mock Test'}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-navy-400">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {test.duration_min} min</span>
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {test.question_count} Qs</span>
          <span className="flex items-center gap-1">{test.total_marks} marks</span>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-5">
          <Link to={`/mocks/${test.id}`} onClick={handleCardClick} className="flex-1">
            <Button variant="primary" fullWidth>
              <Play className="h-4 w-4" />
              {isFree ? 'Start free test' : 'View details'}
            </Button>
          </Link>
          <Link to={`/mocks/${test.id}`} onClick={handleCardClick}>
            <Button variant="ghost" size="icon" aria-label={t('mocks.viewDetails')}>
              <Info className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function CompactCard({ test, position, t }: { test: FeaturedTest; position: number; t: (key: string) => string }) {
  const isFree = test.access === 'FREE';
  const handleCardClick = () => trackEvent({ event: 'popular_test_open', series_id: test.id, position, section: 'popular_mock_tests' });

  return (
    <Card className="group flex flex-col transition-all hover:shadow-card-hover">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span className="text-xs font-medium text-navy-400">
          {test.category ? test.category.charAt(0).toUpperCase() + test.category.slice(1) : 'Mock Test'}
        </span>
        <Badge variant={isFree ? 'success' : 'neutral'} className="text-2xs">
          {isFree ? 'FREE' : 'PREMIUM'}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-bold text-white line-clamp-2">{test.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-2xs text-navy-400">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {test.duration_min}m</span>
          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {test.question_count} Qs</span>
          <span>{test.total_marks} marks</span>
        </div>
        <div className="mt-auto pt-3">
          <Link to={`/mocks/${test.id}`} onClick={handleCardClick}>
            <Button variant="outline" size="sm" fullWidth className="group-hover:border-govt-400 group-hover:text-govt-300">
              {isFree ? 'Start now' : 'View details'}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
