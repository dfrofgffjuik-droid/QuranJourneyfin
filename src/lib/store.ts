// Local-first app state, persisted in localStorage. No server, no fake responses.
import { useSyncExternalStore } from 'react'
import { addDays, daysBetween, today } from './date'
import { surah } from './quran'
import { addPlan, forecast, fromLegacy, hifzPlanOf, newPlan, planProgress, todayTask, type QPlan } from './plans'

export type Lang = 'ar' | 'en'
export type LearningPath = 'hifz' | 'reading' | 'kids'
export type Key = string // "s:a"
export const key = (s: number, a: number): Key => `${s}:${a}`
export const parseKey = (k: Key) => k.split(':').map(Number) as [number, number]

export type AyahProgress = {
  status: 'learning' | 'memorized'
  interval: number // days until next revision
  due: string // ISO date
  reviews: number
  lapses: number
  last: string
}

export type Plan = { s: number; from: number; to: number; dailyAyat: number; startedAt: string }
export type DayLog = { memorized: number; practiced: number; revised: number; read: number; minutes: number }

export type Profile = {
  id: string
  name: string
  kind: 'adult' | 'child'
  path: LearningPath
  dailyAyat: number
  dailyMinutes: number
  /** Legacy single plan (pre-v2). Kept untouched; migrated into `plans`. */
  plan: Plan | null
  plans: QPlan[]
  primaryPlanId: string | null
  progress: Record<Key, AyahProgress>
  bookmarks: Key[]
  notes?: Record<Key, string>
  last: { s: number; a: number; mode: 'read' | 'memorize' } | null
  log: Record<string, DayLog>
  kids: { letters: Record<string, true>; lessons: Record<string, number> }
  sample?: boolean
  createdAt: string
}

export type Assignment = {
  id: string
  learnerId: string
  kind: 'memorize' | 'revise' | 'recite'
  s: number
  from: number
  to: number
  due: string
  note: string
  createdAt: string
  doneAt?: string
}

export type Observation = { label: string; words: string; lane: 'word' | 'sound' | 'tajweed'; detail: string; review?: 'confirmed' | 'dismissed' }

export type Submission = {
  id: string
  learnerId: string
  s: number
  from: number
  to: number
  createdAt: string
  seconds: number
  audioId: string | null // IndexedDB key, this device only
  // Present ONLY if the real Muaalem engine analysed the recording.
  ai: { engine: string; reliable: boolean; abstainReason: string | null; observations: Observation[] } | null
  selfCheck: number[] | null // word indices the learner marked as missed
  teacher?: { verdict: 'good' | 'needs_work'; note: string; at: string }
  seenByLearner?: boolean
}

/** App colour theme; maps to `data-palette` tokens in index.css. */
export type Palette = 'garden' | 'sea' | 'dusk' | 'sand' | 'rose'

export type State = {
  v: 1
  onboarded: boolean
  lang: Lang
  theme: 'light' | 'dark' | 'system'
  palette: Palette
  /** Reader layout; optional so older saved state keeps loading. */
  readerView?: 'mushaf' | 'ayah' | 'flow'
  tafsir: number // Quran Foundation tafsir resource id
  reciter: string
  fontScale: number
  aiNoticeAccepted: boolean
  profiles: Profile[]
  activeId: string | null
  mode: 'learner' | 'guide'
  guideName: string
  assignments: Assignment[]
  submissions: Submission[]
}

const STORAGE = 'rafiqi.app.v1'
const initial: State = {
  v: 1,
  onboarded: false,
  lang: 'ar',
  theme: 'system',
  palette: 'garden',
  tafsir: 16,
  reciter: 'husary',
  fontScale: 1,
  aiNoticeAccepted: false,
  profiles: [],
  activeId: null,
  mode: 'learner',
  guideName: '',
  assignments: [],
  submissions: [],
}

/** Additive migration: never drops data. Old single plans become a memorisation plan. */
function migrate(p: Profile): Profile {
  if (Array.isArray(p.plans)) return p
  const legacy = p.plan ? fromLegacy(p.plan) : null
  return { ...p, plans: legacy ? [legacy] : [], primaryPlanId: legacy?.id ?? null }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const s: State = { ...initial, ...JSON.parse(raw) }
      return { ...s, profiles: (s.profiles ?? []).map(migrate) }
    }
  } catch {
    /* corrupted storage falls back to a fresh state */
  }
  return initial
}

let state: State = load()
const subs = new Set<() => void>()

export function getState() {
  return state
}
export function setState(fn: (s: State) => State) {
  state = fn(state)
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state))
  } catch {
    /* storage full or blocked: state stays in memory */
  }
  subs.forEach((f) => f())
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => sel(state),
  )
}
export const useActive = () => useStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null)

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function newProfile(p: Partial<Profile> & Pick<Profile, 'name' | 'kind' | 'path'>): Profile {
  return {
    id: uid(),
    dailyAyat: 3,
    dailyMinutes: 10,
    plan: null,
    plans: [],
    primaryPlanId: null,
    progress: {},
    bookmarks: [],
    last: null,
    log: {},
    kids: { letters: {}, lessons: {} },
    createdAt: today(),
    ...p,
  }
}

export function updateProfile(id: string, fn: (p: Profile) => Profile) {
  setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? fn(p) : p)) }))
}
export function updateActive(fn: (p: Profile) => Profile) {
  if (state.activeId) updateProfile(state.activeId, fn)
}

export function logDay(p: Profile, patch: Partial<DayLog>): Profile {
  const d = today()
  const cur = p.log[d] ?? { memorized: 0, practiced: 0, revised: 0, read: 0, minutes: 0 }
  const next = { ...cur }
  for (const [k, v] of Object.entries(patch) as [keyof DayLog, number][]) next[k] = (next[k] ?? 0) + v
  return { ...p, log: { ...p.log, [d]: next } }
}

// ---------- Memorisation & spaced revision ----------

export function markMemorized(p: Profile, s: number, a: number): Profile {
  const k = key(s, a)
  const wasNew = p.progress[k]?.status !== 'memorized'
  const next: AyahProgress = { status: 'memorized', interval: 1, due: addDays(today(), 1), reviews: 0, lapses: 0, last: today() }
  const q = { ...p, progress: { ...p.progress, [k]: wasNew ? next : p.progress[k] } }
  return wasNew ? logDay(q, { memorized: 1 }) : q
}

export function markPractice(p: Profile, s: number, a: number): Profile {
  const k = key(s, a)
  const cur = p.progress[k]
  if (cur?.status === 'memorized') return p
  return logDay({ ...p, progress: { ...p.progress, [k]: { status: 'learning', interval: 0, due: today(), reviews: 0, lapses: 0, last: today() } } }, { practiced: 1 })
}

export type Grade = 'smooth' | 'hesitant' | 'forgot'
export function gradeReview(p: Profile, s: number, a: number, g: Grade): Profile {
  const k = key(s, a)
  const cur = p.progress[k]
  if (!cur) return p
  const interval = g === 'smooth' ? Math.min(120, Math.max(2, Math.round(Math.max(1, cur.interval) * 2.3))) : g === 'hesitant' ? Math.max(1, Math.round(cur.interval * 1.2)) : 1
  const next: AyahProgress = { ...cur, interval, due: addDays(today(), interval), reviews: cur.reviews + 1, lapses: cur.lapses + (g === 'forgot' ? 1 : 0), last: today() }
  return logDay({ ...p, progress: { ...p.progress, [k]: next } }, { revised: 1 })
}

/** Mark previously memorised portions; spread first revisions over a week. */
export function addKnown(p: Profile, s: number, from: number, to: number): Profile {
  const prog = { ...p.progress }
  for (let a = from; a <= to; a++) {
    const k = key(s, a)
    if (prog[k]?.status === 'memorized') continue
    prog[k] = { status: 'memorized', interval: 3, due: addDays(today(), (a - from) % 7), reviews: 0, lapses: 0, last: today() }
  }
  return { ...p, progress: prog }
}

export const isMemorized = (p: Profile, s: number, a: number) => p.progress[key(s, a)]?.status === 'memorized'

export function memorizedCount(p: Profile, s?: number) {
  return Object.entries(p.progress).filter(([k, v]) => v.status === 'memorized' && (s == null || parseKey(k)[0] === s)).length
}

export function completedSurahs(p: Profile) {
  const counts = new Map<number, number>()
  for (const [k, v] of Object.entries(p.progress)) if (v.status === 'memorized') counts.set(parseKey(k)[0], (counts.get(parseKey(k)[0]) ?? 0) + 1)
  return [...counts].filter(([s, c]) => c >= surah(s).ayat).map(([s]) => s)
}

/** Today's memorisation targets from the learner's memorisation plan. */
export function todaysHifz(p: Profile) {
  const pl = hifzPlanOf(p)
  if (!pl) return null
  const pr = planProgress(p, pl)
  const t = todayTask(p, pl, true)
  const next = t?.kind === 'hifz' ? Array.from({ length: t.to - t.from + 1 }, (_, i) => t.from + i) : []
  const s = t?.kind === 'hifz' ? t.s : pl.start[0]
  return { s, goal: pl.daily, learnedToday: pr.today, next, remainingTotal: pr.total - pr.done, total: pr.total, done: pr.done >= pr.total, planId: pl.id, finish: forecast(p, pl).finish }
}

export type RevisionTask = { s: number; from: number; to: number; overdue: number; count: number }

/** Group due memorised ayat into contiguous portions (max 10 ayat each). */
export function revisionTasks(p: Profile, onDate = today()): RevisionTask[] {
  const due = Object.entries(p.progress)
    .filter(([, v]) => v.status === 'memorized' && v.due <= onDate)
    .map(([k, v]) => ({ k: parseKey(k), over: daysBetween(v.due, onDate) }))
    .sort((x, y) => x.k[0] - y.k[0] || x.k[1] - y.k[1])
  const tasks: RevisionTask[] = []
  for (const { k, over } of due) {
    const t = tasks[tasks.length - 1]
    if (t && t.s === k[0] && t.to === k[1] - 1 && t.count < 10) {
      t.to = k[1]
      t.count++
      t.overdue = Math.max(t.overdue, over)
    } else tasks.push({ s: k[0], from: k[1], to: k[1], overdue: over, count: 1 })
  }
  return tasks
}

export function upcomingRevisionCounts(p: Profile, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today(), i)
    const n = Object.values(p.progress).filter((v) => v.status === 'memorized' && (i === 0 ? v.due <= d : v.due === d)).length
    return { date: d, count: n }
  })
}

export function activeDays(p: Profile, lastNDays = 30) {
  let n = 0
  for (let i = 0; i < lastNDays; i++) {
    const l = p.log[addDays(today(), -i)]
    if (l && l.memorized + l.revised + l.read + l.practiced > 0) n++
  }
  return n
}

export function toggleBookmark(s: number, a: number) {
  updateActive((p) => {
    const k = key(s, a)
    return { ...p, bookmarks: p.bookmarks.includes(k) ? p.bookmarks.filter((b) => b !== k) : [k, ...p.bookmarks] }
  })
}

export function setNote(s: number, a: number, text: string) {
  updateActive((p) => {
    const notes = { ...(p.notes ?? {}) }
    const t = text.trim()
    if (t) notes[key(s, a)] = t
    else delete notes[key(s, a)]
    return { ...p, notes }
  })
}

export function resetAll() {
  localStorage.removeItem(STORAGE)
  state = initial
  subs.forEach((f) => f())
}

/** Clearly-labelled sample learners for trying the parent/teacher view. */
export function sampleLearners(): Profile[] {
  const a = newProfile({ name: 'مريم (مثال)', kind: 'child', path: 'kids', sample: true, dailyAyat: 2 })
  let m: Profile = addPlan(a, newPlan({ kind: 'hifz', start: [112, 1], end: [112, 4], daily: 2, startedAt: addDays(today(), -6) }), true)
  m = addKnown(m, 1, 1, 7)
  m = addKnown(m, 114, 1, 6)
  m = addKnown(m, 112, 1, 2)
  m.kids = { letters: Object.fromEntries('ا ب ت ث ج ح خ د ذ ر'.split(' ').map((l) => [l, true as const])), lessons: { harakat: 2 } }
  m.log = Object.fromEntries([0, 1, 3, 4, 6, 8].map((d, i) => [addDays(today(), -d), { memorized: i % 2, practiced: 1, revised: 3, read: 0, minutes: 8 }]))
  const b = newProfile({ name: 'يوسف (مثال)', kind: 'child', path: 'hifz', sample: true, dailyAyat: 3 })
  let y: Profile = addPlan(b, newPlan({ kind: 'hifz', start: [78, 1], end: [78, 40], daily: 3, startedAt: addDays(today(), -10) }), true)
  for (const s of [114, 113, 112, 111, 110, 109, 108, 107, 106, 105]) y = addKnown(y, s, 1, surah(s).ayat)
  y = addKnown(y, 78, 1, 12)
  y.log = Object.fromEntries([0, 1, 2, 4, 5, 7, 9, 12].map((d) => [addDays(today(), -d), { memorized: 2, practiced: 1, revised: 6, read: 0, minutes: 15 }]))
  return [m, y]
}
