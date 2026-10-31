import { useEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { getState, setState, useActive, useStore, type Palette, type State } from './store'

const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
const useSystemDark = () =>
  useSyncExternalStore(
    (f) => (mq?.addEventListener('change', f), () => mq?.removeEventListener('change', f)),
    () => !!mq?.matches,
  )

/** Colour themes. `swatch` is the [light accent, deep hero] pair used by pickers. */
export const PALETTES: { id: Palette; ar: string; en: string; swatch: [string, string] }[] = [
  { id: 'garden', ar: 'روضة', en: 'Garden', swatch: ['#3c9a63', '#24503a'] },
  { id: 'sea', ar: 'بحر', en: 'Sea', swatch: ['#3a82cc', '#1f4670'] },
  { id: 'dusk', ar: 'غسق', en: 'Dusk', swatch: ['#7a6ad6', '#352a6b'] },
  { id: 'sand', ar: 'رمال', en: 'Sand', swatch: ['#cf8644', '#6b3b1c'] },
  { id: 'rose', ar: 'ورد', en: 'Rose', swatch: ['#cc5f86', '#6a2540'] },
]

/** Resolved theme (applies to every mode, including Kids Mode). */
export function useDark() {
  const pref = useStore((s) => s.theme)
  const sys = useSystemDark()
  return pref === 'dark' || (pref === 'system' && sys)
}

/** Kids Mode keeps its own warm palette (and a soft night variant). */
export function useKidsMode() {
  const mode = useStore((s) => s.mode)
  const active = useActive()
  return mode === 'learner' && active?.path === 'kids'
}

function paint(dark: boolean, palette: Palette, enabled = true) {
  const el = document.documentElement
  if (enabled && dark) el.dataset.theme = 'dark'
  else delete el.dataset.theme
  if (enabled && palette !== 'garden') el.dataset.palette = palette
  else delete el.dataset.palette
  const bg = getComputedStyle(el).getPropertyValue('--color-parchment').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#eef2f5')
}

export function useApplyTheme(enabled = true) {
  const dark = useDark()
  const kids = useKidsMode()
  const palette = useStore((s) => s.palette) ?? 'garden'
  useEffect(() => {
    const el = document.documentElement
    if (enabled && kids) el.dataset.kids = ''
    else delete el.dataset.kids
    paint(dark, palette, enabled)
  }, [dark, kids, palette, enabled])
  return dark
}

/**
 * Change appearance with a short whole-page cross-fade, so a day/night or
 * colour switch eases in instead of flashing (skipped for reduced motion).
 */
export function setAppearance(patch: Partial<Pick<State, 'theme' | 'palette'>>) {
  const commit = () => {
    flushSync(() => setState((s) => ({ ...s, ...patch })))
    const s = getState()
    paint(s.theme === 'dark' || (s.theme === 'system' && !!mq?.matches), s.palette ?? 'garden')
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (doc.startViewTransition && !calm) doc.startViewTransition(commit)
  else commit()
}

export const toggleTheme = (dark: boolean) => setAppearance({ theme: dark ? 'light' : 'dark' })
