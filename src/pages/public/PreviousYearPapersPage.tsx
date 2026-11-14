import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, Award, Search, ChevronRight, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

type PaperRow = {
  id: string;
  title: string;
  duration_min: number;
  total_marks: number;
  access: string;
  created_at: string;
  mock_test_questions: { section: string | null }[] | null;
};

type Paper = PaperRow & {
  question_count: number;
  year: string;
  subjects: string[];
};

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'] as const;

function getPaperYear(title: string, createdAt: string): string {
  const match = title.match(/20\d{2}/);
  return match?.[0] ?? new Date(createdAt).getFullYear().toString();
}

function getPaperSubjects(sections: { section: string | null }[] | null): string[] {
  const found = new Set<string>();
  for (const item of sections ?? []) {
    const section = item.section?.toLowerCase() ?? '';
    for (const subject of SUBJECTS) {
      if (section.includes(subject.toLowerCase())) found.add(subject);
    }
  }
  return found.size > 0 ? [...found] : [...SUBJECTS];
}

export function PreviousYearPapersPage() {
  const { t } = useTranslation();
  const [yearFilter, setYearFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const { data: papers, isLoading, isError } = useQuery<Paper[]>({
    queryKey: ['pyq-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, duration_min, total_marks, access, created_at, mock_test_questions(section)')
        .eq('status', 'PUBLISHED')
        .eq('visibility', 'PUBLIC')
        .ilike('category', '%pyq%')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return ((data ?? []) as unknown as PaperRow[]).map((paper) => ({
        ...paper,
        question_count: paper.mock_test_questions?.length ?? 0,
        year: getPaperYear(paper.title, paper.created_at),
        subjects: getPaperSubjects(paper.mock_test_questions),
      }));
    },
  });

  const years = useMemo(() => [...new Set((papers ?? []).map((paper) => paper.year))].sort((a, b) => b.localeCompare(a)), [papers]);
  const filteredPapers = useMemo(() => (papers ?? []).filter((paper) => {
    const matchesYear = yearFilter === 'all' || paper.year === yearFilter;
    const matchesSubject = subjectFilter === 'all' || paper.subjects.includes(subjectFilter);
    return matchesYear && matchesSubject;
  }), [papers, subjectFilter, yearFilter]);

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.08] to-vibe-500/[.08] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-300">Previous-year practice</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('page.pyqsTitle')}</h1>
          <p className="mt-2 max-w-2xl text-navy-500">{t('page.pyqsDesc')}</p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[.04] p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4 text-teal-300" aria-hidden />
            Narrow your practice set
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-navy-300">
              Exam year
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20">
                <option value="all">All years</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-navy-300">
              Subject
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20">
                <option value="all">All subjects</option>
                {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-navy-400">
            <span>{filteredPapers.length} paper{filteredPapers.length === 1 ? '' : 's'} match your filters</span>
            {(yearFilter !== 'all' || subjectFilter !== 'all') && (
              <button type="button" onClick={() => { setYearFilter('all'); setSubjectFilter('all'); }} className="font-semibold text-teal-300 transition-colors hover:text-white">Clear filters</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-8 text-center text-red-100">We couldn’t load the previous-year papers right now. Please try again shortly.</div>
        ) : filteredPapers.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto mb-3 h-12 w-12 text-navy-300" />
            <p className="text-navy-400">No papers match these filters yet.</p>
            <p className="mt-1 text-sm text-navy-400">Try another year or choose all subjects.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPapers.map((paper) => (
              <Card key={paper.id} className="group flex flex-col transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/40 hover:shadow-card-hover">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-300">{paper.year} PYQ</p>
                      <h3 className="font-bold text-navy-900">{paper.title}</h3>
                    </div>
                    <Badge variant="neutral"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {paper.subjects.map((subject) => <span key={subject} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-navy-300">{subject}</span>)}
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-navy-500">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {paper.duration_min} min</span>
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {paper.question_count} Qs</span>
                    <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {paper.total_marks} marks</span>
                  </div>
                  <Link to="/login" className="mt-auto">
                    <Button variant="outline" fullWidth>{t('common.start')} <ChevronRight className="h-4 w-4" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
