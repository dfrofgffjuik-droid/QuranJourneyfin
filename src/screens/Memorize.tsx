import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { RecallText, type RecallLevel } from '../components/RecallText'
import { Button } from '../components/ui'
import type { Profile } from '../lib/store'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { surah } from '../lib/quran'
import { useMushaf } from '../lib/useSurah'
import { useAyahPlayer } from '../lib/player'
import { gradeReview, isMemorized, logDay, markMemorized, markPractice, setState, todaysHifz, updateActive, useActive, useStore } from '../lib/store'
import { today } from '../lib/date'

type Result = 'memorized' | 'practice' | 'forgot'

/** Self-assessment → progress. Known ayat feed spaced revision; new ones are learned or kept for practice. */
function applyResult(x: Profile, s: number, a: number, r: Result): Profile {
  if (isMemorized(x, s, a)) return gradeReview(x, s, a, r === 'memorized' ? 'smooth' : r === 'practice' ? 'hesitant' : 'forgot')
  return r === 'memorized' ? markMemorized(x, s, a) : markPractice(x, s, a)
}

const LEVELS: { ar: string; en: string; hint: [string, string] }[] = [
  { ar: 'اقرأ', en: 'Read', hint: ['استمع واقرأ الآية بتأنٍّ', 'Listen and read the ayah slowly'] },
  { ar: 'تلميح', en: 'Hint', hint: ['أُخفيت بعض الكلمات، تذكّرها', 'Some words are hidden. Recall them'] },
  { ar: 'أوائل', en: 'Cues', hint: ['أوائل الكلمات فقط، اقرأ من ذاكرتك', 'Only first letters. Read from memory'] },
  { ar: 'غيبًا', en: 'Hidden', hint: ['اقرأها كاملة غيبًا، واضغط على كلمة لإظهارها', 'Recite it all from memory. Tap a word to peek'] },
]

export function Memorize({ q }: { q: Record<string, string> }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const reciterId = useStore((s) => s.reciter)
  const s = Number(q.s) || todaysHifz(p)?.s || 1
  const meta = surah(s)
  const from = Math.max(1, Number(q.from) || 1)
  const to = Math.min(meta.ayat, Math.max(from, Number(q.to) || from))
  const list = useMemo(() => Array.from({ length: to - from + 1 }, (_, i) => from + i), [from, to])
  const { ayat, hafs } = useMushaf(s)
  const player = useAyahPlayer(reciterId)

  const [i, setI] = useState(0)
  const [level, setLevel] = useState<RecallLevel>(0)
  const [reps, setReps] = useState(3)
  const [results, setResults] = useState<Record<number, Result>>({})
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  // 'group' shows and repeats the whole selected portion together.
  const [scope, setScope] = useState<'ayah' | 'group'>('ayah')
  const [peek, setPeek] = useState(false)
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)
  const [begun, setBegun] = useState(false)
  const started = useRef(Date.now())
  const activeMs = useRef(0)
  const a = list[i]

  useEffect(() => {
    setPeek(false)
  }, [level, scope])

  useEffect(() => {
    setLevel(0)
    setCount(0)
    player.stop()
    updateActive((x) => ({ ...x, last: { s, a, mode: 'memorize' } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a])

  const pause = () => {
    activeMs.current += Date.now() - started.current
    player.stop()
    setPaused(true)
  }
  const resume = () => {
    started.current = Date.now()
    setPaused(false)
  }
  const finish = () => {
    if (!paused) activeMs.current += Date.now() - started.current
    player.stop()
    const minutes = Math.max(1, Math.round(activeMs.current / 60000))
    updateActive((x) => logDay(x, { minutes }))
    if (q.assignment) setState((st) => ({ ...st, assignments: st.assignments.map((x) => (x.id === q.assignment ? { ...x, doneAt: today() } : x)) }))
    setPaused(false)
    setFinished(true)
  }

  const mark = (r: Result) => {
    updateActive((x) => applyResult(x, s, a, r))
    setResults((m) => ({ ...m, [a]: r }))
    if (i < list.length - 1) setI(i + 1)
    else finish()
  }

  const markAll = (r: Result) => {
    updateActive((x) => list.reduce((acc, y) => (results[y] ? acc : applyResult(acc, s, y, r)), x))
    setResults((m) => Object.fromEntries(list.map((y) => [y, m[y] ?? r])))
    finish()
  }

  /** Play the portion from first to last ayah, `reps` times (0 = until stopped). */
  const playGroup = () => {
    let left = reps === 0 ? Infinity : reps
    let r = 1
    setRound(1)
    const run = (k: number) =>
      player.play(s, list[k], 1, () => {
        if (k < list.length - 1) return run(k + 1)
        left = left === Infinity ? Infinity : left - 1
        if (left > 0) {
          r += 1
          setRound(r)
          run(0)
        }
      })
    run(0)
  }
  const group = scope === 'group' && list.length > 1
  const shown = (peek ? 0 : level) as RecallLevel

  if (finished) return <Completion s={s} list={list} results={results} minutes={Math.max(1, Math.round(activeMs.current / 60000))} />

  if (!begun)
    return (
      <SessionIntro
        icon="sprout"
        kicker={L('جلسة حفظ', 'Memorisation session')}
        title={lang === 'ar' ? `سورة ${meta.ar}` : meta.en}
        sub={list.length > 1 ? L(`الآيات ${N(from)}–${N(to)} · ${N(list.length)} آيات`, `Ayat ${from}–${to} · ${list.length} ayat`) : L(`الآية ${N(from)}`, `Ayah ${from}`)}
        steps={[L('استمع واقرأ الآية بتأنٍّ', 'Listen and read slowly'), L('أخفِ الكلمات تدريجيًا وتذكّرها', 'Hide words step by step and recall'), L('سمّعها غيبًا ثم قيّم حفظك', 'Recite from memory, then rate yourself')]}
        onStart={() => ((started.current = Date.now()), setBegun(true))}
        onBack={() => navigate('/')}
      />
    )

  const already = isMemorized(p, s, a)
  const lv = LEVELS[level]

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-5">
        <button type="button" onClick={pause} className="flex h-11 w-11 items-center justify-center rounded-full bg-card ring-1 ring-line" aria-label={L('إيقاف مؤقت', 'Pause')}>
          <Icon name="pause" size={18} />
        </button>
        <div className="flex-1">
          <p className="text-center text-sm text-muted">{lang === 'ar' ? `سورة ${meta.ar} · الآية ${N(a)}` : `${meta.en} · ayah ${a}`}</p>
          <div className="mt-2 flex gap-1" aria-label={L(`الآية ${N(i + 1)} من ${N(list.length)}`, `Ayah ${i + 1} of ${list.length}`)}>
            {list.map((x, k) => (
              <span key={x} className={`h-1.5 flex-1 rounded-full ${results[x] === 'memorized' ? 'bg-leaf' : results[x] === 'practice' ? 'bg-gold-soft' : results[x] === 'forgot' ? 'bg-clay' : k === i ? 'bg-night' : 'bg-night/10'}`} />
            ))}
          </div>
        </div>
        <span className="min-w-11 text-center text-sm tabular-nums text-muted">{L(`${N(i + 1)} من ${N(list.length)}`, `${i + 1} of ${list.length}`)}</span>
      </div>
      {list.length > 1 && (
        <div className="mx-auto mt-4 flex w-full max-w-3xl justify-center px-5">
          <div className="inline-flex rounded-full bg-night/5 p-1" role="radiogroup" aria-label={L('نطاق الحفظ', 'Scope')}>
            {(
              [
                ['ayah', L('آية آية', 'One ayah')],
                ['group', L(`المقطع كاملًا · ${N(list.length)}`, `Whole portion · ${list.length}`)],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => (player.stop(), setScope(v))} className={`rounded-full px-4 py-2 text-sm transition ${scope === v ? 'bg-card font-medium shadow-sm' : 'text-muted'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-8">
        {!ayat ? (
          <div className="mx-auto h-40 w-full animate-pulse rounded-3xl bg-night/5" />
        ) : (
          group ? (
            <div key={`g-${shown}`} className="rise space-y-2">
              {list.map((x) => (
                <div key={x} className={`rounded-3xl px-3 py-1 transition-colors ${player.playing?.a === x ? 'bg-gold-soft/70' : ''}`}>
                  <RecallText hafs={hafs} text={ayat[x - 1]} aya={x} level={shown} size="clamp(1.45rem, 4.4vw, 2.1rem)" />
                </div>
              ))}
            </div>
          ) : (
            <div key={`${a}-${shown}`} className={`rise rounded-3xl px-2 transition-colors ${player.playing ? 'bg-gold-soft/40' : ''}`}>
              <RecallText hafs={hafs} text={ayat[a - 1]} aya={a} level={shown} size="clamp(1.8rem, 5.5vw, 2.7rem)" />
            </div>
          )
        )}
        <p className="mt-6 text-center text-sm text-muted">{peek ? L('النص ظاهر للتأكد. أخفِه وأعد التسميع.', 'Text shown to check. Hide it and recite again.') : L(lv.hint[0], lv.hint[1])}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {level > 0 && (
            <button type="button" onClick={() => setPeek((v) => !v)} aria-pressed={peek} className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition ${peek ? 'bg-gold text-white ring-transparent' : 'bg-card text-night ring-line hover:ring-gold/50'}`}>
              <Icon name={peek ? 'eyeOff' : 'eyeCheck'} size={18} />
              {peek ? L('أخفِ النص', 'Hide text') : L('أظهر النص للتأكد', 'Show text to check')}
            </button>
          )}
          {level >= 2 && (
            <button type="button" onClick={() => setCount((c) => c + 1)} className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm ring-1 ring-line hover:ring-gold/50" aria-label={L('سجّل تسميعة غيبًا', 'Count one recitation from memory')}>
              <Icon name="plus" size={16} className="text-gold" />
              {L('سمّعتها غيبًا', 'Recited from memory')}
              <span className="min-w-6 rounded-full bg-gold-soft px-1.5 text-center font-semibold tabular-nums text-gold">{N(count)}</span>
            </button>
          )}
        </div>
        {already && <p className="mt-2 text-center text-xs text-leaf">{L('هذه الآية من محفوظاتك. هذه جلسة تثبيت', 'You already know this ayah. This is reinforcement')}</p>}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-parchment/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-4 px-5">
          <div className="grid grid-cols-4 gap-1 rounded-full bg-night/5 p-1" role="radiogroup" aria-label={L('مستوى الإخفاء', 'Hiding level')}>
            {LEVELS.map((x, k) => (
              <button key={x.en} type="button" role="radio" aria-checked={level === k} onClick={() => setLevel(k as RecallLevel)} className={`rounded-full py-2 text-sm transition ${level === k ? 'bg-card font-medium shadow-sm' : 'text-muted'}`}>
                {L(x.ar, x.en)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0 || group} className="flex h-11 w-11 items-center justify-center rounded-full text-night disabled:opacity-25" aria-label={L('الآية السابقة', 'Previous ayah')}>
              <Icon name="chevron" className={lang === 'ar' ? '' : 'rotate-180'} />
            </button>
            <button
              type="button"
              onClick={() => (player.playing ? player.stop() : group ? playGroup() : player.play(s, a, reps === 0 ? Infinity : reps))}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-night text-parchment shadow-lg"
              aria-label={player.playing ? L('إيقاف', 'Stop') : L('استمع', 'Listen')}
            >
              {player.playing && player.loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment" /> : <Icon name={player.playing ? 'stop' : 'play'} size={24} fill />}
            </button>
            <div className="flex items-center gap-1 rounded-full bg-card p-1 ring-1 ring-line" role="radiogroup" aria-label={L('عدد التكرار', 'Repetitions')}>
              <Icon name="repeat" size={16} className="mx-1.5 text-muted" />
              {[1, 3, 5, 0].map((r) => (
                <button key={r} type="button" role="radio" aria-checked={reps === r} onClick={() => setReps(r)} className={`h-8 min-w-8 rounded-full px-2 text-sm ${reps === r ? 'bg-night text-parchment' : 'text-muted'}`}>
                  {r === 0 ? '∞' : N(r)}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setI(Math.min(list.length - 1, i + 1))} disabled={i === list.length - 1 || group} className="flex h-11 w-11 items-center justify-center rounded-full text-night disabled:opacity-25" aria-label={L('الآية التالية', 'Next ayah')}>
              <Icon name="chevron" className={lang === 'ar' ? 'rotate-180' : ''} />
            </button>
          </div>
          <p className="-mt-2 text-center text-xs text-muted">
            {group
              ? player.playing
                ? L(`تكرار المقطع: الدورة ${N(round)}${reps ? ` من ${N(reps)}` : ''}`, `Repeating portion: round ${round}${reps ? ` of ${reps}` : ''}`)
                : L('يُكرَّر المقطع كاملًا من أوله إلى آخره', 'The whole portion repeats from first to last ayah')
              : L('تكرار الآية الحالية', 'Repeats the current ayah')}
          </p>
          {player.error && <p className="text-center text-xs text-clay">{L('تعذّر تشغيل التلاوة. تحقّق من الاتصال.', 'Couldn’t play the recitation. Check your connection.')}</p>}

          {level < 3 ? (
            <Button size="lg" className="w-full" onClick={() => setLevel((level + 1) as RecallLevel)}>
              {level === 2 ? L('جاهز؟ اقرأها غيبًا', 'Ready? Recite from memory') : L('أخفِ أكثر', 'Hide more')}
              <Icon name="eyeOff" size={18} />
            </Button>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
              <Button size="lg" variant="outline" className="px-2 text-clay" onClick={() => (group ? markAll('forgot') : mark('forgot'))}>
                {L('نسيتها', 'Forgot')}
              </Button>
              <Button size="lg" variant="soft" className="px-2" onClick={() => (group ? markAll('practice') : mark('practice'))}>
                {L('تمرين', 'Practice')}
              </Button>
              <Button size="lg" variant="gold" className="whitespace-nowrap" onClick={() => (group ? markAll('memorized') : mark('memorized'))}>
                <Icon name="check" size={18} />
                {group ? L('حفظته كله', 'Memorised it all') : L('حفظتها', 'Memorised')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="rise w-full max-w-sm rounded-[2rem] bg-parchment p-7 text-center">
            <p className="font-arabic-display text-3xl">{L('استراحة قصيرة', 'A short pause')}</p>
            <p className="mt-2 text-muted">
              {L(`حفظت ${N(Object.values(results).filter((r) => r === 'memorized').length)} من ${N(list.length)} في هذه الجلسة.`, `${Object.values(results).filter((r) => r === 'memorized').length} of ${list.length} memorised this session.`)}
            </p>
            <div className="mt-6 space-y-2">
              <Button size="lg" className="w-full" onClick={resume}>
                <Icon name="play" size={18} fill />
                {L('متابعة', 'Resume')}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={finish}>
                {L('إنهاء الجلسة', 'Finish session')}
              </Button>
              <button type="button" onClick={() => navigate('/')} className="pt-2 text-sm text-muted underline">
                {L('الخروج دون تسجيل الوقت', 'Leave without logging time')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Completion({ s, list, results, minutes }: { s: number; list: number[]; results: Record<number, Result>; minutes: number }) {
  const { L, N, lang } = useL()
  const meta = surah(s)
  const mem = list.filter((a) => results[a] === 'memorized')
  const prac = list.filter((a) => results[a] === 'practice' || results[a] === 'forgot')
  return (
    <div className="pattern-night flex min-h-[100dvh] items-center justify-center px-6 py-10 text-parchment">
      <div className="rise w-full max-w-md text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold-soft">
          <Icon name="sparkle" size={36} />
        </span>
        <h1 className="mt-6 font-arabic-display text-4xl">{mem.length ? L('بارك الله في حفظك', 'May Allah bless your hifz') : L('أحسنت المحاولة', 'Good effort')}</h1>
        <p className="mt-3 text-parchment/70">{lang === 'ar' ? `سورة ${meta.ar} · ${N(list[0])}–${N(list[list.length - 1])}` : `${meta.en} · ${list[0]}–${list[list.length - 1]}`}</p>
        <div className="mt-8 grid grid-cols-3 gap-2">
          <Big v={N(mem.length)} l={L('حُفظت', 'memorised')} />
          <Big v={N(prac.length)} l={L('للتمرين', 'to practise')} />
          <Big v={N(minutes)} l={L('دقيقة', 'minutes')} />
        </div>
        <p className="mt-6 text-sm text-parchment/70">
          {mem.length ? L('ستعود إليك هذه الآيات غدًا في المراجعة، ثم تتباعد كلما ثبتت.', 'These ayat return tomorrow for revision, then less often as they settle.') : L('الآيات التي تحتاج تمرينًا ستبقى في وِرد اليوم.', 'Ayat that need practice stay in today’s portion.')}
        </p>
        <div className="mt-8 space-y-2">
          {mem.length > 0 && (
            <Button variant="light" size="lg" className="w-full" href={`#/recite?s=${s}&from=${list[0]}&to=${list[list.length - 1]}`}>
              <Icon name="mic" size={18} />
              {L('سمّع المقطع كاملًا', 'Recite the whole portion')}
            </Button>
          )}
          {prac.length > 0 && (
            <Button variant="soft" size="lg" className="w-full" href={`#/memorize?s=${s}&from=${prac[0]}&to=${prac[prac.length - 1]}`}>
              {L('تمرّن على ما تبقّى', 'Practise the rest')}
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

export function Big({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl bg-white/5 py-4 ring-1 ring-white/10">
      <p className="font-arabic-display text-3xl">{v}</p>
      <p className="text-xs text-parchment/60">{l}</p>
    </div>
  )
}

/** A calm, explicit start to every focused session. */
export function SessionIntro({ icon, kicker, title, sub, steps, onStart, onBack, startLabel }: { icon: string; kicker: string; title: string; sub: string; steps: string[]; onStart: () => void; onBack: () => void; startLabel?: string }) {
  const { L, N } = useL()
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10">
      <div className="rise w-full max-w-md">
        <div className="pattern-night rounded-[28px] p-7 text-parchment shadow-[0_24px_50px_-28px_rgba(20,60,40,.7)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Icon name={icon} />
          </span>
          <p className="mt-5 text-sm text-parchment/75">{kicker}</p>
          <h1 className="mt-1 font-arabic-display text-3xl">{title}</h1>
          <p className="mt-1 text-parchment/80">{sub}</p>
        </div>
        <ol className="mt-5 space-y-2">
          {steps.map((t, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-sm font-bold text-gold">{N(i + 1)}</span>
              <span className="text-[15px]">{t}</span>
            </li>
          ))}
        </ol>
        <Button size="lg" className="mt-6 w-full" onClick={onStart}>
          <Icon name="play" size={18} fill />
          {startLabel ?? L('ابدأ الجلسة', 'Start session')}
        </Button>
        <button type="button" onClick={onBack} className="mt-3 w-full py-2 text-sm text-muted">
          {L('ليس الآن', 'Not now')}
        </button>
      </div>
    </div>
  )
}
