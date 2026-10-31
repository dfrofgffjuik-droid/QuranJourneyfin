// Phase 1 · Mushaf Design Preview. Design-only route inside the Design Studio
// (#/design-studio/mushaf). It never reads or writes the app store and does not
// touch the production reader; Quran text comes from the verified KFGQPC Hafs
// files via read-only helpers.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './mushaf-preview.css'
import { I } from '../kit'
import { AyahMenu, DesktopReader, IconBtn, JumpControl, ModeSwitch, Progress, TurnBtn, type Mode, type Tone } from './desktop'
import { MobileReader } from './mobile'
import { PageSelector } from './nav'
import { navTo, type Go, type MushafNav } from './page'
import { Bookmark, PageNumber, PageText, Rosette, SurahBanner, toAr, usePage, type Marks, type PageData } from './page'

/** Scales a fixed-size artboard to the available width (keeps true proportions). */
function Fit({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(() => setK(Math.min(1, el.clientWidth / w)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  return (
    <div ref={ref} className="w-full">
      <div className="relative mx-auto overflow-hidden" style={{ width: w * k, height: h * k }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${k})` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Section({ n, title, ar, note, children }: { n: string; title: string; ar: string; note: string; children: ReactNode }) {
  return (
    <section className="mt-20">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <p className="text-[12px] font-medium tracking-[.12em] text-black/40">{n}</p>
          <h2 className="mt-1.5 text-[28px] font-semibold tracking-[-.015em]">{title} <span className="ms-2 text-[22px] font-medium text-black/45" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{ar}</span></h2>
        </div>
        <p className="max-w-[520px] text-[14px] leading-relaxed text-black/55">{note}</p>
      </div>
      {children}
    </section>
  )
}

function Seg<T extends string>({ v, set, opts }: { v: T; set: (t: T) => void; opts: [T, string][] }) {
  return (
    <div className="inline-flex rounded-full bg-black/[.06] p-1 text-[13px]">
      {opts.map(([k, l]) => (
        <button key={k} type="button" onClick={() => set(k)} className={`mp-press h-8 rounded-full px-3.5 ${v === k ? 'bg-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-black/55 hover:text-black'}`}>{l}</button>
      ))}
    </div>
  )
}

/** A cropped piece of real page for the interaction-state board. */
function StateCard({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-[26px] bg-white ring-1 ring-black/[.06]">
      <div className="mp-canvas relative p-6" dir="rtl">{children}</div>
      <figcaption className="px-6 py-4">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-black/55">{caption}</p>
      </figcaption>
    </figure>
  )
}

function Crop({ d, marks, ribbon, children }: { d: PageData; marks?: Marks; ribbon?: boolean; children?: ReactNode }) {
  return (
    <div className="mp-paper relative rounded-[6px] px-8 pb-6 pt-5" data-side="right">
      {ribbon && <Bookmark className="absolute -top-1 end-8" />}
      <div className="mp-frame rounded-[2px] px-7 py-5">
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => <Rosette key={c} className={`mp-corner ${c}`} />)}
        <PageText d={d} size={21} marks={marks} />
      </div>
      {children}
    </div>
  )
}

export default function MushafPreview() {
  const [tone, setTone] = useState<Tone>('ivory')
  // One shared position (page + optional exact ayah) for every reader on this board.
  const [nav, setNav] = useState<MushafNav>(() => navTo(3))
  const pg = nav.pg
  const go: Go = (n, f) => setNav(navTo(n, f))
  const crop = usePage(2)
  const k = (a: number) => `2:${a}`

  return (
    <div className="mp min-h-screen bg-[#f4f3ef] font-['Inter',system-ui,sans-serif] text-[#16181d]" data-tone={tone} dir="ltr">
      <div className="mx-auto max-w-[1440px] px-6 pb-28 pt-10 md:px-10">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-black/10 pb-8">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#/design-studio" className="text-[12px] font-medium text-black/50 hover:text-black">← Design Studio</a>
              <a href="#/design-studio/next?screen=mushaf" onClick={() => scrollTo({ top: 0 })} className="rounded-full bg-black/[.06] px-3.5 py-1.5 text-[12.5px] font-medium text-black/65 hover:bg-black/10 hover:text-black">View inside the Next generation preview →</a>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-[#dcefe2] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2f7d4f]">PHASE 1 · DESIGN PREVIEW</span>
              <span className="rounded-full bg-black/[.05] px-2.5 py-1 text-[11px] font-medium text-black/55">Not connected to the app</span>
            </div>
            <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-.02em] md:text-[52px]">Digital Mushaf</h1>
            <p className="mt-1 text-[18px] text-black/60" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>تجربة المصحف الرقمي · مستوحاة من مصحف المدينة</p>
            <p className="mt-4 max-w-[680px] text-[15px] leading-relaxed text-black/65">
              A paper-like page with a fine traditional frame, the KFGQPC Hafs typeface, and quiet Sakina chrome that stays out of the way. The Quran text below is the project&apos;s verified KFGQPC Hafs edition, placed on its real Madinah page ranges (Tanzil metadata). All 604 pages, 114 surahs and 30 juz are navigable. Pages are text-rendered: Tanzil metadata decides which ayat sit on each Madinah page, but there is no line-level layout data or page imagery, so lines reflow and do not reproduce the printed 15-line page. Other reader actions (listen, tafsir, bookmark) are visual mock-ups.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3 text-[12px] text-black/50">
              Paper
              <Seg v={tone} set={setTone} opts={[['ivory', 'Ivory'], ['sand', 'Sand'], ['night', 'Night']]} />
            </div>
            <div className="flex items-center gap-3 text-[12px] text-black/50">
              Page
              <PageSelector pg={pg} onGo={go} />
                        </div>
          </div>
        </header>

        <Section n="A" title="Desktop reader" ar="القارئ على الحاسوب" note="One centred page with turn arrows at its edges, a minimal translucent toolbar (surah, juz, reading mode, tools) and a bottom bar for position, previous / next and page jump. Click any ayah to select it; the Aa button opens reading settings.">
          <div className="overflow-hidden rounded-[22px] bg-[#15181c] p-2.5 shadow-[0_40px_80px_-40px_rgba(0,0,0,.5)]">
            <div className="flex h-7 items-center gap-1.5 px-2.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <div className="overflow-hidden rounded-[14px]">
              <Fit w={1440} h={960}>
                <DesktopReader nav={nav} onGo={go} tone={tone} setTone={setTone} />
              </Fit>
            </div>
          </div>
        </Section>

        <Section n="B" title="Mobile reader" ar="القارئ على الجوال" note="Designed for one hand: one page at a time with full-width paper and a thinner frame, a 17px Hafs text size, and a bottom dock in thumb reach (page turn, page pill, listen, text settings). Immersive mode hides all chrome.">
          <div className="mp-scroll -mx-6 overflow-x-auto px-6 pb-6">
            <div className="flex min-w-max gap-12 px-3 pt-3">
              <MobileReader pg={pg} view="reading" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="القراءة مع الأدوات" />
              <MobileReader pg={pg} view="immersive" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="وضع التركيز (بلا أدوات)" />
              <MobileReader pg={pg} view="playing" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="أثناء التلاوة" />
            </div>
          </div>
        </Section>

        <Section n="C" title="Ayah interaction states" ar="حالات الآية" note="Each state is a quiet change in tone, never a bright fill: Sakina green for selection, warm gold for the ayah being recited, and a green ribbon for bookmarks. Text from Al-Baqarah 1–5 (page 2).">
          {crop ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <StateCard title="Selected ayah · محددة" caption="Soft green wash with a hairline underline; the ayah medallion turns green. Shown after a tap.">
                <Crop d={crop} marks={{ state: { [k(2)]: 'selected' } }} />
              </StateCard>
              <StateCard title="Currently playing · قيد التلاوة" caption="Warm gold wash follows the reciter ayah by ayah, paired with the mini player in the dock.">
                <Crop d={crop} marks={{ state: { [k(3)]: 'playing' } }} />
                <div className="mp-glass mx-auto -mt-5 flex w-[78%] items-center gap-3 rounded-full px-3 py-2 relative" dir="rtl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--play-line) text-white"><I n="pause" s={15} /></span>
                  <span className="flex-1 text-[12.5px] font-semibold text-(--ui-ink)">الحصري · البقرة ٣</span>
                  <span className="relative h-1 w-24 rounded-full bg-(--ui-ink)/10"><span className="absolute inset-y-0 start-0 w-[40%] rounded-full bg-(--play-line)" /></span>
                </div>
              </StateCard>
              <StateCard title="Bookmark · علامة مرجعية" caption="A cloth ribbon on the page edge marks the page; a small ribbon after the ayah medallion marks the exact ayah.">
                <Crop d={crop} ribbon marks={{ bookmark: k(5) }} />
              </StateCard>
              <StateCard title="Ayah action menu · خيارات الآية" caption="A translucent menu anchored above the selected ayah: listen, tafsir, bookmark, tasmee', copy, share. On mobile it becomes a bottom sheet.">
                <div className="relative">
                  <Crop d={crop} marks={{ state: { [k(4)]: 'selected' } }} />
                  <AyahMenu s={2} a={4} style={{ left: '50%', top: '32%', transform: 'translateX(-50%)' }} />
                </div>
              </StateCard>
            </div>
          ) : (
            <p className="text-black/50">Loading verified text…</p>
          )}
          <div className="mp-scroll -mx-6 mt-12 overflow-x-auto px-6 pb-6">
            <div className="flex min-w-max gap-12 px-3 pt-3">
              <MobileReader pg={pg} view="ayah" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="خيارات الآية · لوحة سفلية" />
              <MobileReader pg={pg} view="nav" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="لوحة الانتقال · صفحة / سورة / جزء" />
              <MobileReader pg={pg} view="settings" tone={tone} setTone={setTone} onGo={go} focus={nav.focus} label="إعدادات القراءة" />
            </div>
          </div>
        </Section>

        <Section n="D" title="Navigation controls" ar="أدوات التنقل" note="The building blocks, shown in their states. RTL logic: the next page is on the left, as in a printed mushaf; arrows point the way the page turns.">
          <NavBoard pg={pg} />
        </Section>

        <Section n="E" title="Typography & colour" ar="الخط والألوان" note="The Quran face is the existing self-hosted KFGQPC Uthmanic Script HAFS; UI is IBM Plex Sans Arabic (Sakina); titles and numerals use Amiri.">
          <Specs />
        </Section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6 text-[12.5px] text-black/45">
          <span>Design preview only. The production reader (src/screens/Reader.tsx), data and storage are unchanged.</span>
          <span>Text: KFGQPC Hafs (King Fahd Complex) · Page ranges: Tanzil metadata</span>
        </footer>
      </div>
    </div>
  )
}

function Board({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[26px] bg-white p-6 ring-1 ring-black/[.06]">
      <p className="mb-5 text-[13px] font-semibold text-black/55">{title}</p>
      <div className="mp-canvas flex min-h-[120px] flex-wrap items-center justify-center gap-6 rounded-[18px] p-6" dir="rtl">{children}</div>
    </div>
  )
}

function NavBoard({ pg }: { pg: number }) {
  const [mode, setMode] = useState<Mode>('mushaf')
  const cap = (l: string) => <span className="mt-2 block text-center text-[11.5px] text-(--ui-muted)">{l}</span>
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Board title="Page turn · default / pressed / disabled">
        <div>{<TurnBtn dir="next" />}{cap('التالية')}</div>
        <div className="scale-95 opacity-90">{<TurnBtn dir="next" />}{cap('عند الضغط')}</div>
        <div>{<TurnBtn dir="prev" disabled />}{cap('غير متاح (الصفحة ١)')}</div>
      </Board>
      <Board title="Reading mode selector">
        <ModeSwitch mode={mode} onChange={setMode} />
      </Board>
      <Board title="Position + page jump (desktop)">
        <div className="flex items-center gap-3">
          <PageNumber pg={pg} />
          <div>
            <p className="text-[15px] font-semibold text-(--ui-ink)">صفحة {toAr(pg)} <span className="font-normal text-(--ui-muted)">من ٦٠٤</span></p>
            <div className="mt-1.5"><Progress pg={pg} /></div>
          </div>
        </div>
        <JumpControl pg={pg} onGo={() => {}} />
      </Board>
      <Board title="Mobile dock · page pill opens the navigation sheet">
        <div className="mp-glass flex h-[64px] w-[360px] items-center gap-1 rounded-full px-2 text-(--ui-ink)">
          <span className="flex h-12 w-12 items-center justify-center"><I n="chevron" s={22} /></span>
          <span className="flex h-12 flex-1 flex-col items-center justify-center rounded-full bg-(--ui-ink)/[.05] leading-tight">
            <span className="text-[15px] font-semibold">{toAr(pg)} <span className="font-normal text-(--ui-muted)">/ ٦٠٤</span></span>
            <span className="text-[10.5px] text-(--ui-muted)">اضغط للانتقال</span>
          </span>
          <span className="flex h-12 w-12 items-center justify-center"><I n="chevron" s={22} className="rotate-180" /></span>
          <span className="mx-0.5 h-7 w-px bg-(--ui-line)" />
          <IconBtn n="play" label="استماع" size={48} />
          <IconBtn n="type" label="إعدادات" size={48} />
        </div>
      </Board>
      <Board title="Page furniture · surah title, page medallion, ribbon">
        <div className="mp-paper w-[420px] rounded-[10px] px-6 py-4"><SurahBanner s={18} /></div>
        <div className="mp-paper flex items-center gap-5 rounded-[10px] px-6 py-4">
          <PageNumber pg={pg} />
          <PageNumber pg={pg} compact />
          <Bookmark />
        </div>
      </Board>
      <Board title="Toolbar tools">
        {[['search', 'بحث'], ['volume', 'استماع'], ['bookmark', 'علامة'], ['type', 'الخط']].map(([n, l]) => (
          <div key={n} className="text-center"><IconBtn n={n} label={l} on={n === 'bookmark'} />{cap(l)}</div>
        ))}
      </Board>
    </div>
  )
}

function Specs() {
  const rows: [string, string, number, number][] = [
    ['Desktop page', '22px · line 2.0', 22, 2],
    ['Ayah by ayah', '25px · line 2.05', 25, 2.05],
    ['Mobile page', '17px · line 2.05', 17, 2.05],
  ]
  const colours: [string, string][] = [
    ['--paper', 'Paper'],
    ['--frame', 'Frame'],
    ['--ink', 'Quran ink'],
    ['--mark', 'Ayah marker'],
    ['--accent', 'Sakina green'],
    ['--play-line', 'Recitation'],
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-[26px] bg-white p-6 ring-1 ring-black/[.06]">
        {rows.map(([l, m, sz, lh]) => (
          <div key={l} className="grid grid-cols-[150px_1fr] items-center gap-6 border-b border-black/[.06] py-4 last:border-0">
            <div><p className="text-[14px] font-semibold">{l}</p><p className="text-[12px] text-black/45">{m}</p></div>
            <p className="mp-text text-[#1d1913]" dir="rtl" style={{ fontSize: sz, lineHeight: lh, textAlign: 'right', textAlignLast: 'right' }}>ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ <span className="mp-num">٢</span></p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-[26px] bg-white p-6 ring-1 ring-black/[.06]">
        {colours.map(([v, l]) => (
          <div key={v}>
            <span className="block h-16 rounded-[14px] ring-1 ring-black/10" style={{ background: `var(${v})` }} />
            <p className="mt-2 text-[12.5px] font-medium">{l}</p>
            <p className="text-[11px] text-black/45">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
