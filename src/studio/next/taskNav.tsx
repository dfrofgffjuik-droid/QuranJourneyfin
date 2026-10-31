// Starting a plan task: each activity opens its own destination, and the task
// being worked on is remembered (in memory only) so that destination can offer
// an explicit «سجّل الإتمام». Opening a task never completes it.
import { useSyncExternalStore } from 'react'
import { PAGES, fromGIndex, surah } from '../../lib/quran'
import { useProto } from './core'
import { MAX_PASSAGE, useSession } from './session'
import { useOpenInMushaf } from './screens/mushaf'
import type { Task } from './progress'

export type ActiveTask = { planId: string; date: string; activity: Task['activity']; unit: Task['unit']; from: number; to: number; name: string }
let active: ActiveTask | null = null
const subs = new Set<() => void>()
export const setActiveTask = (t: ActiveTask | null) => ((active = t), subs.forEach((f) => f()))
export const useActiveTask = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => active)

/** Where a task goes: memorisation → journey, revision → revision screen, reading / khatmah → Mushaf at its page. */
export function useStartTask() {
  const { go } = useProto()
  const ses = useSession()
  const open = useOpenInMushaf()
  return (t: Task) => {
    if (t.from == null || t.to == null) return
    const at: ActiveTask = { planId: t.plan.id, date: t.date, activity: t.activity, unit: t.unit, from: t.from, to: t.to, name: t.plan.name }
    setActiveTask(at)
    if (t.activity === 'hifz') {
      // The journey works on one surah at a time (up to MAX_PASSAGE ayat): start where the task starts.
      const [s, a] = fromGIndex(t.from)
      const [s2, a2] = fromGIndex(t.to)
      const end = Math.min(s2 === s ? a2 : surah(s).ayat, a + MAX_PASSAGE - 1)
      ses.setPassage({ s, from: a, to: end })
      go('ayah')
    } else if (t.activity === 'revision') go('revision', t.id)
    else {
      const [s, a] = t.unit === 'page' ? PAGES[t.from - 1] : fromGIndex(t.from)
      open(s, a)
    }
  }
}
export const DEST_AR = { hifz: 'رحلة الحفظ', revision: 'شاشة المراجعة', reading: 'المصحف' } as const
