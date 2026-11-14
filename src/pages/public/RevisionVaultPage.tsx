import { Link } from 'react-router-dom';
import { Archive, Bookmark, BookOpen, Calculator, FileText, ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface VaultSection {
  icon: typeof Bookmark;
  title: string;
  description: string;
  to?: string;
  tone: string;
}

const sections: VaultSection[] = [
  {
    icon: Bookmark,
    title: 'Saved questions',
    description: 'Bookmark any question during a test or practice session and come back to it later.',
    to: '/bookmarks',
    tone: 'bg-govt-500/15 text-govt-300',
  },
  {
    icon: FileText,
    title: 'Mistake notebook',
    description: 'Every question you got wrong, collected in one place so you can re-attempt it.',
    to: '/mistake-notebook',
    tone: 'bg-amber-500/15 text-amber-300',
  },
  {
    icon: BookOpen,
    title: 'Chapter notes',
    description: 'Reading notes on the core ideas of each chapter, organised by subject.',
    to: '/revision-vault/notes',
    tone: 'bg-sky-500/15 text-sky-300',
  },
  {
    icon: Calculator,
    title: 'Formula flashcards',
    description: 'Flip through key formulas, mark what you know, and review the rest.',
    to: '/revision-vault/flashcards',
    tone: 'bg-emerald-500/15 text-emerald-300',
  },
];

export function RevisionVaultPage() {
  const { user } = useAuth();

  return (
    <PublicLayout>
      <div className="container-app py-12 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-govt-300">Revision</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Revision Vault</h1>
          <p className="mt-3 text-sm leading-relaxed text-navy-300">
            Keep the questions that matter in one place and revisit them before your next test.
          </p>
        </header>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article
                key={section.title}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-1 hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', section.tone)}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-white">{section.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-300">{section.description}</p>
                {section.to && (
                  <div className="mt-5">
                    {user ? (
                      <Link to={section.to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-govt-300 hover:text-govt-200">
                        Open {section.title.toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    ) : (
                      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-govt-300 hover:text-govt-200">
                        Sign in to use this <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!user && (
          <div className="mx-auto mt-6 flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 p-8 text-center sm:flex-row sm:text-left">
            <Archive className="h-8 w-8 shrink-0 text-navy-400" aria-hidden />
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-navy-300">
                Your saved questions and mistakes are stored to your account, so sign in to start building your vault.
              </p>
            </div>
            <Link to="/signup">
              <Button variant="primary" size="sm">Create free account</Button>
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
