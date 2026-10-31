import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { AyahMark, Bismillah } from '../components/Mushaf'
import { AppearanceButton } from '../components/Appearance'
import { juzNameAr } from '../components/MushafPage'
import { ModeSwitch, MushafReader, type QuickAction, type ReadMode } from '../components/MushafReader'
import { NoteSheet } from '../components/NoteSheet'
import { Button, Segmented, Sheet, Stepper } from '../components/ui'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { hasBismillahHeader, hizbOf, isPageStart, JUZ, juzOf, loadMushaf, loadSurah, pageOf, RECITERS, surah, SURAHS } from '../lib/quran'
import { clampPage, pageStart, TOTAL_PAGES } from '../lib/usePage'
import { addPlan, newPlan, planProgress, rangeText, recordUnits, todayTask, unitLabel } from '../lib/plans'
import { useMushaf, useSurah } from '../lib/useSurah'
import { useAyahPlayer } from '../lib/player'
import { addKnown, isMemorized, key, logDay, parseKey, setState, toggleBookmark, updateActive, useActive, useStore } from '../lib/store'
import { today } from '../lib/date'

type Sel = { from: number; to: number; phase: 'start' | 'end' }

export function Reader({ n, focusAyah, planId }: { n: number; focusAyah: number | null; planId?: string }) {
  const { L, N, A, lang } = useL()
  const meta = surah(Math.min(114, Math.max(1, n)))
  // Display: KFGQPC Hafs edition (Madinah mushaf). Copy/share: Tanzil text, portable across fonts.
  const { ayat, hafs, error } = useMushaf(meta.n)
  const { ayat: plain } = useSurah(meta.n)
  const hf = hafs ? 'hafs' : ''
  const p = useActive()
  const reciterId = useStore((s) => s.reciter)
  const fontScale = useStore((s) => s.fontScale)
  const player = useAyahPlayer(reciterId)
  // Reading mode is a saved preference (Mushaf by default).
  const view: ReadMode = useStore((s) => s.readerView) ?? 'mushaf'
  const setView = (v: ReadMode) => setState((s) => ({ ...s, readerView: v }))
  const [sheet, setSheet] = useState<{ s: number; a: number } | null>(null)
  const [picked, setPicked] = useState<{ s: number; a: number } | null>(null)
  const [other, setOther] = useState<{ s: number; ayat: string[]; hafs: boolean } | null>(null)
  const [sel, setSel] = useState<Sel | null>(null)
  const [planSheet, setPlanSheet] = useState<{ s: number; from: number; to: number } | null>(null)
  const [jump, setJump] = useState(false)
  const [note, setNote] = useState<{ s: number; a: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [readDone, setReadDone] = useState(false)
  const [cur, setCur] = useState(focusAyah ?? 1)
  const [reciterSheet, setReciterSheet] = useState(false)
  const [reps, setReps] = useState(3)
  const [readSheet, setReadSheet] = useState(false)
  const [loop, setLoop] = useState(false)
  const plan = planId ? p?.plans.find((x) => x.id === planId) : undefined
  const refs = useRef<Record<number, HTMLElement | null>>({})
  const lastSaved = useRef(0)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 1800)
  }

  const saveLast = (a: number, force = false, s = meta.n) => {
    const g = s * 1000 + a
    if (!p || (!force && lastSaved.current === g)) return
    lastSaved.current = g
    updateActive((x) => ({ ...x, last: { s, a, mode: 'read' } }))
  }

  useEffect(() => {
    setSel(null)
    setCur(focusAyah ?? 1)
  }, [meta.n, focusAyah])

  // Jump to a requested ayah once text loads.
  useEffect(() => {
    if (ayat && focusAyah) setTimeout(() => refs.current[focusAyah]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80)
  }, [ayat, focusAyah])

  // Track and remember the reading position as the reader scrolls.
  useEffect(() => {
    if (!ayat) return
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.a))
        if (vis.length) {
          const a = Math.min(...vis)
          setCur(a)
          if (view === 'ayah') saveLast(a)
        }
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    Object.values(refs.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayat, view, meta.n])

  const pg = pageOf(meta.n, cur)
  const planQ = planId ? `&plan=${planId}` : ''

  // Mushaf: turn to a page. Same-surah pages move locally; others open that surah.
  const goPage = (n: number) => {
    const [s, a] = pageStart(clampPage(n))
    if (s === meta.n) (setCur(a), window.scrollTo({ top: 0 }))
    else navigate(`/surah/${s}?a=${a}${planQ}`, { replace: true })
  }
  const goAyah = (s: number, a: number) => (s === meta.n ? (setCur(a), window.scrollTo({ top: 0 })) : navigate(`/surah/${s}?a=${a}${planQ}`))

  // Keep the playing ayah in view (in Mushaf mode, turn to its page).
  useEffect(() => {
    const pl = player.playing
    if (!pl) return
    if (view !== 'mushaf') return void refs.current[pl.a]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (pageOf(pl.s, pl.a) === pg) return
    if (pl.s === meta.n) (setCur(pl.a), window.scrollTo({ top: 0, behavior: 'smooth' }))
    else navigate(`/surah/${pl.s}?a=${pl.a}${planQ}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playing])

  // Mushaf mode remembers the page being read as the last-read position.
  useEffect(() => {
    if (view === 'mushaf' && ayat) saveLast(cur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cur, ayat])

  // Text for an ayah sheet opened on another surah of a shared page.
  useEffect(() => {
    if (!sheet || sheet.s === meta.n || other?.s === sheet.s) return
    let live = true
    loadMushaf(sheet.s).then((r) => live && setOther({ s: sheet.s, ...r }))
    return () => {
      live = false
    }
  }, [sheet, meta.n, other])

  /** Play from an ayah to the end of its surah (Mushaf mode continues into the next surah). */
  const playFrom = (a: number, s = meta.n, cross = view === 'mushaf') => {
    const go = (x: number, y: number) =>
      player.play(x, y, 1, () => (y < surah(x).ayat ? go(x, y + 1) : cross && x < 114 ? go(x + 1, 1) : undefined))
    go(s, a)
    saveLast(a, false, s)
  }

  const startSelect = (from: number) => setSel({ from, to: Math.min(meta.ayat, from + Math.max(1, p?.dailyAyat ?? 3) - 1), phase: 'start' })

  const tapAyah = (a: number) => {
    if (sel) {
      if (sel.phase === 'start' || a < sel.from) setSel({ from: a, to: a, phase: 'end' })
      else setSel({ ...sel, to: a, phase: 'start' })
      return
    }
    setSheet({ s: meta.n, a })
  }

  const inSel = (a: number) => !!sel && a >= sel.from && a <= sel.to
  const size = `${(view === 'flow' ? 1.75 : 1.95) * fontScale}rem`
  const ref = (s: number, a: number) => (lang === 'ar' ? `[${surah(s).ar}: ${N(a)}]` : `[${surah(s).en} ${s}:${a}]`)

  const copyAyah = async (a: number, share = false, s = meta.n) => {
    const src = s === meta.n ? (plain ?? ayat) : await loadSurah(s).catch(() => null)
    if (!src) return
    const txt = `${src[a - 1]} ﴿${N(a)}﴾\n${ref(s, a)}`
    try {
      if (share && navigator.share) await navigator.share({ text: txt })
      else {
        await navigator.clipboard.writeText(txt)
        flash(L('نُسخت الآية', 'Ayah copied'))
      }
    } catch {
      /* user cancelled share or clipboard blocked */
    }
  }

  const prevS = meta.n > 1 ? SURAHS[meta.n - 2] : null
  const nextS = meta.n < 114 ? SURAHS[meta.n] : null
  const juz = juzOf(meta.n, cur)
  const page = pageOf(meta.n, cur)
  const hz = hizbOf(meta.n, cur)
  const quarter = ['', '', '¼ ', '½ ', '¾ '][hz.quarter]

  // Mushaf page marks: selection, recitation and bookmarks, keyed by surah:ayah.
  const pageMarks = useMemo(() => {
    const state: Record<string, 'selected' | 'playing'> = {}
    if (sel) for (let a = sel.from; a <= sel.to; a++) state[key(meta.n, a)] = 'selected'
    for (const x of [picked, sheet]) if (x) state[key(x.s, x.a)] = 'selected'
    if (player.playing) state[key(player.playing.s, player.playing.a)] = 'playing'
    return { state, bookmarks: new Set(p?.bookmarks ?? []) }
  }, [sel, picked, sheet, player.playing, p?.bookmarks, meta.n])
  const pageRibbon = !!p?.bookmarks.some((k) => pageOf(...parseKey(k)) === pg)
  const pageMarked = !!p?.bookmarks.includes(key(...pageStart(pg)))

  const tapPageAyah = (s: number, a: number) => (sel ? s === meta.n && tapAyah(a) : setSheet({ s, a }))
  const quick = (act: QuickAction, s: number, a: number) => {
    if (act === 'play') playFrom(a, s)
    else if (act === 'tafsir') navigate(`/tafsir/${s}/${a}`)
    else if (act === 'bookmark') toggleBookmark(s, a)
    else if (act === 'recite') navigate(`/recite?s=${s}&from=${a}&to=${a}`)
    else if (act === 'copy') void copyAyah(a, false, s)
    else if (act === 'share') void copyAyah(a, true, s)
    else setSheet({ s, a })
  }

  const playerPill = (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/95 py-1.5 pe-1.5 ps-2 shadow-[0_14px_34px_-14px_rgba(16,24,40,.45)] ring-1 ring-line backdrop-blur">
      <button type="button" onClick={() => setReciterSheet(true)} aria-label={L('اختر القارئ', 'Choose reciter')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-night/5">
        <Icon name="chevron" size={17} className="-rotate-90" />
      </button>
      <span className="max-w-[11rem] truncate px-1 text-[13px] font-medium">
        {player.playing ? L(`${RECITERS.find((r) => r.id === reciterId)?.ar.split(' (')[0] ?? ''} · ${player.playing.s === meta.n ? '' : `${surah(player.playing.s).ar} `}${N(player.playing.a)}`, `${RECITERS.find((r) => r.id === reciterId)?.en ?? ''} · ${player.playing.s === meta.n ? '' : `${surah(player.playing.s).en} `}${player.playing.a}`) : L(RECITERS.find((r) => r.id === reciterId)?.ar.split(' (')[0] ?? '', RECITERS.find((r) => r.id === reciterId)?.en ?? '')}
      </span>
      <button type="button" onClick={() => setLoop((v) => !v)} aria-pressed={loop} aria-label={L('تكرار الآية', 'Loop ayah')} title={L('تكرار الآية الحالية', 'Loop the current ayah')} className={`flex h-9 w-9 items-center justify-center rounded-full ${loop ? 'bg-gold-soft text-gold' : 'text-muted hover:bg-night/5'}`}>
        <Icon name="repeat" size={18} />
      </button>
      <button
        type="button"
        onClick={() => (player.playing ? player.stop() : loop ? player.play(meta.n, cur, Infinity) : view === 'mushaf' ? playFrom(pageStart(pg)[1], pageStart(pg)[0]) : playFrom(cur))}
        aria-label={player.playing ? L('إيقاف', 'Stop') : L('استمع', 'Listen')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-night text-parchment"
      >
        {player.playing && player.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment" /> : <Icon name={player.playing ? 'pause' : 'play'} size={16} fill />}
      </button>
    </div>
  )

  const endCard = (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mt-10 rounded-[2rem] bg-card p-6 text-center ring-1 ring-line">
      <p className="font-arabic-display text-2xl">{L('نهاية السورة', 'End of the surah')}</p>
      {p && (
        <Button
          variant={readDone ? 'soft' : 'primary'}
          className="mt-4"
          disabled={readDone}
          onClick={() => {
            updateActive((x) => ({ ...logDay(x, { read: meta.ayat, minutes: 0 }), last: { s: meta.n, a: meta.ayat, mode: 'read' } }))
            setReadDone(true)
          }}
        >
          <Icon name="check" size={18} />
          {readDone ? L('سُجّلت قراءتك اليوم', 'Logged for today') : L('أتممت قراءة السورة', 'I finished reading this surah')}
        </Button>
      )}
      <div className="mt-6 flex justify-between gap-3 text-sm">
        {prevS ? (
          <a href={`#/surah/${prevS.n}`} className="text-muted hover:text-night">
            {lang === 'ar' ? `→ ${prevS.ar}` : `← ${prevS.en}`}
          </a>
        ) : (
          <span />
        )}
        {nextS && (
          <a href={`#/surah/${nextS.n}`} className="font-medium text-gold">
            {lang === 'ar' ? `${nextS.ar} ←` : `${nextS.en} →`}
          </a>
        )}
      </div>
    </div>
  )

  return (
    <div className={view === 'mushaf' ? 'pb-48 md:pb-44' : 'pb-40'}>
      {/* Reading toolbar (approved Mushaf design): title, mode, tools */}
      <div className="glass-panel sticky top-0 z-30 -mx-5 md:-mx-10 md:-mt-10" style={{ borderRadius: 0 }}>
        <div className="flex h-16 items-center gap-1 px-3 md:gap-4 md:px-6">
          <a href="#/quran" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-night/5" aria-label={L('المصحف', 'Quran')}>
            <Icon name="back" className={lang === 'ar' ? 'rotate-180' : ''} />
          </a>
          <div className="min-w-0 flex-1 leading-tight md:min-w-[13rem] md:flex-none">
            <p className="truncate text-[15px] font-semibold">{lang === 'ar' ? `سورة ${meta.ar}` : meta.en}</p>
            <p className="truncate text-[12px] text-muted">{L(`${juzNameAr(juz)} · الحزب ${N(hz.hizb)} · ص ${N(page)}`, `Juz ${juz} · Hizb ${hz.hizb} · p. ${page}`)}</p>
          </div>
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <ModeSwitch mode={view} onChange={setView} />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 md:min-w-[13rem] md:justify-end">
            <TopIcon icon="search" label={L('انتقل إلى سورة أو جزء', 'Go to surah or juz')} onClick={() => setJump(true)} />
            <TopIcon icon="layers" label={sel ? L('إلغاء التحديد', 'Cancel selection') : L('حدّد آيات للحفظ', 'Select ayat to memorise')} active={!!sel} onClick={() => (sel ? setSel(null) : startSelect(cur))} />
            {view === 'mushaf' && p && <TopIcon icon="bookmark" fill={pageMarked} active={pageMarked} label={pageMarked ? L('إزالة علامة الصفحة', 'Remove page bookmark') : L('علامة على الصفحة', 'Bookmark this page')} onClick={() => toggleBookmark(...pageStart(pg))} />}
            <TopIcon icon="type" label={L('إعدادات القراءة', 'Reading settings')} onClick={() => setReadSheet(true)} />
          </div>
        </div>
        {view !== 'mushaf' && <SurahTabs n={meta.n} />}
        <div className="h-0.5 bg-line/70">
          <div className="h-full bg-gold transition-[width] duration-300" style={{ width: `${view === 'mushaf' ? (pg / TOTAL_PAGES) * 100 : (cur / meta.ayat) * 100}%` }} />
        </div>
      </div>

      {/* Surah sub-header */}
      <div className={`mb-5 mt-4 flex-wrap items-center gap-2 ${view === 'mushaf' ? 'hidden' : 'flex'}`}>
        <h1 className="me-auto text-[17px] font-bold">{lang === 'ar' ? `سورة ${meta.ar}` : meta.en}</h1>
        <Chip>{A(meta.ayat)}</Chip>
        <Chip>{meta.place === 'makkah' ? L('مكية', 'Makki') : L('مدنية', 'Madani')}</Chip>
        <Chip>{L(`ص ${N(page)} · ج ${N(juz)} · ${quarter}ح ${N(hz.hizb)}`, `p${page} · j${juz} · ${quarter}h${hz.hizb}`)}</Chip>
      </div>
      {player.error && <p className="mb-4 rounded-2xl bg-clay/10 p-3 text-sm text-clay">{L('تعذّر تشغيل الصوت. تحقّق من الاتصال بالإنترنت.', 'Couldn’t play audio. Check your internet connection.')}</p>}

      {plan && p && <PlanBanner planId={plan.id} />}

      {error && <p className="rounded-2xl bg-clay/10 p-4 text-clay">{L('تعذّر تحميل نص السورة.', 'Couldn’t load the surah text.')}</p>}
      {!ayat && !error && view !== 'mushaf' && <div className="h-64 animate-pulse rounded-3xl bg-night/5" />}

      {view === 'mushaf' && (
        <div className="mt-6 md:mt-8">
          <MushafReader
            pg={pg}
            size={`calc(clamp(1.0625rem, 4.3vw, 1.375rem) * ${fontScale})`}
            marks={pageMarks}
            ribbon={pageRibbon}
            bookmarked={(s, a) => !!p?.bookmarks.includes(key(s, a))}
            onGo={goPage}
            onGoAyah={goAyah}
            onAyah={tapPageAyah}
            onQuick={quick}
            onSelect={setPicked}
            selecting={!!sel}
            player={playerPill}
            playing={!!player.playing}
            loading={player.loading}
            onPlay={() => (player.playing ? player.stop() : playFrom(pageStart(pg)[1], pageStart(pg)[0]))}
            onSettings={() => setReadSheet(true)}
          />
          {pageOf(meta.n, meta.ayat) === pg && <div className="mx-auto mt-8 max-w-[640px]">{endCard}</div>}
        </div>
      )}

      {ayat && view !== 'mushaf' && (
        <article dir="rtl" lang="ar" className="mx-auto max-w-3xl">
          {hasBismillahHeader(meta.n) && <Bismillah className="mb-6" hafs={hafs} />}
          {view === 'flow' ? (
            <p className={`mushaf ${hf} mf-paper rounded-[26px] px-6 py-8 text-justify text-[var(--mf-ink)] md:px-14 md:py-10`} style={{ fontSize: size }}>
              {ayat.map((t, i) => {
                const a = i + 1
                const on = player.playing?.a === a
                const juzStart = JUZ.findIndex(([s, x]) => s === meta.n && x === a)
                return (
                  <span
                    key={a}
                    ref={(el) => {
                      refs.current[a] = el
                    }}
                    data-a={a}
                    role="button"
                    tabIndex={0}
                    onClick={() => tapAyah(a)}
                    onKeyDown={(e) => e.key === 'Enter' && tapAyah(a)}
                    className={`cursor-pointer rounded-lg transition-colors ${on ? 'bg-gold-soft' : inSel(a) ? 'bg-gold/15' : focusAyah === a ? 'bg-gold-soft/60' : 'hover:bg-night/5'}`}
                  >
                    {juzStart > 0 && <span className="mx-1 inline-block rounded-full bg-gold px-2 align-middle font-sans text-[11px] leading-5 text-white">{L(`بداية الجزء ${N(juzStart + 1)}`, `Juz ${juzStart + 1}`)}</span>}
                    {a > 1 && isPageStart(meta.n, a) && <span className="mx-1 inline-block rounded-full bg-night/[0.06] px-2 align-middle font-sans text-[11px] leading-5 text-muted">{L(`ص ${N(pageOf(meta.n, a))}`, `p. ${pageOf(meta.n, a)}`)}</span>}
                    {t}
                    <AyahMark n={a} hafs={hafs} />{' '}
                  </span>
                )
              })}
            </p>
          ) : (
            <ol className="space-y-3">
              {ayat.map((t, i) => {
                const a = i + 1
                const on = player.playing?.a === a
                const mem = p && isMemorized(p, meta.n, a)
                const saved = p?.bookmarks.includes(key(meta.n, a))
                const hasNote = !!p?.notes?.[key(meta.n, a)]
                const juzStart = JUZ.findIndex(([s, x]) => s === meta.n && x === a)
                return (
                  <li
                    key={a}
                    ref={(el) => {
                      refs.current[a] = el
                    }}
                    data-a={a}
                  >
                    {a > 1 && isPageStart(meta.n, a) && (
                      <div className="my-3 flex items-center gap-3 text-[12px] text-muted" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <span className="h-px flex-1 bg-line" />
                        {L(`الصفحة ${N(pageOf(meta.n, a))}`, `Page ${pageOf(meta.n, a)}`)}
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    {juzStart > 0 && (
                      <p className="mb-2 inline-block rounded-e-full bg-gold px-3 py-1 text-[12px] font-medium text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        {L(`بداية الجزء ${N(juzStart + 1)}`, `Start of Juz ${juzStart + 1}`)}
                      </p>
                    )}
                    <div className={`mf-paper rounded-[22px] shadow-[0_10px_24px_-18px_rgba(40,35,20,.45)] transition ${on ? 'ring-2 ring-[var(--mf-play-line)]' : inSel(a) ? 'ring-2 ring-gold/70' : focusAyah === a ? 'ring-1 ring-gold/60' : 'ring-1 ring-[var(--mf-frame-soft)]'}`}>
                      <button type="button" onClick={() => tapAyah(a)} className="block w-full px-5 pb-2 pt-5 text-right">
                        <span className={`mushaf ${hf} block text-[var(--mf-ink)]`} style={{ fontSize: size }}>
                          {t} <AyahMark n={a} hafs={hafs} />
                        </span>
                      </button>
                      <div className="flex items-center gap-2 border-t border-[var(--mf-frame-soft)] px-4 py-2.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        {inSel(a) && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] text-white">{L('للحفظ', 'To memorise')}</span>}
                        {mem && <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] text-leaf">{L('محفوظة', 'Memorised')}</span>}
                        {hasNote && <Icon name="note" size={15} className="text-gold" />}
                        <span className="ms-auto" />
                        {p && (
                          <label className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-[13px] hover:bg-night/5">
                            <input type="checkbox" checked={!!saved} onChange={() => toggleBookmark(meta.n, a)} className="h-[18px] w-[18px] rounded-full accent-[var(--color-gold)]" />
                            {L('علامة', 'Mark')}
                          </label>
                        )}
                        <button type="button" onClick={() => setSheet({ s: meta.n, a })} aria-label={L('خيارات الآية', 'Ayah options')} className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-line hover:bg-night/5">
                          <Icon name="more" size={18} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="mt-10">{endCard}</div>
        </article>
      )}

      {/* Selection bar: choose exactly which ayat to memorise */}
      {sel && (
        <div className={`fixed inset-x-0 bottom-[84px] z-40 px-4 md:start-64 ${view === 'mushaf' ? 'md:bottom-[92px]' : 'md:bottom-6'}`}>
          <div className="rise mx-auto max-w-2xl rounded-[1.6rem] bg-card p-4 shadow-[0_18px_40px_-16px_rgba(16,24,40,.45)] ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] text-muted">{sel.phase === 'end' ? L('اضغط آية النهاية، أو عدّل الأرقام', 'Tap the last ayah, or adjust the numbers') : L('اضغط آية البداية، أو عدّل الأرقام', 'Tap the first ayah, or adjust the numbers')}</p>
              <button type="button" onClick={() => setSel(null)} aria-label={L('إلغاء', 'Cancel')} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-night/5">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">{L('من', 'From')}</span>
                <Stepper value={sel.from} min={1} max={meta.ayat} onChange={(v) => setSel({ ...sel, from: v, to: Math.max(v, sel.to) })} format={N} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">{L('إلى', 'To')}</span>
                <Stepper value={sel.to} min={sel.from} max={meta.ayat} onChange={(v) => setSel({ ...sel, to: v })} format={N} />
              </div>
              <span className="text-sm font-semibold text-gold">{A(sel.to - sel.from + 1)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button size="sm" href={`#/memorize?s=${meta.n}&from=${sel.from}&to=${sel.to}`}>
                <Icon name="sprout" size={16} />
                {L('احفظ', 'Memorise')}
              </Button>
              <Button size="sm" variant="soft" href={`#/recite?s=${meta.n}&from=${sel.from}&to=${sel.to}`}>
                <Icon name="mic" size={16} />
                {L('سمّع', 'Recite')}
              </Button>
              <Button size="sm" variant="soft" onClick={() => setPlanSheet({ s: meta.n, from: sel.from, to: sel.to })}>
                <Icon name="calendar" size={16} />
                {L('إلى خطتي', 'To plan')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ayah actions (surah-aware: Mushaf pages can hold several surahs) */}
      <Sheet open={sheet != null} onClose={() => setSheet(null)} title={sheet && <span className="text-[1.45rem] font-bold">{lang === 'ar' ? `${surah(sheet.s).ar}: ${N(sheet.a)}` : `${surah(sheet.s).en}: ${sheet.a}`}</span>}>
        {sheet != null && (() => {
          const { s: ss, a: sa } = sheet
          const src = ss === meta.n ? (ayat ? { ayat, hafs } : null) : other?.s === ss ? other : null
          const saved = !!p?.bookmarks.includes(key(ss, sa))
          const close = () => setSheet(null)
          return (
            <div>
              <div className="mf-paper rounded-[22px] p-4">
                {src ? (
                  <p dir="rtl" lang="ar" className={`mf-text ${src.hafs ? '' : 'tanzil'} max-h-52 overflow-y-auto text-[1.5rem]`} style={{ lineHeight: 2, textAlignLast: 'right', textAlign: 'right' }}>
                    {src.ayat[sa - 1]} <AyahMark n={sa} hafs={src.hafs} />
                  </p>
                ) : (
                  <div className="h-16 animate-pulse rounded-xl bg-night/5" />
                )}
                <p className="mt-2 border-t border-[var(--mf-frame-soft)] pt-2 text-[12px] text-[var(--mf-ink-soft)]">{L(`الصفحة ${N(pageOf(ss, sa))} · الجزء ${N(juzOf(ss, sa))} · الحزب ${N(hizbOf(ss, sa).hizb)}`, `Page ${pageOf(ss, sa)} · Juz ${juzOf(ss, sa)} · Hizb ${hizbOf(ss, sa).hizb}`)}</p>
              </div>
              <button
                type="button"
                onClick={() => (saveLast(sa, true, ss), close(), flash(L('حُفظ موضع القراءة', 'Last read saved')))}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 text-[15px] font-semibold text-white"
              >
                <Icon name="pin" size={19} />
                {L('حدّد آخر قراءة هنا', 'Mark my last read here')}
              </button>
              <div className="no-scrollbar -mx-6 mt-4 flex gap-2.5 overflow-x-auto px-6 pb-1">
                <Tile icon="tafsir" label={L('التفسير', 'Tafsir')} onClick={() => navigate(`/tafsir/${ss}/${sa}`)} />
                <Tile icon="play" label={L('تشغيل', 'Play')} onClick={() => (playFrom(sa, ss), close())} />
                <Tile icon="repeat" label={L(`كرّر ${reps === 0 ? '∞' : N(reps)}`, `Repeat ${reps === 0 ? '∞' : reps}`)} onClick={() => (player.play(ss, sa, reps === 0 ? Infinity : reps), close())} />
                <Tile icon="sprout" label={L('حفظ', 'Hifz')} onClick={() => (setPlanSheet({ s: ss, from: sa, to: sa }), close())} />
                <Tile icon="calendar" label={L('مراجعة', 'Murajaah')} onClick={() => (setPlanSheet({ s: ss, from: sa, to: sa }), close())} />
                <Tile icon="mic" label={L('سمّع', 'Recite')} onClick={() => navigate(`/recite?s=${ss}&from=${sa}&to=${sa}`)} />
                <Tile icon="bookmark" fill={saved} label={saved ? L('محفوظة', 'Saved') : L('علامة', 'Mark')} onClick={() => toggleBookmark(ss, sa)} />
                <Tile icon="note" label={L('ملاحظة', 'Note')} onClick={() => (setNote({ s: ss, a: sa }), close())} />
                <Tile icon="copy" label={L('نسخ', 'Copy')} onClick={() => (copyAyah(sa, false, ss), close())} />
                <Tile icon="share" label={L('مشاركة', 'Share')} onClick={() => (copyAyah(sa, true, ss), close())} />
                <Tile icon="layers" label={L('تحديد', 'Select')} onClick={() => (ss === meta.n ? setSel({ from: sa, to: sa, phase: 'end' }) : navigate(`/surah/${ss}?a=${sa}${planQ}`), close())} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{L('عدد مرات التكرار', 'Repetitions')}</span>
                <div className="flex rounded-full bg-night/5 p-0.5" role="radiogroup" aria-label={L('عدد التكرار', 'Repetitions')}>
                  {[3, 5, 10, 0].map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={reps === r} onClick={() => setReps(r)} className={`h-8 min-w-9 rounded-full px-2 text-[13px] ${reps === r ? 'bg-card font-semibold shadow-sm' : 'text-muted'}`}>
                      {r === 0 ? '∞' : N(r)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </Sheet>

      {/* Floating player pill */}
      {ayat && !sel && view !== 'mushaf' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 flex justify-center px-4 md:bottom-6 md:start-64">
          {playerPill}
        </div>
      )}

      <Sheet open={readSheet} onClose={() => setReadSheet(false)} title={L('إعدادات القراءة', 'Reading settings')}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{L('حجم خط المصحف', 'Quran text size')}</span>
            <Stepper value={Math.round(fontScale * 10)} min={8} max={16} onChange={(v) => setState((x) => ({ ...x, fontScale: v / 10 }))} format={(n) => `${N(n * 10)}٪`} />
          </div>
          <div>
            <span className="mb-2.5 block font-medium">{L('وضع القراءة', 'Reading mode')}</span>
            <ModeSwitch mode={view} onChange={setView} compact />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
            <span>
              <span className="block font-medium">{L('المظهر والألوان', 'Appearance & colours')}</span>
              <span className="block text-[12.5px] text-muted">{L('لون صفحة المصحف يتبع مظهر التطبيق', 'The Mushaf page follows your app appearance')}</span>
            </span>
            <AppearanceButton className="bg-night/5 text-night hover:bg-night/10" />
          </div>
          <button type="button" onClick={() => (setReadSheet(false), setReciterSheet(true))} className="flex w-full items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line">
            <span className="font-medium">{L('القارئ', 'Reciter')}</span>
            <span className="text-sm text-muted">{L(RECITERS.find((r) => r.id === reciterId)?.ar ?? '', RECITERS.find((r) => r.id === reciterId)?.en ?? '')}</span>
          </button>
        </div>
      </Sheet>

      <Sheet open={reciterSheet} onClose={() => setReciterSheet(false)} title={L('القارئ', 'Reciter')}>
        <div className="space-y-2">
          {RECITERS.map((r) => (
            <button key={r.id} type="button" onClick={() => (setState((x) => ({ ...x, reciter: r.id })), player.stop(), setReciterSheet(false))} className={`flex w-full items-center justify-between rounded-2xl p-4 text-start ring-1 ${reciterId === r.id ? 'bg-gold-soft/60 ring-gold/40' : 'bg-card ring-line'}`}>
              {L(r.ar, r.en)}
              {reciterId === r.id && <Icon name="check" className="text-gold" />}
            </button>
          ))}
          <p className="pt-1 text-xs text-muted">{L('التلاوات من EveryAyah.com وتحتاج اتصالًا بالإنترنت.', 'Recitations stream from EveryAyah.com and need a connection.')}</p>
        </div>
      </Sheet>

      <JumpSheet open={jump} s={meta.n} onClose={() => setJump(false)} />
      <NoteSheet at={note} onClose={() => setNote(null)} />
      <AddToPlanSheet range={planSheet} s={planSheet?.s ?? meta.n} onClose={() => (setPlanSheet(null), setSel(null))} />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
          <div className="rise rounded-full bg-night px-4 py-2.5 text-[13px] font-semibold text-parchment shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}

function Tile({ icon, label, onClick, fill }: { icon: string; label: string; onClick: () => void; fill?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-[4.9rem] shrink-0 flex-col items-center gap-2 rounded-[18px] bg-card px-1 py-3.5 text-[12.5px] text-night ring-1 ring-line hover:ring-gold/50">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft/80 text-gold">
        <Icon name={icon} size={19} fill={fill} />
      </span>
      {label}
    </button>
  )
}

function TopIcon({ icon, label, onClick, active, fill }: { icon: string; label: string; onClick: () => void; active?: boolean; fill?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active} className={`flex h-10 w-10 items-center justify-center rounded-full transition ${active ? 'bg-gold-soft text-gold' : 'text-night/75 hover:bg-night/5'}`}>
      <Icon name={icon} size={20} fill={fill} />
    </button>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-card px-3 py-1.5 text-[12px] text-night/80 ring-1 ring-line">{children}</span>
}

/** Neighbouring surahs as tabs; the active one is underlined. */
function SurahTabs({ n }: { n: number }) {
  const { lang } = useL()
  const ref = useRef<HTMLAnchorElement | null>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [n])
  const list = SURAHS.slice(Math.max(0, n - 6), Math.min(114, n + 5))
  return (
    <nav className="no-scrollbar mt-1 flex gap-1 overflow-x-auto px-3 md:px-7" aria-label={lang === 'ar' ? 'السور' : 'Surahs'}>
      {list.map((x) => {
        const on = x.n === n
        return (
          <a key={x.n} ref={on ? ref : undefined} href={`#/surah/${x.n}`} aria-current={on ? 'page' : undefined} className={`relative shrink-0 whitespace-nowrap px-3 pb-3 pt-2 text-[15px] transition ${on ? 'font-semibold text-gold' : 'text-muted hover:text-night'}`}>
            {lang === 'ar' ? x.ar : x.en}
            {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold" />}
          </a>
        )
      })}
    </nav>
  )
}

/** Go to a surah + ayah, or to the start of a juz. */
function JumpSheet({ open, s, onClose }: { open: boolean; s: number; onClose: () => void }) {
  const { L, N, lang } = useL()
  const [tab, setTab] = useState<'surah' | 'juz'>('surah')
  const [ts, setTs] = useState(s)
  const [ta, setTa] = useState(1)
  useEffect(() => {
    if (open) (setTs(s), setTa(1))
  }, [open, s])
  const go = (to: string) => (onClose(), navigate(to))
  return (
    <Sheet open={open} onClose={onClose} title={L('انتقل إلى', 'Go to')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'surah', label: L('سورة وآية', 'Surah & ayah') },
          { value: 'juz', label: L('جزء', 'Juz') },
        ]}
      />
      {tab === 'surah' ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">{L('السورة', 'Surah')}</span>
            <select value={ts} onChange={(e) => (setTs(Number(e.target.value)), setTa(1))} className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none">
              {SURAHS.map((x) => (
                <option key={x.n} value={x.n}>
                  {lang === 'ar' ? `${N(x.n)}. ${x.ar}` : `${x.n}. ${x.en}`}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{L('الآية', 'Ayah')}</span>
            <Stepper value={ta} min={1} max={surah(ts).ayat} onChange={setTa} format={N} />
          </div>
          <Button className="w-full" onClick={() => go(`/surah/${ts}?a=${ta}`)}>
            {L('انتقل', 'Go')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {JUZ.map(([js, ja], i) => (
            <button key={i} type="button" onClick={() => go(`/surah/${js}?a=${ja}`)} className={`rounded-2xl py-3 text-center ring-1 ${juzOf(s, 1) === i + 1 ? 'bg-gold text-white ring-transparent' : 'bg-card ring-line hover:ring-gold/50'}`}>
              <span className="block text-[17px] font-bold">{N(i + 1)}</span>
              <span className={`block truncate px-1 text-[10px] ${juzOf(s, 1) === i + 1 ? 'text-white/80' : 'text-muted'}`}>{lang === 'ar' ? surah(js).ar : surah(js).en}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

/** From the reader: turn selected ayat into a memorisation plan, or into revision. */
export function AddToPlanSheet({ range, s, onClose }: { range: { from: number; to: number } | null; s: number; onClose: () => void }) {
  const { L, N, lang } = useL()
  const p = useActive()
  const meta = surah(s)
  const [done, setDone] = useState<{ msg: string; href?: string } | null>(null)
  const label = useMemo(() => (range ? rangeText([s, range.from], [s, range.to], lang, N) : ''), [range, lang, s, N])
  if (!p) return null
  const close = () => (setDone(null), onClose())
  const known = range ? Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from + i).filter((a) => isMemorized(p, s, a)).length : 0
  const Option = ({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-start ring-1 ring-line hover:ring-gold/50">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
        <Icon name={icon} size={19} />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
    </button>
  )
  return (
    <Sheet open={!!range} onClose={close} title={L('إلى خططي', 'Add to my plans')}>
      {done ? (
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
            <Icon name="check" size={26} />
          </span>
          <p className="mt-3 text-lg font-semibold">{done.msg}</p>
          <div className="mt-5 flex justify-center gap-2">
            {done.href && (
              <Button href={done.href} onClick={close}>
                {L('افتح الخطة', 'Open plan')}
              </Button>
            )}
            <Button variant="outline" onClick={close}>
              {L('متابعة القراءة', 'Keep reading')}
            </Button>
          </div>
        </div>
      ) : (
        range && (
          <div className="space-y-2.5">
            <p className="text-muted">
              {label} · {unitLabel('ayah', range.to - range.from + 1, lang, N)}
              {known > 0 && L(` · تحفظ منها ${N(known)}`, ` · you know ${known}`)}
            </p>
            <Option
              icon="play"
              title={L('ابدأ حفظها الآن', 'Memorise them now')}
              sub={L('جلسة حفظ لهذه الآيات', 'A memorisation session for these ayat')}
              onClick={() => (close(), navigate(`/memorize?s=${s}&from=${range.from}&to=${range.to}`))}
            />
            <Option
              icon="sprout"
              title={L('خطة حفظ جديدة', 'New memorisation plan')}
              sub={L(`${N(p.dailyAyat)} آيات يوميًا، ويمكنك تعديلها`, `${p.dailyAyat} ayat a day; you can edit it`)}
              onClick={() => {
                const pl = newPlan({ kind: 'hifz', start: [s, range.from], end: [s, range.to], daily: p.dailyAyat })
                updateActive((x) => addPlan(x, pl))
                setDone({ msg: L('أُنشئت خطة الحفظ', 'Memorisation plan created'), href: `#/plan/${pl.id}` })
              }}
            />
            <Option
              icon="repeat"
              title={L('أحفظها: أضفها إلى المراجعة', 'I know these: add to revision')}
              sub={L('تدخل جدول المراجعة المتباعدة موزّعة على الأيام القادمة', 'They enter spaced revision, spread over the coming days')}
              onClick={() => {
                updateActive((x) => addKnown(x, s, range.from, range.to))
                setDone({ msg: L('أُضيفت إلى محفوظاتك وجدول المراجعة', 'Added to what you know and to revision') })
              }}
            />
            <Option
              icon="calendar"
              title={L('خطة مراجعة لهذه الآيات', 'A revision plan for these ayat')}
              sub={L(`تُضاف إلى محفوظاتك وتُراجَع ضمن خطة خاصة بـ${meta.ar}`, `Marked as known and revised in their own plan`)}
              onClick={() => {
                const pl = newPlan({ kind: 'revision', start: [s, range.from], end: [s, range.to], daily: Math.min(20, range.to - range.from + 1) })
                updateActive((x) => addPlan(addKnown(x, s, range.from, range.to), pl))
                setDone({ msg: L('أُنشئت خطة المراجعة', 'Revision plan created'), href: `#/plan/${pl.id}` })
              }}
            />
          </div>
        )
      )}
    </Sheet>
  )
}

/** Today's reading for the plan that opened the reader, with a one-tap log. */
function PlanBanner({ planId }: { planId: string }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const pl = p.plans.find((x) => x.id === planId)
  if (!pl || (pl.kind !== 'reading' && pl.kind !== 'khatmah' && pl.kind !== 'custom')) return null
  const t = todayTask(p, pl, true)
  const pr = planProgress(p, pl)
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[22px] bg-gold-soft/60 p-4 ring-1 ring-gold/20" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Icon name="calendar" className="text-gold" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted">{pl.name || rangeText(pl.start, pl.end, lang, N)}</p>
        <p className="font-semibold">
          {t?.kind === 'read'
            ? pl.unit === 'page'
              ? L(`ورد اليوم: الصفحات ${N(t.from)}–${N(t.to)}`, `Today: pages ${t.from}–${t.to}`)
              : L(`ورد اليوم: ${unitLabel('ayah', t.to - t.from + 1, lang, N)}`, `Today: ${unitLabel('ayah', t.to - t.from + 1, lang, N)}`)
            : pr.done >= pr.total
              ? L('اكتملت الخطة', 'Plan complete')
              : L(`أتممت ورد اليوم · ${unitLabel(pl.unit, pr.today, lang, N)}`, `Today’s portion done · ${unitLabel(pl.unit, pr.today, lang, N)}`)}
        </p>
      </div>
      {t?.kind === 'read' && (
        <Button size="sm" onClick={() => updateActive((x) => recordUnits(x, pl.id, t.to - t.from + 1))}>
          <Icon name="check" size={16} />
          {L('أتممت ورد اليوم', 'Done for today')}
        </Button>
      )}
      <a href={`#/plan/${pl.id}`} className="text-sm text-gold underline-offset-4 hover:underline">
        {L('الخطة', 'Plan')}
      </a>
    </div>
  )
}
