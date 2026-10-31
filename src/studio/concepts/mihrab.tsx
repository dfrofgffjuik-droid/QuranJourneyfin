import type { ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { Btn, Card, I, Q, Section, type Concept, type Theme } from '../kit'
import { Stars } from '../kids'
import { KID, RESULT, USER, toAr } from '../data'
import { SIX, pick, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#0b0c11', '--surface': '#15161d', '--surface-2': '#22232c', '--ink': '#f2f3f7', '--muted': '#8b8fa1', '--line': '#2a2c36',
    '--accent': '#19b5a5', '--accent-ink': '#04120f', '--mic': '#7c5cff', '--good': '#3ddc84', '--warn': '#f5c542', '--bad': '#ff6b6b',
    '--font-ui': "'Readex Pro', 'IBM Plex Sans Arabic', sans-serif", '--font-display': "'Readex Pro', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(160deg,#118a8f 0%,#0b5560 55%,#0d2a30 100%)', '--hero-ink': '#ffffff',
    '--hero-art': 'radial-gradient(circle at 50% 30%, rgba(255,255,255,.18), transparent 45%)',
  },
  tones: { a: ['#103a36', '#3fe0cf'], b: ['#2a2150', '#b9a6ff'], c: ['#3a2e12', '#f5c542'], d: ['#3a1a22', '#ff8fa3'], e: ['#132a45', '#7cc4ff'] },
  card: 'glow', btn: 'glow', head: 'plain', bar: 'dark', reader: 'focus', progress: 'bars', week: 'timeline', sheet: 'center', dark: true,
}
const kids: Theme = {
  vars: {
    '--bg': '#130e2c', '--surface': '#1f1846', '--surface-2': '#2c2460', '--ink': '#fdfbff', '--muted': '#b2a8e0', '--line': '#3a3175',
    '--accent': '#ffcf4a', '--accent-ink': '#2a1a00', '--mic': '#7c5cff', '--good': '#4ade80', '--warn': '#ffcf4a', '--bad': '#ff7a90',
    '--font-ui': "'Lemonada', 'Readex Pro', sans-serif", '--font-display': "'Lemonada', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(160deg,#7c5cff,#3b1f9e)', '--hero-ink': '#fff',
  },
  tones: { a: ['#3b2a8a', '#ffe58f'], b: ['#0f4a5a', '#7ff5e4'], c: ['#5a1f5e', '#ffb3f0'], d: ['#5a3a0f', '#ffd27a'], e: ['#1f3f7a', '#a8d1ff'] },
  card: 'neon', btn: 'glow', head: 'round', bar: 'kid', reader: 'focus', progress: 'bars', week: 'timeline', sheet: 'bottom', dark: true,
}

function Shell({ children }: { children: ReactNode }) {
  const { tab, desktop, go, sheet } = useP()
  const active = useRootTab()
  if (desktop) {
    const items = pick('home', 'library', 'plans', 'revision', 'khatmah', 'progress', 'settings')
    return (
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[84px] flex-col items-center gap-2 border-e border-(--line) bg-(--surface) py-5">
          <button onClick={() => sheet('profiles')} className="mb-2 grid size-11 place-items-center rounded-full bg-gradient-to-br from-(--accent) to-(--mic) font-bold text-white">أ</button>
          <button onClick={() => go('recite')} aria-label="التسميع" className="mb-3 grid size-14 place-items-center rounded-full bg-(--mic) text-white shadow-[0_0_30px_-4px_var(--mic)]"><I n="mic" s={24} /></button>
          {items.map((n) => <button key={n.s} onClick={() => tab(n.s)} title={n.l} className={`flex w-16 flex-col items-center gap-1 rounded-[14px] py-2 text-[10.5px] ${active === n.s ? 'bg-white/[.07] text-(--accent)' : 'text-(--muted)'}`}><I n={n.ic} s={20} />{n.l}</button>)}
        </aside>
        <div className="flex min-h-0 flex-1 flex-col"><Scroll className="pt-4">{children}</Scroll></div>
      </div>
    )
  }
  const left = pick('home', 'library')
  const right = pick('plans', 'progress')
  const Item = ({ n }: { n: (typeof left)[number] }) => <button onClick={() => tab(n.s)} className={`flex flex-1 flex-col items-center gap-1 text-[10.5px] ${active === n.s ? 'text-(--accent)' : 'text-(--muted)'}`}><I n={n.ic} s={21} />{n.l}</button>
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroll className="pb-24">{children}</Scroll>
      <nav className="absolute inset-x-0 bottom-0 flex items-end border-t border-white/5 bg-(--bg)/95 px-3 pb-4 pt-2 backdrop-blur">
        {left.map((n) => <Item key={n.s} n={n} />)}
        <div className="flex flex-1 justify-center"><button onClick={() => go('recite')} aria-label="التسميع" className="-mt-9 grid size-[66px] place-items-center rounded-full bg-(--mic) text-white ring-[6px] ring-(--bg)" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,.08), 0 0 40px -4px var(--mic)' }}><I n="mic" s={28} /></button></div>
        {right.map((n) => <Item key={n.s} n={n} />)}
      </nav>
    </div>
  )
}

function Home() {
  const { go, desktop, sheet } = useP()
  const col = (s: number) => (s === 0 ? '#3ddc84' : s === 1 ? '#f5c542' : '#ff6b6b')
  const steps = [['الخطوة ١', 'استمع', 'الملك ١٦–٢٠ بصوت الحصري', 'ear', 'memorize'], ['الخطوة ٢', 'سمّع', 'سجّل تلاوتك من حفظك', 'mic', 'recite'], ['الخطوة ٣', 'راجع', '٣ مقاطع مستحقة اليوم', 'repeat', 'revision']]
  return (
    <div className={desktop ? 'mx-auto max-w-[1040px] px-8 pb-16' : 'px-5 pb-10 pt-2'}>
      <div className="flex items-center gap-3">
        <button onClick={() => sheet('profiles')} className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-(--accent) to-(--mic) font-bold text-white">أ</button>
        <div className="flex-1"><div className="text-[12px] text-(--muted)">مساء النور</div><div className="text-[18px] font-semibold">{USER.name}</div></div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-1.5 text-[13px] font-semibold"><I n="flame" s={15} className="text-(--warn)" />{toAr(USER.streak)}</span>
      </div>
      <div className={desktop ? 'mt-6 grid grid-cols-[1.2fr_1fr] gap-6' : ''}>
        <button onClick={() => go('recite')} className="relative mt-5 block w-full overflow-hidden rounded-[28px] p-5 text-center" style={{ background: 'var(--hero)' }}>
          <div className="absolute inset-0" style={{ background: 'var(--hero-art)' }} />
          <div className="relative">
            <div className="mx-auto grid size-12 place-items-center rounded-[16px] bg-white/10 text-white/80"><I n="book" /></div>
            <div className="mt-2 text-[20px] font-bold text-white/90">آخر تسميع · ٨٨٪</div>
            <div className="mt-3 flex justify-center gap-1.5 text-[11px] text-white">{[['صحيح', '#3ddc84'], ['قريب', '#f5c542'], ['خطأ', '#ff6b6b']].map(([l, c]) => <span key={l} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><span className="size-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
            <p className="mt-3 leading-[2.1]">{RESULT.slice(1, 4).map((a) => a.words.map((w, i) => <Q key={a.aya + '-' + i} className="mx-1 text-[24px]"><span style={{ color: col(w.s) }}>{w.w}</span></Q>))}</p>
          </div>
        </button>
        <Section title="جلسة اليوم" className={desktop ? '!mt-5' : ''}>
          <div className="space-y-2.5">
            {steps.map(([st, t, d, ic, s], i) => (
              <Card key={st} onClick={() => go(s)} className={i === 0 ? '!ring-1 !ring-(--accent)/50' : ''}>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-white/[.05] text-(--accent)"><I n={ic} /></span>
                  <div className="flex-1"><span className="rounded-full bg-gradient-to-l from-[#19b5a5] to-[#7c5cff] px-2.5 py-0.5 text-[10.5px] font-bold text-white">{st}</span><div className="mt-1.5 text-[15px] font-semibold">{t}</div><div className="text-[12px] text-(--muted)">{d}</div></div>
                  <I n="chevron" s={18} className="rotate-180 text-(--muted)" />
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
      <div className={`mt-6 grid gap-2.5 ${desktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {[['الورد', '١٠ صفحات', 'khatmah', 'book'], ['المصحف', 'الملك · ١٦', 'library', 'bookmark'], ['الخطط', '٥ خطط نشطة', 'plans', 'calendar'], ['رحلتي', '٤١٢ آية', 'progress', 'path']].map(([t, d, s, ic]) => (
          <Card key={t} onClick={() => go(s)}><I n={ic} className="text-(--muted)" /><div className="mt-3 text-[15px] font-semibold">{t}</div><div className="text-[12px] text-(--muted)">{d}</div></Card>
        ))}
      </div>
      <Btn full size="lg" className="mt-6" onClick={() => go('memorize')}><I n="play" s={18} fill />ابدأ جلسة اليوم</Btn>
    </div>
  )
}

function Sky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => <span key={i} className="absolute rounded-full bg-white" style={{ width: (i % 3) + 1, height: (i % 3) + 1, top: `${(i * 37) % 100}%`, left: `${(i * 61) % 100}%`, opacity: 0.25 + ((i * 13) % 50) / 100 }} />)}
    </div>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab } = useP()
  const active = useRootTab()
  const items = [{ s: 'k-home', ic: 'home', l: 'السماء' }, { s: 'k-letters', ic: 'mic', l: 'أصوات', big: true }, { s: 'k-rewards', ic: 'star', l: 'نجومي' }]
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Sky />
      <Scroll className="relative pb-28">{children}</Scroll>
      <nav className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-8 px-6 pb-5 pt-3">
        {items.map((n) => (
          <button key={n.s} onClick={() => tab(n.s)} className="flex flex-col items-center gap-1 text-[12px] font-bold">
            <span className={`grid place-items-center rounded-full ${n.big ? 'size-[72px] bg-(--mic) text-white shadow-[0_0_40px_-4px_var(--mic)]' : 'size-14 bg-(--surface) ring-1 ring-white/10'} ${active === n.s && !n.big ? 'text-(--accent) shadow-[0_0_24px_-6px_var(--accent)]' : n.big ? '' : 'text-(--muted)'}`}><I n={n.ic} s={n.big ? 30 : 24} fill={n.ic === 'star' && active === n.s} /></span>
            <span className={active === n.s ? 'text-(--accent)' : 'text-(--muted)'}>{n.l}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function KidsHome() {
  const { go, st, sheet, desktop } = useP()
  const planets = [
    { ...SIX[0], x: 72, y: 6, r: 92, c: '#ffcf4a' },
    { ...SIX[1], x: 18, y: 22, r: 74, c: '#7ff5e4' },
    { ...SIX[2], x: 64, y: 40, r: 70, c: '#ff9ad5' },
    { ...SIX[3], x: 14, y: 56, r: 80, c: '#a8d1ff' },
    { ...SIX[4], x: 62, y: 72, r: 86, c: '#b9a6ff' },
  ]
  return (
    <div className={desktop ? 'mx-auto max-w-[760px] px-8 pt-6' : 'px-5 pt-3'}>
      <div className="relative flex items-center gap-3">
        <div className="flex-1"><div className="text-[13px] text-(--muted)">مرحبًا أيتها المستكشفة</div><div className="text-[24px] font-bold leading-tight">{KID.name}</div></div>
        <Stars n={st.stars} className="!bg-(--surface) !ring-white/10" />
        <button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-10 place-items-center rounded-full bg-(--surface) text-(--muted) ring-1 ring-white/10"><I n="lock" s={17} /></button>
      </div>
      <div className="relative mt-4 h-[520px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path d="M78 14 C 40 18, 30 24, 26 32 S 70 40, 70 48 S 20 58, 22 64 S 64 74, 68 80" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth=".5" strokeDasharray="1.5 1.5" /></svg>
        {planets.map((p, i) => (
          <button key={p.s} onClick={() => go(p.s)} className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className={`relative grid place-items-center rounded-full text-[#1a1240] ${i === 0 ? 'animate-[pulse_2.4s_ease-in-out_infinite]' : ''}`} style={{ width: p.r, height: p.r, background: `radial-gradient(circle at 35% 30%, #fff8, ${p.c} 45%, ${p.c}aa)`, boxShadow: `0 0 40px -6px ${p.c}` }}>
              <I n={p.ic} s={p.r / 2.8} />
              {i === 0 && <span className="absolute -inset-2 rounded-full border border-dashed border-white/40" />}
            </span>
            <span className="text-[13px] font-bold">{p.l}</span>
            {i === 0 && <span className="rounded-full bg-(--accent) px-2 py-0.5 text-[10px] font-bold text-(--accent-ink)">أنتِ هنا</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export const mihrab: Concept = {
  id: 'mihrab',
  name: 'Mihrab Night',
  ar: 'محراب',
  tagline: 'استوديو تلاوة ليلي، الصوت في المركز',
  rationale: 'A dark recitation studio where the microphone is the hero. A glowing violet mic sits at the centre of navigation, and sessions run as numbered steps with coach marks. Feedback appears as green / amber / red words, borrowed from the AI-feedback and alphabet references. The reader shows one ayah at a time so the eye rests and the ear leads.',
  principles: [['Navigation', 'Bottom bar with raised mic / icon rail'], ['Type', 'Readex Pro + Amiri Quran'], ['Signature', 'Colour-coded tasmee\', step coach marks, focus reader'], ['Kids', 'Star Explorers: planets as lessons, neon glow']],
  refs: ['r04', 'r05', 'r07', 'r10'],
  swatches: ['#0b0c11', '#15161d', '#19b5a5', '#7c5cff', '#f5c542'],
  kidsName: 'Star Explorers · مستكشفو النجوم',
  kidsTagline: 'A night-sky map where every lesson is a planet',
  kidsSwatches: ['#130e2c', '#7c5cff', '#ffcf4a', '#7ff5e4', '#ff9ad5'],
  sample: { ui: "'Readex Pro'", display: "'Readex Pro'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
