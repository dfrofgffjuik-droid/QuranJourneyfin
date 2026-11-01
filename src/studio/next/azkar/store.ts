// Azkar progress for the preview — isolated from the app and from the other
// preview data, under its own key. Counts reset on a new local calendar day;
// favourites, settings and the per-day history are kept.
import { useSyncExternalStore } from 'react'
import { COLLECTIONS, collection, countable, itemsOf } from './catalog'
import { quarantine, readRaw, safeWrite } from '../storageSafety'

export const AZKAR_KEY = 'quranJourney.nextPreview.azkar.v1'
export type FontSize = 's' | 'm' | 'l' | 'xl'
export type AState = {
  v: 1
  /** Local calendar date of the current session (YYYY-MM-DD). */
  date: string
  /** Today's counts keyed `${collectionId}:${itemId}`; never above the item's verified count. */
  counts: Record<string, number>
  favorites: string[]
  lastCollection: string | null
  settings: { size: FontSize; compact: boolean }
  /** Completed items per finished day (kept across daily resets). */
  history: Record<string, { completed: number; collections: string[] }>
}
const pad = (n: number) => String(n).padStart(2, '0')
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fresh = (): AState => ({ v: 1, date: localDate(), counts: {}, favorites: [], lastCollection: null, settings: { size: 'm', compact: false }, history: {} })

export const progressOf = (st: AState, colId: string) => {
  const c = collection(colId)
  if (!c) return { done: 0, total: 0, reps: 0 }
  const items = itemsOf(c).filter(countable)
  let done = 0
  let reps = 0
  for (const i of items) {
    const n = Math.min(i.count, st.counts[`${colId}:${i.id}`] ?? 0)
    reps += n
    if (n >= i.count) done++
  }
  return { done, total: items.length, reps }
}
/** Archive the finished day and start a clean session (favourites, settings, history stay). */
function rollover(st: AState): AState {
  const today = localDate()
  if (st.date === today) return st
  const cols = COLLECTIONS.filter((c) => progressOf(st, c.id).done > 0)
  const completed = cols.reduce((n, c) => n + progressOf(st, c.id).done, 0)
  const history = completed > 0 ? { ...st.history, [st.date]: { completed, collections: cols.map((c) => c.id) } } : st.history
  return { ...st, date: today, counts: {}, history }
}

export type AzkarStorage = 'ok' | 'unavailable' | 'recovered'
let storage: AzkarStorage = 'ok'
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
/** Keeps every valid part of a saved state; returns whether anything had to be left out. */
function sanitize(s: Record<string, unknown>): { st: AState; partial: boolean } {
  let partial = false
  const counts: Record<string, number> = {}
  for (const [k, v] of Object.entries(isObj(s.counts) ? s.counts : ((partial = true), {}))) {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) counts[k] = v
    else partial = true
  }
  const favorites = Array.isArray(s.favorites) ? s.favorites.filter((x): x is string => typeof x === 'string') : ((partial = true), [])
  const history = isObj(s.history) ? (s.history as AState['history']) : ((partial = true), {})
  const settings = { ...fresh().settings, ...(isObj(s.settings) ? s.settings : {}) } as AState['settings']
  const date = typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : ((partial = true), localDate())
  return { st: { ...fresh(), date, counts, favorites, history, settings, lastCollection: typeof s.lastCollection === 'string' ? s.lastCollection : null }, partial }
}
let keepRawUntilAction = false
function load(): AState {
  const { raw, blocked } = readRaw(AZKAR_KEY)
  if (blocked) {
    storage = 'unavailable'
    return fresh()
  }
  if (!raw) return fresh()
  try {
    const s = JSON.parse(raw)
    if (!isObj(s) || s.v !== 1) throw new Error('shape')
    const { st, partial } = sanitize(s)
    if (partial) (quarantine(AZKAR_KEY, raw, true), (storage = 'recovered'))
    return rollover(st)
  } catch {
    // Never discard unreadable progress: keep a copy, start fresh, and say so.
    quarantine(AZKAR_KEY, raw)
    storage = 'recovered'
    keepRawUntilAction = true
    return fresh()
  }
}
let state = load()
const subs = new Set<() => void>()
function publish(next: AState) {
  state = next
  storage = safeWrite(AZKAR_KEY, JSON.stringify(state)) ? (storage === 'unavailable' ? 'ok' : storage) : 'unavailable'
  subs.forEach((f) => f())
}
// Persist the daily rollover at load — but an unreadable value is replaced only after the user acts.
if (!keepRawUntilAction && (storage as AzkarStorage) !== 'unavailable') publish(state)
const update = (f: (s: AState) => AState) => publish(f(rollover(state)))
// A session left open across midnight starts the new day on its own.
if (typeof window !== 'undefined') {
  const check = () => state.date !== localDate() && publish(rollover(state))
  setInterval(check, 60_000)
  document.addEventListener('visibilitychange', check)
}

export const useAzkar = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)
export const azkarStorage = () => storage

export const azkar = {
  /** +1, never past the verified count. Returns the new count. */
  tap(colId: string, itemId: string, max: number) {
    let n = 0
    update((s) => {
      const k = `${colId}:${itemId}`
      n = Math.min(max, (s.counts[k] ?? 0) + 1)
      return { ...s, counts: { ...s.counts, [k]: n }, lastCollection: colId }
    })
    return n
  },
  resetItem(colId: string, itemId: string) {
    update((s) => {
      const counts = { ...s.counts }
      delete counts[`${colId}:${itemId}`]
      return { ...s, counts }
    })
  },
  /** Clears today's counts for one collection, or for all when no id is given. */
  resetSession(colId?: string) {
    update((s) => ({ ...s, counts: colId ? Object.fromEntries(Object.entries(s.counts).filter(([k]) => !k.startsWith(`${colId}:`))) : {} }))
  },
  toggleFavorite(itemId: string) {
    update((s) => ({ ...s, favorites: s.favorites.includes(itemId) ? s.favorites.filter((x) => x !== itemId) : [...s.favorites, itemId] }))
  },
  visit(colId: string) {
    if (state.lastCollection !== colId) update((s) => ({ ...s, lastCollection: colId }))
  },
  setSettings(p: Partial<AState['settings']>) {
    update((s) => ({ ...s, settings: { ...s.settings, ...p } }))
  },
}

export const DAILY_IDS = ['waking', 'morning', 'evening', 'sleep']
export const todaySummary = (st: AState) => {
  const daily = DAILY_IDS.map((id) => ({ id, ...progressOf(st, id) }))
  const all = COLLECTIONS.map((c) => ({ id: c.id, ...progressOf(st, c.id) }))
  const completedToday = all.reduce((n, x) => n + x.done, 0)
  return {
    daily,
    dailyDone: daily.reduce((n, x) => n + x.done, 0),
    dailyTotal: daily.reduce((n, x) => n + x.total, 0),
    completed: completedToday,
    reps: all.reduce((n, x) => n + x.reps, 0),
    lifetime: Object.values(st.history).reduce((n, h) => n + h.completed, 0) + completedToday,
    days: Object.keys(st.history).length + (completedToday > 0 ? 1 : 0),
  }
}
