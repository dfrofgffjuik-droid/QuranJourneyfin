import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { SurahBadge } from '../components/Mushaf'
import { CalendarArt, LanternArt, MicArt, MushafArt, OpenQuranArt } from '../components/Illustrations'
import { PlanCard, weekOrder, DAY_AR_SHORT, DAY_EN_SHORT } from '../components/PlanParts'
import { Button, Card, ProgressRing, Section } from '../components/ui'
import { openProfiles } from '../app/Shell'
import { useL } from '../lib/i18n'
import { JUZ, juzEnd, gIndex, loadHafs, surah, SURAHS, TOTAL_AYAT } from '../lib/quran'
import { activeDays, isMemorized, memorizedCount, revisionTasks, todaysHifz, useActive, useStore, type Profile, type RevisionTask } from '../lib/store'
import { addDays, today } from '../lib/date'
import { activePlans, ayatIn, hifzPlanOf } from '../lib/plans'
import { AppearanceButton } from '../components/Appearance'

export function greeting(L: (a: string, e: string) => string) {
  const h = new Date().getHours()
  return h < 12 ? L('صباح الخير', 'Good morning') : h < 18 ? L('طاب يومك', 'Good afternoon') : L('مساء الخير', 'Good evening')
}

export const rangeLabel = (L: (a: string, e: string) => string, N: (n: number) => string, s: number, from: number, to: number, lang: string) => {
  const name = lang === 'ar' ? surah(s).ar : surah(s).en
  if (from === 1 && to === surah(s).ayat) return `${name}`
  return from === to ? `${name} · ${L('آية', 'ayah')} ${N(from)}` : `${name} · ${N(from)}–${N(to)}`
}

// Verse of the week: references only; the text is loaded from the verified KFGQPC edition.
const VERSES: { s: number; a: number; img: string; alt: string }[] = [
  { s: 94, a: 5, img: 'https://images.unsplash.com/photo-1596125160970-6f02eeba00d3?auto=format&fit=crop&w=640&q=70', alt: 'مصحف على حامل خشبي فوق سجادة صلاة' },
  { s: 2, a: 152, img: 'https://images.unsplash.com/photo-1785489523972-4c4371f4b642?auto=format&fit=crop&w=640&q=70', alt: 'مسجد بقبة زرقاء وسط حديقة' },
  { s: 20, a: 114, img: 'https://images.unsplash.com/photo-1761024300173-91f065d30a9a?auto=format&fit=crop&w=640&q=70', alt: 'ممرّ حجري في حديقة هادئة' },
  { s: 13, a: 28, img: 'https://images.unsplash.com/photo-1763518767820-321b35add3e0?auto=format&fit=crop&w=640&q=70', alt: 'ممرّ تحيط به نباتات خضراء' },
  { s: 65, a: 3, img: 'https://images.unsplash.com/photo-1784400340505-6897bd50be81?auto=format&fit=crop&w=640&q=70', alt: 'مسجد أبيض بقبة ذهبية خلف قوس حجري' },
  { s: 55, a: 13, img: 'https://images.unsplash.com/photo-1758384077443-4aec1127df27?auto=format&fit=crop&w=640&q=70', alt: 'طريق متعرّج في حديقة خضراء' },
]

function useWeekVerses() {
  const week = Math.floor(Date.now() / (7 * 864e5))
  const picks = useMemo(() => [0, 1, 2].map((k) => VERSES[(week + k) % VERSES.length]), [week])
  const [texts, setTexts] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true
    picks.forEach((v) =>
      loadHafs(v.s)
        .then((ay) => live && setTexts((t) => ({ ...t, [`${v.s}:${v.a}`]: ay[v.a - 1] })))
        .catch(() => undefined),
    )
    return () => {
      live = false
    }
  }, [picks])
  return picks.map((v) => ({ ...v, text: texts[`${v.s}:${v.a}`] }))
}

const hasActivity = (p: Profile, d: string) => {
  const l = p.log[d]
  return !!l && l.memorized + l.revised + l.read + l.practiced > 0
}
function streakOf(p: Profile) {
  let d = hasActivity(p, today()) ? today() : addDays(today(), -1)
  let n = 0
  while (hasActivity(p, d) && n < 999) (n++, (d = addDays(d, -1)))
  return n
}
function juzMemorized(p: Profile) {
  let c = 0
  for (let j = 1; j <= 30; j++) {
    let all = true
    for (const [s, a] of ayatIn({ start: JUZ[j - 1], end: juzEnd(j) }))
      if (!isMemorized(p, s, a)) {
        all = false
        break
      }
    if (all) c++
  }
  return c
}

export function Home() {
  const { L, N, A, lang } = useL()
  const p = useActive()!
  const assignments = useStore((s) => s.assignments)
  const submissions = useStore((s) => s.submissions)
  const hifz = todaysHifz(p)
  const tasks = revisionTasks(p)
  const overdue = tasks.filter((t) => t.overdue > 0)
  const dueAyat = tasks.reduce((a, t) => a + t.count, 0)
  const mine = assignments.filter((a) => a.learnerId === p.id && !a.doneAt)
  const feedback = submissions.filter((s) => s.learnerId === p.id && s.teacher && !s.seenByLearner)
  const memorized = memorizedCount(p)
  const juzDone = useMemo(() => juzMemorized(p), [p])
  const hp = hifzPlanOf(p)
  const others = activePlans(p).filter((x) => x.id !== hp?.id)
  const verses = useWeekVerses()
  const streak = streakOf(p)
  const hijri = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const cont = p.last ?? (hifz && hifz.next.length ? { s: hifz.s, a: hifz.next[0], mode: 'memorize' as const } : { s: 1, a: 1, mode: 'read' as const })
  const hifzSurahs = SURAHS.filter((s) => memorizedCount(p, s.n) > 0 || (hifz && s.n === hifz.s)).slice(0, 8)
  const weekStart = (() => {
    const order = weekOrder(lang)
    const dow = new Date(`${today()}T12:00:00`).getDay()
    return addDays(today(), -order.indexOf(dow))
  })()
  const chev = lang === 'ar' ? 'rotate-180' : ''

  return (
    <div className="space-y-9">
      {/* Hero: deep green that melts into the page */}
      <header className="hero-fade relative -mx-5 px-5 pb-28 pt-5 text-white md:-mx-10 md:-mt-10 md:rounded-b-[2.5rem] md:px-10 md:pt-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] backdrop-blur">
            <Icon name="calendar" size={14} />
            {hijri}
          </span>
          <span className="ms-auto" />
          <AppearanceButton iconSize={19} className="bg-white/15 backdrop-blur md:hidden" />
          <a href="#/settings" aria-label={L('الإعدادات', 'Settings')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur md:hidden">
            <Icon name="settings" size={19} />
          </a>
          <button type="button" onClick={openProfiles} aria-label={L('تبديل الملف', 'Switch profile')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[var(--hero-a)] md:hidden">
            {[...(p.name.trim() || '؟')][0]}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-white/80">
              {greeting(L)}، {p.name}
            </p>
            <h1 className="mt-2 text-[1.6rem] font-bold leading-[1.3] md:text-[2.2rem]">
              {hifz && !hifz.done ? L(`واصل همّتك في حفظ سورة ${surah(hifz.s).ar}`, `Keep going with ${surah(hifz.s).en}`) : dueAyat ? L(`لديك ${A(dueAyat)} للمراجعة اليوم`, `${A(dueAyat)} to revise today`) : L('خطوة صغيرة اليوم تكفي', 'A small step today is enough')}
            </h1>
          </div>
          <OpenQuranArt size={128} className="-me-1 shrink-0 drop-shadow-[0_18px_22px_rgba(0,0,0,.18)] md:size-auto" />
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(1, (memorized / TOTAL_AYAT) * 100)}%` }} />
            </div>
            <span className="text-[12px] tabular-nums text-white/85">{N(Math.round((memorized / TOTAL_AYAT) * 1000) / 10)}٪</span>
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-white/80">
            <span>{L(`${N(juzDone)}/${N(30)} جزء محفوظ`, `${juzDone}/30 juz memorised`)}</span>
            <span>{L(`${N(memorized)}/${N(TOTAL_AYAT)} آية`, `${memorized}/${TOTAL_AYAT} ayat`)}</span>
          </div>
        </div>
      </header>

      {/* Shortcut tiles, overlapping the hero */}
      <nav className="relative z-10 -mt-[6.5rem] grid grid-cols-4 gap-1 rounded-[26px] bg-card p-2 shadow-[0_18px_40px_-22px_rgba(16,24,40,.45)] ring-1 ring-line" aria-label={L('وصول سريع', 'Quick access')}>
        {[
          { href: '#/quran', art: <MushafArt size={46} />, l: L('المصحف', 'Quran') },
          { href: '#/plan', art: <CalendarArt size={46} />, l: L('الخطط', 'Plans') },
          { href: '#/recite', art: <MicArt size={46} />, l: L('التسميع', 'Recite') },
          { href: `#/tafsir/${cont.s}/${cont.a}`, art: <LanternArt size={46} />, l: L('التدبّر', 'Reflect') },
        ].map((x) => (
          <a key={x.href} href={x.href} className="flex flex-col items-center gap-1.5 rounded-[20px] px-1 py-3 transition hover:bg-night/[0.04]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-parchment ring-1 ring-line">{x.art}</span>
            <span className="text-[13px] font-medium">{x.l}</span>
          </a>
        ))}
      </nav>

      {(mine.length > 0 || feedback.length > 0) && (
        <Section title={L('من معلّمك', 'From your teacher')}>
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((a) => (
              <Card key={a.id} href={a.kind === 'memorize' ? `#/memorize?s=${a.s}&from=${a.from}&to=${a.to}&assignment=${a.id}` : a.kind === 'revise' ? `#/revise?s=${a.s}&from=${a.from}&to=${a.to}&assignment=${a.id}` : `#/recite?s=${a.s}&from=${a.from}&to=${a.to}&assignment=${a.id}`} className="flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/10 text-sky">
                  <Icon name={a.kind === 'recite' ? 'mic' : a.kind === 'revise' ? 'repeat' : 'sprout'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-sky">{a.kind === 'memorize' ? L('حفظ جديد', 'New memorisation') : a.kind === 'revise' ? L('مراجعة', 'Revision') : L('تسميع', 'Recitation')}</span>
                  <span className="block font-semibold">{rangeLabel(L, N, a.s, a.from, a.to, lang)}</span>
                  {a.note && <span className="mt-0.5 block truncate text-sm text-muted">“{a.note}”</span>}
                </span>
                <Icon name="chevron" className={`text-muted ${chev}`} />
              </Card>
            ))}
            {feedback.map((s) => (
              <Card key={s.id} href={`#/recite?feedback=${s.id}`} className="flex items-center gap-4 p-5">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.teacher!.verdict === 'good' ? 'bg-leaf/10 text-leaf' : 'bg-gold-soft/60 text-night'}`}>
                  <Icon name={s.teacher!.verdict === 'good' ? 'star' : 'heart'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">{L('ملاحظة على تسميعك', 'Feedback on your recitation')}</span>
                  <span className="block font-semibold">{s.teacher!.verdict === 'good' ? L('أحسنت! تسميع متقن', 'Well done! A solid recitation') : L('تحتاج إلى مراجعة يسيرة', 'A little more practice')}</span>
                  <span className="block truncate text-sm text-muted">{rangeLabel(L, N, s.s, s.from, s.to, lang)}</span>
                </span>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Continue */}
      <Section title={L('تابع من حيث توقّفت', 'Pick up where you left off')}>
        <Card className="p-4">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="font-semibold">{lang === 'ar' ? `${surah(cont.s).ar} : ${N(cont.a)}` : `${surah(cont.s).en}:${cont.a}`}</span>
            <span dir="rtl" className="font-quran text-2xl text-night/85">{surah(cont.s).ar}</span>
          </div>
          <Button variant="outline" className="mt-3 w-full" href={cont.mode === 'memorize' && hifz?.next.length ? `#/memorize?s=${hifz.s}&from=${hifz.next[0]}&to=${hifz.next[hifz.next.length - 1]}` : `#/surah/${cont.s}?a=${cont.a}`}>
            {p.last ? L('تابع', 'Continue') : L('ابدأ', 'Start')}
            <Icon name="chevron" size={17} className={chev} />
          </Button>
        </Card>
      </Section>

      {/* Today */}
      <Section title={L('ورد اليوم', 'Today')}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="flex items-center gap-4 p-5">
            {hifz ? (
              <>
                <ProgressRing value={hifz.learnedToday / Math.max(1, hifz.goal)} size={58} stroke={5}>
                  <span className="text-[11px] font-bold tabular-nums">{N(Math.min(hifz.learnedToday, hifz.goal))}/{N(hifz.goal)}</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-muted">{L('الحفظ', 'Memorisation')}</p>
                  <p className="truncate font-semibold">
                    {hifz.done ? L('اكتمل ورد الحفظ', 'Portion complete') : hifz.next.length ? `${lang === 'ar' ? surah(hifz.s).ar : surah(hifz.s).en} ${N(hifz.next[0])}${hifz.next.length > 1 ? `–${N(hifz.next[hifz.next.length - 1])}` : ''}` : L('أتممت هدف اليوم', 'Today’s goal is done')}
                  </p>
                </div>
                {hifz.next.length > 0 ? (
                  <Button size="sm" href={`#/memorize?s=${hifz.s}&from=${hifz.next[0]}&to=${hifz.next[hifz.next.length - 1]}`}>
                    <Icon name="play" size={14} fill />
                    {L('ابدأ', 'Start')}
                  </Button>
                ) : (
                  hifz.done && <Button size="sm" variant="soft" href="#/plan/new?kind=hifz">{L('الورد التالي', 'Next portion')}</Button>
                )}
              </>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-soft text-gold"><Icon name="sprout" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{L('لا خطة حفظ بعد', 'No memorisation plan yet')}</p>
                  <p className="text-[13px] text-muted">{L('اختر سورة وعدد آيات يومي', 'Pick a surah and a daily amount')}</p>
                </div>
                <Button size="sm" href="#/plan/new?kind=hifz">{L('أنشئ', 'Create')}</Button>
              </>
            )}
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${overdue.length ? 'bg-clay/10 text-clay' : 'bg-gold-soft text-gold'}`}><Icon name="repeat" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-muted">{L('المراجعة', 'Revision')}{overdue.length > 0 && <span className="ms-2 text-clay">{L(`${N(overdue.length)} متأخرة`, `${overdue.length} overdue`)}</span>}</p>
              <p className="font-semibold">{dueAyat ? A(dueAyat) : memorized ? L('لا شيء مستحقّ اليوم', 'Nothing due today') : L('بعد أول آية تحفظها', 'After your first ayah')}</p>
            </div>
            {dueAyat > 0 && (
              <Button size="sm" href="#/revise?due=1">
                {L('راجع', 'Revise')}
              </Button>
            )}
          </Card>
        </div>
      </Section>

      {/* Streak */}
      <Section
        title={L('المداومة', 'Streak')}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold">
            <Icon name="sparkle" size={13} />
            {L(`${N(streak)} يوم`, `${streak} day${streak === 1 ? '' : 's'}`)}
          </span>
        }
      >
        <Card className="grid grid-cols-7 gap-1.5 p-3">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
            const on = hasActivity(p, d)
            const isToday = d === today()
            const dow = new Date(`${d}T12:00:00`).getDay()
            return (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <span className={`flex aspect-square w-full max-w-11 items-center justify-center rounded-2xl ring-1 ${on ? 'bg-gold text-white ring-transparent' : isToday ? 'bg-card ring-gold/50' : 'bg-parchment ring-line'} ${d > today() ? 'opacity-50' : ''}`}>
                  <Icon name="check" size={16} className={on ? '' : 'text-muted/50'} />
                </span>
                <span className={`text-[11px] ${isToday ? 'font-bold text-night' : 'text-muted'}`}>{lang === 'ar' ? DAY_AR_SHORT[dow] : DAY_EN_SHORT[dow].slice(0, 1)}</span>
              </div>
            )
          })}
        </Card>
        <p className="text-[12.5px] text-muted">{L(`نشطت ${N(activeDays(p))} يومًا من آخر ٣٠ يومًا.`, `Active ${activeDays(p)} of the last 30 days.`)} <a href="#/journey" className="text-gold">{L('رحلتي', 'My journey')}</a></p>
      </Section>

      {/* Verse of the week */}
      <Section title={L('آيات هذا الأسبوع', 'Verses this week')}>
        <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {verses.map((v) => (
            <a key={`${v.s}:${v.a}`} href={`#/tafsir/${v.s}/${v.a}`} className="relative h-64 w-[72%] shrink-0 snap-start overflow-hidden rounded-[24px] bg-night/10 md:w-auto">
              <img src={v.img} alt={v.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/0" />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                {v.text ? (
                  <span dir="rtl" lang="ar" className="hafs block text-[1.35rem] leading-[1.9]">
                    {v.text} <span className="font-[family-name:var(--font-hafs)]">{N(v.a)}</span>
                  </span>
                ) : (
                  <span className="block h-12 animate-pulse rounded-xl bg-white/15" />
                )}
                <span className="mt-1 block text-[12px] text-white/80">{lang === 'ar' ? `سورة ${surah(v.s).ar} · ${N(v.a)}` : `${surah(v.s).en} ${v.s}:${v.a}`} · {L('التفسير', 'Tafsir')} ›</span>
              </span>
            </a>
          ))}
        </div>
      </Section>

      {/* Hifz */}
      {hifzSurahs.length > 0 && (
        <Section title={L('الحفظ', 'Hifz')} action={<a href="#/plan" className="flex items-center gap-1 text-sm text-gold">{L('المزيد', 'See more')}<Icon name="chevron" size={15} className={chev} /></a>}>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
            {hifzSurahs.map((s) => {
              const m = memorizedCount(p, s.n)
              return (
                <a key={s.n} href={`#/surah/${s.n}`} className="flex min-w-[11.5rem] shrink-0 items-center justify-between gap-3 rounded-[22px] bg-card p-4 ring-1 ring-line">
                  <span>
                    <span className="block font-semibold">{lang === 'ar' ? `${s.ar} : ${N(m)}` : `${s.en} : ${m}`}</span>
                    <span className="block text-[12px] text-muted">{L(`من ${N(s.ayat)} آية`, `of ${s.ayat} ayat`)}</span>
                  </span>
                  <span dir="rtl" className="font-quran text-2xl text-night/80">{s.ar}</span>
                </a>
              )
            })}
          </div>
        </Section>
      )}

      {others.length > 0 && (
        <Section title={L('خطط اليوم', 'Today’s plans')} action={<a href="#/plan" className="text-sm text-gold">{L('كل الخطط', 'All plans')}</a>}>
          <div className="grid gap-3 lg:grid-cols-2">
            {others.slice(0, 4).map((pl) => (
              <PlanCard key={pl.id} p={p} pl={pl} primary={pl.id === p.primaryPlanId} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

export function TaskRow({ t, start = false }: { t: RevisionTask; start?: boolean }) {
  const { L, N, A, lang } = useL()
  const body = (
    <>
      <SurahBadge n={t.s} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{rangeLabel(L, N, t.s, t.from, t.to, lang)}</span>
        <span className={`block text-xs ${t.overdue > 0 ? 'text-clay' : 'text-muted'}`}>
          {t.overdue > 0 ? L(`متأخرة ${t.overdue === 1 ? 'يومًا' : t.overdue === 2 ? 'يومين' : `${N(t.overdue)} ${t.overdue <= 10 ? 'أيام' : 'يومًا'}`}`, `${t.overdue} day${t.overdue > 1 ? 's' : ''} overdue`) : L('مستحقّة اليوم', 'Due today')} · {A(t.count)}
        </span>
      </span>
    </>
  )
  if (!start)
    return <li className="flex items-center gap-3">{body}</li>
  return (
    <li>
      <a href={`#/revise?s=${t.s}&from=${t.from}&to=${t.to}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-night/5">
        {body}
        <Icon name="chevron" className={`text-muted ${lang === 'ar' ? 'rotate-180' : ''}`} />
      </a>
    </li>
  )
}
