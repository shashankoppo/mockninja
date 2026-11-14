import { useTranslation } from 'react-i18next';
import { BookOpen, Atom, FlaskConical, Sigma, Target, FileText } from 'lucide-react';
import { useExamCategories } from '@/features/home/services/queries';
import { SectionError, SectionSkeleton } from './States';
import { trackEvent } from '@/features/home/services/analytics';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  'full syllabus': BookOpen,
  'subject test': Atom,
  'chapter test': Target,
  'physics': Atom,
  'chemistry': FlaskConical,
  'mathematics': Sigma,
  'maths': Sigma,
  'topic test': Target,
  'previous year': FileText,
};

const KNOWN_CATEGORIES = [
  'full syllabus',
  'subject test',
  'chapter test',
  'physics',
  'chemistry',
  'mathematics',
  'topic test',
  'previous year',
];

const CATEGORY_LABELS: Record<string, string> = {
  'full syllabus': 'Full Syllabus',
  'subject test': 'Subject Test',
  'chapter test': 'Chapter Practice',
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Mathematics',
  'topic test': 'Topic Practice',
  'previous year': 'Previous Year Papers',
};

export function ExamNavigatorSection({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useExamCategories();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const slug = searchParams.get('category');
    if (slug && KNOWN_CATEGORIES.includes(slug)) {
      onSelectCategory(slug);
    }
  }, [searchParams, onSelectCategory]);

  const handleSelect = (cat: string | null) => {
    onSelectCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat) {
      newParams.set('category', cat);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
    if (cat) {
      const count = data?.find((c) => c.category === cat)?.test_count ?? 0;
      trackEvent({ event: 'exam_category_selected', category_id: cat, result_count: count });
    }
  };

  if (isLoading) return <SectionSkeleton count={4} />;
  if (isError) return <SectionError onRetry={() => refetch()} />;
  if (!data || data.length === 0) return null;

  const categories = [{ category: 'all', test_count: data.reduce((s, c) => s + c.test_count, 0) }, ...data];

  return (
    <section className="landing-section py-12" aria-label="Exam categories">
      <div className="container-app">
        <h2 className="mb-1 text-xl font-bold text-white govt-heading sm:text-2xl">Practice by exam category</h2>
        <p className="mb-6 text-sm text-navy-400">Choose a test format and focus your next practice session.</p>
        <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label={t('home.examCategoriesTitle')}>
          {categories.map((cat) => {
            const normalizedCategory = cat.category.toLowerCase().replace(/_/g, ' ');
            const isSelected = (cat.category === 'all' && !selectedCategory) || selectedCategory === cat.category;
            const Icon = CATEGORY_ICONS[normalizedCategory] ?? BookOpen;
            const label = cat.category === 'all'
              ? t('mocks.allCategories')
              : CATEGORY_LABELS[normalizedCategory] ?? normalizedCategory.replace(/\b\w/g, (letter) => letter.toUpperCase());
            return (
              <button
                key={cat.category}
                role="tab"
                aria-selected={isSelected}
                aria-pressed={isSelected}
                onClick={() => handleSelect(cat.category === 'all' ? null : cat.category)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all tap-target ${
                  isSelected
                    ? 'border-govt-500 bg-govt-500/20 text-govt-200 shadow-card'
                    : 'border-white/10 bg-white/5 text-navy-300 hover:border-govt-400/50 hover:bg-govt-500/10'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                <span className={`rounded-full px-2 py-0.5 text-2xs ${isSelected ? 'bg-white/20' : 'bg-white/10 text-navy-400'}`}>
                  {cat.test_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
