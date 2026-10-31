import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Bar, Button, ProgressRing } from './ui'
import { useL } from '../lib/i18n'
import { forecast, isStudyDay, kindMeta, planProgress, rangeText, todayTask, unitLabel, type QPlan } from '../lib/plans'
import { surah } from '../lib/quran'
import { today } from '../lib/date'
import type { Profile } from '../lib/store'

export const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
export const DAY_AR_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
export const DAY_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Week order: Saturday first in Arabic, Sunday first in English. */
export const weekOrder = (lang: string) => (lang === 'ar' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6])

export function useFmt() {
  const { lang, N } = useL()
  const loc = lang === 'ar' ? 'ar-EG' : 'en-GB'
  return {
    date: (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }),
    short: (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'short' }),
    wd: (iso: string) => {
      const d = new Date(`${iso}T12:00:00`).getDay()
      return lang === 'ar' ? DAY_AR_SHORT[d] : DAY_EN_SHORT[d]
    },
    N,
  }
}

export const planTitle = (pl: QPlan, lang: string, N: (n: number) => string) => pl.name.trim() || (pl.kind === 'khatmah' ? (lang === 'ar' ? 'ختمة القرآن' : 'Khatmah') : rangeText(pl.start, pl.end, lang, N))

export function KindBadge({ pl, light = false }: { pl: QPlan; light?: boolean }) {
  const { L } = useL()
  const k = kindMeta(pl.kind)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${light ? 'bg-white/15 text-white' : 'bg-gold-soft/70 text-gold'}`}>
      <Icon name={k.icon} size={14} />
      {L(k.ar, k.en)}
    </span>
  )
}

export function StatusPill({ pl }: { pl: QPlan }) {
  const { L } = useL()
  if (pl.status === 'active') return null
  const m = { paused: ['bg-night/5 text-muted', L('متوقفة مؤقتًا', 'Paused')], completed: ['bg-leaf/10 text-leaf', L('مكتملة', 'Completed')], archived: ['bg-night/5 text-muted', L('مؤرشفة', 'Archived')] }[pl.status]
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${m[0]}`}>{m[1]}</span>
}

/** The single next action this plan asks for today. */
export function TodayAction({ p, pl, size = 'md', light = false }: { p: Profile; pl: QPlan; size?: 'md' | 'lg'; light?: boolean }) {
  const { L, N, lang } = useL()
  const t = todayTask(p, pl)
  const pr = planProgress(p, pl)
  const muted = light ? 'text-white/80' : 'text-muted'
  if (pl.status === 'paused') return <p className={`text-sm ${muted}`}>{L('الخطة متوقفة مؤقتًا', 'This plan is paused')}</p>
  if (pl.status !== 'active') return null
  if (!t) {
    const finished = pl.kind !== 'revision' && pr.done >= pr.total
    const rest = !isStudyDay(pl, today())
    return (
      <p className={`flex items-center gap-2 text-sm ${muted}`}>
        <Icon name={finished || !rest ? 'check' : 'clock'} size={17} />
        {finished ? L('اكتملت الخطة. ما شاء الله!', 'Plan complete. Masha’Allah!') : rest ? L('يوم راحة في هذه الخطة', 'Rest day for this plan') : pl.kind === 'revision' && !pr.today ? L('لا مراجعة مستحقّة اليوم', 'Nothing due today') : L('أتممت ورد اليوم', 'Today’s portion is done')}
      </p>
    )
  }
  const v = light ? 'light' : 'primary'
  const cls = ''
  if (t.kind === 'hifz')
    return (
      <Button size={size} variant={v} className={cls} href={`#/memorize?s=${t.s}&from=${t.from}&to=${t.to}`}>
        <Icon name="play" size={16} fill />
        {L(`احفظ ${lang === 'ar' ? surah(t.s).ar : ''} ${N(t.from)}${t.to > t.from ? `–${N(t.to)}` : ''}`, `Memorise ${surah(t.s).en} ${t.from}${t.to > t.from ? `–${t.to}` : ''}`)}
      </Button>
    )
  if (t.kind === 'revision')
    return (
      <Button size={size} variant={v} className={cls} href={`#/revise?plan=${pl.id}`}>
        <Icon name="repeat" size={16} />
        {L(`راجع ${unitLabel('ayah', t.ayat.length, lang, N)}`, `Revise ${unitLabel('ayah', t.ayat.length, lang, N)}`)}
      </Button>
    )
  return (
    <Button size={size} variant={v} className={cls} href={`#/surah/${t.span[0][0]}?a=${t.span[0][1]}&plan=${pl.id}`}>
      <Icon name="book" size={16} />
      {pl.unit === 'page' ? L(`اقرأ ${t.to > t.from ? `الصفحات ${N(t.from)}–${N(t.to)}` : `الصفحة ${N(t.from)}`}`, `Read ${t.to > t.from ? `pages ${t.from}–${t.to}` : `page ${t.from}`}`) : L(`اقرأ ${unitLabel('ayah', t.to - t.from + 1, lang, N)}`, `Read ${unitLabel('ayah', t.to - t.from + 1, lang, N)}`)}
    </Button>
  )
}

export function WeekStrip({ p, pl }: { p: Profile; pl: QPlan }) {
  const { L, lang } = useL()
  const f = useFmt()
  const { week } = forecast(p, pl, 7)
  return (
    <div className="grid grid-cols-7 gap-1.5" role="list" aria-label={L('جدول الأسبوع', 'Weekly schedule')}>
      {week.map((d, i) => (
        <div key={d.date} role="listitem" className={`flex flex-col items-center rounded-2xl px-1 py-2.5 text-center ${i === 0 ? 'bg-night text-parchment' : d.study ? 'bg-card ring-1 ring-line' : 'bg-night/[0.03] text-muted'}`}>
          <span className="text-[11px] opacity-80">{i === 0 ? L('اليوم', 'Today') : f.wd(d.date)}</span>
          <span className="mt-1 text-[15px] font-bold tabular-nums">{d.study ? (d.units ? f.N(d.units) : '✓') : '–'}</span>
          <span className="text-[10px] opacity-70">{d.study ? (pl.unit === 'page' ? L('ص', 'pg') : L('آية', 'ay')) : L('راحة', 'rest')}</span>
        </div>
      ))}
    </div>
  )
}

export function PlanCard({ p, pl, primary, action }: { p: Profile; pl: QPlan; primary?: boolean; action?: ReactNode }) {
  const { L, N, lang } = useL()
  const f = useFmt()
  const pr = planProgress(p, pl)
  const fc = forecast(p, pl, 1)
  const ratio = pl.kind === 'revision' ? (pr.total ? 1 - (pr.due ?? 0) / pr.total : 0) : pr.done / Math.max(1, pr.total)
  return (
    <div className="rounded-[24px] bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)] ring-1 ring-line">
      <a href={`#/plan/${pl.id}`} className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge pl={pl} />
            {primary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-night px-2.5 py-1 text-[11px] font-medium text-parchment">
                <Icon name="star" size={12} fill />
                {L('الأساسية', 'Primary')}
              </span>
            )}
            <StatusPill pl={pl} />
          </div>
          <p className="mt-2.5 truncate text-[17px] font-bold">{planTitle(pl, lang, N)}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {pl.kind === 'revision'
              ? L(`${N(pr.total)} آية محفوظة · ${N(pr.due ?? 0)} مستحقّة${pr.overdue ? ` · ${N(pr.overdue)} متأخرة` : ''}`, `${pr.total} known · ${pr.due ?? 0} due${pr.overdue ? ` · ${pr.overdue} overdue` : ''}`)
              : `${unitLabel(pl.unit, pr.done, lang, N)} ${L('من', 'of')} ${N(pr.total)} · ${L('يوميًا', 'daily')} ${N(pl.daily)}${fc.finish && pl.status === 'active' ? ` · ${L('الإتمام', 'done by')} ${f.short(fc.finish)}` : ''}`}
          </p>
        </div>
        <ProgressRing value={ratio} size={54} stroke={5}>
          <span className="text-[12px] font-bold tabular-nums">{N(Math.round(ratio * 100))}٪</span>
        </ProgressRing>
      </a>
      {pl.kind !== 'revision' && <Bar value={ratio} className="mt-4 h-1.5" tone="bg-gold" />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <TodayAction p={p} pl={pl} />
        {action}
      </div>
    </div>
  )
}
