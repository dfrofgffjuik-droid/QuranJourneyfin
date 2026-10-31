import type { ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { Btn, I, type Concept, type Theme } from '../kit'
import { Stars } from '../kids'
import { AGENDA, KID, USER, toAr } from '../data'
import { NAV, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#f7f6f2', '--surface': '#ffffff', '--surface-2': '#e9e7e0', '--ink': '#0f0f0f', '--muted': '#6d6a63', '--line': '#d9d6cd',
    '--accent': '#e8432b', '--accent-ink': '#ffffff', '--good': '#1f8a4c', '--warn': '#e3a008', '--bad': '#e8432b',
    '--font-ui': "'Alexandria', 'IBM Plex Sans Arabic', sans-serif", '--font-display': "'Alexandria', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': '#0f0f0f', '--hero-ink': '#f7f6f2',
    '--hero-art': 'radial-gradient(circle at 78% 30%, #e8432b 0 7%, transparent 7.3%)',
  },
  tones: { a: ['#fde3de', '#c0301b'], b: ['#e9e7e0', '#0f0f0f'], c: ['#fff1c7', '#8a6100'], d: ['#dfe8ff', '#1d3fb0'], e: ['#ddf1e4', '#1f6a3c'] },
  card: 'block', btn: 'block', head: 'huge', bar: 'mono', reader: 'focus', progress: 'numbers', week: 'grid', sheet: 'full',
}
const kids: Theme = {
  vars: {
    '--bg': '#ffffff', '--surface': '#ffffff', '--surface-2': '#eeeeee', '--ink': '#111111', '--muted': '#555555', '--line': '#111111',
    '--accent': '#1f4fd8', '--accent-ink': '#ffffff', '--good': '#1f9a4c', '--warn': '#ffc400', '--bad': '#e0301e', '--mic': '#e0301e',
    '--font-ui': "'Alexandria', sans-serif", '--font-display': "'Alexandria', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': '#e0301e', '--hero-ink': '#fff',
  },
  tones: { a: ['#e0301e', '#ffffff'], b: ['#ffc400', '#111111'], c: ['#1f4fd8', '#ffffff'], d: ['#ffffff', '#111111'], e: ['#111111', '#ffffff'] },
  card: 'mondrian', btn: 'block', head: 'huge', bar: 'mono', reader: 'focus', progress: 'numbers', week: 'grid', sheet: 'full',
}

function Index({ onClose }: { onClose: () => void }) {
  const { tab, sheet } = useP()
  const active = useRootTab()
  return (
    <div className="rise absolute inset-0 z-30 flex flex-col bg-(--ink) p-6 text-(--bg)">
      <div className="flex items-center justify-between"><span className="text-[13px] font-bold tracking-[.2em]">الفهرس</span><button onClick={onClose} aria-label="إغلاق" className="grid size-10 place-items-center border-2 border-(--bg)"><I n="x" s={18} /></button></div>
      <nav className="mt-6 flex-1 overflow-y-auto no-scrollbar">
        {NAV.map((n, i) => (
          <button key={n.s} onClick={() => tab(n.s)} className="flex w-full items-baseline gap-4 border-b border-white/15 py-3 text-start">
            <span className="w-8 text-[13px] text-white/50">{toAr(String(i + 1).padStart(2, '0'))}</span>
            <span className={`text-[30px] font-black leading-none ${active === n.s ? 'text-(--accent)' : ''}`}>{n.l}</span>
            {active === n.s && <span className="ms-auto size-3 rounded-full bg-(--accent)" />}
          </button>
        ))}
      </nav>
      <button onClick={() => sheet('profiles')} className="mt-4 flex items-center justify-between border-2 border-(--bg) px-4 py-3 text-[14px] font-bold">{USER.name} · تبديل الملف<I n="swap" s={18} /></button>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { desktop, st, patch, tab } = useP()
  const active = useRootTab()
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-4 border-b-2 border-(--ink) px-5 py-3">
        <button onClick={() => tab('home')} className="text-[22px] font-black leading-none">رفيقي<span className="text-(--accent)">.</span></button>
        {desktop && (
          <nav className="flex flex-1 justify-center gap-6 text-[13px] font-bold">
            {NAV.map((n, i) => <button key={n.s} onClick={() => tab(n.s)} className={`flex items-baseline gap-1 ${active === n.s ? 'text-(--accent)' : ''}`}><span className="text-[10px] text-(--muted)">{toAr(String(i + 1).padStart(2, '0'))}</span>{n.l}</button>)}
          </nav>
        )}
        <button onClick={() => patch({ menu: true })} className="ms-auto flex items-center gap-2 border-2 border-(--ink) px-3 py-1.5 text-[13px] font-bold"><I n="menu" s={16} />الفهرس</button>
      </header>
      <Scroll>{children}</Scroll>
      {st.menu && <Index onClose={() => patch({ menu: false })} />}
    </div>
  )
}

function Home() {
  const { go, desktop } = useP()
  return (
    <div className={desktop ? 'mx-auto max-w-[1040px] px-8 pb-16 pt-8' : 'px-5 pb-10 pt-5'}>
      <div className="text-[11px] font-bold tracking-[.25em] text-(--muted)">الأربعاء · ١٦ شعبان</div>
      <div className={desktop ? 'mt-3 grid grid-cols-[1.4fr_1fr] gap-8' : ''}>
        <button onClick={() => go('memorize')} className="relative mt-3 block w-full overflow-hidden bg-(--ink) p-6 text-start text-(--bg)">
          <div className="absolute inset-0" style={{ background: 'var(--hero-art)' }} />
          <div className="relative">
            <div className="text-[13px] font-bold tracking-[.2em] text-white/60">التالي</div>
            <div className={`mt-4 font-black leading-[.9] ${desktop ? 'text-[110px]' : 'text-[84px]'}`}>١٦–٢٠</div>
            <div className="mt-2 text-[26px] font-bold">سورة الملك</div>
            <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-[13px]"><span>حفظ · ٥ آيات · ١٥ دقيقة</span><span className="flex items-center gap-2 bg-(--accent) px-3 py-2 font-bold">ابدأ<I n="arrow" s={16} /></span></div>
          </div>
        </button>
        <div>
          <div className="mt-8 text-[11px] font-bold tracking-[.25em] text-(--muted)">ثم</div>
          {AGENDA.slice(1).map((a, i) => (
            <button key={a.label} onClick={() => go(a.screen)} className="flex w-full items-baseline gap-4 border-b-2 border-(--ink) py-4 text-start">
              <span className="text-[13px] font-bold text-(--muted)">{toAr(String(i + 2).padStart(2, '0'))}</span>
              <span className="flex-1"><span className={`block text-[24px] font-black leading-none ${a.done ? 'text-(--muted) line-through' : ''}`}>{a.label}</span><span className="mt-1 block text-[13px] text-(--muted)">{a.detail}</span></span>
              <span className="text-[13px] font-bold">{toAr(a.mins)}د</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 border-2 border-(--ink)">
        {[[toAr(USER.streak), 'يوم'], ['٤١٢', 'آية'], ['٣٥٪', 'ختمة']].map(([v, l], i) => <button key={l} onClick={() => go('progress')} className={`p-4 text-start ${i < 2 ? 'border-e-2 border-(--ink)' : ''}`}><div className="text-[34px] font-black leading-none">{v}</div><div className="mt-1 text-[12px] text-(--muted)">{l}</div></button>)}
      </div>
    </div>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab } = useP()
  const active = useRootTab()
  const items = [{ s: 'k-home', c: '#e0301e', ic: 'home' }, { s: 'k-letters', c: '#ffc400', ic: 'letters' }, { s: 'k-surahs', c: '#1f4fd8', ic: 'book' }, { s: 'k-rewards', c: '#111111', ic: 'trophy' }]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Scroll>{children}</Scroll>
      <nav className="grid grid-cols-4 border-t-[3px] border-(--ink)">
        {items.map((n, i) => <button key={n.s} onClick={() => tab(n.s)} aria-label={n.s} className={`grid h-[72px] place-items-center ${i < 3 ? 'border-e-[3px] border-(--ink)' : ''}`} style={{ background: n.c, color: n.c === '#ffc400' ? '#111' : '#fff' }}><span className={`grid place-items-center transition ${active === n.s ? 'size-12 bg-white text-[#111]' : ''}`}><I n={n.ic} s={28} /></span></button>)}
      </nav>
    </div>
  )
}

function KidsHome() {
  const { go, st, sheet, desktop } = useP()
  const B = ({ s, c, fg = '#fff', className = '', glyph, label, p }: { s: string; c: string; fg?: string; className?: string; glyph: ReactNode; label: string; p?: Record<string, unknown> }) => (
    <button onClick={() => go(s, p)} className={`flex flex-col justify-between border-[3px] border-(--ink) p-3 text-start transition active:scale-[.98] ${className}`} style={{ background: c, color: fg }}>
      <span className="leading-none">{glyph}</span>
      <span className="text-[16px] font-black">{label}</span>
    </button>
  )
  return (
    <div className={desktop ? 'mx-auto max-w-[760px] p-8' : 'p-4'}>
      <div className="mb-3 flex items-center gap-3"><span className="flex-1 text-[30px] font-black leading-none">{KID.name}<span className="text-[#e0301e]">.</span></span><Stars n={st.stars} className="!rounded-none !ring-2 !ring-(--ink)" /><button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-10 place-items-center border-[3px] border-(--ink)"><I n="lock" s={17} /></button></div>
      <div className="grid h-[560px] grid-cols-3 grid-rows-4 gap-0 [&>*]:-m-[1.5px]">
        <B s="k-letter" p={{ i: 6 }} c="#e0301e" className="col-span-2 row-span-2" glyph={<span className="font-(family-name:--font-quran) text-[150px]">خ</span>} label="حرف اليوم" />
        <B s="k-harakat" c="#ffc400" fg="#111" glyph={<span className="font-(family-name:--font-quran) text-[60px]">بَ</span>} label="الحركات" />
        <B s="k-joining" c="#fff" fg="#111" glyph={<span className="font-(family-name:--font-quran) text-[44px]">بـا</span>} label="وصل" />
        <B s="k-surahs" c="#1f4fd8" className="row-span-2" glyph={<I n="ear" s={56} />} label="سوري" />
        <B s="k-reading" c="#fff" fg="#111" className="col-span-2" glyph={<span className="font-(family-name:--font-quran) text-[46px]">كَتَبَ</span>} label="أقرأ" />
        <B s="k-letters" c="#ffc400" fg="#111" glyph={<span className="text-[44px] font-black">٢٨</span>} label="كل الحروف" />
        <B s="k-rewards" c="#111" glyph={<I n="star" s={44} fill className="text-[#ffc400]" />} label={`${toAr(st.stars)} نجمة`} />
      </div>
    </div>
  )
}

export const nuqta: Concept = {
  id: 'nuqta',
  name: 'Nuqta',
  ar: 'نقطة',
  tagline: 'أحادي اللون، مهمة واحدة في كل شاشة',
  rationale: 'Radical focus. Off-white paper, black ink, one vermilion dot. Every screen answers "what is next?" with a single giant block, followed by a short numbered queue. Navigation is a full-screen numbered index, not a tab bar. Heavy Alexandria type and hard borders give a confident, distraction-free tool for disciplined daily practice.',
  principles: [['Navigation', 'Full-screen numbered index / inline top nav'], ['Type', 'Alexandria (heavy) + Amiri Quran'], ['Signature', 'Giant "next" block, hard borders, one accent'], ['Kids', 'Big Blocks: Mondrian grid with huge glyphs']],
  refs: [],
  swatches: ['#f7f6f2', '#0f0f0f', '#e8432b', '#d9d6cd', '#ffffff'],
  kidsName: 'Big Blocks · مكعّبات',
  kidsTagline: 'Primary-colour blocks and enormous letters',
  kidsSwatches: ['#ffffff', '#e0301e', '#ffc400', '#1f4fd8', '#111111'],
  sample: { ui: "'Alexandria'", display: "'Alexandria'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
