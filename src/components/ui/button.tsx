import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'text-white bg-gradient-to-r from-govt-500 via-vibe-500 to-saffron-400 hover:from-govt-400 hover:to-vibe-400 active:from-govt-700 active:to-vibe-700 shadow-md shadow-vibe-950/20 hover:-translate-y-0.5 hover:shadow-glow-aurora',
  secondary: 'border border-white/15 bg-white/5 text-white hover:-translate-y-0.5 hover:bg-white/10 active:bg-white/15 shadow-sm',
  outline: 'border border-white/15 bg-transparent text-white hover:-translate-y-0.5 hover:bg-white/10 hover:border-govt-400 hover:text-white',
  ghost: 'text-navy-300 hover:bg-white/10 active:bg-white/15',
  destructive: 'bg-error text-white hover:-translate-y-0.5 hover:bg-vibe-700 active:bg-vibe-800 shadow-sm',
  success: 'bg-gradient-to-r from-india-500 to-govt-500 text-white hover:-translate-y-0.5 hover:from-india-600 hover:to-govt-600 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2 tap-target',
  lg: 'h-12 px-7 text-base rounded-xl gap-2 tap-target',
  icon: 'h-11 w-11 rounded-xl tap-target',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out',
          'focus-visible:ring-2 focus-visible:ring-govt-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
