// خريطة خطط الأسبوع — weekly roadmap (design preview). Every station and task is
// generated from the shared preview plans (../progress): study weekdays, daily
// targets and the plan's real cursor. A weekday with no task is an intentional
// rest day; an earlier day without a record is "not recorded", never "missed".
// Tasks complete only by an explicit «سجّل الإتمام»; opening one records nothing.
import { useState } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { Box, C, GlowDefs, S, STATUS_COLOR, SURFACE, kernel, tint, type Status } from '../iso'
import { ACTIVITY_AR, DAY_AR, TYPE_AR, actions, fmtDate, rangeAr, today, unitAr, usePreview, weekTasks, type Task } from '../progress'
import { Confirm, DataBar, useToast } from '../previewUi'
import { DEST_AR, useStartTask } from '../taskNav'

type Day = ReturnType<typeof weekTasks>[number] & { rest: boolean }
const ICON = { hifz: 'sprout', revision: 'repeat', reading: 'book' } as const
const dayStatus = (d: Day): Status => (d.rest ? 'rest' : d.tasks.every((t) => t.state === 'done') ? 'done' : d.tasks.some((t) => t.state === 'done') ? 'progress' : 'idle')
const taskStatus = (t: Task): Status => (t.state === 'done' ? 'done' : 'idle')

export function WeekRoadmap() {
  const device = useDevice()
  const st = usePreview()
  const days: Day[] = weekTasks(st).map((d) => ({ ...d, rest: d.tasks.length === 0 }))
  const [sel, setSel] = useState(today())
  const d = days.find((x) => x.date === sel) ?? days[0]
  const toast = useToast()
  const counted = days.flatMap((x) => x.tasks).filter((t) => t.state !== 'paused')
  const doneN = counted.filter((t) => t.state === 'done').length
  const head = <Head title="خريطة خطط الأسبوع" sub="سبع محطات من خططك الفعلية. تُضاء المحطة حين تكتمل مهامها، وأيام الراحة جزء مقصود من خطتك." action={<DataBar />} />
  const stats = (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px]" data-week-stats>
      <span className="rounded-full bg-leaf/10 px-3 py-1.5 font-semibold text-leaf">إنجاز الأسبوع {toAr(counted.length ? Math.round((doneN / counted.length) * 100) : 0)}٪</span>
      <span className="rounded-full bg-night/[.05] px-3 py-1.5">{toAr(doneN)} مكتملة · {toAr(counted.length - doneN)} متبقّية</span>
    </div>
  )
  const detail = <DayDetail d={d} toast={toast.show} />
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
            {head}
            <Plans />
            {stats}
            <Road days={days} sel={d.date} onSel={setSel} wide />
          </div>
          <aside className="no-scrollbar w-[370px] shrink-0 overflow-y-auto border-s border-line/60 bg-card/50 p-6">{detail}</aside>
        </div>
        {toast.el}
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-8 pt-4">
        <MoreTabs />
        {head}
        <Plans />
        {stats}
        <Road days={days} sel={d.date} onSel={setSel} />
        <div className="mt-2 rounded-[26px] bg-card p-5 ring-1 ring-line">{detail}</div>
      </div>
      {toast.el}
    </Chrome>
  )
}

function Plans() {
  const st = usePreview()
  const { go } = useProto()
  const shown = st.plans.filter((p) => p.status === 'active' || p.status === 'paused' || p.status === 'completed').sort((a, b) => Number(b.primary) - Number(a.primary))
  if (st.plans.length === 0)
    return (
      <div className="mb-6 rounded-[24px] border border-dashed border-line bg-card/60 p-5 text-center" data-week-empty>
        <p className="font-semibold">لا توجد خطط بعد، فالأسبوع كله أيام راحة</p>
        <p className="mt-1 text-[12.5px] text-muted">أنشئ خطة لتظهر مهامها اليومية على هذه المحطات.</p>
        <button type="button" onClick={() => go('plans', 'new')} className="press mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment"><Icon name="plus" size={15} />خطة جديدة</button>
      </div>
    )
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {shown.map((p) => (
        <button key={p.id} type="button" onClick={() => go('plans', p.id)} className={`press flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[12.5px] ring-1 ${p.primary ? 'ring-gold/60' : 'ring-line'} ${p.status !== 'active' ? 'opacity-70' : ''}`} data-week-plan={p.id}>
          <Icon name={TYPE_AR[p.type].icon} size={15} className="text-gold" />
          <b className="font-semibold">{p.name}</b>
          {p.primary && <Icon name="star" size={12} fill className="text-gold" />}
          <span className="text-muted">· {p.status === 'active' ? `${toAr(p.daily)} ${unitAr(p.unit, p.daily)} · ${toAr(p.days.length)} أيام` : p.status === 'paused' ? 'متوقفة مؤقتًا' : 'مكتملة'}</span>
        </button>
      ))}
      <button type="button" onClick={() => go('plans')} className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-muted hover:bg-night/[.04]"><Icon name="target" size={15} />إدارة الخطط</button>
      <button type="button" onClick={() => go('plans', 'new')} className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-gold hover:bg-night/[.04]"><Icon name="plus" size={15} />خطة جديدة</button>
    </div>
  )
}

function Road({ days, sel, onSel, wide = false }: { days: Day[]; sel: string; onSel: (d: string) => void; wide?: boolean }) {
  const W = wide ? 820 : 350
  const H = wide ? 330 : 760
  const k = kernel(0, 0)
  const pos = days.map((_, i) => {
    const X = wide ? W - 60 - i * ((W - 120) / 6) : i % 2 ? 105 : W - 105
    const Y = wide ? 150 + (i % 2 ? 70 : 0) : 70 + i * 100
    return { X, Y, x: (Y / S + X / C) / 2, y: (Y / S - X / C) / 2 }
  })
  const path = pos.map((p, i) => (i === 0 ? `M${p.X},${p.Y}` : `Q${(pos[i - 1].X + p.X) / 2},${wide ? (pos[i - 1].Y + p.Y) / 2 + (i % 2 ? -50 : 50) : (pos[i - 1].Y + p.Y) / 2} ${p.X},${p.Y}`)).join(' ')
  const P = wide ? 70 : 62
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="أيام الأسبوع">
      <GlowDefs id="wk" />
      <path d={path} fill="none" stroke="color-mix(in oklab, var(--color-line) 85%, var(--color-night) 6%)" strokeWidth={20} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--color-card)" strokeWidth={14} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--color-line)" strokeWidth={1.4} strokeDasharray="3 7" />
      {pos.map(({ x, y, X, Y }, i) => {
        const d = days[i]
        const st = dayStatus(d)
        const h = d.rest ? 8 : 14
        const f = st === 'idle' ? SURFACE : tint(STATUS_COLOR[st], st === 'rest' ? 0.45 : 0.6)
        const on = sel === d.date
        return (
          <g key={d.date} className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`${DAY_AR[d.dow]}${d.rest ? '، يوم راحة' : ''}`} onClick={() => onSel(d.date)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel(d.date))}>
            {(st === 'done' || st === 'progress' || st === 'rest') && <ellipse className="iso-halo" cx={X} cy={Y} rx={P * 0.85} ry={P * 0.45} fill={STATUS_COLOR[st]} filter="url(#wk-bloom)" opacity={st === 'rest' ? 0.5 : undefined} />}
            <g className="iso-lift">
              <Box k={k} x={x - P / 2} y={y - P / 2} z={0} w={P} d={P} h={h} f={f} />
              {on && <polygon points={k.poly([[x - P / 2, y - P / 2, h], [x + P / 2, y - P / 2, h], [x + P / 2, y + P / 2, h], [x - P / 2, y + P / 2, h]])} fill="none" stroke="var(--color-night)" strokeWidth={1.6} />}
              {d.tasks.slice(0, 3).map((t, ti) => {
                const ts: Status = taskStatus(t)
                const tx = x - P / 2 + 8 + ti * ((P - 16) / 3)
                return <Box key={ti} k={k} x={tx} y={y - 8} z={h} w={(P - 16) / 3 - 4} d={16} h={ts === 'idle' ? 3 : 6} f={ts === 'idle' ? SURFACE : tint(STATUS_COLOR[ts], 0.8)} />
              })}
              {d.rest && <path transform={`translate(${X - 9} ${Y - h - 22}) scale(0.75)`} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="var(--color-sky)" strokeWidth={2} strokeLinejoin="round" />}
              <text x={X} y={Y + P * 0.62} textAnchor="middle" fontSize={12.5} fontWeight={d.today ? 800 : 600} fill={d.today ? 'var(--color-night)' : 'var(--color-muted)'}>{DAY_AR[d.dow]}</text>
              {d.today && (
                <g>
                  <rect x={X - 18} y={Y + P * 0.62 + 6} width={36} height={16} rx={8} fill="var(--color-night)" />
                  <text x={X} y={Y + P * 0.62 + 17.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--color-parchment)">اليوم</text>
                </g>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

function DayDetail({ d, toast }: { d: Day; toast: (m: string) => void }) {
  const { go } = useProto()
  const st = dayStatus(d)
  const when = d.today ? 'اليوم' : d.past ? 'مضى' : 'قادم'
  if (d.rest)
    return (
      <div data-day={d.date}>
        <p className="text-[12px] text-muted">{when} · {fmtDate(d.date)}</p>
        <h2 className="font-arabic-display text-[20px] font-bold">{DAY_AR[d.dow]}</h2>
        <div className="mt-4 rounded-[22px] bg-sky/10 p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky/15 text-sky"><Icon name="moon" size={22} /></span>
          <p className="mt-3 font-semibold">يوم راحة مقصود</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">لا توجد مهام لهذا اليوم في خططك. الراحة جزء من الاستمرار، ولا يُحسب يومًا فائتًا.</p>
        </div>
        <button type="button" onClick={() => go('ayah')} className="press mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-night/[.05] text-[13.5px] font-medium">
          <Icon name="sparkle" size={16} />تدبّر آية بلا التزام
        </button>
      </div>
    )
  return (
    <div data-day={d.date}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-muted">{when} · {fmtDate(d.date)}</p>
          <h2 className="font-arabic-display text-[20px] font-bold">{DAY_AR[d.dow]}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${st === 'done' ? 'bg-leaf/10 text-leaf' : st === 'progress' ? 'bg-gold-soft' : 'bg-night/[.05] text-muted'}`}>{st === 'done' ? 'اكتملت مهامه' : st === 'progress' ? 'قيد الإنجاز' : d.past ? 'لم تُسجَّل' : 'لم يبدأ'}</span>
      </div>
      <ul className="mt-4 space-y-2.5">{d.tasks.map((t) => <TaskRow key={t.id} t={t} toast={toast} />)}</ul>
      <p className="mt-4 text-[11px] leading-relaxed text-muted">تُسجَّل المهمة فقط عند «سجّل الإتمام». فتحها لا يُكملها، والأيام السابقة غير المسجّلة لا تُعدّ تقصيرًا.</p>
    </div>
  )
}

function TaskRow({ t, toast }: { t: Task; toast: (m: string) => void }) {
  const start = useStartTask()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sure, setSure] = useState(false)
  const done = t.state === 'done'
  const canComplete = t.state === 'open' || t.state === 'unrecorded'
  const complete = () => {
    if (t.activity === 'hifz') return setConfirm(true)
    if (actions.completeTask(t.plan.id, t.date)) toast(t.activity === 'revision' ? 'سُجّلت المراجعة · لا تزيد الآيات المحفوظة' : 'سُجّلت القراءة · لا تُحتسب حفظًا')
  }
  const stateAr = done ? 'مكتملة' : t.state === 'open' ? 'مستحقّة اليوم' : t.state === 'upcoming' ? 'قادمة' : t.state === 'paused' ? 'الخطة متوقفة' : 'لم تُسجَّل'
  return (
    <li className="rounded-[20px] bg-night/[.03] p-4 ring-1 ring-line" data-task={t.id} data-state={t.state}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-leaf/12 text-leaf' : 'bg-gold-soft text-gold'}`}><Icon name={done ? 'check' : ICON[t.activity]} size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold">{ACTIVITY_AR[t.activity]} · <span className="font-normal text-muted">{t.plan.name}</span>{t.plan.primary && <Icon name="star" size={11} fill className="ms-1 inline text-gold" />}</p>
          <p className="text-[12px] text-muted">{t.from != null ? `${rangeAr(t.unit, t.from, t.to!)} · ${toAr(t.to! - t.from + 1)} ${unitAr(t.unit, t.to! - t.from + 1)}` : t.state === 'unrecorded' ? `${toAr(t.plan.daily)} ${unitAr(t.unit, t.plan.daily)} · يُحدَّد المقطع عند التسجيل` : 'لا مهام حتى الاستئناف'} · {stateAr}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(t.state === 'open' || t.state === 'upcoming') && <button type="button" onClick={() => start(t)} className="press h-8 rounded-full bg-night px-3.5 text-[12px] font-semibold text-parchment" data-start>{t.state === 'open' ? 'ابدأ' : 'ابدأ مبكرًا'} · {DEST_AR[t.activity]}</button>}
        {canComplete && <button type="button" onClick={complete} className="press h-8 rounded-full bg-leaf/12 px-3.5 text-[12px] font-semibold text-leaf" data-complete>{t.state === 'unrecorded' ? 'سجّلها الآن' : 'سجّل الإتمام'}</button>}
        {done && actions.canUndo(t.plan.id, t.date) && <button type="button" onClick={() => actions.undoTask(t.plan.id, t.date) && toast('أُلغي تسجيل المهمة')} className="press h-8 rounded-full px-3.5 text-[12px] ring-1 ring-line" data-undo>تراجع</button>}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="press h-8 rounded-full px-3 text-[12px] text-muted hover:bg-night/[.05]">التفاصيل</button>
      </div>
      {open && (
        <dl className="mt-3 grid grid-cols-2 gap-1.5 text-[11.5px]">
          {[['الخطة', `${t.plan.name} (${TYPE_AR[t.plan.type].ar})`], ['التاريخ', fmtDate(t.date)], ['الوجهة', DEST_AR[t.activity]], ['الحالة', stateAr], ...(t.record ? [['سُجّلت', `${fmtDate(t.record.at.slice(0, 10))}${t.record.demo ? ' · تجريبي' : ''}`]] : [])].map(([k, v]) => <div key={k} className="rounded-[12px] bg-card px-2.5 py-1.5"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
      )}
      {confirm && (
        <Confirm
          title="تأكيد إتمام مهمة الحفظ"
          body={<><p>تُسجَّل الآيات محفوظة فقط إذا أتقنتها فعلًا. القراءة أو الاستماع وحدهما لا يكفيان.</p><label className="mt-3 flex items-center gap-2 text-night"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" data-confirm-mem />أؤكّد أنني أتقنت حفظ آيات هذه المهمة</label></>}
          confirm="سجّل الحفظ"
          onCancel={() => (setConfirm(false), setSure(false))}
          onConfirm={() => {
            if (!sure) return
            if (actions.completeTask(t.plan.id, t.date, { confirmedMemorised: true })) toast('سُجّل الحفظ المؤكَّد · حُدّثت الخريطة والمكتبة')
            setConfirm(false)
            setSure(false)
          }}
        />
      )}
    </li>
  )
}
