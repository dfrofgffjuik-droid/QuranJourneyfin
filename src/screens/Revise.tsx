import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { RecallText } from '../components/RecallText'
import { Button } from '../components/ui'
import { useL } from '../lib/i18n'
import { todayTask } from '../lib/plans'
import { navigate } from '../lib/router'
import { loadMushaf, surah } from '../lib/quran'
import { useAyahPlayer } from '../lib/player'
import { addKnown, gradeReview, revisionTasks, setState, updateActive, useActive, useStore, type Grade } from '../lib/store'
import { today } from '../lib/date'
import { Big, SessionIntro } from './Memorize'

const MAX_PER_SESSION = 20

export function Revise({ q }: { q: Record<string, string> }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const reciterId = useStore((s) => s.reciter)
  const player = useAyahPlayer(reciterId)

  // The queue is fixed when the session opens, so grading doesn't reshuffle it.
  const [queue] = useState<[number, number][]>(() => {
    if (q.s) {
      const s = Number(q.s)
      const from = Number(q.from) || 1
      const to = Number(q.to) || from
      return Array.from({ length: to - from + 1 }, (_, i) => [s, from + i] as [number, number])
    }
    const pl = q.plan ? p.plans.find((x) => x.id === q.plan) : null
    if (pl) {
      const t = todayTask(p, pl, true)
      return t?.kind === 'revision' ? t.ayat : []
    }
    return revisionTasks(p).flatMap((t) => Array.from({ length: t.to - t.from + 1 }, (_, i) => [t.s, t.from + i] as [number, number]))
  })
  const session = useMemo(() => queue.slice(0, MAX_PER_SESSION), [queue])
  const later = queue.length - session.length
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [hafs, setHafs] = useState(true)
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(false)
  const [grades, setGrades] = useState<Grade[]>([])
  const [done, setDone] = useState(false)
  const [begun, setBegun] = useState(false)

  useEffect(() => {
    const surahs = [...new Set(session.map(([s]) => s))]
    surahs.forEach((s) => loadMushaf(s).then(({ ayat: ay, hafs: h }) => (h || setHafs(false), setTexts((t) => ({ ...t, ...Object.fromEntries(ay.map((x, k) => [`${s}:${k + 1}`, x])) })))))
  }, [session])

  if (session.length === 0)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-8 text-center">
        <p className="font-arabic-display text-3xl">{L('لا مراجعة مستحقّة الآن', 'Nothing to revise right now')}</p>
        <p className="mt-2 text-muted">{L('أحسنت. ما حفظته سيعود إليك في وقته.', 'Well done. What you know will come back at the right time.')}</p>
        <Button className="mt-6" href="#/">
          {L('العودة', 'Back')}
        </Button>
      </div>
    )

  if (done) {
    const forgot = session.filter((_, k) => grades[k] === 'forgot')
    return (
      <div className="pattern-night flex min-h-[100dvh] items-center justify-center px-6 py-10 text-parchment">
        <div className="rise w-full max-w-md text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold-soft">
            <Icon name="repeat" size={34} />
          </span>
          <h1 className="mt-6 font-arabic-display text-4xl">{L('تمّت المراجعة', 'Revision complete')}</h1>
          <div className="mt-8 grid grid-cols-3 gap-2">
            <Big v={N(grades.filter((g) => g === 'smooth').length)} l={L('بطلاقة', 'smooth')} />
            <Big v={N(grades.filter((g) => g === 'hesitant').length)} l={L('بتردّد', 'hesitant')} />
            <Big v={N(forgot.length)} l={L('نُسيت', 'forgotten')} />
          </div>
          <p className="mt-6 text-sm text-parchment/70">
            {later > 0
              ? L(`بقيت ${N(later)} آية لجلسة أخرى. لا بأس، الجلسات القصيرة أثبت.`, `${later} ayat remain for another session. Short sessions stick better.`)
              : L('الآيات الثابتة ستتباعد مراجعتها، والمنسيّة ستعود غدًا.', 'Solid ayat will come back less often; forgotten ones return tomorrow.')}
          </p>
          <div className="mt-8 space-y-2">
            {forgot.length > 0 && (
              <Button variant="light" size="lg" className="w-full" href={`#/memorize?s=${forgot[0][0]}&from=${forgot[0][1]}&to=${forgot.filter((x) => x[0] === forgot[0][0]).slice(-1)[0][1]}`}>
                {L('أعد حفظ ما نُسي', 'Re-learn what slipped')}
              </Button>
            )}
            <Button variant="ghost" size="lg" className="w-full text-parchment hover:bg-white/10" href="#/">
              {L('العودة إلى الرئيسية', 'Back home')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!begun) {
    const surahs = [...new Set(session.map(([x]) => x))]
    return (
      <SessionIntro
        icon="repeat"
        kicker={L('جلسة مراجعة', 'Revision session')}
        title={surahs.length === 1 ? (lang === 'ar' ? `سورة ${surah(surahs[0]).ar}` : surah(surahs[0]).en) : L(`${N(surahs.length)} مواضع`, `${surahs.length} portions`)}
        sub={L(`${N(session.length)} آية في هذه الجلسة${later ? ` · وتبقى ${N(later)} لاحقًا` : ''}`, `${session.length} ayat this session${later ? ` · ${later} later` : ''}`)}
        steps={[L('اقرأ من ذاكرتك مستعينًا بأوائل الكلمات', 'Recite from memory using first-letter cues'), L('اكشف الآية لتتأكّد', 'Reveal to check'), L('قيّم تذكّرك: بطلاقة، بتردّد، أو نسيتها', 'Rate your recall: smooth, hesitant or forgot')]}
        onStart={() => setBegun(true)}
        onBack={() => navigate('/')}
      />
    )
  }

  const [s, a] = session[i]
  const text = texts[`${s}:${a}`]
  const grade = (g: Grade) => {
    updateActive((x) => {
      const known = x.progress[`${s}:${a}`] ? x : addKnown(x, s, a, a)
      return gradeReview(known, s, a, g)
    })
    setGrades((gs) => [...gs, g])
    player.stop()
    if (i < session.length - 1) {
      setI(i + 1)
      setShown(false)
    } else {
      if (q.assignment) setState((st) => ({ ...st, assignments: st.assignments.map((x) => (x.id === q.assignment ? { ...x, doneAt: today() } : x)) }))
      setDone(true)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-5">
        <button type="button" onClick={() => (grades.length ? setDone(true) : navigate('/'))} className="flex h-11 w-11 items-center justify-center rounded-full bg-card ring-1 ring-line" aria-label={L('إنهاء', 'Finish')}>
          <Icon name="x" size={18} />
        </button>
        <div className="flex-1">
          <p className="text-center text-sm text-muted">{lang === 'ar' ? `مراجعة · سورة ${surah(s).ar} · الآية ${N(a)}` : `Revision · ${surah(s).en} · ayah ${a}`}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night/10">
            <div className="h-full rounded-full bg-night transition-all" style={{ width: `${(i / session.length) * 100}%` }} />
          </div>
        </div>
        <span className="min-w-11 text-center text-sm tabular-nums text-muted">{L(`${N(i + 1)} من ${N(session.length)}`, `${i + 1} of ${session.length}`)}</span>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-8">
        {text ? (
          <div key={`${s}:${a}-${shown}`} className="rise">
            <RecallText hafs={hafs} text={text} aya={a} level={shown ? 0 : 2} size="clamp(1.8rem, 5.5vw, 2.6rem)" />
          </div>
        ) : (
          <div className="h-40 animate-pulse rounded-3xl bg-night/5" />
        )}
        <p className="mt-6 text-center text-sm text-muted">
          {shown ? L('كيف كانت تلاوتك من الذاكرة؟', 'How did your recall go?') : L('اقرأ الآية من ذاكرتك مستعينًا بأوائل الكلمات، ثم اكشفها لتتأكّد.', 'Recite from memory using the first letters, then reveal to check.')}
        </p>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-parchment/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-3 px-5">
          <div className="flex justify-center">
            <button type="button" onClick={() => (player.playing ? player.stop() : player.play(s, a))} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted hover:bg-night/5">
              <Icon name={player.playing ? 'stop' : 'play'} size={16} fill />
              {player.playing ? L('إيقاف', 'Stop') : L('استمع للآية', 'Listen to the ayah')}
            </button>
          </div>
          {!shown ? (
            <Button size="lg" className="w-full" onClick={() => setShown(true)}>
              <Icon name="eye" size={18} />
              {L('اكشف الآية', 'Reveal')}
            </Button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button size="lg" variant="outline" className="text-clay" onClick={() => grade('forgot')}>
                {L('نسيتها', 'Forgot')}
              </Button>
              <Button size="lg" variant="soft" onClick={() => grade('hesitant')}>
                {L('بتردّد', 'Hesitant')}
              </Button>
              <Button size="lg" className="bg-leaf hover:bg-leaf/90" onClick={() => grade('smooth')}>
                {L('بطلاقة', 'Smooth')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
