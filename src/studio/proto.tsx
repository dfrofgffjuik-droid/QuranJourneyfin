import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import type { Concept, Theme } from './kit'

export type Mode = 'adult' | 'kids'
export type Entry = { s: string; p?: Record<string, unknown> }
export type Draft = { type: string; target: string; from: number; to: number; perDay: number; days: number[]; step: number }
export type PState = {
  mode: Mode
  stacks: Record<Mode, Entry[]>
  sheet: { id: string; p?: Record<string, unknown> } | null
  menu: boolean
  draft: Draft
  extraPlans: { id: string; type: string; title: string; perDay: number; days: number[]; ends: string }[]
  stars: number
  flags: Record<string, boolean | number | string>
  toast: string | null
}

export const freshDraft = (): Draft => ({ type: 'hifz', target: 'الملك', from: 67, to: 77, perDay: 5, days: [0, 1, 2, 3, 4], step: 0 })
export const freshState = (): PState => ({
  mode: 'adult',
  stacks: { adult: [{ s: 'onboarding' }], kids: [{ s: 'k-home' }] },
  sheet: null,
  menu: false,
  draft: freshDraft(),
  extraPlans: [],
  stars: 46,
  flags: {},
  toast: null,
})

type Ctx = {
  st: PState
  set: (f: (s: PState) => PState) => void
  concept: Concept
  desktop: boolean
}
export const ProtoCtx = createContext<Ctx>(null!)

export function useP() {
  const { st, set, concept, desktop } = useContext(ProtoCtx)
  const stack = st.stacks[st.mode]
  const cur = stack[stack.length - 1]
  const theme: Theme = st.mode === 'kids' ? concept.kids : concept.adult
  const patch = (p: Partial<PState>) => set((s) => ({ ...s, ...p }))
  const go = (s: string, p?: Entry['p']) =>
    set((x) => ({ ...x, sheet: null, menu: false, stacks: { ...x.stacks, [x.mode]: [...x.stacks[x.mode], { s, p }] } }))
  const tab = (s: string, p?: Entry['p']) =>
    set((x) => ({ ...x, sheet: null, menu: false, stacks: { ...x.stacks, [x.mode]: [{ s, p }] } }))
  const back = () =>
    set((x) => {
      const k = x.stacks[x.mode]
      if (k.length <= 1) return { ...x, stacks: { ...x.stacks, [x.mode]: [{ s: x.mode === 'kids' ? 'k-home' : 'home' }] } }
      return { ...x, sheet: null, stacks: { ...x.stacks, [x.mode]: k.slice(0, -1) } }
    })
  const sheet = (id: string, p?: Entry['p']) => patch({ sheet: { id, p } })
  const close = () => patch({ sheet: null })
  const setMode = (mode: Mode, s?: string) =>
    set((x) => ({ ...x, mode, sheet: null, menu: false, stacks: s ? { ...x.stacks, [mode]: [{ s }] } : x.stacks }))
  const toast = (t: string) => {
    patch({ toast: t })
    setTimeout(() => set((x) => (x.toast === t ? { ...x, toast: null } : x)), 1800)
  }
  const flag = (k: string, v: PState['flags'][string]) => set((x) => ({ ...x, flags: { ...x.flags, [k]: v } }))
  return { st, set, patch, cur, stack, go, tab, back, sheet, close, setMode, toast, flag, theme, concept, desktop, kids: st.mode === 'kids' }
}

/** Scroll container that resets to top whenever the active screen changes. */
export function Scroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { cur, stack } = useP()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [cur, stack.length])
  return (
    <div ref={ref} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar ${className}`}>
      {children}
    </div>
  )
}
