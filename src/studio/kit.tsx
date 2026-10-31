import type { CSSProperties, FC, ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { useP } from './proto'

export type Tone = 'a' | 'b' | 'c' | 'd' | 'e'
export type Theme = {
  vars: Record<string, string>
  tones: Record<Tone, [string, string]>
  card: 'soft' | 'glow' | 'outline' | 'rule' | 'organic' | 'block' | 'bubble' | 'neon' | 'sticker' | 'story' | 'leaf' | 'mondrian'
  btn: 'pill' | 'glow' | 'square' | 'ink' | 'organic' | 'block' | 'chunky'
  head: 'plain' | 'serif' | 'huge' | 'round'
  bar: 'soft' | 'dark' | 'tool' | 'serif' | 'organic' | 'mono' | 'kid'
  reader: 'cards' | 'focus' | 'lines' | 'page'
  progress: 'rings' | 'bars' | 'heat' | 'ledger' | 'garden' | 'numbers'
  week: 'chips' | 'timeline' | 'calendar' | 'list' | 'grid'
  sheet: 'bottom' | 'side' | 'center' | 'full'
  dark?: boolean
}

export type Concept = {
  id: string
  name: string
  ar: string
  tagline: string
  rationale: string
  principles: [string, string][]
  refs: string[]
  swatches: string[]
  kidsName: string
  kidsTagline: string
  kidsSwatches: string[]
  sample: { ui: string; display: string }
  adult: Theme
  kids: Theme
  Shell: FC<{ children: ReactNode }>
  KidsShell: FC<{ children: ReactNode }>
  Home: FC
  KidsHome: FC
}

export const themeStyle = (t: Theme): CSSProperties => t.vars as CSSProperties

// --- Icons: product icon set + a few studio-only glyphs -----------------------
const EXTRA: Record<string, string> = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  flame: 'M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.3 1.6 1.2 2.6 2.3 3C10 8 11 5 14 3c0 3 5 5.5 5 11 0 4-3 7-7 7z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM5 5H3v1a3 3 0 0 0 3 3M19 5h2v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  gift: 'M4 10h16v4H4zM5 14h14v7H5zM12 10v11M12 10s-1.5-5-4.5-5a2 2 0 0 0 0 4c2 0 4.5 1 4.5 1zM12 10s1.5-5 4.5-5a2 2 0 0 1 0 4c-2 0-4.5 1-4.5 1z',
  map: 'M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20',
  leaf: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 9a2 2 0 0 1 4 0',
  share: 'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  note: 'M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  drag: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  phone: 'M7 2h10v20H7zM11 18h2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7h.01',
  refresh: 'M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5l2-2.5M20 20v-5h-5',
  arrow: 'M19 12H5M11 6l-6 6 6 6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
}
export function I({ n, s = 20, className = '', fill = false }: { n: string; s?: number; className?: string; fill?: boolean }) {
  if (!EXTRA[n]) return <Icon name={n} size={s} className={className} fill={fill} />
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={EXTRA[n]} />
    </svg>
  )
}

// --- Styling maps -----------------------------------------------------------
const CARD: Record<Theme['card'], string> = {
  soft: 'bg-(--surface) rounded-[22px] shadow-[0_1px_2px_rgba(16,24,40,.04),0_10px_28px_-14px_rgba(16,24,40,.16)]',
  glow: 'bg-(--surface) rounded-[20px] border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]',
  outline: 'bg-(--surface) rounded-[10px] border border-(--line)',
  rule: 'bg-transparent border-t border-(--line) rounded-none',
  organic: 'bg-(--surface) rounded-[26px_10px_26px_10px] ring-1 ring-(--line)',
  block: 'bg-(--surface) border-2 border-(--ink) rounded-none',
  bubble: 'bg-(--surface) rounded-[26px] border-2 border-(--line) border-b-[6px]',
  neon: 'bg-(--surface) rounded-[26px] ring-1 ring-white/10 shadow-[0_0_40px_-14px_var(--accent)]',
  sticker: 'bg-(--surface) rounded-[16px] border border-(--line) shadow-[0_3px_0_var(--line)]',
  story: 'bg-(--surface) rounded-[22px] border-2 border-dashed border-(--line)',
  leaf: 'bg-(--surface) rounded-[30px_30px_30px_8px] shadow-[0_5px_0_var(--line)]',
  mondrian: 'bg-(--surface) border-[3px] border-(--ink) rounded-none',
}
const PAD: Record<Theme['card'], string> = { soft: 'p-4', glow: 'p-4', outline: 'p-4', rule: 'py-4', organic: 'p-4', block: 'p-4', bubble: 'p-4', neon: 'p-4', sticker: 'p-4', story: 'p-4', leaf: 'p-4', mondrian: 'p-4' }

const BTN: Record<Theme['btn'], string> = {
  pill: 'rounded-full bg-(--ink) text-(--bg) shadow-[0_6px_16px_-8px_rgba(0,0,0,.5)]',
  glow: 'rounded-full bg-(--accent) text-(--accent-ink) shadow-[0_0_26px_-6px_var(--accent)]',
  square: 'rounded-[8px] bg-(--accent) text-(--accent-ink)',
  ink: 'rounded-[2px] bg-(--ink) text-(--bg) tracking-wide',
  organic: 'rounded-[18px_6px_18px_6px] bg-(--accent) text-(--accent-ink)',
  block: 'rounded-none bg-(--accent) text-(--accent-ink) border-2 border-(--ink) shadow-[3px_3px_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  chunky: 'rounded-[20px] bg-(--accent) text-(--accent-ink) border-b-[5px] border-black/25 active:translate-y-[2px] active:border-b-[3px]',
}
const SOFT: Record<Theme['btn'], string> = {
  pill: 'rounded-full bg-(--surface) text-(--ink) ring-1 ring-(--line)',
  glow: 'rounded-full bg-white/[.06] text-(--ink) ring-1 ring-white/10',
  square: 'rounded-[8px] bg-(--surface) text-(--ink) border border-(--line)',
  ink: 'rounded-[2px] text-(--ink) border border-(--ink)',
  organic: 'rounded-[18px_6px_18px_6px] bg-(--surface-2) text-(--ink)',
  block: 'rounded-none bg-(--surface) text-(--ink) border-2 border-(--ink)',
  chunky: 'rounded-[20px] bg-(--surface) text-(--ink) border-2 border-(--line) border-b-[5px]',
}

export const cardCls = (t: Theme) => CARD[t.card]

export function Card({ children, className = '', onClick, pad = true, style }: { children: ReactNode; className?: string; onClick?: () => void; pad?: boolean; style?: CSSProperties }) {
  const { theme } = useP()
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} style={style} className={`block w-full text-start ${CARD[theme.card]} ${pad ? PAD[theme.card] : ''} ${onClick ? 'transition active:scale-[.99]' : ''} ${className}`}>
      {children}
    </C>
  )
}

export function Btn({ children, onClick, kind = 'primary', size = 'md', full, className = '', disabled }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'soft' | 'ghost'; size?: 'sm' | 'md' | 'lg'; full?: boolean; className?: string; disabled?: boolean }) {
  const { theme } = useP()
  const sz = size === 'sm' ? 'h-9 px-3.5 text-[13px]' : size === 'lg' ? 'h-14 px-6 text-[16px]' : 'h-11 px-5 text-[14px]'
  const look = kind === 'primary' ? BTN[theme.btn] : kind === 'soft' ? SOFT[theme.btn] : 'text-(--accent)'
  return (
    <button disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 font-semibold transition disabled:opacity-40 ${sz} ${look} ${full ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  )
}

export function Title({ children, sub, size = 'md', className = '' }: { children: ReactNode; sub?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const { theme } = useP()
  const base = {
    plain: { sm: 'text-[15px] font-semibold', md: 'text-[20px] font-semibold tracking-tight', lg: 'text-[26px] font-semibold tracking-tight leading-tight', xl: 'text-[32px] font-semibold tracking-tight leading-[1.15]' },
    serif: { sm: 'text-[17px] font-bold', md: 'text-[23px] font-bold', lg: 'text-[30px] font-bold leading-tight', xl: 'text-[38px] font-bold leading-[1.15]' },
    huge: { sm: 'text-[15px] font-bold', md: 'text-[22px] font-extrabold', lg: 'text-[34px] font-black leading-none', xl: 'text-[48px] font-black leading-[.95] tracking-tight' },
    round: { sm: 'text-[17px] font-bold', md: 'text-[23px] font-bold', lg: 'text-[30px] font-extrabold leading-tight', xl: 'text-[38px] font-extrabold leading-[1.1]' },
  }[theme.head][size]
  return (
    <div className={className}>
      <h2 className={`font-(family-name:--font-display) text-(--ink) ${base}`}>{children}</h2>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-(--muted)">{sub}</p>}
    </div>
  )
}

export function Section({ title, action, children, className = '' }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  const { theme } = useP()
  return (
    <section className={`mt-6 ${className}`}>
      <div className={`mb-3 flex items-end justify-between gap-3 ${theme.head === 'serif' ? 'border-b border-(--line) pb-2' : ''}`}>
        {theme.head === 'huge' ? (
          <h3 className="text-[11px] font-bold uppercase tracking-[.2em] text-(--muted)">{title}</h3>
        ) : (
          <h3 className={`font-(family-name:--font-display) text-(--ink) ${theme.head === 'serif' ? 'text-[19px] font-bold' : 'text-[16px] font-semibold'}`}>{title}</h3>
        )}
        {action}
      </div>
      {children}
    </section>
  )
}

export function Chip({ children, active, onClick, className = '' }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  const { theme } = useP()
  const shape = { pill: 'rounded-full', glow: 'rounded-full', square: 'rounded-[6px]', ink: 'rounded-none', organic: 'rounded-[12px_4px_12px_4px]', block: 'rounded-none border-2', chunky: 'rounded-full border-2' }[theme.btn]
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 border px-3.5 text-[13px] font-medium transition ${shape} ${active ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--line) bg-(--surface) text-(--ink)'} ${className}`}
    >
      {children}
    </button>
  )
}

export function Bar({ v, className = '', tone }: { v: number; className?: string; tone?: string }) {
  const { theme } = useP()
  const h = theme.card === 'block' || theme.card === 'mondrian' ? 'h-2.5 rounded-none border border-(--ink)' : theme.card === 'rule' ? 'h-[3px] rounded-none' : 'h-2 rounded-full'
  return (
    <div className={`w-full overflow-hidden bg-(--surface-2) ${h} ${className}`}>
      <div className="h-full rounded-[inherit] transition-all" style={{ width: `${Math.round(v * 100)}%`, background: tone ?? 'var(--accent)' }} />
    </div>
  )
}

export function Ring({ v, size = 64, stroke = 7, children, color }: { v: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? 'var(--accent)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[12px] font-bold text-(--ink)">{children}</div>
    </div>
  )
}

export function ToneDot({ t, className = '' }: { t: string; className?: string }) {
  const { theme } = useP()
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ background: theme.tones[t as Tone]?.[1] }} />
}
export const useTone = () => {
  const { theme } = useP()
  return (t: string) => ({ background: theme.tones[t as Tone]?.[0], color: theme.tones[t as Tone]?.[1] })
}

/** Quran text. */
export function Q({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-(family-name:--font-quran) leading-[2.2] ${className}`}>{children}</span>
}

export function AyahNo({ n, className = '' }: { n: number | string; className?: string }) {
  return <span className={`font-(family-name:--font-quran) text-(--accent) ${className}`}>{'\u06DD'}{String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])}</span>
}

/** Inner-screen top bar. Each concept picks a bar style in its theme. */
export function TopBar({ title, sub, actions, noBack }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; noBack?: boolean }) {
  const { theme, back, stack } = useP()
  const canBack = !noBack && stack.length > 1
  const backBtn = canBack && (
    <button onClick={back} aria-label="رجوع" className={`grid size-10 shrink-0 place-items-center text-(--ink) ${theme.bar === 'soft' || theme.bar === 'kid' ? 'rounded-full bg-(--surface) ring-1 ring-(--line)' : theme.bar === 'dark' ? 'rounded-full bg-white/[.06]' : theme.bar === 'mono' ? 'border-2 border-(--ink)' : theme.bar === 'tool' ? 'rounded-[8px] border border-(--line)' : ''}`}>
      <I n="chevron" s={20} />
    </button>
  )
  if (theme.bar === 'mono')
    return (
      <header className="px-5 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">{backBtn || <span />}<div className="flex gap-2">{actions}</div></div>
        <h1 className="mt-5 font-(family-name:--font-display) text-[40px] font-black leading-[.95] tracking-tight text-(--ink)">{title}</h1>
        {sub && <p className="mt-2 text-[13px] text-(--muted)">{sub}</p>}
      </header>
    )
  if (theme.bar === 'serif')
    return (
      <header className="px-5 pb-3 pt-3 text-center">
        <div className="flex items-center justify-between">{backBtn || <span className="size-10" />}<div className="flex gap-1">{actions}</div></div>
        <h1 className="-mt-1 font-(family-name:--font-display) text-[26px] font-bold text-(--ink)">{title}</h1>
        {sub && <p className="mt-0.5 text-[12px] text-(--muted)">{sub}</p>}
        <Ornament className="mx-auto mt-2" />
      </header>
    )
  if (theme.bar === 'tool')
    return (
      <header className="flex items-center gap-3 border-b border-(--line) bg-(--surface) px-4 py-3">
        {backBtn}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold text-(--ink)">{title}</h1>
          {sub && <p className="truncate text-[12px] text-(--muted)">{sub}</p>}
        </div>
        <div className="flex gap-2">{actions}</div>
      </header>
    )
  return (
    <header className="flex items-center gap-3 px-4 pb-2 pt-3">
      {backBtn}
      <div className={`min-w-0 flex-1 ${theme.bar === 'kid' ? 'text-center' : ''}`}>
        <h1 className={`truncate font-(family-name:--font-display) text-(--ink) ${theme.bar === 'kid' ? 'text-[22px] font-extrabold' : theme.bar === 'organic' ? 'text-[22px] font-bold' : 'text-[19px] font-semibold'}`}>{title}</h1>
        {sub && <p className="truncate text-[12px] text-(--muted)">{sub}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
      {theme.bar === 'kid' && canBack && <span className="size-10" />}
    </header>
  )
}

export function IconBtn({ n, onClick, label, className = '' }: { n: string; onClick?: () => void; label: string; className?: string }) {
  const { theme } = useP()
  const look = theme.bar === 'mono' ? 'border-2 border-(--ink)' : theme.bar === 'tool' ? 'rounded-[8px] border border-(--line)' : theme.bar === 'serif' ? '' : theme.dark ? 'rounded-full bg-white/[.06]' : 'rounded-full bg-(--surface) ring-1 ring-(--line)'
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`grid size-10 shrink-0 place-items-center text-(--ink) ${look} ${className}`}>
      <I n={n} s={19} />
    </button>
  )
}

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg width="120" height="12" viewBox="0 0 120 12" className={`text-(--accent) ${className}`} aria-hidden>
      <path d="M0 6h48M72 6h48" stroke="currentColor" strokeWidth="1" />
      <path d="M60 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="51" cy="6" r="1.4" fill="currentColor" />
      <circle cx="69" cy="6" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function Stepper({ value, onChange, min = 1, max = 60, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Btn kind="soft" size="sm" onClick={() => onChange(Math.max(min, value - 1))} className="!w-11 !px-0"><I n="minus" s={18} /></Btn>
      <div className="text-center">
        <div className="font-(family-name:--font-display) text-[34px] font-bold leading-none text-(--ink)">{String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])}</div>
        {unit && <div className="mt-1 text-[12px] text-(--muted)">{unit}</div>}
      </div>
      <Btn kind="soft" size="sm" onClick={() => onChange(Math.min(max, value + 1))} className="!w-11 !px-0"><I n="plus" s={18} /></Btn>
    </div>
  )
}

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  const { theme } = useP()
  const sq = theme.card === 'block' || theme.card === 'mondrian' || theme.card === 'rule'
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={`relative h-7 w-12 shrink-0 transition ${sq ? 'rounded-none border-2 border-(--ink)' : 'rounded-full'} ${on ? 'bg-(--accent)' : 'bg-(--surface-2)'}`}>
      <span className={`absolute top-1/2 size-5 -translate-y-1/2 bg-white shadow transition-all ${sq ? 'rounded-none' : 'rounded-full'} ${on ? 'start-[calc(100%-1.4rem)]' : 'start-1'}`} />
    </button>
  )
}

export const px = 'px-5'
