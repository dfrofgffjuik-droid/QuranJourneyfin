// Shared memorization session for the Next-generation preview (design only).
// Lives above the device frames in NextPreview so Desktop, Mobile and Both
// show one session. Preview memory only: never written to the app store,
// localStorage or any account.
import { createContext, useContext, useMemo, useState } from 'react'
import { surah } from '../../lib/quran'
import { JOURNEY } from './data'

export type Intent = 'hifz' | 'tadabbur' | 'both'
export type MemResult = 'mastered' | 'shaky' | 'forgot'
export type Passage = { s: number; from: number; to: number }
export type Ref = { s: number; a: number }
/** A similarity linked to the session. `verified` = from the verified dataset; `textual` = an automatic text match the user chose. */
export type LinkedPair = { id: string; a: Ref; b: Ref; origin: 'verified' | 'textual' }
/** Similarity practice progress. Deliberately separate from memorization: it never marks an ayah memorised. */
export type SimProgress = { reviewed: Record<string, true>; compared: Record<string, true>; diffDone: number; recallTried: number; recallOk: number }
export type PanelId = 'read' | 'understand' | 'memorize' | 'connect' | 'similar'

export type Session = {
  passage: Passage
  /** Always inside `passage`. */
  cur: number
  intent: Intent
  /** Keyed `s:a`. Only the explicit «أتقنتها» step writes `mastered`. */
  mem: Record<string, MemResult>
  notes: Record<string, string>
  /** Preview-only bookmarks, keyed `s:a`. */
  marks: Record<string, true>
  pairs: LinkedPair[]
  sim: SimProgress
  /** Bumped on every passage change so temporary exercise / feed state resets. */
  nonce: number
  /** Set when the journey hands off to another screen (Mushaf, extended search) so it can offer the way back. */
  away: { panel: PanelId | null } | null
}

export const MAX_PASSAGE = 20
export const DEMO_PASSAGE: Passage = { s: JOURNEY.s, from: JOURNEY.from, to: JOURNEY.to }
export const isDemoPassage = (p: Passage) => p.s === DEMO_PASSAGE.s && p.from === DEMO_PASSAGE.from && p.to === DEMO_PASSAGE.to
export const akey = (s: number, a: number) => `${s}:${a}`
export const pairId = (a: Ref, b: Ref) => `${akey(a.s, a.a)}|${akey(b.s, b.a)}`
export const inPassage = (p: Passage, r: Ref) => r.s === p.s && r.a >= p.from && r.a <= p.to
export const passageAyat = (p: Passage) => Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i)

/** Range check against the surah's real ayah count. Returns an Arabic message, or null when valid. */
export function validatePassage(p: Passage): string | null {
  const n = surah(p.s)?.ayat
  if (!n) return 'اختر سورة صحيحة.'
  if (!Number.isInteger(p.from) || !Number.isInteger(p.to)) return 'أدخل أرقام آيات صحيحة.'
  if (p.from < 1 || p.from > n) return `آية البداية يجب أن تكون بين ١ و${toArN(n)} (عدد آيات سورة ${surah(p.s).ar}).`
  if (p.to < p.from) return 'آية النهاية يجب ألّا تسبق آية البداية.'
  if (p.to > n) return `سورة ${surah(p.s).ar} عدد آياتها ${toArN(n)} فقط.`
  if (p.to - p.from + 1 > MAX_PASSAGE) return `المقطع حتى ${toArN(MAX_PASSAGE)} آية في الجلسة الواحدة.`
  return null
}
const toArN = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

/** A linked pair seen from the active passage: `mine` is the ayah in the passage. */
export function pairsForPassage(p: Passage, pairs: LinkedPair[]) {
  return pairs.flatMap((x) => (inPassage(p, x.a) ? [{ ...x, mine: x.a, other: x.b }] : inPassage(p, x.b) ? [{ ...x, mine: x.b, other: x.a }] : []))
}
export type PassagePair = ReturnType<typeof pairsForPassage>[number]

const EMPTY_SIM: SimProgress = { reviewed: {}, compared: {}, diffDone: 0, recallTried: 0, recallOk: 0 }
const initial: Session = { passage: DEMO_PASSAGE, cur: DEMO_PASSAGE.from, intent: 'both', mem: {}, notes: {}, marks: {}, pairs: [], sim: EMPTY_SIM, nonce: 0, away: null }

function api(s: Session, up: (f: (s: Session) => Session) => void) {
  return {
    s,
    /**
     * Starts a new passage. Resets the temporary state tied to the old one (current ayah,
     * exercise state via `nonce`, hand-off). Per-ayah records stay keyed by surah:ayah in
     * preview memory, so returning to a passage later (revision) finds them again.
     */
    setPassage: (p: Passage) => {
      if (validatePassage(p)) return
      up((x) => ({ ...x, passage: p, cur: p.from, nonce: x.nonce + 1, away: null }))
    },
    setCur: (a: number) => up((x) => {
      const c = Math.min(x.passage.to, Math.max(x.passage.from, a))
      return c === x.cur ? x : { ...x, cur: c }
    }),
    setIntent: (intent: Intent) => up((x) => ({ ...x, intent })),
    setMem: (a: number, r: MemResult) => up((x) => ({ ...x, mem: { ...x.mem, [akey(x.passage.s, a)]: r } })),
    setNote: (a: number, t: string) => up((x) => ({ ...x, notes: { ...x.notes, [akey(x.passage.s, a)]: t } })),
    toggleMark: (a: number) => up((x) => {
      const k = akey(x.passage.s, a)
      const marks = { ...x.marks }
      if (marks[k]) delete marks[k]
      else marks[k] = true
      return { ...x, marks }
    }),
    link: (a: Ref, b: Ref, origin: LinkedPair['origin']) => up((x) => {
      const id = pairId(a, b)
      if (x.pairs.some((p) => p.id === id || p.id === pairId(b, a))) return x
      return { ...x, pairs: [...x.pairs, { id, a, b, origin }] }
    }),
    unlink: (id: string) => up((x) => ({ ...x, pairs: x.pairs.filter((p) => p.id !== id) })),
    /** Similarity progress only — never touches `mem`. */
    recordSim: (e: { kind: 'reviewed' | 'compared'; id: string } | { kind: 'diff' } | { kind: 'recall'; ok: boolean }) =>
      up((x) => {
        const sim = { ...x.sim }
        if (e.kind === 'reviewed' || e.kind === 'compared') {
          if (sim[e.kind][e.id]) return x
          sim[e.kind] = { ...sim[e.kind], [e.id]: true }
        } else if (e.kind === 'diff') sim.diffDone += 1
        else if (e.kind === 'recall') {
          sim.recallTried += 1
          if (e.ok) sim.recallOk += 1
        }
        return { ...x, sim }
      }),
    setAway: (away: Session['away']) => up((x) => ({ ...x, away })),
  }
}
export type SessionApi = ReturnType<typeof api>

const noop = () => {}
export const SessionCtx = createContext<SessionApi>(api(initial, noop))
export const useSession = () => useContext(SessionCtx)

/** Owner hook for NextPreview: one session for every frame. */
export function useSessionState(): SessionApi {
  const [s, set] = useState<Session>(initial)
  return useMemo(() => api(s, set), [s])
}

/** Read-only view of a session (e.g. for the inert theme thumbnails), so they can never change it. */
export const readOnlySession = (s: Session): SessionApi => api(s, noop)
