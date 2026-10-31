// Ayah actions for the Mushaf preview. Every action here does something real
// with an existing, safe implementation; nothing is simulated:
//   play     → EveryAyah recitation audio (lib/quran.ayahAudioUrl, default reciter)
//   tafsir   → Quran Foundation API, shown verbatim with book and author (lib/tafsir)
//   copy     → exact ayah text + reference to the clipboard
//   share    → system share sheet when available, otherwise copy
//   bookmark → preview-only marker (never written to the app store)
//   mic      → hands the ayah to the recitation screen when a host provides it
import { useEffect, useRef, useState } from 'react'
import { I } from '../kit'
import { RECITERS, ayahAudioUrl, surah, toAr } from '../../lib/quran'
import { TAFSIR_SOURCE, loadTafsir, tafsirBook, type TafsirText } from '../../lib/tafsir'
import type { PageData } from './page'

export type ActId = 'play' | 'tafsir' | 'bookmark' | 'mic' | 'copy' | 'share'
export const ACTS: { id: ActId; n: string; l: string }[] = [
  { id: 'play', n: 'play', l: 'استماع' },
  { id: 'tafsir', n: 'tafsir', l: 'التفسير' },
  { id: 'bookmark', n: 'bookmark', l: 'علامة' },
  { id: 'mic', n: 'mic', l: 'تسميع' },
  { id: 'copy', n: 'copy', l: 'نسخ' },
  { id: 'share', n: 'share', l: 'مشاركة' },
]

export const ayahText = (d: PageData | null, s: number, a: number) => d?.blocks.find((b) => b.s === s)?.ayat.find((x) => x.a === a)?.t ?? ''
const ref = (s: number, a: number) => `سورة ${surah(s).ar} · الآية ${toAr(a)}`

export function useAyahActions(onRecite?: (s: number, a: number) => void) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [bookmark, setBookmark] = useState<string | null>(null)
  const [tafsir, setTafsir] = useState<{ s: number; a: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => () => audio.current?.pause(), [])

  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(
      () => setToast('نُسخت الآية مع مرجعها'),
      () => setToast('تعذّر النسخ في هذا المتصفح'),
    ) ?? setToast('تعذّر النسخ في هذا المتصفح')

  const run = (act: ActId, s: number, a: number, text: string) => {
    const k = `${s}:${a}`
    const full = `${text} ﴿${ref(s, a)}﴾`
    if (act === 'play') {
      if (playing === k) return audio.current?.pause(), setPlaying(null)
      audio.current?.pause()
      const el = new Audio(ayahAudioUrl(RECITERS[0].id, s, a))
      audio.current = el
      el.onended = () => setPlaying(null)
      setLoadingAudio(true)
      el.play().then(
        () => (setPlaying(k), setLoadingAudio(false)),
        () => (setLoadingAudio(false), setToast('تعذّر تشغيل التلاوة (تحقّق من الاتصال)')),
      )
    } else if (act === 'tafsir') setTafsir({ s, a })
    else if (act === 'bookmark') {
      setBookmark(bookmark === k ? null : k)
      setToast(bookmark === k ? 'أُزيلت العلامة' : 'وُضعت علامة · في المعاينة فقط، لا تُحفظ في حسابك')
    } else if (act === 'mic') {
      if (onRecite) onRecite(s, a)
      else setToast('التسميع متاح من شاشة «تصحيح التلاوة والتجويد»')
    } else if (act === 'copy') void copy(full)
    else if (act === 'share') {
      if (navigator.share) navigator.share({ text: full }).catch(() => {})
      else void copy(full)
    }
  }
  const label = (act: ActId, s: number, a: number) => (act === 'play' && playing === `${s}:${a}` ? 'إيقاف' : act === 'play' && loadingAudio ? 'يحمّل…' : act === 'bookmark' && bookmark === `${s}:${a}` ? 'إزالة' : ACTS.find((x) => x.id === act)!.l)
  return { run, label, playing, bookmark, tafsir, closeTafsir: () => setTafsir(null), toast }
}

/** Verbatim Tafsir (Al-Muyassar) with book, author and source; loading and error states are explicit. */
export function TafsirPanel({ s, a, onClose }: { s: number; a: number; onClose: () => void }) {
  const [t, setT] = useState<{ d: TafsirText | null; err: boolean; n: number }>({ d: null, err: false, n: 0 })
  const book = tafsirBook(16)
  useEffect(() => {
    let live = true
    setT((x) => ({ ...x, d: null, err: false }))
    loadTafsir(book.id, s, a).then(
      (d) => live && setT((x) => ({ ...x, d })),
      () => live && setT((x) => ({ ...x, err: true })),
    )
    return () => {
      live = false
    }
  }, [s, a, book.id, t.n])
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{book.ar} · {ref(s, a)}</p>
          <p className="text-[11.5px] text-(--ui-muted)">{book.author}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق التفسير" className="mp-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--ui-ink)/[.06] text-(--ui-muted)"><I n="x" s={15} /></button>
      </div>
      <div className="mp-scroll max-h-[300px] overflow-y-auto rounded-[16px] bg-(--ui-ink)/[.04] p-4 text-[14px] leading-[1.9]">
        {t.err ? (
          <div className="text-center">
            <p>تعذّر تحميل التفسير الآن.</p>
            <button type="button" onClick={() => setT((x) => ({ ...x, n: x.n + 1 }))} className="mp-press mt-3 h-9 rounded-full bg-(--ui-ink) px-4 text-[12.5px] font-semibold text-(--ui-bg)">أعد المحاولة</button>
          </div>
        ) : !t.d ? (
          <div className="space-y-2" aria-label="جارٍ تحميل التفسير">{[90, 80, 86].map((w) => <div key={w} className="h-3 animate-pulse rounded-full bg-(--ui-ink)/10" style={{ width: `${w}%` }} />)}</div>
        ) : (
          t.d.paragraphs.map((p, i) => <p key={i} className="mb-2 last:mb-0">{p.map((x, k) => <span key={k} className={x.quote ? 'mp-text text-[1.05em]' : ''}>{x.t}</span>)}</p>)
        )}
      </div>
      <p className="mt-2 text-[11px] text-(--ui-muted)">النص كما ورد في المصدر دون تلخيص · {TAFSIR_SOURCE.name}</p>
    </div>
  )
}

export function ActionToast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div role="status" className="mp-glass pointer-events-none absolute bottom-28 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] text-(--ui-ink)">{msg}</div>
}
