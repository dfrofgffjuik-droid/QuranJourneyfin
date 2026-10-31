import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { SurahBadge } from '../components/Mushaf'
import { RangePicker, type Range } from '../components/RangePicker'
import { DAY_AR_SHORT, DAY_EN_SHORT, KindBadge, PlanCard, planTitle, StatusPill, TodayAction, useFmt, weekOrder, WeekStrip } from '../components/PlanParts'
import { Bar, Button, Card, Empty, ProgressRing, ScreenHeader, Section, Segmented, Sheet, Stepper } from '../components/ui'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { fromGIndex, gIndex, JUZ, juzEnd, pageEnd, pageOf, surah, SURAHS, TOTAL_AYAT, type Pos } from '../lib/quran'
import { OpenQuranArt } from '../components/Illustrations'
import {
  activePlans, addPlan, ALL_DAYS, dailyFor, forecast, kindMeta, newPlan, patchPlan, PLAN_KINDS, planProgress, primaryPlan, rangeText, recordUnits, setStatus, spreadOverdue, totalUnits, unitLabel, WHOLE,
  type PlanKind, type QPlan, type Unit,
} from '../lib/plans'
import { addKnown, memorizedCount, revisionTasks, updateActive, useActive, type Profile } from '../lib/store'
import { addDays, today } from '../lib/date'
import { TaskRow } from './Home'

// ---------------------------------------------------------------- List

export function PlanScreen() {
  const { L, N, A } = useL()
  const p = useActive()!
  const [known, setKnown] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const prim = primaryPlan(p)
  const active = activePlans(p)
  const paused = p.plans.filter((x) => x.status === 'paused')
  const old = p.plans.filter((x) => x.status === 'completed' || x.status === 'archived')
  const tasks = revisionTasks(p)
  const memorizedSurahs = SURAHS.filter((s) => memorizedCount(p, s.n) > 0)

  return (
    <div className="space-y-10">
      <ScreenHeader
        title={L('خططي', 'My plans')}
        subtitle={L('حفظ ومراجعة وقراءة وختمة، لكل خطة جدولها وتقدّمها', 'Memorisation, revision, reading and khatmah, each with its own schedule')}
        action={
          <Button href="#/plan/new">
            <Icon name="plus" size={17} />
            {L('خطة جديدة', 'New plan')}
          </Button>
        }
      />

      {p.plans.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_KINDS.map((k) => (
            <Card key={k.kind} href={`#/plan/new?kind=${k.kind}`} className="p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                <Icon name={k.icon} />
              </span>
              <span className="mt-3 block text-[17px] font-bold">{L(k.ar, k.en)}</span>
              <span className="mt-0.5 block text-sm text-muted">{L(k.dAr, k.dEn)}</span>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {prim && <PrimaryHero p={p} pl={prim} />}
          {active.filter((x) => x.id !== prim?.id).length > 0 && (
            <Section title={L('خطط نشطة أخرى', 'Other active plans')}>
              <div className="grid gap-3 lg:grid-cols-2">
                {active
                  .filter((x) => x.id !== prim?.id)
                  .map((pl) => (
                    <PlanCard key={pl.id} p={p} pl={pl} />
                  ))}
              </div>
            </Section>
          )}
          {paused.length > 0 && (
            <Section title={L('متوقفة مؤقتًا', 'Paused')}>
              <div className="grid gap-3 lg:grid-cols-2">
                {paused.map((pl) => (
                  <PlanCard key={pl.id} p={p} pl={pl} action={<Button size="sm" variant="soft" onClick={() => updateActive((x) => setStatus(x, pl.id, 'active'))}>{L('استئناف', 'Resume')}</Button>} />
                ))}
              </div>
            </Section>
          )}
          {old.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowOld((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-muted">
                <Icon name="chevronDown" size={16} className={showOld ? 'rotate-180' : ''} />
                {L(`المكتملة والمؤرشفة (${N(old.length)})`, `Completed & archived (${old.length})`)}
              </button>
              {showOld && (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {old.map((pl) => (
                    <PlanCard key={pl.id} p={p} pl={pl} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Section title={L('المراجعة المستحقّة', 'Due revision')} action={tasks.length > 0 && <Button size="sm" href="#/revise?due=1">{L('راجع الكل', 'Revise all')}</Button>}>
        {tasks.length === 0 ? (
          <Empty icon="check" title={L('لا شيء مستحقّ اليوم', 'Nothing due today')} body={L('كل آية تحفظها تعود بعد يوم، ثم تتباعد كلما ثبتت. ما تنساه يعود سريعًا.', 'Each ayah returns after a day, then spaces out as it settles. Anything forgotten comes back soon.')} />
        ) : (
          <Card className="p-3">
            <p className="px-2 pb-1 text-sm text-muted">{L(`${A(tasks.reduce((a, t) => a + t.count, 0))} في ${N(tasks.length)} مواضع`, `${tasks.reduce((a, t) => a + t.count, 0)} ayat in ${tasks.length} portions`)}</p>
            <ul className="grid gap-x-4 md:grid-cols-2">
              {tasks.slice(0, 8).map((t) => (
                <TaskRow key={`${t.s}-${t.from}`} t={t} start />
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title={L('محفوظاتي', 'What I’ve memorised')} action={<Button size="sm" variant="outline" onClick={() => setKnown(true)}><Icon name="plus" size={16} />{L('أضف ما أحفظه', 'Add what I know')}</Button>}>
        {memorizedSurahs.length === 0 ? (
          <Empty icon="sprout" title={L('لم تُسجَّل محفوظات بعد', 'Nothing recorded yet')} body={L('إن كنت تحفظ سورًا من قبل فأضفها لتدخل جدول المراجعة.', 'If you already know some surahs, add them so they enter revision.')} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {memorizedSurahs.map((s) => {
              const m = memorizedCount(p, s.n)
              return (
                <a key={s.n} href={`#/surah/${s.n}`} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line hover:ring-gold/40">
                  <SurahBadge n={s.n} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.ar}</span>
                    <Bar value={m / s.ayat} className="mt-1.5 h-1.5" />
                  </span>
                  <span className="text-xs tabular-nums text-muted">{L(`${N(m)} من ${N(s.ayat)}`, `${m} of ${s.ayat}`)}</span>
                </a>
              )
            })}
          </div>
        )}
      </Section>

      <KnownSheet open={known} onClose={() => setKnown(false)} />
    </div>
  )
}

function PrimaryHero({ p, pl }: { p: Profile; pl: QPlan }) {
  const { L, N, lang } = useL()
  const f = useFmt()
  const pr = planProgress(p, pl)
  const fc = forecast(p, pl)
  const ratio = pl.kind === 'revision' ? (pr.total ? 1 - (pr.due ?? 0) / pr.total : 0) : pr.done / Math.max(1, pr.total)
  return (
    <section className="pattern-night overflow-hidden rounded-[28px] p-6 text-parchment shadow-[0_24px_50px_-30px_rgba(20,60,40,.8)] md:p-8">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <KindBadge pl={pl} light />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[12px]">
              <Icon name="star" size={12} fill />
              {L('الخطة الأساسية', 'Primary plan')}
            </span>
          </div>
          <a href={`#/plan/${pl.id}`} className="mt-3 block font-arabic-display text-[1.7rem] leading-tight md:text-3xl">
            {planTitle(pl, lang, N)}
          </a>
          <p className="mt-1 text-sm text-parchment/75">
            {pl.kind === 'revision'
              ? L(`${N(pr.due ?? 0)} مستحقّة · ${N(pl.daily)} آية يوميًا`, `${pr.due ?? 0} due · ${pl.daily} ayat a day`)
              : `${unitLabel(pl.unit, pr.done, lang, N)} ${L('من', 'of')} ${N(pr.total)}${fc.finish ? ` · ${L('الإتمام المتوقّع', 'est. finish')} ${f.date(fc.finish)}` : ''}`}
          </p>
        </div>
        <ProgressRing value={ratio} size={78} stroke={6} tone="parchment">
          <span className="text-[15px] font-bold text-parchment">{N(Math.round(ratio * 100))}٪</span>
        </ProgressRing>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TodayAction p={p} pl={pl} size="lg" light />
        <a href={`#/plan/${pl.id}`} className="text-sm text-parchment/80 underline-offset-4 hover:underline">
          {L('تفاصيل الخطة', 'Plan details')}
        </a>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Detail

export function PlanDetail({ id }: { id: string }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const f = useFmt()
  const pl = p.plans.find((x) => x.id === id)
  const [confirm, setConfirm] = useState<null | 'archive' | 'delete' | 'complete'>(null)
  const [extra, setExtra] = useState(1)
  if (!pl) return <Empty icon="calendar" title={L('الخطة غير موجودة', 'Plan not found')} action={<Button href="#/plan">{L('خططي', 'My plans')}</Button>} />
  const pr = planProgress(p, pl)
  const fc = forecast(p, pl)
  const isPrimary = primaryPlan(p)?.id === pl.id
  const reading = pl.kind === 'reading' || pl.kind === 'khatmah' || pl.kind === 'custom'
  const remaining = pl.kind === 'revision' ? (pr.due ?? 0) : pr.total - pr.done
  const ratio = pl.kind === 'revision' ? (pr.total ? 1 - (pr.due ?? 0) / pr.total : 0) : pr.done / Math.max(1, pr.total)
  const act = (fn: (x: Profile) => Profile) => updateActive(fn)
  const recent = Object.entries(pl.log).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScreenHeader title={planTitle(pl, lang, N)} subtitle={planTitle(pl, lang, N) === rangeText(pl.start, pl.end, lang, N) ? L(kindMeta(pl.kind).ar, kindMeta(pl.kind).en) : rangeText(pl.start, pl.end, lang, N)} backTo="#/plan" action={<Button size="sm" variant="outline" href={`#/plan/${pl.id}/edit`}>{L('تعديل', 'Edit')}</Button>} />

      {reading ? (
        <KhatamHero p={p} pl={pl} />
      ) : (
      <section className="pattern-night overflow-hidden rounded-[28px] p-6 text-parchment">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <KindBadge pl={pl} light />
            {pl.status === 'active' && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px]">● {fc.finish || pl.kind === 'revision' ? L('على المسار', 'On track') : L('نشطة', 'Active')}</span>}
            {pl.status !== 'active' && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px]">{{ paused: L('متوقفة', 'Paused'), completed: L('مكتملة', 'Completed'), archived: L('مؤرشفة', 'Archived') }[pl.status]}</span>}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-[2rem] font-bold leading-none tabular-nums">
              {pl.kind === 'revision' ? N(pr.total) : `${N(pr.done)} / ${N(pr.total)}`}
            </p>
            <p className="mt-1 text-sm text-parchment/75">{pl.kind === 'revision' ? L('آية محفوظة في نطاق الخطة', 'known ayat in range') : pl.unit === 'page' ? L('صفحة', 'pages') : L('آية', 'ayat')}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-full bg-white/15 px-2.5 py-1">{L(`${unitLabel(pl.unit, pl.daily, lang, N)} يوميًا`, `${unitLabel(pl.unit, pl.daily, lang, N)} a day`)}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">{pl.days.length === 7 ? L('كل الأيام', 'Every day') : L(`${N(pl.days.length)} أيام في الأسبوع`, `${pl.days.length} days a week`)}</span>
            </div>
          </div>
          <ProgressRing value={ratio} size={96} stroke={7} tone="parchment">
            <span className="text-lg font-bold text-parchment">{N(Math.round(ratio * 100))}٪</span>
          </ProgressRing>
        </div>
      </section>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat icon="check" v={N(pl.kind === 'revision' ? pr.today : pr.done)} l={pl.kind === 'revision' ? L('رُوجعت اليوم', 'Revised today') : L('أُنجز', 'Done')} />
        <Stat icon="layers" v={N(remaining)} l={pl.kind === 'revision' ? L('مستحقّة', 'Due') : L('متبقٍّ', 'Remaining')} tone={pl.kind === 'revision' && (pr.overdue ?? 0) > 0 ? 'text-clay' : ''} />
        <Stat icon="calendar" v={fc.finish ? N(Math.max(0, Math.round((new Date(`${fc.finish}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) / 86400000)) + 1) : '—'} l={L('يومًا متبقيًا', 'Days left')} />
      </div>

      <Card className="p-5">
        <p className="mb-3 font-semibold">{L('اليوم', 'Today')}</p>
        <TodayAction p={p} pl={pl} size="lg" />
        {reading && pl.status === 'active' && pr.done < pr.total && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <span className="text-sm text-muted">{L('سجّل ما قرأته:', 'Log what you read:')}</span>
            <Stepper value={extra} min={1} max={Math.max(1, pr.total - pr.done)} onChange={setExtra} format={(n) => unitLabel(pl.unit, n, lang, N)} />
            <Button size="sm" variant="soft" onClick={() => (act((x) => recordUnits(x, pl.id, extra)), setExtra(1))}>
              <Icon name="check" size={16} />
              {L('سجّل', 'Log')}
            </Button>
          </div>
        )}
        {pl.kind === 'revision' && (pr.overdue ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-clay/10 p-4">
            <p className="text-sm text-clay">{L(`${N(pr.overdue!)} آية متأخرة. يمكنك توزيعها على الأيام القادمة بحسب حملك اليومي.`, `${pr.overdue} ayat overdue. Spread them over the coming days at your daily load.`)}</p>
            <Button size="sm" variant="outline" onClick={() => act((x) => spreadOverdue(x, pl))}>
              {L('وزّع المتأخر', 'Spread overdue')}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 font-semibold">{pl.kind === 'revision' ? L('المراجعة خلال ٧ أيام', 'Revision over 7 days') : L('جدول الأسبوع', 'This week')}</p>
        <WeekStrip p={p} pl={pl} />
      </Card>

      <Card className="divide-y divide-line">
        <Line icon="clock" l={L('البداية', 'Started')} v={f.date(pl.startedAt)} />
        {pl.targetDate && <Line icon="calendar" l={L('التاريخ المستهدف', 'Target date')} v={f.date(pl.targetDate)} />}
        {pl.kind !== 'revision' && <Line icon="sparkle" l={L('الإتمام المتوقّع', 'Estimated finish')} v={fc.finish ? f.date(fc.finish) : pl.status === 'active' ? '—' : L('متوقفة', 'Paused')} warn={!!(pl.targetDate && fc.finish && fc.finish > pl.targetDate)} />}
        {pl.completedAt && <Line icon="check" l={L('اكتملت', 'Completed')} v={f.date(pl.completedAt)} />}
      </Card>
      {pl.targetDate && fc.finish && fc.finish > pl.targetDate && pl.status === 'active' && (
        <p className="rounded-2xl bg-gold-soft/60 p-4 text-sm">
          {L(`بهذا المعدّل ستتجاوز التاريخ المستهدف. تحتاج نحو ${unitLabel(pl.unit, dailyFor(remaining, pl.targetDate, pl.days), lang, N)} يوميًا.`, `At this pace you’ll pass the target date. You need about ${unitLabel(pl.unit, dailyFor(remaining, pl.targetDate, pl.days), lang, N)} a day.`)}{' '}
          <button type="button" className="font-semibold text-gold underline" onClick={() => act((x) => patchPlan(x, pl.id, (y) => ({ ...y, daily: dailyFor(remaining, pl.targetDate!, pl.days) })))}>
            {L('عدّل الحمل اليومي', 'Adjust daily load')}
          </button>
        </p>
      )}
      <p className="flex gap-2 rounded-2xl bg-night/[0.04] p-4 text-[13px] text-muted">
        <Icon name="eye" size={18} className="shrink-0" />
        {pl.kind === 'hifz'
          ? L('يتقدّم هذا الهدف عندما تقيّم حفظك بـ«حفظتها» في جلسة الحفظ. القراءة العادية لا تحتسب هنا.', 'This goal moves when you rate an ayah “Memorised” in a session. Plain reading doesn’t count here.')
          : pl.kind === 'revision'
            ? L('تُجدول المراجعة بحسب تقييمك: ما تذكّرته بطلاقة يتباعد، وما نسيته يعود غدًا.', 'Revision follows your ratings: smooth recall spaces out, forgotten ayat return tomorrow.')
            : L('يتقدّم عندما تسجّل ورد اليوم من القارئ أو من هنا.', 'Moves when you log today’s reading from the reader or here.')}
      </p>

      {recent.length > 0 && reading && (
        <Card className="p-5">
          <p className="mb-2 font-semibold">{L('آخر الأيام', 'Recent days')}</p>
          <ul className="space-y-1.5 text-sm">
            {recent.map(([d, n]) => (
              <li key={d} className="flex justify-between">
                <span className="text-muted">{f.date(d)}</span>
                <span className="font-medium">{unitLabel(pl.unit, n, lang, N)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {pl.status === 'active' && !isPrimary && (
          <Button variant="soft" onClick={() => act((x) => ({ ...x, primaryPlanId: pl.id }))}>
            <Icon name="star" size={16} />
            {L('اجعلها الأساسية', 'Make primary')}
          </Button>
        )}
        {pl.status === 'active' && (
          <Button variant="outline" onClick={() => act((x) => setStatus(x, pl.id, 'paused'))}>
            <Icon name="pause" size={16} />
            {L('إيقاف مؤقت', 'Pause')}
          </Button>
        )}
        {(pl.status === 'paused' || pl.status === 'archived' || pl.status === 'completed') && (
          <Button variant="outline" onClick={() => act((x) => setStatus(x, pl.id, 'active'))}>
            <Icon name="play" size={16} />
            {pl.status === 'paused' ? L('استئناف', 'Resume') : L('إعادة التفعيل', 'Reactivate')}
          </Button>
        )}
        {pl.status !== 'completed' && pl.status !== 'archived' && (
          <Button variant="outline" onClick={() => setConfirm('complete')}>
            <Icon name="check" size={16} />
            {L('إكمال', 'Complete')}
          </Button>
        )}
        {pl.status !== 'archived' && (
          <Button variant="ghost" onClick={() => setConfirm('archive')}>
            {L('أرشفة', 'Archive')}
          </Button>
        )}
        {pl.status === 'archived' && (
          <Button variant="ghost" className="text-clay" onClick={() => setConfirm('delete')}>
            {L('حذف نهائي', 'Delete')}
          </Button>
        )}
      </div>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'delete' ? L('حذف الخطة؟', 'Delete plan?') : confirm === 'archive' ? L('أرشفة الخطة؟', 'Archive plan?') : L('إكمال الخطة؟', 'Complete plan?')}>
        <p className="text-muted">
          {confirm === 'delete'
            ? L('ستُحذف الخطة وسجلّها. تقدّمك في الحفظ والمراجعة لا يُحذف.', 'The plan and its log are removed. Your memorisation progress is kept.')
            : confirm === 'archive'
              ? L('تختفي من خططك النشطة، ويمكنك إعادتها لاحقًا.', 'It leaves your active plans; you can bring it back later.')
              : L('ستنتقل إلى الخطط المكتملة.', 'It moves to completed plans.')}
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            className={`flex-1 ${confirm === 'delete' ? 'bg-clay' : ''}`}
            onClick={() => {
              if (confirm === 'delete') {
                act((x) => ({ ...x, plans: x.plans.filter((y) => y.id !== pl.id), primaryPlanId: x.primaryPlanId === pl.id ? null : x.primaryPlanId }))
                navigate('/plan')
              } else act((x) => setStatus(x, pl.id, confirm === 'archive' ? 'archived' : 'completed'))
              setConfirm(null)
            }}
          >
            {L('تأكيد', 'Confirm')}
          </Button>
          <Button variant="outline" onClick={() => setConfirm(null)}>
            {L('إلغاء', 'Cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

/** Khatam-style header for reading / khatmah / custom plans. */
function KhatamHero({ p, pl }: { p: Profile; pl: QPlan }) {
  const { L, N } = useL()
  const f = useFmt()
  const pr = planProgress(p, pl)
  const g0 = gIndex(...pl.start)
  const endPos: Pos | null = pr.done === 0 ? null : pl.unit === 'page' ? (gIndex(...pageEnd(pageOf(...pl.start) + pr.done - 1)) > gIndex(...pl.end) ? pl.end : pageEnd(pageOf(...pl.start) + pr.done - 1)) : fromGIndex(g0 + pr.done - 1)
  const ayatDone = endPos ? gIndex(...endPos) - g0 + 1 : 0
  const ayatTotal = gIndex(...pl.end) - g0 + 1
  const juzTotal = JUZ.filter((st, k) => gIndex(...st) >= g0 && gIndex(...juzEnd(k + 1)) <= gIndex(...pl.end)).length
  const juzDone = endPos ? JUZ.filter((st, k) => gIndex(...st) >= g0 && gIndex(...juzEnd(k + 1)) <= gIndex(...endPos)).length : 0
  const ratio = pr.done / Math.max(1, pr.total)
  return (
    <section className="hero-fade -mx-5 px-5 pb-8 pt-5 text-white md:mx-0 md:rounded-[28px] md:px-8">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-white/85">
        <Icon name="calendar" size={14} />
        {L(`البداية ${f.date(pl.startedAt)}`, `Started ${f.date(pl.startedAt)}`)}
      </span>
      <div className="mt-2 flex items-center gap-3">
        <h2 className="min-w-0 flex-1 text-[1.75rem] font-bold leading-[1.3]">
          {pr.done >= pr.total ? L('ما شاء الله، أتممت الخطة!', 'Masha’Allah, plan complete!') : pl.kind === 'khatmah' ? L('واصل همّتك حتى تختم!', 'Keep up the spirit for your completion!') : L('واصل وردك اليومي', 'Keep up your daily reading')}
        </h2>
        <OpenQuranArt size={140} className="shrink-0 drop-shadow-[0_18px_22px_rgba(0,0,0,.18)]" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(1, ratio * 100)}%` }} />
        </div>
        <span className="text-[12px] tabular-nums text-white/85">{N(Math.round(ratio * 100))}٪</span>
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-white/80">
        <span>{L(`${N(juzDone)}/${N(juzTotal || 1)} جزء مكتمل`, `${juzDone}/${juzTotal || 1} juz completed`)}</span>
        <span>{L(`${N(ayatDone)}/${N(ayatTotal || TOTAL_AYAT)} آية`, `${ayatDone}/${ayatTotal || TOTAL_AYAT} verses completed`)}</span>
      </div>
    </section>
  )
}

function Stat({ icon, v, l, tone = '' }: { icon: string; v: string; l: string; tone?: string }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] bg-card px-2 py-4 text-center ring-1 ring-line">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-gold">
        <Icon name={icon} size={19} />
      </span>
      <span className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>{v}</span>
      <span className="text-[12px] text-muted">{l}</span>
    </div>
  )
}

function Line({ icon, l, v, warn }: { icon: string; l: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon name={icon} size={19} className="text-gold" />
      <span className="flex-1 text-muted">{l}</span>
      <span className={`font-semibold ${warn ? 'text-clay' : ''}`}>{v}</span>
    </div>
  )
}

// ---------------------------------------------------------------- Editor

type Scope = 'whole' | 'surah' | 'juz' | 'range'

export function PlanEditor({ id, kind: kindParam }: { id?: string; kind?: string }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const f = useFmt()
  const editing = id ? p.plans.find((x) => x.id === id) : undefined
  const initKind = (editing?.kind ?? (PLAN_KINDS.some((k) => k.kind === kindParam) ? kindParam : undefined)) as PlanKind | undefined
  const [kind, setKind] = useState<PlanKind | undefined>(initKind)
  const defaults = (k: PlanKind): Partial<QPlan> =>
    k === 'hifz' ? { start: [114, 1], end: [114, 6], daily: p.dailyAyat, unit: 'ayah' } : k === 'revision' ? { start: WHOLE[0], end: WHOLE[1], daily: 15, unit: 'ayah' } : k === 'khatmah' ? { start: WHOLE[0], end: WHOLE[1], daily: 20, unit: 'page', targetDate: addDays(today(), 29) } : k === 'reading' ? { start: WHOLE[0], end: WHOLE[1], daily: 4, unit: 'page' } : { start: [67, 1], end: [67, 30], daily: 5, unit: 'ayah' }
  const [draft, setDraft] = useState<QPlan>(() => editing ?? newPlan({ kind: initKind ?? 'hifz', ...defaults(initKind ?? 'hifz') }))
  const [scope, setScope] = useState<Scope>(() => guessScope(draft))
  const [mode, setMode] = useState<'daily' | 'deadline'>(draft.targetDate ? 'deadline' : 'daily')
  const [readUnit, setReadUnit] = useState<'page' | 'juz'>(draft.kind === 'reading' && draft.daily % 20 === 0 ? 'juz' : 'page')
  const [primary, setPrimary] = useState(!editing && !activePlans(p).length)
  const set = (patch: Partial<QPlan>) => setDraft((d) => ({ ...d, ...patch }))

  const pickKind = (k: PlanKind) => {
    setKind(k)
    const d = newPlan({ kind: k, ...defaults(k) })
    setDraft(d)
    setScope(guessScope(d))
    setMode(d.targetDate ? 'deadline' : 'daily')
  }

  const total = totalUnits(draft)
  const pr = editing ? planProgress(p, draft) : null
  const remainingUnits = draft.kind === 'revision' ? 0 : Math.max(1, total - (draft.kind === 'hifz' ? planProgress(p, draft).done : draft.done))
  // Deadline mode derives the daily load from the remaining work.
  const effective: QPlan = useMemo(() => (mode === 'deadline' && draft.targetDate && draft.kind !== 'revision' ? { ...draft, daily: dailyFor(remainingUnits, draft.targetDate, draft.days.length ? draft.days : ALL_DAYS) } : draft), [draft, mode, remainingUnits])
  const fc = forecast(p, { ...effective, status: 'active' })
  const valid = !!kind && draft.days.length > 0 && total > 0 && effective.daily > 0

  if (!kind)
    return (
      <div className="mx-auto max-w-3xl">
        <ScreenHeader title={L('خطة جديدة', 'New plan')} subtitle={L('ما نوع الخطة؟', 'What kind of plan?')} backTo="#/plan" />
        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_KINDS.map((k) => (
            <Card key={k.kind} onClick={() => pickKind(k.kind)} className="p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                <Icon name={k.icon} />
              </span>
              <span className="mt-3 block text-[17px] font-bold">{L(k.ar, k.en)}</span>
              <span className="mt-0.5 block text-sm text-muted">{L(k.dAr, k.dEn)}</span>
            </Card>
          ))}
        </div>
      </div>
    )

  const km = kindMeta(kind)
  const save = () => {
    const final: QPlan = { ...effective, targetDate: mode === 'deadline' ? effective.targetDate : null, kind, done: Math.min(effective.done, totalUnits(effective)) }
    updateActive((x) => {
      if (editing) {
        const y = patchPlan(x, final.id, () => final)
        return primary ? { ...y, primaryPlanId: final.id } : y
      }
      return addPlan(x, final, primary)
    })
    navigate(`/plan/${final.id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <ScreenHeader title={editing ? L('تعديل الخطة', 'Edit plan') : L(km.ar, km.en)} subtitle={L(km.dAr, km.dEn)} backTo={editing ? `#/plan/${editing.id}` : '#/plan/new'} />

      {/* Target */}
      {kind !== 'khatmah' && (
        <Step n={1} title={kind === 'revision' ? L('ماذا تراجع؟', 'What to revise') : L('الهدف', 'Target')}>
          <Segmented
            value={scope}
            onChange={(v) => {
              setScope(v)
              if (v === 'whole') set({ start: WHOLE[0], end: WHOLE[1] })
              if (v === 'surah') set({ start: [draft.start[0], 1], end: [draft.start[0], surah(draft.start[0]).ayat] })
              if (v === 'juz') set({ start: JUZ[29], end: juzEnd(30) })
            }}
            options={[
              ...(kind === 'revision' || kind === 'reading' || kind === 'custom' ? [{ value: 'whole' as Scope, label: kind === 'revision' ? L('كل محفوظاتي', 'All I know') : L('القرآن كاملًا', 'Whole Quran') }] : []),
              { value: 'surah', label: L('سورة', 'Surah') },
              { value: 'juz', label: L('جزء', 'Juz') },
              { value: 'range', label: L('نطاق', 'Range') },
            ]}
          />
          <div className="mt-4">
            {scope === 'surah' && (
              <select value={draft.start[0]} onChange={(e) => { const s = Number(e.target.value); set({ start: [s, 1], end: [s, surah(s).ayat] }) }} className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none">
                {SURAHS.map((x) => (
                  <option key={x.n} value={x.n}>{lang === 'ar' ? `${N(x.n)}. ${x.ar} · ${N(x.ayat)} آية` : `${x.n}. ${x.en} · ${x.ayat} ayat`}</option>
                ))}
              </select>
            )}
            {scope === 'juz' && (
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                {JUZ.map((st, i) => {
                  const on = draft.start[0] === st[0] && draft.start[1] === st[1] && draft.end.join() === juzEnd(i + 1).join()
                  return (
                    <button key={i} type="button" onClick={() => set({ start: st, end: juzEnd(i + 1) })} className={`rounded-xl py-2.5 text-[15px] font-bold ring-1 ${on ? 'bg-gold text-white ring-transparent' : 'bg-card ring-line hover:ring-gold/50'}`}>
                      {N(i + 1)}
                    </button>
                  )
                })}
              </div>
            )}
            {scope === 'range' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <PosPicker label={L('من', 'From')} value={draft.start} onChange={(v) => set({ start: v, end: cmp(v, draft.end) > 0 ? v : draft.end })} />
                <PosPicker label={L('إلى', 'To')} value={draft.end} onChange={(v) => set({ end: cmp(v, draft.start) < 0 ? draft.start : v })} />
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            {rangeText(draft.start, draft.end, lang, N)} · {kind === 'revision' ? L(`${N(planProgress(p, draft).total)} آية محفوظة فيه`, `${planProgress(p, draft).total} known ayat`) : unitLabel(draft.unit, total, lang, N)}
            {kind === 'hifz' && pr == null && planProgress(p, draft).done > 0 && L(` · تحفظ منها ${N(planProgress(p, draft).done)}`, ` · you know ${planProgress(p, draft).done}`)}
          </p>
        </Step>
      )}

      {kind === 'custom' && (
        <Step n={2} title={L('وحدة القياس', 'Unit')}>
          <Segmented<Unit>
            value={draft.unit}
            onChange={(u) => set({ unit: u, daily: u === 'page' ? 2 : 5, done: 0 })}
            options={[
              { value: 'ayah', label: L('آيات', 'Ayat') },
              { value: 'page', label: L('صفحات', 'Pages') },
            ]}
          />
        </Step>
      )}

      {/* Workload */}
      <Step n={kind === 'khatmah' ? 1 : kind === 'custom' ? 3 : 2} title={L('الحمل اليومي', 'Daily workload')}>
        {kind !== 'revision' && (
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m)
              if (m === 'deadline' && !draft.targetDate) set({ targetDate: addDays(today(), kind === 'khatmah' ? 29 : 59) })
            }}
            options={[
              { value: 'daily', label: L('حدّد الحمل اليومي', 'Set daily load') },
              { value: 'deadline', label: L('حدّد تاريخ الإتمام', 'Set a finish date') },
            ]}
          />
        )}
        {mode === 'daily' || kind === 'revision' ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">{kind === 'revision' ? L('حدّ أقصى للآيات يوميًا', 'Max ayat per day') : L('كل يوم دراسة', 'Each study day')}</span>
            <div className="flex items-center gap-2">
              {kind === 'reading' && (
                <Segmented
                  value={readUnit}
                  onChange={(u) => {
                    setReadUnit(u)
                    set({ daily: u === 'juz' ? 20 : 4 })
                  }}
                  options={[
                    { value: 'page', label: L('صفحات', 'Pages') },
                    { value: 'juz', label: L('أجزاء', 'Juz') },
                  ]}
                />
              )}
              {kind === 'reading' && readUnit === 'juz' ? (
                <Stepper value={draft.daily / 20} min={1} max={10} onChange={(v) => set({ daily: v * 20 })} format={(n) => L(`${N(n)} جزء`, `${n} juz`)} />
              ) : (
                <Stepper value={draft.daily} min={1} max={draft.unit === 'page' ? 120 : 60} onChange={(v) => set({ daily: v })} format={(n) => unitLabel(draft.unit, n, lang, N)} />
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(kind === 'khatmah' ? [29, 59, 89, 179, 364] : [29, 59, 89, 179]).map((d) => (
                <button key={d} type="button" onClick={() => set({ targetDate: addDays(today(), d) })} className={`rounded-full px-3.5 py-2 text-sm ring-1 ${draft.targetDate === addDays(today(), d) ? 'bg-gold text-white ring-transparent' : 'bg-card ring-line'}`}>
                  {d === 29 ? L('٣٠ يومًا', '30 days') : d === 59 ? L('شهران', '2 months') : d === 89 ? L('٣ أشهر', '3 months') : d === 179 ? L('٦ أشهر', '6 months') : L('سنة', '1 year')}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{L('أو اختر تاريخًا', 'Or pick a date')}</span>
              <input type="date" min={addDays(today(), 1)} value={draft.targetDate ?? ''} onChange={(e) => e.target.value && set({ targetDate: e.target.value })} className="h-11 rounded-2xl bg-card px-3 ring-1 ring-line outline-none" />
            </label>
            <p className="rounded-2xl bg-gold-soft/60 p-4 text-[15px]">
              {L('تحتاج ', 'You need ')}
              <b>{unitLabel(draft.unit, effective.daily, lang, N)}</b>
              {L(' في كل يوم دراسة', ' per study day')}
              {draft.unit === 'page' && L(` · نحو ${N(Math.round(effective.daily * 2.5))} دقيقة`, ` · about ${Math.round(effective.daily * 2.5)} min`)}
            </p>
          </div>
        )}
      </Step>

      {/* Study days */}
      <Step n={kind === 'khatmah' ? 2 : kind === 'custom' ? 4 : 3} title={L('أيام الدراسة', 'Study days')}>
        <div className="flex flex-wrap gap-2">
          {weekOrder(lang).map((d) => {
            const on = draft.days.includes(d)
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => set({ days: on ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort() })} className={`h-11 min-w-[3.4rem] rounded-full px-3 text-sm font-medium ring-1 transition ${on ? 'bg-night text-parchment ring-transparent' : 'bg-card text-muted ring-line'}`}>
                {lang === 'ar' ? DAY_AR_SHORT[d] : DAY_EN_SHORT[d]}
              </button>
            )
          })}
        </div>
        {draft.days.length === 0 && <p className="mt-2 text-sm text-clay">{L('اختر يومًا واحدًا على الأقل.', 'Pick at least one day.')}</p>}
        {draft.days.length > 0 && draft.days.length < 7 && <p className="mt-2 text-sm text-muted">{L(`${N(7 - draft.days.length)} أيام راحة في الأسبوع`, `${7 - draft.days.length} rest days a week`)}</p>}
      </Step>

      {/* Preview */}
      <Card className="space-y-4 p-5">
        <p className="font-semibold">{L('معاينة', 'Preview')}</p>
        <WeekStrip p={p} pl={{ ...effective, status: 'active' }} />
        {kind !== 'revision' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-night/[0.04] p-4">
            <span className="text-sm text-muted">{L('الإتمام المتوقّع', 'Estimated completion')}</span>
            <span className="font-bold">{fc.finish ? f.date(fc.finish) : '—'}</span>
          </div>
        ) : (
          <p className="text-sm text-muted">{L('تُرتّب المراجعة اليومية بحسب الاستحقاق (الأقدم أولًا) ضمن الحدّ الذي اخترته.', 'Each day’s revision is ordered by due date (oldest first) within your limit.')}</p>
        )}
      </Card>

      <Card className="divide-y divide-line">
        <label className="flex items-center gap-3 p-4">
          <span className="flex-1">
            <span className="block font-medium">{L('اسم الخطة (اختياري)', 'Plan name (optional)')}</span>
          </span>
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder={rangeText(draft.start, draft.end, lang, N)} className="h-11 w-48 rounded-2xl bg-parchment px-3 ring-1 ring-line outline-none sm:w-64" />
        </label>
        {(!editing || primaryPlan(p)?.id !== editing.id) && (
          <label className="flex cursor-pointer items-center gap-3 p-4">
            <span className="flex-1 font-medium">{L('اجعلها خطتي الأساسية', 'Make this my primary plan')}</span>
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
          </label>
        )}
      </Card>

      <Button size="lg" className="w-full" disabled={!valid} onClick={save}>
        <Icon name="check" size={18} />
        {editing ? L('حفظ التعديلات', 'Save changes') : L('أنشئ الخطة', 'Create plan')}
      </Button>
    </div>
  )
}

const cmp = (a: Pos, b: Pos) => a[0] - b[0] || a[1] - b[1]

function guessScope(d: QPlan): Scope {
  if (d.start.join() === WHOLE[0].join() && d.end.join() === WHOLE[1].join()) return d.kind === 'hifz' ? 'range' : 'whole'
  if (d.start[0] === d.end[0] && d.start[1] === 1 && d.end[1] === surah(d.end[0]).ayat) return 'surah'
  const j = JUZ.findIndex((x) => x.join() === d.start.join())
  if (j >= 0 && juzEnd(j + 1).join() === d.end.join()) return 'juz'
  return 'range'
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const { N } = useL()
  return (
    <Card className="p-5">
      <p className="mb-4 flex items-center gap-2.5 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-soft text-sm font-bold text-gold">{N(n)}</span>
        {title}
      </p>
      {children}
    </Card>
  )
}

function PosPicker({ label, value, onChange }: { label: string; value: Pos; onChange: (v: Pos) => void }) {
  const { L, N, lang } = useL()
  return (
    <div>
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <div className="flex gap-2">
        <select value={value[0]} onChange={(e) => onChange([Number(e.target.value), 1])} className="h-12 min-w-0 flex-1 rounded-2xl bg-card px-3 ring-1 ring-line outline-none">
          {SURAHS.map((x) => (
            <option key={x.n} value={x.n}>{lang === 'ar' ? `${N(x.n)}. ${x.ar}` : `${x.n}. ${x.en}`}</option>
          ))}
        </select>
        <input type="number" inputMode="numeric" aria-label={L('الآية', 'Ayah')} min={1} max={surah(value[0]).ayat} value={value[1]} onChange={(e) => onChange([value[0], Math.max(1, Math.min(surah(value[0]).ayat, Number(e.target.value) || 1))])} className="h-12 w-20 rounded-2xl bg-card px-3 tabular-nums ring-1 ring-line outline-none" />
      </div>
    </div>
  )
}

function KnownSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useL()
  const [r, setR] = useState<Range>({ s: 1, from: 1, to: 7 })
  return (
    <Sheet open={open} onClose={onClose} title={L('أضف ما تحفظه مسبقًا', 'Add what you already know')}>
      <p className="mb-4 text-sm text-muted">{L('ستدخل هذه الآيات جدول المراجعة موزّعة على الأسبوع القادم.', 'These ayat will enter revision, spread over the coming week.')}</p>
      <RangePicker value={r} onChange={setR} />
      <button type="button" className="mt-3 rounded-full bg-night/5 px-3 py-1.5 text-xs" onClick={() => setR({ ...r, from: 1, to: surah(r.s).ayat })}>
        {L('السورة كاملة', 'Whole surah')}
      </button>
      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={() => {
          updateActive((x) => addKnown(x, r.s, r.from, r.to))
          onClose()
        }}
      >
        {L('أضف إلى محفوظاتي', 'Add to what I know')}
      </Button>
    </Sheet>
  )
}
