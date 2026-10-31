import type { ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { I, Ornament, Q, type Concept, type Theme } from '../kit'
import { Stars } from '../kids'
import { FATIHA, KID, USER, toAr } from '../data'
import { SIX, pick, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#f3ead8', '--surface': '#fbf6ea', '--surface-2': '#e9dec5', '--ink': '#2b2118', '--muted': '#7a6a55', '--line': '#d6c6a5',
    '--accent': '#8a5a1c', '--accent-ink': '#fbf6ea', '--good': '#4e7a3a', '--warn': '#b7791f', '--bad': '#9b2c2c',
    '--font-ui': "'Noto Naskh Arabic', 'Amiri', serif", '--font-display': "'Amiri', serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(180deg,#3b2a1a,#5a3e22)', '--hero-ink': '#f3ead8',
    '--hero-art': 'repeating-conic-gradient(from 45deg at 50% 50%, rgba(243,234,216,.06) 0 25%, transparent 0 50%) 0 0/28px 28px',
  },
  tones: { a: ['#efe2c4', '#7a4a12'], b: ['#e7dccb', '#5a3e6e'], c: ['#e2e4cc', '#4e6a2a'], d: ['#f0d9cf', '#8a2f1c'], e: ['#dfe2dc', '#3e5a66'] },
  card: 'rule', btn: 'ink', head: 'serif', bar: 'serif', reader: 'page', progress: 'ledger', week: 'list', sheet: 'bottom',
}
const kids: Theme = {
  vars: {
    '--bg': '#fff2dc', '--surface': '#fffaf0', '--surface-2': '#fde4bf', '--ink': '#3d2612', '--muted': '#93704a', '--line': '#e9c48e',
    '--accent': '#e2583e', '--accent-ink': '#ffffff', '--good': '#5a9a3a', '--warn': '#f0a020', '--bad': '#d04040', '--mic': '#e2583e',
    '--font-ui': "'Reem Kufi', 'Noto Naskh Arabic', sans-serif", '--font-display': "'Reem Kufi', serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(180deg,#ffd59a,#ffb4a0)', '--hero-ink': '#3d2612',
  },
  tones: { a: ['#ffe0c2', '#a4441c'], b: ['#d9ecc8', '#3e6a22'], c: ['#d6e6f5', '#2a5a8a'], d: ['#ffd6dc', '#a42a44'], e: ['#efe0ff', '#6a3a9a'] },
  card: 'story', btn: 'chunky', head: 'round', bar: 'kid', reader: 'page', progress: 'ledger', week: 'list', sheet: 'bottom',
}

function Shell({ children }: { children: ReactNode }) {
  const { tab, desktop, sheet } = useP()
  const active = useRootTab()
  const items = pick('home', 'library', 'plans', 'revision', 'progress', 'settings')
  if (desktop)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="border-b border-(--ink) px-10 pt-5 text-center">
          <div className="flex items-center justify-between text-[12px] text-(--muted)"><span>الأربعاء ١٦ شعبان ١٤٤٦</span><button onClick={() => sheet('profiles')} className="underline-offset-4 hover:underline">{USER.name} · تبديل الملف</button></div>
          <div className="font-(family-name:--font-display) text-[40px] font-bold leading-tight">القرآن رفيقي</div>
          <Ornament className="mx-auto" />
          <nav className="mt-3 flex justify-center gap-8 border-t border-(--line) py-2.5 text-[15px]">{[...items, ...pick('khatmah', 'recite')].map((n) => <button key={n.s} onClick={() => tab(n.s)} className={`font-(family-name:--font-display) ${active === n.s ? 'font-bold text-(--accent)' : 'text-(--ink)'}`}>{n.l}</button>)}</nav>
        </header>
        <Scroll className="pt-4">{children}</Scroll>
      </div>
    )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Scroll>{children}</Scroll>
      <nav className="flex justify-around border-t-[3px] border-double border-(--ink) bg-(--bg) px-2 pb-4 pt-2">
        {items.slice(0, 5).map((n) => (
          <button key={n.s} onClick={() => tab(n.s)} className="flex flex-col items-center gap-1">
            <svg width="8" height="8" viewBox="0 0 8 8" className={active === n.s ? 'text-(--accent)' : 'text-transparent'}><path d="M4 0 8 4 4 8 0 4z" fill="currentColor" /></svg>
            <span className={`font-(family-name:--font-display) text-[15px] ${active === n.s ? 'font-bold text-(--accent)' : 'text-(--ink)'}`}>{n.l}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function Home() {
  const { go, desktop, sheet } = useP()
  const program = [['الأول', 'حفظ جديد', 'سورة الملك، الآيات ١٦ إلى ٢٠', 'memorize', '١٥ دقيقة'], ['الثاني', 'مراجعة المحفوظ', 'النبأ والنازعات وعبس', 'revision', '١٢ دقيقة'], ['الثالث', 'الورد اليومي', 'من صفحة ٢١٥ إلى ٢٣٤', 'khatmah', '٤٠ دقيقة'], ['الرابع', 'التسميع', 'الملك ١–١٥ على المعلّم الآلي', 'recite', '٦ دقائق']]
  return (
    <div className={desktop ? 'mx-auto max-w-[920px] px-10 pb-16' : 'px-5 pb-10 pt-3'}>
      {!desktop && (
        <div className="flex items-center justify-between border-b border-(--ink) pb-2 text-[12px] text-(--muted)"><span>الأربعاء ١٦ شعبان ١٤٤٦</span><button onClick={() => sheet('profiles')}>{USER.name} ▾</button></div>
      )}
      <div className={desktop ? 'grid grid-cols-[1fr_1.1fr] gap-10 pt-4' : ''}>
        <div className="pt-6 text-center">
          <div className="text-[11px] tracking-[.3em] text-(--muted)">آية اليوم</div>
          <Q className={`mt-3 block text-(--ink) ${desktop ? 'text-[40px]' : 'text-[32px]'}`}>{FATIHA.ayat[4].text}</Q>
          <div className="mt-1 text-[12px] text-(--muted)">الفاتحة · ٥</div>
          <Ornament className="mx-auto mt-4" />
          <p className="mx-auto mt-3 max-w-[300px] font-(family-name:--font-display) text-[16px] italic leading-relaxed text-(--muted)">«القليل الدائم خيرٌ من الكثير المنقطع.»</p>
        </div>
        <div>
          <h2 className="mt-8 border-b-[3px] border-double border-(--ink) pb-2 font-(family-name:--font-display) text-[26px] font-bold">برنامج اليوم</h2>
          {program.map(([n, t, d, s, m]) => (
            <button key={n} onClick={() => go(s)} className="grid w-full grid-cols-[52px_1fr_auto] items-baseline gap-3 border-b border-(--line) py-4 text-start">
              <span className="font-(family-name:--font-display) text-[15px] text-(--accent)">{n}</span>
              <span><span className="block font-(family-name:--font-display) text-[20px] font-bold leading-tight">{t}</span><span className="text-[13px] text-(--muted)">{d}</span></span>
              <span className="text-[12px] text-(--muted)">{m} ←</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 border-y border-(--ink) text-center">
        {[[toAr(USER.streak), 'يومًا متصلة'], ['٤١٢', 'آية محفوظة'], ['١٠٫٧', 'جزءًا مقروءًا']].map(([v, l], i) => <div key={l} className={`py-4 ${i < 2 ? 'border-e border-(--line)' : ''}`}><div className="font-(family-name:--font-display) text-[30px] font-bold leading-none">{v}</div><div className="mt-1 text-[12px] text-(--muted)">{l}</div></div>)}
      </div>
      <button onClick={() => go('reader', { n: 67 })} className="mt-6 w-full border border-(--ink) p-4 text-center">
        <div className="text-[11px] tracking-[.3em] text-(--muted)">العلامة</div>
        <div className="mt-1 font-(family-name:--font-display) text-[20px] font-bold">سورة الملك · صفحة ٥٦٣</div>
      </button>
    </div>
  )
}

function Scene() {
  return (
    <svg viewBox="0 0 300 120" className="h-full w-full" aria-hidden>
      <circle cx="240" cy="34" r="20" fill="#ffd166" />
      <path d="M0 90 Q60 50 120 84 T240 76 T300 80V120H0z" fill="#9ccc65" />
      <path d="M0 104 Q80 80 160 100 T300 96V120H0z" fill="#7cb342" />
      <path d="M60 86v-18M60 68c-8 0-12-6-12-12 8 0 12 6 12 12zM60 72c8 0 12-6 12-12-8 0-12 6-12 12z" stroke="#5d4037" strokeWidth="2" fill="#689f38" />
      <path d="M30 30q10-8 20 0q10-8 20 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab, desktop } = useP()
  const active = useRootTab()
  const ribbons = [{ s: 'k-home', l: 'قصتي', c: '#e2583e' }, { s: 'k-letters', l: 'الحروف', c: '#f0a020' }, { s: 'k-surahs', l: 'السور', c: '#5a9a3a' }, { s: 'k-rewards', l: 'كنزي', c: '#2a5a8a' }]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className={`flex gap-2 px-4 ${desktop ? 'justify-center' : ''}`}>
        {ribbons.map((r) => (
          <button key={r.s} onClick={() => tab(r.s)} className={`relative flex-1 pb-4 pt-2 text-center text-[14px] font-bold text-white transition ${active === r.s ? 'translate-y-0' : '-translate-y-2 opacity-80'} ${desktop ? 'max-w-[140px]' : ''}`} style={{ background: r.c, clipPath: 'polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)' }}>{r.l}</button>
        ))}
      </nav>
      <Scroll>{children}</Scroll>
    </div>
  )
}

function KidsHome() {
  const { go, st, sheet, desktop } = useP()
  const chapters = [['١', 'الحروف تتكلّم', 'k-letters', true], ['٢', 'لعبة الحركات', 'k-harakat', true], ['٣', 'حرف الخاء', 'k-letter', false], ['٤', 'الحروف تتصافح', 'k-joining', false], ['٥', 'أقرأ وحدي', 'k-reading', false], ['٦', 'سورة الفلق', 'k-listen', false]] as const
  return (
    <div className={desktop ? 'mx-auto max-w-[860px] px-8 pb-12 pt-4' : 'px-5 pb-10 pt-2'}>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-[22px] font-bold">حكاية {KID.name}</div>
        <Stars n={st.stars} />
        <button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-10 place-items-center rounded-full bg-(--surface) text-(--muted) ring-1 ring-(--line)"><I n="lock" s={17} /></button>
      </div>
      <button onClick={() => go('k-letter', { i: 6 })} className="mt-4 block w-full overflow-hidden rounded-[24px] border-2 border-dashed border-(--line) bg-(--surface) text-start">
        <div className="h-32" style={{ background: 'var(--hero)' }}><Scene /></div>
        <div className="flex items-center gap-4 p-4">
          <span className="grid size-20 shrink-0 -rotate-3 place-items-center rounded-[18px] bg-(--accent) font-(family-name:--font-quran) text-[56px] text-white shadow-[4px_4px_0_#3d2612]">خ</span>
          <div><div className="text-[12px] text-(--muted)">الفصل الثالث</div><div className="text-[22px] font-bold leading-tight">الخاء تحت الشجرة</div><p className="mt-1 text-[13px] text-(--muted)">جلست الخاء تحت الشجرة تقول: «خَ خِ خُ». هل تقولها معها؟</p></div>
        </div>
        <div className="flex items-center justify-between border-t-2 border-dashed border-(--line) px-4 py-3 text-[14px] font-bold text-(--accent)"><span>اقلب الصفحة</span><I n="arrow" s={18} /></div>
      </button>
      <div className="mt-6 text-[18px] font-bold">فصول كتابي</div>
      <div className={`mt-3 grid gap-3 ${desktop ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {chapters.map(([n, t, s, done], i) => (
          <button key={n} onClick={() => go(s, s === 'k-letter' ? { i: 6 } : s === 'k-listen' ? { n: 113 } : undefined)} className="relative flex h-32 flex-col justify-between overflow-hidden rounded-[6px_18px_18px_6px] p-3 text-start text-white shadow-[inset_8px_0_0_rgba(0,0,0,.15)]" style={{ background: ['#e2583e', '#f0a020', '#5a9a3a', '#2a5a8a', '#8a4ab0', '#c0407a'][i] }}>
            <span className="text-[34px] font-bold leading-none opacity-90">{n}</span>
            <span className="text-[15px] font-bold leading-tight">{t}</span>
            {done && <I n="star" s={18} fill className="absolute end-2 top-2 text-[#ffe08a]" />}
          </button>
        ))}
      </div>
      <div className="mt-5 text-center"><button onClick={() => go(SIX[5].s)} className="text-[14px] font-bold text-(--accent) underline underline-offset-4">صندوق كنزي ←</button></div>
    </div>
  )
}

export const makhtut: Concept = {
  id: 'makhtut',
  name: 'Makhtut',
  ar: 'مخطوط',
  tagline: 'دفتر مخطوط: ورق، حبر، وزخرفة هادئة',
  rationale: 'An editorial manuscript direction. Parchment, ink and burnished gold; serif Amiri headings; thin rules instead of cards; text-only navigation with a small diamond marker. The reader is a full mushaf page in a double-ruled frame. It treats the app as a beautiful book rather than a dashboard, prioritising reverence and reading over metrics.',
  principles: [['Navigation', 'Text-only tab row / newspaper masthead'], ['Type', 'Amiri + Noto Naskh + Amiri Quran'], ['Signature', 'Ruled lists, framed mushaf page, ornaments'], ['Kids', 'Storybook: chapters, illustrated scenes, ribbon tabs']],
  refs: ['r01'],
  swatches: ['#f3ead8', '#2b2118', '#8a5a1c', '#d6c6a5', '#9b2c2c'],
  kidsName: 'Storybook · حكايات الحروف',
  kidsTagline: 'Each lesson is a chapter in an illustrated book',
  kidsSwatches: ['#fff2dc', '#e2583e', '#f0a020', '#5a9a3a', '#2a5a8a'],
  sample: { ui: "'Noto Naskh Arabic'", display: "'Amiri'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
