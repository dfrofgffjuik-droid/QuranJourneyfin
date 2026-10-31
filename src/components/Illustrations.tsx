import { useId } from 'react'

// Soft "clay 3D" illustrations: one treatment (warm gold/terracotta + cream,
// a single highlight and one contact shadow) so they read as a family.
type P = { size?: number; className?: string }

function useIds(...names: string[]) {
  const id = useId().replace(/:/g, '')
  return Object.fromEntries(names.map((n) => [n, `${n}-${id}`])) as Record<string, string>
}

/** Closed mushaf with a gold medallion. */
export function MushafArt({ size = 56, className = '' }: P) {
  const i = useIds('cover', 'edge', 'med')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={i.cover} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c35a" />
          <stop offset="1" stopColor="#d9892a" />
        </linearGradient>
        <linearGradient id={i.edge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6e4" />
          <stop offset="1" stopColor="#efd9b0" />
        </linearGradient>
        <radialGradient id={i.med} cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset="1" stopColor="#e8a83a" />
        </radialGradient>
      </defs>
      <ellipse cx="33" cy="57" rx="20" ry="3.5" fill="#000" opacity=".12" />
      <path d="M16 14c0-3 2-5 5-5h27v42H21c-3 0-5-2-5-5z" fill={`url(#${i.edge})`} />
      <path d="M14 12c0-3 2-5 5-5h27c2 0 3 1 3 3v38c0 2-1 3-3 3H19c-3 0-5-2-5-5z" fill={`url(#${i.cover})`} />
      <path d="M18 10h28M18 48h28" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="22" y="15" width="20" height="26" rx="4" fill="none" stroke="#fff2cf" strokeOpacity=".7" strokeWidth="1.5" />
      <path d="M32 20l3.2 3.2H40v4.6l3.2 3.2-3.2 3.2V39h-4.8L32 42.2 28.8 39H24v-4.8L20.8 31 24 27.8v-4.6h4.8z" fill={`url(#${i.med})`} transform="translate(0 -3) scale(1 .92) translate(0 2)" />
      <path d="M17 9c3-1.5 8-2 12-1.5" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Open Quran on a wooden rehal (X stand). */
export function OpenQuranArt({ size = 140, className = '' }: P) {
  const i = useIds('wood', 'page', 'pageR', 'rib')
  return (
    <svg viewBox="0 0 160 130" width={size} height={(size * 130) / 160} className={className} aria-hidden>
      <defs>
        <linearGradient id={i.wood} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9a15a" />
          <stop offset="1" stopColor="#b8642a" />
        </linearGradient>
        <linearGradient id={i.page} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#efe2c8" />
        </linearGradient>
        <linearGradient id={i.pageR} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#f0e3ca" />
        </linearGradient>
        <linearGradient id={i.rib} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#e89a2c" />
        </linearGradient>
      </defs>
      <ellipse cx="82" cy="121" rx="58" ry="7" fill="#000" opacity=".14" />
      {/* stand */}
      <path d="M34 118 112 62l10 6-78 56z" fill={`url(#${i.wood})`} />
      <path d="M126 118 48 62l-10 6 78 56z" fill={`url(#${i.wood})`} opacity=".92" />
      <path d="M30 76c18-4 36 0 50 10 14-10 32-14 50-10l-4 12c-16-3-32 0-46 10-14-10-30-13-46-10z" fill={`url(#${i.wood})`} />
      {/* book block */}
      <path d="M80 30C64 18 40 16 22 22v54c18-6 42-4 58 8z" fill="#d6913f" />
      <path d="M80 30c16-12 40-14 58-8v54c-18-6-42-4-58 8z" fill="#c97f31" />
      <path d="M80 27C65 16 43 14 26 19v53c17-5 39-3 54 8z" fill={`url(#${i.page})`} />
      <path d="M80 27c15-11 37-13 54-8v53c-17-5-39-3-54 8z" fill={`url(#${i.pageR})`} />
      <path d="M80 27v53" stroke="#d9c39b" strokeWidth="1.5" />
      {/* text lines */}
      <g stroke="#e2cfa8" strokeWidth="2.4" strokeLinecap="round">
        <path d="M36 34c11-2 24-1 35 4M36 44c11-2 24-1 35 4M36 54c11-2 24-1 35 4" />
        <path d="M89 38c11-5 24-6 35-4M89 48c11-5 24-6 35-4M89 58c11-5 24-6 35-4" />
      </g>
      {/* ribbon */}
      <path d="M96 22h12v34l-6-5-6 5z" fill={`url(#${i.rib})`} />
      <path d="M99 24v24" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Studio microphone (recitation). */
export function MicArt({ size = 56, className = '' }: P) {
  const i = useIds('head', 'body')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={i.head} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fd3a1" />
          <stop offset="1" stopColor="#2f8a58" />
        </linearGradient>
        <linearGradient id={i.body} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6c35a" />
          <stop offset="1" stopColor="#d9892a" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="15" ry="3" fill="#000" opacity=".12" />
      <path d="M20 30a12 12 0 0 0 24 0" fill="none" stroke={`url(#${i.body})`} strokeWidth="4" strokeLinecap="round" />
      <rect x="30" y="41" width="4" height="10" rx="2" fill={`url(#${i.body})`} />
      <rect x="22" y="50" width="20" height="5" rx="2.5" fill={`url(#${i.body})`} />
      <rect x="23" y="7" width="18" height="30" rx="9" fill={`url(#${i.head})`} />
      <path d="M27 14h10M27 19h10M27 24h10" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 10c2-1.5 5-2 7-1.5" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Desk calendar with a green header (plans). */
export function CalendarArt({ size = 56, className = '' }: P) {
  const i = useIds('top', 'paper')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={i.top} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5cc58a" />
          <stop offset="1" stopColor="#2a7a4b" />
        </linearGradient>
        <linearGradient id={i.paper} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#ecdfc5" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="20" ry="3.4" fill="#000" opacity=".12" />
      <rect x="10" y="13" width="44" height="41" rx="9" fill={`url(#${i.paper})`} />
      <path d="M10 22a9 9 0 0 1 9-9h26a9 9 0 0 1 9 9v4H10z" fill={`url(#${i.top})`} />
      <rect x="20" y="8" width="5" height="11" rx="2.5" fill="#d9892a" />
      <rect x="39" y="8" width="5" height="11" rx="2.5" fill="#d9892a" />
      <g fill="#e2cfa8">
        <rect x="17" y="32" width="7" height="6" rx="2" />
        <rect x="28.5" y="32" width="7" height="6" rx="2" />
        <rect x="17" y="42" width="7" height="6" rx="2" />
        <rect x="28.5" y="42" width="7" height="6" rx="2" />
        <rect x="40" y="42" width="7" height="6" rx="2" />
      </g>
      <rect x="40" y="32" width="7" height="6" rx="2" fill="#f0a93a" />
      <path d="M15 17c3-2 8-3 12-2.5" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Fanous lantern (reflection / tafsir). */
export function LanternArt({ size = 56, className = '' }: P) {
  const i = useIds('metal', 'glow')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={i.metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c35a" />
          <stop offset="1" stopColor="#c9761f" />
        </linearGradient>
        <radialGradient id={i.glow} cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="1" stopColor="#f3c15a" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="#000" opacity=".12" />
      <circle cx="32" cy="6" r="3" fill="none" stroke={`url(#${i.metal})`} strokeWidth="2.4" />
      <path d="M24 16 32 9l8 7z" fill={`url(#${i.metal})`} />
      <path d="M22 18h20l-2 4H24z" fill={`url(#${i.metal})`} />
      <path d="M23 22h18l3 10-3 14H23l-3-14z" fill={`url(#${i.glow})`} />
      <path d="M32 22v24M23 22l9 12 9-12M20 32h24" stroke={`url(#${i.metal})`} strokeWidth="2" fill="none" />
      <path d="M22 46h20l2 5H20z" fill={`url(#${i.metal})`} />
      <path d="M25 25c1.5-1 3.5-1.5 5-1.2" stroke="#fff" strokeOpacity=".8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
