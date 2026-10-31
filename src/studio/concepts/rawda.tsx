import type { ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { Btn, Card, I, Section, type Concept, type Theme } from '../kit'
import { Plant } from '../parts'
import { Stars } from '../kids'
import { KID, REVISION, SURAHS, USER, toAr } from '../data'
import { NAV, SIX, pick, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#f2ede1', '--surface': '#fbf8f0', '--surface-2': '#e7e0cd', '--ink': '#27301c', '--muted': '#707a5e', '--line': '#ddd4bd',
    '--accent': '#5f7a2e', '--accent-ink': '#ffffff', '--good': '#5f9a3a', '--warn': '#d08a2e', '--bad': '#c0573b',
    '--font-ui': "'Cairo', 'IBM Plex Sans Arabic', sans-serif", '--font-display': "'El Messiri', 'Cairo', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(170deg,#7d9a48 0%,#4f6a28 70%,#3d521e 100%)', '--hero-ink': '#fbf8f0',
    '--hero-art': 'radial-gradient(circle at 85% 15%, rgba(255,230,150,.55), transparent 22%)',
  },
  tones: { a: ['#e4ebcf', '#4f6a28'], b: ['#f3e0cc', '#a0522d'], c: ['#e9e3c6', '#7a6a1c'], d: ['#f1d9d0', '#a5452c'], e: ['#dbe6e0', '#3f6a5a'] },
  card: 'organic', btn: 'organic', head: 'round', bar: 'organic', reader: 'page', progress: 'garden', week: 'timeline', sheet: 'bottom',
}
const kids: Theme = {
  vars: {
    '--bg': '#eaf6d9', '--surface': '#ffffff', '--surface-2': '#d7ecbc', '--ink': '#24401a', '--muted': '#5e7a4e', '--line': '#c3e0a0',
    '--accent': '#ff8a3d', '--accent-ink': '#ffffff', '--good': '#43a047', '--warn': '#ffb300', '--bad': '#e53935', '--mic': '#43a047',
    '--font-ui': "'Cairo', sans-serif", '--font-display': "'Lalezar', 'Cairo', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(180deg,#9be15d,#43a047)', '--hero-ink': '#fff',
  },
  tones: { a: ['#fff0d6', '#c25e00'], b: ['#d7f0ff', '#0b6aa2'], c: ['#ffe0e6', '#c2185b'], d: ['#e8f5c8', '#3d6b12'], e: ['#efe3ff', '#6a3ab0'] },
  card: 'leaf', btn: 'chunky', head: 'round', bar: 'kid', reader: 'page', progress: 'garden', week: 'timeline', sheet: 'bottom',
}

function Shell({ children }: { children: ReactNode }) {
  const { tab, desktop, st, patch, sheet } = useP()
  const active = useRootTab()
  if (desktop)
    return (
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[210px] shrink-0 flex-col gap-1 bg-(--accent) p-4 text-white">
          <div className="mb-4 flex items-center gap-2 font-(family-name:--font-display) text-[22px]"><I n="leaf" />روضة</div>
          {NAV.map((n) => <button key={n.s} onClick={() => tab(n.s)} className={`flex items-center gap-2.5 rounded-[16px_4px_16px_4px] px-3 py-2.5 text-[14px] ${active === n.s ? 'bg-white text-(--accent)' : 'text-white/80 hover:bg-white/10'}`}><I n={n.ic} s={18} />{n.l}</button>)}
          <button onClick={() => sheet('profiles')} className="mt-auto flex items-center gap-2 rounded-[16px] bg-white/10 p-2.5 text-[13px]"><span className="grid size-8 place-items-center rounded-full bg-white text-(--accent)">أ</span>{USER.name}</button>
        </aside>
        <div className="flex min-h-0 flex-1 flex-col"><Scroll className="pt-4">{children}</Scroll></div>
      </div>
    )
  const side = pick('home', 'progress')
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroll className="pb-24">{children}</Scroll>
      <nav className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-[30px_10px_30px_10px] bg-(--ink) px-6 py-2 text-white shadow-xl">
        <button onClick={() => tab(side[0].s)} className={`flex flex-col items-center text-[10.5px] ${active === 'home' ? 'text-[#d8e7a6]' : 'text-white/60'}`}><I n="leaf" s={21} />حديقتي</button>
        <button onClick={() => patch({ menu: true })} aria-label="كل الأقسام" className="-mt-8 grid size-16 place-items-center rounded-full bg-(--accent) ring-[5px] ring-(--bg)"><I n="sprout" s={28} /></button>
        <button onClick={() => tab(side[1].s)} className={`flex flex-col items-center text-[10.5px] ${active === 'progress' ? 'text-[#d8e7a6]' : 'text-white/60'}`}><I n="path" s={21} />رحلتي</button>
      </nav>
      {st.menu && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/40" onClick={() => patch({ menu: false })}>
          <div className="rise w-full rounded-t-[36px] bg-(--bg) p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center font-(family-name:--font-display) text-[20px]">إلى أين في الروضة؟</div>
            <div className="grid grid-cols-4 gap-3">
              {NAV.map((n, i) => <button key={n.s} onClick={() => tab(n.s)} className="flex flex-col items-center gap-1.5"><span className={`grid size-14 place-items-center rounded-[20px_6px_20px_6px] ${active === n.s ? 'bg-(--accent) text-white' : 'bg-(--surface-2) text-(--ink)'}`} style={{ transform: `rotate(${(i % 3) * 3 - 3}deg)` }}><I n={n.ic} /></span><span className="text-[12px]">{n.l}</span></button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Home() {
  const { go, desktop, sheet } = useP()
  const plot = SURAHS.slice(77, 114)
  const thirsty = REVISION.filter((r) => r.strength < 0.65)
  return (
    <div>
      <div className="relative overflow-hidden px-5 pb-8 pt-4 text-(--hero-ink)" style={{ background: 'var(--hero)' }}>
        <div className="absolute inset-0" style={{ background: 'var(--hero-art)' }} />
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full" aria-hidden><path d="M0 40 Q100 0 200 30 T400 20V60H0z" fill="var(--bg)" /></svg>
        <div className={`relative ${desktop ? 'mx-auto max-w-[980px]' : ''}`}>
          <div className="flex items-center justify-between"><button onClick={() => sheet('profiles')} className="text-[13px] opacity-90">حديقة {USER.name} ▾</button><span className="rounded-full bg-white/15 px-3 py-1 text-[12px]">الموسم: جزء تبارك</span></div>
          <h1 className="mt-4 font-(family-name:--font-display) text-[30px] leading-tight">نمت حديقتك ٣ شجيرات هذا الأسبوع</h1>
          <p className="mt-1 text-[13px] opacity-85">كل سورة تحفظها تُزرع، وكل مراجعة تسقيها.</p>
        </div>
      </div>
      <div className={desktop ? 'mx-auto max-w-[980px] px-8 pb-16' : 'px-5 pb-10'}>
        <Card>
          <div className="flex items-center justify-between"><span className="font-(family-name:--font-display) text-[18px]">بستان جزء عمّ</span><span className="text-[12px] text-(--muted)">٣٧ غرسة</span></div>
          <div className="mt-3 grid gap-x-1 gap-y-2" style={{ gridTemplateColumns: `repeat(${desktop ? 13 : 8}, minmax(0,1fr))` }}>
            {plot.map((s, i) => {
              const r = REVISION.find((x) => x.n === s.n)?.strength ?? (i > 10 ? 0.85 : i < 3 ? 0.55 : 0)
              return <button key={s.n} onClick={() => (r && r < 0.65 ? go('revision-session') : go('reader', { n: s.n }))} className="flex flex-col items-center" title={s.ar}><Plant v={r} size={34} /><span className="max-w-full truncate text-[8.5px] text-(--muted)">{s.ar}</span></button>
            })}
          </div>
        </Card>
        <div className={desktop ? 'grid grid-cols-2 gap-6' : ''}>
          <Section title="تحتاج إلى سقيا اليوم">
            <div className="space-y-2">{thirsty.map((r) => <Card key={r.n} onClick={() => go('revision-session')}><div className="flex items-center gap-3"><Plant v={r.strength} size={38} /><div className="flex-1"><div className="font-semibold">{r.part}</div><div className="text-[12px] text-(--muted)">آخر سقيا قبل ٦ أيام</div></div><span className="grid size-9 place-items-center rounded-full bg-[#dbe9f3] text-[#2a6a9a]"><I n="repeat" s={17} /></span></div></Card>)}</div>
          </Section>
          <Section title="غرسة اليوم">
            <Card>
              <div className="flex items-center gap-3"><Plant v={0.3} size={52} /><div className="flex-1"><div className="font-(family-name:--font-display) text-[20px]">الملك ١٦–٢٠</div><div className="text-[12px] text-(--muted)">٥ آيات جديدة · ١٥ دقيقة</div></div></div>
              <Btn full className="mt-4" onClick={() => go('memorize')}><I n="sprout" s={17} />ازرع الآن</Btn>
            </Card>
            <Card className="mt-2" onClick={() => go('khatmah')}><div className="flex items-center gap-3"><I n="book" className="text-(--accent)" /><span className="flex-1 text-[14px]">ورد اليوم · ١٠ صفحات</span><span className="text-[12px] text-(--muted)">٣٥٪ من الختمة</span></div></Card>
          </Section>
        </div>
      </div>
    </div>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab } = useP()
  const active = useRootTab()
  const items = [{ s: 'k-home', l: 'الخريطة', ic: 'map', c: '#ff8a3d' }, { s: 'k-letters', l: 'الحروف', ic: 'letters', c: '#43a047' }, { s: 'k-rewards', l: 'بذوري', ic: 'leaf', c: '#0b6aa2' }]
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Scroll className="pb-28">{children}</Scroll>
      <nav className="absolute inset-x-0 bottom-0 flex justify-center gap-4 pb-4 pt-2">
        {items.map((n) => <button key={n.s} onClick={() => tab(n.s)} className={`flex h-16 items-center gap-2 rounded-[30px_30px_30px_8px] border-b-[5px] border-black/15 px-5 font-(family-name:--font-display) text-[18px] text-white transition ${active === n.s ? 'scale-105' : 'opacity-75'}`} style={{ background: n.c }}><I n={n.ic} s={22} />{active === n.s && n.l}</button>)}
      </nav>
    </div>
  )
}

function KidsHome() {
  const { go, st, sheet, desktop } = useP()
  const stations = [...SIX.slice(0, 5), { s: 'k-memorize', l: 'شجرة الفلق', ic: 'sprout', d: '' }]
  const pos = [[74, 8], [30, 20], [62, 35], [24, 52], [66, 67], [36, 84]]
  return (
    <div className={desktop ? 'mx-auto max-w-[620px] px-8 pt-4' : 'px-5 pt-2'}>
      <div className="flex items-center gap-3">
        <div className="flex-1 font-(family-name:--font-display) text-[26px] leading-none">بستان {KID.name}</div>
        <Stars n={st.stars} />
        <button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-10 place-items-center rounded-full bg-white text-(--muted)"><I n="lock" s={17} /></button>
      </div>
      <div className="relative mt-3 h-[600px] overflow-hidden rounded-[36px] bg-[#c8e89f]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M74 10 C 50 12, 30 14, 30 22 S 64 30, 62 37 S 22 46, 24 54 S 66 60, 66 69 S 34 80, 36 86" fill="none" stroke="#f7e3b5" strokeWidth="7" strokeLinecap="round" />
          <path d="M74 10 C 50 12, 30 14, 30 22 S 64 30, 62 37 S 22 46, 24 54 S 66 60, 66 69 S 34 80, 36 86" fill="none" stroke="#e9cf8f" strokeWidth=".6" strokeDasharray="2 2" />
          {[[10, 10], [88, 28], [8, 70], [90, 86], [50, 96], [86, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="#8fcf5a" />)}
        </svg>
        {stations.map((s, i) => {
          const done = i < 2
          const now = i === 2
          return (
            <button key={s.s} onClick={() => go(s.s, s.s === 'k-memorize' ? { n: 113 } : undefined)} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${pos[i][0]}%`, top: `${pos[i][1]}%` }}>
              <span className={`grid size-[68px] place-items-center rounded-full border-b-[6px] text-white ${now ? 'animate-bounce bg-(--accent) border-[#c25e00]' : done ? 'bg-[#43a047] border-[#2e7d32]' : 'bg-white !text-(--muted) border-[#c3e0a0]'}`}>{done ? <I n="star" s={28} fill /> : <I n={s.ic} s={28} />}</span>
              <span className="mt-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[12px] font-bold text-(--ink)">{s.l}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 pb-4 text-center text-[13px] text-(--muted)">أنتِ في المحطة الثالثة. كل محطة تزرع بذرة جديدة!</p>
    </div>
  )
}

export const rawda: Concept = {
  id: 'rawda',
  name: 'Rawda',
  ar: 'روضة',
  tagline: 'حديقة تنمو بالحفظ وتُسقى بالمراجعة',
  rationale: 'Growth as the core metaphor. Every surah memorised is planted in a garden; revision "waters" it, and weak portions visibly wilt so the next review is obvious without numbers. Earthy olive, sand and terracotta, organic leaf-shaped corners, and a single seed button that opens all sections. Warm and motivating for adults who respond to gentle visual feedback rather than charts.',
  principles: [['Navigation', 'Seed button opens section sheet / leaf sidebar'], ['Type', 'El Messiri + Cairo + Amiri Quran'], ['Signature', 'Garden of surahs, wilting = due revision'], ['Kids', 'Little Gardeners: adventure path map']],
  refs: ['r03'],
  swatches: ['#f2ede1', '#5f7a2e', '#27301c', '#d08a2e', '#c0573b'],
  kidsName: 'Little Gardeners · صغار البستان',
  kidsTagline: 'A winding map of stations that plant seeds',
  kidsSwatches: ['#eaf6d9', '#43a047', '#ff8a3d', '#ffb300', '#0b6aa2'],
  sample: { ui: "'Cairo'", display: "'El Messiri'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
