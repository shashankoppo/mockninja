import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: 'bg-govt-500/15 text-govt-200 border-govt-400/30',
  success: 'bg-india-500/15 text-teal-200 border-india-400/30',
  warning: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  error: 'bg-vibe-500/15 text-vibe-200 border-vibe-400/30',
  info: 'bg-govt-500/15 text-govt-200 border-govt-400/30',
  neutral: 'bg-white/5 text-navy-300 border-white/10',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
