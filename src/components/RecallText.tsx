import { useEffect, useState } from 'react'
import { AyahMark } from './Mushaf'
import { firstLetter, isMark, words } from '../lib/quran'

export type RecallLevel = 0 | 1 | 2 | 3

/** Ayah text with progressive hiding. Hidden words can be tapped to peek. */
export function RecallText({ text, aya, level, size = '2.2rem', dark = false, hafs = false }: { text: string; aya: number; level: RecallLevel; size?: string; dark?: boolean; hafs?: boolean }) {
  const ws = words(text)
  const [peek, setPeek] = useState<Set<number>>(new Set())
  useEffect(() => setPeek(new Set()), [text, level])

  const reveal = (i: number) => {
    setPeek((s) => new Set(s).add(i))
    setTimeout(
      () =>
        setPeek((s) => {
          const n = new Set(s)
          n.delete(i)
          return n
        }),
      2200,
    )
  }

  return (
    <p dir="rtl" lang="ar" className={`mushaf ${hafs ? 'hafs' : ''} text-center ${dark ? 'text-parchment' : 'text-night'}`} style={{ fontSize: size }}>
      {ws.map((w, i) => {
        // Hizb / sajdah ornaments are not words: always visible, never hidden.
        const hidden = !isMark(w) && (level === 3 || (level === 1 && i % 2 === 1))
        const cue = level === 2 && !isMark(w)
        if (peek.has(i) || (!hidden && !cue))
          return (
            <span key={i} className={peek.has(i) ? 'rounded-md bg-gold-soft/50 px-1' : ''}>
              {w}{' '}
            </span>
          )
        return (
          <button
            key={i}
            type="button"
            onClick={() => reveal(i)}
            aria-label="إظهار الكلمة"
            className={`mx-1 inline-flex items-center justify-start rounded-xl align-middle transition ${dark ? 'bg-white/10 hover:bg-white/20' : 'bg-night/[0.06] hover:bg-night/10'}`}
            style={{ minWidth: `${Math.max(1.6, w.length * 0.42)}em`, height: '1.3em' }}
          >
            {cue && <span className={`px-2 text-[0.9em] leading-none ${dark ? 'text-parchment/80' : 'text-night/70'}`}>{firstLetter(w)}ـ</span>}
          </button>
        )
      })}
      <AyahMark n={aya} hafs={hafs} />
    </p>
  )
}
