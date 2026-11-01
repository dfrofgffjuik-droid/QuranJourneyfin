// رحلتك اليوم — unified home dashboard (design preview).
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { MushafCtx } from './mushaf'
import { navTo } from '../../mushaf/page'
import { Chrome, Demo, Icon, toAr, useDevice, useProto } from '../core'
import { collection, timeOfDay } from '../azkar/catalog'
import { progressOf, todaySummary, useAzkar } from '../azkar/store'
const azkarTitle = (id: string) => collection(id)?.ar ?? 'أذكار'
import { fromGIndex, loadMushaf, pageOf, surah } from '../../../lib/quran'
import { ACHIEVEMENTS, ACTIVITY_AR, PHASE_AR, derived, fmtDate, rangeAr, taskProgress, unitAr, usePreview, weekTasks } from '../progress'
import { useSession } from '../session'
import { DataBar } from '../previewUi'
import { useStartTask } from '../taskNav'
import { IsoQuranBook } from '../quranBook'

function useAyahOfDay() {
  const d = new Date()
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5)
  const [s, a] = fromGIndex(((day * 131) % 6236) + 1)
  const [t, setT] = useState<{ text: string; hafs: boolean } | null>(null)
  useEffect(() => {
    loadMushaf(s).then((r) => setT({ text: r.ayat[a - 1], hafs: r.hafs }))
  }, [s, a])
  return { s, a, t }
}

function Ring({ v, color, size = 64, children }: { v: number; color: string; size?: number; children: ReactNode }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} /></svg>
      {children}
    </span>
  )
}

export function HomeDashboard() {
  const device = useDevice()
  const { go } = useProto()
  const mushaf = useContext(MushafCtx)
  const st = usePreview()
  const pd = derived(st)
  const start = useStartTask()
  const today = weekTasks(st).find((x) => x.today)!
  const tasks = today.tasks.filter((t) => t.state !== 'paused')
  const qDone = tasks.filter((t) => t.state === 'done').length
  const qTotal = tasks.length
  const now = timeOfDay()
  const az = useAzkar()
  const azNow = progressOf(az, now)
  const azOther = progressOf(az, now === 'morning' ? 'evening' : 'morning')
  const azSum = todaySummary(az)
  const aod = useAyahOfDay()
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const h = new Date().getHours()
  // No profile name exists in the preview, so the greeting never assumes one.
  const greet = h < 12 ? 'صباح الخير' : h < 18 ? 'طاب يومك' : 'مساء الخير'
  const ses = useSession()
  const reflections = Object.values(ses.s.notes).filter((x) => x.trim()).length
  const desk = device === 'desktop'
  // One "continue reading" target for the hero book and the Quran card: the page after the last recorded reading.
  const continuePg = pd.lastReading ? (pd.lastReading.unit === 'page' ? Math.min(604, pd.lastReading.to + 1) : pageOf(...fromGIndex(pd.lastReading.g1))) : mushaf.s.nav.pg
  const continueReading = () => (mushaf.set({ stage: 'reader', nav: navTo(continuePg) }), go('mushaf'))
  const bookState = qTotal === 0 ? 'rest' : qDone === qTotal ? 'done' : 'open'
  const bookLabel = `مصحف مفتوح على حامل. ${qTotal ? `أُنجز ${toAr(qDone)} من ${toAr(qTotal)} من مهام اليوم، وتضيء الأسطر بقدر ما أُنجز.` : 'لا مهام اليوم.'} اضغط لمتابعة القراءة من الصفحة ${toAr(continuePg)}.`

  const journeys = [
    { id: 'quran', title: 'رحلة القرآن', icon: 'book', v: qTotal ? qDone / qTotal : 0, label: qTotal ? `${toAr(qDone)} من ${toAr(qTotal)}` : 'يوم راحة', color: 'var(--color-leaf)', go: () => go('ayah') },
    { id: 'azkar', title: 'رحلة الأذكار', icon: now === 'morning' ? 'sun' : 'moon', v: azNow.total ? azNow.done / azNow.total : 0, label: `${toAr(azNow.done)} من ${toAr(azNow.total)}`, color: 'var(--color-gold)', go: () => go('azkar-list', now) },
    { id: 'tadabbur', title: 'رحلة التدبّر', icon: 'sparkle', v: reflections ? 1 : 0, label: reflections ? `${toAr(reflections)} ${reflections >= 3 && reflections <= 10 ? 'تأمّلات' : 'تأمّل'}` : 'لم تبدأ', color: 'var(--color-sky)', go: () => go('ayah') },
  ]

  const hero = (
    <header className={`hero-fade relative text-white ${desk ? 'rounded-[32px] px-10 pb-28 pt-8' : 'px-5 pb-24 pt-14'}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] backdrop-blur"><Icon name="calendar" size={14} />{hijri}</span>
        <span className="ms-auto rounded-full bg-white/90 text-night"><DataBar compact /></span>
      </div>
      {/* Same composition as the reference: copy on the left, the live Mushaf on the right, progress underneath. */}
      <div className="mt-4 flex items-center gap-3" dir="ltr">
        <div className="min-w-0 flex-1" dir="rtl">
          <p className="text-[15px] text-white/80" data-greeting>{greet}، أهلًا بك</p>
          <h1 className={`mt-1.5 font-bold leading-[1.3] ${desk ? 'text-[2.2rem]' : 'text-[1.6rem]'}`}>رحلتك اليوم</h1>
          <p className="mt-1 text-[14px] leading-relaxed text-white/80">ثلاث خطوات هادئة: قرآن، وذكر، وتدبّر.</p>
        </div>
        {/* Live Mushaf: lines light with today's completed tasks; opens the reader where you left off. */}
        <IsoQuranBook progress={qTotal ? qDone / qTotal : 0} state={bookState} onOpen={continueReading} label={bookLabel} className={`shrink-0 drop-shadow-[0_18px_22px_rgba(0,0,0,.2)] ${desk ? 'w-[240px]' : 'w-[165px]'}`} />
      </div>
      <div className="mt-4" data-hero-progress>
        <div className="flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuemin={0} aria-valuemax={6236} aria-valuenow={pd.memCount} aria-label="الآيات المحفوظة من القرآن">
            <span className="block h-full rounded-full bg-white" style={{ width: `${Math.max(pd.memCount ? 1 : 0, (pd.memCount / 6236) * 100)}%` }} />
          </span>
          <span className="text-[12px] tabular-nums text-white/85">{toAr(Math.round((pd.memCount / 6236) * 100))}٪</span>
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] text-white/80">
          <span>{toAr(pd.juz.filter((j) => j.status === 'done').length)}/٣٠ جزءًا مكتملًا</span>
          <span>{toAr(pd.memCount)}/{toAr(6236)} آية محفوظة</span>
        </div>
      </div>
    </header>
  )

  const trio = (
    <div className={`relative z-10 grid grid-cols-3 gap-2 rounded-[28px] bg-card p-3 shadow-[0_24px_50px_-28px_rgba(16,24,40,.5)] ring-1 ring-line ${desk ? '-mt-20 mx-6' : '-mt-16 mx-5'}`}>
      {journeys.map((j) => (
        <button key={j.id} type="button" onClick={j.go} className="press flex flex-col items-center gap-2 rounded-[20px] px-1 py-3 hover:bg-night/[.03]">
          <Ring v={j.v} color={j.color} size={desk ? 72 : 60}><Icon name={j.icon} size={desk ? 24 : 20} /></Ring>
          <span className="text-[13px] font-semibold">{j.title}</span>
          <span className="text-[11.5px] text-muted">{j.label}</span>
        </button>
      ))}
    </div>
  )

  const quranCard = (
    <Card title="رحلة القرآن" icon="book" action={<span className="flex gap-3"><Link onClick={() => go('plans')}>خططي</Link><Link onClick={() => go('week')}>خطة الأسبوع</Link></span>}>
      <ul className="space-y-3" data-home-tasks>
        {st.plans.length === 0 && <li className="text-[13px] text-muted">لا توجد خطط بعد. <button type="button" onClick={() => go('plans', 'new')} className="font-semibold text-gold underline">أنشئ خطتك الأولى</button></li>}
        {st.plans.length > 0 && tasks.length === 0 && <li className="text-[13px] text-muted">اليوم يوم راحة في خططك.</li>}
        {tasks.map((t) => {
          const done = t.state === 'done'
          const ph = taskProgress(st, t)
          return (
            <li key={t.id} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-leaf/12 text-leaf' : 'bg-gold-soft text-gold'}`}><Icon name={done ? 'check' : t.activity === 'hifz' ? 'sprout' : t.activity === 'revision' ? 'repeat' : 'book'} size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{ACTIVITY_AR[t.activity]} · <span className="text-muted">{t.plan.name}</span></p>
                <p className="text-[12px] text-muted">{t.from != null ? `${rangeAr(t.unit, t.from, t.to!)} · ${toAr(t.to! - t.from + 1)} ${unitAr(t.unit, t.to! - t.from + 1)}` : ''} · {PHASE_AR[ph.phase]}{ph.phase === 'progress' && ph.total > 1 ? ` ${toAr(ph.done)}/${toAr(ph.total)}` : ''}</p>
              </div>
              {t.state === 'open' && <button type="button" onClick={() => start(t)} className="press h-8 rounded-full bg-night px-3 text-[12px] font-semibold text-parchment">{ph.phase === 'progress' ? 'تابع' : 'ابدأ'}</button>}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go('ayah')} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-night text-[13px] font-semibold text-parchment"><Icon name="sprout" size={16} />تابع الحفظ</button>
        <button type="button" onClick={continueReading} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-gold-soft text-[13px] font-semibold"><Icon name="book" size={16} />تابع القراءة في المصحف</button>
      </div>
      <p className="mt-3 text-[11.5px] text-muted">{pd.lastReading ? `آخر قراءة مسجّلة: ${rangeAr(pd.lastReading.unit, pd.lastReading.from, pd.lastReading.to)} · ${fmtDate(pd.lastReading.at.slice(0, 10))}${pd.lastReading.source === 'demo' ? ' (تجريبي)' : ''}` : 'لا قراءة مسجّلة بعد.'}</p>
    </Card>
  )

  const azkarCard = (
    <Card title="أذكار اليوم" icon={now === 'morning' ? 'sun' : 'moon'} action={<Link onClick={() => go('azkar')}>أذكاري</Link>}>
      <button type="button" onClick={() => go('azkar-list', now)} className="press flex w-full items-center gap-3 rounded-[18px] bg-gold-soft/50 p-3.5 text-start" data-home-azkar>
        <Ring v={azNow.total ? azNow.done / azNow.total : 0} color="var(--color-gold)" size={48}><span className="text-[11px] font-bold" data-home-azkar-count>{toAr(azNow.done)}/{toAr(azNow.total)}</span></Ring>
        <span className="flex-1"><span className="block text-[14px] font-semibold">{azkarTitle(now)}</span><span className="block text-[12px] text-muted">بحسب وقتك الآن · {azNow.done === azNow.total && azNow.total ? 'مكتملة' : azNow.done ? 'تابع' : 'ابدأ'}</span></span>
        <Icon name="chevron" size={16} className="rotate-180 text-muted" />
      </button>
      <button type="button" onClick={() => go('azkar-list', now === 'morning' ? 'evening' : 'morning')} className="press mt-2 flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-[13px] text-muted hover:bg-night/[.03]">
        {azkarTitle(now === 'morning' ? 'evening' : 'morning')}<span className="tabular-nums">{toAr(azOther.done)}/{toAr(azOther.total)}</span>
      </button>
      <p className="mt-2 px-1 text-[11.5px] text-muted">اليوم: {toAr(azSum.completed)} ذكرًا مكتملًا · {toAr(azSum.reps)} تكرارًا</p>
    </Card>
  )

  const reflectCard = (
    <Card title="آية للتدبّر" icon="sparkle">
      <div className="mf-paper rounded-[18px] p-4">
        {aod.t ? <p className={`mf-text ${aod.t.hafs ? '' : 'tanzil'} line-clamp-4`} style={{ fontSize: 20, lineHeight: 2.05, textAlignLast: 'center' }}>{aod.t.text} <span className="mf-num">{toAr(aod.a)}</span></p> : <div className="h-16 animate-pulse rounded-xl bg-night/5" />}
        <p className="mt-1 text-center text-[11.5px] text-[var(--mf-ink-soft)]">سورة {surah(aod.s).ar} · {toAr(aod.a)}</p>
      </div>
      <button type="button" onClick={() => go('ayah')} className="press mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-night/[.05] text-[13px] font-semibold"><Icon name="note" size={16} />اكتب تأمّلك</button>
    </Card>
  )

  const earned = Object.values(st.achievements).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 3)
  const recent = (
    <Card title="إنجازات قريبة" icon="star" action={<Link onClick={() => go('rewards')}>كل الإنجازات</Link>}>
      {earned.length === 0 ? <p className="text-[13px] text-muted">لا إنجازات بعد. تُمنح حين تُتمّ حفظًا مؤكّدًا أو مراجعة أو خطة.</p> : (
        <ul className="space-y-2.5" data-home-recent>
          {earned.map((e) => {
            const def = ACHIEVEMENTS.find((a) => a.id === e.id)
            return (
              <li key={e.id}>
                <button type="button" onClick={() => go(e.id.startsWith('juz-') ? 'map' : 'rewards')} className="press flex w-full items-center gap-3 rounded-[16px] p-2 text-start hover:bg-night/[.03]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gold-soft text-gold"><Icon name={def?.icon ?? 'star'} size={18} /></span>
                  <span className="flex-1"><span className="block text-[13.5px] font-medium">{def?.ar ?? e.id}</span><span className="block text-[11.5px] text-muted">{fmtDate(e.at.slice(0, 10))}{e.demo ? ' · تجريبي' : ''}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] text-muted">{toAr(pd.memCount)} آية محفوظة بتأكيد · {toAr(pd.juz.filter((j) => j.status === 'done').length)} أجزاء مكتملة</p>
    </Card>
  )

  if (desk)
    return (
      <Chrome>
        <div className="mx-auto max-w-[1000px] px-8 py-8">
          {hero}
          {trio}
          <div className="mt-8 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">{quranCard}{reflectCard}</div>
            <div className="space-y-5">{azkarCard}{recent}</div>
          </div>
        </div>
      </Chrome>
    )
  return (
    <Chrome bare>
      {hero}
      {trio}
      <div className="space-y-4 px-5 pt-5">{quranCard}{azkarCard}{reflectCard}{recent}</div>
    </Chrome>
  )
}

function Card({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={icon} size={16} /></span>
        <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Link({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="text-[12.5px] font-medium text-gold hover:underline">{children}</button>
}
