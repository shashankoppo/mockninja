import { cn } from '@/lib/utils';
import type { FormulaCard } from '@/lib/revision';

interface FormulaFlashcardProps {
  card: FormulaCard;
  flipped: boolean;
  onFlip: () => void;
}

export function FormulaFlashcard({ card, flipped, onFlip }: FormulaFlashcardProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? 'Show the question side' : 'Show the formula'}
      className="group block h-64 w-full [perspective:1200px] focus:outline-none sm:h-72"
    >
      <span
        className={cn(
          'relative block h-full w-full rounded-2xl transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#11121c] p-8 text-center shadow-card [backface-visibility:hidden] group-focus-visible:ring-2 group-focus-visible:ring-govt-400">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">{card.subject.name}</span>
          <span className="mt-4 text-xl font-semibold leading-snug text-white sm:text-2xl">{card.front}</span>
          {card.hint && <span className="mt-4 text-sm text-navy-300">Hint: {card.hint}</span>}
          <span className="mt-6 text-xs text-navy-400">Tap or press Space to reveal</span>
        </span>
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-emerald-400/30 bg-[#0f1d1a] p-8 text-center shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Formula</span>
          <span className="mt-4 font-mono text-xl font-semibold leading-snug text-white sm:text-2xl">{card.back}</span>
          {card.chapter && <span className="mt-6 text-xs text-navy-300">{card.chapter.name}</span>}
        </span>
      </span>
    </button>
  );
}
