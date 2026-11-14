import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '@/lib/theme';
import { cn } from '@/lib/utils';

const options: { value: ThemeChoice; label: string; description: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', description: 'Bright workspace surfaces', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Graphite workspace surfaces', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your device setting', icon: Monitor },
];

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { choice, resolvedTheme, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeOption = options.find((option) => option.value === choice) ?? options[2];
  const ActiveIcon = choice === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Theme: ${activeOption.label}`}
        title={`Theme: ${activeOption.label}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-navy-200 shadow-sm transition-[color,background-color,border-color] duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        <ActiveIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#191923]/95 p-2 text-white shadow-[0_18px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl animate-scale-in" role="menu">
          <div className="px-3 pb-2 pt-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-navy-400">Appearance</p>
            <p className="mt-1 text-xs text-navy-500">Choose how Mock Ninja looks.</p>
          </div>
          <div className="space-y-1">
            {options.map(({ value, label, description, icon: Icon }) => {
              const selected = choice === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setChoice(value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
                    selected ? 'bg-govt-500/15 text-white shadow-[inset_2px_0_0_#a78bfa]' : 'text-navy-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', selected ? 'bg-govt-400/20 text-govt-200' : 'bg-white/5 text-navy-400')}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block truncate text-xs text-navy-500">{description}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-govt-300" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
