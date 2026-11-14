export type ScorePoint = { id: string; pct: number; label: string };

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
const GRID_LINES = [0, 25, 50, 75, 100];

export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const xFor = (i: number) =>
    points.length === 1 ? PAD.left + plotW / 2 : PAD.left + (i * plotW) / (points.length - 1);
  const yFor = (pct: number) => PAD.top + plotH - (pct / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)} ${yFor(p.pct)}`).join(' ');
  const latest = points[points.length - 1];
  const best = Math.max(...points.map((p) => p.pct));
  const average = Math.round(points.reduce((sum, p) => sum + p.pct, 0) / points.length);

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Score trend across ${points.length} submitted mocks. Latest score ${latest.pct} percent.`}
      >
        {GRID_LINES.map((y) => (
          <g key={y}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(y)}
              y2={yFor(y)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={y === 0 ? undefined : '3 3'}
            />
            <text x={PAD.left - 8} y={yFor(y) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {y}%
            </text>
          </g>
        ))}

        <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle key={p.id} cx={xFor(i)} cy={yFor(p.pct)} r="4.5" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2.5">
            <title>{`${p.label}: ${p.pct}%`}</title>
          </circle>
        ))}

        <text x={xFor(0)} y={HEIGHT - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} fontSize="11" fill="#94a3b8">
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text x={xFor(points.length - 1)} y={HEIGHT - 8} textAnchor="end" fontSize="11" fill="#94a3b8">
            {latest.label}
          </text>
        )}
      </svg>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-navy-50 p-3">
          <p className="text-xs text-navy-400">Latest</p>
          <p className="text-lg font-bold text-navy-900">{latest.pct}%</p>
        </div>
        <div className="rounded-lg bg-navy-50 p-3">
          <p className="text-xs text-navy-400">Average</p>
          <p className="text-lg font-bold text-navy-900">{average}%</p>
        </div>
        <div className="rounded-lg bg-navy-50 p-3">
          <p className="text-xs text-navy-400">Best</p>
          <p className="text-lg font-bold text-navy-900">{best}%</p>
        </div>
      </div>
    </div>
  );
}
