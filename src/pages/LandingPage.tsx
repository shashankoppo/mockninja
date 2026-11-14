import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Monitor, TrendingUp, Target, ShieldCheck, ChevronRight, BookOpen, Award, Clock,
  FileText, CheckCircle2, Star, Users, Zap, BrainCircuit, ArrowRight, Sparkles,
  Lightbulb, Lock, RotateCcw, Calendar, Trophy, HelpCircle, MessageCircle,
  FlaskConical, Atom, Sigma, PencilRuler, Database, Eye,
} from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt } from '@/components/common/Belt';
import { PaletteSymbol } from '@/components/exam/PaletteSymbol';
import { QUESTION_STATES, STATE_ORDER, toPaletteStatus } from '@/exam/questionStates';
import { ExamNavigatorSection } from '@/features/home/components/ExamNavigatorSection';
import { PopularMockTestsSection } from '@/features/home/components/PopularMockTestsSection';
import { FreeOnMockNinjaSection } from '@/features/home/components/FreeOnMockNinjaSection';
import { useHomepageContent, useSubscriptionPlans } from '@/features/home/services/queries';
import { isSectionEnabled, getSectionContent } from '@/features/home/services/home-service';
import { HomeAdsSection } from '@/features/home/components/HomeAdsSection';
import type { AdItem } from '@/features/home/types/advertisements';

const belts = [
  { name: 'White', level: 'WHITE', desc: 'Just started' },
  { name: 'Yellow', level: 'YELLOW', desc: 'Building basics' },
  { name: 'Green', level: 'GREEN', desc: 'Consistent' },
  { name: 'Blue', level: 'BLUE', desc: 'Solid grasp' },
  { name: 'Brown', level: 'BROWN', desc: 'Advanced' },
  { name: 'Black', level: 'BLACK', desc: 'Mastered' },
] as const;

const defaultStats = [
  { value: '—', label: 'Registered Students', detail: 'Verified platform count', icon: Users, tone: 'text-vibe-300 bg-vibe-500/15' },
  { value: '—', label: 'Tests Attempted', detail: 'Completed practice attempts', icon: FileText, tone: 'text-aurora-300 bg-aurora-500/15' },
  { value: '—', label: 'Practice Questions', detail: 'Published question bank', icon: BookOpen, tone: 'text-teal-300 bg-teal-500/15' },
  { value: '—', label: 'Test Series Available', detail: 'Published series', icon: Trophy, tone: 'text-amber-300 bg-amber-500/15' },
];

const iconMap: Record<string, typeof Monitor> = {
  Monitor, FileText, Award, BrainCircuit,
};

const toneMap: Record<string, string> = {
  'govt': 'text-govt-300 bg-govt-500/15',
  'emerald': 'text-teal-300 bg-teal-500/15',
  'saffron': 'text-amber-300 bg-amber-500/15',
  'sky': 'text-aurora-300 bg-aurora-500/15',
};

const paletteDemo = STATE_ORDER.map((state, i) => ({ num: i + 1, state }));

const whyCards = [
  { icon: Database, title: 'Question Bank', desc: 'MCQ and numerical questions across every chapter — Physics, Chemistry, and Mathematics.' },
  { icon: TrendingUp, title: 'Mastery Tracking', desc: 'Earn belts from White to Black in every chapter. See which topics pull your score down.' },
  { icon: Award, title: 'Honest Scoring', desc: 'Server-side grading with real marking schemes. No inflated scores — see exactly where you stand.' },
  { icon: ShieldCheck, title: 'Data Protection', desc: 'No ads, no trackers, no selling data. Download or delete your data anytime.' },
  { icon: Monitor, title: 'Realistic Exam Screen', desc: 'NTA-style CBT layout — same palette, tabs, timer, and action buttons as the real exam.' },
  { icon: Target, title: 'Weak-Topic Tracking', desc: 'Automatic identification of chapters where you lose the most marks.' },
];

const reattemptModes = [
  { icon: RotateCcw, title: 'Full Retake', desc: 'Take the entire test again from scratch.' },
  { icon: Target, title: 'Retry Incorrect', desc: 'Re-attempt only the questions you got wrong.' },
  { icon: BookOpen, title: 'Mistake Notebook', desc: 'Browse all your mistakes in one place with filters.' },
  { icon: PencilRuler, title: 'Targeted New Practice', desc: 'Get new questions from your weakest chapters.' },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: homeContent } = useHomepageContent();

  const { data: testimonials } = useQuery({
    queryKey: ['home-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('public_testimonials');
      if (error) throw error;
      return (data || []) as { id: string; name: string; score_label: string | null; quote: string; belt: string | null }[];
    },
  });

  const { data: faqs } = useQuery({
    queryKey: ['home-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('public_faqs');
      if (error) throw error;
      return (data || []) as { id: string; question: string; answer: string }[];
    },
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const subjectCards = [
    { name: 'Physics', icon: Atom, color: 'bg-govt-600', chapters: 10 },
    { name: 'Chemistry', icon: FlaskConical, color: 'bg-saffron-600', chapters: 10 },
    { name: 'Mathematics', icon: Sigma, color: 'bg-india-600', chapters: 10 },
  ];

  const hero = getSectionContent<{
    badge?: string; title?: string; subtitle?: string;
    ctaPrimary?: string; ctaSecondary?: string;
  }>(homeContent, 'hero');
  const statsContent = getSectionContent<{
    stats?: { label: string; value: string; detail: string; icon?: string; tone?: string }[];
  }>(homeContent, 'stats_strip');

  const stats = statsContent?.stats && statsContent.stats.length > 0
    ? statsContent.stats.map((s, i) => ({
        ...s,
        icon: (s.icon && iconMap[s.icon]) || defaultStats[i]?.icon || Monitor,
        tone: (s.tone && toneMap[s.tone]) || defaultStats[i]?.tone || 'text-govt-300 bg-govt-500/15',
      }))
    : defaultStats;
  const { data: subPlans } = useSubscriptionPlans();
  const adsContent = getSectionContent<{ items?: AdItem[] }>(homeContent, 'advertisements');
  const subPlanData = (subPlans && subPlans.length > 0 ? subPlans : [
    { id: 'f', name: 'Free', slug: 'free', description: 'Start building your practice habit.', price_inr: 0, billing_period: 'MONTHLY', features_json: ['3 free mock tests', 'Chapter practice', 'Daily practice problems', 'Basic score report'], is_active: true, sort_order: 0, mock_quota: null },
    { id: 'p', name: 'Pro', slug: 'pro', description: 'Go deeper with complete JEE practice tools.', price_inr: 499, billing_period: 'MONTHLY', features_json: ['Unlimited mock tests', 'Full-length + custom mocks', 'Mistake re-attempt', 'Performance analytics', 'Priority support'], is_active: true, sort_order: 1, mock_quota: null },
  ]) as { id: string; name: string; slug: string; description: string; price_inr: number; billing_period: string; features_json: string[]; is_active: boolean; sort_order: number }[];
  const popularSlug = 'pro';

  return (
    <PublicLayout>
      <div className="landing-page">
      {/* ============ HERO ============ */}
      {isSectionEnabled(homeContent, 'hero') && (
      <section className="hero-section relative overflow-hidden text-white">
        <div className="hero-backdrop absolute inset-0" aria-hidden />
        <div className="hero-arc hero-arc-one absolute" aria-hidden />
        <div className="hero-arc hero-arc-two absolute" aria-hidden />
        <div className="hero-glow hero-glow-violet absolute" aria-hidden />
        <div className="hero-glow hero-glow-amber absolute" aria-hidden />
        <div className="relative container-app py-14 sm:py-20 lg:min-h-[592px] lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:gap-8">
            <div className="relative z-10 min-w-0 max-w-[640px] lg:pt-2">
              <Badge variant="default" className="hero-badge mb-5 border-vibe-300/60 bg-transparent text-navy-100">
                <Target className="h-4 w-4 text-vibe-300" />
                {hero?.badge ?? t('landing.heroBadge')}
              </Badge>
              <h1 className="max-w-[650px] text-[2.7rem] font-extrabold leading-[1.06] tracking-[-0.045em] text-white govt-heading sm:text-5xl lg:text-[3.75rem]">
                <span className="block">Focused Practice.</span>
                <span className="hero-title-gradient block">Real Progress.</span>
                <span className="block">Your JEE, Your Way.</span>
              </h1>
              <p className="mt-6 max-w-[590px] text-base leading-7 text-navy-200 sm:text-lg">{hero?.subtitle ?? t('landing.heroSubtitle')}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={session ? '/mocks' : '/signup'}>
                  <Button size="lg" variant="primary" className="hero-primary-button w-full sm:w-auto">
                    <TrendingUp className="h-5 w-5" />
                    {hero?.ctaPrimary ?? t('landing.heroPrimary')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/mock-tests">
                  <Button size="lg" variant="outline" className="hero-secondary-button w-full sm:w-auto">
                    <FileText className="h-5 w-5" />
                    {hero?.ctaSecondary ?? t('landing.heroSecondary')}
                  </Button>
                </Link>
              </div>
              <div className="hero-assurance-row mt-8 flex flex-wrap gap-x-4 gap-y-4 text-xs font-medium text-navy-200 sm:text-sm">
                <span className="hero-assurance-item"><Monitor className="h-7 w-7 text-vibe-300" /><span>NTA-style<br />CBT interface</span></span>
                <span className="hero-assurance-item"><ShieldCheck className="h-7 w-7 text-teal-300" /><span>No ads,<br />no distractions</span></span>
                <span className="hero-assurance-item"><Users className="h-7 w-7 text-vibe-300" /><span>Bilingual<br />(EN / HI)</span></span>
                <span className="hero-assurance-item"><Lock className="h-7 w-7 text-amber-300" /><span>Safe &amp;<br />Secure</span></span>
              </div>
            </div>

            <div className="hero-card-stack relative z-10 mx-auto h-[430px] w-full max-w-[620px] lg:h-[492px]">
              {[
                { title: 'Mock Tests', desc: 'Full-length · Topic-wise · Sectional', icon: FileText, tone: 'hero-card-violet', to: '/mock-tests' },
                { title: 'Chapter Practice', desc: 'Concept-wise · MCQs · Detailed solutions', icon: TrendingUp, tone: 'hero-card-mint', to: '/chapters' },
                { title: 'PYQs & DPP', desc: 'Previous years · Daily practice', icon: Lightbulb, tone: 'hero-card-amber', to: '/signup' },
                { title: 'AI Doubt Solver', desc: 'Instant solutions · Clear explanations', icon: BrainCircuit, tone: 'hero-card-pink', to: '/focus' },
              ].map(({ title, desc, icon: Icon, tone, to }, index) => (
                <Link key={title} to={to} className={`hero-feature-card hero-feature-card-${index} flex w-full items-center gap-4 overflow-hidden rounded-[24px] border p-4 text-white shadow-2xl backdrop-blur-xl transition-[filter,transform] hover:brightness-110 sm:gap-5 sm:p-5`}>
                  <span className={`hero-icon-tile ${tone} flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg sm:h-[74px] sm:w-[74px]`}><Icon className="h-8 w-8" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-lg font-bold sm:text-2xl">{title}</strong><small className="mt-1 block text-sm text-navy-200 sm:text-base">{desc}</small></span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/90"><ArrowRight className="h-5 w-5" /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ============ STATS STRIP ============ */}
      {isSectionEnabled(homeContent, 'stats_strip') && (
      <section className="hero-stats-section stats-strip border-b">
        <div className="container-app py-5 sm:py-6">
          <div className="hero-stats-grid stats-strip-grid grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border shadow-card sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="hero-stat flex items-center gap-3 border-b border-white/10 px-4 py-5 last:border-0 sm:px-5 sm:py-6 sm:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.tone}`}><Icon className="h-6 w-6" /></span>
                  <span><strong className="block text-lg leading-tight text-white">{s.value}</strong><span className="mt-1 block text-xs font-medium text-navy-200 sm:text-sm">{s.label}</span><small className="mt-1 block text-2xs text-navy-500">{s.detail}</small></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {isSectionEnabled(homeContent, 'advertisements') && <HomeAdsSection items={adsContent?.items ?? []} />}

      {/* ============ NTA-Style Exam Experience ============ */}
      {isSectionEnabled(homeContent, 'nta_showcase') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="neutral" className="mb-3">{t('landing.ntaShowcaseBadge')}</Badge>
              <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Practise on the screen you will face on exam day</h2>
              <p className="mt-3 text-navy-300">{t('landing.ntaShowcaseDesc')}</p>
              <ul className="mt-6 space-y-3">
                {[t('landing.ntaFeature1'), t('landing.ntaFeature2'), t('landing.ntaFeature3'), t('landing.ntaFeature4')].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/mock-tests" className="mt-6 inline-block">
                <Button variant="primary">Try a free mock <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-card backdrop-blur-xl" aria-hidden="true">
              <div className="mb-1 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white">Mock Ninja — JEE Main</span>
                <span className="rounded bg-saffron-500/20 px-2 py-0.5 text-2xs font-bold text-saffron-300">Sample screen</span>
              </div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-1.5 rounded bg-govt-500/20 px-2 py-1 font-mono text-xs font-bold text-govt-300">
                  <Clock className="h-3 w-3" /> 02:45:30
                </div>
              </div>
              <div className="flex gap-2 py-2">
                <span className="rounded-full bg-govt-700 px-3 py-1 text-xs font-medium text-white">Physics</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-navy-300">Chemistry</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-navy-300">Maths</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-navy-400">Question 1 of 75 · Section A (MCQ)</p>
                <p className="mt-2 text-sm text-white">{t('landing.ntaSampleQ')}</p>
                <div className="mt-3 space-y-1.5">
                  {['A', 'B', 'C', 'D'].map((opt, i) => (
                    <div key={opt} className={`flex items-center gap-2 rounded border-2 p-2 text-xs ${i === 0 ? 'border-teal-500/50 bg-teal-500/10' : 'border-white/10 bg-white/5'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded text-2xs font-bold ${i === 0 ? 'bg-teal-500 text-white' : 'bg-white/10 text-navy-300'}`}>{opt}</span>
                      <span className="text-navy-200">{t('landing.ntaSampleOpt')}</span>
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
                <span className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">{t('exam.saveNext')}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
                {paletteDemo.map((p) => (
                  <span key={p.state} className="flex items-center gap-1 text-2xs text-navy-400">
                    <PaletteSymbol status={toPaletteStatus(p.state)} number={p.num} size="sm" />
                    {QUESTION_STATES[p.state].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-3 text-sm font-bold text-white">Question palette legend</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STATE_ORDER.map((state) => (
                <div key={state} className="flex items-start gap-2">
                  <PaletteSymbol status={toPaletteStatus(state)} number={0} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-white">{QUESTION_STATES[state].label}</p>
                    <p className="text-2xs text-navy-400">{QUESTION_STATES[state].legend}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-2xs text-navy-500">Independent practice platform. Not affiliated with NTA.</p>
          </div>
        </div>
      </section>
      )}

      {/* ============ Exam Navigator + Popular Mock Tests + Free on Mock Ninja ============ */}
      {isSectionEnabled(homeContent, 'popular_mock_tests') && (
        <ExamNavigatorSection
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}
      {isSectionEnabled(homeContent, 'popular_mock_tests') && (
        <PopularMockTestsSection categoryFilter={selectedCategory} />
      )}
      {isSectionEnabled(homeContent, 'free_on_mock_ninja') && <FreeOnMockNinjaSection />}

      {/* ============ Previous-Year Papers ============ */}
      {isSectionEnabled(homeContent, 'previous_year_papers') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Previous-Year Papers</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Practice with JEE Main papers by year, session, and shift.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['2024', '2023', '2022', '2021'].map((year) => (
              <Card key={year} className="text-center transition-shadow hover:shadow-card-hover">
                <CardContent className="p-5">
                  <p className="text-3xl font-bold text-govt-300 govt-heading">{year}</p>
                  <p className="mt-1 text-sm text-navy-400">JEE Main Papers</p>
                  <Link to="/previous-year-papers" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">Browse <ChevronRight className="h-4 w-4" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ============ Subject & Chapter Practice ============ */}
      {isSectionEnabled(homeContent, 'subject_chapter_practice') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Subject &amp; Chapter Practice</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Practice by subject, chapter, or topic with real question counts.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {subjectCards.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.name} className="group flex flex-col overflow-hidden transition-[box-shadow] hover:shadow-card-hover">
                  <div className={`${s.color} p-6 text-white`}>
                    <Icon className="h-10 w-10" />
                    <h3 className="mt-3 text-xl font-bold">{s.name}</h3>
                    <p className="text-sm text-white/80">{s.chapters} chapters</p>
                  </div>
                  <CardContent className="flex-1 p-5">
                    <Link to="/chapters" className="mt-auto block">
                      <Button variant="outline" fullWidth className="group-hover:border-govt-400 group-hover:text-govt-300">
                        Browse chapters <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ============ Daily Practice Problems ============ */}
      {isSectionEnabled(homeContent, 'dpp') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <Badge variant="warning" className="mb-3"><Zap className="h-3 w-3" /> Daily</Badge>
              <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Daily Practice Problems</h2>
              <p className="mt-3 text-navy-300">Fresh problems every day across all subjects. Build consistency with timed or untimed practice.</p>
              <ul className="mt-6 space-y-2 text-sm text-navy-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400" /> Today's published set ready</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400" /> Track your streak and progress</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400" /> Mistakes linked to revision vault</li>
              </ul>
              <Link to="/signup" className="mt-6 inline-block">
                <Button variant="primary">Start today's DPP <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            <Card className="border-govt-500/30 bg-gradient-to-br from-govt-500/10 to-transparent">
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-govt-600 text-white">
                  <FlameCircIcon />
                </div>
                <p className="mt-4 text-4xl font-bold text-govt-300">15</p>
                <p className="text-sm text-govt-400">problems today</p>
                <div className="mt-4 flex justify-center gap-2">
                  {['Physics', 'Chemistry', 'Maths'].map((s) => (
                    <span key={s} className="rounded-full bg-govt-500/20 px-3 py-1 text-xs font-medium text-govt-300">{s}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {/* ============ Daily Target Mock ============ */}
      {isSectionEnabled(homeContent, 'daily_target_mock') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Daily Target Mock</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">A short, personalized test each day built from your weakest topics.</p>
          </div>
          <Card className="mx-auto max-w-lg border-govt-500/30 bg-gradient-to-br from-govt-500/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-govt-600 text-white">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Today's Target Mock</h3>
                  <p className="text-sm text-govt-300">10 questions · 20 min · from your weak chapters</p>
                </div>
              </div>
              <Link to="/signup" className="mt-4 block">
                <Button variant="primary" fullWidth>Get your daily mock <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
      )}

      {/* ============ Performance Analytics Preview ============ */}
      {isSectionEnabled(homeContent, 'performance_analytics') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Performance Analytics</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Scorecard, time analysis, and mistake review — all in one place.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Award, title: 'Scorecard', desc: 'Total marks, subject-wise breakdown, accuracy, and time taken.', sample: true },
              { icon: Clock, title: 'Time Analysis', desc: 'Time per question, time-quality quadrants, and overtime detection.', sample: true },
              { icon: Target, title: 'Mistake Review', desc: 'See every wrong answer with the correct solution and explanation.', sample: true },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="transition-shadow hover:shadow-card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      {c.sample && <Badge variant="neutral">Sample</Badge>}
                    </div>
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription>{c.desc}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link to="/signup">
              <Button variant="outline">See your real analytics <ChevronRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* ============ Reattempt & Mistake Notebook ============ */}
      {isSectionEnabled(homeContent, 'reattempt_mistake') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Re-attempt &amp; Mistake Notebook</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Four ways to turn mistakes into mastery — without overwriting your original attempt.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reattemptModes.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.title} className="transition-shadow hover:shadow-card-hover">
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-white">{m.title}</h3>
                    <p className="mt-1 text-sm text-navy-400">{m.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ============ Personalized Study Plan ============ */}
      {isSectionEnabled(homeContent, 'study_plan') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <Badge variant="info" className="mb-3"><Calendar className="h-3 w-3" /> Personalized</Badge>
              <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Personalized Study Plan</h2>
              <p className="mt-3 text-navy-300">Recommended chapters, daily goals, and next tests — all driven by your real performance data. No fabricated suggestions.</p>
              <Link to="/signup" className="mt-6 inline-block">
                <Button variant="primary">Get your study plan <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-xs font-semibold text-navy-300">{d}</p>
                      <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-2xs font-bold mx-auto ${
                        i < 5 ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-navy-500'
                      }`}>
                        {i < 5 ? '2h' : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {/* ============ Chapter Mastery Tracking ============ */}
      {isSectionEnabled(homeContent, 'mastery_tracking') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app text-center">
          <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Chapter Mastery Tracking</h2>
          <p className="mx-auto mt-2 max-w-xl text-navy-400">See your per-chapter progress and belt level for every topic.</p>
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6 shadow-card">
            <div className="grid grid-cols-3 gap-4 text-left">
              {['Physics', 'Chemistry', 'Maths'].map((subj) => (
                <div key={subj} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-sm font-bold text-white">{subj}</p>
                  <div className="flex items-center gap-1">
                    {belts.slice(0, 6).map((b) => (
                      <Belt key={b.name} level={b.level} size="xs" />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-navy-500">Sample preview</p>
                </div>
              ))}
            </div>
          </div>
          <Link to="/signup" className="mt-6 inline-block">
            <Button variant="outline">Track your mastery <ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>
      )}

      {/* ============ Student Ranking System ============ */}
      {isSectionEnabled(homeContent, 'ranking_system') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <Trophy className="h-10 w-10 text-amber-400" />
              <h2 className="mt-3 text-2xl font-bold text-white govt-heading sm:text-3xl">Student Ranking System</h2>
              <p className="mt-3 text-navy-300">Compare your scores with other students on test, series, and challenge leaderboards.</p>
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-300">Disclaimer: Mock Ninja rankings, not official NTA ranks. Ranks are based on opted-in students only.</p>
              </div>
              <Link to="/signup" className="mt-6 inline-block">
                <Button variant="primary">Join the leaderboard <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'Aarav_K', score: '285/300', belt: 'BLACK' },
                    { rank: 2, name: 'Priya_S', score: '278/300', belt: 'BROWN' },
                    { rank: 3, name: 'Rohan_M', score: '271/300', belt: 'BLUE' },
                  ].map((r) => (
                    <div key={r.rank} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          r.rank === 1 ? 'bg-amber-500/20 text-amber-300' : r.rank === 2 ? 'bg-white/10 text-navy-300' : 'bg-orange-500/20 text-orange-300'
                        }`}>{r.rank}</span>
                        <span className="text-sm font-medium text-navy-200">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{r.score}</span>
                        <Belt level={r.belt} size="sm" showLabel />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-navy-500">Sample — sign in to see real rankings</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {/* ============ Why Mock Ninja ============ */}
      {isSectionEnabled(homeContent, 'why_mock_ninja') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Why Mock Ninja?</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Every feature is backed by a shipped capability — no empty promises.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {whyCards.map((p, i) => {
              const Icon = p.icon;
              return (
                <Card key={i} className="transition-shadow hover:shadow-card-hover">
                  <CardHeader>
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <CardTitle className="govt-heading">{p.title}</CardTitle>
                    <CardDescription>{p.desc}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ============ From White to Black ============ */}
      {isSectionEnabled(homeContent, 'belt_system') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app text-center">
          <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">{t('landing.beltTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-navy-400">{t('landing.beltDesc')}</p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {belts.map((belt, i) => (
            <div key={belt.name} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-2">
                <Belt level={belt.level} size="md" showLabel />
                <span className="text-xs text-navy-500">{belt.desc}</span>
              </div>
              {i < belts.length - 1 && <ChevronRight className="h-5 w-5 text-navy-600" aria-hidden />}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-navy-500">Earned through verified chapter-level mastery only. AI-generated practice does not count toward belts.</p>
      </section>
      )}

      {/* ============ Subscription Plans ============ */}
      {isSectionEnabled(homeContent, 'pricing') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-violet-300">Simple plans</p>
            <h2 className="mt-3 text-2xl font-bold text-white govt-heading sm:text-3xl">Choose Your Plan</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Simple, transparent pricing. No fake timers or scarcity.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subPlanData.map((plan) => {
              const isFree = plan.price_inr === 0;
              const isPopular = plan.slug === popularSlug;
              const features = plan.features_json || [];
              return (
                <Card key={plan.id || plan.slug} className={cn('group relative flex flex-col transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover', isPopular && 'border-violet-300/50 ring-1 ring-violet-300/20')}>
                  {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="default" className="bg-gradient-to-r from-violet-500 to-vibe-500"><Sparkles className="h-3 w-3" /> Most Popular</Badge></div>}
                  <CardContent className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-1 text-sm text-navy-400">{plan.description}</p>
                    <p className="mt-4 text-3xl font-bold text-white">{isFree ? 'Free' : `₹${plan.price_inr}`}<span className="ml-2 text-base font-normal text-navy-400">{isFree ? 'forever' : plan.billing_period === 'YEARLY' ? '/year' : '/month'}</span></p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-navy-200">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link to={isPopular ? '/pricing' : '/signup'} className="mt-6 block">
                      <Button variant={isPopular ? 'primary' : 'outline'} fullWidth>
                        {isFree ? 'Start Free' : `Go ${plan.name}`}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ============ Study Material ============ */}
      {isSectionEnabled(homeContent, 'study_material') && (
      <section className="landing-section py-16 sm:py-20">
        <div className="container-app">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">Study Material &amp; Learning Resources</h2>
            <p className="mx-auto mt-2 max-w-xl text-navy-400">Chapter notes, formula sheets, and revision material.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileText, title: 'Chapter Notes', desc: 'Concise notes for every chapter.' },
              { icon: Award, title: 'Formula Sheets', desc: 'Quick-reference formulas by subject.' },
              { icon: BookOpen, title: 'Revision Material', desc: 'Worked examples and topic summaries.' },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <Card key={r.title} className="transition-shadow hover:shadow-card-hover">
                  <CardContent className="flex items-center gap-3 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-500/15 text-govt-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{r.title}</h3>
                      <p className="text-sm text-navy-400">{r.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link to="/revision-vault"><Button variant="outline">Browse resources <ChevronRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>
      )}

      {/* ============ Testimonials ============ */}
      {isSectionEnabled(homeContent, 'testimonials') && testimonials && testimonials.length > 0 && (
        <section className="landing-section py-16 sm:py-20">
          <div className="container-app">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">{t('landing.testimonialsTitle')}</h2>
              <p className="mx-auto mt-2 max-w-xl text-navy-400">{t('landing.testimonialsDesc')}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.slice(0, 3).map((tm) => (
                <Card key={tm.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="flex-1 text-sm italic text-navy-200">"{tm.quote}"</p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <div>
                        <p className="text-sm font-bold text-white">{tm.name}</p>
                        {tm.score_label && <p className="text-xs text-navy-500">{tm.score_label}</p>}
                      </div>
                      {tm.belt && <Belt level={tm.belt} size="sm" showLabel />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FAQs ============ */}
      {isSectionEnabled(homeContent, 'faqs') && faqs && faqs.length > 0 && (
        <section className="landing-section py-16 sm:py-20">
          <div className="container-app">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">{t('faq.title')}</h2>
              <p className="mx-auto mt-2 max-w-xl text-navy-400">{t('faq.subtitle')}</p>
            </div>
            <div className="mx-auto max-w-2xl space-y-3">
              {faqs.slice(0, 6).map((f) => (
                <details key={f.id} className="group rounded-lg border border-white/10 bg-white/5 p-4">
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-white">
                    {f.question}
                    <ChevronRight className="h-5 w-5 text-navy-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-navy-300">{f.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/faq"><Button variant="outline">View all FAQs <ChevronRight className="h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ Final CTA ============ */}
      {isSectionEnabled(homeContent, 'final_cta') && (
      <section className="final-cta-section py-16 sm:py-20">
        <div className="container-app text-center">
          <h2 className="final-cta-title text-2xl font-bold govt-heading sm:text-3xl">{t('landing.cta')}</h2>
          <p className="final-cta-sub mx-auto mt-3 max-w-lg">{t('landing.heroSubtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/mock-tests">
              <Button size="lg" className="final-cta-primary">
                Start Free Mock Test <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline" className="final-cta-outline">
                {t('common.signup')}
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                {t('common.login')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
      )}
      </div>
    </PublicLayout>
  );
}

function FlameCircIcon() {
  return <Zap className="h-8 w-8" />;
}
