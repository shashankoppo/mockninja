import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, Award, Lock, Search, Filter, ChevronRight } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'full syllabus' | 'subject test' | 'chapter test';
type AccessFilter = 'all' | 'free' | 'paid';

type PublicMock = {
  id: string;
  title: string;
  category: string;
  duration_min: number;
  total_marks: number;
  access: 'FREE' | 'PREMIUM';
  mock_test_questions: { count: number }[] | null;
  question_count: number;
};

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MockTestsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');

  const { data: mocks, isLoading, isError } = useQuery<PublicMock[]>({
    queryKey: ['public-mock-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, category, duration_min, total_marks, access, mock_test_questions(count)')
        .eq('status', 'PUBLISHED')
        .eq('visibility', 'PUBLIC')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((mock) => ({
        ...mock,
        question_count: (mock.mock_test_questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
      })) as unknown as PublicMock[];
    },
  });

  const filtered = useMemo(() => (mocks ?? []).filter((mock) => {
    if (search && !mock.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && mock.category.toLowerCase() !== typeFilter) return false;
    if (accessFilter === 'free' && mock.access !== 'FREE') return false;
    if (accessFilter === 'paid' && mock.access !== 'PREMIUM') return false;
    return true;
  }), [accessFilter, mocks, search, typeFilter]);

  const typePills: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('mocks.allCategories') },
    { key: 'full syllabus', label: t('mocks.fullSyllabus') },
    { key: 'subject test', label: t('mocks.subjectTest') },
    { key: 'chapter test', label: t('mocks.chapterTest') },
  ];

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.08] to-vibe-500/[.08] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-govt-300">Curated test series</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('page.mockTestsTitle')}</h1>
          <p className="mt-2 max-w-2xl text-navy-500">{t('page.mockTestsDesc')}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.04] p-4 shadow-lg sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block max-w-xl flex-1">
              <span className="sr-only">Search tests</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
              <input type="text" placeholder={t('mocks.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-navy-400 focus:border-govt-300 focus:ring-2 focus:ring-govt-300/20" />
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-300">
              <Filter className="h-4 w-4 text-govt-300" aria-hidden />
              <span className="sr-only">Access</span>
              <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as AccessFilter)} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-govt-300 focus:ring-2 focus:ring-govt-300/20">
                <option value="all">All access</option>
                <option value="free">{t('mocks.free')}</option>
                <option value="paid">{t('mocks.premium')}</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {typePills.map((pill) => (
              <button key={pill.key} type="button" onClick={() => setTypeFilter(pill.key)} className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,color,background-color,border-color,box-shadow] duration-200', typeFilter === pill.key ? 'border-govt-300 bg-govt-300/15 text-govt-200 shadow-[0_0_20px_rgba(196,181,253,.12)]' : 'border-white/10 bg-white/5 text-navy-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white')}>
                {pill.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-navy-400">{filtered.length} test{filtered.length === 1 ? '' : 's'} match your filters.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-52 w-full" />)}</div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-8 text-center text-red-100">We couldn’t load the test series right now. Please try again shortly.</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <Search className="mx-auto mb-3 h-12 w-12 text-navy-400" aria-hidden />
            <p className="text-navy-300">No tests match your current filters.</p>
            <button type="button" onClick={() => { setSearch(''); setTypeFilter('all'); setAccessFilter('all'); }} className="mt-3 text-sm font-semibold text-govt-300 transition-colors hover:text-white">Reset filters</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mock) => (
              <Card key={mock.id} className="group flex flex-col transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-govt-300/40 hover:shadow-card-hover">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-govt-300">{formatCategory(mock.category)}</p><h3 className="font-bold text-navy-900">{mock.title}</h3></div>
                    <Badge variant={mock.access === 'FREE' ? 'success' : 'warning'}>{mock.access === 'FREE' ? t('mocks.free') : t('mocks.premium')}</Badge>
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-navy-500">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mock.duration_min} {t('mocks.min')}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {mock.question_count} {t('mocks.questions')}</span>
                    <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {mock.total_marks} {t('mocks.marks')}</span>
                  </div>
                  <Link to="/login" className="mt-auto"><Button variant="outline" fullWidth>{mock.access === 'FREE' ? t('common.start') : <><Lock className="h-4 w-4" /> {t('mocks.viewDetails')}</>}<ChevronRight className="h-4 w-4" /></Button></Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
