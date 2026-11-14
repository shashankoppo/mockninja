import { cn } from '@/lib/utils';

export type BeltLevel = 'UNRATED' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'BROWN' | 'BLACK';
export type BeltSize = 'xs' | 'sm' | 'md' | 'lg';

const BELT_FILL: Record<BeltLevel, string> = {
  UNRATED: 'var(--belt-unrated)',
  WHITE: 'var(--belt-white)',
  YELLOW: 'var(--belt-yellow)',
  GREEN: 'var(--belt-green)',
  BLUE: 'var(--belt-blue)',
  BROWN: 'var(--belt-brown)',
  BLACK: 'var(--belt-black)',
};

const BELT_NAME: Record<BeltLevel, string> = {
  UNRATED: 'Unrated',
  WHITE: 'White',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  BLUE: 'Blue',
  BROWN: 'Brown',
  BLACK: 'Black',
};

const SIZE_WIDTH: Record<BeltSize, number> = { xs: 20, sm: 32, md: 64, lg: 128 };

const BELT_ORDER: BeltLevel[] = ['UNRATED', 'WHITE', 'YELLOW', 'GREEN', 'BLUE', 'BROWN', 'BLACK'];

export function normalizeBelt(value: string | null | undefined): BeltLevel {
  const key = (value ?? 'UNRATED').toUpperCase();
  return key in BELT_FILL ? (key as BeltLevel) : 'UNRATED';
}

export function beltName(value: string | null | undefined): string {
  return BELT_NAME[normalizeBelt(value)];
}

export function beltRank(value: string | null | undefined): number {
  return BELT_ORDER.indexOf(normalizeBelt(value));
}

export function nextBelt(level: string | null | undefined): BeltLevel | null {
  const belt = normalizeBelt(level);
  if (belt === 'BLACK') return null;
  const idx = BELT_ORDER.indexOf(belt);
  return BELT_ORDER[Math.min(idx + 1, BELT_ORDER.length - 1)];
}

const BELT_THRESHOLDS: Record<BeltLevel, number> = {
  UNRATED: 0,
  WHITE: 0,
  YELLOW: 15,
  GREEN: 35,
  BLUE: 55,
  BROWN: 75,
  BLACK: 90,
};

export function beltForScore(score: number): BeltLevel {
  return [...BELT_ORDER].reverse().find((b) => b !== 'UNRATED' && b !== 'WHITE' && score >= BELT_THRESHOLDS[b]) ?? 'WHITE';
}

export function beltProgress(level: string | null | undefined, score: number): number {
  const belt = normalizeBelt(level);
  const next = nextBelt(belt);
  if (!next) return 100;
  const lo = BELT_THRESHOLDS[belt];
  const hi = BELT_THRESHOLDS[next];
  if (hi <= lo) return 100;
  return Math.min(100, Math.max(0, Math.round(((score - lo) / (hi - lo)) * 100)));
}

const SPRITE_VIEWBOX = '0 0 128 40';
const BAND_HEIGHT = 32;

/** Mount once near the app root. Belt instances reference its symbols by id. */
export function BeltSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id="belt-fold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <pattern id="belt-weave" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#000" fillOpacity="0.1" />
          <rect x="2" y="2" width="2" height="2" fill="#fff" fillOpacity="0.07" />
        </pattern>
      </defs>
      {BELT_ORDER.map((level) =>
        level === 'UNRATED' ? (
          <symbol key={level} id={`belt-${level}`} viewBox={SPRITE_VIEWBOX} overflow="visible">
            <rect
              x="0.75"
              y="0.75"
              width="126.5"
              height="30.5"
              rx="15.25"
              fill="none"
              stroke={BELT_FILL[level]}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          </symbol>
        ) : (
          <g key={level}>
            <symbol id={`belt-${level}`} viewBox={SPRITE_VIEWBOX} overflow="visible">
              <rect width="128" height={BAND_HEIGHT} rx="3" fill={BELT_FILL[level]} />
              <rect width="128" height={BAND_HEIGHT} rx="3" fill="url(#belt-fold)" />
              <rect width="128" height={BAND_HEIGHT} rx="3" fill="url(#belt-weave)" />
              {[8, 24].map((y) => (
                <line
                  key={y}
                  x1="3"
                  x2="125"
                  y1={y}
                  y2={y}
                  stroke="#000"
                  strokeOpacity="0.25"
                  strokeWidth="0.75"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {level === 'WHITE' && (
                <rect
                  x="0.5"
                  y="0.5"
                  width="127"
                  height={BAND_HEIGHT - 1}
                  rx="3"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="0.75"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </symbol>
            <symbol id={`belt-knot-${level}`} viewBox={SPRITE_VIEWBOX} overflow="visible">
              <path d="M48 26 L46 40 L56 40 L56 26 Z" fill={BELT_FILL[level]} stroke="#000" strokeOpacity="0.35" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
              <path d="M80 26 L82 40 L72 40 L72 26 Z" fill={BELT_FILL[level]} stroke="#000" strokeOpacity="0.35" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
              <rect
                x="48"
                y="0"
                width="32"
                height={BAND_HEIGHT}
                rx="2"
                fill={BELT_FILL[level]}
                stroke="#000"
                strokeOpacity="0.35"
                strokeWidth="0.75"
                vectorEffect="non-scaling-stroke"
              />
            </symbol>
          </g>
        ),
      )}
    </svg>
  );
}

interface BeltProps {
  level: string | null | undefined;
  size?: BeltSize;
  showLabel?: boolean;
  /** 0–100 progress toward the next belt. When provided, renders a thin stitched bar below the belt. */
  progress?: number;
  /** For UNRATED only: questions answered so far, to show "Needs N more" against `minEvidence`. */
  evidenceCount?: number;
  /** Minimum questions for a rating; used only with UNRATED + evidenceCount. Defaults to 8. */
  minEvidence?: number;
  /** Plays one short sheen across the belt on mount. Used for belt-up moments only. */
  shine?: boolean;
  className?: string;
}

export function Belt({ level, size = 'sm', showLabel = false, progress, evidenceCount, minEvidence = 8, shine = false, className }: BeltProps) {
  const belt = normalizeBelt(level);
  const name = BELT_NAME[belt];
  const width = SIZE_WIDTH[size];
  const height = (width * 40) / 128;
  const showKnot = (size === 'md' || size === 'lg') && belt !== 'UNRATED';

  const next = nextBelt(belt);
  const showProgress = progress !== undefined && next !== null;
  const needsCount = belt === 'UNRATED' && evidenceCount !== undefined ? Math.max(0, minEvidence - evidenceCount) : null;

  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex shrink-0 overflow-hidden">
          <svg
            role="img"
            aria-label={showProgress ? `${name} belt, ${Math.round(progress!)}% of the way to ${BELT_NAME[next!]}` : `${name} belt`}
            width={width}
            height={height}
            viewBox={SPRITE_VIEWBOX}
          >
            <use href={`#belt-${belt}`} width="128" height="40" />
            {showKnot && <use href={`#belt-knot-${belt}`} width="128" height="40" />}
          </svg>
          {shine && <span aria-hidden="true" className="belt-shine" />}
        </span>
        {showLabel && <span className="text-sm font-semibold text-current">{name}</span>}
      </span>
      {showProgress && (
        <span className="flex w-full flex-col gap-0.5">
          <span
            className="h-1 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${BELT_FILL[next!]} 0 4px, transparent 4px 6px)`,
            }}
          >
            <span
              className="block h-1 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress!))}%`, backgroundColor: BELT_FILL[next!] }}
            />
          </span>
          <span className="text-2xs text-current opacity-80">{Math.round(progress!)}% to {BELT_NAME[next!]}</span>
        </span>
      )}
      {needsCount !== null && (
        <span className="text-2xs text-current opacity-80">Needs {needsCount} more</span>
      )}
    </span>
  );
}
