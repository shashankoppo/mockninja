import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock, FileText, ChevronRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

type DppSet = {
  id: string;
  title: string;
  duration_min: number;
  total_marks: number;
  access: string;
  created_at: string;
  mock_test_questions: { section: string | null }[] | null;
};

const SUBJECTS = ['all', 'Physics', 'Chemistry', 'Mathematics'] as const;
type SubjectFilter = typeof SUBJECTS[number];

function matchesSubject(set: DppSet, subject: SubjectFilter): boolean {
  if (subject === 'all') return true;
  const searchableText = [set.title, ...(set.mock_test_questions ?? []).map((question) => question.section ?? '')].join(' ').toLowerCase();
  return searchableText.includes(subject.toLowerCase());
}

export function DppPage() {
  const { t } = useTranslation();
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('all');

  const { data: sets, isLoading, isError } = useQuery<DppSet[]>({
    queryKey: ['public-dpp-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, duration_min, total_marks, access, created_at, mock_test_questions(section)')
        .eq('status', 'PUBLISHED')
        .eq('visibility', 'PUBLIC')
        .ilike('category', '%dpp%')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DppSet[];
    },
  });

  const filteredSets = useMemo(() => (sets ?? []).filter((set) => matchesSubject(set, selectedSubject)), [selectedSubject, sets]);
  const todaySet = filteredSets[0];

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-vibe-500/15 via-white/5 to-teal-500/10 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-amber-300">Daily consistency</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('dpp.title')}</h1>
          <p className="mt-2 max-w-2xl text-navy-500">{t('dpp.desc')}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.04] p-4 shadow-lg sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4 text-teal-300" aria-hidden />
            Practice by subject
          </div>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <button key={subject} type="button" onClick={() => setSelectedSubject(subject)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,color,background-color,border-color,box-shadow] duration-200 ${selectedSubject === subject ? 'border-teal-300 bg-teal-300/15 text-teal-200 shadow-[0_0_20px_rgba(85,214,190,.12)]' : 'border-white/10 bg-white/5 text-navy-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white'}`}>
                {subject === 'all' ? 'All subjects' : subject}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="mb-8 h-48 w-full" />
        ) : isError ? (
          <div className="mb-8 rounded-2xl border border-red-300/20 bg-red-500/10 p-8 text-center text-red-100">We couldn’t load today’s practice set right now. Please try again shortly.</div>
        ) : todaySet ? (
          <Card className="mb-8 border-vibe-400/30 bg-gradient-to-br from-vibe-500/15 via-white/5 to-teal-500/10 transition-[border-color,box-shadow] duration-200 hover:border-teal-300/40 hover:shadow-glow-vibe">
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-vibe-500 to-saffron-400 text-white shadow-lg"><Flame className="h-7 w-7" aria-hidden /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">{selectedSubject === 'all' ? 'Today’s set' : `${selectedSubject} set`}</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{todaySet.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-navy-300">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {todaySet.mock_test_questions?.length ?? 0} questions</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {todaySet.duration_min} min</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-teal-300" /> Published set</span>
                  </div>
                </div>
              </div>
              <Link to="/login" className="shrink-0"><Button variant="primary">{t('dpp.startDate')} <ChevronRight className="h-4 w-4" /></Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-white/10 bg-white/[.04]">
            <CardContent className="p-8 text-center sm:p-12">
              <Flame className="mx-auto mb-3 h-12 w-12 text-amber-300/70" aria-hidden />
              <h2 className="text-xl font-bold text-white">Your next DPP is being prepared</h2>
              <p className="mx-auto mt-2 max-w-lg text-navy-300">No published daily practice set matches this subject yet. Choose another subject or sign up to be ready when the next set goes live.</p>
              <Link to="/signup" className="mt-5 inline-block"><Button variant="outline">{t('common.signup')}</Button></Link>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy-900 govt-heading">{t('dpp.previousSets')}</h2>
            <p className="mt-1 text-sm text-navy-400">Build momentum with focused daily practice.</p>
          </div>
          {filteredSets.length > 0 && <span className="text-sm text-navy-400">{filteredSets.length} set{filteredSets.length === 1 ? '' : 's'}</span>}
        </div>
        {filteredSets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.slice(1).map((set) => (
              <Card key={set.id} className="group transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/40">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">Daily practice</p>
                  <h3 className="mt-2 font-bold text-white">{set.title}</h3>
                  <div className="mt-4 flex items-center gap-3 text-xs text-navy-400"><span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {set.mock_test_questions?.length ?? 0} questions</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {set.duration_min} min</span></div>
                  <Link to="/login" className="mt-5 block"><Button variant="outline" fullWidth>View set <ChevronRight className="h-4 w-4" /></Button></Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-navy-400">Previous sets will appear here after they are published.</div>
        )}
      </div>
    </PublicLayout>
  );
}
