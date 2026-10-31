import { useState, type ReactNode } from 'react'
import { Scroll, useP } from '../proto'
import { Bar, Btn, Card, I, Section, useTone, type Concept, type Theme } from '../kit'
import { WeekView } from '../parts'
import { Stars } from '../kids'
import { AGENDA, KID, KIDS, PLANS, PLAN_TYPES, USER, toAr } from '../data'
import { NAV, SIX, pick, useRootTab } from './nav'

const adult: Theme = {
  vars: {
    '--bg': '#f6f7f9', '--surface': '#ffffff', '--surface-2': '#f1f3f6', '--ink': '#111827', '--muted': '#6b7280', '--line': '#e5e7eb',
    '--accent': '#2563eb', '--accent-ink': '#ffffff', '--good': '#16a34a', '--warn': '#d97706', '--bad': '#dc2626',
    '--font-ui': "'Tajawal', 'IBM Plex Sans Arabic', sans-serif", '--font-display': "'Tajawal', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(135deg,#2563eb,#4f46e5)', '--hero-ink': '#ffffff',
  },
  tones: { a: ['#fde2ea', '#be185d'], b: ['#e6e3fb', '#5b21b6'], c: ['#dcf3e4', '#15803d'], d: ['#dbeafe', '#1d4ed8'], e: ['#fde8d7', '#c2410c'] },
  card: 'outline', btn: 'square', head: 'plain', bar: 'tool', reader: 'lines', progress: 'heat', week: 'calendar', sheet: 'side',
}
const kids: Theme = {
  vars: {
    '--bg': '#fffdf7', '--surface': '#ffffff', '--surface-2': '#f4efe4', '--ink': '#2d2a32', '--muted': '#7d7686', '--line': '#ece4d4',
    '--accent': '#8b5cf6', '--accent-ink': '#ffffff', '--good': '#22c55e', '--warn': '#f59e0b', '--bad': '#f43f5e', '--mic': '#ec4899',
    '--font-ui': "'Marhey', 'Tajawal', sans-serif", '--font-display': "'Marhey', sans-serif", '--font-quran': "'Rafiqi Quran', 'Amiri Quran', serif",
    '--hero': 'linear-gradient(135deg,#a78bfa,#f472b6)', '--hero-ink': '#fff',
  },
  tones: { a: ['#fce7f3', '#be185d'], b: ['#ede9fe', '#6d28d9'], c: ['#dcfce7', '#15803d'], d: ['#e0f2fe', '#0369a1'], e: ['#ffedd5', '#c2410c'] },
  card: 'sticker', btn: 'chunky', head: 'round', bar: 'kid', reader: 'lines', progress: 'heat', week: 'calendar', sheet: 'bottom',
}

function Sidebar({ onPick }: { onPick?: () => void }) {
  const { tab, sheet, setMode } = useP()
  const active = useRootTab()
  const main = NAV.filter((n) => n.s !== 'settings')
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-4 no-scrollbar">
      <div className="mb-4 flex items-center gap-2 px-2 text-[18px] font-bold"><span className="grid size-8 place-items-center rounded-[8px] bg-(--accent) text-white"><I n="calendar" s={17} /></span>رفيقي</div>
      <div className="px-2 text-[11px] font-semibold text-(--muted)">الرئيسية</div>
      {main.map((n) => <button key={n.s} onClick={() => { tab(n.s); onPick?.() }} className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] ${active === n.s ? 'bg-(--surface-2) font-semibold text-(--ink)' : 'text-(--muted) hover:bg-(--surface-2)'}`}><I n={n.ic} s={18} className={active === n.s ? 'text-(--accent)' : ''} />{n.l}</button>)}
      <div className="my-3 h-px bg-(--line)" />
      <div className="px-2 text-[11px] font-semibold text-(--muted)">المتعلّمون</div>
      <button onClick={() => sheet('profiles')} className="flex items-center gap-2.5 px-2.5 py-1.5 text-[14px] text-(--ink)"><span className="grid size-7 place-items-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-700">أ</span>{USER.name}<span className="ms-auto size-2 rounded-full bg-(--good)" /></button>
      {KIDS.map((k) => <button key={k.id} onClick={() => { setMode('kids', 'k-home') }} className="flex items-center gap-2.5 px-2.5 py-1.5 text-[14px] text-(--ink)"><span className="grid size-7 place-items-center rounded-full bg-pink-100 text-[12px] font-bold text-pink-700">{k.name[0]}</span>{k.name}<span className="ms-auto text-[11px] text-(--muted)">★{toAr(k.stars)}</span></button>)}
      <button onClick={() => { tab('guide'); onPick?.() }} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-(--muted)">لوحة المتابعة<I n="chevronDown" s={14} /></button>
      <div className="my-3 h-px bg-(--line)" />
      <div className="px-2 text-[11px] font-semibold text-(--muted)">أخرى</div>
      <button onClick={() => { tab('settings'); onPick?.() }} className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] ${active === 'settings' ? 'bg-(--surface-2) font-semibold' : 'text-(--muted)'}`}><I n="settings" s={18} />الإعدادات</button>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { desktop, st, patch, tab } = useP()
  const active = useRootTab()
  if (desktop)
    return (
      <div className="flex min-h-0 flex-1">
        <aside className="w-[236px] shrink-0 border-e border-(--line) bg-(--surface)"><Sidebar /></aside>
        <div className="flex min-h-0 flex-1 flex-col"><Scroll>{children}</Scroll></div>
      </div>
    )
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-(--line) bg-(--surface) px-4 py-2.5">
        <button onClick={() => patch({ menu: true })} aria-label="القائمة" className="grid size-9 place-items-center rounded-[8px] border border-(--line)"><I n="menu" s={18} /></button>
        <span className="flex-1 text-[15px] font-bold">رفيقي</span>
        <span className="text-[12px] text-(--muted)">١٦ شعبان ١٤٤٦</span>
      </div>
      <Scroll>{children}</Scroll>
      <nav className="grid grid-cols-5 border-t border-(--line) bg-(--surface) pb-3 pt-1.5">
        {pick('home', 'plans', 'revision', 'library').map((n) => <button key={n.s} onClick={() => tab(n.s)} className={`flex flex-col items-center gap-0.5 py-1 text-[10.5px] ${active === n.s ? 'font-bold text-(--accent)' : 'text-(--muted)'}`}><I n={n.ic} s={20} />{n.l}</button>)}
        <button onClick={() => patch({ menu: true })} className="flex flex-col items-center gap-0.5 py-1 text-[10.5px] text-(--muted)"><I n="grid" s={20} />المزيد</button>
      </nav>
      {st.menu && (
        <div className="absolute inset-0 z-30 bg-black/30" onClick={() => patch({ menu: false })}>
          <div className="rise absolute inset-y-0 start-0 w-[82%] bg-(--surface) shadow-xl" onClick={(e) => e.stopPropagation()}><Sidebar onPick={() => patch({ menu: false })} /></div>
        </div>
      )}
    </div>
  )
}

function Home() {
  const { go, desktop } = useP()
  const tone = useTone()
  const [view, setView] = useState<'day' | 'week'>('day')
  const hours = ['٥ ص', '٦ ص', '٧ ص', '١ م', '٩ م']
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-(--line) bg-(--surface) px-5 py-4">
        <div className="flex-1"><h1 className="text-[20px] font-bold">جدولي</h1><p className="text-[12px] text-(--muted)">الأربعاء ١٦ شعبان ١٤٤٦ · ١٤ فبراير</p></div>
        <div className="flex rounded-[8px] border border-(--line) p-0.5 text-[12px]">{[['day', 'يوم'], ['week', 'أسبوع']].map(([v, l]) => <button key={v} onClick={() => setView(v as 'day')} className={`rounded-[6px] px-3 py-1.5 ${view === v ? 'bg-(--surface-2) font-semibold' : 'text-(--muted)'}`}>{l}</button>)}</div>
      </div>
      <div className={`p-5 ${desktop ? 'grid grid-cols-[1fr_300px] gap-5' : ''}`}>
        <div>
          <div className="grid grid-cols-4 gap-2">{[['اليوم', '٥٣ د', 'clock'], ['المواظبة', `${toAr(USER.streak)} يومًا`, 'flame'], ['المحفوظ', '٤١٢ آية', 'sprout'], ['الختمة', '٣٥٪', 'book']].map(([l, v, ic]) => <Card key={l} className="!p-3"><div className="flex items-center gap-1 text-[11px] text-(--muted)"><I n={ic} s={13} />{l}</div><div className="mt-1 text-[16px] font-bold">{v}</div></Card>)}</div>
          {view === 'week' ? (
            <div className="mt-4"><WeekView /></div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[10px] border border-(--line) bg-(--surface)">
              {AGENDA.map((a, i) => (
                <div key={i} className="grid grid-cols-[56px_1fr] border-b border-(--line) last:border-0">
                  <div className="border-e border-(--line) px-2 py-3 text-[11px] text-(--muted)">{hours[i]}<div className="mt-0.5 font-semibold text-(--ink)">{a.time}</div></div>
                  <button onClick={() => go(a.screen)} className="m-2 flex items-center gap-3 rounded-[8px] border-s-[3px] px-3 py-2.5 text-start" style={{ ...tone(a.tone), borderColor: tone(a.tone).color }}>
                    <div className="flex-1"><div className="text-[14px] font-bold">{a.label}</div><div className="text-[12px] opacity-80">{a.detail} · {toAr(a.mins)} دقيقة</div></div>
                    {a.done ? <span className="grid size-6 place-items-center rounded-full bg-(--good) text-white"><I n="check" s={13} /></span> : <I n="play" s={16} fill />}
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-[56px_1fr]"><div className="border-e border-(--line)" /><button onClick={() => go('plan-new')} className="m-2 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-(--line) py-2.5 text-[13px] text-(--muted)"><I n="plus" s={15} />أضف إلى الجدول</button></div>
            </div>
          )}
        </div>
        <div>
          <Section title="الخطط النشطة" className={desktop ? '!mt-0' : ''} action={<button onClick={() => go('plans')} className="text-[12px] font-semibold text-(--accent)">الكل</button>}>
            <div className="space-y-2">{PLANS.slice(0, 4).map((p) => { const t = PLAN_TYPES.find((x) => x.id === p.type)!; return <Card key={p.id} onClick={() => go('plans')} className="!p-3"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="size-2 rounded-full" style={{ background: tone(t.tone).color }} />{p.title}<span className="ms-auto text-[11px] font-normal text-(--muted)">{toAr(Math.round((p.done / p.total) * 100))}٪</span></div><Bar v={p.done / p.total} className="mt-2" tone={tone(t.tone).color} /></Card> })}</div>
          </Section>
          <Btn full className="mt-4" onClick={() => go('plan-new')}><I n="plus" s={16} />خطة جديدة</Btn>
        </div>
      </div>
    </div>
  )
}

function KidsShell({ children }: { children: ReactNode }) {
  const { tab, desktop } = useP()
  const active = useRootTab()
  const tabs = [{ s: 'k-home', l: 'اليوم', c: '#8b5cf6' }, { s: 'k-letters', l: 'أتعلّم', c: '#ec4899' }, { s: 'k-surahs', l: 'سوري', c: '#0ea5e9' }, { s: 'k-rewards', l: 'ملصقاتي', c: '#f59e0b' }]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className={`flex gap-2 overflow-x-auto px-4 pb-2 pt-2 no-scrollbar ${desktop ? 'justify-center' : ''}`}>
        {tabs.map((t) => <button key={t.s} onClick={() => tab(t.s)} className={`shrink-0 rounded-full border-b-4 px-4 py-2 text-[14px] transition ${active === t.s ? 'border-black/20 text-white' : 'border-(--line) bg-white text-(--muted)'}`} style={active === t.s ? { background: t.c } : undefined}>{t.l}</button>)}
      </nav>
      <Scroll>{children}</Scroll>
    </div>
  )
}

function KidsHome() {
  const { go, st, set, sheet, desktop } = useP()
  const [chart, setChart] = useState<Record<string, boolean>>({ '0-0': true, '0-1': true, '1-0': true, '1-2': true, '2-1': true })
  const rows = [['حروف', '#ec4899'], ['قراءة', '#8b5cf6'], ['سورة', '#0ea5e9']]
  const tasks = [['k-letter', 'تعلّم حرف الخاء', 'letters', true], ['k-reading', 'اقرأ ٣ كلمات', 'book', false], ['k-listen', 'استمع لسورة الفلق', 'ear', false]] as const
  return (
    <div className={desktop ? 'mx-auto max-w-[900px] px-8 pb-12 pt-2' : 'px-4 pb-10'}>
      <div className="flex items-center gap-3 rounded-[20px] p-4 text-white" style={{ background: 'var(--hero)' }}>
        <span className="grid size-12 rotate-[-6deg] place-items-center rounded-[14px] bg-white text-[22px] text-[#8b5cf6] shadow">م</span>
        <div className="flex-1"><div className="text-[13px] opacity-90">صباح الخير</div><div className="text-[22px] leading-tight">{KID.name}</div></div>
        <Stars n={st.stars} />
        <button onClick={() => sheet('gate')} aria-label="للكبار" className="grid size-9 place-items-center rounded-full bg-white/25"><I n="lock" s={16} /></button>
      </div>
      <div className={desktop ? 'grid grid-cols-2 gap-5' : ''}>
        <div className="mt-4">
          <div className="mb-2 text-[17px]">مهامي اليوم</div>
          <div className="space-y-2">{tasks.map(([s, l, ic, done], i) => <button key={s} onClick={() => go(s, s === 'k-letter' ? { i: 6 } : { n: 113 })} className={`flex w-full items-center gap-3 rounded-[16px] border border-(--line) bg-white p-3 text-start shadow-[0_3px_0_var(--line)] ${i % 2 ? 'rotate-[.6deg]' : '-rotate-[.6deg]'}`}><span className={`grid size-8 place-items-center rounded-[10px] border-2 ${done ? 'border-(--good) bg-(--good) text-white' : 'border-(--line)'}`}>{done && <I n="check" s={16} />}</span><I n={ic} className="text-(--accent)" /><span className="flex-1 text-[15px]">{l}</span><I n="chevron" s={16} className="rotate-180 text-(--muted)" /></button>)}</div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[17px]">لوحة ملصقاتي<span className="text-[12px] text-(--muted)">اضغط لتلصق</span></div>
          <div className="rounded-[18px] border border-(--line) bg-white p-3 shadow-[0_3px_0_var(--line)]">
            <div className="grid grid-cols-[54px_repeat(7,1fr)] gap-1 text-center text-[11px] text-(--muted)"><span />{['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((d) => <span key={d}>{d}</span>)}</div>
            {rows.map(([r, c], ri) => (
              <div key={r} className="mt-1 grid grid-cols-[54px_repeat(7,1fr)] items-center gap-1">
                <span className="text-[12px]" style={{ color: c }}>{r}</span>
                {Array.from({ length: 7 }, (_, d) => { const k = `${d}-${ri}`; const on = chart[k]; return <button key={d} onClick={() => { setChart({ ...chart, [k]: !on }); if (!on) set((s) => ({ ...s, stars: s.stars + 1 })) }} className={`grid aspect-square place-items-center rounded-full transition ${on ? 'scale-100 text-white' : 'border-2 border-dashed border-(--line) scale-90'}`} style={on ? { background: c, transform: `rotate(${(d * 17) % 20 - 10}deg)` } : undefined}>{on && <I n="star" s={14} fill />}</button> })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`mt-4 grid gap-2 ${desktop ? 'grid-cols-6' : 'grid-cols-3'}`}>{SIX.map((a, i) => <button key={a.s} onClick={() => go(a.s)} className={`flex flex-col items-center gap-1 rounded-[16px] border border-(--line) bg-white py-3 text-[13px] shadow-[0_3px_0_var(--line)] ${i % 2 ? 'rotate-1' : '-rotate-1'}`}><I n={a.ic} s={24} className="text-(--accent)" />{a.l}</button>)}</div>
    </div>
  )
}

export const jadwal: Concept = {
  id: 'jadwal',
  name: 'Jadwal',
  ar: 'جدول',
  tagline: 'مساحة عمل منظّمة: الخطة هي الواجهة',
  rationale: 'A planner-first workspace. The home screen is today\'s agenda as time blocks, plans live in a real week calendar with pastel colour-coded sessions, and the reader is a structured table with memorisation status per ayah. A sidebar groups learners on the device, ideal for families and teachers on tablet or desktop. Drawn from the Ramadhan Pro schedule reference.',
  principles: [['Navigation', 'Sidebar (desktop) / bottom tabs + drawer'], ['Type', 'Tajawal + Amiri Quran'], ['Signature', 'Time-block agenda, week calendar, side panels'], ['Kids', 'Sticker Chart: tasks checklist + weekly stickers']],
  refs: ['r02'],
  swatches: ['#f6f7f9', '#2563eb', '#fde2ea', '#e6e3fb', '#dcf3e4'],
  kidsName: 'Sticker Chart · لوحة الملصقات',
  kidsTagline: 'Daily task checklist and a weekly sticker board',
  kidsSwatches: ['#fffdf7', '#8b5cf6', '#ec4899', '#0ea5e9', '#f59e0b'],
  sample: { ui: "'Tajawal'", display: "'Tajawal'" },
  adult, kids, Shell, KidsShell, Home, KidsHome,
}
