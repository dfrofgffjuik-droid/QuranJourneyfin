// The hero Mushaf: a shaded 3D open Mushaf on a wooden rahl, always open to the
// first two pages of the Madinah Mushaf — Al-Fatiha on the right (page 1) and
// the beginning of Al-Baqarah on the left (page 2).
//
// Quran text: never typed here. Each page face is the reader's own page data
// (studio/mushaf/page → usePageState): the verified KFGQPC Hafs text (Tanzil as
// a labelled fallback), the project's Madinah page mapping (PAGES), its surah
// headers and Bismillah placement, with the reader's ayah markers. The page HTML
// is placed on the page's 3D plane and auto-sized to the page, so the script
// stays real text at every size. As in the reader, lines reflow: the project has
// no line-level layout data for the printed 15-line page.
//
// Drawing: the iso-glow skill's solid ("Lumen") manner — opaque shaded faces
// painted back to front, light only on what is live — with an orthographic camera
// raised to 55° (instead of 30° isometric) so the page text is not squashed.
// Live: the ribbon glows while a task is open today; a bloom rises behind the
// book when the day is complete. Activating it turns a page, then opens the reader.
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { usePageState, bismillahFor, quranFont, toAr } from '../mushaf/page'
import { surah } from '../../lib/quran'

type V3 = [number, number, number] // a = across (screen right), u = along the spine (toward the viewer), z = up
const L = 100 // page height (along the spine)
const WP = 72 // page width from the gutter
const WC = 76 // cover width
const TH = (16 * Math.PI) / 180 // each half rests at 16° on the stand
const ZS = 40 // spine height (raised so the rahl's crossed legs show)
const E = (55 * Math.PI) / 180 // camera elevation
const SE = Math.sin(E)
const CE = Math.cos(E)

const P = ([a, u, z]: V3): [number, number] => [a, u * SE - z * CE]
const poly = (ps: V3[]) => ps.map((p) => P(p).map((n) => n.toFixed(2)).join(',')).join(' ')
// Page-stack height (u = 0 gutter … 1 fore-edge): a short curl into the gutter, then an almost flat page.
const stack = (x: number) => 3 + 13 * Math.sin(Math.min(x / 0.18, 1) * (Math.PI / 2)) - 4 * Math.max(0, (x - 0.18) / 0.82) ** 1.3
const at = (s: number, u: number, t: number, n: number): V3 => [s * (t * Math.cos(TH) - n * Math.sin(TH)), u, ZS + t * Math.sin(TH) + n * Math.cos(TH)]
const h = (t: number) => 4 + stack(t / WP)
const surf = (s: number, u: number, t: number) => at(s, u, t, h(t))
const span = (n: number, a: number, b: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)

export type BookState = 'rest' | 'open' | 'done'

const AMBER = (k: number, w: 'white' | 'black' = 'white') => `color-mix(in oklab, var(--color-amber) ${k}%, ${w})`
const COL = {
  coverTop: AMBER(68),
  coverHi: AMBER(46),
  coverEdge: AMBER(86, 'black'),
  woodTop: AMBER(60),
  woodHi: AMBER(40),
  woodEnd: AMBER(84, 'black'),
  paper: 'var(--mf-paper)',
  paperHi: 'color-mix(in oklab, var(--mf-paper) 60%, white)',
  paperShade: 'color-mix(in oklab, var(--mf-paper) 80%, var(--color-amber))',
  edge: 'color-mix(in oklab, var(--mf-paper) 86%, var(--color-amber))',
  edgeLine: 'color-mix(in oklab, var(--mf-paper) 62%, var(--color-amber))',
  live: 'var(--mf-play-line)',
}

// Text area of each page: past the gutter curl, inside the margins.
const T1 = WP * 0.22
const T2 = WP - 6
const U1 = 7
const U2 = L - 7
const PX = 6 // HTML px per model unit on the page plane
/** Corners of a page's text plane (chord across the gently sloping page, lifted just above the paper). */
function textPlane(s: number) {
  const n1 = h(T1) + 0.5
  const n2 = h(T2) + 0.5
  const g = (u: number, t: number, n: number) => at(s, u, t, n)
  // Local x runs screen-left → screen-right: gutter → fore-edge on the right page, the reverse on the left.
  const [tl, tr, nl, nr] = s > 0 ? [T1, T2, n1, n2] : [T2, T1, n2, n1]
  const O = g(U1, tl, nl)
  const X = g(U1, tr, nr)
  const Y = g(U2, tl, nl)
  const across = Math.hypot(X[0] - O[0], X[1] - O[1], X[2] - O[2])
  const w = Math.round(across * PX)
  const hh = Math.round((U2 - U1) * PX)
  const [ox, oy] = P(O)
  const [xx, xy] = P(X)
  const [yx, yy] = P(Y)
  return { w, h: hh, transform: `matrix(${(xx - ox) / w} ${(xy - oy) / w} ${(yx - ox) / hh} ${(yy - oy) / hh} ${ox} ${oy})` }
}

/**
 * One printed page: the reader's page data, framed like the Madinah Mushaf's opening pages,
 * with the font size fitted to the page so nothing is cut or invented.
 */
function PageFace({ pg, w, h: H }: { pg: number; w: number; h: number }) {
  const page = usePageState(pg)
  const box = useRef<HTMLDivElement>(null)
  const fit = () => {
    const el = box.current
    if (!el) return
    let lo = 6
    let hi = 46
    while (hi - lo > 0.25) {
      const mid = (lo + hi) / 2
      el.style.fontSize = `${mid}px`
      if (el.scrollHeight <= el.clientHeight + 0.5 && el.scrollWidth <= el.clientWidth + 0.5) lo = mid
      else hi = mid
    }
    el.style.fontSize = `${lo}px`
  }
  useLayoutEffect(fit, [page.d, w, H])
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => live && fit())
    return () => {
      live = false
    }
  }, [page.d]) // eslint-disable-line react-hooks/exhaustive-deps
  const d = page.d
  const opening = pg <= 2
  return (
    <div style={{ width: w, height: H, position: 'relative', direction: 'rtl', color: 'var(--mf-ink)' }} data-page={pg}>
      {/* Page frame (ornament only, no text). */}
      <div style={{ position: 'absolute', inset: 0, border: '3px double var(--mf-frame)', borderRadius: opening ? 22 : 6 }} />
      <div style={{ position: 'absolute', inset: 7, border: '1px solid var(--mf-frame-soft)', borderRadius: opening ? 16 : 4 }} />
      <div ref={box} data-fitbox style={{ position: 'absolute', inset: '18px 16px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', lineHeight: 1.9 }}>
        {d &&
          d.blocks.map((b) => (
            <div key={b.s}>
              {b.header && (
                <div style={{ margin: '0 auto 0.45em', padding: '0.12em 0', border: '2px double var(--mf-frame)', borderRadius: 999, textAlign: 'center', fontSize: '0.92em', lineHeight: 1.7, background: 'color-mix(in oklab, var(--mf-paper) 82%, var(--mf-frame))' }}>
                  سورة {surah(b.s).ar}
                </div>
              )}
              {b.bism && <p className={`mf-text${b.hafs ? '' : ' tanzil'}`} style={{ textAlign: 'center', textAlignLast: 'center', margin: '0 0 0.2em', fontFamily: quranFont(b) }}>{bismillahFor(b)}</p>}
              <p className={`mf-text${b.hafs ? '' : ' tanzil'}`} style={{ margin: 0, fontFamily: quranFont(b), paddingInline: pg === 1 ? '8%' : 0 }}>
                {b.ayat.map(({ a, t }) => (
                  <span key={a}>
                    {t} <span className="mf-num">{toAr(a)}</span>{' '}
                  </span>
                ))}
              </p>
            </div>
          ))}
      </div>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 9, textAlign: 'center', fontSize: 13, color: 'var(--mf-ink-soft)' }}>{toAr(pg)}</div>
    </div>
  )
}

export function IsoQuranBook({ progress, state, onOpen, label, className = '' }: { progress: number; state: BookState; onOpen: () => void; label: string; className?: string }) {
  const id = useId().replace(/:/g, '')
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
  const grad = (gid: string, a: V3, b: V3, stops: [number, string][]) => {
    const [x1, y1] = P(a)
    const [x2, y2] = P(b)
    return (
      <linearGradient id={`${id}-${gid}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        {stops.map(([o, c]) => <stop key={o} offset={o} style={{ stopColor: c }} />)}
      </linearGradient>
    )
  }
  const url = (gid: string) => `url(#${id}-${gid})`
  const PAGE_STOPS: [number, string][] = [[0, COL.paperShade], [0.16, COL.paperHi], [0.6, COL.paper], [1, COL.paperShade]]

  // ---- rahl: two boards crossing under the spine; carved legs below the crossing
  const floorT = -(ZS / Math.sin(TH)) * 0.42
  const T = 5
  const board = (s: number, t0: number, t1: number, u0: number, u1: number, key: string, slope = TH) => {
    const g = (u: number, t: number, n: number): V3 => [s * (t * Math.cos(slope) - n * Math.sin(slope)), u, ZS + t * Math.sin(slope) + n * Math.cos(slope)]
    return (
      <g key={key}>
        <polygon points={poly([g(u0, t0, 0), g(u0, t1, 0), g(u1, t1, 0), g(u1, t0, 0)])} fill={url('wood')} />
        <polygon points={poly([g(u1, t0, 0), g(u1, t1, 0), g(u1, t1, -T), g(u1, t0, -T)])} fill={COL.woodEnd} />
      </g>
    )
  }
  // Legs are steeper than the cradle (the boards bend at the crossing, as a carved rahl does).
  const LEG = Math.asin(Math.min(0.95, ZS / Math.abs(floorT)))
  const legs = (s: number) => [board(s, floorT, 0, 10, 28, `l${s}a`, LEG), board(s, floorT, 0, L - 28, L - 10, `l${s}b`, LEG)]
  const tip = WC - 5
  const stand = [...legs(1), ...legs(-1), board(-1, -2, tip, 10, L - 10, 'ua'), board(1, -2, tip, 10, L - 10, 'ub')]

  // ---- covers
  const cover = (s: number) => {
    const u0 = -3
    const u1 = L + 3
    return (
      <g>
        <polygon points={poly([at(s, u0, 0, 4), at(s, u0, WC, 4), at(s, u1, WC, 4), at(s, u1, 0, 4)])} fill={url(`cov${s}`)} />
        <polygon points={poly([at(s, u0, WC, 4), at(s, u1, WC, 4), at(s, u1, WC, 0), at(s, u0, WC, 0)])} fill={COL.coverEdge} />
        <polygon points={poly([at(s, u1, 0, 4), at(s, u1, WC, 4), at(s, u1, WC, 0), at(s, u1, 0, 0)])} fill={COL.coverEdge} />
      </g>
    )
  }

  // ---- page block with the printed page on top
  const ts = span(18, 0, WP)
  const page = (s: number, pg: number) => {
    const plane = textPlane(s)
    const layers = [0.25, 0.5, 0.75].map((q) => poly(ts.map((t) => at(s, L, t, 4 + (h(t) - 4) * q))))
    return (
      <g>
        <polygon points={poly([...ts.map((t) => surf(s, 0, t)), ...ts.slice().reverse().map((t) => surf(s, L, t))])} fill={url(`pg${s}`)} />
        <polygon points={poly([surf(s, 0, WP), surf(s, L, WP), at(s, L, WP, 4), at(s, 0, WP, 4)])} fill={COL.edge} />
        <polygon points={poly([...ts.map((t) => at(s, L, t, h(t))), ...ts.slice().reverse().map((t) => at(s, L, t, 4))])} fill={COL.edge} />
        {layers.map((l, i) => <polyline key={i} points={l} fill="none" stroke={COL.edgeLine} strokeWidth={0.6} />)}
        <foreignObject x={0} y={0} width={plane.w} height={plane.h} transform={plane.transform} aria-hidden>
          <PageFace pg={pg} w={plane.w} h={plane.h} />
        </foreignObject>
      </g>
    )
  }

  // ---- ribbon: from the gutter at the foot of the pages, hanging down (never over the text)
  const ribbon = (() => {
    const live = state === 'open'
    const path: V3[] = [[0, L - 18, ZS + 5], [0, L + 1, ZS + 5], [1.5, L + 4, ZS - 2], [2.5, L + 5, ZS - 16]]
    const p = poly(path)
    const end = P(path[path.length - 1])
    const fill = live ? COL.live : AMBER(92, 'black')
    return (
      <g>
        {live && <polyline points={p} fill="none" stroke={COL.live} strokeWidth={9} strokeOpacity={0.5} strokeLinejoin="round" filter={`url(#${id}-bloom)`} />}
        <polyline points={p} fill="none" stroke={fill} strokeWidth={7} strokeLinejoin="round" />
        <polygon points={`${end[0] - 3.5},${end[1] - 1} ${end[0] + 3.5},${end[1] - 1} ${end[0] + 3.5},${end[1] + 5} ${end[0]},${end[1] + 2} ${end[0] - 3.5},${end[1] + 5}`} fill={fill} />
      </g>
    )
  })()

  // ---- a blank leaf turning right → left while opening (it carries no text)
  const turning = (() => {
    if (flip === null) return null
    const e = flip < 0.5 ? 2 * flip * flip : 1 - (-2 * flip + 2) ** 2 / 2
    const ang = TH + (Math.PI - 2 * TH) * e
    const bend = 10 * Math.sin(Math.PI * flip)
    const p = (u: number, t: number): V3 => {
      const n = bend * Math.sin((Math.PI * t) / WP) + h(WP * 0.3) * 0.95
      return [t * Math.cos(ang) - n * Math.sin(ang), u, ZS + t * Math.sin(ang) + n * Math.cos(ang)]
    }
    const tt = span(12, 0, WP)
    return <polygon points={poly([...tt.map((t) => p(2, t)), ...tt.slice().reverse().map((t) => p(L - 2, t))])} fill={ang > Math.PI / 2 ? COL.paperShade : COL.paperHi} />
  })()

  // ---- frame
  const ext: V3[] = [...[-1, 1].flatMap((s) => ts.map((t) => surf(s, -3, t))), at(-1, -3, WC, 4), at(1, -3, WC, 4), at(-1, L + 3, WC, 0), at(1, L + 3, WC, 0), [floorT * Math.cos(LEG) - 2, L - 10, 0], [-floorT * Math.cos(LEG) + 2, L - 10, 0], [2.5, L + 5, ZS - 20], [0, L, 0]]
  const xy = ext.map(P)
  const minX = Math.min(...xy.map((p) => p[0])) - 8
  const maxX = Math.max(...xy.map((p) => p[0])) + 8
  const minY = Math.min(...xy.map((p) => p[1])) - 6
  const maxY = Math.max(...xy.map((p) => p[1])) + 12
  const ground = P([0, L * 0.6, 0])
  const centre = P([0, L / 2, ZS + 14])

  return (
    <svg viewBox={`${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}`} className={`iso-hit overflow-visible ${className}`} role="button" tabIndex={0} aria-label={label} onClick={open} onKeyDown={onKey} data-quran-book data-state={state} data-progress={Math.round(progress * 100)} data-right-page={1} data-left-page={2}>
      <defs>
        <filter id={`${id}-bloom`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" /></filter>
        {grad('wood', [0, 0, ZS], [0, L, ZS], [[0, COL.woodHi], [1, COL.woodTop]])}
        {grad('cov-1', at(-1, 0, WC, 4), at(-1, L, 0, 4), [[0, COL.coverHi], [1, COL.coverTop]])}
        {grad('cov1', at(1, 0, 0, 4), at(1, L, WC, 4), [[0, COL.coverHi], [1, COL.coverTop]])}
        {grad('pg-1', surf(-1, L / 2, 0), surf(-1, L / 2, WP), PAGE_STOPS)}
        {grad('pg1', surf(1, L / 2, 0), surf(1, L / 2, WP), PAGE_STOPS)}
      </defs>
      <ellipse cx={ground[0]} cy={ground[1]} rx={(maxX - minX) * 0.36} ry={12} fill="black" opacity={0.22} filter={`url(#${id}-bloom)`} />
      {state === 'done' && <ellipse className="iso-halo" cx={centre[0]} cy={centre[1]} rx={(maxX - minX) * 0.42} ry={48} fill={COL.live} filter={`url(#${id}-bloom)`} />}
      <g className="iso-lift">
        {stand}
        {cover(-1)}
        {cover(1)}
        {page(-1, 2)}
        {page(1, 1)}
        {ribbon}
        {turning}
      </g>
    </svg>
  )
}
