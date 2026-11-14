interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
};

const textSize = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function GradCapAvatar({ name, avatarUrl, size = 'sm', className = '' }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`rounded-full object-cover ring-2 ring-white/10 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const dim = size === 'sm' ? 32 : size === 'md' ? 48 : 80;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-govt-500 to-vibe-500 shadow-glow-teal ${sizeClasses[size]} ${className}`}
    >
      <svg
        width={Math.round(dim * 0.6)}
        height={Math.round(dim * 0.6)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"
          fill="white"
        />
        <path
          d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"
          fill="white"
          opacity="0.85"
        />
      </svg>
      <span className="sr-only">{name}</span>
    </span>
  );
}

export { getInitials };
