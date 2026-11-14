import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight, BookOpen, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Chapter = { id: number; subject_id: number; name: string; class_level: number; ordinal: number; subject: { id: number; name: string } };

export function ChaptersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<number | 'all'>('all');

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: chapters, isLoading, isError } = useQuery<Chapter[]>({
    queryKey: ['chapters-public', subjectFilter],
    queryFn: async () => {
      let query = supabase.from('chapters').select('id, subject_id, name, class_level, ordinal, subject:id!inner(id, name)').order('subject_id').order('ordinal');
      if (subjectFilter !== 'all') query = query.eq('subject_id', subjectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Chapter[];
    },
  });

  const { data: questionCounts } = useQuery({
    queryKey: ['chapter-question-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('chapter_id').eq('review_status', 'PUBLISHED');
      if (error) throw error;
      const counts: Record<number, number> = {};
      for (const question of data || []) counts[question.chapter_id] = (counts[question.chapter_id] || 0) + 1;
      return counts;
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (chapters ?? []).filter((chapter) => !query || `${chapter.name} ${chapter.subject.name}`.toLowerCase().includes(query));
  }, [chapters, search]);

  const subjectColors: Record<string, string> = {
    Physics: 'border-sky-300/20 bg-sky-300/10 text-sky-200',
    Chemistry: 'border-amber-300/20 bg-amber-300/10 text-amber-200',
    Mathematics: 'border-teal-300/20 bg-teal-300/10 text-teal-200',
    Maths: 'border-teal-300/20 bg-teal-300/10 text-teal-200',
  };

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-teal-500/10 via-white/[.04] to-sky-500/10 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-300">Targeted revision</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('chapters.title')}</h1>
          <p className="mt-2 max-w-2xl text-navy-500">{t('chapters.desc')}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.04] p-4 shadow-lg sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block max-w-xl flex-1">
              <span className="sr-only">Search chapters</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
              <input type="text" placeholder={t('chapters.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-navy-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20" />
            </label>
            <p className="flex items-center gap-2 text-sm text-navy-400"><SlidersHorizontal className="h-4 w-4 text-teal-300" aria-hidden />{filtered.length} chapter{filtered.length === 1 ? '' : 's'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSubjectFilter('all')} className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,color,border-color] duration-200', subjectFilter === 'all' ? 'border-teal-300 bg-teal-300/15 text-teal-200' : 'border-white/10 bg-white/5 text-navy-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white')}>{t('chapters.allSubjects')}</button>
            {(subjects || []).map((subject) => <button key={subject.id} type="button" onClick={() => setSubjectFilter(subject.id)} className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,color,border-color] duration-200', subjectFilter === subject.id ? 'border-teal-300 bg-teal-300/15 text-teal-200' : 'border-white/10 bg-white/5 text-navy-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white')}>{subject.name}</button>)}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-40 w-full" />)}</div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-8 text-center text-red-100">We couldn’t load the chapter list right now. Please try again shortly.</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center"><BookOpen className="mx-auto mb-3 h-12 w-12 text-navy-400" aria-hidden /><p className="text-navy-300">No chapters match your search.</p><button type="button" onClick={() => { setSearch(''); setSubjectFilter('all'); }} className="mt-3 text-sm font-semibold text-teal-300 transition-colors hover:text-white">Reset filters</button></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((chapter) => {
              const count = questionCounts?.[chapter.id] ?? 0;
              return <Card key={chapter.id} className="group flex flex-col transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/40 hover:shadow-card-hover"><CardContent className="flex flex-1 flex-col p-5"><div className="mb-3 flex items-center justify-between gap-3"><Badge variant="neutral" className={cn('border', subjectColors[chapter.subject.name] || 'border-white/10 bg-white/5 text-navy-300')}>{chapter.subject.name}</Badge><span className="text-xs text-navy-400">Class {chapter.class_level}</span></div><h3 className="mb-2 font-bold text-navy-900">{chapter.name}</h3><p className="mb-4 text-sm text-navy-500">{count} {t('chapters.questionCount')}</p><Link to="/login" className="mt-auto"><Button variant="outline" fullWidth>{t('chapters.startPractice')} <ChevronRight className="h-4 w-4" /></Button></Link></CardContent></Card>;
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
