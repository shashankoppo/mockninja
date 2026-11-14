import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Shuffle } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FormulaFlashcard } from '@/components/student/revision/FormulaFlashcard';
import { fetchFormulaCards, type FormulaCard } from '@/lib/revision';

function shuffleCards(cards: FormulaCard[]): FormulaCard[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function FormulaFlashcardsPage() {
  const { data: cards, isLoading, isError, refetch } = useQuery({
    queryKey: ['formula-cards'],
    queryFn: fetchFormulaCards,
  });

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [deck, setDeck] = useState<FormulaCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());

  const subjects = useMemo(
    () => [...new Set((cards ?? []).map((card) => card.subject.name))].sort(),
    [cards],
  );

  const filtered = useMemo(
    () => (cards ?? []).filter((card) => subjectFilter === 'all' || card.subject.name === subjectFilter),
    [cards, subjectFilter],
  );

  const activeDeck = deck ?? filtered;
  const current = activeDeck[index];
  const finished = activeDeck.length > 0 && index >= activeDeck.length;
  const knownCount = activeDeck.filter((card) => knownIds.has(card.id)).length;

  const resetProgress = (nextDeck: FormulaCard[] | null) => {
    setDeck(nextDeck);
    setIndex(0);
    setFlipped(false);
    setKnownIds(new Set());
  };

  const changeSubject = (value: string) => {
    setSubjectFilter(value);
    resetProgress(null);
  };

  const goTo = (nextIndex: number) => {
    setIndex(Math.max(0, Math.min(nextIndex, activeDeck.length)));
    setFlipped(false);
  };

  const markCard = (known: boolean) => {
    if (!current) return;
    setKnownIds((prev) => {
      const next = new Set(prev);
      if (known) next.add(current.id);
      else next.delete(current.id);
      return next;
    });
    goTo(index + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON')) return;
      if (event.key === ' ') {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (event.key === 'ArrowRight') {
        goTo(index + 1);
      } else if (event.key === 'ArrowLeft') {
        goTo(index - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#11121c] p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Revision Vault</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Formula Flashcards</h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-300">
            Read the prompt, recall the formula, then flip the card to check yourself. Mark each card so you know where to focus.
          </p>
        </section>

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : isError ? (
          <ErrorState
            title="Flashcards could not load"
            description="Check your connection and try again."
            action={<button onClick={() => refetch()} className="text-sm font-semibold text-govt-300 hover:text-govt-200">Try again</button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No flashcards yet" description="Formula cards will appear here as they are published." />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select
                value={subjectFilter}
                onChange={(e) => changeSubject(e.target.value)}
                aria-label="Filter flashcards by subject"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-navy-200"
              >
                <option value="all">All subjects</option>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => resetProgress(shuffleCards(filtered))}>
                <Shuffle className="h-4 w-4" aria-hidden /> Shuffle
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-navy-300">
                <span>{finished ? `${activeDeck.length} of ${activeDeck.length} reviewed` : `Card ${index + 1} of ${activeDeck.length}`}</span>
                <span>{knownCount} marked as known</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={activeDeck.length} aria-valuenow={Math.min(index, activeDeck.length)}>
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                  style={{ width: `${activeDeck.length ? (Math.min(index, activeDeck.length) / activeDeck.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {finished ? (
              <div className="rounded-2xl border border-white/10 bg-[#11121c] p-8 text-center shadow-card">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" aria-hidden />
                <h2 className="mt-4 text-xl font-semibold text-white">Deck complete</h2>
                <p className="mt-2 text-sm text-navy-300">
                  You marked {knownCount} of {activeDeck.length} formulas as known. Go back to the cards you missed, or start again.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const missed = activeDeck.filter((card) => !knownIds.has(card.id));
                      resetProgress(missed.length ? missed : activeDeck);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden /> Review missed cards
                  </Button>
                  <Button variant="primary" onClick={() => resetProgress(activeDeck)}>
                    Start again
                  </Button>
                </div>
              </div>
            ) : (
              current && (
                <>
                  <FormulaFlashcard card={current} flipped={flipped} onFlip={() => setFlipped((value) => !value)} />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button variant="ghost" size="sm" onClick={() => goTo(index - 1)} disabled={index === 0}>
                      <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
                    </Button>
                    {flipped ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => markCard(false)}>Review again</Button>
                        <Button variant="success" size="sm" onClick={() => markCard(true)}>Got it</Button>
                      </div>
                    ) : (
                      <p className="text-xs text-navy-400">Arrow keys move between cards</p>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => goTo(index + 1)}>
                      Skip <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
}
