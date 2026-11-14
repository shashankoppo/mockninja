import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUESTION_STATES, toPaletteStatus, type PaletteStatus, type QuestionState } from '@/exam/questionStates';

export type { PaletteStatus, QuestionState };

interface PaletteSymbolProps {
  status: PaletteStatus;
  number: number;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function paletteShapeFor(status: PaletteStatus): string {
  switch (status) {
    case 'not-visited': return `border-2 border-[#9E9E9E] bg-white text-[#616161] ${QUESTION_STATES.NOT_VISITED.shape}`;
    case 'not-answered': return `bg-[#E53935] text-white ${QUESTION_STATES.NOT_ANSWERED.shape}`;
    case 'answered': return `bg-[#4CAF50] text-white ${QUESTION_STATES.ANSWERED.shape}`;
    case 'marked': return 'bg-[#7B1FA2] text-white rounded-full';
    case 'answered-marked': return 'bg-[#7B1FA2] text-white rounded-full';
  }
}

export function PaletteSymbol({ status, number, active, size = 'md' }: PaletteSymbolProps) {
  const dimension = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-xs';
  const baseShape = paletteShapeFor(status);

  const shapeClass = '';

  return (
    <span
      className={cn(
        'relative flex items-center justify-center font-bold',
        dimension,
        baseShape,
        shapeClass,
        active && 'ring-2 ring-govt-600 ring-offset-1',
      )}
    >
      {number}
      {status === 'answered-marked' && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4CAF50] ring-2 ring-white">
          <Check className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </span>
  );
}

interface LegendRow {
  status: PaletteStatus;
  label: string;
  count: number;
}

export function PaletteLegend({ rows }: { rows: LegendRow[] }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs text-navy-700">
      {rows.map((row) => (
        <div key={row.status} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PaletteSymbol status={row.status} number={0} size="sm" />
            <span>{row.label}</span>
          </div>
          <span className="font-bold tabular-nums text-navy-900">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

/** Convenience: build legend rows from the single source of truth. */
export function buildLegendRows(counts: Record<QuestionState, number>): LegendRow[] {
  return (Object.keys(QUESTION_STATES) as QuestionState[]).map((state) => ({
    status: toPaletteStatus(state),
    label: QUESTION_STATES[state].label,
    count: counts[state] ?? 0,
  }));
}
