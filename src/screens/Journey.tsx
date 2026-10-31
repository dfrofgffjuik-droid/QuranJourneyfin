import { Icon } from '../components/Icon'
import { SurahBadge } from '../components/Mushaf'
import { Bar, Card, ProgressRing, ScreenHeader, Section } from '../components/ui'
import { useL } from '../lib/i18n'
import { SURAHS, surah } from '../lib/quran'
import { activeDays, completedSurahs, memorizedCount, useActive, type Profile } from '../lib/store'
import { addDays, today } from '../lib/date'
import { LETTERS } from './kidsData'

export function journeyStats(p: Profile) {
  const memorized = memorizedCount(p)
  const done = completedSurahs(p)
  const logs = Object.values(p.log)
  const revised = logs.reduce((a, l) => a + l.revised, 0)
  const minutes = logs.reduce((a, l) => a + (l.minutes || 0), 0)
  const ammaTotal = SURAHS.filter((s) => s.n >= 78).reduce((a, s) => a + s.ayat, 0)
  const amma = SURAHS.filter((s) => s.n >= 78).reduce((a, s) => a + memorizedCount(p, s.n), 0)
  return { memorized, done, revised, minutes, amma, ammaTotal, active30: activeDays(p, 30) }
}

export function Journey() {
  const { L, N, lang } = useL()
  const p = useActive()!
  const st = journeyStats(p)
  const kid = p.path === 'kids'
  const letters = Object.keys(p.kids.letters).length

  // 12 weeks × 7 days consistency grid, oldest first.
  const days = Array.from({ length: 84 }, (_, i) => addDays(today(), i - 83))
  const level = (d: string) => {
    const l = p.log[d]
    if (!l) return 0
    const n = l.memorized + l.revised + l.practiced + (l.read ? 1 : 0)
    return n === 0 ? 0 : n < 3 ? 1 : n < 8 ? 2 : 3
  }
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13))
  const peak = Math.max(1, ...last14.map((d) => p.log[d]?.revised ?? 0))

  const milestones = [
    ...(kid ? [{ ok: letters >= 1, ar: 'أول حرف تعلّمته', en: 'Your first letter' }, { ok: letters >= 28, ar: 'تعلّمت الحروف الثمانية والعشرين', en: 'All 28 letters' }] : []),
    { ok: st.memorized >= 1, ar: 'أول آية حفظتها', en: 'Your first memorised ayah' },
    { ok: st.done.length >= 1, ar: 'أول سورة كاملة', en: 'Your first complete surah' },
    { ok: st.memorized >= 50, ar: '٥٠ آية في صدرك', en: '50 ayat by heart' },
    { ok: st.memorized >= 100, ar: '١٠٠ آية', en: '100 ayat' },
    { ok: st.revised >= 100, ar: '١٠٠ مراجعة', en: '100 revisions' },
    { ok: st.active30 >= 10, ar: '١٠ أيام من آخر ٣٠ يومًا', en: '10 days of the last 30' },
    { ok: st.amma >= st.ammaTotal, ar: 'جزء عمّ كاملًا', en: 'All of Juz ʿAmma' },
  ]

  return (
    <div className="space-y-10">
      <ScreenHeader title={kid ? L('نجومي', 'My stars') : L('رحلتي', 'My journey')} subtitle={L('تقدّمك بهدوء، دون مقارنة بأحد', 'Your progress, quietly. No comparisons')} />

      <div className="grid gap-4 md:grid-cols-4">
        <BigStat icon="sprout" v={N(st.memorized)} l={L('آية محفوظة', 'ayat memorised')} />
        <BigStat icon="book" v={N(st.done.length)} l={L('سورة مكتملة', 'surahs complete')} />
        <BigStat icon="repeat" v={N(st.revised)} l={L('مراجعة', 'revisions')} />
        <BigStat icon="calendar" v={N(st.active30)} l={L('يوم تعلّم من آخر ٣٠', 'learning days of the last 30')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <p className="text-sm font-medium">{L('الاستمرارية · ١٢ أسبوعًا', 'Consistency · 12 weeks')}</p>
          <p className="text-xs text-muted">{L('كل مربّع يوم. لا عدّاد أيام متتالية، فلا بأس إن فاتك يوم.', 'Each square is a day. No streak counter, so missing a day is fine.')}</p>
          <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1" dir="ltr" role="img" aria-label={L('أيام التعلّم في آخر ١٢ أسبوعًا', 'Learning days over the last 12 weeks')}>
            {days.map((d) => (
              <span key={d} title={d} className={`aspect-square rounded-[4px] ${['bg-night/[0.06]', 'bg-leaf/30', 'bg-leaf/60', 'bg-leaf'][level(d)]} ${d === today() ? 'ring-2 ring-gold' : ''}`} />
            ))}
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <ProgressRing value={st.amma / st.ammaTotal} size={120} stroke={9} tone="gold">
            <span className="font-arabic-display text-2xl">{N(Math.round((st.amma / st.ammaTotal) * 100))}٪</span>
          </ProgressRing>
          <p className="mt-4 font-medium">{L('جزء عمّ', 'Juz ʿAmma')}</p>
          <p className="text-sm text-muted">{L(`${N(st.amma)} من ${N(st.ammaTotal)} آية`, `${st.amma} of ${st.ammaTotal} ayat`)}</p>
        </Card>
      </div>

      <Section title={L('نشاط المراجعة · ١٤ يومًا', 'Revision activity · 14 days')}>
        <Card className="p-6">
          <div className="flex h-28 items-end gap-1.5">
            {last14.map((d) => {
              const n = p.log[d]?.revised ?? 0
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`w-full rounded-t-lg ${n ? 'bg-sky/70' : 'bg-night/[0.06]'}`} style={{ height: `${Math.max(4, (n / peak) * 96)}px` }} title={`${d}: ${n}`} />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{L('قبل أسبوعين', '2 weeks ago')}</span>
            <span>{L('اليوم', 'Today')}</span>
          </div>
        </Card>
      </Section>

      <Section title={L('محطات في الطريق', 'Milestones')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m) => (
            <div key={m.en} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${m.ok ? 'bg-gold-soft/40 ring-gold/40' : 'bg-card ring-line'}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${m.ok ? 'bg-gold text-white' : 'bg-night/5 text-night/30'}`}>
                <Icon name="star" size={18} fill={m.ok} />
              </span>
              <span className={`text-sm ${m.ok ? 'font-medium' : 'text-muted'}`}>{L(m.ar, m.en)}</span>
            </div>
          ))}
        </div>
      </Section>

      {st.done.length > 0 && (
        <Section title={L('سور أتممت حفظها', 'Surahs you’ve completed')}>
          <div className="flex flex-wrap gap-2">
            {st.done
              .sort((a, b) => a - b)
              .map((s) => (
                <a key={s} href={`#/surah/${s}`} className="flex items-center gap-2 rounded-full bg-card py-1.5 pe-4 ps-1.5 ring-1 ring-line">
                  <SurahBadge n={s} size={30} />
                  <span className="text-sm">{lang === 'ar' ? surah(s).ar : surah(s).en}</span>
                </a>
              ))}
          </div>
        </Section>
      )}

      {kid && (
        <Section title={L('الحروف', 'Letters')}>
          <Card className="p-6">
            <Bar value={letters / LETTERS.length} />
            <p className="mt-2 text-sm text-muted">{L(`تعلّمت ${N(letters)} من ${N(LETTERS.length)} حرفًا`, `${letters} of ${LETTERS.length} letters learned`)}</p>
          </Card>
        </Section>
      )}
    </div>
  )
}

function BigStat({ icon, v, l }: { icon: string; v: string; l: string }) {
  return (
    <Card className="p-5">
      <Icon name={icon} className="text-gold" />
      <p className="mt-3 font-arabic-display text-4xl">{v}</p>
      <p className="text-sm text-muted">{l}</p>
    </Card>
  )
}
