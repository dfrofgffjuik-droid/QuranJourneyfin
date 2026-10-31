// المراجعة — revision experience for plan tasks (design preview). Shows the exact
// verses of the task (KFGQPC Hafs, loaded verbatim), lets the learner recite from
// memory and self-check, then records the revision only on «أتممت المراجعة».
// Revision never adds memorised ayat.
import { useEffect, useState } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { fromGIndex, loadMushaf, surah } from '../../../lib/quran'
import { actions, derived, fmtDate, planTasks, rangeAr, today, usePreview, weekDates, type Task } from '../progress'
import { DataBar } from '../previewUi'
import { setActiveTask } from '../taskNav'

type Row = { s: number; a: number; t: string; hafs: boolean }
function useRange(from: number | null, to: number | null) {
  const [st, setSt] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; rows: Row[] }>({ key: '', status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const key = `${from}-${to}`
  useEffect(() => {
    if (from == null || to == null) return
    let live = true
    setSt({ key, status: 'loading', rows: [] })
    const last = Math.min(to, from + 59) // keep the page light: up to 60 ayat
    const need: number[] = []
    for (let g = from; g <= last; g++) need.push(g)
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

export function RevisionScreen() {
  const desk = useDevice() === 'desktop'
  const { nav, go } = useProto()
  const st = usePreview()
  const week = weekDates()
  const all = st.plans.flatMap((p) => planTasks(st, p, week)).filter((t) => t.activity === 'revision')
  const task = all.find((t) => t.id === nav.param) ?? null
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'} data-revision>
        {!desk && <MoreTabs />}
        <Head title="المراجعة" sub="راجع ما حفظته من ذاكرتك ثم تحقّق. المراجعة تثبّت الحفظ، ولا تُحتسب حفظًا جديدًا." action={<DataBar />} />
        {task ? <TaskRevision key={task.id} t={task} onBack={() => go('revision')} /> : <TaskList tasks={all} />}
      </div>
    </Chrome>
  )
}

function TaskList({ tasks }: { tasks: Task[] }) {
  const { go } = useProto()
  const open = tasks.filter((t) => t.state === 'open' || t.state === 'unrecorded')
  const done = tasks.filter((t) => t.state === 'done')
  if (tasks.length === 0)
    return (
      <div className="rounded-[26px] border border-dashed border-line bg-card/60 px-6 py-10 text-center" data-empty>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name="repeat" size={24} /></span>
        <p className="mt-4 text-[16px] font-semibold">لا توجد مهام مراجعة هذا الأسبوع</p>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] text-muted">أنشئ خطة مراجعة لما حفظته، وستظهر مهامها هنا وفي خريطة الأسبوع.</p>
        <button type="button" onClick={() => go('plans', 'new')} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">خطة مراجعة جديدة</button>
      </div>
    )
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-[15px] font-semibold">مستحقّة الآن</h2>
        {open.length === 0 ? <p className="text-[13px] text-muted">لا مراجعة مستحقّة اليوم. المهام القادمة تظهر في خريطة الأسبوع.</p> : (
          <ul className="space-y-2">
            {open.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-[20px] bg-card p-4 ring-1 ring-line">
                <Icon name="repeat" size={18} className="text-gold" />
                <span className="flex-1 text-[13.5px]"><b className="font-semibold">{t.plan.name}</b><span className="block text-[12px] text-muted">{t.date === today() ? 'اليوم' : `${fmtDate(t.date)} · لم تُسجَّل`}</span></span>
                <button type="button" onClick={() => go('revision', t.id)} className="press h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">ابدأ</button>
              </li>
            ))}
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

function TaskRevision({ t, onBack }: { t: Task; onBack: () => void }) {
  const st = usePreview()
  const { go } = useProto()
  const memBefore = derived(st).memCount
  // Ayah-unit plans revise that range; page-unit revision plans cannot be resolved to ayat here.
  const range = t.state === 'done' ? { from: t.record!.from, to: t.record!.to } : t.state === 'open' || t.state === 'upcoming' ? { from: t.from!, to: t.to! } : null
  const late = t.state === 'unrecorded'
  const ayahUnit = t.unit === 'ayah'
  const text = useRange(ayahUnit && range ? range.from : late && ayahUnit ? derived(st).progress.get(t.plan.id)!.cursor : null, ayahUnit && range ? range.to : late && ayahUnit ? Math.min(derived(st).progress.get(t.plan.id)!.end, derived(st).progress.get(t.plan.id)!.cursor + t.plan.daily - 1) : null)
  const [hide, setHide] = useState(true)
  const [self, setSelf] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<null | 'ok' | 'fail'>(null)
  const finish = () => {
    const ok = actions.completeTask(t.plan.id, t.date)
    setSaved(ok ? 'ok' : 'fail')
    if (ok) setActiveTask(null)
  }
  return (
    <div data-revision-task={t.id}>
      <button type="button" onClick={onBack} className="press mb-4 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line"><Icon name="back" size={15} className="rotate-180" />مهام المراجعة</button>
      <div className="rounded-[24px] bg-card p-5 ring-1 ring-line">
        <p className="text-[12px] text-muted">{t.plan.name} · {t.date === today() ? 'اليوم' : fmtDate(t.date)}</p>
        <h2 className="font-arabic-display text-[20px] font-bold">{range ? rangeAr(t.unit, range.from, range.to) : 'المقطع التالي في الخطة'}</h2>
        {t.state === 'done' && <p className="mt-2 rounded-[14px] bg-leaf/10 px-3 py-2 text-[12.5px] text-leaf">أُتمّت هذه المراجعة{t.record?.demo ? ' (سجل تجريبي)' : ''}.</p>}
      </div>
      {ayahUnit ? (
        <div className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line">
          <div className="mb-3 flex items-center gap-2">
            <p className="flex-1 text-[13px] text-muted">تلُ من ذاكرتك، ثم أظهر النص وتحقّق من كل آية.</p>
            <button type="button" onClick={() => setHide((v) => !v)} aria-pressed={!hide} className="press h-9 rounded-full bg-night/[.06] px-3.5 text-[12.5px] font-semibold" data-toggle-text>{hide ? 'أظهر النص' : 'أخفِ النص'}</button>
          </div>
          {text.status === 'error' ? (
            <p role="alert" className="rounded-[16px] bg-clay/10 p-4 text-[13px]">تعذّر تحميل نص الآيات. <button type="button" onClick={text.retry} className="font-semibold underline">أعد المحاولة</button></p>
          ) : text.status === 'loading' ? (
            <div className="h-24 animate-pulse rounded-[16px] bg-night/[.05]" role="status" aria-label="جارٍ التحميل" />
          ) : (
            <ol className="mf-paper space-y-2 rounded-[20px] p-4">
              {text.rows.map((r, i) => (
                <li key={`${r.s}:${r.a}`} className="flex items-start gap-2">
                  <p className={`mf-text flex-1 ${r.hafs ? '' : 'tanzil'} ${hide ? 'select-none blur-[6px]' : ''}`} style={{ fontSize: 20, lineHeight: 2.05, textAlign: 'right', textAlignLast: 'right' }} aria-hidden={hide}>{r.t} <span className="mf-num">{toAr(r.a)}</span></p>
                  <button type="button" onClick={() => setSelf((x) => ({ ...x, [i]: !x[i] }))} className={`press mt-2 shrink-0 rounded-full px-2.5 py-1 text-[11px] ${self[i] ? 'bg-leaf/10 text-leaf' : 'bg-night/[.05] text-muted'}`}>{self[i] ? 'تذكّرتها' : `${surah(r.s).ar} ${toAr(r.a)}`}</button>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-[20px] bg-card p-4 text-[13px] text-muted ring-1 ring-line">هذه خطة مراجعة بالصفحات؛ راجعها في المصحف ثم سجّل الإتمام هنا.</p>
      )}
      <div className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line">
        {saved === 'ok' || t.state === 'done' ? (
          <div role="status" data-revision-saved>
            <p className="font-semibold text-leaf">سُجّلت المراجعة · بارك الله فيك</p>
            <p className="mt-1 text-[12.5px] text-muted">تُحتسب في «المراجعة» فقط. الآيات المحفوظة بقيت {toAr(derived(st).memCount)} كما كانت ({toAr(memBefore)} قبل التسجيل).</p>
            <button type="button" onClick={() => go('week')} className="press mt-3 h-10 rounded-full bg-night/[.06] px-4 text-[13px] font-semibold">العودة إلى خريطة الأسبوع</button>
          </div>
        ) : t.state === 'upcoming' ? (
          <p className="text-[13px] text-muted">هذه مهمة قادمة ({fmtDate(t.date)})؛ يمكنك المراجعة الآن، ويُسجَّل الإتمام في يومها.</p>
        ) : t.state === 'paused' ? (
          <p className="text-[13px] text-muted">الخطة متوقفة مؤقتًا.</p>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-muted">لا تُسجَّل المهمة بمجرد فتحها. اضغط الزر بعد أن تُتمّ المراجعة فعلًا.</p>
            <button type="button" onClick={finish} className="press h-12 w-full rounded-full bg-night text-[14px] font-semibold text-parchment" data-finish-revision>أتممت المراجعة</button>
            {saved === 'fail' && <p role="alert" className="mt-2 text-[12.5px] text-clay">لم تُسجَّل: المهمة مسجّلة من قبل أو لم تعد مستحقّة.</p>}
          </>
        )}
      </div>
    </div>
  )
}
