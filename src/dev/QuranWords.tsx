import type { Word } from '../lib/muaalem'

const tone: Record<Word['status'], string> = {
  ok: 'text-ink',
  suspected: 'text-ink underline decoration-amber decoration-wavy decoration-2 underline-offset-[14px] bg-amber/10',
  tajweed: 'text-ink underline decoration-violet decoration-dotted decoration-[3px] underline-offset-[14px] bg-violet/10',
  unassessed: 'text-ink/55',
}

export function QuranWords({
  words,
  selected,
  onSelect,
}: {
  words: Pick<Word, 'idx' | 'aya' | 'text' | 'status'>[]
  selected?: number | null
  onSelect?: (idx: number) => void
}) {
  let lastAya = words[0]?.aya
  return (
    <p dir="rtl" lang="ar" className="font-quran text-[2rem] leading-[2.4] text-ink">
      {words.map((w, i) => {
        const endOfAya = words[i + 1]?.aya !== w.aya
        const sep = lastAya !== w.aya
        lastAya = w.aya
        const interactive = onSelect && w.status !== 'ok' && w.status !== 'unassessed'
        return (
          <span key={w.idx}>
            {sep && i > 0 ? ' ' : null}
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(w.idx)}
                aria-label={`Word ${w.idx + 1}: ${w.status === 'tajweed' ? 'tajweed observation' : 'suspected difference'}`}
                className={`rounded-md px-1 transition ${tone[w.status]} ${selected === w.idx ? 'ring-2 ring-ink/70' : ''}`}
              >
                {w.text}
              </button>
            ) : (
              <span className={`px-1 ${tone[w.status]}`}>{w.text}</span>
            )}
            {endOfAya ? <span className="mx-1 font-quran text-[1.5rem] text-moss">&#xFD3F;{toArabicDigits(w.aya)}&#xFD3E;</span> : ' '}
          </span>
        )
      })}
    </p>
  )
}

export function toArabicDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}
