import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Search,
  Target,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AttemptRecord {
  id: string;
  score: number | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  mock_test_id: string;
  mock_test: {
    title: string;
    total_marks: number;
    duration_min: number;
  }[];
}

type AttemptFilter = 'all' | 'strong' | 'needs-review';

export function AttemptedTestsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AttemptFilter>('all');

  const { data: attempts, isLoading, isError } = useQuery<AttemptRecord[]>({
    queryKey: ['attempted-tests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('attempts')
        .select('id, score, status, started_at, submitted_at, mock_test_id, mock_test:mock_test_id(title, total_marks, duration_min)')
        .eq('user_id', user.id)
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AttemptRecord[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rows = attempts || [];
    const percentages = rows.map((attempt) => percentageFor(attempt));
    return {
      total: rows.length,
      average: percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : 0,
      best: percentages.length ? Math.round(Math.max(...percentages)) : 0,
      needsReview: percentages.filter((value) => value < 60).length,
    };
  }, [attempts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (attempts || []).filter((attempt) => {
      const test = attempt.mock_test?.[0];
      const percentage = percentageFor(attempt);
      const matchesSearch = !term || (test?.title || '').toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || (filter === 'strong' ? percentage >= 60 : percentage < 60);
      return matchesSearch && matchesFilter;
    });
  }, [attempts, filter, search]);

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11121c] shadow-[0_16px_42px_-24px_rgba(0,0,0,.8)]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-govt-300">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Your complete test journey
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Attempted Tests</h1>
                <p className="mt-2 text-sm leading-relaxed text-navy-300">Review every submitted mock, understand the score, and jump straight into detailed solutions or your next re-attempt.</p>
              </div>
              <Link to="/mocks">
                <Button><Target className="h-4 w-4" /> Take a new test</Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 bg-white/5 sm:grid-cols-4">
            <StatCell label="Tests attempted" value={stats.total} icon={FileText} />
            <StatCell label="Average score" value={`${stats.average}%`} icon={TrendingUp} tone="blue" />
            <StatCell label="Best score" value={`${stats.best}%`} icon={Award} tone="saffron" />
            <StatCell label="Need review" value={stats.needsReview} icon={RotateCcw} tone="red" />
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your attempted tests..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-2 focus:ring-govt-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All tests <span>{stats.total}</span></FilterButton>
            <FilterButton active={filter === 'strong'} onClick={() => setFilter('strong')}>60% and above</FilterButton>
            <FilterButton active={filter === 'needs-review'} onClick={() => setFilter('needs-review')}>Needs review <span>{stats.needsReview}</span></FilterButton>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-44 w-full" />)}</div>
        ) : isError ? (
          <Card className="border-white/10 bg-[#11121c]"><CardContent className="py-12 text-center text-sm text-vibe-300">We couldn't load your attempted tests right now. Please refresh and try again.</CardContent></Card>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={attempts?.length ? 'No tests match this view' : 'No attempted tests yet'}
            description={attempts?.length ? 'Try another filter or search term.' : 'Complete your first mock test and your full performance history will appear here.'}
            action={!attempts?.length ? <Link to="/mocks"><Button>Browse mock tests</Button></Link> : undefined}
            className="border-white/10 bg-[#11121c]"
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />)}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function AttemptCard({ attempt }: { attempt: AttemptRecord }) {
  const test = attempt.mock_test?.[0];
  const percentage = percentageFor(attempt);
  const scoreTone = percentage >= 70 ? 'success' : percentage >= 40 ? 'warning' : 'error';
  const date = attempt.submitted_at || attempt.started_at;

  return (
    <Card className="group overflow-hidden border-white/10 bg-[#11121c] transition-[transform,border-color] hover:-translate-y-0.5 hover:border-white/20">
      <CardContent className="p-0">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', scoreTone === 'success' ? 'bg-emerald-500/15 text-emerald-300' : scoreTone === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-vibe-500/15 text-vibe-300')}>
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-white sm:text-lg">{test?.title || 'Mock test'}</h2>
                <Badge variant={scoreTone}>{percentage}%</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-400">
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(date)}</span>
                <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{test?.duration_min || 0} minutes</span>
                <span>{formatScore(attempt.score)} / {test?.total_marks || 0} marks</span>
              </div>
              <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                <div className={cn('h-full rounded-full transition-[width]', scoreTone === 'success' ? 'bg-emerald-500' : scoreTone === 'warning' ? 'bg-amber-500' : 'bg-vibe-500')} style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link to={`/results/${attempt.id}`}><Button variant="outline" size="sm">View results <ChevronRight className="h-4 w-4" /></Button></Link>
            <Link to={`/solution/${attempt.id}`}><Button variant="secondary" size="sm">Solutions <BookIcon /></Button></Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-white/5 px-5 py-3 text-xs text-navy-400 lg:px-6">
          <span>{percentage >= 60 ? 'Solid attempt. Keep building consistency.' : 'Use the solutions to prepare your next re-attempt.'}</span>
          <Link to={`/exam/${attempt.id}/reattempt`} className="font-semibold text-govt-300 hover:text-govt-200">Re-attempt this test</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function BookIcon() {
  return <ChevronRight className="h-4 w-4" />;
}

function StatCell({ label, value, icon: Icon, tone = 'green' }: { label: string; value: string | number; icon: typeof FileText; tone?: 'green' | 'blue' | 'saffron' | 'red' }) {
  const colors = {
    green: 'bg-govt-500/15 text-govt-300',
    blue: 'bg-sky-500/15 text-sky-300',
    saffron: 'bg-amber-500/15 text-amber-300',
    red: 'bg-vibe-500/15 text-vibe-300',
  };
  return (
    <div className="flex items-center gap-3 border-r border-white/10 p-4 last:border-r-0 sm:p-5">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-2xs text-navy-400">{label}</p>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
        active
          ? 'bg-gradient-to-r from-govt-500 to-vibe-500 text-white shadow-glow-aurora'
          : 'border border-white/10 bg-white/5 text-navy-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function percentageFor(attempt: AttemptRecord): number {
  const total = attempt.mock_test?.[0]?.total_marks || 0;
  return total > 0 ? Math.round(((attempt.score ?? 0) / total) * 100) : 0;
}

function formatScore(score: number | null): string {
  return Number.isInteger(score) ? `${score ?? 0}` : `${Math.round((score ?? 0) * 100) / 100}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
