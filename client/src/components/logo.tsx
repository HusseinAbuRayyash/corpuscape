interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="logo-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logo-grad-1)" opacity="0.12" />
      <rect x="2" y="2" width="44" height="44" rx="12" stroke="url(#logo-grad-1)" strokeWidth="1.5" opacity="0.4" />
      <path d="M14 16h20M14 24h14M14 32h18" stroke="url(#logo-grad-2)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="32" r="4" fill="url(#logo-grad-1)" opacity="0.8" />
      <path d="M34 30l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="16" r="2" fill="#14b8a6" opacity="0.6" />
      <circle cx="10" cy="24" r="2" fill="#6366f1" opacity="0.6" />
      <circle cx="10" cy="32" r="2" fill="#a855f7" opacity="0.6" />
    </svg>
  );
}

export function LogoMark({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-sm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#logo-sm-grad)" />
      <path d="M7 8h10M7 12h7M7 16h9" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
