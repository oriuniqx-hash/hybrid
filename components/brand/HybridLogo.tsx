export default function HybridLogo({ size = 42 }: { size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="overflow-visible">
        <defs>
          <linearGradient id="hybrid-logo-gradient" x1="4" y1="4" x2="44" y2="44">
            <stop offset="0%" stopColor="#E60023" />
            <stop offset="48%" stopColor="#C13584" />
            <stop offset="100%" stopColor="#833AB4" />
          </linearGradient>
          <filter id="hybrid-logo-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#hybrid-logo-glow)" fill="none" stroke="url(#hybrid-logo-gradient)" strokeWidth="3">
          <circle cx="24" cy="24" r="15" opacity=".95" />
          <path d="M24 7.5c9.1 0 16.5 7.4 16.5 16.5S33.1 40.5 24 40.5 7.5 33.1 7.5 24 14.9 7.5 24 7.5Z" opacity=".32" />
          <path d="M14 16.5 24 11l10 5.5v15L24 37l-10-5.5Z" opacity=".9" />
          <circle cx="24" cy="24" r="6.5" strokeWidth="2.5" />
          <path d="M24 17.5v13M17.5 24h13" opacity=".5" />
        </g>
      </svg>
    </span>
  )
}