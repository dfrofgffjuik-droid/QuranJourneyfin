// Multiple independent learning plans per learner. Memorisation and revision
// plans read real per-ayah progress; reading, khatmah and custom plans count
// completed units (pages or ayat). Everything is local-first.
import { addDays, today } from './date'
import { fromGIndex, gIndex, PAGES, pageEnd, pageOf, surah, TOTAL_AYAT, type Pos } from './quran'
import type { Profile } from './store'

export type PlanKind = 'hifz' | 'revision' | 'reading' | 'khatmah' | 'custom'
export type PlanStatus = 'active' | 'paused' | 'completed' | 'archived'
export type Unit = 'ayah' | 'page'

export type QPlan = {
  id: string
  kind: PlanKind
  name: string
  status: PlanStatus
  start: Pos
  end: Pos
  unit: Unit
  daily: number // units per study day (ayat for hifz/revision)
  days: number[] // study weekdays, 0 = Sunday
  targetDate: string | null
  createdAt: string
  startedAt: string
  completedAt?: string
  done: number // completed units (reading / khatmah / custom)
  log: Record<string, number> // units completed per day (reading / khatmah / custom)
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const WHOLE: [Pos, Pos] = [
  [1, 1],
  [114, 6],
]
export const PLAN_KINDS: { kind: PlanKind; icon: string; ar: string; en: string; dAr: string; dEn: string }[] = [
  { kind: 'hifz', icon: 'sprout', ar: 'خطة حفظ', en: 'Memorisation', dAr: 'سورة أو جزء أو نطاق، بعدد آيات يومي', dEn: 'A surah, juz or range, ayat per day' },
  { kind: 'revision', icon: 'repeat', ar: 'خطة مراجعة', en: 'Revision', dAr: 'مراجعة متباعدة لما حفظته بحسب تذكّرك', dEn: 'Spaced revision of what you know' },
  { kind: 'reading', icon: 'book', ar: 'ورد قراءة يومي', en: 'Daily reading', dAr: 'صفحات أو أجزاء كل يوم', dEn: 'Pages or juz every day' },
  { kind: 'khatmah', icon: 'star', ar: 'ختمة', en: 'Khatmah', dAr: 'ختم القرآن في مدة تختارها', dEn: 'Complete the Quran by a date' },
  { kind: 'custom', icon: 'layers', ar: 'خطة مخصّصة', en: 'Custom', dAr: 'نطاقك ووحدتك وأيامك', dEn: 'Your own range, unit and days' },
]
export const kindMeta = (k: PlanKind) => PLAN_KINDS.find((x) => x.kind === k)!

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function newPlan(p: Partial<QPlan> & Pick<QPlan, 'kind'>): QPlan {
  const unit: Unit = p.kind === 'reading' || p.kind === 'khatmah' ? 'page' : 'ayah'
  return { id: uid(), name: '', status: 'active', start: WHOLE[0], end: WHOLE[1], unit, daily: 3, days: ALL_DAYS, targetDate: null, createdAt: today(), startedAt: today(), done: 0, log: {}, ...p }
}

/** Convert the pre-v2 single memorisation plan. */
export const fromLegacy = (pl: { s: number; from: number; to: number; dailyAyat: number; startedAt: string }): QPlan =>
  newPlan({ kind: 'hifz', start: [pl.s, pl.from], end: [pl.s, pl.to], daily: pl.dailyAyat, startedAt: pl.startedAt, createdAt: pl.startedAt })

// ---------- Units ----------

export const totalUnits = (pl: Pick<QPlan, 'start' | 'end' | 'unit'>) => (pl.unit === 'page' ? pageOf(...pl.end) - pageOf(...pl.start) + 1 : gIndex(...pl.end) - gIndex(...pl.start) + 1)

export function* ayatIn(pl: Pick<QPlan, 'start' | 'end'>): Generator<Pos> {
  for (let g = gIndex(...pl.start), e = gIndex(...pl.end); g <= e; g++) yield fromGIndex(g)
}
const inRange = (pl: Pick<QPlan, 'start' | 'end'>, s: number, a: number) => {
  const g = gIndex(s, a)
  return g >= gIndex(...pl.start) && g <= gIndex(...pl.end)
}

/** Start/end ayah of units [from, to] (1-based within the plan). */
export function unitSpan(pl: QPlan, from: number, to: number): [Pos, Pos] {
  if (pl.unit === 'ayah') return [fromGIndex(gIndex(...pl.start) + from - 1), fromGIndex(gIndex(...pl.start) + to - 1)]
  const p0 = pageOf(...pl.start)
  const a = from === 1 ? pl.start : PAGES[p0 + from - 2]
  const lastPage = p0 + to - 1
  const b = gIndex(...pageEnd(lastPage)) > gIndex(...pl.end) ? pl.end : pageEnd(lastPage)
  return [a, b]
}

// ---------- Progress ----------

export type Progress = { done: number; total: number; today: number; due?: number; overdue?: number }

export function planProgress(p: Profile, pl: QPlan, on = today()): Progress {
  if (pl.kind === 'hifz') {
    let done = 0
    let td = 0
    for (const [s, a] of ayatIn(pl)) {
      const x = p.progress[`${s}:${a}`]
      if (x?.status === 'memorized') {
        done++
        if (x.reviews === 0 && x.last === on) td++
      }
    }
    return { done, total: totalUnits(pl), today: td }
  }
  if (pl.kind === 'revision') {
    let total = 0
    let due = 0
    let overdue = 0
    let td = 0
    for (const [k, x] of Object.entries(p.progress)) {
      if (x.status !== 'memorized') continue
      const [s, a] = k.split(':').map(Number)
      if (!inRange(pl, s, a)) continue
      total++
      if (x.reviews > 0 && x.last === on) td++
      else if (x.due <= on) (due++, x.due < on && overdue++)
    }
    return { done: td, total, today: td, due, overdue }
  }
  return { done: pl.done, total: totalUnits(pl), today: pl.log[on] ?? 0 }
}

export const isStudyDay = (pl: Pick<QPlan, 'days'>, iso: string) => pl.days.includes(new Date(`${iso}T12:00:00`).getDay())

export type Task =
  | { kind: 'hifz'; s: number; from: number; to: number }
  | { kind: 'revision'; ayat: Pos[] }
  | { kind: 'read'; from: number; to: number; span: [Pos, Pos] }

/** What this plan asks for today (null when today's quota is met, it's a rest day, or it's finished). */
export function todayTask(p: Profile, pl: QPlan, ignoreRestDay = false): Task | null {
  if (pl.status !== 'active') return null
  const t = today()
  if (!ignoreRestDay && !isStudyDay(pl, t)) return null
  const pr = planProgress(p, pl)
  const left = Math.max(0, pl.daily - pr.today)
  if (!left) return null
  if (pl.kind === 'hifz') {
    const next: Pos[] = []
    for (const pos of ayatIn(pl)) {
      if (p.progress[`${pos[0]}:${pos[1]}`]?.status === 'memorized') continue
      if (next.length && (pos[0] !== next[0][0] || pos[1] !== next[next.length - 1][1] + 1)) break
      next.push(pos)
      if (next.length >= left) break
    }
    return next.length ? { kind: 'hifz', s: next[0][0], from: next[0][1], to: next[next.length - 1][1] } : null
  }
  if (pl.kind === 'revision') {
    const due = Object.entries(p.progress)
      .filter(([k, x]) => x.status === 'memorized' && x.due <= t && !(x.reviews > 0 && x.last === t) && inRange(pl, ...(k.split(':').map(Number) as Pos)))
      .map(([k, x]) => ({ pos: k.split(':').map(Number) as Pos, due: x.due }))
      .sort((x, y) => x.due.localeCompare(y.due) || gIndex(...x.pos) - gIndex(...y.pos))
      .slice(0, left)
      .map((x) => x.pos)
      .sort((x, y) => gIndex(...x) - gIndex(...y))
    return due.length ? { kind: 'revision', ayat: due } : null
  }
  const total = totalUnits(pl)
  if (pl.done >= total) return null
  const from = pl.done + 1
  const to = Math.min(total, pl.done + left)
  return { kind: 'read', from, to, span: unitSpan(pl, from, to) }
}

/** Days with a workload over the next `n` days, and the estimated finish date. */
export function forecast(p: Profile, pl: QPlan, n = 7) {
  const t = today()
  const pr = planProgress(p, pl)
  const week: { date: string; study: boolean; units: number }[] = []
  if (pl.kind === 'revision') {
    for (let i = 0; i < n; i++) {
      const d = addDays(t, i)
      let c = 0
      for (const [k, x] of Object.entries(p.progress)) if (x.status === 'memorized' && inRange(pl, ...(k.split(':').map(Number) as Pos)) && (i === 0 ? x.due <= d : x.due === d)) c++
      week.push({ date: d, study: isStudyDay(pl, d), units: isStudyDay(pl, d) ? Math.min(c, pl.daily) : 0 })
    }
    return { week, finish: null as string | null, remaining: pr.due ?? 0 }
  }
  let remaining = Math.max(0, pr.total - pr.done)
  const total = remaining
  let finish: string | null = remaining === 0 ? (pl.completedAt ?? t) : null
  for (let i = 0; i < 3660 && (remaining > 0 || week.length < n); i++) {
    const d = addDays(t, i)
    const study = isStudyDay(pl, d) && pl.status === 'active' && pl.daily > 0
    const quota = study ? (i === 0 ? Math.max(0, pl.daily - pr.today) : pl.daily) : 0
    const units = Math.min(quota, remaining)
    remaining -= units
    if (week.length < n) week.push({ date: d, study, units })
    if (!finish && remaining === 0 && total > 0 && units > 0) finish = d
    if (!study && pl.days.length === 0) break
  }
  return { week, finish, remaining: total }
}

export function studyDaysBetween(from: string, to: string, days: number[]) {
  let c = 0
  for (let d = from, i = 0; d <= to && i < 4000; d = addDays(d, 1), i++) if (days.includes(new Date(`${d}T12:00:00`).getDay())) c++
  return c
}
/** Units per study day needed to finish `total` units by `target`. */
export const dailyFor = (total: number, target: string, days: number[], from = today()) => Math.max(1, Math.ceil(total / Math.max(1, studyDaysBetween(from, target, days))))

// ---------- Mutations (pure: Profile -> Profile) ----------

export const withPlans = (p: Profile, fn: (xs: QPlan[]) => QPlan[]): Profile => ({ ...p, plans: fn(p.plans) })
export const patchPlan = (p: Profile, id: string, fn: (x: QPlan) => QPlan) => withPlans(p, (xs) => xs.map((x) => (x.id === id ? fn(x) : x)))

export function addPlan(p: Profile, pl: QPlan, primary = false): Profile {
  const q = withPlans(p, (xs) => [...xs, pl])
  return primary || !activePlans(p).length ? { ...q, primaryPlanId: pl.id } : q
}

/** Record units done today for a reading / khatmah / custom plan. */
export function recordUnits(p: Profile, id: string, units: number): Profile {
  return patchPlan(p, id, (x) => {
    const total = totalUnits(x)
    const add = Math.max(0, Math.min(units, total - x.done))
    const done = x.done + add
    const t = today()
    return { ...x, done, log: { ...x.log, [t]: (x.log[t] ?? 0) + add }, ...(done >= total ? { status: 'completed' as const, completedAt: t } : {}) }
  })
}

export function setStatus(p: Profile, id: string, status: PlanStatus): Profile {
  const q = patchPlan(p, id, (x) => ({ ...x, status, ...(status === 'completed' ? { completedAt: today() } : {}) }))
  if (status !== 'active' && q.primaryPlanId === id) return { ...q, primaryPlanId: activePlans(q)[0]?.id ?? null }
  if (status === 'active' && !q.primaryPlanId) return { ...q, primaryPlanId: id }
  return q
}

/** Re-spread overdue revision in this plan's range across upcoming study days. */
export function spreadOverdue(p: Profile, pl: QPlan): Profile {
  const t = today()
  const over = Object.entries(p.progress)
    .filter(([k, x]) => x.status === 'memorized' && x.due < t && inRange(pl, ...(k.split(':').map(Number) as Pos)))
    .sort(([, x], [, y]) => x.due.localeCompare(y.due))
  if (!over.length) return p
  const progress = { ...p.progress }
  let d = t
  let used = 0
  const cap = Math.max(1, pl.daily)
  for (const [k, x] of over) {
    while (!isStudyDay(pl, d) || used >= cap) (d = addDays(d, 1)), (used = 0)
    progress[k] = { ...x, due: d }
    used++
  }
  return { ...p, progress }
}

// ---------- Selectors ----------

export const activePlans = (p: Profile) => p.plans.filter((x) => x.status === 'active')
export const primaryPlan = (p: Profile) => p.plans.find((x) => x.id === p.primaryPlanId && x.status === 'active') ?? activePlans(p)[0] ?? null
/** The memorisation plan that drives "today's hifz": primary if it is one, else the first active one. */
export const hifzPlanOf = (p: Profile) => {
  const pr = primaryPlan(p)
  return pr?.kind === 'hifz' ? pr : (activePlans(p).find((x) => x.kind === 'hifz') ?? null)
}

export function rangeText(start: Pos, end: Pos, lang: string, N: (n: number) => string) {
  if (start[0] === 1 && start[1] === 1 && end[0] === 114 && end[1] === 6) return lang === 'ar' ? 'القرآن كاملًا' : 'The whole Quran'
  const nm = (s: number) => (lang === 'ar' ? surah(s).ar : surah(s).en)
  if (start[0] === end[0]) {
    if (start[1] === 1 && end[1] === surah(start[0]).ayat) return lang === 'ar' ? `سورة ${nm(start[0])}` : nm(start[0])
    return `${nm(start[0])} ${N(start[1])}–${N(end[1])}`
  }
  return `${nm(start[0])} ${N(start[1])} – ${nm(end[0])} ${N(end[1])}`
}

export const unitLabel = (u: Unit, n: number, lang: string, N: (n: number) => string) =>
  lang === 'ar'
    ? `${N(n)} ${u === 'page' ? (n === 1 ? 'صفحة' : n === 2 ? 'صفحتان' : n % 100 >= 3 && n % 100 <= 10 ? 'صفحات' : 'صفحة') : n === 1 ? 'آية' : n === 2 ? 'آيتان' : n % 100 >= 3 && n % 100 <= 10 ? 'آيات' : 'آية'}`
    : u === 'page'
      ? `${n} page${n === 1 ? '' : 's'}`
      : `${n} ${n === 1 ? 'ayah' : 'ayat'}`

export const TOTAL = { ayat: TOTAL_AYAT, pages: 604 }
