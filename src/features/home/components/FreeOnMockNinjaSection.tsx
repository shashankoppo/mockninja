import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, ChevronRight, Play, Sparkles, Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFreeTests } from '@/features/home/services/queries';
import { SectionError, SectionSkeleton } from './States';
import { trackEvent } from '@/features/home/services/analytics';

export function FreeOnMockNinjaSection() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useFreeTests(6);

  if (isLoading) return <SectionSkeleton count={3} />;
  if (isError) return <SectionError onRetry={() => refetch()} />;
  if (!data || data.length === 0) return null;

  return (
    <section className="free-mock-section relative py-16 sm:py-20" aria-label="Free on Mock Ninja">
      <div className="free-mock-glow absolute inset-0" aria-hidden />
      <div className="relative container-app">
        <div className="mb-10 text-center">
          <div className="free-mock-kicker mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold">
            <Gift className="h-4 w-4" />
            100% Free — No credit card needed
          </div>
          <h2 className="free-mock-title text-2xl font-bold govt-heading sm:text-3xl">
            <span className="free-mock-gradient-text">Free on Mock Ninja</span>
          </h2>
          <p className="free-mock-sub mx-auto mt-2 max-w-xl text-sm">Start practicing with these free mock tests — full scoring, detailed solutions, and performance analytics included.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((test, idx) => (
            <FreeTestCard key={test.id} test={test} position={idx} t={t} />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link to="/mocks">
            <Button size="lg" className="bg-gradient-to-r from-govt-400 to-aurora-500 text-white shadow-glow-teal hover:from-govt-500 hover:to-aurora-600">
              Explore all free tests
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="free-mock-sub flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs">
            <span className="flex items-center gap-1"><Sparkles className="free-mock-icon h-3.5 w-3.5" /> Server-graded scoring</span>
            <span className="flex items-center gap-1"><FileText className="free-mock-icon h-3.5 w-3.5" /> Detailed solutions</span>
            <span className="flex items-center gap-1"><Clock className="free-mock-icon h-3.5 w-3.5" /> NTA-style timer</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface FreeTest {
  id: string;
  title: string;
  category: string | null;
  duration_min: number;
  total_marks: number;
  access: string;
  mode: string;
  kind: string;
  question_count: number;
  is_featured: boolean;
  featured_order: number;
}

function FreeTestCard({ test, position, t }: { test: FreeTest; position: number; t: (key: string) => string }) {
  const handleCardClick = () => trackEvent({ event: 'free_test_open', series_id: test.id, position, section: 'free_on_mock_ninja' });

  return (
    <Card className="free-mock-card group relative flex flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-govt-400 to-aurora-500" />
      <div className="flex items-center justify-between p-5 pb-3">
        <span className="free-mock-badge inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
          <Gift className="h-3 w-3" /> FREE
        </span>
        <span className="free-mock-meta text-xs font-medium">
          {test.category ? test.category.charAt(0).toUpperCase() + test.category.slice(1) : 'Mock Test'}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="free-mock-card-title text-base font-bold line-clamp-2">{test.title}</h3>
        <div className="free-mock-meta mt-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {test.duration_min} min</span>
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {test.question_count} Qs</span>
          <span>{test.total_marks} marks</span>
        </div>
        <div className="mt-auto pt-5">
          <Link to={`/mocks/${test.id}`} onClick={handleCardClick}>
            <Button fullWidth className="bg-gradient-to-r from-govt-500 to-aurora-500 text-white hover:from-govt-600 hover:to-aurora-600">
              <Play className="h-4 w-4" />
              Start free test
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
