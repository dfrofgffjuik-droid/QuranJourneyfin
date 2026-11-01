// Quaran · Next generation — complete product design preview (design only).
// Route: #/design-studio/next. Uses the production Sakina tokens and palettes
// (mirrored per frame by themeScope) and never touches the app store.
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import './next.css'
import { Demo, Fit, Icon, PhoneShell, ProtoCtx, Themed, toAr, useAyahText, type Device, type Look, type Nav, type ScreenId } from './core'
import { useScopedThemes } from './themeScope'
import { HomeDashboard } from './screens/home'
import { AyahJourney } from './screens/ayah'
import { JourneyMap } from './screens/map'
import { Library } from './screens/library'
import { KidsHouse } from './screens/kids'
import { WeekRoadmap } from './screens/week'
import { ReciteJourney } from './screens/recite'
import { Similarities } from './screens/similar'
import { Rewards } from './screens/rewards'
import { PlansScreen } from './screens/plans'
import { RevisionScreen } from './screens/revision'
import { STORAGE_KEY, actions as progressActions, isDemoData, usePreview } from './progress'
import { AzkarHome, AzkarList } from './screens/azkar'
import { DigitalMushaf, MUSHAF_DEFAULT, MushafCtx, type MushafState } from './screens/mushaf'
import { PageSelector } from '../mushaf/nav'
import { navTo } from '../mushaf/page'
import type { MobileView } from '../mushaf/mobile'
import type { Tone } from '../mushaf/desktop'
import { PALETTES } from '../../lib/theme'
import { SessionCtx, readOnlySession, useSessionState } from './session'

type Page = ScreenId | 'themes' | 'system'
const PAGES: { id: Page; n: string; en: string; ar: string; note: string }[] = [
  { id: 'home', n: '01', en: 'Unified home', ar: 'رحلتك اليوم', note: 'Unified home over the shared preview store: today’s tasks generated from your plans (start opens the right destination), recent achievements with their dates, last recorded reading. Azkar and the reflection ayah are unchanged.' },
  { id: 'mushaf', n: '02', en: 'Digital Mushaf', ar: 'المصحف الرقمي', note: 'Opens on a surah / juz index: 114 surah cards (Arabic and English name, meaning, ayah count, Makki/Madani, starting page) and 30 juz with their real start and end, sortable and searchable in Arabic or English. A card opens the approved Phase 1 reader at that exact ayah; its back button returns here. All 604 pages are navigable. Pages are text-rendered — verified KFGQPC Hafs text on Tanzil’s Madinah page ranges, not page images, so lines reflow. Surah names use Amiri (no licensed surah-name font in the project); no revelation-order tab, as the repo has no sourced data for it.' },
  { id: 'ayah', n: '03', en: 'Memorization Journey', ar: 'رحلة الحفظ', note: 'Passage-driven: “اختيار مقطع الحفظ” picks any surah and range (validated against the surah’s real ayah count, up to 20 ayat); Al-Mulk 1–5 is only the initial DEMO passage. Vertical snap feed of the exact Hafs text with explicit loading / error / retry, EveryAyah audio. Five connected experiences: Read & listen, Understand & reflect (verbatim Tafsir with book and author, separate from the personal journal), Memorise (6 steps; only “أتقنتها” records an ayah as memorised), Connect ayat, and “متشابهات هذا المقطع” — the primary home of Quranic Similarities, contextual to the active passage and current ayah, with its own “التمييز بين المتشابهات” progress that never counts as memorisation. One shared session drives Desktop, Mobile and Both (passage, current ayah, results, reflections, bookmarks, linked similarities); it is saved on this browser/device only (quranJourney.nextPreview.session.v1) and resumes after a refresh. Opened from a plan task or a Juz, the journey splits the range into passages of ≤ 20 ayat within one surah; each passage is confirmed separately and the task is recorded only after all of them.' },
  { id: 'similar', n: '04', en: 'Similarities · extended text search', ar: 'البحث النصي الموسّع', note: 'Secondary reference view, opened from “متشابهات هذا المقطع” inside the Memorization Journey (no longer a navigation destination). It receives the active passage and its linked pairs, and its back button returns to the same passage and ayah. Textual similarity and thematic connections are separate lenses. No verified similarity dataset is bundled, so the curated list and the thematic lens show labelled empty states (0 pairs) and no invented examples. What works: a whole-Quran word search over the exact KFGQPC Hafs text (anywhere / beginning / ending, matched on the consonantal skeleton), side-by-side comparison with the differing words highlighted and a mechanical explanation, “open in Mushaf” for either verse, linking a pair to your memorisation (session only), a fill-the-different-word practice and a which-surah connection drill — both built only from pairs you linked to the passage. Everything here is labelled automatic textual matching, never verified mutashabihat; the full text loads only on the first explicit search, with retry on failure.' },
  { id: 'recite', n: '05', en: 'Recitation Correction & Tajweed', ar: 'تصحيح التلاوة والتجويد', note: 'Replaces the Recitation Journey mock with a guided flow: choose a surah and up to 10 ayat, read the exact text and listen to the reference reciter (EveryAyah), record with real microphone permission (lib/audio, same as the app), then analyse. Analysis runs only when the Muaalem engine reports online; otherwise the attempt is explicitly “not analysed”. The result layout (correct · needs practice · articulation · tajweed · repetition) renders only real engine fields, or an empty labelled template. Teacher review is shown as not available yet (no real teacher service exists); nothing is sent anywhere.' },
  { id: 'rewards', n: '06', en: 'Rewards & Achievements', ar: 'المكافآت والإنجازات', note: 'Adult achievements are rules evaluated on the shared preview records (memorisation, juz, revision, consistency, plans); each is stored once with its date and triggering event and never removed. Only confirmed memorisation counts as memorisation; revision and reading are separate; active days are a total, not a streak. Kids: stars = one per completed lesson record, badges stored once with dates, stickers and optional decor (persisted). Demo-seed items are labelled تجريبي.' },
  { id: 'plans', n: '06a', en: 'Plans', ar: 'خططي', note: 'Create, view, edit, pause / resume, set primary, close (administrative — never counts as completion or awards anything), archive and delete plans (memorisation, revision, reading, khatmah, custom) over the whole Quran, a surah range, a juz, an ayah range or a page range. The guided form validates the range against real surah / juz / page bounds and shows a live summary and the estimated weekly schedule from the same task generator the roadmap uses. Changing type, unit, range or daily target after progress exists creates a new plan version; recorded tasks keep their own version, unit and range. A plan is completed only when a recorded task reaches its target. Data lives in the shared preview store (localStorage key quranJourney.nextPreview.v1, this browser/device only), never the app’s plans.' },
  { id: 'revision', n: '06b', en: 'Revision', ar: 'المراجعة', note: 'Destination of revision tasks and of «راجع» on the Juz map: the exact range — page by page for page-based plans (each page opens in the Mushaf), passages of ≤ 20 ayat otherwise — with verbatim Hafs text, recite-from-memory and per-ayah self-rating; each page / passage is confirmed, then an explicit «أتممت المراجعة» once all are. Revision is recorded separately and never increases memorised ayat.' },
  { id: 'library', n: '07', en: 'Achievements Library', ar: 'مكتبة إنجازاتي', note: 'Isometric bookcase, six shelves × five Juz books, from the same shared memorisation records as the Journey Map (so both always agree). A book lights fully only when every ayah is confirmed memorised; in-progress spines fill to the true ratio; reading or revision never fill a book.' },
  { id: 'kids', n: '08', en: 'Kids Learning House', ar: 'عالم الأطفال', note: 'Open-top isometric house with five rooms. Every lesson has a stable id and is played inside the preview (letter and harakah quizzes, joining builder, reading cards, short surahs shown from the Mushaf text with per-ayah repetition and parent confirmation — no audio, stated on screen); a lesson is recorded once and earns exactly one star, however often the answer is pressed. The unlocked decoration tints the garden and persists.' },
  { id: 'week', n: '09', en: 'Weekly Roadmap', ar: 'خريطة خطط الأسبوع', note: 'Seven day-stations generated from the shared preview plans: each active plan’s study days, daily target and real cursor. Weekly completion %, paused / completed plans, the primary plan. Open a day and start a task (memorisation → journey, revision → revision screen, reading / khatmah → the exact Mushaf page); the roadmap never records completion itself — tasks are recorded only inside their activity. Shows not started / in progress / completed, undo of the latest record, details. A day with no task is a rest day; an unrecorded earlier day is never “missed”.' },
  { id: 'map', n: '10', en: 'Quran Journey Map', ar: 'خريطة رحلة القرآن', note: '30 isometric stations on a serpentine road (RTL: starts top-right), from the shared confirmed-memorisation records: leaf = complete, gold = in progress (front strip = real ratio), neutral = not started. Reading never lights a station.' },
  { id: 'azkar', n: '11', en: 'Azkari', ar: 'أذكاري', note: 'Library of 131 items from Hisn al-Muslim (official Arabic edition, Risalat al-Haramain), extracted verbatim with diacritics and the book’s own footnotes and takhrij, and compared against the source («مقابَل على المصدر» — not a scholarly approval; independent scholarly review pending, no explicit licence stated, permission required before production). Repeat counts cross-checked against hisnmuslim.com; Quranic segments compared programmatically with the project’s KFGQPC Hafs text, labelled exact only when the match is exact; the unmatched chapter-27 opening line is kept out of counted items. Plus 26 Quranic supplication verses rendered from the Mushaf. 22 collections in five groups (daily, prayer & mosque, daily life, protection & travel, tasbeeh & duas). Hero card by local time, real progress, unfinished-session shortcut, today’s summary, favourites, last visited, search. Progress is preview-only under quranJourney.nextPreview.azkar.v1 and resets on a new local day (favourites and history kept).' },
  { id: 'azkar-list', n: '12', en: 'Individual Azkar', ar: 'بطاقات الأذكار', note: 'Collection, favourites and search views. Each card: full verbatim text (Hadith wording, Quranic text with ayah markers, instructions in muted type), the book’s repeat count (cross-checked), large counter that stops at the count, remaining, completion, per-item reset, favourite, and a collapsible source block (takhrij verbatim, grading only where the book states it, narration notes, verification checklist). Evening wording comes from the book’s own footnotes. Font size and compact / detailed display persist. No audio: no licensed recording is bundled.' },
  { id: 'themes', n: '13', en: 'Theme variations', ar: 'تنويعات المظهر', note: 'The same screens under every production palette in light and dark. Each frame carries data-palette / data-theme exactly as <html> does in the app.' },
  { id: 'system', n: '14', en: 'Design system & review', ar: 'النظام والمراجعة', note: 'Sakina tokens as implemented (see src/studio/next/DESIGN.md) and a critical design review of this preview.' },
]

const SCREENS: Record<ScreenId, () => ReactNode> = {
  home: () => <HomeDashboard />,
  mushaf: () => <DigitalMushaf />,
  ayah: () => <AyahJourney />,
  map: () => <JourneyMap />,
  library: () => <Library />,
  kids: () => <KidsHouse />,
  week: () => <WeekRoadmap />,
  recite: () => <ReciteJourney />,
  plans: () => <PlansScreen />,
  revision: () => <RevisionScreen />,
  similar: () => <Similarities />,
  rewards: () => <Rewards />,
  azkar: () => <AzkarHome />,
  'azkar-list': () => <AzkarList />,
}

const mq = matchMedia('(prefers-color-scheme: dark)')
const useSysDark = () => useSyncExternalStore((f) => (mq.addEventListener('change', f), () => mq.removeEventListener('change', f)), () => mq.matches)

function Frame({ nav, go, device, look }: { nav: Nav; go: (s: ScreenId, p?: string) => void; device: Device; look: Look }) {
  const body = <ProtoCtx.Provider value={{ nav, go, device }}>{SCREENS[nav.screen]()}</ProtoCtx.Provider>
  const kids = nav.screen === 'kids' || (nav.screen === 'rewards' && nav.param === 'kids')
  if (device === 'mobile') return <PhoneShell look={look} kids={kids}>{body}</PhoneShell>
  return (
    <div className="overflow-hidden rounded-[18px] bg-[#15181c] p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,.5)]">
      <div className="flex h-6 items-center gap-1.5 px-2" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /></div>
      <div className="overflow-hidden rounded-[12px]">
        <Fit w={1280} h={820}>
          <Themed look={look} kids={kids} className="relative h-[820px] w-[1280px] overflow-hidden">{body}</Themed>
        </Fit>
      </div>
    </div>
  )
}

export default function NextPreview() {
  useScopedThemes()
  const sys = useSysDark()
  // Optional deep link, e.g. #/design-studio/next?screen=mushaf (stays on this route).
  const fromHash = (): Page | null => {
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '').get('screen')
    return PAGES.some((p) => p.id === q) ? (q as Page) : null
  }
  const [initial] = useState<Page>(() => fromHash() ?? 'home')
  const [page, setPage] = useState<Page>(initial)
  const [nav, setNav] = useState<Nav>({ screen: initial === 'themes' || initial === 'system' ? 'home' : initial })
  const [mushaf, setMushaf] = useState<MushafState>(MUSHAF_DEFAULT)
  // One memorisation session above both device frames (preview memory only).
  const session = useSessionState()
  const mushafCtx = { s: mushaf, set: (p: Partial<MushafState>) => setMushaf((m) => ({ ...m, ...p })) }
  // The deep link also works while the preview is open (back / forward, edited URL).
  useEffect(() => {
    const on = () => {
      const q = fromHash()
      if (!q) return
      setPage(q)
      if (q !== 'themes' && q !== 'system') setNav({ screen: q })
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [palette, setPalette] = useState('garden')
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('light')
  const [device, setDevice] = useState<'both' | Device>('both')
  const look: Look = { palette, dark: mode === 'dark' || (mode === 'system' && sys) }
  const go = (s: ScreenId, param?: string) => {
    // Leaving the journey's hand-off chain (journey → Mushaf / extended search) forgets the way back.
    if (s !== 'ayah' && s !== 'mushaf' && s !== 'similar' && session.s.away) session.setAway(null)
    setNav({ screen: s, param })
    setPage(s)
  }
  useEffect(() => {
    document.title = 'Next generation · Design preview · Al-Quran Rafiqi'
  }, [])
  const info = PAGES.find((p) => p.id === page)!

  return (
    <SessionCtx.Provider value={session}>
    <MushafCtx.Provider value={mushafCtx}>
    <div className="min-h-screen bg-[#f4f3ef] font-['Inter',system-ui,sans-serif] text-[#16181d]" dir="ltr">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f3ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <div className="min-w-0">
            <a href="#/design-studio" className="text-[12px] font-medium text-black/50 hover:text-black">← Design Studio</a>
            <p className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.01em]">Quaran · Next generation <span className="rounded-full bg-[#dcefe2] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-[#2f7d4f]">DESIGN PREVIEW · AWAITING APPROVAL</span></p>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-4 text-[12px] text-black/55">
            <label className="flex items-center gap-2">Palette
              <span className="flex gap-1.5">
                {PALETTES.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPalette(p.id)} aria-pressed={palette === p.id} title={`${p.en} · ${p.ar}`} className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-[#f4f3ef] ${palette === p.id ? 'ring-2 ring-black' : 'hover:ring-2 hover:ring-black/20'}`} style={{ background: `linear-gradient(145deg, ${p.swatch[0]} 45%, ${p.swatch[1]})` }} />
                ))}
              </span>
            </label>
            <Seg v={mode} set={setMode} opts={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} />
            <Seg v={device} set={setDevice} opts={[['both', 'Both'], ['desktop', 'Desktop'], ['mobile', 'Mobile']]} />
            <PreviewDataControl />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-8 px-6 py-8">
        <nav className="sticky top-[96px] hidden h-fit w-60 shrink-0 lg:block" aria-label="Preview screens">
          {PAGES.map((p) => (
            <button key={p.id} type="button" onClick={() => (setPage(p.id), p.id !== 'themes' && p.id !== 'system' && setNav({ screen: p.id as ScreenId, param: p.id === 'azkar-list' ? undefined : nav.param }))} className={`flex w-full items-baseline gap-3 rounded-[12px] px-3 py-2 text-start ${page === p.id ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'hover:bg-black/[.04]'}`}>
              <span className="w-5 text-[11px] tabular-nums text-black/35">{p.n}</span>
              <span className="min-w-0"><span className="block text-[13.5px] font-medium">{p.en}</span><span className="block text-[12px] text-black/45" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{p.ar}</span></span>
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <div className="mb-6 lg:hidden">
            <select value={page} onChange={(e) => { const v = e.target.value as Page; setPage(v); if (v !== 'themes' && v !== 'system') setNav({ screen: v }) }} className="h-11 w-full rounded-full bg-white px-4 ring-1 ring-black/10">
              {PAGES.map((p) => <option key={p.id} value={p.id}>{p.n} · {p.en} · {p.ar}</option>)}
            </select>
          </div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium tracking-[.12em] text-black/40">{info.n}</p>
              <h1 className="text-[30px] font-semibold tracking-[-.02em]">{info.en} <span className="ms-2 text-[22px] font-medium text-black/45" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{info.ar}</span></h1>
              <p className="mt-2 max-w-[820px] text-[14px] leading-relaxed text-black/60">{info.note}</p>
            </div>
            {page === 'mushaf' && <MushafControls s={mushaf} set={mushafCtx.set} device={device} />}
          </div>

          {page === 'themes' ? (
            <SessionCtx.Provider value={readOnlySession(session.s)}><ThemeBoard /></SessionCtx.Provider>
          ) : page === 'system' ? (
            <SystemPage look={look} />
          ) : (
            <div className={`flex gap-10 ${device === 'both' ? 'flex-col 2xl:flex-row 2xl:items-start' : ''}`}>
              {device !== 'mobile' && <div className="min-w-0 flex-1"><Frame nav={nav} go={go} device="desktop" look={look} /></div>}
              {device !== 'desktop' && <div className="flex shrink-0 justify-center"><Frame nav={nav} go={go} device="mobile" look={look} /></div>}
            </div>
          )}
          <p className="mt-10 flex flex-wrap items-center gap-2 border-t border-black/10 pt-5 text-[12px] text-black/45">
            Design preview only · production screens, store and theme implementation are unchanged · demo figures are badged <span className="rounded-full bg-[#2a7bb6]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#2a7bb6]" dir="rtl">بيانات تجريبية</span> · Quran text: KFGQPC Hafs · Tafsir: Quran Foundation API
          </p>
        </main>
      </div>
    </div>
    </MushafCtx.Provider>
    </SessionCtx.Provider>
  )
}

/** Reviewer control for the shared preview progress store (never the app's data). */
function PreviewDataControl() {
  const st = usePreview()
  const reset = (to: 'demo' | 'empty') => {
    if (confirm(to === 'demo' ? 'Restore the predefined demo scenario? Preview plans and records you created will be removed.' : 'Clear all preview data (plans, records, achievements, stars) and start empty?')) progressActions.reset(to)
  }
  return (
    <div className="flex items-center gap-1.5" title={`Preview-only data · localStorage key ${STORAGE_KEY}`} data-preview-data>
      <span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${isDemoData(st) ? 'bg-[#2a7bb6]/10 text-[#2a7bb6]' : 'bg-black/[.06] text-black/55'}`}>{isDemoData(st) ? 'DEMO DATA' : 'PREVIEW DATA'}</span>
      <button type="button" onClick={() => reset('demo')} className="h-8 rounded-full bg-white px-3 ring-1 ring-black/10 hover:ring-black/30" data-header-reset="demo">Reset demo</button>
      <button type="button" onClick={() => reset('empty')} className="h-8 rounded-full bg-white px-3 ring-1 ring-black/10 hover:ring-black/30" data-header-reset="empty">Start empty</button>
    </div>
  )
}

function Seg<T extends string>({ v, set, opts }: { v: T; set: (t: T) => void; opts: [T, string][] }) {
  return (
    <div className="inline-flex rounded-full bg-black/[.06] p-1 text-[12.5px]">
      {opts.map(([k, l]) => (
        <button key={k} type="button" onClick={() => set(k)} aria-pressed={v === k} className={`h-8 rounded-full px-3.5 ${v === k ? 'bg-white font-semibold text-black shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-black/55 hover:text-black'}`}>{l}</button>
      ))}
    </div>
  )
}

/** Review controls for the Mushaf screen; both device frames share this state. */
function MushafControls({ s, set, device }: { s: MushafState; set: (p: Partial<MushafState>) => void; device: 'both' | Device }) {
  const views: [MobileView, string][] = [['reading', 'Reading'], ['immersive', 'Immersive'], ['playing', 'Playing'], ['ayah', 'Ayah'], ['nav', 'Go to'], ['settings', 'Settings']]
  return (
    <div className="grid grid-cols-[auto_auto] items-center justify-start gap-x-3 gap-y-2.5 text-[12px] text-black/50">
      <span>Screen</span>
      <span><Seg v={s.stage} set={(stage: MushafState['stage']) => set({ stage, nav: navTo(s.nav.pg) })} opts={[['index', 'Surah / Juz index'], ['reader', 'Reader']]} /></span>
      <span>Paper</span>
      <span><Seg v={s.tone} set={(tone: Tone) => set({ tone })} opts={[['app', 'Theme'], ['ivory', 'Ivory'], ['sand', 'Sand'], ['night', 'Night']]} /></span>
      <span>Page</span>
      <PageSelector pg={s.nav.pg} onGo={(pg, f) => set({ nav: navTo(pg, f) })} />
      <span>Rendering</span>
      <span className="text-[11.5px] leading-relaxed text-black/55">Text-rendered from verified KFGQPC Hafs + Tanzil page ranges · not page images · lines reflow (no line-level layout data)</span>
      {device !== 'desktop' && s.stage === 'reader' && (
        <>
          <span>Mobile state</span>
          <span><Seg v={s.view} set={(view: MobileView) => set({ view })} opts={views} /></span>
        </>
      )}
    </div>
  )
}

function ThemeBoard() {
  const [screen, setScreen] = useState<ScreenId>('home')
  const noop = () => {}
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(['home', 'mushaf', 'ayah', 'map', 'library', 'azkar'] as ScreenId[]).map((s) => (
          <button key={s} type="button" onClick={() => setScreen(s)} className={`h-9 rounded-full px-4 text-[13px] ${screen === s ? 'bg-black text-white' : 'bg-white ring-1 ring-black/10'}`}>{PAGES.find((p) => p.id === s)!.en}</button>
        ))}
      </div>
      <div className="space-y-10">
        {PALETTES.map((p) => (
          <section key={p.id}>
            <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><span className="h-4 w-4 rounded-full" style={{ background: p.swatch[0] }} />{p.en} <span className="text-black/45" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{p.ar}</span></p>
            <div className="flex flex-wrap gap-8">
              {[false, true].map((dark) => (
                <div key={String(dark)}>
                  <div className="relative overflow-hidden" style={{ width: 390 * 0.62, height: 844 * 0.62 }}>
                    <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: 'scale(.62)' }} inert>
                      <PhoneShell look={{ palette: p.id, dark }}>
                        <MushafCtx.Provider value={{ s: MUSHAF_DEFAULT, set: noop }}><ProtoCtx.Provider value={{ nav: { screen }, go: noop, device: 'mobile' }}>{SCREENS[screen]()}</ProtoCtx.Provider></MushafCtx.Provider>
                      </PhoneShell>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[12px] text-black/50">{dark ? 'Dark' : 'Light'}</p>
                </div>
              ))}
              <MushafSwatch palette={p.id} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** The approved Mushaf page surface under this palette (light + dark), from the production --mf-* tokens. */
function MushafSwatch({ palette }: { palette: string }) {
  const t = useAyahText(67, 1)
  return (
    <div className="flex flex-col gap-3">
      {[false, true].map((dark) => (
        <Themed key={String(dark)} look={{ palette, dark }} className="w-60 rounded-[18px] p-3">
          <div className="mf-paper rounded-[6px] px-4 py-3" data-side="right">
            <div className="mf-frame rounded-[2px] px-3 py-2.5">
              <p className={`mf-text ${t?.hafs === false ? 'tanzil' : ''} line-clamp-2 text-[17px]`} style={{ lineHeight: 2 }}>{t?.text ?? ''} <span className="mf-num">١</span></p>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">Mushaf page · {dark ? 'Dark' : 'Light'}</p>
        </Themed>
      ))}
    </div>
  )
}

function SystemPage({ look }: { look: Look }) {
  const t = useAyahText(67, 1)
  const roles: [string, string, string][] = [
    ['night', 'bg-night', 'Primary ink · active nav'],
    ['parchment', 'bg-parchment', 'Canvas'],
    ['card', 'bg-card', 'Raised surface'],
    ['line', 'bg-line', 'Hairlines'],
    ['muted', 'bg-muted', 'Secondary text'],
    ['gold', 'bg-gold', 'Accent · in progress'],
    ['gold-soft', 'bg-gold-soft', 'Accent wash'],
    ['leaf', 'bg-leaf', 'Complete · memorised'],
    ['sky', 'bg-sky', 'Info · rest · Kids'],
    ['clay', 'bg-clay', 'Error · placeholder warning'],
  ]
  const review: [string, string][] = [
    ['Coherence', 'All screens share one chrome (side rail / floating dock), one state vocabulary (leaf · gold · neutral · sky rest) and the same card radius and type scale as production.'],
    ['Content integrity', 'Quran text, Tafsir and Azkar (Hisn al-Muslim, verbatim with takhrij) are real and attributed. Word meanings and recitation results remain explicit placeholders; the Azkar library still needs a scholar’s review and licence confirmation before production.'],
    ['Honest progress', 'Every figure derives from demo records (ayah ranges, plan days). Memorisation is only recorded by the explicit result step, never by viewing or reading tafsir.'],
    ['Isometric use', 'Limited to Map, Library, Kids house and Week. Glow only marks live state and disappears with prefers-reduced-transparency. Pure SVG, no 3D library.'],
    ['Risk · density', 'The Memorization Journey desktop side panel is information-rich; implementation should default to one section expanded and lazy-load Tafsir.'],
    ['Similarities integrity', 'Similarities live inside the active memorisation passage. Verified references and automatic text matches are separate sources; no verified dataset is bundled, so every passage shows “لا توجد متشابهات موثّقة لهذا المقطع حاليًا.” Similarity practice has its own progress and never counts as memorisation.'],
    ['Risk · map on mobile', 'The 30-station map is tall on phones (10 rows). The pinned detail sheet keeps context; implementation should auto-scroll to the in-progress station.'],
    ['Risk · Kids locks', 'Existing lessons have no locking, so the house shows completed / next / not-started rather than inventing locks. If locks are wanted, that is a product decision to approve.'],
    ['Accessibility', 'All isometric hotspots are focusable buttons with labels; RTL order is respected; touch targets ≥ 44 px; counters and steppers are real buttons. Contrast follows the existing palette (already AA/AAA for text).'],
    ['Not yet verified', 'Rendered in code but not screenshot-tested here; review on a real phone for snap-scroll feel and text fit of long ayat.'],
  ]
  return (
    <div className="space-y-8">
      <Themed look={look} className="rounded-[28px] p-8">
        <p className="mb-4 text-[14px] font-semibold">Semantic colour roles (live from the production palette)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {roles.map(([n, c, d]) => (
            <div key={n}><span className={`block h-14 rounded-[14px] ring-1 ring-line ${c}`} /><p className="mt-2 text-[12.5px] font-semibold" dir="ltr">{n}</p><p className="text-[11.5px] text-muted" dir="ltr">{d}</p></div>
          ))}
        </div>
        <p className="mb-3 mt-8 text-[14px] font-semibold">Type</p>
        <div className="space-y-3">
          <p className="font-arabic-display text-[30px] font-bold">رحلتك اليوم <span className="text-[12px] font-normal text-muted" dir="ltr">· IBM Plex Sans Arabic 700 · 30/1.25</span></p>
          <p className="text-[15px]">نص الواجهة الأساسي لوصف الخطوات بوضوح وهدوء. <span className="text-[12px] text-muted" dir="ltr">· 15/1.6</span></p>
          <p className={`mf-text ${t?.hafs === false ? 'tanzil' : ''} text-[28px]`} style={{ lineHeight: 2.05, textAlign: 'right', textAlignLast: 'right' }}>{t?.text ?? ''} <span className="mf-num">١</span> <span className="font-sans text-[12px] text-muted" dir="ltr">· KFGQPC Hafs · 28/2.05</span></p>
        </div>
        <p className="mb-3 mt-8 text-[14px] font-semibold">States</p>
        <div className="flex flex-wrap gap-2 text-[12.5px]">
          <span className="rounded-full bg-leaf/10 px-3 py-1.5 font-semibold text-leaf">مكتمل</span>
          <span className="rounded-full bg-gold-soft px-3 py-1.5 font-semibold">قيد الإنجاز</span>
          <span className="rounded-full bg-night/[.05] px-3 py-1.5 text-muted">لم يبدأ</span>
          <span className="rounded-full bg-sky/10 px-3 py-1.5 font-semibold text-sky">يوم راحة</span>
          <Demo />
          <span className="rounded-full border border-dashed border-clay/40 px-3 py-1.5 text-clay">محتوى مؤقّت</span>
        </div>
      </Themed>
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/[.06]">
        <p className="mb-1 text-[14px] font-semibold">Design review</p>
        <p className="mb-5 text-[13px] text-black/55">Critique of this preview against the brief, before approval. Skills referenced (create-design-md, frontend-design, adapt, better-colors, better-typography, anatomy-asset, design-review) are not installed in this environment; their published principles were used as guidance.</p>
        <dl className="grid gap-4 md:grid-cols-2">
          {review.map(([k, v]) => (
            <div key={k} className="rounded-[18px] bg-[#f7f6f2] p-4"><dt className="text-[13px] font-semibold">{k}</dt><dd className="mt-1 text-[13px] leading-relaxed text-black/65">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-6 text-[12px] text-black/45">{toAr(11)} deliverables · navigable prototype · {PALETTES.length} palettes × light/dark · <Icon name="check" size={12} className="inline" /> production untouched</p>
      </div>
    </div>
  )
}
