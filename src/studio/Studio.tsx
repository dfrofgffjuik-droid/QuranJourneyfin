import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ProtoCtx, freshState, type Entry, type PState } from './proto'
import { Root, ADULT_SCREENS, KID_SCREENS } from './root'
import { CONCEPTS, REFERENCES } from './registry'
import type { Concept } from './kit'
import { I } from './kit'
import { FATIHA } from './data'

const FONTS =
  'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&family=Tajawal:wght@400;500;700;800&family=Marhey:wght@400;600&family=Lemonada:wght@400;600;700&family=Reem+Kufi:wght@400;600;700&family=Cairo:wght@400;600;700&family=El+Messiri:wght@400;600;700&family=Lalezar&family=Alexandria:wght@400;600;800;900&family=Baloo+Bhaijaan+2:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap'
const KEY = 'rafiqi-design-studio-v1'
// Phase 1 Mushaf design preview (design-only, #/design-studio/mushaf).
const MushafPreview = lazy(() => import('./mushaf/MushafPreview'))
// Next-generation product preview (design-only, #/design-studio/next).
const NextPreview = lazy(() => import('./next/NextPreview'))
const useHash = () => {
  const [h, setH] = useState(location.hash)
  useEffect(() => {
    const f = () => setH(location.hash)
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}
type Saved = { open: string | null; device: 'mobile' | 'desktop'; protos: Record<string, PState>; info: boolean; sync: boolean }
const load = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object') return { open: null, device: 'mobile', protos: {}, info: true, sync: false, ...s }
  } catch {
    /* first visit */
  }
  return { open: null, device: 'mobile', protos: {}, info: true, sync: false }
}

const ROOTS = new Set(['home', 'library', 'plans', 'revision', 'khatmah', 'recite', 'progress', 'settings', 'guide', 'onboarding', 'k-home', 'k-letters', 'k-surahs', 'k-rewards'])
const PARENT: Record<string, string> = { memorize: 'home', 'plan-new': 'plans', 'revision-session': 'revision', reader: 'library', 'guide-child': 'guide', 'k-letter': 'k-letters', 'k-listen': 'k-surahs', 'k-memorize': 'k-surahs' }

function jump(st: PState, s: string, p?: Entry['p']): PState {
  const kid = s.startsWith('k-')
  const mode = kid ? 'kids' : 'adult'
  if (s === 'reader:ayah') return { ...st, mode, menu: false, stacks: { ...st.stacks, adult: [{ s: 'library' }, { s: 'reader', p: { n: 1 } }] }, sheet: { id: 'ayah', p: { n: 1, a: 1, text: FATIHA.ayat[0].text } } }
  const stack: Entry[] = ROOTS.has(s) ? [{ s, p }] : [{ s: PARENT[s] ?? (kid ? 'k-home' : 'home') }, { s, p }]
  return { ...st, mode, sheet: null, menu: false, draft: s === 'plan-new' ? { ...st.draft, step: 0 } : st.draft, stacks: { ...st.stacks, [mode]: stack } }
}

export default function Studio() {
  const hash = useHash()
  const [saved, setSaved] = useState<Saved>(load)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ ...saved, protos: Object.fromEntries(Object.entries(saved.protos).map(([k, v]) => [k, { ...v, toast: null }])) }))
  }, [saved])
  useEffect(() => {
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = FONTS
    document.head.appendChild(l)
    document.title = 'Design Studio · Al-Quran Rafiqi'
    return () => l.remove()
  }, [])
  useEffect(() => {
    document.body.style.overflow = saved.open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [saved.open])

  const open = (id: string, mode?: 'adult' | 'kids', device?: 'mobile' | 'desktop') =>
    setSaved((s) => {
      const cur = s.protos[id] ?? freshState()
      return { ...s, open: id, device: device ?? s.device, protos: { ...s.protos, [id]: mode ? { ...cur, mode, sheet: null } : cur } }
    })

  if (/^#\/design-studio\/next/.test(hash))
    return (
      <Suspense fallback={null}>
        <NextPreview />
      </Suspense>
    )
  if (/^#\/design-studio\/mushaf/.test(hash))
    return (
      <Suspense fallback={null}>
        <MushafPreview />
      </Suspense>
    )

  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-[#f4f3ef] font-['Inter',system-ui,sans-serif] text-[#16181d]">
      <Gallery onOpen={open} />
      {saved.open && <Viewer saved={saved} setSaved={setSaved} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
function Mini({ concept, s, p, mode = 'adult', w = 390, h = 844, scale = 0.4, desktop = false }: { concept: Concept; s: string; p?: Entry['p']; mode?: 'adult' | 'kids'; w?: number; h?: number; scale?: number; desktop?: boolean }) {
  const st = useMemo(() => jump({ ...freshState(), flags: { coachDone: true } }, s, p), [s, p])
  const value = useMemo(() => ({ st: { ...st, mode }, set: () => {}, concept, desktop }), [st, mode, concept, desktop])
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[22px] bg-white shadow-[0_18px_40px_-20px_rgba(0,0,0,.35)] ring-1 ring-black/10" style={{ width: w * scale, height: h * scale }}>
      <div inert className="pointer-events-none origin-top-left" style={{ width: w, height: h, transform: `scale(${scale})` }}>
        <ProtoCtx.Provider value={value}>
          <Root />
        </ProtoCtx.Provider>
      </div>
    </div>
  )
}

function Gallery({ onOpen }: { onOpen: (id: string, mode?: 'adult' | 'kids', device?: 'mobile' | 'desktop') => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-[1360px] px-6 pb-24 pt-10 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <a href="#/" className="text-[12px] font-medium text-black/50 hover:text-black">← Back to the app</a>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-.02em] md:text-[52px]">Design Studio</h1>
          <p className="mt-1 text-[18px] text-black/60" dir="rtl" lang="ar" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>استوديو التصميم · القرآن رفيقي</p>
          <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-black/65">
            Six complete design directions for Al-Quran Rafiqi. Each one is a working prototype with the same 13 adult screens, a separately designed Kids Mode, and a parent/teacher view. Open any concept, explore the full journey on mobile or desktop, then compare. No direction has been chosen.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
          {[['6', 'concepts'], ['13 + 10', 'screens each'], ['Isolated', 'preview data']].map(([v, l]) => (
            <div key={l} className="rounded-[14px] bg-white px-4 py-3 ring-1 ring-black/5"><div className="text-[18px] font-semibold">{v}</div><div className="text-black/50">{l}</div></div>
          ))}
        </div>
      </header>

      <a href="#/design-studio/next" className="group mt-10 flex flex-wrap items-center gap-6 overflow-hidden rounded-[28px] bg-white p-7 ring-1 ring-black/10 md:p-8">
        <div className="min-w-[260px] flex-1">
          <span className="rounded-full bg-[#dcefe2] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2f7d4f]">NEXT GENERATION · DESIGN PREVIEW</span>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-.01em]">Quaran, complete product <span className="ms-2 text-[22px] font-medium text-black/50" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>رحلتك اليوم · رحلة الحفظ · أذكاري</span></h2>
          <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-black/60">Home dashboard, Memorization Journey, 30-part map, achievements library, Kids house, weekly roadmap, recitation journey and Azkar, in every palette, light and dark, desktop and mobile. Awaiting approval.</p>
        </div>
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#16181d] px-5 text-[14px] font-medium text-white transition group-hover:bg-black">Open preview <I n="arrow" s={16} className="rotate-180" /></span>
      </a>

      <a href="#/design-studio/mushaf" className="group mt-4 flex flex-wrap items-center gap-6 overflow-hidden rounded-[28px] bg-[#16181d] p-7 text-white ring-1 ring-black/10 md:p-8">
        <div className="min-w-[260px] flex-1">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#9fe0b7]">PHASE 1 · DESIGN PREVIEW</span>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-.01em]">Digital Mushaf <span className="ms-2 text-[22px] font-medium text-white/60" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>المصحف الرقمي</span></h2>
          <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-white/65">Desktop and mobile Madinah-style reader, ayah states, navigation sheet and reading settings, on verified KFGQPC Hafs text. Awaiting approval; the production reader is unchanged.</p>
        </div>
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-[#16181d] transition group-hover:bg-[#dcefe2]">Open preview <I n="arrow" s={16} className="rotate-180" /></span>
      </a>

      <div className="mt-10 space-y-8">
        {CONCEPTS.map((c, i) => (
          <article key={c.id} className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[.06]">
            <div className="grid gap-0 lg:grid-cols-[400px_1fr]">
              <div className="flex flex-col p-7">
                <div className="flex items-center gap-3 text-[12px] font-medium text-black/45"><span>{String(i + 1).padStart(2, '0')}</span><span className="h-px flex-1 bg-black/10" /></div>
                <div className="mt-4 flex items-baseline gap-3">
                  <h2 className="text-[30px] font-semibold tracking-[-.01em]">{c.name}</h2>
                  <span className="text-[26px]" dir="rtl" style={{ fontFamily: c.sample.display }}>{c.ar}</span>
                </div>
                <p className="mt-1 text-[14px] text-black/55" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{c.tagline}</p>
                <p className="mt-4 text-[14px] leading-relaxed text-black/70">{c.rationale}</p>
                <dl className="mt-5 space-y-2 text-[13px]">
                  {c.principles.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[96px_1fr] gap-2"><dt className="text-black/45">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
                <div className="mt-5 flex items-center gap-4">
                  <div><div className="mb-1.5 text-[11px] text-black/45">Adult</div><div className="flex">{c.swatches.map((s) => <span key={s} className="-ms-1 size-7 rounded-full ring-2 ring-white first:ms-0" style={{ background: s }} />)}</div></div>
                  <div><div className="mb-1.5 text-[11px] text-black/45">Kids</div><div className="flex">{c.kidsSwatches.map((s) => <span key={s} className="-ms-1 size-7 rounded-full ring-2 ring-white first:ms-0" style={{ background: s }} />)}</div></div>
                  <div className="ms-auto text-end" dir="rtl"><div className="text-[30px] leading-none" style={{ fontFamily: c.sample.display }}>أبجد</div><div className="mt-1 text-[11px] text-black/45" dir="ltr">{c.sample.display.replace(/'/g, '')}</div></div>
                </div>
                {c.refs.length > 0 && (
                  <div className="mt-5 flex items-center gap-2"><span className="text-[11px] text-black/45">Inspired by</span>{c.refs.map((r) => { const ref = REFERENCES.find((x) => x.id === r)!; return <button key={r} onClick={() => setLightbox(ref.file)} title={ref.title}><img src={`${import.meta.env.BASE_URL}design-studio/refs/${ref.file}`} alt={ref.title} className="size-9 rounded-[8px] object-cover ring-1 ring-black/10" /></button> })}</div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-7">
                  <button onClick={() => onOpen(c.id, 'adult')} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#16181d] px-5 text-[14px] font-medium text-white hover:bg-black">Explore Adult <I n="arrow" s={16} className="rotate-180" /></button>
                  <button onClick={() => onOpen(c.id, 'kids')} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f1efe8] px-5 text-[14px] font-medium hover:bg-[#e8e5db]">Explore Kids</button>
                  <button onClick={() => onOpen(c.id, undefined, 'desktop')} aria-label="Open desktop preview" className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-[13px] text-black/60 hover:bg-[#f1efe8]"><I n="monitor" s={17} />Desktop</button>
                </div>
              </div>
              <div className="overflow-x-auto bg-[#f7f6f2] p-7 no-scrollbar">
                <div className="flex min-w-max items-start gap-5">
                  {[['home', 'Home', 'adult'], ['reader', 'Reader', 'adult'], ['plans', 'Plans', 'adult'], ['recite', 'Tasmee\'', 'adult'], ['k-home', c.kidsName.split(' · ')[0], 'kids']].map(([s, l, m]) => (
                    <div key={s} role="button" tabIndex={0} onClick={() => onOpen(c.id, m as 'adult')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(c.id, m as 'adult')} className="group cursor-pointer text-start">
                      <Mini concept={c} s={s} p={s === 'reader' ? { n: 1 } : undefined} mode={m as 'adult'} scale={0.36} />
                      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-black/55 group-hover:text-black">{m === 'kids' && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">Kids</span>}{l}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[12px] text-black/45">Kids Mode: <b className="font-medium text-black/65">{c.kidsName}</b> — {c.kidsTagline}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-4">
          <div><h2 className="text-[26px] font-semibold">Reference board</h2><p className="mt-1 text-[14px] text-black/55">Batch 1 · {REFERENCES.length} images. New references add concepts or refinements; existing directions stay intact.</p></div>
          <p className="max-w-[420px] text-[12px] text-black/45">To extend: add images to <code className="rounded bg-black/5 px-1">public/design-studio/refs/</code>, register them in <code className="rounded bg-black/5 px-1">src/studio/registry.ts</code>, and add a concept file under <code className="rounded bg-black/5 px-1">src/studio/concepts/</code>.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {REFERENCES.map((r) => (
            <button key={r.id} onClick={() => setLightbox(r.file)} className="group text-start">
              <div className="aspect-[4/5] overflow-hidden rounded-[16px] bg-white ring-1 ring-black/5"><img src={`${import.meta.env.BASE_URL}design-studio/refs/${r.file}`} alt={r.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" /></div>
              <div className="mt-2 text-[13px] font-medium">{r.title}</div>
              <div className="text-[12px] leading-snug text-black/50">{r.notes}</div>
              <div className="mt-1 text-[11px] text-black/40">Used by: {CONCEPTS.filter((c) => c.refs.includes(r.id)).map((c) => c.name).join(', ') || 'general'}</div>
            </button>
          ))}
        </div>
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-6" onClick={() => setLightbox(null)}>
          <img src={`${import.meta.env.BASE_URL}design-studio/refs/${lightbox}`} alt="" className="max-h-full max-w-full rounded-[12px]" />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function Seg<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, ReactNode][] }) {
  return (
    <div className="flex rounded-full bg-white/10 p-0.5">
      {items.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition ${value === v ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>{l}</button>)}
    </div>
  )
}

function Viewer({ saved, setSaved }: { saved: Saved; setSaved: React.Dispatch<React.SetStateAction<Saved>> }) {
  const concept = CONCEPTS.find((c) => c.id === saved.open) ?? CONCEPTS[0]
  const st = saved.protos[concept.id] ?? freshState()
  const set = (f: (s: PState) => PState) => setSaved((x) => ({ ...x, protos: { ...x.protos, [concept.id]: f(x.protos[concept.id] ?? freshState()) } }))
  const desktop = saved.device === 'desktop'
  const stack = st.stacks[st.mode]
  const cur = stack[stack.length - 1]
  const [menu, setMenu] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 1200, h: 800 })
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = desktop ? 1280 : 390
  const H = desktop ? 800 : 844
  const chrome = desktop ? 36 : 0
  const bezel = desktop ? 0 : 12
  const scale = Math.min(1, (box.w - 48) / (W + bezel * 2), (box.h - 48) / (H + chrome + bezel * 2))
  const screens = st.mode === 'kids' ? KID_SCREENS : ADULT_SCREENS
  const label = [...ADULT_SCREENS, ...KID_SCREENS].find((x) => x.s === cur.s)?.l ?? cur.s
  const switchTo = (id: string) =>
    setSaved((x) => {
      if (!x.sync) return { ...x, open: id }
      const target = x.protos[id] ?? freshState()
      return { ...x, open: id, protos: { ...x.protos, [id]: jump(target, cur.s, cur.p) } }
    })
  const idx = CONCEPTS.indexOf(concept)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1b1c20] text-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button onClick={() => setSaved((x) => ({ ...x, open: null }))} className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-medium hover:bg-white/15"><I n="grid" s={16} />Gallery</button>
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {CONCEPTS.map((c) => (
            <button key={c.id} onClick={() => switchTo(c.id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] ${c.id === concept.id ? 'bg-white text-black' : 'text-white/65 hover:text-white'}`}>
              <span className="size-2.5 rounded-full" style={{ background: c.swatches[1] }} />{c.name}
            </button>
          ))}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Seg value={st.mode} onChange={(m) => set((s) => ({ ...s, mode: m, sheet: null, menu: false }))} items={[['adult', 'Adult'], ['kids', 'Kids']]} />
          <Seg value={saved.device} onChange={(d) => setSaved((x) => ({ ...x, device: d }))} items={[['mobile', <><I n="phone" s={15} />Mobile</>], ['desktop', <><I n="monitor" s={15} />Desktop</>]]} />
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="flex h-9 max-w-[240px] items-center gap-2 rounded-full bg-white/10 px-3 text-[12.5px] hover:bg-white/15"><I n="layers" s={15} /><span className="truncate" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>{label}</span><I n="chevronDown" s={14} /></button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute end-0 top-11 z-20 max-h-[70vh] w-[300px] overflow-y-auto rounded-[16px] bg-[#26272d] p-2 shadow-2xl ring-1 ring-white/10" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic'" }}>
                  {[['Adult', ADULT_SCREENS], ['Kids', KID_SCREENS]].map(([title, list]) => (
                    <div key={title as string}>
                      <div className="px-3 pb-1 pt-2 text-[11px] text-white/40" dir="ltr">{title as string}</div>
                      {(list as typeof screens).map((x) => (
                        <button key={x.s} onClick={() => { set((s) => jump(s, x.s, x.p)); setMenu(false) }} className={`block w-full rounded-[10px] px-3 py-2 text-start text-[13px] hover:bg-white/10 ${x.s === cur.s ? 'text-[#7dd3c0]' : 'text-white/85'}`}>{x.l}</button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => set(() => freshState())} title="Reset this prototype" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/15"><I n="refresh" s={16} /></button>
          <button onClick={() => setSaved((x) => ({ ...x, info: !x.info }))} title="Concept notes" className={`grid size-9 place-items-center rounded-full ${saved.info ? 'bg-white text-black' : 'bg-white/10'}`}><I n="info" s={16} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {saved.info && (
          <aside className="hidden w-[290px] shrink-0 overflow-y-auto border-e border-white/10 p-5 lg:block">
            <div className="text-[11px] text-white/40">{String(idx + 1).padStart(2, '0')} / {String(CONCEPTS.length).padStart(2, '0')}</div>
            <div className="mt-2 flex items-baseline gap-2"><h2 className="text-[24px] font-semibold">{concept.name}</h2><span className="text-[20px]" style={{ fontFamily: concept.sample.display }}>{concept.ar}</span></div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/65">{concept.rationale}</p>
            <dl className="mt-4 space-y-2.5 text-[12.5px]">{concept.principles.map(([k, v]) => <div key={k}><dt className="text-white/40">{k}</dt><dd className="text-white/85">{v}</dd></div>)}</dl>
            <div className="mt-5 rounded-[14px] bg-white/5 p-3 text-[12.5px]"><div className="text-white/40">Kids identity</div><div className="mt-1 font-medium">{concept.kidsName}</div><div className="text-white/60">{concept.kidsTagline}</div></div>
            <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[12.5px] text-white/70">
              <input type="checkbox" checked={saved.sync} onChange={(e) => setSaved((x) => ({ ...x, sync: e.target.checked }))} className="mt-0.5 accent-[#7dd3c0]" />
              <span>Keep the same screen when switching concepts (for side-by-side comparison). Otherwise each concept remembers its own place.</span>
            </label>
            <div className="mt-5 flex gap-2">
              <button disabled={idx === 0} onClick={() => switchTo(CONCEPTS[idx - 1].id)} className="h-9 flex-1 rounded-full bg-white/10 text-[12.5px] disabled:opacity-30">← Previous</button>
              <button disabled={idx === CONCEPTS.length - 1} onClick={() => switchTo(CONCEPTS[idx + 1].id)} className="h-9 flex-1 rounded-full bg-white/10 text-[12.5px] disabled:opacity-30">Next →</button>
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-white/35">Preview data only. Nothing here touches your real progress, plans, recordings or the Muaalem integration.</p>
          </aside>
        )}
        <div ref={stage} className="relative grid min-w-0 flex-1 place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#2a2b31,#141518)]">
          <div style={{ width: (W + bezel * 2) * scale, height: (H + chrome + bezel * 2) * scale }}>
            <div className="origin-top-left" style={{ width: W + bezel * 2, height: H + chrome + bezel * 2, transform: `scale(${scale})` }}>
              {desktop ? (
                <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)] ring-1 ring-white/10">
                  <div className="flex h-9 shrink-0 items-center gap-2 bg-[#e9e8e4] px-4">
                    <span className="size-3 rounded-full bg-[#ff5f57]" /><span className="size-3 rounded-full bg-[#febc2e]" /><span className="size-3 rounded-full bg-[#28c840]" />
                    <span className="mx-auto rounded-[8px] bg-white px-24 py-1 text-[12px] text-black/50">rafiqi.app/{concept.id}/{cur.s}</span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ProtoCtx.Provider value={{ st, set, concept, desktop }}><Root /></ProtoCtx.Provider>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-[58px] bg-[#0b0b0d] p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),inset_0_0_0_2px_#2c2c30]">
                  <div className="relative h-full overflow-hidden rounded-[46px]">
                    <ProtoCtx.Provider value={{ st, set, concept, desktop }}><Root /></ProtoCtx.Provider>
                    <div className="pointer-events-none absolute left-1/2 top-2.5 z-[60] h-7 w-[110px] -translate-x-1/2 rounded-full bg-black" />
                    <div className="pointer-events-none absolute bottom-2 left-1/2 z-[60] h-1 w-32 -translate-x-1/2 rounded-full bg-black/40" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
