import { useCallback, useEffect, useRef, useState } from 'react'
import { ayahAudioUrl } from './quran'

// Plays one ayah N times (or forever), streaming from EveryAyah.
export function useAyahPlayer(reciterId: string) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<{ s: number; a: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const left = useRef(0)
  const after = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    audio.current?.pause()
    left.current = 0
    after.current = null
    setPlaying(null)
    setLoading(false)
  }, [])

  useEffect(() => stop, [stop])

  const play = useCallback(
    (s: number, a: number, times = 1, onDone?: () => void) => {
      if (!audio.current) audio.current = new Audio()
      const el = audio.current
      el.pause()
      setError(null)
      left.current = times
      after.current = onDone ?? null
      el.src = ayahAudioUrl(reciterId, s, a)
      el.onended = () => {
        left.current = left.current === Infinity ? Infinity : left.current - 1
        if (left.current > 0) {
          el.currentTime = 0
          void el.play()
        } else {
          setPlaying(null)
          const f = after.current
          after.current = null
          f?.()
        }
      }
      el.onwaiting = () => setLoading(true)
      el.onplaying = () => setLoading(false)
      el.onerror = () => {
        setError('audio')
        setPlaying(null)
        setLoading(false)
      }
      setPlaying({ s, a })
      setLoading(true)
      el.play().catch(() => {
        setError('audio')
        setPlaying(null)
        setLoading(false)
      })
    },
    [reciterId],
  )

  return { play, stop, playing, loading, error }
}
