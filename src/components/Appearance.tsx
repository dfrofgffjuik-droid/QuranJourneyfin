import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useL } from '../lib/i18n'
import { useStore, type Palette, type State } from '../lib/store'
import { PALETTES, setAppearance } from '../lib/theme'

type Mode = State['theme']

const MODES: { id: Mode; ar: string; en: string; icon: string }[] = [
  { id: 'light', ar: 'نهاري', en: 'Day', icon: 'sun' },
  { id: 'dark', ar: 'ليلي', en: 'Night', icon: 'moon' },
  { id: 'system', ar: 'تلقائي', en: 'Auto', icon: 'sparkle' },
]

/** Tiny screen preview: hero band in the palette's colour over a day or night page. */
function ModePreview({ mode, hero }: { mode: Mode; hero: string }) {
  const day = { page: '#eef2f5', card: '#ffffff', line: '#dfe4e9' }
  const night = { page: '#12161a', card: '#1e252b', line: '#2b333a' }
  const pane = (c: typeof day, style?: CSSProperties) => (
    <span className="absolute inset-0 flex flex-col gap-1.5 p-2" style={{ background: c.page, ...style }}>
      <span className="h-5 rounded-md" style={{ background: `linear-gradient(180deg, ${hero}, ${hero}99)` }} />
      <span className="h-3 rounded-[5px]" style={{ background: c.card, boxShadow: `inset 0 0 0 1px ${c.line}` }} />
      <span className="h-3 w-2/3 rounded-[5px]" style={{ background: c.card, boxShadow: `inset 0 0 0 1px ${c.line}` }} />
    </span>
  )
  return (
    <span className="relative block h-[4.6rem] overflow-hidden rounded-[14px]" aria-hidden>
      {mode === 'dark' ? pane(night) : pane(day)}
      {mode === 'system' && pane(night, { clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' })}
    </span>
  )
}

/** Day / Night / Auto picker with live previews. */
export function ModePicker() {
  const { L } = useL()
  const theme = useStore((s) => s.theme)
  const palette = useStore((s) => s.palette) ?? 'garden'
  const hero = PALETTES.find((p) => p.id === palette)!.swatch[1]
  return (
    <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label={L('وضع العرض', 'Display mode')}>
      {MODES.map((m) => {
        const on = theme === m.id
        return (
          <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setAppearance({ theme: m.id })} className="press group text-center">
            <span className={`block rounded-[18px] p-1 ring-2 ${on ? 'ring-gold' : 'ring-transparent group-hover:ring-line'}`}>
              <ModePreview mode={m.id} hero={hero} />
            </span>
            <span className={`mt-1.5 flex items-center justify-center gap-1 text-[13px] ${on ? 'font-semibold text-night' : 'text-muted'}`}>
              <Icon name={m.icon} size={14} />
              {L(m.ar, m.en)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Colour theme swatches. */
export function PalettePicker({ showName = true }: { showName?: boolean }) {
  const { L } = useL()
  const palette = useStore((s) => s.palette) ?? 'garden'
  const current = PALETTES.find((p) => p.id === palette)!
  const pick = (id: Palette) => id !== palette && setAppearance({ palette: id })
  return (
    <div>
      <div className="flex items-center gap-3" role="radiogroup" aria-label={L('لون التطبيق', 'App colour')}>
        {PALETTES.map((p) => {
          const on = p.id === palette
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={L(p.ar, p.en)}
              title={L(p.ar, p.en)}
              onClick={() => pick(p.id)}
              className={`press relative flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card ${on ? 'ring-2 ring-night' : 'ring-0 hover:ring-2 hover:ring-line'}`}
              style={{ background: `linear-gradient(145deg, ${p.swatch[0]} 0%, ${p.swatch[0]} 45%, ${p.swatch[1]} 100%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 2px rgba(0,0,0,.18)' }}
            >
              <Icon name="check" size={17} className={`text-white transition-[opacity,transform] duration-200 ${on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
            </button>
          )
        })}
      </div>
      {showName && <p className="mt-2.5 text-[13px] text-muted">{L(`لون ${current.ar}`, `${current.en} colour`)}</p>}
    </div>
  )
}

/**
 * Appearance trigger + popover. The panel materialises out of the button that
 * opened it (transform-origin = trigger) and dismisses back into it.
 */
export function AppearanceButton({ className = '', iconSize = 20 }: { className?: string; iconSize?: number }) {
  const { L, dir } = useL()
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const W = Math.min(336, innerWidth - 24)
    const up = r.top > innerHeight / 2
    const alignRight = r.left + r.width / 2 > innerWidth / 2
    const left = Math.max(12, Math.min(alignRight ? r.right - W : r.left, innerWidth - W - 12))
    setPos({
      width: W,
      left,
      ...(up ? { bottom: innerHeight - r.top + 10 } : { top: r.bottom + 10 }),
      transformOrigin: `${r.left + r.width / 2 - left}px ${up ? '100%' : '0%'}`,
    })
  }, [])

  const close = useCallback((refocus = false) => {
    setOpen(false)
    if (refocus) btn.current?.focus()
  }, [])

  const toggle = () => {
    if (open) return close()
    place()
    setMounted(true)
    setOpen(true)
  }

  // Enter on the next frame so the closed state paints first and transitions from it.
  const [shown, setShown] = useState(false)
  useLayoutEffect(() => {
    if (!open) return setShown(false)
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) close()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const off = () => close()
    addEventListener('pointerdown', down, true)
    addEventListener('keydown', key)
    addEventListener('resize', off)
    addEventListener('scroll', place, true)
    addEventListener('hashchange', off)
    panel.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true })
    return () => {
      removeEventListener('pointerdown', down, true)
      removeEventListener('keydown', key)
      removeEventListener('resize', off)
      removeEventListener('scroll', place, true)
      removeEventListener('hashchange', off)
    }
  }, [open, close, place])

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={L('المظهر والألوان', 'Appearance & colours')}
        title={L('المظهر والألوان', 'Appearance & colours')}
        className={`press flex h-10 w-10 items-center justify-center rounded-full ${open ? 'bg-night/10' : ''} ${className}`}
      >
        <Icon name="palette" size={iconSize} />
      </button>
      {mounted &&
        createPortal(
          <div
            ref={panel}
            dir={dir}
            role="dialog"
            aria-label={L('المظهر', 'Appearance')}
            data-state={shown ? 'open' : 'closed'}
            onTransitionEnd={(e) => e.target === e.currentTarget && !open && setMounted(false)}
            className="materialize glass-panel fixed z-[60] rounded-[1.75rem] p-5 text-night"
            style={pos}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{L('المظهر', 'Appearance')}</h2>
              <a href="#/settings" className="text-[13px] font-medium text-gold hover:underline">
                {L('إعدادات العرض', 'Display settings')}
              </a>
            </div>
            <div className="mt-4">
              <ModePicker />
            </div>
            <div className="my-4 h-px bg-line/80" />
            <p className="mb-3 text-[13px] font-semibold text-night/80">{L('لون التطبيق', 'App colour')}</p>
            <PalettePicker />
          </div>,
          document.body,
        )}
    </>
  )
}
