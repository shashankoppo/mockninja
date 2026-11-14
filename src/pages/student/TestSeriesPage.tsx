import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Clock, FileText, Award, ChevronRight, Search, BookOpen, Zap, Target } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface SeriesRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sort_order: number;
  mock_count: number;
}

interface SeriesDetail extends SeriesRow {
  mocks: {
    id: string;
    title: string;
    duration_min: number;
    total_marks: number;
    mode: string;
    access: string;
    category: string | null;
  }[];
}

const CATEGORY_ICONS: Record<string, typeof Layers> = {
  'full syllabus': Layers,
  'subject test': BookOpen,
  'chapter test': Zap,
  'previous year': Target,
};

const CATEGORY_LABELS: Record<string, string> = {
  'full syllabus': 'Full Syllabus',
  'subject test': 'Subject Test',
  'chapter test': 'Chapter Test',
  'previous year': 'Previous Year',
};

export function TestSeriesPage() {
  const [search, setSearch] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const { data: seriesList, isLoading, isError, refetch } = useQuery<SeriesRow[]>({
    queryKey: ['test-series-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_series')
        .select('id, title, description, category, sort_order')
        .eq('status', 'PUBLISHED')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const seriesIds = (data || []).map((s) => s.id);
      if (seriesIds.length === 0) return [];

      const { data: mocks, error: mErr } = await supabase
        .from('test_series_mocks')
        .select('test_series_id, mock_test_id')
        .in('test_series_id', seriesIds);
      if (mErr) throw mErr;

      const counts: Record<string, number> = {};
      (mocks || []).forEach((m) => {
        counts[m.test_series_id] = (counts[m.test_series_id] ?? 0) + 1;
      });

      return (data || []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        sort_order: s.sort_order,
        mock_count: counts[s.id] ?? 0,
      }));
    },
  });

  const { data: seriesDetail, isLoading: detailLoading } = useQuery<SeriesDetail | null>({
    queryKey: ['test-series-detail', selectedSeriesId],
    queryFn: async () => {
      if (!selectedSeriesId) return null;
      const { data: series, error: sErr } = await supabase
        .from('test_series')
        .select('id, title, description, category, sort_order')
        .eq('id', selectedSeriesId)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!series) return null;

      const { data: tsm, error: tsmErr } = await supabase
        .from('test_series_mocks')
        .select('mock_test_id, position')
        .eq('test_series_id', selectedSeriesId)
        .order('position', { ascending: true });
      if (tsmErr) throw tsmErr;

      const mockIds = (tsm || []).map((t) => t.mock_test_id);
      if (mockIds.length === 0) {
        return { ...series, mock_count: 0, mocks: [] };
      }

      const { data: mocks, error: mErr } = await supabase
        .from('mock_tests')
        .select('id, title, duration_min, total_marks, mode, access, category')
        .eq('status', 'PUBLISHED')
        .in('id', mockIds);
      if (mErr) throw mErr;

      const mockMap = new Map((mocks || []).map((m) => [m.id, m]));
      const orderedMocks = (tsm || []).map((t) => mockMap.get(t.mock_test_id)).filter(Boolean) as SeriesDetail['mocks'];

      return { ...series, mock_count: orderedMocks.length, mocks: orderedMocks };
    },
    enabled: !!selectedSeriesId,
  });

  const filtered = (seriesList || []).filter((s) => {
    if (!search) return true;
    return s.title.toLowerCase().includes(search.toLowerCase()) || (s.description ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Series</h1>
          <p className="text-sm text-navy-400">Curated mock test series for focused, structured preparation.</p>
        </div>

        {!selectedSeriesId ? (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" />
              <input
                type="text"
                placeholder="Search test series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
              />
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : isError ? (
              <ErrorState title="Could not load test series" action={<Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>} />
            ) : filtered.length === 0 ? (
              <EmptyState title="No test series yet" description="Check back soon — new series are being curated." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((s) => {
                  const Icon = CATEGORY_ICONS[s.category] || Layers;
                  return (
                    <Card
                      key={s.id}
                      className="group cursor-pointer border-white/10 bg-[#11121c] transition-colors hover:border-white/20"
                      onClick={() => setSelectedSeriesId(s.id)}
                    >
                      <CardContent className="flex flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge variant="neutral" className="text-xs">{CATEGORY_LABELS[s.category] || s.category}</Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold leading-snug text-white group-hover:text-govt-300">{s.title}</h3>
                          {s.description && <p className="mt-1 text-xs text-navy-400 line-clamp-2">{s.description}</p>}
                        </div>
                        <div className="flex items-center justify-between text-xs text-navy-400">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {s.mock_count} {s.mock_count === 1 ? 'test' : 'tests'}
                          </span>
                          <span className="flex items-center gap-1 text-govt-300">
                            View series <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedSeriesId(null)}>
                Back to series
              </Button>
            </div>

            {detailLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : seriesDetail ? (
              <>
                <Card className="border-white/10 bg-[#11121c]">
                  <CardContent className="p-6">
                    <Badge variant="neutral" className="mb-2 text-xs">{CATEGORY_LABELS[seriesDetail.category] || seriesDetail.category}</Badge>
                    <h2 className="text-xl font-bold text-white">{seriesDetail.title}</h2>
                    {seriesDetail.description && <p className="mt-2 text-sm text-navy-400">{seriesDetail.description}</p>}
                    <p className="mt-3 text-xs text-navy-500">{seriesDetail.mock_count} mock tests in this series</p>
                  </CardContent>
                </Card>

                {seriesDetail.mocks.length === 0 ? (
                  <EmptyState title="No mocks in this series yet" description="Tests will appear here once they are added." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {seriesDetail.mocks.map((m, i) => (
                      <Card key={m.id} className="group flex flex-col border-white/10 bg-[#11121c] transition-colors hover:border-white/20">
                        <CardContent className="flex flex-1 flex-col p-0">
                          <div className="border-b border-white/10 p-5">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-govt-500/20 text-2xs font-bold text-govt-300">{i + 1}</span>
                              <Badge variant="neutral" className="text-xs">{m.access === 'FREE' ? 'Free' : 'Premium'}</Badge>
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', m.mode === 'EXAM' ? 'bg-govt-500/20 text-govt-300' : 'bg-sky-500/20 text-sky-300')}>
                                {m.mode === 'EXAM' ? 'Exam' : 'Practice'}
                              </span>
                            </div>
                            <h3 className="font-semibold leading-snug text-white group-hover:text-govt-300">{m.title}</h3>
                          </div>
                          <div className="flex-1 p-5">
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="rounded-lg bg-white/5 py-2">
                                <Clock className="mx-auto mb-1 h-4 w-4 text-navy-400" />
                                <div className="text-sm font-bold text-white">{m.duration_min}</div>
                                <div className="text-2xs text-navy-400">min</div>
                              </div>
                              <div className="rounded-lg bg-white/5 py-2">
                                <Award className="mx-auto mb-1 h-4 w-4 text-navy-400" />
                                <div className="text-sm font-bold text-white">{m.total_marks}</div>
                                <div className="text-2xs text-navy-400">marks</div>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-white/10 p-3">
                            <Link to={`/mocks/${m.id}`}>
                              <Button variant="outline" fullWidth className="group-hover:border-govt-400 group-hover:text-govt-300">
                                View details <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Series not found" description="This series may have been removed." />
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
