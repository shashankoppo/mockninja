import { Link } from 'react-router-dom';

interface BrandLogoProps {
  to?: string;
  variant?: 'public' | 'workspace' | 'admin';
  /** 'dark' = the logo sits on a dark background (white text). 'light' = sits on a light background (dark text). */
  tone?: 'light' | 'dark';
  className?: string;
  iconSrc?: string;
  iconClassName?: string;
}

const baseStyles = {
  public: { text: 'text-xl sm:text-2xl', icon: 'h-12 w-12 sm:h-14 sm:w-14', tagline: 'text-[8px] tracking-[0.16em] sm:text-[9px]' },
  workspace: { text: 'text-2xl', icon: 'h-12 w-12 sm:h-14 sm:w-14', tagline: 'text-[9px] tracking-[0.16em]' },
  admin: { text: 'text-lg', icon: 'h-10 w-10', tagline: 'text-[7px] tracking-[0.12em]' },
} as const;

const primaryToneClass = {
  dark: 'text-white',
  light: 'text-navy-900',
} as const;

export function BrandLogo({ to = '/', variant = 'workspace', tone, className = '', iconSrc = '/images/mock-ninja-icon-transparent.png', iconClassName = '' }: BrandLogoProps) {
  const base = baseStyles[variant];
  const resolvedTone = tone ?? (variant === 'public' || variant === 'workspace' || variant === 'admin' ? 'dark' : 'light');

  return (
    <Link
      to={to}
      aria-label="Mock Ninja home"
      className={`inline-flex min-w-0 shrink-0 items-center gap-2 ${className}`}
    >
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={`brand-icon ${base.icon} object-contain ${iconClassName}`}
      />
      <span className="flex flex-col justify-center">
        <span className={`${base.text} font-extrabold leading-none tracking-tight ${primaryToneClass[resolvedTone]}`}>
          Mock Ninja
        </span>
        <span className={`mt-1 whitespace-nowrap font-semibold uppercase leading-none ${base.tagline} brand-tagline`}>
          • Practice • Analyse • Excel
        </span>
      </span>
    </Link>
  );
}
