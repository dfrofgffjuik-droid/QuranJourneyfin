// Shared preview progress & activity model for the Next-generation preview.
//
// One store, consumed by Home, Memorization Journey, Revision, Mushaf, Weekly
// Roadmap, Plans, Rewards, Map, Library and Kids — in every device frame.
// Isolation: preview-only. It never imports or writes the production store
// (src/lib/store.ts) or plans (src/lib/plans.ts); it persists only under its own
// namespaced key and can be reset to the predefined demo scenario or to empty.
//
// Rules enforced here (not in screens):
//  - Activity types stay separate: memorisation, revision, reading, kids lessons.
//    Revision / reading never add memorised ayat; an ayah already memorised is
//    never counted twice.
//  - Every progress change goes through `commit(eventId, …)`; an event id is
//    processed once, so repeated taps cannot duplicate progress, stars or badges.
//  - Opening a screen never records anything. Tasks complete only by an explicit action.
//  - Achievements and stars are stored with their date and triggering event and
//    are never removed (no deductions, no streak penalties).
//  - Ranges: a task keeps its range in the plan's unit (ayah = global ayah index,
//    page = Madinah page number) for display, and ALWAYS a canonical global-ayah
//    range (g0/g1) resolved through the Mushaf PAGES table. Memorisation and
//    revision records are canonical only — a page number never becomes an ayah index.
//  - Plan edits never award anything. Changing a core field (type, unit, range,
//    daily quota) after progress exists creates a new plan version; each task
//    record keeps the version and configuration it was recorded under.
//  - A plan counts as completed only when a recorded task reaches its target
//    (`verified`). Closing / archiving a plan is administrative, never learning.
import { useSyncExternalStore } from 'react'
import { JUZ, PAGES, SHORT_SURAHS_FOR_KIDS, SURAHS, TOTAL_AYAT, fromGIndex, gIndex, juzEnd, pageEnd, pageOf, surah, toAr, type Pos } from '../../lib/quran'
import { HARAKAT, JOIN_WORDS, LETTERS, READING_LESSONS } from '../../screens/kidsData'
import { quarantine, readRaw, safeWrite } from './storageSafety'

export const STORAGE_KEY = 'quranJourney.nextPreview.v1'
/** Untouched copy of a v1 payload, written once before it is migrated to v2. */
export const STORAGE_BACKUP_KEY = 'quranJourney.nextPreview.v1.backup-before-v2'

// ---------------------------------------------------------------- types
export type PlanType = 'hifz' | 'revision' | 'reading' | 'khatmah' | 'custom'
export type Activity = 'hifz' | 'revision' | 'reading'
export type Unit = 'ayah' | 'page'
export type Scope =
  | { kind: 'quran' }
  | { kind: 'surah'; s: number; from: number; to: number }
  | { kind: 'juz'; j: number }
  | { kind: 'range'; from: Pos; to: Pos }
  | { kind: 'pages'; from: number; to: number }
/** `completed` is reached only through recorded tasks; `closed` is a manual, administrative stop. */
export type PlanStatus = 'active' | 'paused' | 'completed' | 'closed' | 'archived'
export type Workload = 'light' | 'moderate' | 'intense'
export type PlanDraft = {
  name: string
  type: PlanType
  /** Only for custom plans: which activity its tasks are. */
  customActivity: Activity
  scope: Scope
  unit: Unit
  daily: number
  days: number[]
  workload: Workload
  targetDate: string | null
  reminder: string | null
  primary: boolean
}
/** The fields that define what a plan's tasks mean. Changing one after progress exists makes a new version. */
export type CoreCfg = Pick<PlanDraft, 'type' | 'customActivity' | 'scope' | 'unit' | 'daily'>
export type PlanVersion = { v: number; from: string; at: string; cfg: CoreCfg }
export type Plan = PlanDraft & {
  id: string
  status: PlanStatus
  createdAt: string
  /** Date the plan's target was reached by a recorded task (never set by a manual action). */
  completedAt: string | null
  autoCompleted?: boolean
  demo?: boolean
  version: number
  versions: PlanVersion[]
  /** Study-day history, so earlier weeks are judged by the days that applied then. */
  schedule: { from: string; days: number[] }[]
  /** The task event that reached the plan's target. */
  verified: { at: string; eventId: string; version: number } | null
}

type Source = 'demo' | 'journey' | 'task' | 'chunk' | 'session' | 'kids'
/** `from`/`to` are in `unit`; `g0`/`g1` are the canonical global-ayah range. */
export type TaskRecord = { id: string; planId: string; date: string; at: string; activity: Activity; unit: Unit; from: number; to: number; g0: number; g1: number; planVersion: number; cfg: CoreCfg; eventId: string; demo?: boolean; migrated?: boolean }
/** Inclusive global-ayah ranges (gIndex) the user explicitly confirmed as memorised. */
export type MemRecord = { id: string; from: number; to: number; at: string; source: Source; eventId: string }
export type RevRecord = { id: string; from: number; to: number; at: string; planId: string | null; source: Source; eventId: string }
export type ReadRecord = { id: string; unit: Unit; from: number; to: number; g0: number; g1: number; at: string; planId: string | null; source: Source; eventId: string }
export type LessonRecord = { id: string; at: string; source: Source; eventId: string }
export type Earned = { id: string; at: string; eventId: string; demo?: boolean }
export type RewardTx = { id: string; kind: 'star' | 'badge' | 'kids-badge'; ref: string; amount: number; at: string; eventId: string; demo?: boolean }

export type PState = {
  v: 2
  seed: 'demo' | 'empty'
  plans: Plan[]
  tasks: TaskRecord[]
  memorized: MemRecord[]
  revisions: RevRecord[]
  reading: ReadRecord[]
  lessons: LessonRecord[]
  achievements: Record<string, Earned>
  kidsBadges: Record<string, Earned>
  rewards: RewardTx[]
  decor: string
  /** Explicitly confirmed steps (chunks / pages) of an activity, keyed by step key → step id → ISO time. */
  steps: Record<string, Record<string, string>>
  /** Processed event ids (idempotency). */
  events: string[]
}

// ---------------------------------------------------------------- dates
const pad = (n: number) => String(n).padStart(2, '0')
export const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => dateStr(new Date())
export const parseDate = (s: string) => new Date(`${s}T12:00:00`)
export const addDays = (s: string, n: number) => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return dateStr(d)
}
export const dow = (s: string) => parseDate(s).getDay()
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5)
/** Weeks start on Saturday (the app's Arabic week order). */
export const weekStart = (s: string) => addDays(s, -((dow(s) - 6 + 7) % 7))
export const weekDates = (s = today()) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(s), i))
export const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
export const fmtDate = (s: string) => parseDate(s).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })

// ---------------------------------------------------------------- plan helpers
export const TYPE_AR: Record<PlanType, { ar: string; icon: string }> = {
  hifz: { ar: 'حفظ جديد', icon: 'sprout' },
  revision: { ar: 'مراجعة', icon: 'repeat' },
  reading: { ar: 'قراءة', icon: 'book' },
  khatmah: { ar: 'ختمة', icon: 'layers' },
  custom: { ar: 'خطة مخصصة', icon: 'target' },
}
export const ACTIVITY_AR: Record<Activity, string> = { hifz: 'حفظ', revision: 'مراجعة', reading: 'قراءة' }
export const activityOf = (p: Pick<PlanDraft, 'type' | 'customActivity'>): Activity => (p.type === 'custom' ? p.customActivity : p.type === 'khatmah' ? 'reading' : p.type)
export const unitAr = (u: Unit, n: number) => (u === 'page' ? (n >= 3 && n <= 10 ? 'صفحات' : 'صفحة') : n >= 3 && n <= 10 ? 'آيات' : 'آية')
export const STATUS_AR: Record<PlanStatus, string> = { active: 'نشطة', paused: 'متوقّفة مؤقتًا', completed: 'مكتملة', closed: 'مغلقة', archived: 'مؤرشفة' }

/** Canonical start/end of a scope, as global ayah indices. */
export function scopeAyat(sc: Scope): [number, number] {
  if (sc.kind === 'quran') return [1, TOTAL_AYAT]
  if (sc.kind === 'surah') return [gIndex(sc.s, sc.from), gIndex(sc.s, sc.to)]
  if (sc.kind === 'juz') return [gIndex(...JUZ[sc.j - 1]), gIndex(...juzEnd(sc.j))]
  if (sc.kind === 'range') return [gIndex(...sc.from), gIndex(...sc.to)]
  return [gIndex(...PAGES[sc.from - 1]), gIndex(...pageEnd(sc.to))]
}
/** First / last global ayah of a Madinah page. */
export const pageAyat = (pg: number): [number, number] => [gIndex(...PAGES[pg - 1]), gIndex(...pageEnd(pg))]
/**
 * Resolves a unit range to its canonical global-ayah range. Page ranges go through
 * the Mushaf PAGES table; `clamp` keeps a page range inside the plan's own scope.
 */
export function toCanonical(unit: Unit, from: number, to: number, clamp?: [number, number]) {
  if (unit === 'ayah') return { g0: from, g1: to }
  let g0 = pageAyat(from)[0]
  let g1 = pageAyat(to)[1]
  if (clamp) (g0 = Math.max(g0, clamp[0]), (g1 = Math.min(g1, clamp[1])))
  return { g0, g1 }
}
export const canonicalOf = (p: Pick<PlanDraft, 'scope' | 'unit'>, from: number, to: number) => toCanonical(p.unit, from, to, scopeAyat(p.scope))
export const coreOf = (p: CoreCfg): CoreCfg => ({ type: p.type, customActivity: p.customActivity, scope: p.scope, unit: p.unit, daily: p.daily })
export const coreChanged = (a: CoreCfg, b: CoreCfg) => JSON.stringify(coreOf(a)) !== JSON.stringify(coreOf(b))
/** Study days in force on a date (the schedule history; current days for dates after the last change). */
export const daysOn = (p: Pick<Plan, 'days'> & { schedule?: Plan['schedule'] }, d: string) => [...(p.schedule ?? [])].reverse().find((x) => x.from <= d)?.days ?? p.days

// ---------------------------------------------------------------- chunks & steps
/** Largest passage the Memorization Journey shows at once (one surah, up to 20 ayat). */
export const MAX_CHUNK = 20
export type Chunk = { id: string; s: number; from: number; to: number; g0: number; g1: number }
/** Splits a canonical range into navigable passages: never across a surah boundary, never above MAX_CHUNK ayat. */
export function chunksOf(g0: number, g1: number, max = MAX_CHUNK): Chunk[] {
  const out: Chunk[] = []
  for (let g = g0; g <= g1; ) {
    const [s, a] = fromGIndex(g)
    const e = Math.min(g1, gIndex(s, surah(s).ayat), g + max - 1)
    out.push({ id: `a${g}-${e}`, s, from: a, to: a + (e - g), g0: g, g1: e })
    g = e + 1
  }
  return out
}
export type Segment = { id: string; g0: number; g1: number; page: number | null }
/** The steps an activity must explicitly confirm: memorisation → passages; revision → pages (page unit) or passages. */
export function segmentsOf(activity: Activity, unit: Unit, from: number, to: number, g0: number, g1: number, clamp?: [number, number]): Segment[] {
  if (activity === 'reading') return []
  if (activity === 'revision' && unit === 'page') {
    const out: Segment[] = []
    for (let pg = from; pg <= to; pg++) {
      const c = toCanonical('page', pg, pg, clamp)
      if (c.g0 <= c.g1) out.push({ id: `p${pg}`, g0: c.g0, g1: c.g1, page: pg })
    }
    return out
  }
  return chunksOf(g0, g1).map((c) => ({ id: c.id, g0: c.g0, g1: c.g1, page: null }))
}
export const taskStepKey = (planId: string, date: string, unit: Unit, from: number, to: number) => `task:${planId}:${date}:${unit}:${from}-${to}`
export const stepsDone = (st: PState, key: string, segs: { id: string }[]) => segs.filter((x) => st.steps[key]?.[x.id]).length
/** The plan's unit range: global ayah indices, or Madinah page numbers. */
export function planRange(p: Pick<PlanDraft, 'scope' | 'unit'>) {
  const [g0, g1] = scopeAyat(p.scope)
  if (p.unit === 'ayah') return { start: g0, end: g1, total: g1 - g0 + 1 }
  const s = p.scope.kind === 'pages' ? p.scope.from : p.scope.kind === 'quran' ? 1 : pageOf(...fromGIndex(g0))
  const e = p.scope.kind === 'pages' ? p.scope.to : p.scope.kind === 'quran' ? 604 : pageOf(...fromGIndex(g1))
  return { start: s, end: e, total: e - s + 1 }
}
export function rangeAr(unit: Unit, from: number, to: number) {
  if (unit === 'page') return from === to ? `الصفحة ${toAr(from)}` : `الصفحات ${toAr(from)}–${toAr(to)}`
  const [s0, a0] = fromGIndex(from)
  const [s1, a1] = fromGIndex(to)
  if (s0 === s1) return `${surah(s0).ar} ${from === to ? toAr(a0) : `${toAr(a0)}–${toAr(a1)}`}`
  return `${surah(s0).ar} ${toAr(a0)} – ${surah(s1).ar} ${toAr(a1)}`
}
export function scopeAr(sc: Scope) {
  if (sc.kind === 'quran') return 'القرآن كاملًا'
  if (sc.kind === 'surah') return `سورة ${surah(sc.s).ar}${sc.from === 1 && sc.to === surah(sc.s).ayat ? '' : ` ${toAr(sc.from)}–${toAr(sc.to)}`}`
  if (sc.kind === 'juz') return `الجزء ${toAr(sc.j)}`
  if (sc.kind === 'range') return `${surah(sc.from[0]).ar} ${toAr(sc.from[1])} – ${surah(sc.to[0]).ar} ${toAr(sc.to[1])}`
  return `الصفحات ${toAr(sc.from)}–${toAr(sc.to)}`
}

/** Validation for the plan form. Returns field → Arabic message. */
export function validatePlan(d: PlanDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (!d.name.trim()) e.name = 'اكتب اسمًا للخطة.'
  else if (d.name.trim().length > 60) e.name = 'الاسم حتى ٦٠ حرفًا.'
  const sc = d.scope
  const okInt = (n: number) => Number.isInteger(n)
  if (sc.kind === 'surah') {
    const n = surah(sc.s)?.ayat ?? 0
    if (!n) e.scope = 'اختر سورة.'
    else if (!okInt(sc.from) || !okInt(sc.to) || sc.from < 1 || sc.to > n || sc.from > sc.to) e.scope = `اختر آيات بين ١ و${toAr(n)} في سورة ${surah(sc.s).ar}، والبداية قبل النهاية.`
  } else if (sc.kind === 'juz') {
    if (!okInt(sc.j) || sc.j < 1 || sc.j > 30) e.scope = 'اختر جزءًا بين ١ و٣٠.'
  } else if (sc.kind === 'range') {
    const bad = (p: Pos) => !surah(p[0]) || !okInt(p[1]) || p[1] < 1 || p[1] > surah(p[0]).ayat
    if (bad(sc.from) || bad(sc.to)) e.scope = 'رقم آية خارج حدود السورة المختارة.'
    else if (gIndex(...sc.from) > gIndex(...sc.to)) e.scope = 'بداية المدى يجب أن تسبق نهايته.'
  } else if (sc.kind === 'pages') {
    if (!okInt(sc.from) || !okInt(sc.to) || sc.from < 1 || sc.to > 604 || sc.from > sc.to) e.scope = 'اختر صفحات بين ١ و٦٠٤، والبداية قبل النهاية.'
  }
  if (sc.kind === 'pages' && d.unit === 'ayah') e.scope = 'مدى الصفحات يناسب وحدة الصفحات.'
  const total = e.scope ? 0 : planRange(d).total
  const max = d.unit === 'page' ? 60 : 300
  if (!okInt(d.daily) || d.daily < 1) e.daily = 'الهدف اليومي يجب أن يكون ١ على الأقل.'
  else if (d.daily > max) e.daily = `الحد الأقصى ${toAr(max)} ${unitAr(d.unit, max)} يوميًا.`
  else if (total && d.daily > total) e.daily = `المدى كله ${toAr(total)} ${unitAr(d.unit, total)} فقط.`
  if (d.days.length === 0) e.days = 'اختر يومًا واحدًا على الأقل للدراسة.'
  if (d.targetDate && d.targetDate < today()) e.targetDate = 'تاريخ الإنجاز المستهدف لا يكون في الماضي.'
  if (d.reminder && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.reminder)) e.reminder = 'وقت التذكير غير صالح.'
  return e
}

/** Calendar estimate from a start date: which date finishes `units` at `daily` on the study days. */
export function estimateFinish(units: number, daily: number, days: number[], from = today()) {
  if (units <= 0 || daily <= 0 || days.length === 0) return null
  let left = Math.ceil(units / daily)
  let d = from
  for (let i = 0; i < 3650; i++) {
    if (days.includes(dow(d))) left -= 1
    if (left <= 0) return d
    d = addDays(d, 1)
  }
  return null
}

// ---------------------------------------------------------------- kids lesson catalogue
export type RoomId = 'letters' | 'harakat' | 'joining' | 'reading' | 'surahs'
export const KIDS_LESSONS: Record<RoomId, { id: string; label: string }[]> = {
  letters: LETTERS.map((l, i) => ({ id: `letter:${i}`, label: l.ch })),
  harakat: HARAKAT.map((h, i) => ({ id: `haraka:${i}`, label: `ب${h.mark}` })),
  joining: JOIN_WORDS.map((w) => ({ id: `join:${w.word}`, label: w.word })),
  reading: READING_LESSONS.map((r) => ({ id: `reading:${r.id}`, label: r.ar })),
  surahs: SHORT_SURAHS_FOR_KIDS.map((n) => ({ id: `surah:${n}`, label: surah(n).ar })),
}
export const ROOM_META: { id: RoomId; ar: string; sub: string; icon: string }[] = [
  { id: 'letters', ar: 'الحروف', sub: 'الحروف وأصواتها', icon: 'letters' },
  { id: 'harakat', ar: 'الحركات', sub: 'فتحة، كسرة، ضمّة…', icon: 'sparkle' },
  { id: 'joining', ar: 'وصل الحروف', sub: 'اصنع كلمة', icon: 'layers' },
  { id: 'reading', ar: 'القراءة', sub: 'تمارين قصيرة', icon: 'book' },
  { id: 'surahs', ar: 'السور القصيرة', sub: 'اقرأ وكرّر مع وليّ أمرك', icon: 'heart' },
]

// ---------------------------------------------------------------- demo scenario (fixed dates, labelled)
const D = (s: string, h = 18) => `${s}T${pad(h)}:00:00`
const draftOf = (d: PlanDraft): PlanDraft => ({ name: d.name, type: d.type, customActivity: d.customActivity, scope: d.scope, unit: d.unit, daily: d.daily, days: [...d.days], workload: d.workload, targetDate: d.targetDate, reminder: d.reminder, primary: d.primary })
/** A new plan record (its first version). */
function newPlan(d: PlanDraft, id: string, createdAt: string, extra: Partial<Plan> = {}): Plan {
  return { ...draftOf(d), id, status: 'active', createdAt, completedAt: null, version: 1, versions: [{ v: 1, from: createdAt, at: createdAt, cfg: coreOf(d) }], schedule: [{ from: createdAt, days: [...d.days] }], verified: null, ...extra }
}
/** Writes one completed task and its activity record. Activity records are canonical (global ayah) only. */
function writeTask(s: PState, p: Plan, date: string, at: string, from: number, to: number, eventId: string, source: Source, demo = false) {
  const activity = activityOf(p)
  const { g0, g1 } = canonicalOf(p, from, to)
  s.tasks.push({ id: `${p.id}:${date}`, planId: p.id, date, at, activity, unit: p.unit, from, to, g0, g1, planVersion: p.version, cfg: coreOf(p), eventId, ...(demo ? { demo } : {}) })
  if (activity === 'hifz') s.memorized.push({ id: eventId, from: g0, to: g1, at, source, eventId })
  else if (activity === 'revision') s.revisions.push({ id: eventId, from: g0, to: g1, at, planId: p.id, source, eventId })
  else s.reading.push({ id: eventId, unit: p.unit, from, to, g0, g1, at, planId: p.id, source, eventId })
}
function demoState(): PState {
  const st = emptyState('demo')
  const plan = (id: string, d: Partial<PlanDraft> & Pick<PlanDraft, 'name' | 'type' | 'scope' | 'unit' | 'daily' | 'days'>, createdAt: string, primary = false): Plan =>
    newPlan({ customActivity: 'hifz', workload: 'moderate', targetDate: null, reminder: null, ...d, primary }, id, createdAt, { demo: true })
  st.plans = [
    plan('demo-hifz', { name: 'حفظ سورة الملك', type: 'hifz', scope: { kind: 'surah', s: 67, from: 1, to: 30 }, unit: 'ayah', daily: 5, days: [6, 0, 1, 2, 3] }, '2026-10-20', true),
    plan('demo-rev', { name: 'مراجعة جزء عمّ', type: 'revision', scope: { kind: 'juz', j: 30 }, unit: 'ayah', daily: 20, days: [6, 0, 1, 2, 3, 4] }, '2026-10-20'),
    plan('demo-khatmah', { name: 'ختمة شهرية', type: 'khatmah', scope: { kind: 'quran' }, unit: 'page', daily: 20, days: [6, 0, 1, 2, 3, 4, 5] }, '2026-10-20'),
  ]
  // Memorisation confirmed before the plans (fixed sample dates).
  const mem = (id: string, a: Pos, b: Pos, at: string) => st.memorized.push({ id, from: gIndex(...a), to: gIndex(...b), at, source: 'demo', eventId: `demo:${id}` })
  mem('fatiha', [1, 1], [1, 7], D('2026-09-02'))
  mem('baqarah', [2, 1], [2, 25], D('2026-09-20'))
  mem('amma', [78, 1], [114, 6], D('2026-10-05'))
  // Completed plan tasks on fixed sample dates.
  const task = (p: Plan, date: string) => {
    const pr = planProgress(st, p)
    const eventId = `task:${p.id}:${date}`
    writeTask(st, p, date, D(date), pr.cursor, Math.min(pr.end, pr.cursor + p.daily - 1), eventId, 'demo', true)
    st.events.push(eventId)
  }
  for (const d of ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']) task(st.plans[0], d)
  for (const d of ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']) task(st.plans[1], d)
  for (const d of ['2026-10-24', '2026-10-25', '2026-10-27', '2026-10-28']) task(st.plans[2], d)
  // Kids: completed lessons on fixed sample dates, one star each.
  const kids = [...KIDS_LESSONS.letters.slice(0, 12), ...KIDS_LESSONS.harakat.slice(0, 3), ...KIDS_LESSONS.surahs.slice(0, 4)]
  kids.forEach((l, i) => {
    const at = D(addDays('2026-10-10', Math.floor(i / 3)), 17)
    const eventId = `lesson:${l.id}`
    st.lessons.push({ id: l.id, at, source: 'demo', eventId })
    st.rewards.push({ id: `star:${l.id}`, kind: 'star', ref: l.id, amount: 1, at, eventId, demo: true })
    st.events.push(eventId)
  })
  award(st, 'demo-seed', D('2026-10-29', 20), true)
  return st
}
function emptyState(seed: PState['seed']): PState {
  return { v: 2, seed, plans: [], tasks: [], memorized: [], revisions: [], reading: [], lessons: [], achievements: {}, kidsBadges: {}, rewards: [], decor: 'garden', steps: {}, events: [] }
}

// ---------------------------------------------------------------- derived (memoised per state object)
export type JuzInfo = { j: number; start: Pos; end: Pos; total: number; memorised: number; status: 'idle' | 'progress' | 'done'; surahs: number[] }
export type Derived = ReturnType<typeof computeDerived>
const cache = new WeakMap<PState, Derived>()
export const derived = (st: PState) => {
  let d = cache.get(st)
  if (!d) cache.set(st, (d = computeDerived(st)))
  return d
}
function computeDerived(st: PState) {
  const mem = new Uint8Array(TOTAL_AYAT + 1)
  for (const r of st.memorized) for (let g = Math.max(1, r.from); g <= Math.min(TOTAL_AYAT, r.to); g++) mem[g] = 1
  const prefix = new Int32Array(TOTAL_AYAT + 1)
  for (let g = 1; g <= TOTAL_AYAT; g++) prefix[g] = prefix[g - 1] + mem[g]
  const memBetween = (g0: number, g1: number) => (g1 < g0 ? 0 : prefix[g1] - prefix[g0 - 1])
  const memCount = prefix[TOTAL_AYAT]
  const juz: JuzInfo[] = JUZ.map((start, i) => {
    const end = juzEnd(i + 1)
    const g0 = gIndex(...start)
    const g1 = gIndex(...end)
    const memorised = memBetween(g0, g1)
    const total = g1 - g0 + 1
    return { j: i + 1, start, end, total, memorised, surahs: SURAHS.filter((s) => gIndex(s.n, 1) <= g1 && gIndex(s.n, s.ayat) >= g0).map((s) => s.n), status: memorised === 0 ? 'idle' : memorised === total ? 'done' : 'progress' }
  })
  const surahMem = (n: number) => memBetween(gIndex(n, 1), gIndex(n, surah(n).ayat))
  const surahsDone = SURAHS.filter((s) => surahMem(s.n) === s.ayat).map((s) => s.n)
  // Activity days: any explicit adult activity record (kids lessons are separate).
  const days = new Set<string>()
  for (const r of [...st.tasks, ...st.memorized, ...st.revisions, ...st.reading]) days.add(r.at.slice(0, 10))
  const weekDays = new Map<string, number>()
  for (const d of days) weekDays.set(weekStart(d), (weekDays.get(weekStart(d)) ?? 0) + 1)
  // Revision goals, evaluated only on dates/weeks that already have records, with the study days in force then.
  const revPlans = st.plans.filter((p) => activityOf(p) === 'revision')
  const scheduledOn = (plans: Plan[], d: string) => plans.filter((p) => daysOn(p, d).includes(dow(d)) && p.createdAt <= d)
  const doneOn = (d: string, act?: Activity) => st.tasks.filter((t) => t.date === d && (!act || t.activity === act))
  const revDates = [...new Set(st.tasks.filter((t) => t.activity === 'revision').map((t) => t.date))]
  const revGoalDays = revDates.filter((d) => {
    const sch = scheduledOn(revPlans, d)
    return sch.length > 0 && sch.every((p) => doneOn(d, 'revision').some((t) => t.planId === p.id))
  })
  const t0 = today()
  const fullWeek = (ws: string, plans: Plan[], act?: Activity) => {
    if (addDays(ws, 6) >= t0) return false // only finished weeks count
    let n = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i)
      for (const p of scheduledOn(plans, d)) {
        n++
        if (!doneOn(d, act).some((t) => t.planId === p.id)) return false
      }
    }
    return n > 0
  }
  const taskWeeks = [...new Set(st.tasks.map((t) => weekStart(t.date)))]
  const revWeeks = taskWeeks.filter((w) => fullWeek(w, revPlans, 'revision'))
  const planWeeks = taskWeeks.filter((w) => fullWeek(w, st.plans.filter((p) => p.status !== 'archived' || p.completedAt)))
  const progress = new Map(st.plans.map((p) => [p.id, planProgress(st, p)]))
  // Only a recorded task that reached the target counts; manual close / status edits never do.
  const reached = st.plans.filter((p) => p.verified)
  const longReached = reached.filter((p) => daysBetween(p.createdAt, p.verified!.at.slice(0, 10)) >= 30)
  const stars = st.rewards.filter((r) => r.kind === 'star').reduce((n, r) => n + r.amount, 0)
  const lessonsDone = new Set(st.lessons.map((l) => l.id))
  const rooms = ROOM_META.map((m) => {
    const ls = KIDS_LESSONS[m.id]
    const done = ls.filter((l) => lessonsDone.has(l.id)).length
    return { ...m, lessons: ls, total: ls.length, done, items: ls.map((l) => l.label) }
  })
  return {
    mem, memBetween, memCount, juz, surahMem, surahsDone, activeDays: days.size, consistentWeeks: [...weekDays.values()].filter((n) => n >= 3).length,
    revSessions: st.revisions.length, revGoalDays: revGoalDays.length, revWeeks: revWeeks.length, planWeeks: planWeeks.length,
    plansCompleted: reached.length, reached: reached.length, longReached: longReached.length,
    progress, stars, lessonsDone, rooms, lastReading: [...st.reading].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null,
  }
}
export type Room = Derived['rooms'][number]

// ---------------------------------------------------------------- plan progress & tasks
/**
 * Progress of the plan's current configuration, from the canonical ranges of its
 * recorded tasks of the same activity (any version). A unit change therefore
 * never reinterprets old records: an ayah range stays an ayah range.
 */
export function planProgress(st: PState, p: Plan) {
  const r = planRange(p)
  const [G0, G1] = scopeAyat(p.scope)
  const act = activityOf(p)
  const records = st.tasks.filter((t) => t.planId === p.id)
  const cov = new Uint8Array(Math.max(0, G1 - G0 + 1))
  for (const t of records) if (t.activity === act) for (let g = Math.max(t.g0, G0); g <= Math.min(t.g1, G1); g++) cov[g - G0] = 1
  let first = G0
  while (first <= G1 && cov[first - G0]) first++
  let cursor: number
  let done: number
  if (first > G1) (cursor = r.end + 1), (done = r.total)
  else if (p.unit === 'ayah') (cursor = first), (done = first - G0)
  else (cursor = Math.max(r.start, pageOf(...fromGIndex(first)))), (done = cursor - r.start)
  return { ...r, g0: G0, g1: G1, done, cursor, pct: r.total ? done / r.total : 0, records }
}
export type TaskState = 'done' | 'open' | 'upcoming' | 'unrecorded' | 'paused'
/** `from`/`to` in the plan's unit; `g0`/`g1` canonical. `stepKey` identifies the confirmed steps of this exact range. */
export type Task = { id: string; plan: Plan; date: string; state: TaskState; activity: Activity; unit: Unit; from: number | null; to: number | null; g0: number | null; g1: number | null; stepKey: string | null; record?: TaskRecord }
/** Tasks of one plan over the given dates (ascending). Ranges come from the plan's real cursor. */
export function planTasks(st: PState, p: Plan, dates: string[], t0 = today()): Task[] {
  const pr = planProgress(st, p)
  let cursor = pr.cursor
  const out: Task[] = []
  const live = p.status === 'active' || p.status === 'paused'
  for (const date of dates) {
    const base = { id: `${p.id}:${date}`, plan: p, date, activity: activityOf(p), unit: p.unit }
    const rec = pr.records.find((r) => r.date === date)
    if (rec) {
      out.push({ ...base, unit: rec.unit, activity: rec.activity, state: 'done', from: rec.from, to: rec.to, g0: rec.g0, g1: rec.g1, stepKey: taskStepKey(p.id, date, rec.unit, rec.from, rec.to), record: rec })
      continue
    }
    if (!daysOn(p, date).includes(dow(date)) || date < p.createdAt || !live || cursor > pr.end) continue
    if (p.status === 'paused') {
      if (date >= t0) out.push({ ...base, state: 'paused', from: null, to: null, g0: null, g1: null, stepKey: null })
      continue
    }
    const to = Math.min(pr.end, cursor + p.daily - 1)
    const c = canonicalOf(p, cursor, to)
    const task = { ...base, from: cursor, to, g0: c.g0, g1: c.g1, stepKey: taskStepKey(p.id, date, p.unit, cursor, to) }
    // An earlier unrecorded day shows the range it would record, without moving the cursor for later days.
    if (date < t0) {
      out.push({ ...task, state: 'unrecorded' })
      continue
    }
    out.push({ ...task, state: date === t0 ? 'open' : 'upcoming' })
    cursor = to + 1
  }
  return out
}
/** The steps a task requires before it can be recorded (chunks for memorisation, pages / passages for revision). */
export const taskSegments = (t: Pick<Task, 'activity' | 'unit' | 'from' | 'to' | 'g0' | 'g1' | 'plan'>) =>
  t.from == null || t.to == null || t.g0 == null || t.g1 == null ? [] : segmentsOf(t.activity, t.unit, t.from, t.to, t.g0, t.g1, scopeAyat(t.plan.scope))
/** Not started / in progress / completed — from recorded steps, never from merely opening a task. */
export function taskProgress(st: PState, t: Task) {
  const segs = taskSegments(t)
  const done = t.stepKey ? stepsDone(st, t.stepKey, segs) : 0
  const phase: 'done' | 'progress' | 'idle' = t.state === 'done' ? 'done' : done > 0 ? 'progress' : 'idle'
  return { segs, done, total: segs.length, phase }
}
export const PHASE_AR = { idle: 'لم تبدأ', progress: 'قيد الإنجاز', done: 'مكتملة' } as const
export function weekTasks(st: PState, dates = weekDates(), t0 = today()) {
  const all = st.plans.flatMap((p) => planTasks(st, p, dates, t0))
  return dates.map((date) => ({ date, dow: dow(date), today: date === t0, past: date < t0, tasks: all.filter((t) => t.date === date).sort((a, b) => Number(b.plan.primary) - Number(a.plan.primary)) }))
}
export function nextTask(st: PState, p: Plan, t0 = today()) {
  if (p.status !== 'active') return null
  const dates = Array.from({ length: 14 }, (_, i) => addDays(t0, i))
  return planTasks(st, p, dates, t0).find((t) => t.state === 'open' || t.state === 'upcoming') ?? null
}

// ---------------------------------------------------------------- achievements
type Eval = { p: number; evidence: string }
export type AchDef = { id: string; group: 'hifz' | 'juz' | 'revision' | 'consistency' | 'plans'; ar: string; icon: string; eval: (d: Derived) => Eval; hidden?: (d: Derived) => boolean }
const ratio = (v: number, n: number) => Math.min(1, v / n)
const count = (v: number, n: number, unit: string): Eval => ({ p: ratio(v, n), evidence: `${toAr(Math.min(v, n))} من ${toAr(n)} ${unit}` })
const memAch = (n: number, ar: string): AchDef => ({ id: `mem-${n}`, group: 'hifz', ar, icon: n === 1 ? 'sprout' : 'star', eval: (d) => count(d.memCount, n, 'آية محفوظة بتأكيد') })
export const ACHIEVEMENTS: AchDef[] = [
  memAch(1, 'أول آية محفوظة'),
  { id: 'first-surah', group: 'hifz', ar: 'أول سورة كاملة', icon: 'shield', eval: (d) => ({ p: d.surahsDone.length ? 1 : 0, evidence: d.surahsDone.length ? `${toAr(d.surahsDone.length)} سورة محفوظة كاملة` : 'لا توجد سورة مكتملة بعد' }) },
  memAch(50, '٥٠ آية محفوظة'),
  memAch(100, '١٠٠ آية محفوظة'),
  memAch(500, '٥٠٠ آية محفوظة'),
  memAch(1000, '١٠٠٠ آية محفوظة'),
  ...Array.from({ length: 30 }, (_, i): AchDef => ({
    id: `juz-${i + 1}`, group: 'juz', ar: `أتممت حفظ الجزء ${toAr(i + 1)}`, icon: 'book',
    eval: (d) => count(d.juz[i].memorised, d.juz[i].total, 'آية'),
    hidden: (d) => d.juz[i].memorised === 0,
  })),
  { id: 'rev-1', group: 'revision', ar: 'أول مراجعة مكتملة', icon: 'repeat', eval: (d) => count(d.revSessions, 1, 'مراجعة') },
  { id: 'rev-10', group: 'revision', ar: '١٠ مراجعات مكتملة', icon: 'repeat', eval: (d) => count(d.revSessions, 10, 'مراجعات') },
  { id: 'rev-50', group: 'revision', ar: '٥٠ مراجعة مكتملة', icon: 'repeat', eval: (d) => count(d.revSessions, 50, 'مراجعة') },
  { id: 'rev-day', group: 'revision', ar: 'أتممت مراجعة يومك كاملة', icon: 'check', eval: (d) => ({ p: d.revGoalDays ? 1 : 0, evidence: d.revGoalDays ? `${toAr(d.revGoalDays)} يوم اكتملت فيه كل مهام المراجعة` : 'أتمم كل مهام المراجعة المجدولة في يوم واحد' }) },
  { id: 'rev-week', group: 'revision', ar: 'هدف المراجعة الأسبوعي', icon: 'calendar', eval: (d) => ({ p: d.revWeeks ? 1 : 0, evidence: d.revWeeks ? `${toAr(d.revWeeks)} أسبوع مكتمل المراجعة` : 'أسبوع منتهٍ أُتمّت فيه كل مهام المراجعة' }) },
  { id: 'day-1', group: 'consistency', ar: 'أول يوم نشط', icon: 'sun', eval: (d) => count(d.activeDays, 1, 'يوم') },
  { id: 'day-3', group: 'consistency', ar: 'ثلاثة أيام نشطة', icon: 'sun', eval: (d) => count(d.activeDays, 3, 'أيام (ليست متتالية بالضرورة)') },
  { id: 'day-7', group: 'consistency', ar: 'سبعة أيام نشطة', icon: 'sun', eval: (d) => count(d.activeDays, 7, 'أيام (ليست متتالية بالضرورة)') },
  { id: 'week-1', group: 'consistency', ar: 'أسبوع ثابت', icon: 'calendar', eval: (d) => count(d.consistentWeeks, 1, 'أسبوع فيه ٣ أيام نشطة') },
  { id: 'week-4', group: 'consistency', ar: 'أربعة أسابيع ثابتة', icon: 'calendar', eval: (d) => count(d.consistentWeeks, 4, 'أسابيع فيها ٣ أيام نشطة') },
  { id: 'plan-done', group: 'plans', ar: 'أول خطة مكتملة', icon: 'target', eval: (d) => count(d.plansCompleted, 1, 'خطة') },
  { id: 'plan-week', group: 'plans', ar: 'أول أسبوع مكتمل المهام', icon: 'calendar', eval: (d) => ({ p: d.planWeeks ? 1 : 0, evidence: d.planWeeks ? `${toAr(d.planWeeks)} أسبوع أُتمّت فيه كل المهام` : 'أسبوع منتهٍ أُتمّت فيه كل مهام خططك' }) },
  { id: 'plan-target', group: 'plans', ar: 'بلغت هدف خطة', icon: 'target', eval: (d) => count(d.reached, 1, 'خطة بلغت هدفها') },
  { id: 'plan-long', group: 'plans', ar: 'أتممت خطة طويلة المدى', icon: 'path', eval: (d) => ({ p: d.longReached ? 1 : 0, evidence: d.longReached ? 'خطة بلغت هدفها بعد ٣٠ يومًا أو أكثر' : 'خطة تبلغ هدفها بعد ٣٠ يومًا أو أكثر من بدئها' }) },
]
export const KIDS_BADGES: { id: string; ar: string; icon: string; eval: (d: Derived) => Eval }[] = [
  { id: 'kb-letters', ar: 'صديق الحروف', icon: 'letters', eval: (d) => count(d.rooms[0].done, 10, 'حروف') },
  { id: 'kb-harakat', ar: 'بطل الحركات', icon: 'sparkle', eval: (d) => count(d.rooms[1].done, d.rooms[1].total, 'حركات') },
  { id: 'kb-join', ar: 'أول كلمة موصولة', icon: 'layers', eval: (d) => count(d.rooms[2].done, 1, 'كلمة') },
  { id: 'kb-reading', ar: 'قارئ صغير', icon: 'book', eval: (d) => count(d.rooms[3].done, 1, 'درس قراءة') },
  { id: 'kb-surahs', ar: 'حافظ السور القصيرة', icon: 'heart', eval: (d) => count(d.rooms[4].done, 3, 'سور أكّدها وليّ الأمر') },
]
/** Stores newly satisfied achievements once, with date and triggering event. Never removes any. Called only for real progress events. */
function award(st: PState, eventId: string, at: string, demo = false) {
  const d = computeDerived(st)
  for (const a of ACHIEVEMENTS) {
    if (st.achievements[a.id] || a.eval(d).p < 1) continue
    st.achievements[a.id] = { id: a.id, at, eventId, demo }
    st.rewards.push({ id: `badge:${a.id}`, kind: 'badge', ref: a.id, amount: 1, at, eventId, demo })
  }
  for (const b of KIDS_BADGES) {
    if (st.kidsBadges[b.id] || b.eval(d).p < 1) continue
    st.kidsBadges[b.id] = { id: b.id, at, eventId, demo }
    st.rewards.push({ id: `kbadge:${b.id}`, kind: 'kids-badge', ref: b.id, amount: 1, at, eventId, demo })
  }
}

// ---------------------------------------------------------------- store & migration
export type StorageStatus = 'ok' | 'unavailable' | 'recovered'
let storage: StorageStatus = 'ok'
const clampPage = (n: number) => Math.min(604, Math.max(1, Math.round(n) || 1))
/**
 * v1 → v2 (backward compatible, preview only). Adds canonical ranges, plan versions and
 * steps; repairs memorisation / revision records that v1 wrote with PAGE numbers as if
 * they were global ayah indices (page-unit tasks), by resolving them through PAGES.
 * Manually "completed" v1 plans become `closed`; earned achievements are kept as they are.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(input: any): PState {
  if (!input || typeof input !== 'object' || (input.v !== 1 && input.v !== 2)) throw new Error('bad shape')
  // Missing collections default to empty; individual invalid records are handled by `normalize`.
  const arr = (x: unknown) => (Array.isArray(x) ? x : [])
  const raw = { ...input, plans: arr(input.plans), tasks: arr(input.tasks), events: arr(input.events), memorized: arr(input.memorized), revisions: arr(input.revisions), reading: arr(input.reading) }
  if (raw.v === 2) return { ...emptyState(raw.seed === 'demo' ? 'demo' : 'empty'), ...raw, steps: raw.steps ?? {} }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v1Tasks = raw.tasks as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans: Plan[] = (raw.plans as any[]).map((p) => {
    const recs = v1Tasks.filter((t) => t.planId === p.id).sort((a, b) => String(a.at).localeCompare(String(b.at)))
    const auto = p.status === 'completed' && !!p.autoCompleted && recs.length > 0
    const last = recs[recs.length - 1]
    return {
      ...p,
      status: p.status === 'completed' && !auto ? 'closed' : p.status,
      completedAt: auto ? p.completedAt : null,
      version: 1,
      versions: [{ v: 1, from: p.createdAt, at: p.createdAt, cfg: coreOf(p) }],
      schedule: [{ from: p.createdAt, days: [...p.days] }],
      verified: auto ? { at: last.at, eventId: last.eventId, version: 1 } : null,
    }
  })
  const byId = new Map(plans.map((p) => [p.id, p]))
  const tasks: TaskRecord[] = v1Tasks.map((t) => {
    const p = byId.get(t.planId)
    const from = t.unit === 'page' ? clampPage(t.from) : t.from
    const to = t.unit === 'page' ? clampPage(t.to) : t.to
    const c = toCanonical(t.unit, from, to, p ? scopeAyat(p.scope) : undefined)
    const cfg: CoreCfg = p ? { ...coreOf(p), unit: t.unit } : { type: t.activity, customActivity: t.activity, scope: { kind: 'quran' }, unit: t.unit, daily: to - from + 1 }
    return { ...t, from, to, ...c, planVersion: 1, cfg, migrated: true }
  })
  const fromTask = new Map(tasks.map((t) => [t.eventId, t]))
  const fixPages = <R extends { eventId: string; from: number; to: number }>(r: R): R => {
    const t = fromTask.get(r.eventId)
    return t && t.unit === 'page' ? { ...r, from: t.g0, to: t.g1 } : r
  }
  return {
    ...emptyState(raw.seed === 'demo' ? 'demo' : 'empty'),
    ...raw,
    v: 2,
    plans,
    tasks,
    memorized: raw.memorized.map(fixPages),
    revisions: raw.revisions.map(fixPages),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reading: (raw.reading as any[]).map((r) => {
      const t = fromTask.get(r.eventId)
      return t ? { ...r, g0: t.g0, g1: t.g1 } : { ...r, ...toCanonical(r.unit, r.unit === 'page' ? clampPage(r.from) : r.from, r.unit === 'page' ? clampPage(r.to) : r.to) }
    }),
    steps: {},
  }
}
const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const okG = (a: unknown, b: unknown) => isInt(a) && isInt(b) && a >= 1 && b <= TOTAL_AYAT && a <= b
/**
 * Makes a parsed state safe to use: fills fields added in later versions and leaves out only
 * records that cannot be interpreted (they would otherwise break every screen). Returns how
 * many records were left out, so the caller keeps a full copy of the original first.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalize(s: PState): { state: PState; dropped: number } {
  let dropped = 0
  const keep = <T,>(xs: unknown[], fix: (x: any) => T | null): T[] => // eslint-disable-line @typescript-eslint/no-explicit-any
    xs.flatMap((x) => {
      try {
        const r = isObj(x) ? fix(x) : null
        if (r) return [r]
      } catch {
        /* uninterpretable record */
      }
      dropped++
      return []
    })
  const plans = keep<Plan>(s.plans, (p) => {
    if (typeof p.id !== 'string' || !isObj(p.scope) || (p.unit !== 'ayah' && p.unit !== 'page') || !isInt(p.daily) || !Array.isArray(p.days)) return null
    scopeAyat(p.scope as Scope) // throws for an unknown scope
    const createdAt = typeof p.createdAt === 'string' ? p.createdAt : today()
    return {
      ...p,
      createdAt,
      version: isInt(p.version) ? p.version : 1,
      versions: Array.isArray(p.versions) && p.versions.length ? p.versions : [{ v: 1, from: createdAt, at: createdAt, cfg: coreOf(p as Plan) }],
      schedule: Array.isArray(p.schedule) && p.schedule.length ? p.schedule : [{ from: createdAt, days: [...p.days] }],
      verified: isObj(p.verified) ? p.verified : null,
      completedAt: typeof p.completedAt === 'string' ? p.completedAt : null,
    } as Plan
  })
  const scopes = new Map(plans.map((p) => [p.id, scopeAyat(p.scope)]))
  const tasks = keep<TaskRecord>(s.tasks, (t) => {
    if (typeof t.planId !== 'string' || typeof t.date !== 'string' || typeof t.at !== 'string' || (t.unit !== 'ayah' && t.unit !== 'page') || !isInt(t.from) || !isInt(t.to) || !['hifz', 'revision', 'reading'].includes(t.activity)) return null
    const c = okG(t.g0, t.g1) ? { g0: t.g0, g1: t.g1 } : toCanonical(t.unit, t.unit === 'page' ? clampPage(t.from) : t.from, t.unit === 'page' ? clampPage(t.to) : t.to, scopes.get(t.planId))
    if (!okG(c.g0, c.g1)) return null
    return { ...t, ...c, eventId: typeof t.eventId === 'string' ? t.eventId : `task:${t.planId}:${t.date}`, planVersion: isInt(t.planVersion) ? t.planVersion : 1, cfg: isObj(t.cfg) ? t.cfg : { type: t.activity, customActivity: t.activity, scope: { kind: 'quran' }, unit: t.unit, daily: t.to - t.from + 1 } } as TaskRecord
  })
  const ranged = <T extends { from: number; to: number }>(xs: unknown[]) => keep<T>(xs, (r) => (okG(r.from, r.to) && typeof r.at === 'string' ? (r as T) : null))
  const reading = keep<ReadRecord>(s.reading, (r) => {
    if ((r.unit !== 'ayah' && r.unit !== 'page') || !isInt(r.from) || !isInt(r.to) || typeof r.at !== 'string') return null
    const c = okG(r.g0, r.g1) ? { g0: r.g0, g1: r.g1 } : toCanonical(r.unit, r.unit === 'page' ? clampPage(r.from) : r.from, r.unit === 'page' ? clampPage(r.to) : r.to)
    return okG(c.g0, c.g1) ? ({ ...r, ...c } as ReadRecord) : null
  })
  const state: PState = {
    ...s,
    v: 2,
    seed: s.seed === 'demo' ? 'demo' : 'empty',
    plans,
    tasks,
    memorized: ranged<MemRecord>(s.memorized),
    revisions: ranged<RevRecord>(s.revisions),
    reading,
    lessons: keep<LessonRecord>(Array.isArray(s.lessons) ? s.lessons : [], (l) => (typeof l.id === 'string' ? (l as LessonRecord) : null)),
    rewards: keep<RewardTx>(Array.isArray(s.rewards) ? s.rewards : [], (r) => (typeof r.id === 'string' && typeof r.amount === 'number' ? (r as RewardTx) : null)),
    achievements: isObj(s.achievements) ? s.achievements : {},
    kidsBadges: isObj(s.kidsBadges) ? s.kidsBadges : {},
    steps: isObj(s.steps) ? s.steps : {},
    decor: typeof s.decor === 'string' ? s.decor : 'garden',
    events: s.events.filter((e) => typeof e === 'string'),
  }
  return { state, dropped }
}
let migrated = false
function load(): PState {
  const { raw, blocked } = readRaw(STORAGE_KEY)
  if (blocked) {
    storage = 'unavailable'
    return demoState()
  }
  if (!raw) return demoState()
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.v === 1) {
      // Keep the original payload untouched before upgrading it.
      if (!readRaw(STORAGE_BACKUP_KEY).raw) safeWrite(STORAGE_BACKUP_KEY, raw)
      migrated = true
    }
    const { state: st, dropped } = normalize(migrate(parsed))
    if (dropped > 0) {
      // Keep a full copy before the cleaned state can ever be written over it.
      quarantine(STORAGE_KEY, raw, true)
      storage = 'recovered'
    }
    return st
  } catch {
    // Unreadable: never discard it. A copy is kept and the preview starts empty (not with demo data
    // that could be mistaken for the user's own), and says so in Arabic.
    quarantine(STORAGE_KEY, raw)
    storage = 'recovered'
    return emptyState('empty')
  }
}
let state: PState = load()
const subs = new Set<() => void>()
function save() {
  if (safeWrite(STORAGE_KEY, JSON.stringify(state))) {
    if (storage === 'unavailable') storage = 'ok'
  } else storage = 'unavailable'
}
function publish(next: PState) {
  state = next
  save()
  subs.forEach((f) => f())
}
// The first visit writes the demo scenario under the preview key, so it is visible and resettable.
// A recovered (unreadable) value is only replaced after its copy exists and the user acts.
if ((storage as StorageStatus) === 'ok' && (!readRaw(STORAGE_KEY).raw || migrated)) save()
const clone = (s: PState): PState => ({ ...s, plans: [...s.plans], tasks: [...s.tasks], memorized: [...s.memorized], revisions: [...s.revisions], reading: [...s.reading], lessons: [...s.lessons], achievements: { ...s.achievements }, kidsBadges: { ...s.kidsBadges }, rewards: [...s.rewards], steps: { ...s.steps }, events: [...s.events] })
/** Applies an idempotent progress event. Returns false when the event was already processed. */
function commit(eventId: string, fn: (s: PState) => void | false): boolean {
  if (state.events.includes(eventId)) return false
  const next = clone(state)
  if (fn(next) === false) return false
  next.events.push(eventId)
  award(next, eventId, new Date().toISOString())
  publish(next)
  return true
}
/** Plan edits and status changes are administrative: they never evaluate or award achievements. */
function edit(fn: (s: PState) => void) {
  const next = clone(state)
  fn(next)
  publish(next)
}
const nowIso = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 9)

export const usePreview = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)
export const getPreview = () => state
export const storageStatus = () => storage

const normalizePrimary = (s: PState, keep?: string) => {
  const live = s.plans.filter((p) => p.status === 'active' || p.status === 'paused')
  const primary = live.find((p) => p.primary && (!keep || p.id === keep)) ?? live.find((p) => p.primary)
  s.plans = s.plans.map((p) => ({ ...p, primary: !!primary && p.id === primary.id }))
  if (!primary) {
    const first = s.plans.find((p) => p.status === 'active')
    if (first) s.plans = s.plans.map((p) => ({ ...p, primary: p.id === first.id }))
  }
}
/** Whether saving `d` over plan `id` would start a new version (core change after progress exists). */
export const editMakesVersion = (st: PState, id: string, d: PlanDraft) => {
  const p = st.plans.find((x) => x.id === id)
  return !!p && st.tasks.some((t) => t.planId === id) && coreChanged(p, d)
}
const sameDays = (a: number[], b: number[]) => [...a].sort().join() === [...b].sort().join()

export const actions = {
  createPlan(d: PlanDraft) {
    if (Object.keys(validatePlan(d)).length) return null
    const id = `plan-${uid()}`
    edit((s) => {
      s.plans.push(newPlan({ ...d, name: d.name.trim() }, id, today()))
      normalizePrimary(s, d.primary ? id : undefined)
    })
    return id
  },
  /**
   * Saves plan edits. A core change after progress exists appends a new version (from today);
   * recorded tasks keep their own version, unit and ranges. Returns the resulting version.
   */
  updatePlan(id: string, d: PlanDraft): false | { version: number; bumped: boolean } {
    if (Object.keys(validatePlan(d)).length) return false
    const cur = state.plans.find((p) => p.id === id)
    if (!cur) return false
    const bumped = editMakesVersion(state, id, d)
    const t0 = today()
    const version = bumped ? cur.version + 1 : cur.version
    edit((s) => {
      s.plans = s.plans.map((p) => {
        if (p.id !== id) return p
        const versions = bumped ? [...p.versions, { v: version, from: t0, at: nowIso(), cfg: coreOf(d) }] : p.versions.map((x) => (x.v === p.version ? { ...x, cfg: coreOf(d) } : x))
        const schedule = sameDays(p.days, d.days) ? p.schedule : [...p.schedule.filter((x) => x.from < t0), { from: t0, days: [...d.days] }]
        return { ...p, ...draftOf(d), name: d.name.trim(), version, versions, schedule }
      })
      normalizePrimary(s, d.primary ? id : undefined)
    })
    return { version, bumped }
  },
  /** Administrative status change. Asking for `completed` without a verified completion closes the plan instead. */
  setStatus(id: string, status: PlanStatus) {
    edit((s) => {
      s.plans = s.plans.map((p) => {
        if (p.id !== id) return p
        const next: PlanStatus = status === 'completed' && !p.verified ? 'closed' : status
        return { ...p, status: next, autoCompleted: next === 'completed' ? p.autoCompleted : false }
      })
      normalizePrimary(s)
    })
  },
  setPrimary(id: string) {
    edit((s) => {
      s.plans = s.plans.map((p) => ({ ...p, primary: p.id === id }))
      normalizePrimary(s, id)
    })
  },
  /** Removes the plan and its task list. Activity it produced (memorised ayat, revisions, reading) really happened and stays. */
  deletePlan(id: string) {
    edit((s) => {
      s.plans = s.plans.filter((p) => p.id !== id)
      const gone = s.tasks.filter((t) => t.planId === id).map((t) => t.eventId)
      s.tasks = s.tasks.filter((t) => t.planId !== id)
      s.events = s.events.filter((e) => !gone.includes(e))
      normalizePrimary(s)
    })
  },
  /** Explicitly confirms one step (a passage or a page). Memorisation steps also record the passage as memorised. */
  markStep(key: string, segId: string, memorise?: { g0: number; g1: number }) {
    const eventId = `step:${key}:${segId}`
    return commit(eventId, (s) => {
      const at = nowIso()
      s.steps = { ...s.steps, [key]: { ...s.steps[key], [segId]: at } }
      if (memorise) s.memorized.push({ id: eventId, from: memorise.g0, to: memorise.g1, at, source: 'chunk', eventId })
    })
  },
  /**
   * Explicit completion of a scheduled task (today or an unrecorded earlier day), only from its
   * activity flow. Memorisation needs `confirmedMemorised` and every passage confirmed; revision
   * needs every page / passage confirmed; reading needs `confirmedRead`. The range is the plan cursor's.
   */
  completeTask(planId: string, date: string, opts: { confirmedMemorised?: boolean; confirmedRead?: boolean } = {}) {
    const p = state.plans.find((x) => x.id === planId)
    if (!p || p.status !== 'active' || date > today()) return false
    const activity = activityOf(p)
    if (activity === 'hifz' && !opts.confirmedMemorised) return false
    if (activity === 'reading' && !opts.confirmedRead) return false
    const eventId = `task:${planId}:${date}`
    return commit(eventId, (s) => {
      const t = planTasks(s, p, [date])[0]
      if (!t || t.from == null || t.to == null || t.stepKey == null || (t.state !== 'open' && t.state !== 'unrecorded')) return false
      const segs = taskSegments(t)
      if (stepsDone(s, t.stepKey, segs) < segs.length) return false
      const at = nowIso()
      writeTask(s, p, date, at, t.from, t.to, eventId, 'task')
      const pr = planProgress(s, p)
      if (pr.cursor > pr.end) {
        s.plans = s.plans.map((x) => (x.id === planId ? { ...x, status: 'completed', completedAt: today(), autoCompleted: true, verified: { at, eventId, version: x.version } } : x))
        normalizePrimary(s)
      }
    })
  },
  /** Undo only the plan's most recent completion, so later task ranges stay consistent. Earned achievements are never removed. */
  undoTask(planId: string, date: string) {
    const recs = state.tasks.filter((t) => t.planId === planId)
    const last = [...recs].sort((a, b) => b.at.localeCompare(a.at))[0]
    if (!last || last.date !== date || last.demo) return false
    edit((s) => {
      s.tasks = s.tasks.filter((t) => t.eventId !== last.eventId)
      s.memorized = s.memorized.filter((r) => r.eventId !== last.eventId)
      s.revisions = s.revisions.filter((r) => r.eventId !== last.eventId)
      s.reading = s.reading.filter((r) => r.eventId !== last.eventId)
      s.events = s.events.filter((e) => e !== last.eventId)
      s.plans = s.plans.map((p) => (p.id !== planId ? p : { ...p, verified: p.verified?.eventId === last.eventId ? null : p.verified, ...(p.autoCompleted && p.verified?.eventId === last.eventId ? { status: 'active' as const, completedAt: null, autoCompleted: false } : {}) }))
    })
    return true
  },
  canUndo(planId: string, date: string) {
    const last = [...state.tasks.filter((t) => t.planId === planId)].sort((a, b) => b.at.localeCompare(a.at))[0]
    return !!last && last.date === date && !last.demo
  },
  /** «أتقنتها» in the Memorization Journey. An ayah already memorised is not counted again. */
  confirmMemorized(s: number, a: number) {
    const g = gIndex(s, a)
    if (derived(state).mem[g]) return false
    return commit(`mem:journey:${g}`, (x) => void x.memorized.push({ id: `journey:${g}`, from: g, to: g, at: nowIso(), source: 'journey', eventId: `mem:journey:${g}` }))
  },
  /** A completed free revision session (e.g. a Juz from the map). Every passage must be confirmed first. Never adds memorised ayat. */
  recordRevision(sessionId: string, g0: number, g1: number, stepKey: string) {
    const segs = segmentsOf('revision', 'ayah', g0, g1, g0, g1)
    if (stepsDone(state, stepKey, segs) < segs.length) return false
    return commit(`rev:${sessionId}`, (x) => void x.revisions.push({ id: sessionId, from: g0, to: g1, at: nowIso(), planId: null, source: 'session', eventId: `rev:${sessionId}` }))
  },
  /** Kids: a lesson is recorded once and earns exactly one star. */
  completeLesson(lessonId: string) {
    const eventId = `lesson:${lessonId}`
    return commit(eventId, (x) => {
      if (x.lessons.some((l) => l.id === lessonId)) return false
      const at = nowIso()
      x.lessons.push({ id: lessonId, at, source: 'kids', eventId })
      x.rewards.push({ id: `star:${lessonId}`, kind: 'star', ref: lessonId, amount: 1, at, eventId })
    })
  },
  setDecor(id: string) {
    edit((s) => void (s.decor = id))
  },
  reset(to: 'demo' | 'empty') {
    storage = 'ok'
    publish(to === 'demo' ? demoState() : emptyState('empty'))
  },
}

export const isDemoData = (st: PState) => st.seed === 'demo'
export const memorisedLabel = (st: PState, s: number, a: number) => !!derived(st).mem[gIndex(s, a)]
