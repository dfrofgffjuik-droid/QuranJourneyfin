// Design-only Mushaf page for the Phase 1 preview. Reads the verified KFGQPC
// Hafs text and Tanzil page metadata through the existing public helpers in
// lib/quran and lib/usePage (read-only); nothing here is used by the production
// reader. Pages are text-rendered: Tanzil says which ayat sit on each of the 604
// Madinah pages, but there is no line-level layout data or page imagery, so the
// lines reflow and justify rather than reproducing the printed 15-line page.
import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import { BISMILLAH, BISMILLAH_HAFS, JUZ, SURAHS, hasBismillahHeader, hizbOf, juzOf, loadMushaf, pageOf, surah, toAr } from '../../lib/quran'
import { TOTAL_PAGES, clampPage, pageSpans, pageStart } from '../../lib/usePage'

/** `hafs` is false when the KFGQPC Hafs file for that surah failed to load and the Tanzil text is shown instead. */
export type Block = { s: number; header: boolean; bism: boolean; hafs: boolean; ayat: { a: number; t: string }[] }
/** `hafs` is true only if every block on the page is KFGQPC Hafs text. */
export type PageData = { pg: number; blocks: Block[]; juz: number; hizb: number; quarter: number; surahs: number[]; hafs: boolean }

export { TOTAL_PAGES, clampPage }

/** Reads a page number typed with Arabic-Indic, Persian or Latin digits; null unless 1–604. */
export function parsePage(v: string): number | null {
  const t = v.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
  if (!/^\d{1,3}$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= TOTAL_PAGES ? n : null
}

/** An exact position to bring into view after navigating (start of a surah or juz). */
export type Focus = { s: number; a: number }
export type Go = (pg: number, focus?: Focus) => void
/** Shared navigation value: page + optional exact ayah. `at` stamps the request so it is applied once, never restored later. */
export type NavFocus = Focus & { at: number }
export type MushafNav = { pg: number; focus: NavFocus | null }
export const navTo = (pg: number, focus?: Focus | null): MushafNav => ({ pg: clampPage(pg), focus: focus ? { s: focus.s, a: focus.a, at: Date.now() } : null })
const FRESH_MS = 4000
export const surahStart = (s: number) => ({ pg: pageOf(s, 1), focus: { s, a: 1 } })
export const juzStart = (j: number) => {
  const [s, a] = JUZ[j - 1]
  return { pg: pageOf(s, a), focus: { s, a } }
}
export { SURAHS }

/**
 * One page of verified text. Built from the existing helpers: Tanzil page spans
 * (lib/usePage.pageSpans) and per-surah text (lib/quran.loadMushaf, KFGQPC Hafs
 * with Tanzil fallback). Each block records which source it actually came from.
 */
const pages = new Map<number, Promise<PageData>>()
/** Pages already loaded, so revisiting (or a pre-loaded render) starts with the text instead of an empty page. */
const resolved = new Map<number, PageData>()
export function loadPreviewPage(pg: number): Promise<PageData> {
  const n = clampPage(pg)
  if (!pages.has(n)) {
    const spans = pageSpans(n)
    const p = Promise.all(spans.map((x) => loadMushaf(x.s))).then((texts) => {
      const [s0, a0] = pageStart(n)
      const h = hizbOf(s0, a0)
      const blocks = spans.map((x, i) => ({
        s: x.s,
        header: x.from === 1,
        bism: x.from === 1 && hasBismillahHeader(x.s),
        hafs: texts[i].hafs,
        ayat: texts[i].ayat.slice(x.from - 1, x.to).map((t, k) => ({ a: x.from + k, t })),
      }))
      return { pg: n, blocks, juz: juzOf(s0, a0), hizb: h.hizb, quarter: h.quarter, surahs: spans.map((x) => x.s), hafs: blocks.every((b) => b.hafs) }
    })
    p.then((d) => resolved.set(n, d), () => pages.delete(n)) // a failed page can be retried
    pages.set(n, p)
  }
  return pages.get(n)!
}

export type PageState = { d: PageData | null; status: 'loading' | 'ready' | 'error'; retry: () => void }
/** Page with explicit loading / ready / error states; never returns a different page's content. */
export function usePageState(pg: number): PageState {
  const n = clampPage(pg)
  const [st, setSt] = useState<{ pg: number; d: PageData | null; error: boolean }>(() => ({ pg: n, d: resolved.get(n) ?? null, error: false }))
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    setSt((x) => (x.pg === n && x.d ? x : { pg: n, d: resolved.get(n) ?? null, error: false }))
    loadPreviewPage(n).then(
      (d) => live && setSt({ pg: n, d, error: false }),
      () => live && setSt({ pg: n, d: null, error: true }),
    )
    if (n < TOTAL_PAGES) void loadPreviewPage(n + 1).catch(() => {})
    if (n > 1) void loadPreviewPage(n - 1).catch(() => {})
    return () => {
      live = false
    }
  }, [n, nonce])
  const mine = st.pg === n
  return { d: mine ? st.d : null, status: mine && st.d ? 'ready' : mine && st.error ? 'error' : 'loading', retry: () => setNonce((x) => x + 1) }
}
export const usePage = (pg: number): PageData | null => usePageState(pg).d

/**
 * After a page change, scroll the reading area to the top; after a surah/juz jump,
 * scroll to that exact ayah (or surah title) and briefly mark it. A focus is only
 * applied while fresh, so switching devices or reopening never restores an old one.
 */
export function useFocus(area: RefObject<HTMLElement | null>, d: PageData | null, focus: NavFocus | null): string | null {
  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    const box = area.current
    if (!box || !d) return
    const live = focus && Date.now() - focus.at < FRESH_MS ? focus : null
    const k = live && `${live.s}:${live.a}`
    const el = k ? box.querySelector<HTMLElement>(`[data-k="${k}"]`) : null
    if (!el) return void box.scrollTo({ top: 0 })
    const target = live!.a === 1 ? (el.closest<HTMLElement>('[data-block]') ?? el) : el
    const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top
    const k2 = box.getBoundingClientRect().height / box.offsetHeight || 1
    box.scrollTo({ top: Math.max(0, box.scrollTop + top / k2 - 24) })
    setFlash(k)
    const t = setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
  }, [d, focus, area])
  return flash
}

/** Tanzil fallback text must not be drawn with the KFGQPC-specific face (same stack as the app's --font-quran). */
export const quranFont = (b: Pick<Block, 'hafs'>) => (b.hafs ? undefined : "'Rafiqi Quran', 'Amiri Quran', 'Noto Naskh Arabic', serif")
/** The bismillah in the same edition as the surah it heads. */
export const bismillahFor = (b: Pick<Block, 'hafs'>) => (b.hafs ? BISMILLAH_HAFS : BISMILLAH)

/** Shown instead of the skeleton when a page could not be loaded. */
export function PageError({ pg, onRetry, compact = false }: { pg: number; onRetry: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`mp-paper flex flex-col items-center justify-center text-center ${compact ? 'rounded-[10px] px-5 py-16' : 'rounded-[6px] px-10 py-24'}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--ui-ink)/[.06] text-(--ink-soft)">!</span>
      <p className="mt-4 text-[16px] font-semibold text-(--ink)">تعذّر تحميل الصفحة {toAr(pg)}</p>
      <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-(--ink-soft)">لم يصل النص القرآني لهذه الصفحة. تحقّق من الاتصال ثم أعد المحاولة؛ لن يُعرض نص صفحة أخرى مكانها.</p>
      <button type="button" onClick={onRetry} className="mp-press mt-5 h-10 rounded-full bg-(--ui-ink) px-5 text-[13px] font-semibold text-(--ui-bg)">أعد المحاولة</button>
    </div>
  )
}

/** Visible whenever any text on the page is the Tanzil fallback rather than KFGQPC Hafs. */
export function SourceNotice({ d, compact = false }: { d: PageData; compact?: boolean }) {
  if (d.hafs) return null
  const fb = d.blocks.filter((b) => !b.hafs).map((b) => surah(b.s).ar)
  return (
    <p role="status" className={`rounded-[10px] bg-(--ui-ink)/[.06] text-(--ink-soft) ${compact ? 'mt-2 px-3 py-1.5 text-[11px]' : 'mt-3 px-4 py-2 text-[12px]'}`}>
      النص المعروض لسورة {fb.join('، ')} من نسخة Tanzil البسيطة (تعذّر تحميل نسخة KFGQPC Hafs)، ويُعرض بخطّه المناسب.
    </p>
  )
}

const JUZ_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون']
export const juzName = (j: number) => `الجزء ${JUZ_AR[j - 1]}`
export const surahName = (s: number) => `سورة ${surah(s).ar}`
export { toAr }

export type AyahState = 'selected' | 'playing'
export type Marks = { state?: Record<string, AyahState>; bookmark?: string }
const key = (s: number, a: number) => `${s}:${a}`

/** Eight-point rosette used at frame corners and in the page medallion. */
export function Rosette({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="0.9" aria-hidden>
      <rect x="5" y="5" width="10" height="10" rx="0.6" />
      <rect x="5" y="5" width="10" height="10" rx="0.6" transform="rotate(45 10 10)" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Surah title cartouche: a fine framed band with rosettes, name centred. */
export function SurahBanner({ s, compact = false }: { s: number; compact?: boolean }) {
  return (
    <div className={`relative mx-auto flex w-full items-center justify-center ${compact ? 'my-2 h-9' : 'my-3 h-12'}`}>
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-(--frame)" fill="none" stroke="currentColor" aria-hidden>
        <path d="M18 4H382L396 24L382 44H18L4 24Z" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M24 8.5H376L387 24L376 39.5H24L13 24Z" strokeWidth="0.6" opacity="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <Rosette className="absolute start-[7%] text-(--frame)" size={compact ? 14 : 18} />
      <Rosette className="absolute end-[7%] text-(--frame)" size={compact ? 14 : 18} />
      <span className={`mp-surah-name relative text-(--ink) ${compact ? 'text-[17px]' : 'text-[22px]'}`}>{surahName(s)}</span>
    </div>
  )
}

/** Page number in a small framed medallion. */
export function PageNumber({ pg, compact = false }: { pg: number; compact?: boolean }) {
  const d = compact ? 30 : 38
  return (
    <span className="relative inline-flex items-center justify-center text-(--frame)" style={{ width: d, height: d }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0" fill="none" stroke="currentColor" strokeWidth="0.9" aria-hidden>
        <rect x="9" y="9" width="22" height="22" rx="2" />
        <rect x="9" y="9" width="22" height="22" rx="2" transform="rotate(45 20 20)" />
        <circle cx="20" cy="20" r="9.2" fill="var(--paper)" />
      </svg>
      <span className={`mp-serif relative leading-none text-(--ink) ${compact ? 'text-[12px]' : 'text-[14px]'}`}>{toAr(pg)}</span>
    </span>
  )
}

export function Bookmark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 40" width="22" height="40" className={className} aria-hidden>
      <path d="M0 0h22v40l-11-8-11 8z" fill="var(--accent)" />
      <path d="M3 0v33" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
    </svg>
  )
}

/** Verified Quran text block for one page (no line-level layout data exists, so lines flow and justify). */
export function PageText({ d, size, marks = {}, onAyah }: { d: PageData; size: number; marks?: Marks; onAyah?: (s: number, a: number, el: HTMLElement) => void }) {
  const fontOf = quranFont
  return (
    <div className="flex flex-col">
      {d.blocks.map((b) => (
        <div key={b.s} data-block={b.s} data-source={b.hafs ? 'kfgqpc-hafs' : 'tanzil'}>
          {b.header && <SurahBanner s={b.s} compact={size < 22} />}
          {b.bism && (
            <p className="mp-text mb-1 text-center" style={{ fontSize: size, lineHeight: 2, fontFamily: fontOf(b) }}>
              {bismillahFor(b)}
            </p>
          )}
          <p className="mp-text" style={{ fontSize: size, lineHeight: size < 22 ? 2.05 : 2, fontFamily: fontOf(b) }}>
            {b.ayat.map(({ a, t }) => (
              <Ayah key={a} k={key(b.s, a)} state={marks.state?.[key(b.s, a)]} onClick={onAyah && ((el) => onAyah(b.s, a, el))}>
                {t} <span className="mp-num">{toAr(a)}</span>
                {marks.bookmark === key(b.s, a) && <BookmarkDot />}
              </Ayah>
            ))}
          </p>
        </div>
      ))}
    </div>
  )
}

function Ayah({ k, state, children, onClick }: { k: string; state?: AyahState; children: ReactNode; onClick?: (el: HTMLElement) => void }) {
  return (
    <>
      <span className="mp-ayah" data-k={k} data-state={state} onClick={onClick && ((e) => onClick(e.currentTarget))}>
        {children}
      </span>{' '}
    </>
  )
}

function BookmarkDot() {
  return (
    <svg viewBox="0 0 10 14" width="9" height="13" className="mx-0.5 inline-block -translate-y-[0.6em]" aria-label="علامة مرجعية">
      <path d="M0 0h10v14l-5-3.6L0 14z" fill="var(--accent)" />
    </svg>
  )
}

/** Running header above the frame (surah on the right, juz on the left), like the printed Madinah mushaf. */
export function RunningHead({ d, compact = false }: { d: PageData; compact?: boolean }) {
  return (
    <div className={`mp-serif flex items-center justify-between text-(--ink-soft) ${compact ? 'px-1 text-[12px]' : 'px-2 text-[14px]'}`}>
      <span>{surahName(d.surahs[d.surahs.length - 1])}</span>
      <span>{juzName(d.juz)}</span>
    </div>
  )
}

/** A full physical-style page: running head, framed text block, page medallion. */
export function MushafPage({ d, size, compact = false, marks, onAyah, ribbon = false, className = '' }: { d: PageData; size: number; compact?: boolean; marks?: Marks; onAyah?: (s: number, a: number, el: HTMLElement) => void; ribbon?: boolean; className?: string }) {
  const side = d.pg % 2 ? 'right' : 'left'
  const short = d.blocks.reduce((n, b) => n + b.ayat.length, 0) < 9 && d.pg <= 2
  return (
    <div className={`mp-paper ${compact ? 'rounded-[10px] px-3.5 pb-3 pt-3' : 'rounded-[6px] px-9 pb-6 pt-6'} ${className}`} data-side={side}>
      {ribbon && <Bookmark className="absolute -top-1 end-10 drop-shadow-sm" />}
      <RunningHead d={d} compact={compact} />
      <SourceNotice d={d} compact={compact} />
      <div className={`mp-frame ${compact ? 'mt-2 rounded-[3px] px-4 py-4' : 'mt-3 rounded-[2px] px-10 py-8'} ${short ? 'flex min-h-[60%] flex-col justify-center' : ''}`}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <Rosette key={c} className={`mp-corner ${c}`} />
        ))}
        <PageText d={d} size={size} marks={marks} onAyah={onAyah} />
      </div>
      <div className={`flex justify-center ${compact ? 'mt-2' : 'mt-4'}`}>
        <PageNumber pg={d.pg} compact={compact} />
      </div>
    </div>
  )
}

export function PageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mp-paper ${compact ? 'rounded-[10px] p-4' : 'rounded-[6px] p-10'}`}>
      <div className="space-y-4 py-6">
        {Array.from({ length: compact ? 12 : 14 }, (_, i) => (
          <div key={i} className="h-3 rounded-full bg-(--frame-soft) opacity-40" style={{ width: `${88 - (i % 3) * 6}%`, marginInline: 'auto' }} />
        ))}
      </div>
    </div>
  )
}
