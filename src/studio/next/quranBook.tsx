// Open Mushaf on a rahl (folding stand), drawn as a soft shaded 3D icon in the
// iso-glow skill's solid ("Lumen") manner: the shared 30° kernel (./iso), opaque
// shaded faces painted back to front, and light only on what is live.
// The book faces the viewer: its spine runs toward you, the pages open left and
// right, and the stand's X legs and the page-stack edge face front.
//
// Live, from real preview data (never decoration):
//  - text lines light up in the Mushaf's play gold in proportion to today's completed tasks;
//  - the ribbon glows while a task is still open today;
//  - a soft bloom rises behind the book when every task of the day is done.
// Activating it (click / Enter / Space) turns a page, then opens the Mushaf.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { kernel } from './iso'

type V3 = [number, number, number]
const L = 80 // book height, along the spine (toward the viewer)
const WP = 66 // page width from the gutter
const WC = 70 // cover width
const TH = (30 * Math.PI) / 180 // each half rests at 30° on the stand
const ZS = 24 // spine height
const LINES = 8

// Page-stack height across the page (u = 0 gutter … 1 fore-edge): pages curl up from the gutter, then settle.
const stack = (u: number) => 3 + 19 * Math.sin(Math.min(u / 0.3, 1) * (Math.PI / 2)) - 7 * Math.max(0, (u - 0.3) / 0.7) ** 1.3
/** Book point: half s (-1 left page, +1 right page), position u along the spine, t across, n above the cover underside. */
/** Book space → world: the spine points straight at the viewer (rotated 45° in plan), so the book reads front-on and symmetric. */
const W = (a: number, u: number, z: number): V3 => [(u + a) / Math.SQRT2, (u - a) / Math.SQRT2, z]
const at = (s: number, u: number, t: number, n: number): V3 => W(s * (t * Math.cos(TH) - n * Math.sin(TH)), u, ZS + t * Math.sin(TH) + n * Math.cos(TH))
const surf = (s: number, u: number, t: number) => at(s, u, t, 4 + stack(t / WP))
const span = (n: number, a: number, b: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)

const PAGE_STOPS: [number, string][] = [[0, 'color-mix(in oklab, var(--mf-paper) 82%, var(--color-amber))'], [0.18, 'color-mix(in oklab, var(--mf-paper) 55%, white)'], [0.55, 'var(--mf-paper)'], [1, 'color-mix(in oklab, var(--mf-paper) 82%, var(--color-amber))']]

export type BookState = 'rest' | 'open' | 'done'

// Warm clay palette from tokens only (amber wood/cover, Mushaf paper, play gold for what is live).
const AMBER = (k: number, w: 'white' | 'black' = 'white') => `color-mix(in oklab, var(--color-amber) ${k}%, ${w})`
const COL = {
  coverTop: AMBER(70),
  coverHi: AMBER(48),
  coverEdge: AMBER(86, 'black'),
  woodTop: AMBER(62),
  woodHi: AMBER(42),
  woodEnd: AMBER(84, 'black'),
  paper: 'var(--mf-paper)',
  paperHi: 'color-mix(in oklab, var(--mf-paper) 55%, white)',
  paperShade: 'color-mix(in oklab, var(--mf-paper) 82%, var(--color-amber))',
  edge: 'color-mix(in oklab, var(--mf-paper) 86%, var(--color-amber))',
  edgeLine: 'color-mix(in oklab, var(--mf-paper) 62%, var(--color-amber))',
  ink: 'color-mix(in oklab, var(--mf-paper) 70%, var(--color-amber))',
  live: 'var(--mf-play-line)',
}

export function IsoQuranBook({ progress, state, onOpen, label, className = '' }: { progress: number; state: BookState; onOpen: () => void; label: string; className?: string }) {
  const k = kernel(0, 0)
  const id = useId().replace(/:/g, '')
  const pts = (ps: V3[]) => k.poly(ps)
  const [flip, setFlip] = useState<number | null>(null)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const open = () => {
    if (flip !== null) return
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return onOpen()
    const t0 = performance.now()
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / 640)
      setFlip(f)
      if (f < 1) raf.current = requestAnimationFrame(step)
      else (setFlip(null), onOpen())
    }
    raf.current = requestAnimationFrame(step)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), open())
  }
  /** Screen-space gradient between two book points. */
  const grad = (gid: string, a: V3, b: V3, stops: [number, string][]) => {
    const [x1, y1] = k.P(...a)
    const [x2, y2] = k.P(...b)
    return (
      <linearGradient key={gid} id={`${id}-${gid}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        {stops.map(([o, c]) => <stop key={o} offset={o} style={{ stopColor: c }} />)}
      </linearGradient>
    )
  }
  const url = (gid: string) => `url(#${id}-${gid})`

  // ---- stand: two boards crossing in an X under the spine; legs below the crossing
  const floorT = -(ZS / Math.sin(TH)) - 4
  const T = 5
  const board = (s: number, t0: number, t1: number, u0: number, u1: number, key: string) => (
    <g key={key}>
      <polygon points={pts([at(s, u0, t0, 0), at(s, u0, t1, 0), at(s, u1, t1, 0), at(s, u1, t0, 0)])} fill={url('wood')} />
      <polygon points={pts([at(s, u1, t0, 0), at(s, u1, t1, 0), at(s, u1, t1, -T), at(s, u1, t0, -T)])} fill={COL.woodEnd} />
    </g>
  )
  const legs = (s: number) => [board(s, floorT, -4, 8, 24, `l${s}a`), board(s, floorT, -4, L - 24, L - 8, `l${s}b`), board(s, -4, 0, 8, L - 8, `l${s}c`)]
  const tip = WC - 6 // cradle arms stay tucked under the covers
  const stand = [...legs(1), ...legs(-1), board(-1, 0, tip, 8, L - 8, 'ua'), board(1, 0, tip, 8, L - 8, 'ub')]

  // ---- cover of one half
  const cover = (s: number) => {
    const u0 = -3
    const u1 = L + 3
    return (
      <g>
        <polygon points={pts([at(s, u0, 0, 4), at(s, u0, WC, 4), at(s, u1, WC, 4), at(s, u1, 0, 4)])} fill={url(`cov${s}`)} />
        <polygon points={pts([at(s, u1, 0, 4), at(s, u1, WC, 4), at(s, u1, WC, 0), at(s, u1, 0, 0)])} fill={COL.coverEdge} />
        <polygon points={pts([at(s, u0, WC, 4), at(s, u1, WC, 4), at(s, u1, WC, 0), at(s, u0, WC, 0)])} fill={COL.coverEdge} />
      </g>
    )
  }

  // ---- page block: shaded surface, text lines, fore-edge, front section with page layers
  const total = LINES * 2
  const lit = state === 'rest' ? 0 : Math.round(Math.max(0, Math.min(1, progress)) * total)
  const ts = span(16, 0, WP)
  const h = (t: number) => 4 + stack(t / WP)
  const page = (s: number) => {
    const surface = pts([...ts.map((t) => surf(s, 0, t)), ...ts.slice().reverse().map((t) => surf(s, L, t))])
    // Right page first (reading order), lines from the top of the page (far end) down.
    const first = s > 0 ? 0 : LINES
    const lines = Array.from({ length: LINES }, (_, i) => {
      const u = 16 + i * ((L - 30) / (LINES - 1))
      const len = i === 3 || i === 7 ? 0.5 : 1
      const t1 = 19
      const t2 = 19 + (WP - 29) * len
      const on = first + i < lit
      return <polyline key={i} points={pts(span(8, t1, t2).map((t) => surf(s, u, t)))} fill="none" stroke={on ? COL.live : COL.ink} strokeWidth={on ? 1.7 : 1.3} strokeLinecap="round" filter={on ? `url(#${id}-soft)` : undefined} />
    })
    const section = pts([...ts.map((t) => at(s, L, t, h(t))), ...ts.slice().reverse().map((t) => at(s, L, t, 4))])
    const layers = [0.25, 0.5, 0.75].map((q) => pts(ts.map((t) => at(s, L, t, 4 + (h(t) - 4) * q))))
    return (
      <g>
        <polygon points={surface} fill={url(`pg${s}`)} />
        {lines}
        <polygon points={pts([surf(s, 0, WP), surf(s, L, WP), at(s, L, WP, 4), at(s, 0, WP, 4)])} fill={COL.edge} />
        <polygon points={section} fill={COL.edge} />
        {layers.map((l, i) => <polyline key={i} points={l} fill="none" stroke={COL.edgeLine} strokeWidth={0.7} />)}
      </g>
    )
  }

  // ---- ribbon: lies across the right page and hangs over the front edge
  const ribbon = (() => {
    const tr = WP * 0.6
    const a = tr * Math.cos(TH) - h(tr) * Math.sin(TH)
    const path: V3[] = [...span(6, 0, 1).map((q) => surf(1, L * 0.42 + q * L * 0.58, WP * (0.48 + 0.12 * q))), at(1, L + 1.5, tr, h(tr) - 1), W(a + 1, L + 4, ZS + 5), W(a + 2, L + 5, ZS - 5)]
    const live = state === 'open'
    const p = pts(path)
    const end = k.P(...path[path.length - 1])
    const w = 4.25
    const fill = live ? COL.live : AMBER(92, 'black')
    return (
      <g>
        {live && <polyline points={p} fill="none" stroke={COL.live} strokeWidth={9} strokeOpacity={0.5} strokeLinejoin="round" filter={`url(#${id}-bloom)`} />}
        <polyline points={p} fill="none" stroke={fill} strokeWidth={8.5} strokeLinejoin="round" strokeLinecap="butt" />
        <polyline points={p} fill="none" stroke="white" strokeOpacity={0.25} strokeWidth={1.6} strokeLinejoin="round" transform="translate(-1 -1)" />
        <polygon points={`${end[0] - w},${end[1] - 1} ${end[0] + w},${end[1] - 1} ${end[0] + w},${end[1] + 5} ${end[0]},${end[1] + 2} ${end[0] - w},${end[1] + 5}`} fill={fill} />
      </g>
    )
  })()

  // ---- a page turning right → left, only while animating
  const turning = (() => {
    if (flip === null) return null
    const e = flip < 0.5 ? 2 * flip * flip : 1 - (-2 * flip + 2) ** 2 / 2
    const ang = TH + (Math.PI - 2 * TH) * e
    const bend = 10 * Math.sin(Math.PI * flip)
    const p = (u: number, t: number): V3 => {
      const n = bend * Math.sin((Math.PI * t) / WP) + h(WP * 0.3) * 0.92
      return W(t * Math.cos(ang) - n * Math.sin(ang), u, ZS + t * Math.sin(ang) + n * Math.cos(ang))
    }
    const tt = span(12, 0, WP)
    return <polygon points={pts([...tt.map((t) => p(2, t)), ...tt.slice().reverse().map((t) => p(L - 2, t))])} fill={ang > Math.PI / 2 ? COL.paperShade : COL.paperHi} />
  })()

  // ---- frame
  const ext: V3[] = [...[-1, 1].flatMap((s) => ts.map((t) => surf(s, 0, t))), at(-1, -3, tip, 4), at(1, -3, tip, 4), at(-1, L + 3, tip, 0), at(1, L + 3, tip, 0), at(1, L - 8, floorT, -T), at(-1, L - 8, floorT, -T), at(-1, 8, floorT, 0), surf(-1, 0, WP * 0.3), surf(1, 0, WP * 0.3), W(0, L + 5, ZS - 16), at(1, L - 8, floorT, -T), at(-1, 8, floorT, 0)]
  const xy = ext.map((p) => k.P(...p))
  const minX = Math.min(...xy.map((p) => p[0])) - 10
  const maxX = Math.max(...xy.map((p) => p[0])) + 10
  const minY = Math.min(...xy.map((p) => p[1])) - 8
  const maxY = Math.max(...xy.map((p) => p[1])) + 14
  const ground = k.P(...W(0, L / 2, 0))
  const centre = k.P(...W(0, L / 2, ZS + 12))

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={`iso-hit overflow-visible ${className}`} role="button" tabIndex={0} aria-label={label} onClick={open} onKeyDown={onKey} data-quran-book data-lit={lit} data-state={state}>
      <defs>
        <filter id={`${id}-bloom`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        {grad('wood', W(0, 0, ZS), W(0, L, ZS), [[0, COL.woodHi], [1, COL.woodTop]])}
        {grad('cov-1', at(-1, 0, WC, 4), at(-1, L, 0, 4), [[0, COL.coverHi], [1, COL.coverTop]])}
        {grad('cov1', at(1, 0, 0, 4), at(1, L, WC, 4), [[0, COL.coverHi], [1, COL.coverTop]])}
        {grad('pg-1', surf(-1, L / 2, 0), surf(-1, L / 2, WP), PAGE_STOPS)}
        {grad('pg1', surf(1, L / 2, 0), surf(1, L / 2, WP), PAGE_STOPS)}
      </defs>
      <ellipse cx={ground[0]} cy={ground[1] + 6} rx={64} ry={18} fill="black" opacity={0.22} filter={`url(#${id}-bloom)`} />
      {state === 'done' && <ellipse className="iso-halo" cx={centre[0]} cy={centre[1]} rx={96} ry={60} fill={COL.live} filter={`url(#${id}-bloom)`} />}
      <g className="iso-lift">
        {stand}
        {cover(-1)}
        {page(-1)}
        {cover(1)}
        {page(1)}
        {ribbon}
        {turning}
        <polygon className="iso-focus" points={pts([at(-1, -3, WC, 4), at(1, -3, WC, 4), at(1, L + 3, WC, 4), at(-1, L + 3, WC, 4)])} fill="none" stroke="transparent" />
      </g>
    </svg>
  )
}
