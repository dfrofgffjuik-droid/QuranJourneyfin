import { useEffect, useState } from 'react'
import { loadMushaf, loadSurah } from './quran'

export function useSurah(n: number | null) {
  const [ayat, setAyat] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!n) return
    let live = true
    setAyat(null)
    setError(null)
    loadSurah(n)
      .then((a) => live && setAyat(a))
      .catch((e) => live && setError(String(e)))
    return () => {
      live = false
    }
  }, [n])
  return { ayat, error }
}

/** Reading text for display; `hafs` tells callers which font class to use. */
export function useMushaf(n: number | null) {
  const [st, setSt] = useState<{ ayat: string[] | null; hafs: boolean; error: string | null }>({ ayat: null, hafs: true, error: null })
  useEffect(() => {
    if (!n) return
    let live = true
    setSt({ ayat: null, hafs: true, error: null })
    loadMushaf(n)
      .then((r) => live && setSt({ ...r, error: null }))
      .catch((e) => live && setSt({ ayat: null, hafs: false, error: String(e) }))
    return () => {
      live = false
    }
  }, [n])
  return st
}
