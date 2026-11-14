import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser, Pen, Trash2, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

type Tool = 'pen' | 'eraser';

interface Stroke {
  mode: Tool;
  points: Point[];
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;
const PEN_WIDTH = 2.5;
const ERASER_WIDTH = 24;
const INK_COLOR = '#0F172A';

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    if (!first) continue;
    ctx.strokeStyle = stroke.mode === 'eraser' ? '#FFFFFF' : INK_COLOR;
    ctx.lineWidth = stroke.mode === 'eraser' ? ERASER_WIDTH : PEN_WIDTH;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(first.x, first.y);
    for (const p of rest) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40',
        active ? 'bg-govt-700 text-white' : 'text-navy-600 hover:bg-[#F5F3FF]',
      )}
    >
      {children}
    </button>
  );
}

export function Scratchpad({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('pen');

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawStrokes(ctx, strokes);
  }, [strokes]);

  const toCanvasPoint = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const point = toCanvasPoint(e);
    setStrokes((prev) => [...prev, { mode: tool, points: [point] }]);
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = toCanvasPoint(e);
    setStrokes((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      return [...prev.slice(0, -1), { ...last, points: [...last.points, point] }];
    });
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const isEmpty = strokes.length === 0;

  return (
    <div
      role="dialog"
      aria-label={t('exam.scratchpad')}
      className="fixed inset-x-3 bottom-3 z-[70] rounded-xl border border-[#E5E4F2] bg-white p-3 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[min(560px,calc(100vw-3rem))]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy-900">{t('exam.scratchpad')}</p>
        <div className="flex items-center gap-1">
          <ToolButton label={t('exam.scratchpadPen')} active={tool === 'pen'} onClick={() => setTool('pen')}>
            <Pen className="h-4 w-4" />
          </ToolButton>
          <ToolButton label={t('exam.scratchpadEraser')} active={tool === 'eraser'} onClick={() => setTool('eraser')}>
            <Eraser className="h-4 w-4" />
          </ToolButton>
          <ToolButton label={t('exam.scratchpadUndo')} disabled={isEmpty} onClick={() => setStrokes((prev) => prev.slice(0, -1))}>
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label={t('exam.scratchpadClear')} disabled={isEmpty} onClick={() => setStrokes([])}>
            <Trash2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label={t('exam.scratchpadClose')} onClick={onClose}>
            <X className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        className="w-full cursor-crosshair touch-none rounded-lg border border-[#E5E4F2]"
      />
    </div>
  );
}
