import { Link } from 'react-router-dom';
import { Target, ShieldCheck, TrendingUp, Users, BookOpen, Award, Monitor, BrainCircuit, ChevronRight } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const values = [
  { icon: ShieldCheck, title: 'Honest by default', text: 'No fake badges, no inflated scores. Server-side grading shows exactly where you stand.' },
  { icon: TrendingUp, title: 'Data-driven progress', text: 'Mastery belts, focus topics, and study plans are computed from your real attempt history.' },
  { icon: Monitor, title: 'Exam-day realism', text: 'An NTA-style CBT interface so the real exam feels familiar, not foreign.' },
  { icon: Users, title: 'Student-first', text: 'No ads, no trackers, no selling data. Download or delete your data anytime.' },
];

const milestones = [
  { label: 'Question bank', value: 'MCQ + numerical across PCM' },
  { label: 'Exam engine', value: 'Server-graded with marking schemes' },
  { label: 'Mastery system', value: 'Six belt levels per chapter' },
  { label: 'Bilingual', value: 'English and Hindi' },
];

export function AboutPage() {
  return (
    <PublicLayout>
      <div className="container-app py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="neutral" className="border-vibe-400/30 bg-vibe-400/10 text-vibe-200">
            <Target className="h-3.5 w-3.5" /> About
          </Badge>
          <h1 className="mt-5 text-3xl font-bold text-white govt-heading sm:text-5xl">
            Focused practice. Real progress.
          </h1>
          <p className="mt-5 text-base leading-8 text-navy-300 sm:text-lg">
            Mock Ninja is an independent JEE Main and Advanced practice platform. It is not affiliated with NTA or any government body. The goal is simple: give students a realistic, honest, and data-driven way to prepare.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button variant="primary">Start practising <ChevronRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/mock-tests">
              <Button variant="outline">Browse mock tests</Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6 transition-[transform,border-color] hover:-translate-y-1 hover:border-vibe-400/30">
              <Icon className="h-6 w-6 text-vibe-300" />
              <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-navy-400">{text}</p>
            </Card>
          ))}
        </div>

        <Card className="mx-auto mt-8 max-w-5xl border-white/15 bg-white/[.07]">
          <CardHeader>
            <CardTitle className="text-xl">What we built</CardTitle>
            <CardDescription>Every feature is backed by a shipped capability, not a placeholder.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((m) => (
              <div key={m.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <BookOpen className="h-5 w-5 text-teal-300" />
                <p className="mt-2 text-sm font-semibold text-white">{m.label}</p>
                <p className="mt-1 text-xs text-navy-400">{m.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Award className="mx-auto h-10 w-10 text-amber-300" />
          <h2 className="mt-4 text-xl font-bold text-white govt-heading">Independent and honest</h2>
          <p className="mt-3 text-sm leading-7 text-navy-400">
            Mock Ninja is an independent practice platform. It is not affiliated with NTA or any government body. The NTA-style exam interface is inspired by the real CBT layout, not an official product.
          </p>
          <p className="mt-4 text-xs text-navy-500">
            Technical Partner <a href="https://evolucentsphere.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-navy-300 transition-colors hover:text-white">ELSxGlobal</a> | Div of Evolucentsphere Private Limited
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/trust"><Button variant="outline">Trust Centre</Button></Link>
          <Link to="/pricing"><Button variant="outline">See pricing</Button></Link>
          <Link to="/contact"><Button variant="primary">Contact us</Button></Link>
        </div>
      </div>
    </PublicLayout>
  );
}
