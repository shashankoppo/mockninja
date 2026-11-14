import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  indicatorClassName?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, indicatorClassName, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('h-2 w-full overflow-hidden rounded-full bg-navy-200', className)}
        {...props}
      >
        <div
          className={cn('h-full rounded-full bg-govt-600 transition-[width] duration-300', indicatorClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';
