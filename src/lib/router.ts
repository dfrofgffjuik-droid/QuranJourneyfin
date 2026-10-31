import { useSyncExternalStore } from 'react'

// Tiny hash router: "#/surah/2?a=5" → { parts: ['surah','2'], q: {a:'5'} }
export type Route = { parts: string[]; q: Record<string, string> }

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  const [path, qs = ''] = h.split('?')
  return { parts: path.split('/').filter(Boolean), q: Object.fromEntries(new URLSearchParams(qs)) }
}

let current = parse()
const subs = new Set<() => void>()
addEventListener('hashchange', () => {
  current = parse()
  subs.forEach((f) => f())
})

export const useRoute = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => current,
  )

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const h = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  if (opts.replace) {
    history.replaceState(null, '', h)
    current = parse()
    subs.forEach((f) => f())
  } else location.hash = h
  window.scrollTo({ top: 0 })
}

export const back = (fallback = '/') => (history.length > 1 ? history.back() : navigate(fallback))

export const href = (to: string) => `#${to}`
