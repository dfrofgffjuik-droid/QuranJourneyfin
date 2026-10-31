// Page-based Mushaf reading mode (approved Phase 1 design). Owns page layout,
// turning (buttons, keyboard, swipe), the desktop ayah menu, and the reading
// docks; all reading actions are delegated to the Reader.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { Sheet } from './ui'
import { MushafPage, PageNumber, PageSkeleton, surahNameAr, type PageMarks } from './MushafPage'
import { useL } from '../lib/i18n'
import { JUZ, SURAHS, pageOf, surah } from '../lib/quran'
import { TOTAL_PAGES, clampPage, usePage, type MushafPageData } from '../lib/usePage'
import { useActive } from '../lib/store'

export type ReadMode = 'mushaf' | 'ayah' | 'flow'
export type QuickAction = 'play' | 'tafsir' | 'bookmark' | 'recite' | 'copy' | 'share' | 'more'

export const READ_MODES: { id: ReadMode; ar: string; en: string; icon: string }[] = [
  { id: 'mushaf', ar: 'مصحف', en: 'Mushaf', icon: 'book' },
  { id: 'ayah', ar: 'آية بآية', en: 'Ayah by ayah', icon: 'layers' },
  { id: 'flow', ar: 'قراءة متصلة', en: 'Continuous', icon: 'note' },
]

export function ModeSwitch({ mode, onChange, compact = false }: { mode: ReadMode; onChange: (m: ReadMode) => void; compact?: boolean }) {
  const { L } = useL()
  return (
    <div role="radiogroup" aria-label={L('وضع القراءة', 'Reading mode')} className="inline-flex max-w-full rounded-full bg-night/[.06] p-1">
      {READ_MODES.map((m) => {
        const on = m.id === mode
        return (
          <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(m.id)} className={`press flex items-center gap-1.5 whitespace-nowrap rounded-full ${compact ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-4 text-[13.5px]'} ${on ? 'bg-card font-semibold text-night shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted hover:text-night'}`}>
            <Icon name={m.icon} size={compact ? 14 : 15} />
            {L(m.ar, m.en)}
          </button>
        )
      })}
    </div>
  )
}

const toLatin = (v: string) => v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

/** Apple-style momentum projection: where a flick would come to rest. */
const project = (v: number, d = 0.998) => ((v / 1000) * d) / (1 - d)
const rubber = (x: number, dim: number, c = 0.55) => (x * dim * c) / (dim + c * Math.abs(x))

type Props = {
  pg: number
  size: string
  marks: PageMarks
  ribbon: boolean
  bookmarked: (s: number, a: number) => boolean
  onGo: (pg: number) => void
  onGoAyah: (s: number, a: number) => void
  onAyah: (s: number, a: number) => void
  onQuick: (act: QuickAction, s: number, a: number) => void
  onSelect: (at: { s: number; a: number } | null) => void
  selecting: boolean
  player: ReactNode
  playing: boolean
  loading: boolean
  onPlay: () => void
  onSettings: () => void
}

export function MushafReader(p: Props) {
  const { L, N } = useL()
  const { d, error } = usePage(p.pg)
  const [menu, setMenu] = useState<{ s: number; a: number; x: number; y: number; below: boolean } | null>(null)
  const [nav, setNav] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const canPrev = p.pg > 1
  const canNext = p.pg < TOTAL_PAGES

  // Close the anchored menu whenever the page changes.
  useEffect(() => setMenu(null), [p.pg])
  useEffect(() => p.onSelect(menu ? { s: menu.s, a: menu.a } : null), [menu]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: in an RTL mushaf the next page is to the left.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft' && canNext) (e.preventDefault(), p.onGo(p.pg + 1))
      else if (e.key === 'ArrowRight' && canPrev) (e.preventDefault(), p.onGo(p.pg - 1))
      else if (e.key === 'Escape') setMenu(null)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [p, canNext, canPrev])

  useEffect(() => {
    if (!menu) return
    const down = (e: PointerEvent) => !(e.target as HTMLElement).closest('[data-mf-menu], .mf-ayah') && setMenu(null)
    addEventListener('pointerdown', down, true)
    return () => removeEventListener('pointerdown', down, true)
  }, [menu])

  const onAyah = (s: number, a: number, el: HTMLElement) => {
    if (p.selecting || !matchMedia('(min-width: 768px)').matches) return p.onAyah(s, a)
    const box = area.current!.getBoundingClientRect()
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect()
    const below = r.top - box.top < 150
    setMenu((m) => (m?.s === s && m.a === a ? null : { s, a, x: r.left + r.width / 2 - box.left, y: below ? r.bottom - box.top + 10 : r.top - box.top - 10, below }))
  }

  return (
    <div dir="rtl" className="relative">
      <div ref={area} className="relative flex items-start justify-center gap-6 lg:gap-10">
        <div className="sticky top-1/2 mt-[30vh] hidden md:block">
          <TurnBtn dir="prev" disabled={!canPrev} onClick={() => p.onGo(p.pg - 1)} />
        </div>
        <SwipeTrack pg={p.pg} canPrev={canPrev} canNext={canNext} onGo={p.onGo}>
          {error ? (
            <div className="mf-paper rounded-[10px] p-8 text-center text-clay">{L('تعذّر تحميل الصفحة. تحقّق من الاتصال وأعد المحاولة.', 'Couldn’t load this page. Check your connection and try again.')}</div>
          ) : d ? (
            <MushafPage d={d} size={p.size} marks={p.marks} ribbon={p.ribbon} onAyah={onAyah} />
          ) : (
            <PageSkeleton />
          )}
        </SwipeTrack>
        <div className="sticky top-1/2 mt-[30vh] hidden md:block">
          <TurnBtn dir="next" disabled={!canNext} onClick={() => p.onGo(p.pg + 1)} />
        </div>
        {menu && <AyahMenu {...menu} saved={p.bookmarked(menu.s, menu.a)} onPick={(act) => (setMenu(null), p.onQuick(act, menu.s, menu.a))} width={area.current?.offsetWidth ?? 800} />}
      </div>

      {/* Desktop: bottom bar with position, previous / next and page jump. */}
      <footer className="glass-panel fixed inset-x-0 bottom-0 z-30 hidden h-[76px] items-center justify-between gap-6 px-8 md:start-64 md:flex" style={{ borderRadius: 0 }}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-full bg-[var(--mf-paper)] p-0.5"><PageNumber pg={p.pg} /></span>
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-semibold">
              {L(`صفحة ${N(p.pg)}`, `Page ${p.pg}`)} <span className="font-normal text-muted">{L(`من ${N(TOTAL_PAGES)}`, `of ${TOTAL_PAGES}`)}</span>
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted">
              <Progress pg={p.pg} />
              {d && <span className="truncate">{d.blocks.map((b) => surahNameAr(b.s)).join('، ')}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" disabled={!canPrev} onClick={() => p.onGo(p.pg - 1)} className="press flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium ring-1 ring-line hover:bg-night/[.04] disabled:opacity-35">
            <Icon name="chevron" size={16} />
            {L('السابقة', 'Previous')}
          </button>
          <button type="button" disabled={!canNext} onClick={() => p.onGo(p.pg + 1)} className="press flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[13.5px] font-semibold text-parchment disabled:opacity-35">
            {L('التالية', 'Next')}
            <Icon name="chevron" size={16} className="rotate-180" />
          </button>
        </div>
        <JumpControl pg={p.pg} onGo={p.onGo} />
      </footer>

      {/* Desktop: floating player above the bar. */}
      {!p.selecting && <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 hidden justify-center px-4 md:start-64 md:flex">{p.player}</div>}

      {/* Mobile: thumb-reach reading dock above the app navigation. */}
      <div className={`fixed inset-x-0 bottom-[92px] z-30 px-3 md:hidden ${p.selecting ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-md">
          {p.playing && <div className="mb-2 flex justify-center">{p.player}</div>}
          <div className="glass-panel flex h-16 items-center gap-1 rounded-full px-2">
            <button type="button" aria-label={L('الصفحة السابقة', 'Previous page')} disabled={!canPrev} onClick={() => p.onGo(p.pg - 1)} className="press flex h-12 w-12 items-center justify-center rounded-full hover:bg-night/[.06] disabled:opacity-30">
              <Icon name="chevron" size={22} />
            </button>
            <button type="button" onClick={() => setNav(true)} className="press flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-full bg-night/[.05] leading-tight">
              <span className="text-[15px] font-semibold tabular-nums">
                {N(p.pg)} <span className="font-normal text-muted">/ {N(TOTAL_PAGES)}</span>
              </span>
              <span className="text-[10.5px] text-muted">{L('اضغط للانتقال', 'Tap to navigate')}</span>
            </button>
            <button type="button" aria-label={L('الصفحة التالية', 'Next page')} disabled={!canNext} onClick={() => p.onGo(p.pg + 1)} className="press flex h-12 w-12 items-center justify-center rounded-full hover:bg-night/[.06] disabled:opacity-30">
              <Icon name="chevron" size={22} className="rotate-180" />
            </button>
            <span className="mx-0.5 h-7 w-px bg-line" />
            <button type="button" onClick={p.onPlay} aria-label={p.playing ? L('إيقاف', 'Stop') : L('استمع', 'Listen')} aria-pressed={p.playing} className={`press flex h-12 w-12 items-center justify-center rounded-full ${p.playing ? 'bg-gold-soft text-gold' : 'hover:bg-night/[.06]'}`}>
              {p.playing && p.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold" /> : <Icon name={p.playing ? 'pause' : 'play'} size={19} fill={p.playing} />}
            </button>
            <button type="button" onClick={p.onSettings} aria-label={L('إعدادات القراءة', 'Reading settings')} className="press flex h-12 w-12 items-center justify-center rounded-full hover:bg-night/[.06]">
              <Icon name="type" size={19} />
            </button>
          </div>
        </div>
      </div>

      <PageNavSheet open={nav} pg={p.pg} d={d} onClose={() => setNav(false)} onGo={(n) => (setNav(false), p.onGo(n))} onGoAyah={(s, a) => (setNav(false), p.onGoAyah(s, a))} />
    </div>
  )
}

/** Holds the page and turns it with a 1:1 horizontal drag; a flick projects past the threshold. */
function SwipeTrack({ pg, canPrev, canNext, onGo, children }: { pg: number; canPrev: boolean; canNext: boolean; onGo: (pg: number) => void; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null)
  const g = useRef<{ id: number; x: number; y: number; lock: boolean | null; hist: [number, number][] } | null>(null)
  const swiped = useRef(false)
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(false)
  const [fade, setFade] = useState(false)
  const prevPg = useRef(pg)

  // New page enters from the side the gesture pointed to, then settles.
  useEffect(() => {
    if (prevPg.current === pg) return
    const fwd = pg > prevPg.current
    prevPg.current = pg
    if (!el.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return (setDx(0), setFade(false))
    setAnim(false)
    setDx((fwd ? -1 : 1) * Math.min(80, el.current.offsetWidth * 0.18))
    setFade(true)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => (setAnim(true), setDx(0), setFade(false))))
    return () => cancelAnimationFrame(id)
  }, [pg])

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, lock: null, hist: [[e.timeStamp, e.clientX]] }
    swiped.current = false
    setAnim(false)
  }
  const move = (e: React.PointerEvent) => {
    const s = g.current
    if (!s || s.id !== e.pointerId) return
    const ddx = e.clientX - s.x
    const ddy = e.clientY - s.y
    if (s.lock === null && Math.hypot(ddx, ddy) > 10) {
      s.lock = Math.abs(ddx) > Math.abs(ddy) * 1.2
      if (s.lock) el.current?.setPointerCapture(e.pointerId)
    }
    if (!s.lock) return
    s.hist.push([e.timeStamp, e.clientX])
    if (s.hist.length > 6) s.hist.shift()
    const w = el.current?.offsetWidth ?? 360
    // Dragging right reveals the next page (RTL book); resist at the ends.
    const blocked = (ddx > 0 && !canNext) || (ddx < 0 && !canPrev)
    setDx(blocked ? rubber(ddx, w) : ddx)
  }
  const up = (e: React.PointerEvent) => {
    const s = g.current
    g.current = null
    if (!s || !s.lock) return
    swiped.current = true
    const [t0, x0] = s.hist[0]
    const [t1, x1] = s.hist[s.hist.length - 1]
    const v = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0
    const ddx = e.clientX - s.x
    const w = el.current?.offsetWidth ?? 360
    const end = ddx + project(v)
    setAnim(true)
    if (end > w * 0.3 && canNext) (setDx(w * 0.6), setFade(true), setTimeout(() => onGo(pg + 1), 140))
    else if (end < -w * 0.3 && canPrev) (setDx(-w * 0.6), setFade(true), setTimeout(() => onGo(pg - 1), 140))
    else setDx(0)
  }

  return (
    <div
      ref={el}
      className="mf-track w-full min-w-0 max-w-[640px]"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={(e) => swiped.current && (e.stopPropagation(), (swiped.current = false))}
      style={{ transform: `translate3d(${dx}px,0,0)`, opacity: fade ? 0.35 : 1, transition: anim ? 'transform 320ms cubic-bezier(.2,.9,.25,1), opacity 220ms ease' : 'none' }}
    >
      {children}
    </div>
  )
}

export function TurnBtn({ dir, onClick, disabled }: { dir: 'next' | 'prev'; onClick?: () => void; disabled?: boolean }) {
  const { L } = useL()
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={dir === 'next' ? L('الصفحة التالية', 'Next page') : L('الصفحة السابقة', 'Previous page')} title={dir === 'next' ? L('الصفحة التالية (←)', 'Next page (←)') : L('الصفحة السابقة (→)', 'Previous page (→)')} className="press glass-panel flex h-14 w-14 items-center justify-center rounded-full text-night hover:text-gold disabled:opacity-35">
      <Icon name="chevron" size={22} className={dir === 'next' ? 'rotate-180' : ''} />
    </button>
  )
}

export function Progress({ pg, w = 160 }: { pg: number; w?: number }) {
  return (
    <span className="relative block h-1 shrink-0 overflow-hidden rounded-full bg-night/10" style={{ width: w }}>
      <span className="absolute inset-y-0 start-0 rounded-full bg-gold transition-[width] duration-300" style={{ width: `${Math.max(1, (pg / TOTAL_PAGES) * 100)}%` }} />
    </span>
  )
}

function JumpControl({ pg, onGo }: { pg: number; onGo: (n: number) => void }) {
  const { L, N } = useL()
  const [v, setV] = useState('')
  const n = Number(toLatin(v.trim()))
  const ok = Number.isInteger(n) && n >= 1 && n <= TOTAL_PAGES
  return (
    <form onSubmit={(e) => (e.preventDefault(), ok && (onGo(n), setV('')))} className="flex shrink-0 items-center gap-1 rounded-full bg-night/[.05] p-1 ps-4">
      <label className="text-[12.5px] text-muted" htmlFor="mf-jump">{L('انتقال إلى', 'Go to')}</label>
      <input id="mf-jump" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} placeholder={N(pg)} aria-invalid={!!v && !ok} className="h-8 w-16 rounded-full bg-card text-center text-[14px] font-semibold outline-none ring-1 ring-line placeholder:text-muted/60 focus:ring-2 focus:ring-gold aria-[invalid=true]:ring-clay" />
      <button type="submit" disabled={!ok} className="press h-8 rounded-full bg-night px-3.5 text-[12.5px] font-semibold text-parchment disabled:opacity-40">{L('اذهب', 'Go')}</button>
    </form>
  )
}

const QUICK: { id: QuickAction; icon: string; ar: string; en: string }[] = [
  { id: 'play', icon: 'play', ar: 'استماع', en: 'Listen' },
  { id: 'tafsir', icon: 'tafsir', ar: 'التفسير', en: 'Tafsir' },
  { id: 'bookmark', icon: 'bookmark', ar: 'علامة', en: 'Mark' },
  { id: 'recite', icon: 'mic', ar: 'تسميع', en: 'Recite' },
  { id: 'copy', icon: 'copy', ar: 'نسخ', en: 'Copy' },
  { id: 'share', icon: 'share', ar: 'مشاركة', en: 'Share' },
  { id: 'more', icon: 'more', ar: 'المزيد', en: 'More' },
]

/** Desktop ayah menu, anchored to the ayah that opened it. */
function AyahMenu({ s, a, x, y, below, saved, width, onPick }: { s: number; a: number; x: number; y: number; below: boolean; saved: boolean; width: number; onPick: (act: QuickAction) => void }) {
  const { L, N } = useL()
  const W = 380
  const left = Math.max(8, Math.min(x - W / 2, width - W - 8))
  return (
    <div data-mf-menu className="glass-panel materialize absolute z-20 rounded-[22px] p-2.5" data-state="open" role="menu" aria-label={L(`خيارات الآية ${N(a)}`, `Ayah ${a} options`)} style={{ width: W, left, top: y, transform: below ? undefined : 'translateY(-100%)', transformOrigin: `${x - left}px ${below ? '0%' : '100%'}` }}>
      <p className="px-2.5 pb-2 pt-1 text-[13px] font-semibold">{L(`${surahNameAr(s)} · الآية ${N(a)}`, `${surah(s).en} · ayah ${a}`)}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {QUICK.map((q) => (
          <button key={q.id} type="button" role="menuitem" onClick={() => onPick(q.id)} className="press flex flex-col items-center gap-1 rounded-[14px] py-2 text-[11px] text-night/80 hover:bg-night/[.06]">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${q.id === 'bookmark' && saved ? 'bg-gold-soft text-gold' : 'bg-night/[.05]'}`}>
              <Icon name={q.icon} size={17} fill={q.id === 'bookmark' && saved} />
            </span>
            {q.id === 'bookmark' && saved ? L('محفوظة', 'Saved') : L(q.ar, q.en)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Mobile page navigation: page / surah / juz, plus last read and bookmarks. */
function PageNavSheet({ open, pg, d, onClose, onGo, onGoAyah }: { open: boolean; pg: number; d: MushafPageData | null; onClose: () => void; onGo: (pg: number) => void; onGoAyah: (s: number, a: number) => void }) {
  const { L, N, lang } = useL()
  const p = useActive()
  const [tab, setTab] = useState<'page' | 'surah' | 'juz'>('page')
  const [v, setV] = useState(pg)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (open) (setV(pg), setQ(''))
  }, [open, pg])
  const list = SURAHS.filter((x) => !q || x.ar.includes(q) || x.en.toLowerCase().includes(q.toLowerCase()) || String(x.n) === toLatin(q))
  const juzNow = d?.juz
  const marks = (p?.bookmarks ?? []).slice(0, 3).map((k) => k.split(':').map(Number) as [number, number])
  return (
    <Sheet open={open} onClose={onClose} title={L('الانتقال في المصحف', 'Go to page')}>
      <div role="tablist" className="mb-5 grid grid-cols-3 rounded-full bg-night/[.06] p-1 text-[13.5px]">
        {([['page', L('صفحة', 'Page')], ['surah', L('سورة', 'Surah')], ['juz', L('جزء', 'Juz')]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`press h-9 rounded-full ${tab === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      {tab === 'page' && (
        <div>
          <div className="flex items-center justify-center gap-6">
            <button type="button" onClick={() => setV((x) => clampPage(x - 1))} aria-label={L('السابقة', 'Previous')} className="press flex h-12 w-12 items-center justify-center rounded-full bg-night/[.06]"><Icon name="minus" size={20} /></button>
            <div className="min-w-[7rem] text-center">
              <p className="mf-serif text-[56px] font-bold leading-none tabular-nums">{N(v)}</p>
              <p className="mt-1 text-[12px] text-muted">{L(`من ${N(TOTAL_PAGES)} صفحة`, `of ${TOTAL_PAGES} pages`)}</p>
            </div>
            <button type="button" onClick={() => setV((x) => clampPage(x + 1))} aria-label={L('التالية', 'Next')} className="press flex h-12 w-12 items-center justify-center rounded-full bg-night/[.06]"><Icon name="plus" size={20} /></button>
          </div>
          <input type="range" min={1} max={TOTAL_PAGES} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label={L('رقم الصفحة', 'Page number')} className="mt-7 w-full accent-[var(--color-gold)]" dir="rtl" />
          <div className="mt-1 flex justify-between text-[11px] text-muted" dir="rtl"><span>{N(1)}</span><span>{N(302)}</span><span>{N(TOTAL_PAGES)}</span></div>
          <button type="button" onClick={() => onGo(v)} className="press mt-5 h-12 w-full rounded-2xl bg-night text-[15px] font-semibold text-parchment">{L(`انتقل إلى الصفحة ${N(v)}`, `Go to page ${v}`)}</button>
          {(p?.last || marks.length > 0) && <p className="mb-2 mt-6 text-[12.5px] font-semibold text-muted">{L('متابعة القراءة', 'Continue')}</p>}
          <div className="space-y-2">
            {p?.last && <Row icon="clock" title={L('آخر قراءة', 'Last read')} sub={L(`${surahNameAr(p.last.s)} · صفحة ${N(pageOf(p.last.s, p.last.a))}`, `${surah(p.last.s).en} · page ${pageOf(p.last.s, p.last.a)}`)} onClick={() => onGoAyah(p.last!.s, p.last!.a)} />}
            {marks.map(([s, a]) => (
              <Row key={`${s}:${a}`} icon="bookmark" title={L('علامة', 'Bookmark')} sub={L(`${surahNameAr(s)} ${N(a)} · صفحة ${N(pageOf(s, a))}`, `${surah(s).en} ${s}:${a} · page ${pageOf(s, a)}`)} onClick={() => onGoAyah(s, a)} />
            ))}
          </div>
        </div>
      )}
      {tab === 'surah' && (
        <div>
          <label className="mb-3 flex h-11 items-center gap-2 rounded-full bg-night/[.05] px-4 text-[13.5px] text-muted">
            <Icon name="search" size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('ابحث عن سورة', 'Search surahs')} className="min-w-0 flex-1 bg-transparent text-night outline-none placeholder:text-muted" />
          </label>
          <div className="-mx-1 max-h-[45vh] space-y-0.5 overflow-y-auto">
            {list.map((x) => (
              <button key={x.n} type="button" onClick={() => onGoAyah(x.n, 1)} className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-start ${d?.blocks.some((b) => b.s === x.n) ? 'bg-gold-soft/70' : 'hover:bg-night/[.04]'}`}>
                <span className="mf-serif flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ring-1 ring-[var(--mf-frame)]">{N(x.n)}</span>
                <span className="flex-1 text-[14px] font-medium">{lang === 'ar' ? surahNameAr(x.n) : x.en}</span>
                <span className="text-[12px] text-muted">{L(`ص ${N(x.pages[0])}`, `p. ${x.pages[0]}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === 'juz' && (
        <div className="grid grid-cols-5 gap-2">
          {JUZ.map(([s, a], i) => (
            <button key={i} type="button" onClick={() => onGoAyah(s, a)} aria-label={L(`الجزء ${N(i + 1)}`, `Juz ${i + 1}`)} className={`press mf-serif flex h-12 items-center justify-center rounded-[14px] text-[17px] ${juzNow === i + 1 ? 'bg-night text-parchment' : 'bg-night/[.05] hover:bg-night/[.09]'}`}>{N(i + 1)}</button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function Row({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[16px] bg-night/[.04] px-4 py-3 text-start hover:bg-night/[.07]">
      <Icon name={icon} size={18} className="text-gold" />
      <span className="flex-1 text-[13.5px]"><b className="font-semibold">{title}</b> <span className="text-muted">· {sub}</span></span>
      <Icon name="chevron" size={16} className="rotate-180 text-muted" />
    </button>
  )
}
