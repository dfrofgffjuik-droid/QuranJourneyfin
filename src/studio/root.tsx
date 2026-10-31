import type { FC } from 'react'
import { Scroll, useP } from './proto'
import { I, themeStyle } from './kit'
import * as A from './screens'
import * as K from './kids'
import { KIDS, USER, toAr } from './data'

export const ADULT_SCREENS: { s: string; l: string; p?: Record<string, unknown> }[] = [
  { s: 'onboarding', l: '١. البداية واختيار المسار' },
  { s: 'home', l: '٢. الرئيسية' },
  { s: 'library', l: '٣. فهرس المصحف' },
  { s: 'reader', l: '٤. قارئ المصحف', p: { n: 1 } },
  { s: 'reader:ayah', l: '٥. خيارات الآية (لوحة سفلية)' },
  { s: 'memorize', l: '٦. الحفظ' },
  { s: 'plans', l: '٧. لوحة الخطط' },
  { s: 'plan-new', l: '٨. إنشاء خطة جديدة' },
  { s: 'revision', l: '٩. جدول المراجعة' },
  { s: 'revision-session', l: '٩ب. جلسة مراجعة' },
  { s: 'khatmah', l: '١٠. الورد والختمة' },
  { s: 'recite', l: '١١. التسميع' },
  { s: 'progress', l: '١٢. التقدّم والرحلة' },
  { s: 'settings', l: '١٣. الإعدادات والملفات' },
  { s: 'guide', l: 'وليّ الأمر / المعلّم' },
  { s: 'guide-child', l: 'وليّ الأمر: ملف طفل', p: { id: 'maryam' } },
]
export const KID_SCREENS: { s: string; l: string; p?: Record<string, unknown> }[] = [
  { s: 'k-home', l: 'الرئيسية' },
  { s: 'k-letters', l: 'الحروف وأصواتها' },
  { s: 'k-letter', l: 'درس حرف (الخاء)', p: { i: 6 } },
  { s: 'k-harakat', l: 'الحركات' },
  { s: 'k-joining', l: 'وصل الحروف' },
  { s: 'k-reading', l: 'تمارين القراءة' },
  { s: 'k-surahs', l: 'السور القصيرة' },
  { s: 'k-listen', l: 'نشاط الاستماع', p: { n: 113 } },
  { s: 'k-memorize', l: 'الحفظ بالتكرار', p: { n: 113 } },
  { s: 'k-rewards', l: 'الجوائز والتقدّم' },
]

const MAP: Record<string, FC> = {
  onboarding: A.Onboarding,
  library: A.Library,
  reader: A.Reader,
  memorize: A.Memorize,
  plans: A.Plans,
  'plan-new': A.PlanNew,
  revision: A.Revision,
  'revision-session': A.RevisionSession,
  khatmah: A.Khatmah,
  recite: A.Recite,
  progress: A.Progress,
  settings: A.Settings,
  guide: A.Guide,
  'guide-child': A.GuideChild,
  'k-letters': K.KLetters,
  'k-letter': K.KLetter,
  'k-harakat': K.KHarakat,
  'k-joining': K.KJoining,
  'k-reading': K.KReading,
  'k-surahs': K.KSurahs,
  'k-listen': K.KListen,
  'k-memorize': K.KMemorize,
  'k-rewards': K.KRewards,
}
const FOCUS = new Set(['onboarding', 'memorize', 'revision-session', 'plan-new', 'k-memorize'])

export function Root() {
  const { cur, stack, concept, theme, desktop, kids } = useP()
  const Screen = cur.s === 'home' ? concept.Home : cur.s === 'k-home' ? concept.KidsHome : (MAP[cur.s] ?? (kids ? concept.KidsHome : concept.Home))
  const Shell = kids ? concept.KidsShell : concept.Shell
  const key = `${stack.length}-${cur.s}-${JSON.stringify(cur.p ?? {})}`
  return (
    <div dir="rtl" lang="ar" style={themeStyle(theme)} className="relative flex h-full flex-col overflow-hidden bg-(--bg) font-(family-name:--font-ui) text-(--ink) antialiased">
      {!desktop && <StatusBar />}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {FOCUS.has(cur.s) ? (
          <Scroll><Screen key={key} /></Scroll>
        ) : (
          <Shell><Screen key={key} /></Shell>
        )}
      </div>
      <SheetHost />
      <Toast />
    </div>
  )
}

function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between bg-(--status,var(--bg)) px-7 pt-1 text-[14px] font-semibold text-(--status-ink,var(--ink))" dir="ltr">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x=".5" y=".5" width="21" height="10" rx="3" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="7" rx="1.6" fill="currentColor" /></svg>
      </span>
    </div>
  )
}

function SheetHost() {
  const { st, close, theme, desktop } = useP()
  if (!st.sheet) return null
  const { id, p } = st.sheet
  const body = id === 'reward' || id === 'gate' ? <K.KidSheet id={id} p={p} /> : id === 'profiles' ? <Profiles /> : <A.SheetBody id={id} p={p} />
  const kind = theme.sheet === 'side' && !desktop ? 'bottom' : theme.sheet === 'bottom' && desktop ? 'center' : theme.sheet
  const panel =
    kind === 'side'
      ? 'absolute inset-y-0 start-0 w-[420px] border-e border-(--line) bg-(--surface) p-6 rise'
      : kind === 'center'
        ? `relative w-full max-w-[460px] bg-(--bg) p-6 rise ${theme.card === 'block' || theme.card === 'mondrian' ? 'border-[3px] border-(--ink)' : theme.card === 'rule' ? 'border border-(--ink)' : 'rounded-[28px]'}`
        : kind === 'full'
          ? 'absolute inset-0 bg-(--bg) p-6 pt-16 rise'
          : `absolute inset-x-0 bottom-0 max-h-[86%] overflow-y-auto no-scrollbar bg-(--bg) p-5 pb-8 rise ${theme.card === 'block' || theme.card === 'mondrian' ? 'border-t-[3px] border-(--ink)' : 'rounded-t-[28px]'}`
  return (
    <div className={`absolute inset-0 z-40 ${kind === 'center' ? 'grid place-items-center p-5' : ''} ${kind === 'full' ? '' : 'bg-black/45 backdrop-blur-[2px]'}`} onClick={close}>
      <div className={panel} onClick={(e) => e.stopPropagation()}>
        {kind === 'bottom' && <div className="mx-auto -mt-1 mb-4 h-1.5 w-10 rounded-full bg-(--line)" />}
        <button onClick={close} aria-label="إغلاق" className={`absolute end-4 top-4 grid size-9 place-items-center text-(--ink) ${theme.card === 'block' || theme.card === 'mondrian' ? 'border-2 border-(--ink)' : 'rounded-full bg-(--surface-2)'}`}><I n="x" s={17} /></button>
        {body}
      </div>
    </div>
  )
}

function Toast() {
  const { st } = useP()
  if (!st.toast) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-50 flex justify-center px-4">
      <div className="rise rounded-full bg-(--ink) px-4 py-2.5 text-[13px] font-semibold text-(--bg) shadow-lg">{st.toast}</div>
    </div>
  )
}

function Profiles() {
  const { setMode, go, close, kids, st } = useP()
  const rows = [
    { id: 'adult', name: USER.name, d: 'بالغ · حفظ ومراجعة وختمة', on: !kids, f: () => setMode('adult', 'home') },
    ...KIDS.map((k) => ({ id: k.id, name: k.name, d: `طفل · ${toAr(k.age)} سنوات · ★ ${toAr(k.id === 'maryam' ? st.stars : k.stars)}`, on: kids && k.id === 'maryam', f: () => setMode('kids', 'k-home') })),
  ]
  return (
    <div>
      <div className="mb-1 text-[20px] font-bold text-(--ink)">الملفات على هذا الجهاز</div>
      <p className="mb-4 text-[12.5px] text-(--muted)">لكل ملف تقدّمه وخططه الخاصة.</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <button key={r.id} onClick={r.f} className={`flex w-full items-center gap-3 rounded-[18px] p-3 text-start ${r.on ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface) text-(--ink) ring-1 ring-(--line)'}`}>
            <span className={`grid size-11 place-items-center rounded-full text-[17px] font-bold ${r.on ? 'bg-white/20' : 'bg-(--surface-2)'}`}>{r.name[0]}</span>
            <span className="flex-1"><span className="block text-[15px] font-semibold">{r.name}</span><span className="block text-[12px] opacity-75">{r.d}</span></span>
            {r.on && <I n="check" />}
          </button>
        ))}
        <button onClick={() => { if (kids) setMode('adult', 'guide'); else go('guide') }} className="flex w-full items-center gap-3 rounded-[18px] bg-(--surface) p-3 text-start text-(--ink) ring-1 ring-(--line)">
          <span className="grid size-11 place-items-center rounded-full bg-(--surface-2)"><I n="users" /></span>
          <span className="flex-1"><span className="block text-[15px] font-semibold">لوحة وليّ الأمر / المعلّم</span><span className="block text-[12px] text-(--muted)">متابعة الأطفال والتكليفات</span></span>
        </button>
        <button onClick={close} className="flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-(--line) p-3 text-[14px] font-semibold text-(--muted)"><I n="plus" s={17} />إضافة ملف</button>
      </div>
    </div>
  )
}
