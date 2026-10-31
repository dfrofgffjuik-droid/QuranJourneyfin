import { BISMILLAH, BISMILLAH_HAFS, toAr } from '../lib/quran'

/** Ayah-end marker ﴿n﴾ rendered with the Quran font. */
export function AyahMark({ n, className = '', hafs = false }: { n: number; className?: string; hafs?: boolean }) {
  // In the KFGQPC font, Arabic-Indic digits render as the ayah-end medallion.
  if (hafs)
    return (
      <span className={`mx-0.5 inline-block font-[family-name:var(--font-hafs)] text-gold ${className}`} aria-label={`آية ${n}`}>
        {toAr(n)}
      </span>
    )
  return (
    <span className={`mx-1 inline-block font-quran text-gold ${className}`} aria-label={`آية ${n}`}>
      ﴿{toAr(n)}﴾
    </span>
  )
}

export function Bismillah({ className = '', hafs = false }: { className?: string; hafs?: boolean }) {
  return (
    <p dir="rtl" lang="ar" className={`mushaf ${hafs ? 'hafs' : ''} text-center text-[1.7rem] text-night ${className}`}>
      {hafs ? BISMILLAH_HAFS : BISMILLAH}
    </p>
  )
}

export function SurahBadge({ n, size = 44, className = '' }: { n: number; size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center text-night ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full text-gold" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="8" y="8" width="24" height="24" rx="3" />
        <rect x="8" y="8" width="24" height="24" rx="3" transform="rotate(45 20 20)" />
      </svg>
      <span className="relative text-[13px] font-semibold tabular-nums">{n}</span>
    </span>
  )
}
