import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, MessageCircle, Mail } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface FaqItem { id: string; question: string; answer: string; sort_order: number; }

const defaultFaqs: FaqItem[] = [
  { id: 'mock-tests', question: 'What are Mock Ninja mock tests?', answer: 'Mock Ninja provides JEE-style full-length, subject, chapter, and daily practice tests with timed exam flows, detailed solutions, and performance insights.', sort_order: 1 },
  { id: 'free-tests', question: 'Can I start with free mock tests?', answer: 'Yes. The free test collection lets you practise without a credit card. Create an account to save attempts and continue tracking your progress.', sort_order: 2 },
  { id: 'exam-interface', question: 'Does the test interface feel like the real JEE exam?', answer: 'The exam experience follows an NTA-style CBT layout with subject navigation, timer controls, question palette, review marking, and server-graded results.', sort_order: 3 },
  { id: 'pyqs', question: 'Are previous-year questions available?', answer: 'The PYQ area is designed for year-wise and shift-wise practice. Availability depends on the published papers in the current question bank.', sort_order: 4 },
  { id: 'dpp', question: 'What is the Daily Practice Problem set?', answer: 'DPP is a short daily set across Physics, Chemistry, and Mathematics to help you build a consistent practice habit.', sort_order: 5 },
  { id: 'ai-doubts', question: 'How does the AI Doubt Solver help?', answer: 'AI Doubt Solver is designed to explain difficult concepts step by step, highlight the underlying idea, and help you move from an answer to genuine understanding.', sort_order: 6 },
  { id: 'ai-accuracy', question: 'Can I rely on every AI explanation?', answer: 'Use AI explanations as guided practice, then verify important concepts against the provided solution, your class notes, or a trusted teacher. AI support should strengthen your learning, not replace judgment.', sort_order: 7 },
  { id: 'data', question: 'How is my data handled?', answer: 'Mock Ninja is an independent practice platform. We do not use ads or third-party trackers for the practice experience, and the Trust Centre explains the controls available to you.', sort_order: 8 },
];

export function FaqPage() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { data: remoteFaqs, isLoading } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('public_faqs');
      if (error) throw error;
      return (data || []) as FaqItem[];
    },
  });
  const faqs = remoteFaqs && remoteFaqs.length > 0 ? remoteFaqs : defaultFaqs;
  const filtered = faqs.filter((faq) => !search || `${faq.question} ${faq.answer}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <PublicLayout>
      <div className="container-app py-12 sm:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="public-eyebrow">Help centre</span>
          <h1 className="mt-4 text-3xl font-bold text-navy-900 govt-heading sm:text-5xl">Questions, answered clearly.</h1>
          <p className="mx-auto mt-3 max-w-xl text-navy-500">Everything you need to know about mock tests, PYQs, DPP, progress tracking, and AI doubt support.</p>
        </div>
        <div className="mx-auto mb-10 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
            <input type="search" aria-label="Search frequently asked questions" placeholder={t('faq.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-navy-300 py-3 pl-10 pr-4 text-sm" />
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-3">
          {isLoading && remoteFaqs === undefined ? <p className="py-10 text-center text-navy-400">Loading answers…</p> : filtered.length === 0 ? <p className="py-10 text-center text-navy-400">No matching answers found.</p> : filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <Card key={faq.id} className={cn('overflow-hidden transition-colors', isOpen && 'border-vibe-400/40 bg-white/[.08]')}>
                <button type="button" onClick={() => setOpenId(isOpen ? null : faq.id)} aria-expanded={isOpen} aria-controls={`faq-answer-${faq.id}`} className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
                  <span className="font-semibold text-navy-900">{faq.question}</span>
                  <ChevronDown className={cn('h-5 w-5 shrink-0 text-vibe-300 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>
                <div id={`faq-answer-${faq.id}`} hidden={!isOpen}>
                  <CardContent className="border-t border-white/10 pt-4 text-sm leading-7 text-navy-600">{faq.answer}</CardContent>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Card className="p-5"><MessageCircle className="h-5 w-5 text-teal-300" /><h2 className="mt-3 font-semibold text-white">Still stuck?</h2><p className="mt-1 text-sm text-navy-400">Send the team a clear question and we will point you in the right direction.</p><Link to="/contact" className="mt-4 inline-block"><Button variant="outline" size="sm">Contact support</Button></Link></Card>
          <Card className="p-5"><Mail className="h-5 w-5 text-vibe-300" /><h2 className="mt-3 font-semibold text-white">Want to understand trust?</h2><p className="mt-1 text-sm text-navy-400">See how practice data, scoring, and student safeguards are approached.</p><Link to="/trust" className="mt-4 inline-block"><Button variant="outline" size="sm">Visit Trust Centre</Button></Link></Card>
        </div>
      </div>
    </PublicLayout>
  );
}
