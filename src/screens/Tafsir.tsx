import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { NoteSheet } from '../components/NoteSheet'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { surah, juzOf } from '../lib/quran'
import { useMushaf } from '../lib/useSurah'
import { useAyahPlayer } from '../lib/player'
import { key, setState, toggleBookmark, useActive, useStore } from '../lib/store'
import { loadTafsir, tafsirBook, TAFSIRS, TAFSIR_SOURCE, type TafsirText } from '../lib/tafsir'

export function Tafsir({ s, a }: { s: number; a: number }) {
  const { L, N, lang } = useL()
  const meta = surah(Math.min(114, Math.max(1, s)))
  const ay = Math.min(meta.ayat, Math.max(1, a))
  const { ayat, hafs } = useMushaf(meta.n)
  const p = useActive()
  const bookId = useStore((x) => x.tafsir)
  const book = tafsirBook(bookId)
  const player = useAyahPlayer(useStore((x) => x.reciter))
  const [text, setText] = useState<TafsirText | null>(null)
  const [err, setErr] = useState(false)
  const [retry, setRetry] = useState(0)
  const [big, setBig] = useState(false)
  const [note, setNoteAt] = useState<{ s: number; a: number } | null>(null)
  const saved = !!p?.bookmarks.includes(key(meta.n, ay))
  const myNote = p?.notes?.[key(meta.n, ay)]

  useEffect(() => {
    let live = true
    setText(null)
    setErr(false)
    loadTafsir(book.id, meta.n, ay)
      .then((t) => live && setText(t))
      .catch(() => live && setErr(true))
    return () => {
      live = false
    }
  }, [book.id, meta.n, ay, retry])

  useEffect(() => player.stop, [meta.n, ay, player.stop])

  const go = (d: 1 | -1) => {
    let ns = meta.n
    let na = ay + d
    if (na < 1 && ns > 1) (ns -= 1), (na = surah(ns).ayat)
    if (na > meta.ayat && ns < 114) (ns += 1), (na = 1)
    if (na < 1 || na > surah(ns).ayat) return
    navigate(`/tafsir/${ns}/${na}`, { replace: true })
  }
  const atStart = meta.n === 1 && ay === 1
  const atEnd = meta.n === 114 && ay === meta.ayat
  const mins = text ? Math.max(1, Math.round(text.words / 180)) : 0
  const chev = lang === 'ar' ? '' : 'rotate-180'

  return (
    <div className="mx-auto max-w-2xl pb-40" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="mb-5 flex items-center gap-2">
        <a href={`#/surah/${meta.n}?a=${ay}`} className="flex items-center gap-1.5 rounded-full py-2 pe-3 text-[15px] font-semibold text-gold">
          <Icon name="chevron" size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
          {lang === 'ar' ? `سورة ${meta.ar}` : meta.en}
        </a>
        <span className="ms-auto" />
        <button type="button" onClick={() => setNoteAt({ s: meta.n, a: ay })} aria-label={L('ملاحظة', 'Note')} className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${myNote ? 'bg-gold-soft text-gold ring-transparent' : 'bg-card text-night ring-line'}`}>
          <Icon name="note" size={19} />
        </button>
        <button type="button" onClick={() => toggleBookmark(meta.n, ay)} aria-pressed={saved} aria-label={saved ? L('إزالة من المحفوظات', 'Remove from saved') : L('احفظ الآية', 'Save ayah')} className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${saved ? 'bg-gold text-white ring-transparent' : 'bg-card text-night ring-line'}`}>
          <Icon name="bookmark" size={19} fill={saved} />
        </button>
      </div>

      {/* Ayah hero */}
      <section
        className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_24px_50px_-28px_rgba(20,60,40,.7)] md:p-8"
        style={{ background: 'radial-gradient(circle at 100% 100%, rgba(214,178,104,.85), transparent 55%), linear-gradient(135deg,var(--hero-a) 0%,var(--hero-b) 55%,var(--hero-c) 100%)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold tracking-wide text-white/75">
            {lang === 'ar' ? `${meta.ar} · ${N(meta.n)}:${N(ay)} · الجزء ${N(juzOf(meta.n, ay))}` : `${meta.en.toUpperCase()} · ${meta.n}:${ay}`}
          </p>
          <button type="button" onClick={() => (player.playing ? player.stop() : player.play(meta.n, ay))} aria-label={player.playing ? L('إيقاف', 'Stop') : L('استمع', 'Listen')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            {player.playing && player.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon name={player.playing ? 'pause' : 'play'} size={16} fill />}
          </button>
        </div>
        <p dir="rtl" lang="ar" className={`mushaf ${hafs ? 'hafs' : ''} mt-4 text-white ${(ayat?.[ay - 1]?.length ?? 0) > 260 ? 'text-[1.3rem] md:text-[1.55rem]' : (ayat?.[ay - 1]?.length ?? 0) > 120 ? 'text-[1.55rem] md:text-[1.85rem]' : 'text-[1.9rem] md:text-[2.2rem]'}`}>
          {ayat ? ayat[ay - 1] : <span className="block h-20 animate-pulse rounded-2xl bg-white/10" />}
          {ayat && (hafs ? <span className="mx-1 text-white/85"> {N(ay)}</span> : <span className="mx-1 font-quran text-white/80">﴿{N(ay)}﴾</span>)}
        </p>
      </section>

      {myNote && (
        <button type="button" onClick={() => setNoteAt({ s: meta.n, a: ay })} className="mt-3 flex w-full items-start gap-3 rounded-2xl bg-gold-soft/60 p-4 text-start text-[14px] text-night">
          <Icon name="note" size={18} className="mt-0.5 text-gold" />
          <span className="flex-1 whitespace-pre-line">{myNote}</span>
        </button>
      )}

      {/* Source chooser */}
      <p className="mb-2.5 mt-7 text-[12px] font-semibold tracking-wide text-muted">{L('التفسير', 'Tafsir')}</p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0" role="radiogroup" aria-label={L('كتاب التفسير', 'Tafsir book')}>
        {TAFSIRS.map((t) => {
          const on = t.id === book.id
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setState((x) => ({ ...x, tafsir: t.id }))} className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-start transition ${on ? 'bg-gold text-white shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-gold)_90%,transparent)]' : 'bg-card text-night ring-1 ring-line hover:ring-gold/40'}`}>
              <Icon name="tafsir" size={20} className={on ? '' : 'text-gold'} />
              <span>
                <span className="block text-[14px] font-semibold leading-tight">{L(t.ar, t.en)}</span>
                <span className={`block text-[11.5px] ${on ? 'text-white/75' : 'text-muted'}`}>{L(t.kind, t.kindEn)}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Tafsir text */}
      <article className="mt-4 rounded-[24px] bg-card p-6 ring-1 ring-line md:p-8">
        <div className="flex items-start gap-3">
          <Icon name="tafsir" size={22} className="mt-1 text-gold" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.35rem] font-bold leading-tight text-night">{L(book.ar, book.en)}</h1>
            <p className="mt-1 text-[12.5px] text-muted">{L(book.author, book.authorEn)}</p>
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-line" role="radiogroup" aria-label={L('حجم الخط', 'Text size')}>
            <button type="button" role="radio" aria-checked={!big} onClick={() => setBig(false)} className={`h-9 w-10 text-[13px] font-semibold ${!big ? 'bg-night text-parchment' : 'text-muted'}`}>
              أ
            </button>
            <button type="button" role="radio" aria-checked={big} onClick={() => setBig(true)} className={`h-9 w-10 text-[17px] font-semibold ${big ? 'bg-night text-parchment' : 'text-muted'}`}>
              أ
            </button>
          </div>
        </div>
        {text && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-night/5 px-2.5 py-1 text-[11.5px] text-muted">
              <Icon name="clock" size={13} />
              {L(`${N(mins)} د قراءة`, `${mins} min read`)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-night/5 px-2.5 py-1 text-[11.5px] text-muted">{L(book.kind, book.kindEn)}</span>
          </div>
        )}
        <div className="my-5 h-px bg-line" />

        {err ? (
          <div className="py-6 text-center">
            <p className="text-clay">{L('تعذّر تحميل التفسير. تحقّق من الاتصال بالإنترنت.', 'Couldn’t load the tafsir. Check your internet connection.')}</p>
            <button type="button" onClick={() => setRetry((r) => r + 1)} className="mt-3 rounded-full bg-night/5 px-4 py-2 text-sm font-medium">
              {L('إعادة المحاولة', 'Try again')}
            </button>
          </div>
        ) : !text ? (
          <div className="space-y-3" aria-busy>
            {[92, 100, 84, 96, 60].map((w, i) => (
              <div key={i} className="h-4 animate-pulse rounded-full bg-night/8" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : text.paragraphs.length === 0 ? (
          <p className="py-4 text-center text-muted">{L('لا يوجد نص لهذه الآية في هذا الكتاب. جرّب كتابًا آخر.', 'This book has no entry for this ayah. Try another book.')}</p>
        ) : (
          <div dir="rtl" lang="ar" className={`space-y-4 text-night/90 ${big ? 'text-[1.3rem] leading-[2.15]' : 'text-[1.08rem] leading-[2]'}`} style={{ fontFamily: "'Noto Naskh Arabic', 'IBM Plex Sans Arabic', serif" }}>
            {text.paragraphs.map((para, i) => (
              <p key={i}>
                {para.map((sg, j) =>
                  sg.quote ? (
                    <span key={j} className="font-quran text-gold">
                      {sg.t}
                    </span>
                  ) : (
                    <span key={j}>{sg.t}</span>
                  ),
                )}
              </p>
            ))}
          </div>
        )}

        <p className="mt-6 border-t border-line pt-4 text-[11.5px] leading-relaxed text-muted">
          {L('المصدر: ', 'Source: ')}
          <span className="font-medium text-night/80">{L(book.ar, book.en)}</span>
          {' — '}
          {L(book.author, book.authorEn)}
          {L('. النص كما هو من ', '. Verbatim text via ')}
          <a href={TAFSIR_SOURCE.url} target="_blank" rel="noreferrer" className="text-gold underline">
            {TAFSIR_SOURCE.name}
          </a>
          {L('. نص الآية: مصحف تنزيل (الرسم العثماني).', '. Ayah text: Tanzil Uthmani.')}
        </p>
      </article>

      {/* Ayah stepper */}
      <div className="fixed inset-x-0 bottom-[84px] z-30 px-4 md:bottom-6 md:start-64">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-[22px] bg-card/90 p-2 shadow-[0_14px_34px_-16px_rgba(16,24,40,.45)] ring-1 ring-line backdrop-blur">
          <button type="button" disabled={atStart} onClick={() => go(-1)} className="flex h-11 items-center gap-1 rounded-2xl bg-gold-soft/70 px-4 text-[14px] font-semibold text-night disabled:opacity-30">
            <Icon name="chevron" size={18} className={chev} />
            {L('السابقة', 'Prev')}
          </button>
          <div className="flex-1 text-center leading-tight">
            <p className="text-[11px] text-muted">{L('الآية', 'Ayah')}</p>
            <p className="text-[15px] font-bold tabular-nums">{L(`${N(ay)} من ${N(meta.ayat)}`, `${ay} of ${meta.ayat}`)}</p>
          </div>
          <button type="button" disabled={atEnd} onClick={() => go(1)} className="flex h-11 items-center gap-1 rounded-2xl bg-gold-soft/70 px-4 text-[14px] font-semibold text-night disabled:opacity-30">
            {L('التالية', 'Next')}
            <Icon name="chevron" size={18} className={lang === 'ar' ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      <NoteSheet at={note} onClose={() => setNoteAt(null)} />
    </div>
  )
}
