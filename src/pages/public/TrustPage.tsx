import { Link } from 'react-router-dom';
import { BrainCircuit, CheckCircle2, Database, FileCheck2, LockKeyhole, ShieldCheck, Users, Server, Cloud } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const trustAreas = [
  { icon: Database, title: 'Data choices', text: 'Practice activity is used to show your progress and improve your next study action. Your account remains the centre of those controls.' },
  { icon: ShieldCheck, title: 'Fair scoring', text: 'Mock results are evaluated through the platform scoring flow so marks, timing, and review states are not decided only by the browser.' },
  { icon: FileCheck2, title: 'Clear explanations', text: 'Solutions are presented alongside the question context so you can review the method, not only see a final option.' },
  { icon: Users, title: 'Student safeguards', text: 'The platform is designed for focused independent practice, with age-aware onboarding support where a guardian step is required.' },
];

const partnerAreas = [
  { icon: BrainCircuit, title: 'AI-Powered Question Generation', text: 'ELSxGlobal sponsors the AI implementation behind Mock Ninja — multi-provider LLM integration for generating questions, DPPs, and mock tests, with automated validation and a full cost-tracking ledger. Every AI-generated question is reviewed by an admin before students see it.' },
  { icon: ShieldCheck, title: 'Server-Side Security Architecture', text: 'All exam grading happens on the server through edge functions — never in the browser. Row-level security policies protect every database table, and SECURITY DEFINER functions enforce privileged mutations with deny-by-default access control.' },
  { icon: Server, title: 'Exam Integrity & Proctoring', text: 'Tab-switch detection, watermarking, and integrity event logging are provisioned by ELSxGlobal to keep the practice environment fair and tamper-resistant.' },
  { icon: Cloud, title: 'Cloud Provisioning & Scalability', text: 'Containerized deployment via Docker with nginx, automated cron-based daily mock generation, real-time leaderboard sync, and health-checked infrastructure built to handle exam-load reliably.' },
];

export function TrustPage() {
  return (
    <PublicLayout>
      <div className="container-app py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="neutral" className="border-teal-400/30 bg-teal-400/10 text-teal-200"><LockKeyhole className="h-3.5 w-3.5" /> Trust Centre</Badge>
          <h1 className="mt-5 text-3xl font-bold text-white govt-heading sm:text-6xl">Practice with clarity and control.</h1>
          <p className="mt-5 text-base leading-8 text-navy-300 sm:text-lg">Mock Ninja is an independent practice platform built to make JEE preparation more focused, explainable, and respectful of student data.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
          {trustAreas.map(({ icon: Icon, title, text }) => <Card key={title} className="p-6 transition-[transform,border-color] hover:-translate-y-1 hover:border-vibe-400/30"><Icon className="h-6 w-6 text-vibe-300" /><h2 className="mt-4 text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-7 text-navy-400">{text}</p></Card>)}
        </div>
        <Card className="mx-auto mt-8 max-w-5xl border-white/15 bg-white/[.07]">
          <CardHeader><CardTitle className="text-xl">What you can expect</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm text-navy-300 sm:grid-cols-2">
            {['No ads in the focused practice experience', 'Bilingual-friendly practice flows', 'Transparent NTA affiliation disclaimer', 'Account controls for your practice history', 'NTA-style interface inspiration, not an official NTA product', 'A clear path to contact support'].map((item) => <div key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />{item}</div>)}
          </CardContent>
        </Card>
        <div className="mt-10 flex flex-wrap justify-center gap-3"><Link to="/privacy"><Button variant="outline">Read Privacy</Button></Link><Link to="/terms"><Button variant="outline">Read Terms</Button></Link><Link to="/contact"><Button variant="primary">Contact support</Button></Link></div>

        {/* ELSxGlobal Technical Partner Showcase */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="mb-8 text-center">
            <Badge variant="neutral" className="mb-3 border-vibe-400/30 bg-vibe-500/10 text-vibe-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Technical Partner
            </Badge>
            <h2 className="text-2xl font-bold text-white govt-heading sm:text-3xl">
              Security &amp; AI Implementation by ELSxGlobal
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-navy-400">
              ELSxGlobal — a division of Evolucentsphere Private Limited — sponsors the AI implementation, security infrastructure, and cloud provisioning that powers Mock Ninja.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {partnerAreas.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="border-vibe-500/15 bg-gradient-to-br from-vibe-500/5 to-transparent p-6 transition-[transform,border-color] hover:-translate-y-1 hover:border-vibe-400/30">
                <Icon className="h-6 w-6 text-vibe-300" />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-navy-400">{text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <a
              href="https://evolucentsphere.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-vibe-300 transition-colors hover:text-vibe-200"
            >
              Learn more about ELSxGlobal
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
