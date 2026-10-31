// Mobile Mushaf reader mock (design preview only).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { I } from '../kit'
import { RECITERS } from '../../lib/quran'
import { IconBtn, ModeSwitch, SettingsPanel, type Mode, type Tone } from './desktop'
import { ACTS, ActionToast, TafsirPanel, useAyahActions, type ActId } from './actions'
import { MushafPage, PageError, PageSkeleton, SURAHS, TOTAL_PAGES, clampPage, juzName, quranFont, surahName, toAr, useFocus, usePageState, type Go, type Marks, type NavFocus, type PageData } from './page'
import { NavPanel } from './nav'

export type MobileView = 'reading' | 'immersive' | 'playing' | 'ayah' | 'nav' | 'settings' | 'tafsir'

export function Phone({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className="shrink-0">
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[54px] bg-(--ui-bg) shadow-[0_0_0_10px_#15181c,0_0_0_11px_#2a2e34,0_40px_80px_-30px_rgba(0,0,0,.55)]">
        <div className="absolute inset-x-0 top-0 z-50 flex h-12 items-center justify-between px-8 pt-1 text-[14px] font-semibold text-(--ui-ink)" dir="ltr">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2.5 h-[30px] w-[118px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1.5">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x=".5" y=".5" width="21" height="10" rx="3" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="7" rx="1.6" fill="currentColor" /></svg>
          </span>
        </div>
        {children}
        <span className="absolute bottom-2 left-1/2 z-50 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-(--ui-ink)/80" />
      </div>
      {label && <figcaption className="mt-5 text-center text-[13px] font-medium text-black/60" dir="rtl">{label}</figcaption>}
    </figure>
  )
}

function TopBar({ d, bookmarked, onBack }: { d: PageData; bookmarked?: boolean; onBack?: () => void }) {
  return (
    <div className="mp-glass absolute inset-x-0 top-0 z-30 flex h-[100px] items-end gap-1 px-3 pb-2" style={{ borderRadius: 0 }}>
      <IconBtn n="chevron" label="رجوع" size={44} onClick={onBack} />
      <div className="min-w-0 flex-1 pb-0.5 text-center leading-tight">
        <p className="truncate text-[15px] font-semibold">{d.surahs.map(surahName).join("، ")}</p>
        <p className="text-[11.5px] text-(--ui-muted)">{juzName(d.juz)} · الحزب {toAr(d.hizb)}</p>
      </div>
      <IconBtn n="bookmark" label="علامة" size={44} on={bookmarked} />
    </div>
  )
}

/** Bottom reading dock: thumb-reachable page turn + page pill + audio + text settings. */
function Dock({ pg, onPill, playing, onPg, onPlay, onSettings, live = false }: { pg: number; onPill?: () => void; playing?: string; onPg?: (n: number) => void; onPlay?: () => void; onSettings?: () => void; live?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-7">
      {playing && <MiniPlayer at={playing} live={live} />}
      <div className="mp-glass flex h-[64px] items-center gap-1 rounded-full px-2">
        <button type="button" aria-label="الصفحة السابقة" disabled={pg <= 1} onClick={() => onPg?.(pg - 1)} className="mp-press flex h-12 w-12 items-center justify-center rounded-full text-(--ui-ink) hover:bg-(--ui-ink)/[.06] disabled:opacity-30">
          <I n="chevron" s={22} />
        </button>
        <button type="button" onClick={onPill} className="mp-press flex h-12 flex-1 flex-col items-center justify-center rounded-full bg-(--ui-ink)/[.05] leading-tight">
          <span className="text-[15px] font-semibold tabular-nums">{toAr(pg)} <span className="font-normal text-(--ui-muted)">/ ٦٠٤</span></span>
          <span className="text-[10.5px] text-(--ui-muted)">اضغط للانتقال</span>
        </button>
        <button type="button" aria-label="الصفحة التالية" disabled={pg >= TOTAL_PAGES} onClick={() => onPg?.(pg + 1)} className="mp-press flex h-12 w-12 items-center justify-center rounded-full text-(--ui-ink) hover:bg-(--ui-ink)/[.06] disabled:opacity-30">
          <I n="chevron" s={22} className="rotate-180" />
        </button>
        <span className="mx-0.5 h-7 w-px bg-(--ui-line)" />
        <IconBtn n={playing ? 'pause' : 'play'} label="استماع" size={48} on={!!playing} onClick={onPlay} />
        <IconBtn n="type" label="إعدادات القراءة" size={48} onClick={onSettings} />
      </div>
    </div>
  )
}

function MiniPlayer({ at, live = false }: { at: string; live?: boolean }) {
  // Live playback shows only what is true (reciter, ayah); the static board keeps the design mock.
  if (live)
    return (
      <div className="mp-glass mb-2 flex items-center gap-3 rounded-[22px] px-4 py-2.5" role="status">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--play-line) text-white"><I n="volume" s={17} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-semibold">{RECITERS[0].ar} · {at}</p>
          <p className="mt-0.5 text-[11px] text-(--ui-muted)">يُتلى الآن · EveryAyah</p>
        </div>
      </div>
    )
  return (
    <div className="mp-glass mb-2 flex items-center gap-3 rounded-[22px] px-4 py-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--play-line) text-white">
        <I n="volume" s={17} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[13px] font-semibold">الحصري · {at}</p>
        <span className="relative mt-1.5 block h-1 rounded-full bg-(--ui-ink)/10">
          <span className="absolute inset-y-0 start-0 w-[42%] rounded-full bg-(--play-line)" />
        </span>
      </div>
      <span className="text-[11.5px] tabular-nums text-(--ui-muted)">٠:٠٨</span>
      <IconBtn n="repeat" label="تكرار" size={34} />
    </div>
  )
}

export function Sheet({ title, children, h, onClose }: { title: string; children: ReactNode; h?: number; onClose?: () => void }) {
  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-[30px] bg-(--ui-card) px-5 pb-10 pt-2.5 shadow-[0_-20px_50px_-20px_rgba(0,0,0,.4)]" style={{ height: h }}>
        <span className="mx-auto mb-3 block h-[5px] w-10 rounded-full bg-(--ui-ink)/15" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full bg-(--ui-ink)/[.06] text-(--ui-muted)">
            <I n="x" s={15} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

export function NavSheet({ pg, d, onGo, onClose }: { pg: number; d: PageData | null; onGo?: Go; onClose?: () => void }) {
  return (
    <Sheet title="الانتقال في المصحف" h={600} onClose={onClose}>
      <NavPanel pg={pg} d={d} onGo={onGo} listH={330} />
    </Sheet>
  )
}

/** Without `onAct` the actions are a static illustration (design-state boards); with it each one is live. */
export function AyahSheet({ s, a, text, hafs = true, onClose, onAct, label }: { s: number; a: number; text: string; hafs?: boolean; onClose?: () => void; onAct?: (act: ActId) => void; label?: (act: ActId) => string }) {
  return (
    <Sheet title={`${surahName(s)} · الآية ${toAr(a)}`} onClose={onClose}>
      <p className="mp-paper mp-text rounded-[18px] px-5 py-4 text-[21px]" style={{ lineHeight: 2, textAlignLast: 'center', fontFamily: quranFont({ hafs }) }}>
        {text} <span className="mp-num">{toAr(a)}</span>
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {ACTS.map((x) => (
          <button key={x.id} type="button" onClick={onAct && (() => onAct(x.id))} aria-disabled={!onAct} title={onAct ? undefined : 'عرض توضيحي'} className="mp-press flex flex-col items-center gap-1.5 rounded-[18px] bg-(--ui-ink)/[.04] py-3.5 text-[12.5px]">
            <I n={x.id === 'play' && label?.(x.id) === 'إيقاف' ? 'pause' : x.n} s={20} className="text-(--accent)" />
            {label ? label(x.id) : x.l}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

type Drive = {
  /** Render without the standalone phone frame (the host supplies its own device shell). */
  bare?: boolean
  auto?: boolean
  onView?: (v: MobileView) => void
  /** Every navigation goes out through here (page + optional exact ayah); page turns pass no focus. */
  onGo?: Go
  onBack?: () => void
  /** Shared ayah focus from the host (applied once while fresh). */
  focus?: NavFocus | null
  onRecite?: (s: number, a: number) => void
}

export function MobileReader({ pg, view, tone, setTone, label, bare, auto, onView, onGo, onBack, focus = null, onRecite }: { pg: number; view: MobileView; tone: Tone; setTone: (t: Tone) => void; label: string } & Drive) {
  const page = usePageState(pg)
  const d = page.d
  const [mode, setMode] = useState<Mode>('mushaf')
  const [size, setSize] = useState(1)
  const [tap, setTap] = useState<{ s: number; a: number } | null>(null)
  const area = useRef<HTMLDivElement>(null)
  const flash = useFocus(area, d, focus)
  const acts = useAyahActions(onRecite)
  const live = !!onView // host-driven: actions and audio are real
  const goTo: Go | undefined = onGo && ((n, f) => (setTap(null), onGo(clampPage(n), f), onView?.('reading')))
  useEffect(() => setTap(null), [pg])
  const first = d?.blocks[0]
  const tappedBlock = tap && d?.blocks.find((b) => b.s === tap.s)
  const tapped = tap && tappedBlock?.ayat.find((x) => x.a === tap.a)
  const pickS = tapped ? tap.s : first?.s
  const pick = tapped || first?.ayat[Math.min(1, first.ayat.length - 1)]
  const pickHafs = (tapped ? tappedBlock : first)?.hafs ?? true
  const state: Record<string, 'selected' | 'playing'> = {}
  if (flash) state[flash] = 'selected'
  if (live && acts.playing) state[acts.playing] = 'playing'
  if (d && pickS && pick && (view === 'ayah' || (!live && view === 'playing'))) state[`${pickS}:${pick.a}`] = view === 'ayah' ? 'selected' : 'playing'
  const marks: Marks = { state, bookmark: acts.bookmark ?? undefined }
  const chrome = view !== 'immersive'
  const close = onView && (() => onView('reading'))
  // Interactive only when a host drives it; the standalone preview stays a static state board.
  const onAyah = onView && ((s: number, a: number) => (setTap({ s, a }), onView('ayah')))
  // Tapping the page (not an ayah) shows / hides the reading chrome.
  const toggleChrome = onView && ((e: React.MouseEvent) => !(e.target as HTMLElement).closest('.mp-ayah, [role=alert]') && onView(chrome ? 'immersive' : 'reading'))
  const playingAt = live ? acts.playing && `${SURAHS[Number(acts.playing.split(':')[0]) - 1].ar} ${toAr(Number(acts.playing.split(':')[1]))}` : view === 'playing' && pickS && pick ? `${SURAHS[pickS - 1].ar} ${toAr(pick.a)}` : undefined
  const play = () => {
    if (!d || !first) return
    const [s, a] = acts.playing ? acts.playing.split(':').map(Number) : [first.s, first.ayat[0].a]
    acts.run('play', s, a, '')
  }
  const body = (
    <div className="mp-canvas absolute inset-0" dir="rtl">
      {d && chrome && <TopBar d={d} onBack={onBack} />}
      <div ref={area} className={`mp-scroll absolute inset-0 overflow-y-auto px-2.5 ${chrome ? 'pb-[120px] pt-[108px]' : 'pb-10 pt-[52px]'}`} onClick={toggleChrome}>
        {d ? <MushafPage d={d} size={17 * size} compact marks={marks} onAyah={onAyah} /> : page.status === 'error' ? <PageError pg={pg} onRetry={page.retry} compact /> : <PageSkeleton compact />}
      </div>
      {chrome && view !== 'nav' && view !== 'ayah' && view !== 'settings' && view !== 'tafsir' && (
        <Dock
          pg={pg}
          playing={playingAt || undefined}
          live={live}
          onPg={goTo && ((n) => goTo(n))}
          onPill={onView && (() => onView('nav'))}
          onPlay={onView && play}
          onSettings={onView && (() => onView('settings'))}
        />
      )}
      {view === 'immersive' && <span className="mp-glass pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-[11.5px] text-(--ui-muted)">اضغط على الصفحة لإظهار الأدوات</span>}
      {view === 'nav' && <NavSheet pg={pg} d={d} onGo={goTo} onClose={close} />}
      {view === 'ayah' && pickS && pick && (
        <AyahSheet
          s={pickS}
          a={pick.a}
          text={pick.t}
          hafs={pickHafs}
          onClose={close}
          onAct={live ? (act) => (acts.run(act, pickS, pick.a, pick.t), act === 'tafsir' ? onView?.('tafsir') : act === 'play' || act === 'mic' ? onView?.('reading') : undefined) : undefined}
          label={live ? (act) => acts.label(act, pickS, pick.a) : undefined}
        />
      )}
      {view === 'tafsir' && acts.tafsir && (
        <Sheet title="التفسير" onClose={close}>
          <TafsirPanel s={acts.tafsir.s} a={acts.tafsir.a} onClose={() => (acts.closeTafsir(), close?.())} />
        </Sheet>
      )}
      {view === 'settings' && (
        <Sheet title="إعدادات القراءة" onClose={close}>
          <SettingsPanel tone={tone} setTone={setTone} size={size} setSize={setSize} mode={mode} setMode={setMode} auto={auto} />
        </Sheet>
      )}
      <ActionToast msg={acts.toast} />
    </div>
  )
  return bare ? body : <Phone label={label}>{body}</Phone>
}

export { ModeSwitch }
