// Approved Mushaf page (Phase 1 design), production version. All colours come
// from the theme-derived --mf-* tokens in index.css, so the page follows the
// user's palette and day/night/auto appearance automatically.
import type { ReactNode } from 'react'
import { BISMILLAH, BISMILLAH_HAFS, surah, toAr } from '../lib/quran'
import type { MushafPageData } from '../lib/usePage'

const JUZ_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون']
export const juzNameAr = (j: number) => `الجزء ${JUZ_AR[j - 1]}`
export const surahNameAr = (s: number) => `سورة ${surah(s).ar}`

export type AyahState = 'selected' | 'playing'
export type PageMarks = { state?: Record<string, AyahState>; bookmarks?: Set<string> }
export type AyahTap = (s: number, a: number, el: HTMLElement) => void

/** Eight-point rosette used at frame corners. */
export function Rosette({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="0.9" aria-hidden>
      <rect x="5" y="5" width="10" height="10" rx="0.6" />
      <rect x="5" y="5" width="10" height="10" rx="0.6" transform="rotate(45 10 10)" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Surah title cartouche. */
export function SurahBanner({ s, compact = false }: { s: number; compact?: boolean }) {
  return (
    <div className={`relative mx-auto flex w-full items-center justify-center ${compact ? 'my-2 h-9' : 'my-3 h-12'}`} role="heading" aria-level={2}>
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-[var(--mf-frame)]" fill="none" stroke="currentColor" aria-hidden>
        <path d="M18 4H382L396 24L382 44H18L4 24Z" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M24 8.5H376L387 24L376 39.5H24L13 24Z" strokeWidth="0.6" opacity="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <Rosette className="absolute start-[7%] text-[var(--mf-frame)]" size={compact ? 14 : 18} />
      <Rosette className="absolute end-[7%] text-[var(--mf-frame)]" size={compact ? 14 : 18} />
      <span className={`mf-serif relative font-bold text-[var(--mf-ink)] ${compact ? 'text-[17px]' : 'text-[22px]'}`}>{surahNameAr(s)}</span>
    </div>
  )
}

/** Page number in a framed medallion. */
export function PageNumber({ pg, compact = false }: { pg: number; compact?: boolean }) {
  const d = compact ? 30 : 38
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center text-[var(--mf-frame)]" style={{ width: d, height: d }} aria-label={`صفحة ${pg}`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0" fill="none" stroke="currentColor" strokeWidth="0.9" aria-hidden>
        <rect x="9" y="9" width="22" height="22" rx="2" />
        <rect x="9" y="9" width="22" height="22" rx="2" transform="rotate(45 20 20)" />
        <circle cx="20" cy="20" r="9.2" fill="var(--mf-paper)" />
      </svg>
      <span className={`mf-serif relative leading-none text-[var(--mf-ink)] ${compact ? 'text-[12px]' : 'text-[14px]'}`}>{toAr(pg)}</span>
    </span>
  )
}

export function Ribbon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 40" width="22" height="40" className={className} aria-hidden>
      <path d="M0 0h22v40l-11-8-11 8z" fill="var(--color-gold)" />
      <path d="M3 0v33" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
    </svg>
  )
}

function BookmarkTag() {
  return (
    <svg viewBox="0 0 10 14" width="9" height="13" className="mx-0.5 inline-block -translate-y-[0.6em]" aria-label="علامة مرجعية">
      <path d="M0 0h10v14l-5-3.6L0 14z" fill="var(--color-gold)" />
    </svg>
  )
}

/** Verified page text. Lines flow and justify: no verified line-layout data is bundled. */
export function PageText({ d, size, marks, onAyah, lineHeight = 2 }: { d: MushafPageData; size: string; marks?: PageMarks; onAyah?: AyahTap; lineHeight?: number }) {
  const font = d.hafs ? '' : 'tanzil'
  return (
    <div className="flex flex-col" dir="rtl" lang="ar">
      {d.blocks.map((b) => (
        <div key={b.s}>
          {b.header && <SurahBanner s={b.s} />}
          {b.bism && (
            <p className={`mf-text ${font} mb-1 text-center`} style={{ fontSize: size, lineHeight }}>
              {d.hafs ? BISMILLAH_HAFS : BISMILLAH}
            </p>
          )}
          <p className={`mf-text ${font}`} style={{ fontSize: size, lineHeight }}>
            {b.ayat.map(({ a, t }) => {
              const k = `${b.s}:${a}`
              return (
                <Ayah key={a} state={marks?.state?.[k]} label={`${surah(b.s).ar} ${a}`} onTap={onAyah && ((el) => onAyah(b.s, a, el))}>
                  {t} <span className="mf-num">{d.hafs ? toAr(a) : `﴿${toAr(a)}﴾`}</span>
                  {marks?.bookmarks?.has(k) && <BookmarkTag />}
                </Ayah>
              )
            })}
          </p>
        </div>
      ))}
    </div>
  )
}

function Ayah({ state, label, children, onTap }: { state?: AyahState; label: string; children: ReactNode; onTap?: (el: HTMLElement) => void }) {
  return (
    <>
      <span
        className="mf-ayah"
        data-state={state}
        role={onTap ? 'button' : undefined}
        tabIndex={onTap ? 0 : undefined}
        aria-label={onTap ? label : undefined}
        onClick={onTap && ((e) => onTap(e.currentTarget))}
        onKeyDown={onTap && ((e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTap(e.currentTarget)))}
      >
        {children}
      </span>{' '}
    </>
  )
}

/** Running head above the frame, as in the printed Madinah mushaf. */
function RunningHead({ d }: { d: MushafPageData }) {
  return (
    <div className="mf-serif flex items-center justify-between px-1 text-[12px] text-[var(--mf-ink-soft)] md:px-2 md:text-[14px]" dir="rtl">
      <span>{surahNameAr(d.blocks[d.blocks.length - 1].s)}</span>
      <span>{juzNameAr(d.juz)}</span>
    </div>
  )
}

/** A full physical-style page: running head, framed text block, page medallion. */
export function MushafPage({ d, size, marks, onAyah, ribbon = false }: { d: MushafPageData; size: string; marks?: PageMarks; onAyah?: AyahTap; ribbon?: boolean }) {
  const short = d.pg <= 2
  return (
    <div className="mf-paper rounded-[10px] px-3.5 pb-3 pt-3 md:rounded-[6px] md:px-9 md:pb-6 md:pt-6" data-side={d.pg % 2 ? 'right' : 'left'}>
      {ribbon && <Ribbon className="absolute -top-1 end-6 drop-shadow-sm md:end-10" />}
      <RunningHead d={d} />
      <div className={`mf-frame mt-2 rounded-[3px] px-3.5 py-4 sm:px-5 md:mt-3 md:rounded-[2px] md:px-10 md:py-8 ${short ? 'flex min-h-[26rem] flex-col justify-center md:min-h-[34rem]' : ''}`}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <Rosette key={c} className={`mf-corner ${c}`} />
        ))}
        <PageText d={d} size={size} marks={marks} onAyah={onAyah} />
      </div>
      <div className="mt-2 flex justify-center md:mt-4">
        <PageNumber pg={d.pg} />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mf-paper rounded-[10px] p-4 md:rounded-[6px] md:p-10" aria-busy="true">
      <div className="space-y-5 py-6">
        {Array.from({ length: 13 }, (_, i) => (
          <div key={i} className="mx-auto h-3 animate-pulse rounded-full bg-[var(--mf-frame-soft)]" style={{ width: `${88 - (i % 3) * 6}%` }} />
        ))}
      </div>
    </div>
  )
}

export function PageDivider({ pg }: { pg: number }) {
  return (
    <div className="my-5 flex items-center gap-3" aria-label={`صفحة ${pg}`}>
      <span className="h-px flex-1 bg-[var(--mf-frame-soft)]" />
      <PageNumber pg={pg} compact />
      <span className="h-px flex-1 bg-[var(--mf-frame-soft)]" />
    </div>
  )
}
