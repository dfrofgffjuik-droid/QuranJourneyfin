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
import { useSyncExternalStore } from 'react'
import { JUZ, PAGES, SHORT_SURAHS_FOR_KIDS, SURAHS, TOTAL_AYAT, fromGIndex, gIndex, juzEnd, pageEnd, pageOf, surah, toAr, type Pos } from '../../lib/quran'
import { HARAKAT, JOIN_WORDS, LETTERS, READING_LESSONS } from '../../screens/kidsData'

export const STORAGE_KEY = 'quranJourney.nextPreview.v1'

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
export type PlanStatus = 'active' | 'paused' | 'completed' | 'archived'
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
export type Plan = PlanDraft & { id: string; status: PlanStatus; createdAt: string; completedAt: string | null; autoCompleted?: boolean; demo?: boolean }

type Source = 'demo' | 'journey' | 'task' | 'session' | 'kids'
export type TaskRecord = { id: string; planId: string; date: string; at: string; activity: Activity; unit: Unit; from: number; to: number; eventId: string; demo?: boolean }
/** Inclusive global-ayah ranges (gIndex) the user explicitly confirmed as memorised. */
export type MemRecord = { id: string; from: number; to: number; at: string; source: Source; eventId: string }
export type RevRecord = { id: string; from: number; to: number; at: string; planId: string | null; source: Source; eventId: string }
export type ReadRecord = { id: string; unit: Unit; from: number; to: number; at: string; planId: string | null; source: Source; eventId: string }
export type LessonRecord = { id: string; at: string; source: Source; eventId: string }
export type Earned = { id: string; at: string; eventId: string; demo?: boolean }
export type RewardTx = { id: string; kind: 'star' | 'badge' | 'kids-badge'; ref: string; amount: number; at: string; eventId: string; demo?: boolean }

export type PState = {
  v: 1
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
export const STATUS_AR: Record<PlanStatus, string> = { active: 'نشطة', paused: 'متوقّفة مؤقتًا', completed: 'مكتملة', archived: 'مؤرشفة' }

/** Start/end positions of a scope, in ayah terms. */
function scopeAyat(sc: Scope): [number, number] {
  if (sc.kind === 'quran') return [1, TOTAL_AYAT]
  if (sc.kind === 'surah') return [gIndex(sc.s, sc.from), gIndex(sc.s, sc.to)]
  if (sc.kind === 'juz') return [gIndex(...JUZ[sc.j - 1]), gIndex(...juzEnd(sc.j))]
  if (sc.kind === 'range') return [gIndex(...sc.from), gIndex(...sc.to)]
  return [gIndex(...PAGES[sc.from - 1]), gIndex(...pageEnd(sc.to))]
}
/** The plan's unit range: global ayah indices, or Madinah page numbers. */
export function planRange(p: Pick<PlanDraft, 'scope' | 'unit'>) {
  const [g0, g1] = scopeAyat(p.scope)
  if (p.unit === 'ayah') return { start: g0, end: g1, total: g1 - g0 + 1 }
  const s = p.scope.kind === 'pages' ? p.scope.from : p.scope.kind === 'quran' ? 1 : pageOf(...fromGIndex(g0))
  const e = p.scope.kind === 'pages' ? p.scope.to : p.scope.kind === 'quran' ? 604 : pageOf(...fromGIndex(g1))
  return { start: s, end: e, total: e - s + 1 }
}
export function rangeAr(unit: Unit, from: number, to: number) {
  if (unit === 'page') return from === to ? `ص ${toAr(from)}` : `ص ${toAr(from)}–${toAr(to)}`
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
  { id: 'surahs', ar: 'السور القصيرة', sub: 'استمع وكرّر', icon: 'heart' },
]

// ---------------------------------------------------------------- demo scenario (fixed dates, labelled)
const D = (s: string, h = 18) => `${s}T${pad(h)}:00:00`
function demoState(): PState {
  const st = emptyState('demo')
  const plan = (id: string, d: Partial<PlanDraft> & Pick<PlanDraft, 'name' | 'type' | 'scope' | 'unit' | 'daily' | 'days'>, createdAt: string, primary = false): Plan => ({
    id, customActivity: 'hifz', workload: 'moderate', targetDate: null, reminder: null, ...d, primary, status: 'active', createdAt, completedAt: null, demo: true,
  })
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
    const r = planRange(p)
    const done = st.tasks.filter((t) => t.planId === p.id).reduce((n, t) => n + t.to - t.from + 1, 0)
    const from = r.start + done
    const to = Math.min(r.end, from + p.daily - 1)
    const eventId = `task:${p.id}:${date}`
    const at = D(date)
    const activity = activityOf(p)
    st.tasks.push({ id: `${p.id}:${date}`, planId: p.id, date, at, activity, unit: p.unit, from, to, eventId, demo: true })
    if (activity === 'hifz') st.memorized.push({ id: eventId, from, to, at, source: 'demo', eventId })
    else if (activity === 'revision') st.revisions.push({ id: eventId, from, to, at, planId: p.id, source: 'demo', eventId })
    else st.reading.push({ id: eventId, unit: p.unit, from, to, at, planId: p.id, source: 'demo', eventId })
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
  return { v: 1, seed, plans: [], tasks: [], memorized: [], revisions: [], reading: [], lessons: [], achievements: {}, kidsBadges: {}, rewards: [], decor: 'garden', events: [] }
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
  for (const r of st.memorized) for (let g = r.from; g <= r.to; g++) mem[g] = 1
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
  // Revision goals, evaluated only on dates/weeks that already have records.
  const revPlans = st.plans.filter((p) => activityOf(p) === 'revision')
  const scheduledOn = (plans: Plan[], d: string) => plans.filter((p) => p.days.includes(dow(d)) && p.createdAt <= d)
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
  const reached = st.plans.filter((p) => progress.get(p.id)!.done >= progress.get(p.id)!.total)
  const longReached = reached.filter((p) => p.completedAt && daysBetween(p.createdAt, p.completedAt) >= 30)
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
    plansCompleted: st.plans.filter((p) => p.completedAt).length, reached: reached.length, longReached: longReached.length,
    progress, stars, lessonsDone, rooms, lastReading: [...st.reading].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null,
  }
}
export type Room = Derived['rooms'][number]

// ---------------------------------------------------------------- plan progress & tasks
export function planProgress(st: PState, p: Plan) {
  const r = planRange(p)
  const recs = st.tasks.filter((t) => t.planId === p.id)
  const done = Math.min(r.total, recs.reduce((n, t) => n + t.to - t.from + 1, 0))
  return { ...r, done, cursor: r.start + done, pct: r.total ? done / r.total : 0, records: recs }
}
export type TaskState = 'done' | 'open' | 'upcoming' | 'unrecorded' | 'paused'
export type Task = { id: string; plan: Plan; date: string; state: TaskState; activity: Activity; unit: Unit; from: number | null; to: number | null; record?: TaskRecord }
/** Tasks of one plan over the given dates (ascending). Ranges come from the plan's real cursor. */
export function planTasks(st: PState, p: Plan, dates: string[], t0 = today()): Task[] {
  const pr = planProgress(st, p)
  let cursor = pr.cursor
  const out: Task[] = []
  for (const date of dates) {
    const base = { id: `${p.id}:${date}`, plan: p, date, activity: activityOf(p), unit: p.unit }
    const rec = pr.records.find((r) => r.date === date)
    if (rec) {
      out.push({ ...base, state: 'done', from: rec.from, to: rec.to, record: rec })
      continue
    }
    if (!p.days.includes(dow(date)) || date < p.createdAt || p.status === 'archived' || p.status === 'completed' || cursor > pr.end) continue
    if (p.status === 'paused') {
      if (date >= t0) out.push({ ...base, state: 'paused', from: null, to: null })
      continue
    }
    if (date < t0) {
      out.push({ ...base, state: 'unrecorded', from: null, to: null })
      continue
    }
    const to = Math.min(pr.end, cursor + p.daily - 1)
    out.push({ ...base, state: date === t0 ? 'open' : 'upcoming', from: cursor, to })
    cursor = to + 1
  }
  return out
}
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
/** Stores newly satisfied achievements once, with date and triggering event. Never removes any. */
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

// ---------------------------------------------------------------- store
export type StorageStatus = 'ok' | 'unavailable' | 'recovered'
let storage: StorageStatus = 'ok'
function load(): PState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoState()
    const s = JSON.parse(raw) as PState
    if (s?.v !== 1 || !Array.isArray(s.plans) || !Array.isArray(s.events)) throw new Error('bad shape')
    return s
  } catch (e) {
    storage = e instanceof SyntaxError || (e as Error)?.message === 'bad shape' ? 'recovered' : 'unavailable'
    return demoState()
  }
}
let state: PState = load()
const subs = new Set<() => void>()
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (storage === 'unavailable') storage = 'ok'
  } catch {
    storage = 'unavailable'
  }
}
function publish(next: PState) {
  state = next
  save()
  subs.forEach((f) => f())
}
// The first visit writes the demo scenario under the preview key, so it is visible and resettable.
try {
  if (!localStorage.getItem(STORAGE_KEY)) save()
} catch {
  storage = 'unavailable'
}
const clone = (s: PState): PState => ({ ...s, plans: [...s.plans], tasks: [...s.tasks], memorized: [...s.memorized], revisions: [...s.revisions], reading: [...s.reading], lessons: [...s.lessons], achievements: { ...s.achievements }, kidsBadges: { ...s.kidsBadges }, rewards: [...s.rewards], events: [...s.events] })
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
/** Plan edits are not progress events; they still re-evaluate achievements (e.g. a completed plan). */
function edit(fn: (s: PState) => void) {
  const next = clone(state)
  fn(next)
  award(next, `edit:${Date.now()}`, new Date().toISOString())
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

export const actions = {
  createPlan(d: PlanDraft) {
    if (Object.keys(validatePlan(d)).length) return null
    const id = `plan-${uid()}`
    edit((s) => {
      s.plans.push({ ...d, name: d.name.trim(), id, status: 'active', createdAt: today(), completedAt: null })
      normalizePrimary(s, d.primary ? id : undefined)
    })
    return id
  },
  updatePlan(id: string, d: PlanDraft) {
    if (Object.keys(validatePlan(d)).length) return false
    edit((s) => {
      s.plans = s.plans.map((p) => (p.id === id ? { ...p, ...d, name: d.name.trim() } : p))
      normalizePrimary(s, d.primary ? id : undefined)
    })
    return true
  },
  setStatus(id: string, status: PlanStatus) {
    edit((s) => {
      s.plans = s.plans.map((p) => (p.id !== id ? p : { ...p, status, completedAt: status === 'completed' ? (p.completedAt ?? today()) : status === 'active' && p.status === 'completed' ? null : p.completedAt, autoCompleted: status === 'completed' ? p.autoCompleted : false }))
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
  /**
   * Explicit completion of a scheduled task (today or an unrecorded earlier day).
   * Memorisation tasks require `confirmedMemorised`; the range is taken from the plan cursor.
   */
  completeTask(planId: string, date: string, opts: { confirmedMemorised?: boolean } = {}) {
    const p = state.plans.find((x) => x.id === planId)
    if (!p || p.status !== 'active' || date > today()) return false
    const activity = activityOf(p)
    if (activity === 'hifz' && !opts.confirmedMemorised) return false
    const eventId = `task:${planId}:${date}`
    return commit(eventId, (s) => {
      const pr = planProgress(s, p)
      if (pr.cursor > pr.end || !p.days.includes(dow(date)) || date < p.createdAt) return false
      const from = pr.cursor
      const to = Math.min(pr.end, from + p.daily - 1)
      const at = nowIso()
      s.tasks.push({ id: `${planId}:${date}`, planId, date, at, activity, unit: p.unit, from, to, eventId })
      if (activity === 'hifz') s.memorized.push({ id: eventId, from, to, at, source: 'task', eventId })
      else if (activity === 'revision') s.revisions.push({ id: eventId, from, to, at, planId, source: 'task', eventId })
      else s.reading.push({ id: eventId, unit: p.unit, from, to, at, planId, source: 'task', eventId })
      if (to >= pr.end) s.plans = s.plans.map((x) => (x.id === planId ? { ...x, status: 'completed', completedAt: today(), autoCompleted: true } : x))
      if (to >= pr.end) normalizePrimary(s)
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
      s.plans = s.plans.map((p) => (p.id === planId && p.autoCompleted ? { ...p, status: 'active', completedAt: null, autoCompleted: false } : p))
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
  /** A completed free revision session (not tied to a plan task). Never adds memorised ayat. */
  recordRevision(sessionId: string, from: number, to: number) {
    return commit(`rev:${sessionId}`, (x) => void x.revisions.push({ id: sessionId, from, to, at: nowIso(), planId: null, source: 'session', eventId: `rev:${sessionId}` }))
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
