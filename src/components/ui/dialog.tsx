import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/60 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl animate-scale-in',
          className
        )}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1">
            {title && <h2 className="text-lg font-semibold text-navy-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 hover:text-navy-700 tap-target"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="max-h-[70vh] overflow-y-auto px-6 pb-4">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-3 p-6 pt-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
