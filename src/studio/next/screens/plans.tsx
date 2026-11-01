// خططي — plan management for the Next-generation preview. Create, view, edit,
// pause / resume, set primary, complete, archive and delete plans. All plan data
// lives in the shared preview store (../progress), never the app's plans.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { SURAHS, surah } from '../../../lib/quran'
import {
  ACTIVITY_AR, DAY_AR, STATUS_AR, TYPE_AR, actions, activityOf, addDays, derived, editMakesVersion, estimateFinish, fmtDate, nextTask, planProgress, planRange, planTasks, rangeAr, scopeAr, today, unitAr, usePreview, validatePlan, weekDates,
  type Activity, type Plan, type PlanDraft, type PlanType, type Scope, type Unit, type Workload,
} from '../progress'
import { Confirm, DataBar, useToast } from '../previewUi'
import { useStartTask } from '../taskNav'

const ORDER = [6, 0, 1, 2, 3, 4, 5]
const WORKLOAD: Record<Workload, { ar: string; ayah: number; page: number }> = { light: { ar: 'خفيف', ayah: 3, page: 5 }, moderate: { ar: 'متوسط', ayah: 5, page: 10 }, intense: { ar: 'مكثّف', ayah: 10, page: 20 } }
const blank = (type: PlanType = 'hifz'): PlanDraft => ({
  name: '', type, customActivity: 'hifz', scope: type === 'khatmah' ? { kind: 'quran' } : { kind: 'surah', s: 67, from: 1, to: 30 }, unit: type === 'reading' || type === 'khatmah' ? 'page' : 'ayah',
  daily: type === 'reading' || type === 'khatmah' ? 10 : 5, days: [6, 0, 1, 2, 3], workload: 'moderate', targetDate: null, reminder: null, primary: false,
})
const suggestName = (d: PlanDraft) => `${d.type === 'custom' ? ACTIVITY_AR[d.customActivity] : TYPE_AR[d.type].ar} · ${scopeAr(d.scope)}`

type Mode = { k: 'list' } | { k: 'form'; id?: string } | { k: 'detail'; id: string }

export function PlansScreen() {
  const desk = useDevice() === 'desktop'
  const { nav, go } = useProto()
  const [mode, setMode] = useState<Mode>(() => (nav.param === 'new' ? { k: 'form' } : nav.param?.startsWith('plan-') || nav.param?.startsWith('demo-') ? { k: 'detail', id: nav.param } : { k: 'list' }))
  // Every navigation to this screen (side rail, links, "new plan" shortcuts) picks the matching view.
  useEffect(() => {
    setMode(nav.param === 'new' ? { k: 'form' } : nav.param?.startsWith('plan-') || nav.param?.startsWith('demo-') ? { k: 'detail', id: nav.param } : { k: 'list' })
  }, [nav])
  const toast = useToast()
  const body = mode.k === 'form' ? (
    <PlanForm id={mode.id} onDone={(id, msg) => (toast.show(msg), setMode(id ? { k: 'detail', id } : { k: 'list' }))} onCancel={() => setMode(mode.id ? { k: 'detail', id: mode.id } : { k: 'list' })} />
  ) : mode.k === 'detail' ? (
    <PlanDetail id={mode.id} onBack={() => setMode({ k: 'list' })} onEdit={() => setMode({ k: 'form', id: mode.id })} toast={toast.show} />
  ) : (
    <PlanList onNew={() => setMode({ k: 'form' })} onOpen={(id) => setMode({ k: 'detail', id })} toast={toast.show} />
  )
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'} data-plans>
        {!desk && <MoreTabs />}
        <Head
          title="خططي"
          sub="أنشئ خطط الحفظ والمراجعة والقراءة والختمة، وتابعها في خريطة الأسبوع."
          action={
            <span className="flex shrink-0 items-center gap-2">
              <DataBar />
              {mode.k === 'list' && <button type="button" onClick={() => setMode({ k: 'form' })} className="press flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment" data-new-plan><Icon name="plus" size={16} />خطة جديدة</button>}
            </span>
          }
        />
        {mode.k === 'list' && (
          <div className="mb-4 flex flex-wrap gap-2 text-[12.5px]">
            <button type="button" onClick={() => go('week')} className="press flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 ring-1 ring-line"><Icon name="calendar" size={15} />خريطة الأسبوع</button>
            <button type="button" onClick={() => go('rewards')} className="press flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 ring-1 ring-line"><Icon name="gift" size={15} />الإنجازات</button>
          </div>
        )}
        {body}
      </div>
      {toast.el}
    </Chrome>
  )
}

// ---------------------------------------------------------------- list
function PlanList({ onNew, onOpen, toast }: { onNew: () => void; onOpen: (id: string) => void; toast: (m: string) => void }) {
  const st = usePreview()
  const [showArchived, setShowArchived] = useState(false)
  const live = st.plans.filter((p) => p.status === 'active' || p.status === 'paused').sort((a, b) => Number(b.primary) - Number(a.primary) || Number(a.status === 'paused') - Number(b.status === 'paused'))
  const done = st.plans.filter((p) => p.status === 'completed')
  const closed = st.plans.filter((p) => p.status === 'closed')
  const archived = st.plans.filter((p) => p.status === 'archived')
  if (st.plans.length === 0)
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-card/60 px-6 py-12 text-center" data-empty-plans>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name="target" size={24} /></span>
        <p className="mt-4 text-[17px] font-semibold">لا توجد خطط بعد</p>
        <p className="mx-auto mt-1.5 max-w-[440px] text-[13px] leading-relaxed text-muted">ابدأ بخطة واحدة: اختر نوعها (حفظ، مراجعة، قراءة، ختمة أو مخصصة)، ثم المدى من القرآن، والهدف اليومي، وأيام الدراسة. ستظهر مهامها فورًا في خريطة الأسبوع.</p>
        <button type="button" onClick={onNew} className="press mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-night px-5 text-[13.5px] font-semibold text-parchment"><Icon name="plus" size={16} />أنشئ خطتك الأولى</button>
      </div>
    )
  return (
    <div className="space-y-6">
      <Section title="الخطط النشطة" count={live.length}>
        {live.length === 0 ? <p className="rounded-[20px] bg-card/60 p-4 text-[13px] text-muted ring-1 ring-line">لا توجد خطة نشطة الآن. <button type="button" onClick={onNew} className="font-semibold text-gold underline">أنشئ خطة</button> أو استأنف خطة متوقفة.</p> : live.map((p) => <PlanCard key={p.id} p={p} onOpen={() => onOpen(p.id)} toast={toast} />)}
      </Section>
      {done.length > 0 && <Section title="المكتملة" count={done.length}>{done.map((p) => <PlanCard key={p.id} p={p} onOpen={() => onOpen(p.id)} toast={toast} />)}</Section>}
      {closed.length > 0 && <Section title="المغلقة يدويًا" count={closed.length}>{closed.map((p) => <PlanCard key={p.id} p={p} onOpen={() => onOpen(p.id)} toast={toast} />)}</Section>}
      {archived.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="press flex items-center gap-1.5 text-[13.5px] font-semibold text-muted"><Icon name="chevronDown" size={15} className={showArchived ? 'rotate-180' : ''} />المؤرشفة · {toAr(archived.length)}</button>
          {showArchived && <div className="mt-3 grid gap-3">{archived.map((p) => <PlanCard key={p.id} p={p} onOpen={() => onOpen(p.id)} toast={toast} />)}</div>}
        </div>
      )}
    </div>
  )
}
function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const desk = useDevice() === 'desktop'
  return (
    <section aria-label={title}>
      <h2 className="mb-2.5 text-[15px] font-semibold">{title} <span className="text-muted">· {toAr(count)}</span></h2>
      <div className={`grid gap-3 ${desk ? 'grid-cols-2' : 'grid-cols-1'}`}>{children}</div>
    </section>
  )
}

const statusTone = (p: Plan) => (p.status === 'active' ? 'bg-leaf/10 text-leaf' : p.status === 'paused' ? 'bg-gold-soft text-night' : p.status === 'completed' ? 'bg-sky/10 text-sky' : p.status === 'closed' ? 'bg-clay/10 text-clay' : 'bg-night/[.06] text-muted')
export const scheduleAr = (p: Pick<PlanDraft, 'daily' | 'unit' | 'days'>) => `${toAr(p.daily)} ${unitAr(p.unit, p.daily)} يوميًا · ${p.days.length === 7 ? 'كل يوم' : `${toAr(p.days.length)} ${p.days.length >= 3 && p.days.length <= 10 ? 'أيام' : 'يوم'} في الأسبوع`}`

function PlanCard({ p, onOpen, toast }: { p: Plan; onOpen: () => void; toast: (m: string) => void }) {
  const st = usePreview()
  const pr = derived(st).progress.get(p.id)!
  const nt = nextTask(st, p)
  return (
    <article className={`rounded-[24px] bg-card p-4 ring-1 ${p.primary ? 'ring-gold/50' : 'ring-line'}`} data-plan={p.id} data-status={p.status}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={TYPE_AR[p.type].icon} size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={onOpen} className="text-start text-[15px] font-semibold hover:underline" data-plan-name>{p.name}</button>
            {p.primary && <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-semibold text-white"><Icon name="star" size={10} fill />رئيسية</span>}
            {p.demo && <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky">تجريبية</span>}
            {p.version > 1 && <span className="rounded-full bg-night/[.06] px-2 py-0.5 text-[10.5px] font-semibold text-muted" data-plan-version>الإصدار {toAr(p.version)}</span>}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">{TYPE_AR[p.type].ar}{p.type === 'custom' ? ` (${ACTIVITY_AR[p.customActivity]})` : ''} · {scopeAr(p.scope)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(p)}`}>{STATUS_AR[p.status]}</span>
      </div>
      <p className="mt-3 text-[12.5px]">{scheduleAr(p)}</p>
      <div className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-leaf" style={{ width: `${Math.round(pr.pct * 100)}%` }} /></span>
        <span className="tabular-nums">{toAr(pr.done)} / {toAr(pr.total)} {unitAr(p.unit, pr.total)}</span>
      </div>
      <p className="mt-2 text-[12px] text-muted" data-next>
        {p.status === 'paused' ? 'متوقفة مؤقتًا · لا مهام حتى الاستئناف' : p.status === 'completed' ? `اكتملت${p.completedAt ? ` في ${fmtDate(p.completedAt)}` : ''} بمهام مسجّلة` : p.status === 'closed' ? 'أُغلقت يدويًا · لا تُعدّ مكتملة' : p.status === 'archived' ? 'مؤرشفة' : nt ? <>المهمة التالية: <b className="font-semibold text-night">{nt.date === today() ? 'اليوم' : `${DAY_AR[new Date(`${nt.date}T12:00`).getDay()]} ${fmtDate(nt.date)}`}</b> · {rangeAr(p.unit, nt.from!, nt.to!)}</> : 'لا مهمة في الأسبوعين القادمين'}
      </p>
      <PlanActions p={p} toast={toast} onDetails={onOpen} compact />
    </article>
  )
}

function PlanActions({ p, toast, onDetails, onEdit, compact = false, onDeleted }: { p: Plan; toast: (m: string) => void; onDetails?: () => void; onEdit?: () => void; compact?: boolean; onDeleted?: () => void }) {
  const [ask, setAsk] = useState<'delete' | 'close' | 'archive' | null>(null)
  const btn = 'press h-8 rounded-full px-3 text-[12px] ring-1 ring-line hover:bg-night/[.04]'
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {onDetails && compact && <button type="button" onClick={onDetails} className={`${btn} bg-night/[.04] font-semibold`}>التفاصيل</button>}
      {onEdit && p.status !== 'archived' && <button type="button" onClick={onEdit} className={btn} data-act="edit">تعديل</button>}
      {p.status === 'active' && <button type="button" onClick={() => (actions.setStatus(p.id, 'paused'), toast('أُوقفت الخطة مؤقتًا'))} className={btn} data-act="pause">إيقاف مؤقت</button>}
      {p.status === 'paused' && <button type="button" onClick={() => (actions.setStatus(p.id, 'active'), toast('استُؤنفت الخطة'))} className={btn} data-act="resume">استئناف</button>}
      {(p.status === 'active' || p.status === 'paused') && !p.primary && <button type="button" onClick={() => (actions.setPrimary(p.id), toast('أصبحت الخطة الرئيسية'))} className={btn} data-act="primary">اجعلها رئيسية</button>}
      {(p.status === 'active' || p.status === 'paused') && <button type="button" onClick={() => setAsk('close')} className={btn} data-act="close">إغلاق الخطة</button>}
      {(p.status === 'completed' || p.status === 'closed') && <button type="button" onClick={() => (actions.setStatus(p.id, 'active'), toast('أُعيد فتح الخطة'))} className={btn} data-act="reopen">إعادة فتح</button>}
      {p.status !== 'archived' ? <button type="button" onClick={() => setAsk('archive')} className={btn} data-act="archive">أرشفة</button> : <button type="button" onClick={() => (actions.setStatus(p.id, p.verified ? 'completed' : 'paused'), toast('أُخرجت من الأرشيف'))} className={btn} data-act="unarchive">إخراج من الأرشيف</button>}
      <button type="button" onClick={() => setAsk('delete')} className={`${btn} text-clay`} data-act="delete">حذف</button>
      {ask && (
        <Confirm
          title={ask === 'delete' ? `حذف «${p.name}»؟` : ask === 'close' ? 'إغلاق الخطة؟' : 'أرشفة الخطة؟'}
          body={ask === 'delete' ? 'تُحذف الخطة ومهامها من المعاينة. ما سجّلته من حفظ ومراجعة وقراءة يبقى، والإنجازات التي نلتها لا تُسحب.' : ask === 'close' ? 'الإغلاق إجراء إداري: تتوقف مهامها وتنتقل إلى «المغلقة يدويًا». لا تُعدّ الخطة مكتملة ولا تُمنح به أي إنجازات؛ اكتمال الخطة يُحتسب فقط حين تبلغ هدفها بمهام مسجّلة. التقدّم يبقى كما سُجّل.' : 'تختفي الخطة من الخريطة وتبقى في الأرشيف، ويمكنك إخراجها لاحقًا.'}
          confirm={ask === 'delete' ? 'حذف نهائي' : ask === 'close' ? 'إغلاق' : 'أرشفة'}
          danger={ask === 'delete'}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            if (ask === 'delete') (actions.deletePlan(p.id), toast('حُذفت الخطة'), onDeleted?.())
            else if (ask === 'close') (actions.setStatus(p.id, 'closed'), toast('أُغلقت الخطة · دون أي إنجاز'))
            else (actions.setStatus(p.id, 'archived'), toast('أُرشفت الخطة'))
            setAsk(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- detail
function PlanDetail({ id, onBack, onEdit, toast }: { id: string; onBack: () => void; onEdit: () => void; toast: (m: string) => void }) {
  const st = usePreview()
  const start = useStartTask()
  const p = st.plans.find((x) => x.id === id)
  if (!p)
    return (
      <div className="rounded-[24px] bg-card p-6 text-center ring-1 ring-line">
        <p className="font-semibold">هذه الخطة لم تعد موجودة</p>
        <button type="button" onClick={onBack} className="press mt-3 h-10 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">العودة إلى الخطط</button>
      </div>
    )
  const pr = derived(st).progress.get(p.id)!
  const upcoming = planTasks(st, p, Array.from({ length: 14 }, (_, i) => addDays(today(), i))).filter((t) => t.state !== 'done').slice(0, 6)
  const history = [...pr.records].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  return (
    <div data-plan-detail={p.id}>
      <button type="button" onClick={onBack} className="press mb-4 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line"><Icon name="back" size={15} className="rotate-180" />كل الخطط</button>
      <div className="rounded-[26px] bg-card p-5 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={TYPE_AR[p.type].icon} size={21} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-arabic-display text-[21px] font-bold">{p.name}</h2>
            <p className="text-[12.5px] text-muted">{TYPE_AR[p.type].ar}{p.type === 'custom' ? ` · مهامها: ${ACTIVITY_AR[p.customActivity]}` : ''} · {scopeAr(p.scope)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusTone(p)}`}>{STATUS_AR[p.status]}{p.primary ? ' · رئيسية' : ''}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
          {[
            ['الهدف اليومي', `${toAr(p.daily)} ${unitAr(p.unit, p.daily)}`],
            ['أيام الدراسة', ORDER.filter((d) => p.days.includes(d)).map((d) => DAY_AR[d].replace('ال', '')).join('، ')],
            ['التقدّم', `${toAr(pr.done)} / ${toAr(pr.total)} ${unitAr(p.unit, pr.total)} (${toAr(Math.round(pr.pct * 100))}٪)`],
            ['المدى', p.unit === 'page' ? `${rangeAr('page', pr.start, pr.end)} · ${rangeAr('ayah', pr.g0, pr.g1)}` : rangeAr('ayah', pr.g0, pr.g1)],
            ['الإصدار', `${toAr(p.version)}${p.version > 1 ? ` · منذ ${fmtDate(p.versions[p.versions.length - 1].from)}` : ''}`],
            ['الإنجاز المستهدف', p.targetDate ? fmtDate(p.targetDate) : 'غير محدّد'],
            ['بدأت', fmtDate(p.createdAt)],
            ['التذكير', p.reminder ? `${p.reminder} (معاينة · لا إشعار)` : 'بلا تذكير'],
            ['المتوقّع للإتمام', p.status === 'active' ? (estimateFinish(pr.total - pr.done, p.daily, p.days) ? fmtDate(estimateFinish(pr.total - pr.done, p.daily, p.days)!) : '—') : '—'],
            ['الوجهة', activityOf(p) === 'hifz' ? 'رحلة الحفظ' : activityOf(p) === 'revision' ? 'المراجعة' : 'المصحف'],
          ].map(([k, v]) => <div key={k} className="rounded-[14px] bg-night/[.04] px-3 py-2"><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>)}
        </dl>
        <span className="mt-4 block h-2 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-leaf" style={{ width: `${pr.pct * 100}%` }} /></span>
        <PlanActions p={p} toast={toast} onEdit={onEdit} onDeleted={onBack} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-card p-5 ring-1 ring-line">
          <h3 className="mb-3 text-[14.5px] font-semibold">المهام القادمة</h3>
          {upcoming.length === 0 ? <p className="text-[13px] text-muted">{p.status === 'paused' ? 'الخطة متوقفة؛ استأنفها لتظهر مهامها.' : 'لا مهام قادمة.'}</p> : (
            <ul className="space-y-2">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-[16px] bg-night/[.03] px-3 py-2.5 text-[12.5px]">
                  <span className="w-24 shrink-0 font-semibold">{t.date === today() ? 'اليوم' : `${DAY_AR[new Date(`${t.date}T12:00`).getDay()]}`}<span className="block text-[11px] font-normal text-muted">{fmtDate(t.date)}</span></span>
                  <span className="flex-1">{t.from != null ? rangeAr(t.unit, t.from, t.to!) : t.state === 'paused' ? 'متوقفة' : 'لم تُسجَّل'}</span>
                  {t.state === 'open' && <button type="button" onClick={() => start(t)} className="press h-8 rounded-full bg-night px-3 text-[12px] font-semibold text-parchment">ابدأ</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-[24px] bg-card p-5 ring-1 ring-line">
          <h3 className="mb-3 text-[14.5px] font-semibold">ما أتممته</h3>
          {history.length === 0 ? <p className="text-[13px] text-muted">لم تُسجَّل مهمة بعد. تُسجَّل المهمة فقط حين تضغط «سجّل الإتمام».</p> : (
            <ul className="space-y-1.5 text-[12.5px]">
              {history.map((r) => <li key={r.id} className="flex items-center gap-2" data-history={r.id}><Icon name="check" size={14} className="text-leaf" /><span className="flex-1">{ACTIVITY_AR[r.activity]} · {rangeAr(r.unit, r.from, r.to)}{r.unit === 'page' ? <span className="block text-[11px] text-muted">{rangeAr('ayah', r.g0, r.g1)}</span> : null}</span><span className="text-muted">{fmtDate(r.date)}{p.versions.length > 1 ? ` · الإصدار ${toAr(r.planVersion)}` : ''}{r.demo ? ' · تجريبي' : ''}</span></li>)}
            </ul>
          )}
          {p.versions.length > 1 && (
            <div className="mt-4 border-t border-line/70 pt-3" data-versions>
              <p className="mb-1.5 text-[12.5px] font-semibold">إصدارات الخطة</p>
              <ul className="space-y-1 text-[12px] text-muted">
                {p.versions.map((v) => <li key={v.v}>الإصدار {toAr(v.v)} · من {fmtDate(v.from)} · {TYPE_AR[v.cfg.type].ar} · {scopeAr(v.cfg.scope)} · {toAr(v.cfg.daily)} {unitAr(v.cfg.unit, v.cfg.daily)} يوميًا</li>)}
              </ul>
              <p className="mt-1.5 text-[11px] text-muted">كل مهمة مسجّلة تبقى بإصدارها ووحدتها ومداها كما سُجّلت.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- form
function PlanForm({ id, onDone, onCancel }: { id?: string; onDone: (id: string | null, msg: string) => void; onCancel: () => void }) {
  const st = usePreview()
  const desk = useDevice() === 'desktop'
  const existing = id ? st.plans.find((p) => p.id === id) : undefined
  const [d, setD] = useState<PlanDraft>(() => (existing ? { ...existing } : { ...blank(), primary: !st.plans.some((p) => p.status === 'active') }))
  const [nameTouched, setNameTouched] = useState(!!existing)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const set = (p: Partial<PlanDraft>) => setD((x) => ({ ...x, ...p }))
  const name = nameTouched ? d.name : suggestName(d)
  const draft = { ...d, name }
  const errs = validatePlan(draft)
  const ok = Object.keys(errs).length === 0
  const bumps = !!existing && editMakesVersion(st, existing.id, draft)
  const show = (k: string) => (tried || k !== 'name' ? errs[k] : undefined)
  const field = 'h-11 rounded-2xl bg-card px-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-gold'
  const setType = (type: PlanType) => {
    const pageish = type === 'reading' || type === 'khatmah'
    set({ type, unit: pageish ? 'page' : type === 'custom' ? d.unit : 'ayah', daily: WORKLOAD[d.workload][pageish ? 'page' : 'ayah'], scope: type === 'khatmah' ? { kind: 'quran' } : d.scope.kind === 'pages' && !pageish ? { kind: 'surah', s: 67, from: 1, to: 30 } : d.scope })
  }
  // One submission at a time; a success message only when the store actually accepted it.
  const save = () => {
    setTried(true)
    if (!ok || busy) return
    setBusy(true)
    setSaveErr(null)
    if (existing) {
      const r = actions.updatePlan(existing.id, draft)
      if (!r) return (setBusy(false), setSaveErr('لم تُحفظ التعديلات: راجع الحقول، أو أن الخطة لم تعد موجودة.'))
      onDone(existing.id, r.bumped ? `أُنشئ الإصدار ${toAr(r.version)} من الخطة · المهام السابقة محفوظة بإعداداتها الأصلية` : 'حُفظت التعديلات · حُدّثت خريطة الأسبوع')
    } else {
      const nid = actions.createPlan(draft)
      if (!nid) return (setBusy(false), setSaveErr('لم تُنشأ الخطة: راجع الحقول المعلَّمة.'))
      onDone(nid, 'أُنشئت الخطة · ظهرت مهامها في خريطة الأسبوع')
    }
  }
  const summary = <Summary d={draft} ok={ok} planId={existing?.id} />
  return (
    <div className={desk ? 'grid grid-cols-[minmax(0,1fr)_330px] items-start gap-6' : ''} data-plan-form>
      <form onSubmit={(e) => (e.preventDefault(), save())} className="space-y-4" noValidate>
        <p className="text-[13px] text-muted">{existing ? `تعديل «${existing.name}» · ما سجّلته من مهام يبقى كما هو.` : 'خطة جديدة · اتّبع الخطوات، وتظهر المعاينة الحيّة بجانبك.'}</p>
        <Step n={1} title="نوع الخطة">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="نوع الخطة">
            {(Object.keys(TYPE_AR) as PlanType[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={d.type === t} onClick={() => setType(t)} className={`press flex flex-col items-center gap-1.5 rounded-[18px] px-2 py-3 text-[12.5px] ring-1 ${d.type === t ? 'bg-gold-soft font-semibold ring-gold' : 'bg-card ring-line'}`} data-type={t}>
                <Icon name={TYPE_AR[t].icon} size={19} />{TYPE_AR[t].ar}
              </button>
            ))}
          </div>
          {d.type === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="text-muted">نوع مهامها:</span>
              {(['hifz', 'revision', 'reading'] as Activity[]).map((a) => <Chip key={a} on={d.customActivity === a} onClick={() => set({ customActivity: a })}>{ACTIVITY_AR[a]}</Chip>)}
            </div>
          )}
        </Step>
        <Step n={2} title="اسم الخطة">
          <input aria-label="اسم الخطة" value={name} onChange={(e) => (setNameTouched(true), set({ name: e.target.value }))} maxLength={70} className={`${field} w-full`} data-field="name" />
          {!nameTouched && <p className="mt-1 text-[11.5px] text-muted">اسم مقترح من النوع والنطاق؛ عدّله كما تحب.</p>}
          <Err m={show('name')} />
        </Step>
        <Step n={3} title="النطاق من القرآن">
          <ScopeEditor d={d} set={set} field={field} />
          <Err m={errs.scope} />
        </Step>
        <Step n={4} title="الهدف اليومي">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="text-muted">الوحدة:</span>
            {(['ayah', 'page'] as Unit[]).map((u) => <Chip key={u} on={d.unit === u} disabled={u === 'ayah' && d.scope.kind === 'pages'} onClick={() => set({ unit: u, daily: WORKLOAD[d.workload][u] })}>{u === 'ayah' ? 'آيات' : 'صفحات'}</Chip>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="text-muted">العبء اليومي المفضّل:</span>
            {(Object.keys(WORKLOAD) as Workload[]).map((w) => <Chip key={w} on={d.workload === w} onClick={() => set({ workload: w, daily: WORKLOAD[w][d.unit] })}>{WORKLOAD[w].ar} · {toAr(WORKLOAD[w][d.unit])}</Chip>)}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px]">
            <input aria-label="الهدف اليومي" type="number" min={1} value={Number.isFinite(d.daily) ? d.daily : ''} onChange={(e) => set({ daily: Math.floor(Number(e.target.value)) })} className={`${field} w-24 text-center`} data-field="daily" />
            {unitAr(d.unit, d.daily)} في كل يوم دراسة
          </label>
          <Err m={errs.daily} />
        </Step>
        <Step n={5} title="أيام الدراسة">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="أيام الدراسة">
            {ORDER.map((x) => <Chip key={x} on={d.days.includes(x)} onClick={() => set({ days: d.days.includes(x) ? d.days.filter((y) => y !== x) : [...d.days, x] })} data-day={x}>{DAY_AR[x]}</Chip>)}
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted">الأيام غير المختارة أيام راحة مقصودة، لا تُحسب أيامًا فائتة.</p>
          <Err m={errs.days} />
        </Step>
        <Step n={6} title="اختياري">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-muted">تاريخ الإنجاز المستهدف
              <input type="date" min={today()} value={d.targetDate ?? ''} onChange={(e) => set({ targetDate: e.target.value || null })} className={`${field} mt-1 w-full`} data-field="target" />
              <Err m={errs.targetDate} />
            </label>
            <label className="text-[12px] text-muted">وقت التذكير
              <input type="time" value={d.reminder ?? ''} onChange={(e) => set({ reminder: e.target.value || null })} className={`${field} mt-1 w-full`} />
              <span className="mt-1 block text-[11px]">في المعاينة لا يُرسل إشعار.</span>
              <Err m={errs.reminder} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={d.primary} onChange={(e) => set({ primary: e.target.checked })} className="h-4 w-4 accent-[var(--color-gold)]" data-field="primary" />
            اجعلها الخطة الرئيسية (خطة رئيسية واحدة فقط)
          </label>
        </Step>
        {bumps && (
          <p role="status" className="rounded-[18px] bg-gold-soft/60 p-3.5 text-[12.5px] leading-relaxed ring-1 ring-gold/30" data-version-notice>
            <b className="font-semibold">سيُنشئ هذا التعديل الإصدار {toAr(existing!.version + 1)} من الخطة.</b> غيّرت نوعها أو وحدتها أو نطاقها أو هدفها اليومي بعد تسجيل تقدّم. المهام المسجّلة سابقًا تبقى بإعداداتها الأصلية (الوحدة والمدى) ولا يُعاد تفسيرها، والإصدار الجديد يبدأ من أول ما لم يُسجَّل في نطاقه.
          </p>
        )}
        {!desk && summary}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={(tried && !ok) || busy} aria-busy={busy} className="press h-12 flex-1 rounded-full bg-night text-[14px] font-semibold text-parchment disabled:opacity-40" data-save>{existing ? 'احفظ التعديلات' : 'أنشئ الخطة'}</button>
          <button type="button" onClick={onCancel} className="press h-12 rounded-full px-5 text-[13.5px] ring-1 ring-line">إلغاء</button>
        </div>
        {tried && !ok && <p role="alert" className="text-[12.5px] text-clay" data-form-error>راجع الحقول المعلَّمة قبل الحفظ.</p>}
        {saveErr && <p role="alert" className="text-[12.5px] text-clay" data-save-error>{saveErr}</p>}
      </form>
      {desk && <div className="sticky top-0">{summary}</div>}
    </div>
  )
}

function ScopeEditor({ d, set, field }: { d: PlanDraft; set: (p: Partial<PlanDraft>) => void; field: string }) {
  const sc = d.scope
  const kinds: [Scope['kind'], string][] = [['quran', 'القرآن كاملًا'], ['surah', 'سورة'], ['juz', 'جزء'], ['range', 'مدى آيات'], ['pages', 'مدى صفحات']]
  const pick = (k: Scope['kind']) =>
    set(k === 'quran' ? { scope: { kind: 'quran' } } : k === 'surah' ? { scope: { kind: 'surah', s: 67, from: 1, to: 30 } } : k === 'juz' ? { scope: { kind: 'juz', j: 30 } } : k === 'range' ? { scope: { kind: 'range', from: [2, 1], to: [2, 20] } } : { scope: { kind: 'pages', from: 1, to: 20 }, unit: 'page', daily: d.unit === 'page' ? d.daily : WORKLOAD[d.workload].page })
  const num = (v: string) => Math.floor(Number(v))
  const surahSel = (v: number, on: (n: number) => void, label: string) => (
    <select aria-label={label} value={v} onChange={(e) => on(Number(e.target.value))} className={`${field} min-w-0 flex-1`}>
      {SURAHS.map((x) => <option key={x.n} value={x.n}>{toAr(x.n)}. {x.ar} · {toAr(x.ayat)} آية</option>)}
    </select>
  )
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="النطاق">
        {kinds.map(([k, l]) => <Chip key={k} on={sc.kind === k} onClick={() => pick(k)} data-scope={k}>{l}</Chip>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        {sc.kind === 'surah' && (
          <>
            {surahSel(sc.s, (s) => set({ scope: { kind: 'surah', s, from: 1, to: surah(s).ayat } }), 'السورة')}
            <label className="flex items-center gap-1">من<input aria-label="من الآية" type="number" value={sc.from} onChange={(e) => set({ scope: { ...sc, from: num(e.target.value) } })} className={`${field} w-20 text-center`} data-field="from" /></label>
            <label className="flex items-center gap-1">إلى<input aria-label="إلى الآية" type="number" value={sc.to} onChange={(e) => set({ scope: { ...sc, to: num(e.target.value) } })} className={`${field} w-20 text-center`} data-field="to" /></label>
          </>
        )}
        {sc.kind === 'juz' && (
          <select aria-label="الجزء" value={sc.j} onChange={(e) => set({ scope: { kind: 'juz', j: Number(e.target.value) } })} className={`${field} w-40`}>
            {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>الجزء {toAr(i + 1)}</option>)}
          </select>
        )}
        {sc.kind === 'range' && (
          <div className="grid w-full gap-2">
            <div className="flex items-center gap-2"><span className="w-8 text-muted">من</span>{surahSel(sc.from[0], (s) => set({ scope: { ...sc, from: [s, 1] } }), 'سورة البداية')}<input aria-label="آية البداية" type="number" value={sc.from[1]} onChange={(e) => set({ scope: { ...sc, from: [sc.from[0], num(e.target.value)] } })} className={`${field} w-20 text-center`} /></div>
            <div className="flex items-center gap-2"><span className="w-8 text-muted">إلى</span>{surahSel(sc.to[0], (s) => set({ scope: { ...sc, to: [s, surah(s).ayat] } }), 'سورة النهاية')}<input aria-label="آية النهاية" type="number" value={sc.to[1]} onChange={(e) => set({ scope: { ...sc, to: [sc.to[0], num(e.target.value)] } })} className={`${field} w-20 text-center`} /></div>
          </div>
        )}
        {sc.kind === 'pages' && (
          <>
            <label className="flex items-center gap-1">من صفحة<input aria-label="من صفحة" type="number" value={sc.from} onChange={(e) => set({ scope: { ...sc, from: num(e.target.value) } })} className={`${field} w-20 text-center`} /></label>
            <label className="flex items-center gap-1">إلى<input aria-label="إلى صفحة" type="number" value={sc.to} onChange={(e) => set({ scope: { ...sc, to: num(e.target.value) } })} className={`${field} w-20 text-center`} /></label>
          </>
        )}
        {sc.kind === 'quran' && <p className="text-muted">من الفاتحة إلى الناس · {d.unit === 'page' ? '٦٠٤ صفحة' : '٦٢٣٦ آية'}</p>}
      </div>
    </div>
  )
}

/** Live summary + estimated first-week schedule, computed with the same task generator as the roadmap. */
function Summary({ d, ok, planId }: { d: PlanDraft; ok: boolean; planId?: string }) {
  const st = usePreview()
  const sim = useMemo(() => {
    if (!ok) return null
    const r = planRange(d)
    const base = planId ? st.plans.find((x) => x.id === planId) : undefined
    const createdAt = base?.createdAt ?? today()
    const p: Plan = { ...(base ?? { version: 1, versions: [], schedule: [], verified: null, completedAt: null }), name: d.name, type: d.type, customActivity: d.customActivity, scope: d.scope, unit: d.unit, daily: d.daily, days: d.days, workload: d.workload, targetDate: d.targetDate, reminder: d.reminder, primary: d.primary, id: planId ?? '__draft__', status: 'active', createdAt, schedule: [{ from: createdAt, days: d.days }] }
    // Progress under the edited configuration, from the canonical ranges already recorded.
    const done = planId ? planProgress(st, p).done : 0
    const left = Math.max(0, r.total - done)
    const finish = estimateFinish(left, d.daily, d.days)
    const week = planTasks(st, p, weekDates()).filter((t) => t.state !== 'unrecorded')
    const perWeek = d.daily * d.days.length
    const need = d.targetDate ? Math.ceil(left / Math.max(1, d.days.length * Math.max(1, Math.ceil((new Date(`${d.targetDate}T12:00`).getTime() - Date.now()) / (7 * 864e5))))) : null
    return { r, left, finish, week, perWeek, need }
  }, [d, ok, planId, st])
  return (
    <aside className="rounded-[24px] bg-card p-5 ring-1 ring-line" aria-label="ملخّص الخطة" data-summary-live>
      <p className="text-[12px] text-muted">ملخّص حيّ</p>
      <p className="mt-0.5 text-[16px] font-semibold">{d.name || '—'}</p>
      {!sim ? <p className="mt-3 rounded-[14px] bg-clay/[.07] p-3 text-[12.5px] text-clay">أكمل الحقول المطلوبة لعرض الملخّص والجدول.</p> : (
        <>
          <ul className="mt-3 space-y-1.5 text-[12.5px]">
            <li><b className="font-semibold">{TYPE_AR[d.type].ar}</b>{d.type === 'custom' ? ` · ${ACTIVITY_AR[d.customActivity]}` : ''} · {scopeAr(d.scope)}</li>
            <li>المدى: {rangeAr(d.unit, sim.r.start, sim.r.end)} · {toAr(sim.r.total)} {unitAr(d.unit, sim.r.total)}</li>
            <li>{scheduleAr(d)} · {toAr(sim.perWeek)} {unitAr(d.unit, sim.perWeek)} أسبوعيًا</li>
            <li>الإتمام المتوقّع: <b className="font-semibold">{sim.finish ? fmtDate(sim.finish) : '—'}</b> ({toAr(Math.ceil(sim.left / d.daily))} يوم دراسة)</li>
            {d.targetDate && sim.finish && (sim.finish > d.targetDate ? <li className="text-clay">لن تبلغ الهدف في {fmtDate(d.targetDate)} بهذا المعدّل؛ تحتاج نحو {toAr(sim.need ?? 0)} {unitAr(d.unit, sim.need ?? 0)} يوميًا.</li> : <li className="text-leaf">تبلغ هدفك قبل {fmtDate(d.targetDate)} بإذن الله.</li>)}
          </ul>
          <p className="mb-1.5 mt-4 text-[12.5px] font-semibold">الجدول المتوقّع لهذا الأسبوع</p>
          <ul className="space-y-1" data-schedule>
            {weekDates().map((date) => {
              const t = sim.week.find((x) => x.date === date)
              return (
                <li key={date} className={`flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-[12px] ${t ? 'bg-gold-soft/50' : 'text-muted'}`}>
                  <span className="w-16 shrink-0">{DAY_AR[new Date(`${date}T12:00`).getDay()]}</span>
                  <span className="flex-1 truncate">{t ? (t.from != null ? rangeAr(t.unit, t.from, t.to!) : t.state === 'done' ? 'مسجّلة' : '') : date < today() ? '—' : 'راحة'}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted">تقدير: الأيام الماضية من هذا الأسبوع لا تُجدول للخطة الجديدة.</p>
        </>
      )}
    </aside>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-[24px] bg-card p-4 ring-1 ring-line">
      <legend className="sr-only">{title}</legend>
      <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[12px] text-white">{toAr(n)}</span>{title}</p>
      {children}
    </fieldset>
  )
}
function Chip({ on, children, disabled, onClick, ...rest }: { on: boolean; children: ReactNode; disabled?: boolean; onClick: () => void; [k: `data-${string}`]: unknown }) {
  return <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} {...rest} className={`press h-9 rounded-full px-3.5 text-[12.5px] ring-1 disabled:opacity-40 ${on ? 'bg-night font-semibold text-parchment ring-night' : 'bg-card ring-line'}`}>{children}</button>
}
const Err = ({ m }: { m?: string }) => (m ? <p role="alert" className="mt-1.5 text-[12px] text-clay" data-err>{m}</p> : null)
