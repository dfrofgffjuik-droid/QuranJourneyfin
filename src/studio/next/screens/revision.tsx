// المراجعة — revision experience (design preview). For a plan task or a Juz opened
// from the map it shows the exact range — page by page for page-based plans (each
// page opens in the Mushaf), passage by passage (≤ 20 ayat) otherwise — with the
// verses loaded verbatim (KFGQPC Hafs). Every page / passage is confirmed
// explicitly after reciting from memory; the revision is recorded only on
// «أتممت المراجعة» once all are confirmed. Revision never adds memorised ayat.
import { useEffect, useState } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { PAGES, fromGIndex, loadMushaf, surah } from '../../../lib/quran'
import { PHASE_AR, actions, derived, fmtDate, planTasks, rangeAr, segmentsOf, stepsDone, taskProgress, taskSegments, today, usePreview, weekDates, type Segment, type Task } from '../progress'
import { DataBar } from '../previewUi'
import { activeFromTask, revisionSessionId, setActiveTask, useActiveTask, type ActiveTask } from '../taskNav'
import { useOpenInMushaf } from './mushaf'

type Row = { s: number; a: number; t: string; hafs: boolean }
function useRange(from: number | null, to: number | null) {
  const [st, setSt] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; rows: Row[] }>({ key: '', status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const key = `${from}-${to}`
  useEffect(() => {
    if (from == null || to == null) return
    let live = true
    setSt({ key, status: 'loading', rows: [] })
    const need: number[] = []
    for (let g = from; g <= to; g++) need.push(g)
    const surahs = [...new Set(need.map((g) => fromGIndex(g)[0]))]
    Promise.all(surahs.map((n) => loadMushaf(n).then((r) => [n, r] as const))).then(
      (all) => live && setSt({ key, status: 'ready', rows: need.map((g) => { const [s, a] = fromGIndex(g); const r = all.find((x) => x[0] === s)![1]; return { s, a, t: r.ayat[a - 1], hafs: r.hafs } }) }),
      () => live && setSt({ key, status: 'error', rows: [] }),
    )
    return () => {
      live = false
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...(st.key === key ? st : { key, status: 'loading' as const, rows: [] }), retry: () => setAttempt((n) => n + 1) }
}

/** A task id is `${planId}:${date}`; the task is rebuilt from the plan for that exact date. */
function findTask(st: ReturnType<typeof usePreview>, id: string | undefined): Task | null {
  if (!id) return null
  const date = id.slice(-10)
  const p = st.plans.find((x) => `${x.id}:${date}` === id)
  if (!p) return null
  return planTasks(st, p, [date]).find((t) => t.activity === 'revision') ?? null
}

export function RevisionScreen() {
  const desk = useDevice() === 'desktop'
  const { nav, go } = useProto()
  const st = usePreview()
  const active = useActiveTask()
  const week = weekDates()
  const all = st.plans.flatMap((p) => planTasks(st, p, week)).filter((t) => t.activity === 'revision')
  const task = nav.param && nav.param !== 'scope' ? findTask(st, nav.param) : null
  const scope = nav.param === 'scope' && active?.kind === 'scope' && active.activity === 'revision' ? active : null
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'} data-revision>
        {!desk && <MoreTabs />}
        <Head title="المراجعة" sub="راجع ما حفظته من ذاكرتك ثم تحقّق. المراجعة تثبّت الحفظ، ولا تُحتسب حفظًا جديدًا." action={<DataBar />} />
        {task ? <TaskRevision key={task.id} t={task} onBack={() => go('revision')} /> : scope ? <ScopeRevision key={scope.stepKey} a={scope} /> : <TaskList tasks={all} />}
      </div>
    </Chrome>
  )
}

function TaskList({ tasks }: { tasks: Task[] }) {
  const { go } = useProto()
  const st = usePreview()
  const open = tasks.filter((t) => t.state === 'open' || t.state === 'unrecorded')
  const done = tasks.filter((t) => t.state === 'done')
  if (tasks.length === 0)
    return (
      <div className="rounded-[26px] border border-dashed border-line bg-card/60 px-6 py-10 text-center" data-empty>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name="repeat" size={24} /></span>
        <p className="mt-4 text-[16px] font-semibold">لا توجد مهام مراجعة هذا الأسبوع</p>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] text-muted">أنشئ خطة مراجعة لما حفظته، أو اختر جزءًا من خريطة الرحلة وراجعه.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => go('plans', 'new')} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">خطة مراجعة جديدة</button>
          <button type="button" onClick={() => go('map')} className="press h-10 rounded-full px-5 text-[13px] ring-1 ring-line">خريطة الرحلة</button>
        </div>
      </div>
    )
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-[15px] font-semibold">مستحقّة الآن</h2>
        {open.length === 0 ? <p className="text-[13px] text-muted">لا مراجعة مستحقّة اليوم. المهام القادمة تظهر في خريطة الأسبوع.</p> : (
          <ul className="space-y-2">
            {open.map((t) => {
              const pr = taskProgress(st, t)
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-[20px] bg-card p-4 ring-1 ring-line" data-rev-task={t.id}>
                  <Icon name="repeat" size={18} className="text-gold" />
                  <span className="flex-1 text-[13.5px]"><b className="font-semibold">{t.plan.name}</b><span className="block text-[12px] text-muted">{rangeAr(t.unit, t.from!, t.to!)} · {t.date === today() ? 'اليوم' : `${fmtDate(t.date)} · لم تُسجَّل`} · {PHASE_AR[pr.phase]}{pr.total > 1 ? ` (${toAr(pr.done)}/${toAr(pr.total)})` : ''}</span></span>
                  <button type="button" onClick={() => go('revision', t.id)} className="press h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">{pr.phase === 'progress' ? 'تابع' : 'ابدأ'}</button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-[15px] font-semibold">أتممتها هذا الأسبوع</h2>
          <ul className="space-y-1.5 text-[13px]">{done.map((t) => <li key={t.id} className="flex items-center gap-2"><Icon name="check" size={14} className="text-leaf" />{t.plan.name} · {rangeAr(t.unit, t.from!, t.to!)}</li>)}</ul>
        </section>
      )}
    </div>
  )
}

/** Range title in the task's own unit, with its canonical ayah range for page-based tasks. */
const rangeTitle = (unit: Task['unit'], from: number, to: number, g0: number, g1: number) => (unit === 'page' ? `${rangeAr('page', from, to)} · ${rangeAr('ayah', g0, g1)}` : rangeAr('ayah', g0, g1))

function TaskRevision({ t, onBack }: { t: Task; onBack: () => void }) {
  const st = usePreview()
  const { go } = useProto()
  const openMushaf = useOpenInMushaf()
  const memBefore = useState(() => derived(st).memCount)[0]
  const [saved, setSaved] = useState<null | 'ok' | 'fail'>(null)
  const segs = taskSegments(t)
  const key = t.stepKey
  const doneN = key ? stepsDone(st, key, segs) : 0
  const all = segs.length > 0 && doneN === segs.length
  const recorded = t.state === 'done'
  const finish = () => {
    const ok = actions.completeTask(t.plan.id, t.date)
    setSaved(ok ? 'ok' : 'fail')
    if (ok) setActiveTask(null)
  }
  const openPage = (pg: number) => {
    const at = activeFromTask(t)
    if (at) setActiveTask(at)
    openMushaf(...PAGES[pg - 1])
  }
  return (
    <div data-revision-task={t.id} data-unit={t.unit}>
      <button type="button" onClick={onBack} className="press mb-4 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line"><Icon name="back" size={15} className="rotate-180" />مهام المراجعة</button>
      <div className="rounded-[24px] bg-card p-5 ring-1 ring-line">
        <p className="text-[12px] text-muted">{t.plan.name} · {t.date === today() ? 'اليوم' : fmtDate(t.date)} · {t.unit === 'page' ? 'مراجعة بالصفحات' : 'مراجعة بالآيات'}</p>
        <h2 className="font-arabic-display text-[20px] font-bold" data-rev-range>{t.from != null && t.g0 != null ? rangeTitle(t.unit, t.from, t.to!, t.g0, t.g1!) : 'لا مقطع'}</h2>
        {!recorded && segs.length > 0 && <p className="mt-1 text-[12.5px] text-muted">{toAr(doneN)} من {toAr(segs.length)} {t.unit === 'page' ? 'صفحات' : 'مقاطع'} مؤكَّدة</p>}
        {recorded && <p className="mt-2 rounded-[14px] bg-leaf/10 px-3 py-2 text-[12.5px] text-leaf">أُتمّت هذه المراجعة{t.record?.demo ? ' (سجل تجريبي)' : ''}.</p>}
      </div>
      {!recorded && t.state !== 'paused' && key && <RevisionRunner stepKey={key} segs={segs} onOpenPage={t.unit === 'page' ? openPage : undefined} />}
      <div className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line">
        {saved === 'ok' || recorded ? (
          <div role="status" data-revision-saved>
            <p className="font-semibold text-leaf">سُجّلت المراجعة · بارك الله فيك</p>
            <p className="mt-1 text-[12.5px] text-muted">تُحتسب في «المراجعة» فقط. الآيات المحفوظة بقيت {toAr(derived(st).memCount)} ({toAr(memBefore)} عند فتح الشاشة).</p>
            <button type="button" onClick={() => go('week')} className="press mt-3 h-10 rounded-full bg-night/[.06] px-4 text-[13px] font-semibold">العودة إلى خريطة الأسبوع</button>
          </div>
        ) : t.state === 'paused' ? (
          <p className="text-[13px] text-muted">الخطة متوقفة مؤقتًا.</p>
        ) : t.state === 'upcoming' ? (
          <p className="text-[13px] text-muted">هذه مهمة قادمة ({fmtDate(t.date)})؛ يمكنك المراجعة وتأكيد {t.unit === 'page' ? 'الصفحات' : 'المقاطع'} الآن، ويُسجَّل الإتمام في يومها.</p>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-muted">لا تُسجَّل المهمة بمجرد فتحها. أكّد كل {t.unit === 'page' ? 'صفحة' : 'مقطع'} بعد مراجعته، ثم اضغط الزر.</p>
            <button type="button" onClick={finish} disabled={!all} className="press h-12 w-full rounded-full bg-night text-[14px] font-semibold text-parchment disabled:opacity-40" data-finish-revision>{all ? 'أتممت المراجعة' : `بقي ${toAr(segs.length - doneN)} ${t.unit === 'page' ? 'صفحات' : 'مقاطع'}`}</button>
            {saved === 'fail' && <p role="alert" className="mt-2 text-[12.5px] text-clay">لم تُسجَّل: المهمة مسجّلة من قبل أو لم تعد مستحقّة.</p>}
          </>
        )}
      </div>
    </div>
  )
}

/** A free revision of a range opened outside a plan (a Juz from the map): one record per range per day. */
function ScopeRevision({ a }: { a: ActiveTask }) {
  const st = usePreview()
  const { go } = useProto()
  const segs = segmentsOf('revision', 'ayah', a.g0, a.g1, a.g0, a.g1)
  const doneN = stepsDone(st, a.stepKey, segs)
  const sessionId = revisionSessionId(a.g0, a.g1)
  const recorded = st.revisions.some((r) => r.id === sessionId)
  const all = doneN === segs.length
  const [fail, setFail] = useState(false)
  return (
    <div data-revision-scope={`${a.g0}-${a.g1}`}>
      <div className="rounded-[24px] bg-card p-5 ring-1 ring-line">
        <p className="text-[12px] text-muted">مراجعة حرّة · ليست مهمة خطة</p>
        <h2 className="font-arabic-display text-[20px] font-bold" data-rev-range>{a.name} · {rangeAr('ayah', a.g0, a.g1)}</h2>
        <p className="mt-1 text-[12.5px] text-muted">{toAr(doneN)} من {toAr(segs.length)} مقاطع مؤكَّدة</p>
      </div>
      {!recorded && <RevisionRunner stepKey={a.stepKey} segs={segs} />}
      <div className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line">
        {recorded ? (
          <div role="status" data-revision-saved>
            <p className="font-semibold text-leaf">سُجّلت مراجعة {a.name} اليوم · بارك الله فيك</p>
            <button type="button" onClick={() => (setActiveTask(null), go('map'))} className="press mt-3 h-10 rounded-full bg-night/[.06] px-4 text-[13px] font-semibold">العودة إلى الخريطة</button>
          </div>
        ) : (
          <>
            <button type="button" disabled={!all} onClick={() => setFail(!actions.recordRevision(sessionId, a.g0, a.g1, a.stepKey))} className="press h-12 w-full rounded-full bg-night text-[14px] font-semibold text-parchment disabled:opacity-40" data-finish-revision>{all ? 'أتممت المراجعة' : `بقي ${toAr(segs.length - doneN)} مقاطع`}</button>
            {fail && <p role="alert" className="mt-2 text-[12.5px] text-clay">لم تُسجَّل: أكّد كل المقاطع أولًا، أو سُجّلت هذه المراجعة اليوم من قبل.</p>}
          </>
        )}
      </div>
    </div>
  )
}

/** Navigable pages / passages of a revision, each confirmed on its own. */
function RevisionRunner({ stepKey, segs, onOpenPage }: { stepKey: string; segs: Segment[]; onOpenPage?: (pg: number) => void }) {
  const st = usePreview()
  const confirmed = st.steps[stepKey] ?? {}
  const [i, setI] = useState(() => Math.max(0, segs.findIndex((x) => !confirmed[x.id])))
  const [err, setErr] = useState<string | null>(null)
  if (segs.length === 0) return null
  const idx = Math.min(i, segs.length - 1)
  const seg = segs[idx]
  return (
    <div className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line">
      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={seg.page ? 'صفحات المراجعة' : 'مقاطع المراجعة'}>
        {segs.map((x, k) => (
          <button key={x.id} type="button" role="tab" aria-selected={k === idx} onClick={() => setI(k)} className={`press flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-[12px] ${k === idx ? 'bg-night text-parchment' : confirmed[x.id] ? 'bg-leaf/12 text-leaf' : 'bg-night/[.05] text-muted'}`} data-seg={x.id} data-seg-done={!!confirmed[x.id]}>
            {confirmed[x.id] && <Icon name="check" size={12} />}
            {x.page ? `ص ${toAr(x.page)}` : `${toAr(k + 1)}`}
          </button>
        ))}
      </div>
      <SegmentView key={seg.id} seg={seg} idx={idx} n={segs.length} done={!!confirmed[seg.id]} onConfirm={() => {
        if (!actions.markStep(stepKey, seg.id)) return setErr('لم يُسجَّل التأكيد: سُجّل من قبل أو تعذّر التسجيل. أعد المحاولة.')
        setErr(null)
        const next = segs.findIndex((x, k) => k > idx && !confirmed[x.id])
        if (next >= 0) setI(next)
      }} onOpenPage={onOpenPage} />
      {err && <p role="alert" className="mt-2 text-[12.5px] text-clay">{err}</p>}
    </div>
  )
}

function SegmentView({ seg, idx, n, done, onConfirm, onOpenPage }: { seg: Segment; idx: number; n: number; done: boolean; onConfirm: () => void; onOpenPage?: (pg: number) => void }) {
  const text = useRange(seg.g0, seg.g1)
  const [hide, setHide] = useState(true)
  const [self, setSelf] = useState<Record<number, 'ok' | 'weak'>>({})
  const rated = text.status === 'ready' && text.rows.every((_, k) => self[k])
  const cycle = (k: number) => setSelf((x) => ({ ...x, [k]: x[k] === 'ok' ? 'weak' : 'ok' }))
  return (
    <div data-segment={seg.id}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-[13.5px] font-semibold">{seg.page ? `الصفحة ${toAr(seg.page)}` : `المقطع ${toAr(idx + 1)}`} <span className="font-normal text-muted">· {rangeAr('ayah', seg.g0, seg.g1)} · {toAr(idx + 1)} من {toAr(n)}</span></p>
        {seg.page && onOpenPage && <button type="button" onClick={() => onOpenPage(seg.page!)} className="press flex h-9 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[12.5px] font-semibold" data-open-page={seg.page}><Icon name="book" size={14} />افتح الصفحة في المصحف</button>}
        <button type="button" onClick={() => setHide((v) => !v)} aria-pressed={!hide} className="press h-9 rounded-full bg-night/[.06] px-3.5 text-[12.5px] font-semibold" data-toggle-text>{hide ? 'أظهر النص' : 'أخفِ النص'}</button>
      </div>
      <p className="mb-2 text-[12.5px] text-muted">تلُ من ذاكرتك، ثم أظهر النص وقيّم كل آية: «تذكّرتها» أو «تحتاج تثبيتًا».</p>
      {text.status === 'error' ? (
        <p role="alert" className="rounded-[16px] bg-clay/10 p-4 text-[13px]">تعذّر تحميل نص الآيات. <button type="button" onClick={text.retry} className="font-semibold underline">أعد المحاولة</button></p>
      ) : text.status === 'loading' ? (
        <div className="h-24 animate-pulse rounded-[16px] bg-night/[.05]" role="status" aria-label="جارٍ التحميل" />
      ) : (
        <ol className="mf-paper space-y-2 rounded-[20px] p-4">
          {text.rows.map((r, k) => (
            <li key={`${r.s}:${r.a}`} className="flex items-start gap-2">
              <p className={`mf-text flex-1 ${r.hafs ? '' : 'tanzil'} ${hide ? 'select-none blur-[6px]' : ''}`} style={{ fontSize: 20, lineHeight: 2.05, textAlign: 'right', textAlignLast: 'right' }} aria-hidden={hide}>{r.t} <span className="mf-num">{toAr(r.a)}</span></p>
              <button type="button" disabled={done} onClick={() => cycle(k)} className={`press mt-2 min-h-9 shrink-0 rounded-full px-3 py-1 text-[11.5px] ${self[k] === 'ok' ? 'bg-leaf/10 text-leaf' : self[k] === 'weak' ? 'bg-gold-soft text-night' : 'bg-night/[.05] text-muted'}`} data-rate>{self[k] === 'ok' ? 'تذكّرتها' : self[k] === 'weak' ? 'تحتاج تثبيتًا' : `${surah(r.s).ar} ${toAr(r.a)}`}</button>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3">
        {done ? (
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-leaf" data-seg-confirmed><Icon name="check" size={15} />{seg.page ? 'رُوجعت هذه الصفحة' : 'رُوجع هذا المقطع'}</p>
        ) : (
          <button type="button" disabled={!rated} onClick={onConfirm} className="press h-11 w-full rounded-full bg-gold-soft text-[13.5px] font-semibold disabled:opacity-40" data-confirm-seg>{seg.page ? 'راجعت هذه الصفحة' : 'راجعت هذا المقطع'}</button>
        )}
      </div>
    </div>
  )
}
