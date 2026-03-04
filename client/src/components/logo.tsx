interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
  const id = `logo-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="40%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.08" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="50" height="50" rx="15" fill={`url(#${id}-bg)`} />
      <rect x="3" y="3" width="50" height="50" rx="15" fill={`url(#${id}-shine)`} />
      <g filter={`url(#${id}-glow)`}>
        <path d="M17 18h22" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
        <path d="M17 26h16" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <path d="M17 34h19" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      </g>
      <circle cx="42" cy="38" r="6" fill="white" opacity="0.2" />
      <path d="M39.5 38l2 2 3.5-3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="13" cy="18" r="2.5" fill="white" opacity="0.4" />
      <circle cx="13" cy="26" r="2" fill="white" opacity="0.3" />
      <circle cx="13" cy="34" r="1.5" fill="white" opacity="0.2" />
    </svg>
  );
}

export function LogoMark({ size = 24, className = "" }: LogoProps) {
  const id = `mark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="26" height="26" rx="8" fill={`url(#${id}-g)`} />
      <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
