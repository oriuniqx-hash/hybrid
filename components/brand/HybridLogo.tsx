export default function HybridLogo({ size = 36, withWord = false }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Hybrid">
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-accent" />
        <path d="M10 8v16M22 8v16M10 16h12" stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="24" r="2.4" fill="white" />
      </svg>
      {withWord && <span className="font-display text-xl font-extrabold tracking-tight">hybrid</span>}
    </span>
  )
}
