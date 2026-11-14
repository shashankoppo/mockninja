import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface MathProps {
  children: string;
  display?: boolean;
  className?: string;
}

function containsMathSyntax(value: string): boolean {
  return /\\(?:[a-zA-Z]+|[,.;!{}()[\]\\])|\^|_|\$|\b(?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln)\b/.test(value);
}

export function Math({ children, display = false, className }: MathProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const plainText = !containsMathSyntax(children);

  useEffect(() => {
    if (!ref.current || plainText) return;
    try {
      katex.render(children, ref.current, {
        displayMode: display,
        throwOnError: true,
        output: 'html',
        strict: false,
      });
    } catch (err) {
      if (ref.current) {
        ref.current.textContent = children;
        ref.current.classList.add('text-error', 'text-sm');
      }
    }
  }, [children, display, plainText]);

  if (plainText) {
    return (
      <span className={className} role={display ? 'math' : undefined}>
        {children}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={className}
      aria-label={children}
      role={display ? 'math' : undefined}
    />
  );
}
