import { type ReactNode } from 'react';

interface SectionWrapperProps {
  id?: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}

export function SectionWrapper({ id, children, className = '', dark = false }: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`${dark ? 'bg-navy-900 text-white' : ''} ${className}`}
      aria-label={id}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  center = true,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      <h2 className={`text-2xl font-bold govt-heading sm:text-3xl ${dark ? 'text-white' : 'text-navy-900'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-2 ${center ? 'mx-auto max-w-2xl' : ''} ${dark ? 'text-navy-300' : 'text-navy-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
