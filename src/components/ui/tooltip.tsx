import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-lg animate-fade-in',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
