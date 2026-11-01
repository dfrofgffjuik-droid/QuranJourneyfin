// رحلة الحفظ — Memorization Journey (design preview). Real KFGQPC Hafs text and real
// recitation audio; Tafsir is fetched verbatim via lib/tafsir with its source.
// The active passage, current ayah, results, reflections, bookmarks and linked
// similarities come from the shared preview session (../session), so the Desktop
// and Mobile frames show one session. Nothing is written to the app store.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Chrome, Demo, Icon, Placeholder, toAr, useDevice, useProto } from '../core'
import { RECITERS, SURAHS, ayahAudioUrl, firstLetter, hizbOf, juzOf, loadMushaf, pageOf, surah, words } from '../../../lib/quran'
import { TAFSIRS, loadTafsir, type TafsirText } from '../../../lib/tafsir'
import { DEMO_PASSAGE, MAX_PASSAGE, akey, isDemoPassage, pairsForPassage, passageAyat, useSession, validatePassage, type MemResult, type PanelId, type Passage } from '../session'
import { RevisionRecall, SimilarPanel } from './similarPanel'
import { actions as progress, chunksOf, derived, rangeAr, today, usePreview, type Chunk } from '../progress'
import { setActiveTask, useActiveTask } from '../taskNav'
import { Confirm } from '../previewUi'
import { gIndex } from '../../../lib/quran'

type Panel = PanelId
const pkeyOf = (p: Passage) => `${p.s}:${p.from}-${p.to}`

/** Exact text of the active passage with explicit loading / ready / error states; a stale passage never shows. */
function useAyat(p: Passage) {
  const key = pkeyOf(p)
  const [st, setSt] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; ayat: string[]; hafs: boolean }>({ key, status: 'loading', ayat: [], hafs: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setSt({ key, status: 'loading', ayat: [], hafs: true })
    // Never leave a skeleton up indefinitely: a stalled request turns into the retry state.
    const timer = setTimeout(() => live && setSt((x) => (x.key === key && x.status === 'loading' ? { ...x, status: 'error' } : x)), 15000)
    loadMushaf(p.s)
      .then(
        (r) => live && setSt({ key, status: 'ready', ayat: r.ayat.slice(p.from - 1, p.to), hafs: r.hafs }),
        () => live && setSt({ key, status: 'error', ayat: [], hafs: true }),
      )
      .finally(() => clearTimeout(timer))
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  const cur = st.key === key ? st : { key, status: 'loading' as const, ayat: [] as string[], hafs: true }
  return { ...cur, retry: () => setAttempt((n) => n + 1) }
}

/** Real recitation (EveryAyah) for one ayah of the active surah, with repeat count. */
function useAudio(s: number) {
  const el = useRef<HTMLAudioElement | null>(null)
  const [st, setSt] = useState<{ a: number | null; t: number; busy: boolean; left: number }>({ a: null, t: 0, busy: false, left: 0 })
  const idle = { a: null, t: 0, busy: false, left: 0 }
  useEffect(() => () => el.current?.pause(), [])
  // A new surah stops whatever was playing from the old passage.
  useEffect(() => () => (el.current?.pause(), setSt(idle)), [s]) // eslint-disable-line react-hooks/exhaustive-deps
  const play = (a: number, times = 1) => {
    if (!el.current) el.current = new Audio()
    const au = el.current
    au.pause()
    au.src = ayahAudioUrl(RECITERS[0].id, s, a)
    let left = times
    au.ontimeupdate = () => setSt((x) => ({ ...x, t: au.duration ? au.currentTime / au.duration : 0 }))
    au.onwaiting = () => setSt((x) => ({ ...x, busy: true }))
    au.onplaying = () => setSt((x) => ({ ...x, busy: false }))
    au.onended = () => {
      left -= 1
      if (left > 0) (au.currentTime = 0, au.play().catch(() => setSt(idle)), setSt((x) => ({ ...x, left })))
      else setSt(idle)
    }
    au.onerror = () => setSt(idle)
    setSt({ a, t: 0, busy: true, left: times })
    au.play().catch(() => setSt(idle))
  }
  const stop = () => (el.current?.pause(), setSt(idle))
  return { ...st, play, stop }
}
type Audio = ReturnType<typeof useAudio>

const textSize = (t: string, desktop: boolean) => {
  const n = t.length
  if (desktop) return n < 70 ? 40 : n < 140 ? 32 : 27
  return n < 70 ? 32 : n < 140 ? 26 : 22
}

export function AyahJourney() {
  const device = useDevice()
  const { go } = useProto()
  const ses = useSession()
  const { passage: p, cur, intent, nonce } = ses.s
  const pkey = pkeyOf(p)
  const text = useAyat(p)
  const audio = useAudio(p.s)
  // Coming back from the Mushaf / extended search reopens the panel the user left from.
  const [panel, setPanel] = useState<Panel | null>(() => ses.s.away?.panel ?? (device === 'desktop' ? 'understand' : null))
  const [picker, setPicker] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (ses.s.away) ses.setAway(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // ---- Feed ↔ shared current ayah. The frame that the user scrolls drives `cur`;
  // the other frame follows with an instant jump, ignoring its own observer meanwhile.
  const feed = useRef<HTMLDivElement>(null)
  const quiet = useRef(0)
  const shown = useRef<number | null>(null)
  const sesRef = useRef(ses)
  sesRef.current = ses
  const jump = (a: number, smooth = false) => {
    const root = feed.current
    if (!root) return
    quiet.current = Date.now() + (smooth ? 800 : 200)
    shown.current = a
    root.scrollTo({ top: (a - p.from) * root.clientHeight, behavior: smooth ? 'smooth' : 'auto' })
  }
  useLayoutEffect(() => {
    const root = feed.current
    if (!root || text.status !== 'ready') return
    jump(sesRef.current.s.cur)
    let later: ReturnType<typeof setTimeout> | undefined
    // The slide actually in view decides; scrolls during a programmatic jump are reconciled right after it.
    const reconcile = () => {
      const wait = quiet.current - Date.now()
      if (wait > 0) return (clearTimeout(later), (later = setTimeout(reconcile, wait + 40)))
      const a = p.from + Math.round(root.scrollTop / Math.max(1, root.clientHeight))
      shown.current = a
      sesRef.current.setCur(a)
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && reconcile(), { root, threshold: 0.6 })
    root.querySelectorAll('[data-a]').forEach((n) => io.observe(n))
    return () => (io.disconnect(), clearTimeout(later))
  }, [text.status, pkey]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (text.status === 'ready' && shown.current !== cur) jump(cur)
  }, [cur, text.status]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (a: number) => (ses.setCur(a), jump(a, true))

  const pv = derived(usePreview())
  const linked = pairsForPassage(p, ses.s.pairs)
  const panels: { id: Panel; ar: string; short: string; icon: string }[] = [
    { id: 'read', ar: 'اقرأ واستمع', short: 'اقرأ واستمع', icon: 'volume' },
    ...(intent !== 'hifz' ? [{ id: 'understand' as const, ar: 'افهم وتدبّر', short: 'افهم وتدبّر', icon: 'tafsir' }] : []),
    ...(intent !== 'tadabbur' ? [{ id: 'memorize' as const, ar: 'احفظ', short: 'احفظ', icon: 'sprout' }] : []),
    { id: 'connect', ar: 'اربط الآيات', short: 'اربط الآيات', icon: 'layers' },
    { id: 'similar', ar: 'متشابهات هذا المقطع', short: 'المتشابهات', icon: 'copy' },
  ]
  const ready = text.status === 'ready'
  const curText = ready ? (text.ayat[cur - p.from] ?? '') : ''
  const panelBody = (id: Panel) =>
    !ready && id !== 'similar' ? (
      <LoadState status={text.status} retry={text.retry} />
    ) : id === 'read' ? (
      <ReadPanel p={p} a={cur} text={curText} hafs={text.hafs} audio={audio} />
    ) : id === 'understand' ? (
      <UnderstandPanel key={`${pkey}:${cur}`} p={p} a={cur} text={curText} note={ses.s.notes[akey(p.s, cur)] ?? ''} onSave={(t) => ses.setNote(cur, t)} />
    ) : id === 'memorize' ? (
      <MemorizePanel key={`${pkey}:${cur}`} a={cur} text={curText} hafs={text.hafs} audio={audio} onResult={(r) => (ses.setMem(cur, r), r === 'mastered' && progress.confirmMemorized(p.s, cur))} result={ses.s.mem[akey(p.s, cur)]} />
    ) : id === 'connect' ? (
      <ConnectPanel key={nonce} p={p} ayat={text.ayat} hafs={text.hafs} />
    ) : (
      <SimilarPanel key={nonce} />
    )
  const activePanel = (fallback: Panel) => (panel && panels.some((x) => x.id === panel) ? panel : fallback)

  const intentSwitch = (
    <div role="radiogroup" aria-label="نيّة الجلسة" className="inline-flex rounded-full bg-night/[.06] p-1 text-[12.5px]">
      {([['hifz', 'حفظ فقط'], ['tadabbur', 'تدبّر فقط'], ['both', 'حفظ + تدبّر']] as const).map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={intent === k} onClick={() => (ses.setIntent(k), panel && !['read', 'connect', 'similar'].includes(panel) && setPanel(k === 'hifz' ? 'memorize' : k === 'tadabbur' ? 'understand' : panel))} className={`press h-8 rounded-full px-3 ${intent === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
      ))}
    </div>
  )

  // On mobile the task banner (range + passage navigation) sits in the top panel; keep verses clear of it.
  const taskOpen = useActiveTask()?.activity === 'hifz'
  const slideCls = `relative flex snap-start snap-always flex-col ${device === 'desktop' ? 'h-full justify-center px-10' : `h-full px-6 pb-36 ${taskOpen ? 'pt-60' : 'pt-28'}`}`
  const slides = ready ? (
    text.ayat.map((t, i) => {
      const a = p.from + i
      const k = akey(p.s, a)
      const r = ses.s.mem[k] ?? (pv.mem[gIndex(p.s, a)] ? 'mastered' : undefined)
      const sims = linked.filter((x) => x.mine.a === a).length
      return (
        <section key={`${pkey}:${a}`} data-a={a} className={slideCls} aria-label={`الآية ${a}`}>
          <div className="flex flex-1 flex-col justify-center">
            <p className="mb-6 text-center text-[12.5px] text-muted">
              سورة {surah(p.s).ar} · الآية {toAr(a)} <span className="mx-1 text-line">|</span> الجزء {toAr(juzOf(p.s, a))} · ص {toAr(pageOf(p.s, a))}
              {ses.s.marks[k] && <Icon name="bookmark" size={13} fill className="ms-1.5 inline text-leaf" />}
            </p>
            <p className={`mf-text ${text.hafs ? '' : 'tanzil'} text-center`} style={{ fontSize: textSize(t, device === 'desktop'), lineHeight: 2.05, textAlignLast: 'center', color: 'var(--color-night)' }}>
              {t} <span className="mf-num">{toAr(a)}</span>
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <StateChip icon="sprout" label="الحفظ" value={memLabel(r)} tone={r === 'mastered' ? 'leaf' : r ? 'gold' : 'none'} />
              <StateChip icon="note" label="التدبّر" value={ses.s.notes[k] ? 'تأمّل محفوظ' : 'لا تأمّل بعد'} tone={ses.s.notes[k] ? 'gold' : 'none'} />
              {sims > 0 && (
                <button type="button" onClick={() => setPanel('similar')} className="press inline-flex items-center gap-1.5 rounded-full bg-sky/10 px-3 py-1.5 text-[12px] text-sky">
                  <Icon name="copy" size={14} />
                  <b className="font-semibold">متشابهات مرتبطة:</b> {toAr(sims)}
                </button>
              )}
            </div>
          </div>
          {i === 0 && device === 'mobile' && text.ayat.length > 1 && (
            <p className="absolute inset-x-0 bottom-28 flex flex-col items-center text-[11.5px] text-muted">
              <Icon name="chevronDown" size={18} className="animate-bounce" />
              اسحب للآية التالية
            </p>
          )}
        </section>
      )
    })
  ) : (
    <section className={slideCls} aria-busy={text.status === 'loading'}>
      <div className="flex flex-1 flex-col justify-center">
        <LoadState status={text.status} retry={text.retry} big />
      </div>
    </section>
  )

  const passageLabel = (
    <>
      سورة {surah(p.s).ar} · {p.from === p.to ? `الآية ${toAr(p.from)}` : `الآيات ${toAr(p.from)}–${toAr(p.to)}`}
    </>
  )
  const pickerEl = picker && <PassagePicker onClose={() => setPicker(false)} />

  if (device === 'desktop')
    return (
      <Chrome>
        <div className="relative flex h-full">
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-line/60 px-8 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-arabic-display text-[19px] font-bold">رحلة الحفظ</p>
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted" data-passage-label>
                  {passageLabel}
                  {isDemoPassage(p) && <Demo>مقطع تجريبي</Demo>}
                  <button type="button" onClick={() => setPicker(true)} className="press inline-flex h-7 items-center gap-1 rounded-full bg-gold-soft px-2.5 text-[12px] font-semibold text-night" data-open-picker>
                    <Icon name="book" size={13} />اختيار مقطع الحفظ
                  </button>
                </p>
              </div>
              {intentSwitch}
            </div>
            <HifzTaskBanner />
            <div className="relative min-h-0 flex-1">
              <div ref={feed} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto" data-feed>{slides}</div>
              {ready && <Dots p={p} cur={cur} onPick={pick} />}
            </div>
            <AudioBar a={cur} audio={audio} />
          </div>
          <aside className="flex w-[440px] shrink-0 flex-col border-s border-line/60 bg-card/50">
            <div className="flex gap-1 border-b border-line/60 p-3" role="tablist">
              {panels.map((x) => (
                <button key={x.id} type="button" role="tab" aria-selected={activePanel(panels[0].id) === x.id} onClick={() => setPanel(x.id)} className={`press flex flex-1 flex-col items-center gap-1 rounded-[14px] py-2 text-[11.5px] ${activePanel(panels[0].id) === x.id ? 'bg-gold-soft font-semibold text-night' : 'text-muted hover:bg-night/5'}`}>
                  <Icon name={x.icon} size={18} />
                  {x.short}
                </button>
              ))}
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-6">{panelBody(activePanel(panels[0].id))}</div>
          </aside>
          {pickerEl}
        </div>
      </Chrome>
    )

  const marked = !!ses.s.marks[akey(p.s, cur)]
  return (
    <Chrome bare dock={false}>
      <div className="relative h-full">
        <div ref={feed} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto" data-feed>{slides}</div>
        <div className="glass-panel absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 px-4 pb-3 pt-12" style={{ borderRadius: 0 }}>
          <div className="flex w-full items-center">
            <button type="button" onClick={() => go('home')} aria-label="رجوع" className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-night/5"><Icon name="back" className="rotate-180" /></button>
            <button type="button" onClick={() => setPicker(true)} aria-label="اختيار مقطع الحفظ" className="press flex min-w-0 flex-1 flex-col items-center rounded-2xl py-0.5" data-open-picker>
              <span className="text-[15px] font-semibold">رحلة الحفظ</span>
              <span className="flex items-center gap-1 text-[11.5px] text-muted" data-passage-label>{passageLabel}<Icon name="chevronDown" size={13} /></span>
            </button>
            <span className="w-10" />
          </div>
          {intentSwitch}
          <HifzTaskBanner compact />
        </div>
        {ready && <Dots p={p} cur={cur} onPick={pick} />}
        {/* Action rail */}
        <div className="absolute bottom-36 end-3 z-30 flex flex-col gap-3">
          {panels.filter((x) => x.id !== 'read').map((x) => (
            <button key={x.id} type="button" onClick={() => setPanel(x.id)} className="press flex flex-col items-center gap-1 text-[10.5px] font-medium text-night/80">
              <span className="glass-panel flex h-12 w-12 items-center justify-center rounded-full"><Icon name={x.icon} size={20} /></span>
              {x.id === 'similar' ? 'متشابهات' : x.ar.split(' ')[0]}
            </button>
          ))}
          <button type="button" disabled={!ready} onClick={() => (ses.toggleMark(cur), setToast(marked ? 'أُزيلت العلامة' : 'وُضعت علامة · في المعاينة فقط، لا تُحفظ في حسابك'))} aria-pressed={marked} aria-label={marked ? `إزالة العلامة عن الآية ${cur}` : `وضع علامة على الآية ${cur} (معاينة فقط)`} className="press flex flex-col items-center gap-1 text-[10.5px] font-medium text-night/80 disabled:opacity-40" data-bookmark>
            <span className={`glass-panel flex h-12 w-12 items-center justify-center rounded-full ${marked ? 'text-leaf' : ''}`}><Icon name="bookmark" size={20} fill={marked} /></span>
            {marked ? 'إزالة' : 'علامة'}
          </button>
        </div>
        {toast && <p role="status" className="absolute inset-x-6 top-[150px] z-40 rounded-full bg-night px-4 py-2 text-center text-[12px] text-parchment">{toast}</p>}
        <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-7"><AudioBar a={cur} audio={audio} floating /></div>
        {panel && (
          <>
            <button type="button" aria-label="إغلاق" onClick={() => setPanel(null)} className="absolute inset-0 z-40 bg-black/30" />
            <div className="absolute inset-x-0 bottom-0 z-50 flex h-[80%] flex-col rounded-t-[30px] bg-parchment shadow-[0_-20px_50px_-20px_rgba(0,0,0,.4)]">
              <span className="mx-auto mt-2.5 block h-[5px] w-10 rounded-full bg-night/15" />
              <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 pt-3" role="tablist">
                {panels.map((x) => (
                  <button key={x.id} type="button" role="tab" aria-selected={activePanel(panel) === x.id} onClick={() => setPanel(x.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] ${activePanel(panel) === x.id ? 'bg-night text-parchment' : 'bg-card text-night/75 ring-1 ring-line'}`}>
                    <Icon name={x.icon} size={15} />
                    {x.short}
                  </button>
                ))}
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">{panelBody(activePanel(panels[0].id))}</div>
            </div>
          </>
        )}
        {pickerEl}
      </div>
    </Chrome>
  )
}

/**
 * When the journey was opened from a memorisation task or a Juz: the exact range (in its own
 * unit), its passages (≤ 20 ayat, never across a surah) and the explicit confirmations. A plan
 * task is recorded only after every passage is confirmed; opening or scrolling records nothing.
 */
function HifzTaskBanner({ compact = false }: { compact?: boolean }) {
  const t = useActiveTask()
  const st = usePreview()
  const ses = useSession()
  const [ask, setAsk] = useState<null | 'chunk' | 'task'>(null)
  const [sure, setSure] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (!t || t.activity !== 'hifz') return null
  const d = derived(st)
  const chunks = chunksOf(t.g0, t.g1)
  const confirmed = st.steps[t.stepKey] ?? {}
  const isDone = (c: Chunk) => !!confirmed[c.id] || (t.kind === 'scope' && d.memBetween(c.g0, c.g1) === c.g1 - c.g0 + 1)
  const doneN = chunks.filter(isDone).length
  const p = ses.s.passage
  const idx = chunks.findIndex((c) => c.s === p.s && c.from === p.from && c.to === p.to)
  const c = idx >= 0 ? chunks[idx] : null
  const total = t.g1 - t.g0 + 1
  const mastered = d.memBetween(t.g0, t.g1)
  const recorded = t.kind === 'plan' && st.tasks.some((x) => x.planId === t.planId && x.date === t.date)
  const future = t.date > today()
  const single = chunks.length === 1
  const openChunk = (i: number) => {
    const x = chunks[Math.max(0, Math.min(chunks.length - 1, i))]
    ses.setPassage({ s: x.s, from: x.from, to: x.to })
  }
  const close = () => (setAsk(null), setSure(false))
  const confirmChunk = () => {
    if (!c || !sure) return
    if (!progress.markStep(t.stepKey, c.id, { g0: c.g0, g1: c.g1 })) return (setMsg('لم يُسجَّل المقطع: سُجّل من قبل أو تعذّر التسجيل. أعد المحاولة.'), close())
    const next = chunks.findIndex((x, i) => i > idx && !isDone(x))
    setMsg(next >= 0 ? `سُجّل المقطع ${toAr(idx + 1)} محفوظًا · انتقل إلى المقطع التالي` : 'سُجّلت كل مقاطع المهمة')
    if (next >= 0) openChunk(next)
    close()
  }
  const completeTask = () => {
    if (!sure || t.kind !== 'plan' || !t.planId) return
    if (single && c && !confirmed[c.id]) progress.markStep(t.stepKey, c.id, { g0: c.g0, g1: c.g1 })
    const ok = progress.completeTask(t.planId, t.date, { confirmedMemorised: true })
    setMsg(ok ? 'سُجّلت المهمة · حُدّثت الخريطة والمكتبة' : 'لم تُسجَّل: أكّد كل المقاطع أولًا، أو أن المهمة لم تعد مستحقّة.')
    close()
  }
  const range = t.unit === 'page' ? `${rangeAr('page', t.from, t.to)} (${rangeAr('ayah', t.g0, t.g1)})` : rangeAr('ayah', t.g0, t.g1)
  const btn = 'press h-9 rounded-full px-3.5 font-semibold'
  return (
    <div className={`bg-gold-soft/50 text-[12px] ${compact ? 'w-full rounded-[16px] px-3 py-2' : 'border-b border-line/60 px-8 py-2.5'}`} data-hifz-task data-unit={t.unit} data-g0={t.g0} data-g1={t.g1}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1"><b className="font-semibold">{t.kind === 'plan' ? `مهمة: ${t.name}` : `حفظ ${t.name}`}</b> · <span data-task-range>{range}</span> · محفوظة {toAr(mastered)}/{toAr(total)}</span>
        {recorded && <span className="rounded-full bg-leaf/12 px-2.5 py-1 font-semibold text-leaf">سُجّلت المهمة</span>}
        <button type="button" onClick={() => setActiveTask(null)} aria-label="إخفاء المهمة (يبقى ما أكّدته محفوظًا)" className="press h-8 w-8 rounded-full hover:bg-night/[.06]"><Icon name="x" size={14} className="mx-auto" /></button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => openChunk(idx - 1)} disabled={idx <= 0} aria-label="المقطع السابق" className="press h-9 w-9 shrink-0 rounded-full bg-card/70 disabled:opacity-30"><Icon name="chevron" size={14} className="mx-auto" /></button>
        <select aria-label="مقاطع المهمة" value={idx} onChange={(e) => openChunk(Number(e.target.value))} className="h-9 min-w-0 max-w-full flex-1 rounded-full bg-card px-2 text-[12px] ring-1 ring-line" data-chunk-select>
          {idx < 0 && <option value={-1}>المقطع المفتوح ليس من هذه المهمة</option>}
          {chunks.map((x, i) => <option key={x.id} value={i}>{isDone(x) ? '✓ ' : ''}المقطع {toAr(i + 1)} من {toAr(chunks.length)} · {rangeAr('ayah', x.g0, x.g1)}</option>)}
        </select>
        <button type="button" onClick={() => openChunk(idx + 1)} disabled={idx < 0 || idx >= chunks.length - 1} aria-label="المقطع التالي" className="press h-9 w-9 shrink-0 rounded-full bg-card/70 disabled:opacity-30"><Icon name="chevron" size={14} className="mx-auto rotate-180" /></button>
        <span className="tabular-nums text-muted" data-chunks-done>{toAr(doneN)}/{toAr(chunks.length)} مؤكَّدة</span>
        {idx < 0 && <button type="button" onClick={() => openChunk(Math.max(0, chunks.findIndex((x) => !isDone(x))))} className={`${btn} bg-night text-parchment`}>افتح مقطع المهمة</button>}
        {!recorded && c && !single && !isDone(c) && <button type="button" onClick={() => setAsk('chunk')} className={`${btn} bg-night text-parchment`} data-confirm-chunk>أتقنت هذا المقطع</button>}
        {!recorded && t.kind === 'plan' && (single || doneN === chunks.length) && !future && <button type="button" onClick={() => setAsk('task')} disabled={single && idx < 0} className={`${btn} bg-leaf text-white disabled:opacity-40`} data-complete-hifz>سجّل إتمام المهمة</button>}
      </div>
      {!recorded && t.kind === 'plan' && !single && doneN < chunks.length && <p className="mt-1 text-muted">يُسجَّل إتمام المهمة بعد تأكيد المقاطع كلها ({toAr(chunks.length - doneN)} متبقية).</p>}
      {future && t.kind === 'plan' && <p className="mt-1 text-muted">مهمة قادمة: يمكنك الحفظ وتأكيد المقاطع الآن، ويُسجَّل إتمام المهمة في يومها.</p>}
      {t.kind === 'scope' && doneN === chunks.length && <p className="mt-1 font-semibold text-leaf">أتممت حفظ {t.name} بتأكيدك · بارك الله فيك</p>}
      {msg && <p role="status" className="mt-1 font-semibold">{msg}</p>}
      {ask && (
        <Confirm
          title={ask === 'chunk' ? `تأكيد حفظ المقطع ${toAr(idx + 1)}` : 'تأكيد إتمام مهمة الحفظ'}
          body={<><p>{ask === 'chunk' && c ? `تُسجَّل آيات ${rangeAr('ayah', c.g0, c.g1)} (${toAr(c.g1 - c.g0 + 1)}) محفوظة فقط إذا أتقنتها فعلًا.` : `تُسجَّل مهمة ${range} (${toAr(total)} آية) بعد تأكيد مقاطعها كلها، فقط إذا أتقنتها فعلًا.`} القراءة أو الاستماع وحدهما لا يكفيان.</p><label className="mt-3 flex items-center gap-2 text-night"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" data-confirm-mem />أؤكّد أنني أتقنت حفظها</label></>}
          confirm="سجّل الحفظ"
          onCancel={close}
          onConfirm={ask === 'chunk' ? confirmChunk : completeTask}
        />
      )}
    </div>
  )
}

/** Loading / error state of the passage text, with an Arabic retry. */
function LoadState({ status, retry, big = false }: { status: 'loading' | 'ready' | 'error'; retry: () => void; big?: boolean }) {
  if (status === 'error')
    return (
      <div role="alert" className="mx-auto max-w-[360px] rounded-[22px] bg-clay/[.07] p-5 text-center ring-1 ring-clay/20" data-load-error>
        <p className="font-semibold text-clay">تعذّر تحميل نص المقطع</p>
        <p className="mt-1 text-[12.5px] text-muted">تحقّق من الاتصال ثم أعد المحاولة. لا يُعرض نص غير مكتمل.</p>
        <button type="button" onClick={retry} className="press mt-3 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment" data-retry>أعد المحاولة</button>
      </div>
    )
  return (
    <div role="status" aria-label="جارٍ تحميل نص المقطع" className="space-y-3">
      <div className={`mx-auto animate-pulse rounded-3xl bg-night/5 ${big ? 'h-24 w-4/5' : 'h-16 w-full'}`} />
      <p className="text-center text-[12px] text-muted">جارٍ تحميل نص المقطع…</p>
    </div>
  )
}

/** «اختيار مقطع الحفظ» — surah + range, validated against the surah's real ayah count. */
function PassagePicker({ onClose }: { onClose: () => void }) {
  const ses = useSession()
  const [s, setS] = useState(ses.s.passage.s)
  const [from, setFrom] = useState(String(ses.s.passage.from))
  const [to, setTo] = useState(String(ses.s.passage.to))
  const draft = { s, from: Number(from), to: Number(to) }
  const err = from === '' || to === '' ? 'أدخل آية البداية والنهاية.' : validatePassage(draft)
  const n = surah(s).ayat
  const field = 'h-11 rounded-2xl bg-card px-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-gold'
  const apply = () => {
    if (err) return
    ses.setPassage(draft)
    onClose()
  }
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal="true" aria-label="اختيار مقطع الحفظ" data-picker>
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0" />
      <form onSubmit={(e) => (e.preventDefault(), apply())} className="relative m-3 w-full max-w-[440px] rounded-[28px] bg-parchment p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,.45)]">
        <p className="font-arabic-display text-[19px] font-bold">اختيار مقطع الحفظ</p>
        <p className="mt-1 text-[12.5px] text-muted">اختر السورة ومدى الآيات. يبدأ المقطع من آيته الأولى، حتى {toAr(MAX_PASSAGE)} آية في الجلسة.</p>
        <label className="mt-4 block text-[12px] text-muted">السورة
          <select aria-label="السورة" value={s} onChange={(e) => { const x = Number(e.target.value); setS(x); setFrom('1'); setTo(String(Math.min(surah(x).ayat, 5))) }} className={`${field} mt-1 w-full`}>
            {SURAHS.map((x) => <option key={x.n} value={x.n}>{toAr(x.n)}. {x.ar} · {toAr(x.ayat)} آية</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[12px] text-muted">من الآية
            <input aria-label="من الآية" inputMode="numeric" type="number" min={1} max={n} value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1 w-full text-center`} />
          </label>
          <label className="text-[12px] text-muted">إلى الآية
            <input aria-label="إلى الآية" inputMode="numeric" type="number" min={1} max={n} value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1 w-full text-center`} />
          </label>
        </div>
        <p className={`mt-2 min-h-5 text-[12px] ${err ? 'text-clay' : 'text-muted'}`} role={err ? 'alert' : undefined} data-picker-msg>
          {err ?? `سورة ${surah(s).ar} · ${toAr(n)} آية · ${draft.from === draft.to ? `الآية ${toAr(draft.from)}` : `الآيات ${toAr(draft.from)}–${toAr(draft.to)}`}`}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">معاينة فقط: تغيير المقطع يبدأ جلسة مؤقّتة جديدة ولا يمسّ سجلات حفظك الحقيقية.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={!!err} className="press h-11 flex-1 rounded-full bg-night text-[13.5px] font-semibold text-parchment disabled:opacity-40" data-apply>ابدأ هذا المقطع</button>
          <button type="button" onClick={onClose} className="press h-11 rounded-full px-4 text-[13px] ring-1 ring-line">إلغاء</button>
        </div>
        {!isDemoPassage(ses.s.passage) && <button type="button" onClick={() => (ses.setPassage(DEMO_PASSAGE), onClose())} className="press mt-2 text-[12px] text-muted underline">العودة إلى المقطع التجريبي (الملك ١–٥)</button>}
      </form>
    </div>
  )
}

const memLabel = (r?: MemResult) => (r === 'mastered' ? 'متقنة' : r === 'shaky' ? 'تحتاج مراجعة' : r === 'forgot' ? 'لم تُحفظ بعد' : 'لم تُسجَّل')

function StateChip({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'leaf' | 'gold' | 'none' }) {
  const c = tone === 'leaf' ? 'bg-leaf/10 text-leaf' : tone === 'gold' ? 'bg-gold-soft text-night' : 'bg-night/[.05] text-muted'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ${c}`}>
      <Icon name={icon} size={14} />
      <b className="font-semibold">{label}:</b> {value}
    </span>
  )
}

function Dots({ p, cur, onPick }: { p: Passage; cur: number; onPick: (a: number) => void }) {
  const all = passageAyat(p)
  if (all.length > 12)
    return (
      <div className="absolute start-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-card/80 py-1.5 text-[11px] ring-1 ring-line" aria-label="الآيات">
        <button type="button" disabled={cur <= p.from} onClick={() => onPick(cur - 1)} aria-label="الآية السابقة" className="press flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"><Icon name="chevronDown" size={15} className="rotate-180" /></button>
        <span className="tabular-nums font-semibold">{toAr(cur)}</span>
        <span className="text-muted">{toAr(p.to)}</span>
        <button type="button" disabled={cur >= p.to} onClick={() => onPick(cur + 1)} aria-label="الآية التالية" className="press flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"><Icon name="chevronDown" size={15} /></button>
      </div>
    )
  return (
    <div className="absolute start-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2" aria-label="الآيات">
      {all.map((a) => (
        <button key={a} type="button" onClick={() => onPick(a)} aria-label={`الآية ${a}`} aria-current={a === cur} className={`w-1.5 rounded-full transition-all ${a === cur ? 'h-6 bg-gold' : 'h-1.5 bg-night/20 hover:bg-night/40'}`} />
      ))}
    </div>
  )
}

function AudioBar({ a, audio, floating = false }: { a: number; audio: Audio; floating?: boolean }) {
  const on = audio.a === a
  return (
    <div className={`${floating ? 'glass-panel rounded-[24px]' : 'border-t border-line/60'} flex items-center gap-3 px-4 py-3`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-[15px] font-bold text-gold">{RECITERS[0].ar[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{RECITERS[0].ar.split(' (')[0]}</p>
        <span className="relative mt-1.5 block h-1 rounded-full bg-night/10"><span className="absolute inset-y-0 start-0 rounded-full bg-gold" style={{ width: `${on ? audio.t * 100 : 0}%` }} /></span>
      </div>
      <button type="button" onClick={() => audio.play(a, 3)} aria-label="تكرار ٣ مرات" className="press flex h-10 items-center gap-1 rounded-full px-2.5 text-[12px] text-muted hover:bg-night/5"><Icon name="repeat" size={17} />×٣</button>
      <button type="button" onClick={() => (on ? audio.stop() : audio.play(a))} aria-label={on ? 'إيقاف' : 'استماع'} className="press flex h-12 w-12 items-center justify-center rounded-full bg-night text-parchment">
        {on && audio.busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment" /> : <Icon name={on ? 'pause' : 'play'} size={18} fill />}
      </button>
    </div>
  )
}

function Block({ title, badge, children, tone = 'card' }: { title: string; badge?: ReactNode; children: ReactNode; tone?: 'card' | 'paper' | 'note' }) {
  const cls = tone === 'paper' ? 'mf-paper rounded-[22px]' : tone === 'note' ? 'rounded-[22px] bg-gold-soft/45 ring-1 ring-gold/25' : 'rounded-[22px] bg-card ring-1 ring-line'
  return (
    <section className={`${cls} mb-4 p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14.5px] font-semibold">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  )
}

function ReadPanel({ p, a, text, hafs, audio }: { p: Passage; a: number; text: string; hafs: boolean; audio: Audio }) {
  return (
    <div>
      <Block title={`سورة ${surah(p.s).ar} · الآية ${toAr(a)}`} tone="paper">
        <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: 26, lineHeight: 2.05 }}>{text} <span className="mf-num">{toAr(a)}</span></p>
      </Block>
      <Block title="الاستماع">
        <p className="mb-3 text-[13px] text-muted">تلاوة {RECITERS[0].ar} · من EveryAyah.com (يتطلب اتصالًا)</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 5].map((n) => (
            <button key={n} type="button" onClick={() => audio.play(a, n)} className="press rounded-2xl bg-night/[.05] py-3 text-[13px] font-medium hover:bg-night/[.09]">{n === 1 ? 'مرة واحدة' : `${toAr(n)} مرات`}</button>
          ))}
        </div>
        {audio.a === a && <p className="mt-3 text-center text-[12px] text-gold">يُتلى الآن · متبقٍ {toAr(audio.left)}</p>}
      </Block>
    </div>
  )
}

function UnderstandPanel({ p, a, text, note, onSave }: { p: Passage; a: number; text: string; note: string; onSave: (t: string) => void }) {
  const [book, setBook] = useState(16)
  const [t, setT] = useState<{ d: TafsirText | null; err: boolean }>({ d: null, err: false })
  const [draft, setDraft] = useState(note)
  const [word, setWord] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setT({ d: null, err: false })
    loadTafsir(book, p.s, a)
      .then((d) => live && setT({ d, err: false }))
      .catch(() => live && setT({ d: null, err: true }))
    return () => {
      live = false
    }
  }, [book, p.s, a])
  const b = TAFSIRS.find((x) => x.id === book)!
  const h = hizbOf(p.s, a)
  return (
    <div>
      <Block title="التفسير الموثّق" badge={<span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[10.5px] font-semibold text-leaf"><Icon name="shield" size={12} />مصدر منشور</span>} tone="paper">
        <div className="mb-3 flex gap-1.5">
          {TAFSIRS.slice(0, 2).map((x) => (
            <button key={x.id} type="button" onClick={() => setBook(x.id)} className={`press rounded-full px-3 py-1.5 text-[12px] ${book === x.id ? 'bg-night text-parchment' : 'bg-night/[.05] text-night/75'}`}>{x.ar}</button>
          ))}
        </div>
        {t.err ? (
          <p className="text-[13px] text-muted">تعذّر تحميل التفسير. يتطلب اتصالًا بالإنترنت.</p>
        ) : t.d ? (
          <div className="max-h-64 space-y-2 overflow-y-auto text-[14px] leading-[1.95] text-[var(--mf-ink)]">
            {t.d.paragraphs.slice(0, 4).map((p, i) => (
              <p key={i}>{p.map((s, k) => <span key={k} className={s.quote ? 'mf-text inline text-[15px]' : ''}>{s.t}</span>)}</p>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{[90, 80, 86].map((w) => <div key={w} className="h-3 animate-pulse rounded-full bg-night/[.07]" style={{ width: `${w}%` }} />)}</div>
        )}
        <p className="mt-3 border-t border-[var(--mf-frame-soft)] pt-2 text-[11.5px] text-[var(--mf-ink-soft)]">{b.ar} · {b.author} · عبر Quran.com API · يُعرض النص كما هو</p>
      </Block>

      <Block title="معاني الكلمات">
        <div className="flex flex-wrap gap-1.5" dir="rtl">
          {words(text).map((w, i) => (
            <button key={i} type="button" onClick={() => setWord(w)} className={`press mf-text rounded-xl px-2.5 py-1 text-[19px] ${word === w ? 'bg-gold-soft ring-1 ring-gold/40' : 'bg-night/[.04] hover:bg-night/[.08]'}`} style={{ lineHeight: 1.9 }}>{w}</button>
          ))}
        </div>
        {word && <Placeholder className="mt-3">معنى «<span className="mf-text inline text-[17px]">{word}</span>» يُعرض هنا من معجم أو ترجمة كلمات موثّقة مع ذكر المصدر عند التنفيذ.</Placeholder>}
      </Block>

      <Block title="سياق الآية">
        <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
          {[['السورة', `${surah(p.s).ar} · ${surah(p.s).place === 'makkah' ? 'مكية' : 'مدنية'}`], ['عدد آياتها', toAr(surah(p.s).ayat)], ['الموضع', `ص ${toAr(pageOf(p.s, a))} · الجزء ${toAr(juzOf(p.s, a))}`], ['الحزب', toAr(h.hizb)]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-night/[.04] px-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
          ))}
        </dl>
      </Block>

      <Block title="تأمّلي الشخصي" badge={<span className="inline-flex items-center gap-1 rounded-full bg-night/[.06] px-2 py-0.5 text-[10.5px] font-semibold text-muted"><Icon name="user" size={12} />خاص بك · ليس تفسيرًا</span>} tone="note">
        <p className="mb-2 text-[12.5px] text-muted">ما الذي استوقفك في هذه الآية؟ وما الذي تودّ العمل به اليوم؟</p>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="اكتب تأمّلك بكلماتك…" className="w-full resize-none rounded-2xl bg-card/80 p-3 text-[14px] leading-relaxed outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-gold" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11.5px] text-muted">{note ? 'محفوظ في المعاينة فقط' : 'يُحفظ على جهازك عند التنفيذ'}</span>
          <button type="button" disabled={!draft.trim()} onClick={() => onSave(draft.trim())} className="press h-9 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment disabled:opacity-40">حفظ التأمّل</button>
        </div>
      </Block>
    </div>
  )
}

const STEPS = ['اقرأ', 'استمع وردّد', 'إخفاء تدريجي', 'تلميحات', 'استرجاع', 'سجّل النتيجة']

function MemorizePanel({ a, text, hafs, audio, result, onResult }: { a: number; text: string; hafs: boolean; audio: Audio; result?: MemResult; onResult: (r: MemResult) => void }) {
  const [step, setStep] = useState(0)
  const [reads, setReads] = useState(0)
  const [hide, setHide] = useState(30)
  const [shown, setShown] = useState<Record<number, 1 | 2>>({})
  const [peek, setPeek] = useState(false)
  const ws = useMemo(() => words(text), [text])
  const hiddenAt = (i: number) => (step === 2 ? ((i * 7) % 10) * 10 < hide : step === 3 || (step === 4 && !peek))
  return (
    <div>
      <ol className="mb-5 grid grid-cols-6 gap-1" aria-label="مراحل الحفظ">
        {STEPS.map((l, i) => (
          <li key={l}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} className="press flex w-full flex-col items-center gap-1 text-[10.5px]">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold ${i < step ? 'bg-leaf text-white' : i === step ? 'bg-gold text-white ring-4 ring-gold/20' : 'bg-night/[.06] text-muted'}`}>{i < step ? <Icon name="check" size={14} /> : toAr(i + 1)}</span>
              <span className={`text-center leading-tight ${i === step ? 'font-semibold' : 'text-muted'}`}>{l}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mf-paper rounded-[22px] px-5 py-6">
        <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: 25, lineHeight: 2.15 }}>
          {ws.map((w, i) => {
            const hid = hiddenAt(i) && step !== 5
            const lvl = shown[i]
            return (
              <span key={i}>
                {hid && lvl !== 2 ? (
                  <button type="button" onClick={() => step >= 3 && setShown((x) => ({ ...x, [i]: lvl ? 2 : 1 }))} className="mx-0.5 inline-block min-w-[2.2em] rounded-md border-b-2 border-dashed border-gold/60 bg-gold-soft/40 px-1 align-baseline" aria-label="كلمة مخفية">
                    <span className={lvl === 1 ? 'text-gold' : 'invisible'}>{lvl === 1 ? `${firstLetter(w)}…` : w}</span>
                  </button>
                ) : (
                  w
                )}{' '}
              </span>
            )
          })}
          <span className="mf-num">{toAr(a)}</span>
        </p>
      </div>
      <div className="mt-4 rounded-[22px] bg-card p-4 ring-1 ring-line">
        {step === 0 && <StepRow hint="اقرأ الآية بتأنٍّ ثلاث مرات مع النظر في كلماتها." action={<button type="button" onClick={() => setReads((n) => Math.min(3, n + 1))} className="press h-10 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">قرأتها · {toAr(reads)}/٣</button>} />}
        {step === 1 && <StepRow hint="استمع للقارئ ثم ردّد بعده بصوتك." action={<button type="button" onClick={() => audio.play(a, 3)} className="press flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment"><Icon name="play" size={15} fill />استمع ×٣</button>} />}
        {step === 2 && (
          <div>
            <StepRow hint="تُخفى الكلمات تدريجيًا. اقرأ من ذاكرتك وارفع النسبة كلما تمكّنت." />
            <input type="range" min={0} max={100} step={10} value={hide} onChange={(e) => setHide(Number(e.target.value))} aria-label="نسبة الإخفاء" className="mt-3 w-full accent-[var(--color-gold)]" />
            <p className="text-center text-[12px] text-muted">إخفاء {toAr(hide)}٪</p>
          </div>
        )}
        {step === 3 && <StepRow hint="اضغط الكلمة المخفية لترى أول حرف منها، واضغط مرة أخرى لإظهارها." />}
        {step === 4 && <StepRow hint="تلُ الآية كاملة من ذاكرتك، ثم تحقّق." action={<button type="button" onClick={() => setPeek((v) => !v)} className="press h-10 rounded-full bg-night/[.06] px-4 text-[13px] font-semibold">{peek ? 'أخفِ النص' : 'تحقّق من النص'}</button>} />}
        {step === 5 && (
          <div>
            <p className="mb-3 text-[13px] text-muted">كيف كان استرجاعك؟ تُسجَّل الآية «محفوظة» فقط عند اختيار «أتقنتها»؛ المشاهدة أو قراءة التفسير لا تُعدّ حفظًا.</p>
            <div className="grid grid-cols-3 gap-2">
              {([['mastered', 'أتقنتها', 'bg-leaf text-white'], ['shaky', 'أخطأت قليلًا', 'bg-gold-soft text-night'], ['forgot', 'لم أتذكّرها', 'bg-night/[.06] text-night']] as const).map(([k, l, c]) => (
                <button key={k} type="button" onClick={() => onResult(k)} aria-pressed={result === k} className={`press rounded-2xl py-3 text-[13px] font-semibold ${c} ${result === k ? 'ring-2 ring-night/40 ring-offset-2 ring-offset-card' : ''}`}>{l}</button>
              ))}
            </div>
            {result && <p className="mt-3 text-center text-[12px] text-muted">سُجّلت النتيجة في المعاينة فقط: «{memLabel(result)}»</p>}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="press h-10 rounded-full px-4 text-[13px] ring-1 ring-line disabled:opacity-35">السابق</button>
        {step < 5 && <button type="button" onClick={() => setStep((s) => s + 1)} className="press h-10 rounded-full bg-gold px-5 text-[13px] font-semibold text-white">التالي: {STEPS[step + 1]}</button>}
      </div>
    </div>
  )
}

function StepRow({ hint, action }: { hint: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="flex-1 text-[13px] leading-relaxed text-muted">{hint}</p>
      {action}
    </div>
  )
}

function ConnectPanel({ p, ayat, hafs }: { p: Passage; ayat: string[]; hafs: boolean }) {
  const ses = useSession()
  const linked = pairsForPassage(p, ses.s.pairs)
  const [tab, setTab] = useState<'chain' | 'next' | 'recite'>('chain')
  const [open, setOpen] = useState<number | null>(null)
  const [q, setQ] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [self, setSelf] = useState<Record<number, boolean>>({})
  const n = ayat.length
  // Only «أتقنتها» counts; similarity exercises are tracked separately and never appear here.
  const mem = passageAyat(p).filter((a) => ses.s.mem[akey(p.s, a)] === 'mastered').length
  const notes = passageAyat(p).filter((a) => ses.s.notes[akey(p.s, a)]).length
  const head = (t: string, k = 3) => words(t).slice(0, k).join(' ')
  const tail = (t: string, k = 3) => words(t).slice(-k).join(' ')
  // "What comes next?" — options are real openings from this passage, in a fixed shuffled order.
  const opts = useMemo(() => (q + 1 < n ? [q + 1, (q + 3) % n, (q + 2) % n].filter((v, i, xs) => xs.indexOf(v) === i && v !== q).slice(0, 3).sort((x, y) => ((x * 5) % 3) - ((y * 5) % 3)) : []), [q, n])
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Meter label="حفظ المقطع" v={mem} n={n} tone="bg-leaf" sub="آيات سُجّلت «متقنة»" />
        <Meter label="تدبّر المقطع" v={notes} n={n} tone="bg-gold" sub="آيات لها تأمّل" />
      </div>
      <div role="tablist" className="mb-4 grid grid-cols-3 rounded-full bg-night/[.06] p-1 text-[12.5px]">
        {([['chain', 'المعنى والتسلسل'], ['next', 'ما التالي؟'], ['recite', 'التسميع الكامل']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`press h-8 rounded-full ${tab === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      {tab === 'chain' && (
        <ol className="relative">
          {ayat.map((t, i) => {
            const a = p.from + i
            return (
              <li key={a} className="relative pb-4 ps-12">
                {i < n - 1 && <span className="absolute bottom-0 start-[19px] top-10 w-px bg-gold/40" aria-hidden />}
                <span className="absolute start-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-[13px] font-semibold ring-1 ring-gold/30">{toAr(a)}</span>
                <button type="button" onClick={() => setOpen(open === a ? null : a)} className="w-full rounded-[18px] bg-card p-3.5 text-start ring-1 ring-line hover:ring-gold/40">
                  <p className={`mf-text ${hafs ? '' : 'tanzil'} text-[19px]`} style={{ lineHeight: 1.9, textAlign: 'right', textAlignLast: 'right' }}>{head(t)} … {tail(t, 2)}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted"><Icon name="tafsir" size={13} />{open === a ? 'إخفاء المعنى' : 'معنى الآية من التفسير الميسّر'}</p>
                </button>
                {open === a && <TafsirSnippet s={p.s} a={a} />}
              </li>
            )
          })}
        </ol>
      )}
      {tab === 'next' && (
        <div>
          {q < n - 1 ? (
            <>
              <p className="mb-2 text-[12.5px] text-muted">سؤال {toAr(q + 1)} من {toAr(n - 1)} · بعد قوله تعالى:</p>
              <div className="mf-paper rounded-[18px] p-4"><p className={`mf-text ${hafs ? '' : 'tanzil'} text-[21px]`} style={{ lineHeight: 2 }}>… {tail(ayat[q], 4)} <span className="mf-num">{toAr(p.from + q)}</span></p></div>
              <p className="mb-2 mt-4 text-[13px] font-semibold">بأيّ كلمات تبدأ الآية التالية؟</p>
              <div className="space-y-2">
                {opts.map((o) => {
                  const right = o === q + 1
                  const state = pick === null ? '' : o === pick ? (right ? 'bg-leaf/10 ring-leaf' : 'bg-clay/10 ring-clay/60') : right ? 'ring-leaf/60' : 'opacity-60'
                  return (
                    <button key={o} type="button" disabled={pick !== null} onClick={() => setPick(o)} className={`press w-full rounded-[16px] bg-card px-4 py-3 text-start ring-1 ring-line ${state}`}>
                      <span className={`mf-text ${hafs ? '' : 'tanzil'} text-[19px]`} style={{ lineHeight: 1.9 }}>{head(ayat[o], 3)} …</span>
                    </button>
                  )
                })}
              </div>
              {pick !== null && <button type="button" onClick={() => (setQ((x) => x + 1), setPick(null))} className="press mt-4 h-10 w-full rounded-full bg-night text-[13px] font-semibold text-parchment">{pick === q + 1 ? 'أحسنت · التالي' : 'راجع الربط · التالي'}</button>}
            </>
          ) : (
            <div className="text-center"><p className="font-semibold">أتممت ربط المقطع</p><button type="button" onClick={() => setQ(0)} className="press mt-3 h-10 rounded-full px-4 text-[13px] ring-1 ring-line">ابدأ من جديد</button></div>
          )}
        </div>
      )}
      {tab === 'recite' && (
        <div>
          <p className="mb-3 text-[13px] leading-relaxed text-muted">تلُ المقطع كاملًا دون النظر إلى النص، ثم قيّم كل آية بصدق.</p>
          <div className="mf-paper space-y-3 rounded-[22px] p-5">
            {ayat.map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="mf-num mf-text text-[22px]">{toAr(p.from + i)}</span>
                <span className="h-px flex-1 border-b-2 border-dotted border-[var(--mf-frame-soft)]" />
                <button type="button" onClick={() => setSelf((x) => ({ ...x, [i]: !x[i] }))} className={`press rounded-full px-3 py-1 text-[11.5px] ${self[i] ? 'bg-leaf/10 text-leaf' : 'bg-night/[.05] text-muted'}`}>{self[i] ? 'تذكّرتها' : 'تعثّرت'}</button>
              </div>
            ))}
          </div>
          <button type="button" disabled className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-night/[.06] text-[13.5px] font-semibold text-muted">
            <Icon name="mic" size={18} />تسجيل التلاوة · يتوفّر عند التنفيذ
          </button>
          <p className="mt-2 text-center text-[11.5px] text-muted">التقييم الذاتي لا يغيّر حالة الحفظ؛ الحفظ يُسجَّل لكل آية من «احفظ».</p>
          {linked.length > 0 && (
            <section className="mt-5 rounded-[22px] bg-sky/[.05] p-4 ring-1 ring-sky/20">
              <p className="mb-2 flex items-center gap-1.5 text-[13.5px] font-semibold"><Icon name="copy" size={15} className="text-sky" />استحضر متشابهات هذا المقطع أثناء المراجعة</p>
              <RevisionRecall pairs={linked} compact />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function TafsirSnippet({ s, a }: { s: number; a: number }) {
  const [t, setT] = useState<TafsirText | null | false>(null)
  useEffect(() => {
    let live = true
    setT(null)
    loadTafsir(16, s, a).then((x) => live && setT(x), () => live && setT(false))
    return () => {
      live = false
    }
  }, [s, a])
  return (
    <div className="mt-2 rounded-[16px] bg-[var(--mf-paper)] p-3 text-[13px] leading-[1.9] text-[var(--mf-ink)] ring-1 ring-[var(--mf-frame-soft)]">
      {t === null ? <div className="h-3 w-4/5 animate-pulse rounded-full bg-night/[.07]" /> : t === false ? 'تعذّر التحميل (يتطلب اتصالًا).' : t.paragraphs.map((p) => p.map((s) => s.t).join('')).join(' ')}
      <p className="mt-1 text-[11px] text-[var(--mf-ink-soft)]">التفسير الميسّر · مجمع الملك فهد</p>
    </div>
  )
}

function Meter({ label, v, n, tone, sub }: { label: string; v: number; n: number; tone: string; sub: string }) {
  return (
    <div className="rounded-[18px] bg-card p-3.5 ring-1 ring-line">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 text-[18px] font-bold">{toAr(v)}<span className="text-[13px] font-normal text-muted"> / {toAr(n)}</span></p>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${(v / Math.max(1, n)) * 100}%` }} /></span>
      <p className="mt-1.5 text-[10.5px] text-muted">{sub}</p>
    </div>
  )
}

export { Demo }
