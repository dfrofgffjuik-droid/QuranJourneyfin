import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { back } from '../lib/router'
import { useL } from '../lib/i18n'

type BtnProps = {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'gold' | 'soft' | 'ghost' | 'outline' | 'danger' | 'light'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  ariaLabel?: string
}

const VAR = {
  primary: 'bg-night text-parchment hover:bg-night-2',
  gold: 'bg-gold text-white hover:brightness-95',
  soft: 'bg-gold-soft/50 text-night hover:bg-gold-soft',
  ghost: 'text-night hover:bg-night/5',
  outline: 'border border-line bg-card text-night hover:border-night/40',
  danger: 'bg-clay text-white hover:brightness-95',
  // On deep-green hero surfaces.
  light: 'bg-white text-[var(--hero-ink)] hover:bg-white/90',
}
const SIZE = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-14 px-7 text-base' }

export function Button({ children, onClick, href, variant = 'primary', size = 'md', disabled, className = '', type = 'button', ariaLabel }: BtnProps) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:opacity-40 ${VAR[variant]} ${SIZE[size]} ${className}`
  if (href && !disabled)
    return (
      <a href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </a>
    )
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

export function IconButton({ icon, label, onClick, active, className = '', size = 'md' }: { icon: string; label: string; onClick?: () => void; active?: boolean; className?: string; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex ${s} items-center justify-center rounded-full transition ${active ? 'bg-night text-parchment' : 'bg-card text-night ring-1 ring-line hover:ring-night/30'} ${className}`}
    >
      <Icon name={icon} />
    </button>
  )
}

export function Card({ children, className = '', onClick, href }: { children: ReactNode; className?: string; onClick?: () => void; href?: string }) {
  const cls = `rounded-3xl bg-card ring-1 ring-line ${onClick || href ? 'transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-18px_rgba(15,38,33,0.35)] text-start' : ''} ${className}`
  if (href)
    return (
      <a href={href} className={`block ${cls}`}>
        {children}
      </a>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`block w-full ${cls}`}>
        {children}
      </button>
    )
  return <div className={cls}>{children}</div>
}

export function ScreenHeader({ title, subtitle, backTo, action }: { title: ReactNode; subtitle?: ReactNode; backTo?: string | true; action?: ReactNode }) {
  const { L, dir } = useL()
  return (
    <header className="mb-6 flex items-start gap-3">
      {backTo && (
        <button
          type="button"
          onClick={() => (backTo === true ? back() : (location.hash = backTo))}
          className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-line"
          aria-label={L('رجوع', 'Back')}
        >
          <Icon name="back" className={dir === 'rtl' ? 'rotate-180' : ''} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-arabic-display text-[1.9rem] leading-tight text-night md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Section({ title, action, children, className = '' }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-night">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProgressRing({ value, size = 56, stroke = 5, children, tone = 'leaf' }: { value: number; size?: number; stroke?: number; children?: ReactNode; tone?: 'leaf' | 'gold' | 'parchment' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = { leaf: 'var(--color-leaf)', gold: 'var(--color-gold)', parchment: 'var(--color-parchment)' }[tone]
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{children}</div>
    </div>
  )
}

export function Bar({ value, className = '', tone = 'bg-leaf' }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-night/8 ${className}`}>
      <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  )
}

export function Stepper({ value, min, max, onChange, format }: { value: number; min: number; max: number; onChange: (v: number) => void; format?: (n: number) => ReactNode }) {
  const { L } = useL()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 ring-1 ring-line">
      <button type="button" aria-label={L('إنقاص', 'Decrease')} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-night/5 disabled:opacity-30">
        <Icon name="minus" size={18} />
      </button>
      <span className="min-w-14 text-center font-semibold tabular-nums">{format ? format(value) : value}</span>
      <button type="button" aria-label={L('زيادة', 'Increase')} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-night/5 disabled:opacity-30">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const { L } = useL()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-[2px] md:items-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rise max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] bg-parchment p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label={L('إغلاق', 'Close')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-night/5">
            <Icon name="x" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'leaf' | 'gold' | 'clay' | 'sky' }) {
  const t = { neutral: 'bg-night/5 text-night', leaf: 'bg-leaf/10 text-leaf', gold: 'bg-gold-soft/60 text-[#7a5a1f]', clay: 'bg-clay/10 text-clay', sky: 'bg-sky/10 text-sky' }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${t}`}>{children}</span>
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full bg-night/5 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${o.value === value ? 'bg-card font-medium text-night shadow-sm' : 'text-muted hover:text-night'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, body, action }: { icon: string; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft/50 text-night">
        <Icon name={icon} />
      </span>
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
