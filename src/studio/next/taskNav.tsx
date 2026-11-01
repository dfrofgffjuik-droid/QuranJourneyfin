// Starting an activity: each activity opens its own destination, and the task or
// scope being worked on is remembered so that destination can offer the explicit
// completion. Opening a task never completes it.
//
// Persistence: the active task and the map's selected Juz are kept under the
// preview's own localStorage key (never the app's), so a refresh resumes the same activity.
import { useSyncExternalStore } from 'react'
import { PAGES, fromGIndex, toAr } from '../../lib/quran'
import { useProto } from './core'
import { useSession } from './session'
import { useOpenInMushaf } from './screens/mushaf'
import { chunksOf, derived, getPreview, today, usePreview, type Activity, type Task, type Unit } from './progress'
import { quarantine, readRaw, safeWrite } from './storageSafety'

export const ACTIVE_KEY = 'quranJourney.nextPreview.activeTask.v1'

/**
 * `plan`: a scheduled plan task. `scope`: a free range opened elsewhere (e.g. a Juz from the map).
 * `from`/`to` are in `unit` (pages stay pages); `g0`/`g1` are the canonical global-ayah range.
 */
export type ActiveTask = {
  kind: 'plan' | 'scope'
  planId: string | null
  taskId: string | null
  date: string
  activity: Activity
  unit: Unit
  from: number
  to: number
  g0: number
  g1: number
  name: string
  /** Key of the explicitly confirmed steps for this exact range. */
  stepKey: string
  startedAt: string
  /** Juz number when opened from the map. */
  juz?: number
}
type UiState = { active: ActiveTask | null; mapJuz: number | null }

function load(): UiState {
  const { raw } = readRaw(ACTIVE_KEY)
  if (!raw) return { active: null, mapJuz: null }
  try {
    const s = JSON.parse(raw) as Partial<UiState>
    const a = s.active
    const ok = !!a && ['plan', 'scope'].includes(a.kind) && Number.isInteger(a.g0) && Number.isInteger(a.g1) && a.g0 >= 1 && a.g1 >= a.g0 && typeof a.stepKey === 'string'
    const j = s.mapJuz
    if (a && !ok) quarantine(ACTIVE_KEY, raw, true)
    return { active: ok ? a! : null, mapJuz: typeof j === 'number' && Number.isInteger(j) && j >= 1 && j <= 30 ? j : null }
  } catch {
    quarantine(ACTIVE_KEY, raw)
    return { active: null, mapJuz: null }
  }
}
let ui: UiState = typeof localStorage === 'undefined' ? { active: null, mapJuz: null } : load()
const subs = new Set<() => void>()
function setUi(p: Partial<UiState>) {
  ui = { ...ui, ...p }
  safeWrite(ACTIVE_KEY, JSON.stringify(ui))
  subs.forEach((f) => f())
}
const useUi = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => ui)

export const setActiveTask = (t: ActiveTask | null) => setUi({ active: t })
/** Non-hook read of the persisted active task (used by tests and event handlers). */
export const getActiveTask = () => ui.active
/** The active task, or null when its plan no longer exists (deleted / data reset). */
export const useActiveTask = () => {
  const a = useUi().active
  const st = usePreview()
  if (a?.kind === 'plan' && !st.plans.some((p) => p.id === a.planId)) return null
  return a
}
export const useMapJuz = () => useUi().mapJuz
export const setMapJuz = (j: number) => {
  if (ui.mapJuz !== j) setUi({ mapJuz: j })
}

export const scopeStepKey = (activity: Activity, g0: number, g1: number) => (activity === 'hifz' ? `scope:hifz:${g0}-${g1}` : `scope:revision:${g0}-${g1}:${today()}`)
export const revisionSessionId = (g0: number, g1: number) => `scope:${g0}-${g1}:${today()}`

/** Opens the Memorization Journey on a passage of the range: the first one not yet confirmed. */
function useOpenHifz() {
  const ses = useSession()
  const { go } = useProto()
  return (a: ActiveTask) => {
    const st = getPreview()
    const d = derived(st)
    const chunks = chunksOf(a.g0, a.g1)
    const confirmed = st.steps[a.stepKey] ?? {}
    const pending = (c: (typeof chunks)[number]) => !confirmed[c.id] && !(a.kind === 'scope' && d.memBetween(c.g0, c.g1) === c.g1 - c.g0 + 1)
    const c = chunks.find(pending) ?? chunks[0]
    ses.setPassage({ s: c.s, from: c.from, to: c.to })
    go('ayah')
  }
}

export function activeFromTask(t: Task): ActiveTask | null {
  if (t.from == null || t.to == null || t.g0 == null || t.g1 == null || t.stepKey == null) return null
  return { kind: 'plan', planId: t.plan.id, taskId: t.id, date: t.date, activity: t.activity, unit: t.unit, from: t.from, to: t.to, g0: t.g0, g1: t.g1, name: t.plan.name, stepKey: t.stepKey, startedAt: new Date().toISOString() }
}

/** Where a task goes: memorisation → journey, revision → revision screen, reading / khatmah → Mushaf at its page. */
export function useStartTask() {
  const open = useOpenInMushaf()
  const { go } = useProto()
  const hifz = useOpenHifz()
  return (t: Task) => {
    const at = activeFromTask(t)
    if (!at) return
    setActiveTask(at)
    if (t.activity === 'hifz') hifz(at)
    else if (t.activity === 'revision') go('revision', t.id)
    else {
      const [s, a] = at.unit === 'page' ? PAGES[at.from - 1] : fromGIndex(at.from)
      open(s, a)
    }
  }
}

/** Opens a free range (not a plan task), e.g. «احفظ» / «راجع» for one Juz on the map. */
export function useStartScope() {
  const { go } = useProto()
  const hifz = useOpenHifz()
  return (o: { activity: 'hifz' | 'revision'; g0: number; g1: number; juz?: number }) => {
    const name = o.juz ? `الجزء ${toAr(o.juz)}` : 'مقطع مختار'
    const at: ActiveTask = { kind: 'scope', planId: null, taskId: null, date: today(), activity: o.activity, unit: 'ayah', from: o.g0, to: o.g1, g0: o.g0, g1: o.g1, name, stepKey: scopeStepKey(o.activity, o.g0, o.g1), startedAt: new Date().toISOString(), juz: o.juz }
    setActiveTask(at)
    if (o.activity === 'hifz') hifz(at)
    else go('revision', 'scope')
  }
}
export const DEST_AR = { hifz: 'رحلة الحفظ', revision: 'شاشة المراجعة', reading: 'المصحف' } as const
