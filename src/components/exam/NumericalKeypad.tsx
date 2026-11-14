import { useCallback, type KeyboardEvent } from 'react';
import { Delete, X } from 'lucide-react';

interface NumericalKeypadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '-'] as const;

export function NumericalKeypad({ value, onChange, disabled }: NumericalKeypadProps) {
  const handleKey = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === '-') {
        if (value.startsWith('-')) return;
        onChange('-' + value);
        return;
      }
      if (key === '.') {
        if (value.includes('.')) return;
        onChange(value + '.');
        return;
      }
      onChange(value + key);
    },
    [value, onChange, disabled],
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }, [value, onChange, disabled]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    onChange('');
  }, [onChange, disabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (/^[0-9]$/.test(event.key) || event.key === '.' || event.key === '-') {
        event.preventDefault();
        handleKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
      } else if (event.key === 'Delete') {
        event.preventDefault();
        handleClear();
      }
    },
    [disabled, handleKey, handleBackspace, handleClear],
  );

  return (
    <div className="select-none">
      <div
        className="mb-3 flex h-14 w-full max-w-xs items-center justify-end rounded-lg border-2 border-[#E5E4F2] bg-[#F5F3FF] px-4 font-mono text-2xl font-bold text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govt-400"
        role="textbox"
        aria-label="Numerical answer display"
        aria-readonly="true"
        aria-live="polite"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {value || <span className="text-[#C5C2D5]">0</span>}
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKey(key)}
            disabled={disabled}
            aria-label={`Enter ${key}`}
            className="flex h-14 items-center justify-center rounded-lg border border-[#E5E4F2] bg-white font-mono text-xl font-bold text-navy-900 shadow-sm transition-colors hover:bg-[#F5F3FF] active:bg-govt-50 tap-target disabled:opacity-40"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          disabled={disabled}
          className="flex h-14 items-center justify-center rounded-lg border border-[#E5E4F2] bg-white text-navy-600 shadow-sm transition-colors hover:bg-[#F5F3FF] active:bg-govt-50 tap-target disabled:opacity-40"
          aria-label="Backspace"
        >
          <Delete className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="flex h-14 items-center justify-center gap-1 rounded-lg border border-[#E5E4F2] bg-white text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-100 tap-target disabled:opacity-40"
        >
          <X className="h-4 w-4" />
          Clear All
        </button>
      </div>
    </div>
  );
}
