import type { ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { Bar, Btn, Card, I, Q, Section, type Concept, type Theme } from '../kit'
import { WeekView } from '../parts'
import { Stars } from '../kids'
import { KID, SHORT, USER, toAr } from '../data'
import { KNAV, SIX, pick, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#eef2f5', '--surface': '#ffffff', '--surface-2': '#f1f4f7', '--ink': '#111a15', '--muted': '#6b7682', '--line': '#e2e7ec',
    '--accent': '#2f7d4f', '--accent-ink': '#ffffff', '--good': '#2f9e5b', '--warn': '#e0a42a', '--bad': '#d9534f',
    '--font-ui': "'IBM Plex Sans Arabic', system-ui, sans-serif", '--font-display': "'IBM Plex Sans Arabic', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(180deg,#2c5a3c 0%,#5f8f6c 60%,#cfe0d4 100%)', '--hero-ink': '#ffffff',
    '--hero-art': 'radial-gradient(circle at 80% 20%, rgba(255,255,255,.35), transparent 40%)',
  },
  tones: { a: ['#e3f1e7', '#2f7d4f'], b: ['#ebe8fb', '#5b4fc4'], c: ['#fdeedd', '#b9651c'], d: ['#fde7ec', '#c23a5b'], e: ['#e0f0fb', '#2a7bb6'] },
  card: 'soft', btn: 'pill', head: 'plain', bar: 'soft', reader: 'cards', progress: 'rings', week: 'chips', sheet: 'bottom',
}
const kids: Theme = {
  vars: {
    '--bg': '#fff7e6', '--surface': '#ffffff', '--surface-2': '#fdeccc', '--ink': '#3a2a10', '--muted': '#8a7550', '--line': '#f3dcae',
    '--accent': '#16a36f', '--accent-ink': '#ffffff', '--good': '#16a36f', '--warn': '#ffb300', '--bad': '#ef5350', '--mic': '#ff7a45',
    '--font-ui': "'Baloo Bhaijaan 2', 'IBM Plex Sans Arabic', sans-serif", '--font-display': "'Baloo Bhaijaan 2', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(160deg,#3cc48f,#16a36f)', '--hero-ink': '#fff',
  },
  tones: { a: ['#d8f5e7', '#0f7a52'], b: ['#ffe3d3', '#c2410c'], c: ['#e3e9ff', '#3949ab'], d: ['#fff1c2', '#8a5a00'], e: ['#fde0ef', '#ad1457'] },
  card: 'bubble', btn: 'chunky', head: 'round', bar: 'kid', reader: 'cards', progress: 'rings', week: 'chips', sheet: 'bottom',
}

function Book() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full drop-shadow-[0_14px_18px_rgba(0,0,0,.25)]" aria-hidden>
      <path d="M30 104 80 82l50 22-8 6-42-17-42 17z" fill="#b8742f" />
      <path d="M36 98 80 78l44 20" stroke="#8d5520" strokeWidth="4" fill="none" />
      <path d="M80 30C64 20 40 18 22 24v58c18-6 42-4 58 6z" fill="#fff9ee" stroke="#d6a25a" strokeWidth="2" />
      <path d="M80 30c16-10 40-12 58-6v58c-18-6-42-4-58 6z" fill="#fff4e0" stroke="#d6a25a" strokeWidth="2" />
      <path d="M80 30v58" stroke="#d6a25a" strokeWidth="2" />
      <path d="M34 40c12-3 28-2 38 3M34 50c12-3 28-2 38 3M34 60c12-3 28-2 38 3M88 43c10-5 26-6 38-3M88 53c10-5 26-6 38-3M88 63c10-5 26-6 38-3" stroke="#e8c48c" strokeWidth="2" strokeLinecap="round" />
      <path d="M92 18h12v26l-6-5-6 5z" fill="#f59e0b" />
    </svg>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { tab, desktop, sheet } = useP()
  const active = useRootTab()
  const items = pick('home', 'library', 'plans', 'recite', 'progress')
  if (desktop)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-4 px-8 py-4">
          <div className="flex items-center gap-2 text-[17px] font-bold"><span className="grid size-9 place-items-center rounded-[12px] bg-(--accent) text-white"><I n="book" s={18} /></span>القرآن رفيقي</div>
          <nav className="mx-auto flex gap-1 rounded-full bg-(--surface) p-1 shadow-sm ring-1 ring-(--line)">
            {[...items, ...pick('revision', 'khatmah')].map((n) => <button key={n.s} onClick={() => tab(n.s)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ${active === n.s ? 'bg-(--ink) text-white' : 'text-(--muted)'}`}><I n={n.ic} s={16} />{n.l}</button>)}
          </nav>
          <button onClick={() => tab('settings')} className="grid size-10 place-items-center rounded-full bg-(--surface) ring-1 ring-(--line)" aria-label="الإعدادات"><I n="settings" s={18} /></button>
          <button onClick={() => sheet('profiles')} className="grid size-10 place-items-center rounded-full bg-(--accent) font-bold text-white" aria-label="الملفات">أ</button>
        </header>
        <Scroll>{children}</Scroll>
      </div>
    )
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroll className="pb-24">{children}</Scroll>
      <nav className="absolute inset-x-0 bottom-4 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_12px_30px_-10px_rgba(16,24,40,.35)] ring-1 ring-black/5 backdrop-blur">
          {items.map((n) => (
            <button key={n.s} onClick={() => tab(n.s)} aria-label={n.l} className={`flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition ${active === n.s ? 'bg-(--ink) text-white' : 'text-(--muted)'}`}>
              <I n={n.ic} s={19} />{active === n.s && n.l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Home() {
  const { go, desktop, sheet } = useP()
  const tiles = [['sprout', 'الحفظ', 'memorize', '#e3f1e7', '#2f7d4f'], ['repeat', 'المراجعة', 'revision', '#ebe8fb', '#5b4fc4'], ['book', 'الورد', 'khatmah', '#fdeedd', '#b9651c'], ['mic', 'التسميع', 'recite', '#e0f0fb', '#2a7bb6']]
  return (
    <div>
      <div className="relative overflow-hidden px-5 pb-16 pt-4 text-white" style={{ background: 'var(--hero)' }}>
        <div className={`flex items-center justify-between ${desktop ? 'mx-auto max-w-[1040px]' : ''}`}>
          <button onClick={() => sheet('profiles')} className="flex items-center gap-2 text-[13px] font-medium"><span className="grid size-8 place-items-center rounded-full bg-white/20">أ</span>السلام عليكم، {USER.name}<I n="chevronDown" s={15} /></button>
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-bold text-(--accent)"><I n="flame" s={14} />{toAr(USER.streak)} يومًا</span>
        </div>
        <div className={`mt-5 flex items-center gap-2 ${desktop ? 'mx-auto max-w-[1040px]' : ''}`}>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[12px] opacity-85"><I n="calendar" s={14} />ختمة رمضان · اليوم ١١</div>
            <h1 className={`mt-2 font-semibold leading-[1.25] ${desktop ? 'text-[36px]' : 'text-[25px]'}`}>واصل همّتك<br />نحو الختام!</h1>
          </div>
          <div className={desktop ? 'h-40 w-52' : 'h-28 w-36'}><Book /></div>
        </div>
        <div className={desktop ? 'mx-auto max-w-[1040px]' : ''}><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/30"><div className="h-full w-[35%] rounded-full bg-white" /></div><div className="mt-1.5 flex justify-between text-[11px] opacity-85"><span>١٠ من ٣٠ جزءًا</span><span>٣٥٪</span></div></div>
      </div>
      <div className={`relative -mt-10 ${desktop ? 'mx-auto max-w-[1040px] px-8 pb-16' : 'px-5 pb-10'}`}>
        <Card>
          <div className="grid grid-cols-4 gap-2">
            {tiles.map(([ic, l, s, bg, fg]) => (
              <button key={l} onClick={() => go(s)} className="flex flex-col items-center gap-2">
                <span className="grid size-14 place-items-center rounded-[18px] shadow-[inset_0_-3px_0_rgba(0,0,0,.06),0_6px_14px_-8px_rgba(0,0,0,.25)]" style={{ background: bg, color: fg }}><I n={ic} s={24} /></span>
                <span className="text-[12px] font-semibold text-(--ink)">{l}</span>
              </button>
            ))}
          </div>
        </Card>
        <div className={desktop ? 'grid grid-cols-2 gap-6' : ''}>
          <Section title="تابع">
            <Card>
              <div className="flex items-center justify-between"><span className="text-[15px] font-semibold text-(--ink)">الملك: ١٦</span><Q className="text-[22px] leading-none text-(--ink)">ٱلْمُلْك</Q></div>
              <p className="mt-1 text-[12px] text-(--muted)">حفظ ٥ آيات · ١٥ دقيقة</p>
              <Bar v={0.3} className="mt-3" />
              <Btn kind="soft" full className="mt-4" onClick={() => go('memorize')}>ابدأ <I n="arrow" s={16} /></Btn>
            </Card>
          </Section>
          <Section title="المواظبة" action={<span className="rounded-full bg-[#fff3d6] px-2.5 py-0.5 text-[12px] font-bold text-[#b7791f]">{toAr(USER.streak)}×</span>}>
            <Card><WeekView /></Card>
          </Section>
        </div>
        <Section title="من محفوظك" action={<button onClick={() => go('revision')} className="flex items-center gap-1 text-[12px] font-semibold text-(--accent)">الكل<I n="chevron" s={14} className="rotate-180" /></button>}>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 no-scrollbar">
            {SHORT.map((s) => (
              <Card key={s.sura} onClick={() => go('reader', { n: s.sura })} className="!w-40 shrink-0">
                <Q className="block text-center text-[26px] leading-[1.7] text-(--ink)">{s.name}</Q>
                <div className="mt-1 flex items-center justify-between text-[11px] text-(--muted)"><span>{toAr(s.ayat.length)} آيات</span><span className="size-2 rounded-full bg-(--good)" /></div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab, desktop } = useP()
  const active = useRootTab()
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroll className={desktop ? 'pb-28' : 'pb-28'}>{children}</Scroll>
      <nav className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-(--bg) via-(--bg) to-transparent px-4 pb-4 pt-6">
        {KNAV.map((n, i) => (
          <button key={n.s} onClick={() => tab(n.s)} className={`flex flex-col items-center gap-1 ${desktop ? 'w-24' : 'w-[70px]'}`}>
            <span className={`grid size-14 place-items-center rounded-full border-b-4 transition ${active === n.s ? 'scale-110 border-black/20 text-white' : 'border-black/10 bg-white text-(--muted)'}`} style={active === n.s ? { background: ['#16a36f', '#ff7a45', '#3949ab', '#ffb300'][i] } : undefined}><I n={n.ic} s={24} /></span>
            <span className={`text-[12px] font-bold ${active === n.s ? 'text-(--ink)' : 'text-(--muted)'}`}>{n.l}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function KidsHome() {
  const { go, st, sheet, desktop } = useP()
  const colors = [['#d8f5e7', '#0f7a52'], ['#ffe3d3', '#c2410c'], ['#e3e9ff', '#3949ab'], ['#fff1c2', '#8a5a00'], ['#fde0ef', '#ad1457'], ['#e0f7fa', '#00838f']]
  return (
    <div className={desktop ? 'mx-auto max-w-[960px] px-8 pt-6' : 'px-5 pt-3'}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full border-b-4 border-black/10 bg-[#ffd166] text-[22px] font-extrabold text-[#7a4a00]">م</span>
        <div className="flex-1"><div className="text-[13px] text-(--muted)">أهلًا يا</div><div className="text-[22px] font-extrabold leading-none">{KID.name}!</div></div>
        <Stars n={st.stars} />
        <button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-10 place-items-center rounded-full bg-white text-(--muted) ring-1 ring-(--line)"><I n="lock" s={17} /></button>
      </div>
      <button onClick={() => go('k-letter', { i: 6 })} className="relative mt-5 w-full overflow-hidden rounded-[30px] border-b-[6px] border-black/15 p-5 text-start text-white" style={{ background: 'var(--hero)' }}>
        <div className="absolute -start-6 -top-6 size-28 rounded-full bg-white/15" /><div className="absolute -bottom-10 end-20 size-24 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex-1"><div className="text-[13px] font-bold opacity-90">مغامرة اليوم</div><div className="mt-1 text-[26px] font-extrabold leading-tight">حرف الخاء</div><div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-extrabold text-(--accent)"><I n="play" s={14} fill />هيا نبدأ</div></div>
          <span className="grid size-28 place-items-center rounded-[28px] bg-white/95 font-(family-name:--font-quran) text-[76px] leading-none text-(--accent)">خ</span>
        </div>
      </button>
      <div className={`mt-5 grid gap-3 ${desktop ? 'grid-cols-6' : 'grid-cols-3'}`}>
        {SIX.map((a, i) => (
          <button key={a.s} onClick={() => go(a.s)} className="flex flex-col items-center gap-2 rounded-[26px] border-b-[5px] border-black/10 px-2 py-4 transition active:translate-y-0.5" style={{ background: colors[i][0], color: colors[i][1] }}>
            <I n={a.ic} s={30} /><span className="text-[14px] font-extrabold">{a.l}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-[26px] border-2 border-(--line) border-b-[6px] bg-white p-4">
        <div className="flex items-center justify-between"><span className="text-[15px] font-extrabold">طريقي إلى الملصق</span><span className="text-[13px] font-bold text-(--warn)">{toAr(st.stars % 10)}/١٠</span></div>
        <div className="mt-3 flex gap-1.5">{Array.from({ length: 10 }, (_, i) => <span key={i} className={`grid h-8 flex-1 place-items-center rounded-full ${i < st.stars % 10 ? 'bg-(--warn) text-white' : 'bg-(--surface-2)'}`}>{i < st.stars % 10 && <I n="star" s={14} fill />}</span>)}</div>
      </div>
    </div>
  )
}

export const sakina: Concept = {
  id: 'sakina',
  name: 'Sakina',
  ar: 'سكينة',
  tagline: 'هادئ، ناعم، يشبه تطبيقات النظام الحديثة',
  rationale: 'Calm, airy, glass-soft. A green dawn gradient opens each day, white rounded cards float on cool grey, and a floating pill dock keeps navigation out of the way. Ayah cards pair the Uthmani text with a simplified meaning, mirroring the Khatam/Iqraa references.',
  principles: [['Navigation', 'Floating pill dock / top pill bar'], ['Type', 'IBM Plex Sans Arabic + Amiri Quran'], ['Signature', 'Dawn gradient hero, 3D book, ayah cards'], ['Kids', 'Bubbles: chunky 3D buttons, sunshine palette']],
  refs: ['r01', 'r03'],
  swatches: ['#2c5a3c', '#2f7d4f', '#eef2f5', '#ffffff', '#111a15'],
  kidsName: 'Fuqa\'at · فقاعات',
  kidsTagline: 'Sunshine bubbles with chunky tactile buttons',
  kidsSwatches: ['#fff7e6', '#16a36f', '#ff7a45', '#ffb300', '#3949ab'],
  sample: { ui: "'IBM Plex Sans Arabic'", display: "'IBM Plex Sans Arabic'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
