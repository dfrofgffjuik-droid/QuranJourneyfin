import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { AyahMark, Bismillah } from '../components/Mushaf'
import { Button, Card, ScreenHeader, Section } from '../components/ui'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { hasBismillahHeader, SHORT_SURAHS_FOR_KIDS, surah } from '../lib/quran'
import { useSurah } from '../lib/useSurah'
import { useAyahPlayer } from '../lib/player'
import { logDay, markMemorized, memorizedCount, updateActive, useActive } from '../lib/store'
import { forms, GROUPS, HARAKAT, JOIN_WORDS, LETTERS, READING_LESSONS } from './kidsData'

const TILE = ['bg-kid-1', 'bg-kid-2', 'bg-kid-3', 'bg-kid-4', 'bg-kid-5']

const KIDS_RECITER = 'husary_muallim'

function Praise({ show, text }: { show: boolean; text: string }) {
  if (!show) return null
  return (
    <div className="rise flex items-center justify-center gap-2 rounded-2xl bg-leaf/10 px-4 py-3 text-leaf">
      <Icon name="star" fill size={20} />
      <span className="font-semibold">{text}</span>
    </div>
  )
}

export function KidsHome() {
  const { L, N } = useL()
  const p = useActive()!
  const learned = Object.keys(p.kids.letters).length
  const nextLetter = LETTERS.find((l) => !p.kids.letters[l.ch])
  const nextSurah = SHORT_SURAHS_FOR_KIDS.find((s) => memorizedCount(p, s) < surah(s).ayat)
  const cards = [
    { href: '#/kids/letters', icon: 'letters', ar: 'الحروف وأصواتها', en: 'Letters & sounds', sub: L(`${N(learned)} من ٢٨`, `${learned} of 28`), tone: TILE[0] },
    { href: '#/kids/harakat', icon: 'sparkle', ar: 'الحركات', en: 'Harakat', sub: L('فَتحة، كَسرة، ضَمّة', 'a, i, u'), tone: TILE[1] },
    { href: '#/kids/joining', icon: 'layers', ar: 'وصل الحروف', en: 'Joining letters', sub: L('اصنع كلمة', 'Build a word'), tone: TILE[2] },
    { href: '#/kids/reading', icon: 'book', ar: 'أقرأ', en: 'I can read', sub: L('تمارين قصيرة', 'Short drills'), tone: TILE[3] },
    { href: '#/kids/surahs', icon: 'heart', ar: 'سوري القصيرة', en: 'My short surahs', sub: L('استمع وكرّر', 'Listen & repeat'), tone: TILE[4] },
  ]
  return (
    <div className="space-y-8">
      <header className="rise flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-sky/15 text-3xl font-bold text-sky">{[...p.name][0]}</span>
        <div>
          <p className="text-muted">{L('أهلًا وسهلًا', 'Welcome')}</p>
          <h1 className="font-arabic-display text-4xl">{p.name}</h1>
        </div>
      </header>

      <div className="pattern-night rounded-[2rem] p-6 text-parchment md:p-8">
        <p className="text-sm text-gold-soft">{L('درس اليوم', 'Today’s lesson')}</p>
        {nextLetter ? (
          <div className="mt-3 flex items-center gap-6">
            <span className="font-quran text-[5.5rem] leading-[1.4] text-gold-soft">{nextLetter.ch}</span>
            <div>
              <p className="font-arabic-display text-3xl">{L(`حرف ال${nextLetter.name}`, `The letter ${nextLetter.name}`)}</p>
              <Button variant="gold" className="mt-4" href={`#/kids/letters/${encodeURIComponent(nextLetter.ch)}`}>
                {L('هيّا نتعلّم', 'Let’s learn')}
              </Button>
            </div>
          </div>
        ) : nextSurah ? (
          <div className="mt-3">
            <p className="font-arabic-display text-3xl">{L(`سورة ${surah(nextSurah).ar}`, `Surah ${surah(nextSurah).en}`)}</p>
            <Button variant="gold" className="mt-4" href={`#/kids-surah/${nextSurah}`}>
              {L('استمع وكرّر', 'Listen & repeat')}
            </Button>
          </div>
        ) : (
          <p className="mt-3 font-arabic-display text-3xl">{L('ما شاء الله! أتممت الدروس', 'Masha’Allah! All lessons done')}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <a key={c.href} href={c.href} className={`rounded-[1.8rem] p-5 transition hover:-translate-y-0.5 ${c.tone}`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card/70">
              <Icon name={c.icon} />
            </span>
            <p className="mt-4 text-lg font-semibold">{L(c.ar, c.en)}</p>
            <p className="text-sm text-night/60">{c.sub}</p>
          </a>
        ))}
      </div>
      <p className="text-center text-sm text-muted">{L('اطلب من والديك أو معلّمك أن يقرأ معك، فالقرآن يُتلقّى بالسماع.', 'Ask a parent or teacher to read with you. The Quran is learned by listening.')}</p>
    </div>
  )
}

export function KidsLetters() {
  const { L, N } = useL()
  const p = useActive()!
  const learned = Object.keys(p.kids.letters).length
  return (
    <div>
      <ScreenHeader backTo="#/" title={L('الحروف', 'Letters')} subtitle={L(`تعلّمت ${N(learned)} من ${N(LETTERS.length)}`, `${learned} of ${LETTERS.length} learned`)} />
      <div dir="rtl" className="grid grid-cols-4 gap-3 sm:grid-cols-7">
        {LETTERS.map((l, i) => {
          const ok = p.kids.letters[l.ch]
          return (
            <a key={l.ch} href={`#/kids/letters/${encodeURIComponent(l.ch)}`} className={`relative flex aspect-square flex-col items-center justify-center rounded-[1.4rem] ${TILE[i % TILE.length]} transition hover:-translate-y-0.5`}>
              <span className="font-quran text-5xl leading-[1.45]">{l.ch}</span>
              <span className="mt-1 text-[11px] text-night/60">{l.name}</span>
              {ok && (
                <span className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-white">
                  <Icon name="star" fill size={13} />
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function KidsLetter({ letter }: { letter: string }) {
  const { L, N } = useL()
  const p = useActive()!
  const idx = LETTERS.findIndex((l) => l.ch === letter)
  const l = LETTERS[Math.max(0, idx)]
  const f = forms(l)
  const g = GROUPS[l.group]
  const ok = !!p.kids.letters[l.ch]
  const prev = LETTERS[idx - 1]
  const next = LETTERS[idx + 1]
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader backTo="#/kids/letters" title={L(`حرف ال${l.name}`, `The letter ${l.name}`)} subtitle={L(`الحرف ${N(idx + 1)} من ٢٨`, `Letter ${idx + 1} of 28`)} />
      <div className={`flex flex-col items-center rounded-[2.2rem] py-10 ${TILE[idx % TILE.length]}`}>
        <span className="font-quran text-[8rem] leading-[1.35]">{l.ch}</span>
        <span className="mt-4 font-naskh text-3xl">{l.name}</span>
        <span className="mt-1 text-sm text-night/60" dir="ltr">
          {L('صوته يشبه', 'Sounds like')} “{l.sound}”
        </span>
      </div>

      <Section title={L('أشكال الحرف في الكلمة', 'Shapes in a word')} className="mt-8">
        <div dir="rtl" className="grid grid-cols-4 gap-2 text-center">
          {[
            [f.isolated, 'منفصل', 'Alone'],
            [f.initial, 'في الأول', 'Start'],
            [f.medial, 'في الوسط', 'Middle'],
            [f.final, 'في الآخر', 'End'],
          ].map(([ch, ar, en]) => (
            <div key={ar} className="rounded-2xl bg-card py-4 ring-1 ring-line">
              <span className="block font-quran text-5xl leading-[1.7]">{ch}</span>
              <span className="block text-xs text-muted">{L(ar, en)}</span>
            </div>
          ))}
        </div>
        {!l.joinsNext && <p className="text-sm text-muted">{L('هذا الحرف لا يتّصل بما بعده.', 'This letter never joins to the letter after it.')}</p>}
      </Section>

      <Card className="mt-6 flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft/60">
          <Icon name="wave" />
        </span>
        <div>
          <p className="font-semibold">{L(`من أين يخرج؟ ${g.ar}`, `Where is it made? ${g.en}`)}</p>
          <p className="text-sm text-muted">{L(g.hint[0], g.hint[1])}</p>
        </div>
      </Card>

      <p className="mt-6 rounded-2xl bg-sky/10 p-4 text-center text-sky">{L('قل اسم الحرف وصوته مع والديك أو معلّمك ثلاث مرات.', 'Say the letter’s name and sound with your parent or teacher, three times.')}</p>

      <div className="mt-6 flex items-center justify-between gap-3">
        {prev ? (
          <Button variant="outline" href={`#/kids/letters/${encodeURIComponent(prev.ch)}`}>
            {prev.ch}
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="lg"
          variant={ok ? 'soft' : 'gold'}
          onClick={() => {
            updateActive((x) => logDay({ ...x, kids: { ...x.kids, letters: { ...x.kids.letters, [l.ch]: true } } }, ok ? {} : { practiced: 1 }))
            if (next) navigate(`/kids/letters/${encodeURIComponent(next.ch)}`)
          }}
        >
          <Icon name="star" fill={ok} size={18} />
          {ok ? L('تعلّمته، التالي', 'Learned · next') : L('تعلّمت هذا الحرف', 'I learned this letter')}
        </Button>
        {next ? (
          <Button variant="outline" href={`#/kids/letters/${encodeURIComponent(next.ch)}`}>
            {next.ch}
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}

export function KidsHarakat() {
  const { L } = useL()
  const [base, setBase] = useState(LETTERS[1])
  const [quiz, setQuiz] = useState(() => makeQuiz())
  const [answer, setAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  function makeQuiz() {
    const l = LETTERS[1 + Math.floor(Math.random() * 26)]
    const opts = [0, 1, 2].sort(() => Math.random() - 0.5)
    return { l, opts, target: opts[Math.floor(Math.random() * 3)] }
  }
  const correct = answer != null && answer === quiz.target

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader backTo="#/" title={L('الحركات', 'Harakat')} subtitle={L('الحركة تخبرنا كيف ننطق الحرف', 'The haraka tells us how to say the letter')} />
      <div dir="rtl" className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {LETTERS.slice(1).map((l) => (
          <button key={l.ch} type="button" onClick={() => setBase(l)} className={`h-12 min-w-12 rounded-2xl font-quran text-2xl ${base.ch === l.ch ? 'bg-night text-parchment' : 'bg-card ring-1 ring-line'}`}>
            {l.ch}
          </button>
        ))}
      </div>
      <div dir="rtl" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {HARAKAT.map((h, i) => (
          <div key={h.en} className={`rounded-[1.6rem] p-4 text-center ${TILE[i % TILE.length]}`}>
            <span className="font-quran text-6xl leading-[1.5]">{base.ch + h.mark}</span>
            <span className="block font-naskh">{h.ar}</span>
            <span className="block text-xs text-night/55" dir="ltr">
              {h.sound(base.sound.split(' ')[0])}
            </span>
          </div>
        ))}
      </div>

      <Section title={L('لعبة صغيرة', 'A little game')} className="mt-10">
        <Card className="p-6 text-center">
          <p className="text-lg">
            {L('أيّها يُنطق', 'Which one sounds like')} <span dir="ltr" className="font-semibold">“{HARAKAT[quiz.target].sound(quiz.l.sound.split(' ')[0])}”</span>؟
          </p>
          <div dir="rtl" className="mt-5 flex justify-center gap-3">
            {quiz.opts.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  setAnswer(o)
                  if (o === quiz.target) {
                    setScore((s) => s + 1)
                    updateActive((x) => logDay({ ...x, kids: { ...x.kids, lessons: { ...x.kids.lessons, harakat: (x.kids.lessons.harakat ?? 0) + 1 } } }, { practiced: 1 }))
                  }
                }}
                className={`h-24 w-24 rounded-[1.6rem] font-quran text-5xl ring-2 transition ${answer === o ? (o === quiz.target ? 'bg-leaf/15 ring-leaf' : 'bg-gold-soft/50 ring-gold') : 'bg-card ring-line hover:ring-night/30'}`}
              >
                {quiz.l.ch + HARAKAT[o].mark}
              </button>
            ))}
          </div>
          <div className="mt-5 min-h-12">
            {answer != null &&
              (correct ? (
                <Praise show text={L('أحسنت! إجابة رائعة', 'Well done! Great answer')} />
              ) : (
                <p className="text-night/70">
                  {L('قريب! هذه تُنطق', 'Close! This one says')} <span dir="ltr">“{HARAKAT[answer].sound(quiz.l.sound.split(' ')[0])}”</span>. {L('جرّب مرة أخرى', 'Try again')}
                </p>
              ))}
          </div>
          <Button
            className="mt-2"
            variant={correct ? 'gold' : 'outline'}
            onClick={() => {
              setQuiz(makeQuiz())
              setAnswer(null)
            }}
          >
            {L('سؤال جديد', 'New question')}
          </Button>
          {score > 0 && <p className="mt-3 text-sm text-muted">{L(`أجبت ${score} إجابات صحيحة`, `${score} correct so far`)}</p>}
        </Card>
      </Section>
    </div>
  )
}

export function KidsJoining() {
  const { L } = useL()
  const [wi, setWi] = useState(0)
  const target = JOIN_WORDS[wi]
  const [picked, setPicked] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const pool = useMemo(() => {
    const extra = LETTERS.filter((l) => !target.letters.includes(l.ch))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((l) => l.ch)
    return [...new Set([...target.letters, ...extra])].sort(() => Math.random() - 0.5)
  }, [target])
  const done = picked.length === target.letters.length

  useEffect(() => {
    if (done) updateActive((x) => logDay(x, { practiced: 1 }))
  }, [done])

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader backTo="#/" title={L('وصل الحروف', 'Joining letters')} subtitle={L('اضغط الحروف بالترتيب لتصنع الكلمة', 'Tap the letters in order to build the word')} />
      <Card className="p-6 text-center">
        <p className="text-sm text-muted">{L(`كلمة ${wi + 1} من ${JOIN_WORDS.length}`, `Word ${wi + 1} of ${JOIN_WORDS.length}`)}</p>
        <p dir="rtl" className="mt-2 font-naskh text-xl text-muted">
          {target.letters.join(' + ')}
        </p>
        <p dir="rtl" className="mt-4 min-h-28 font-quran text-[5rem] leading-tight">
          {picked.join('') || <span className="text-night/15">{target.word}</span>}
        </p>
        <Praise show={done} text={L(`أحسنت! «${target.meaning[0]}»`, `Well done! “${target.meaning[1]}”`)} />
        {!done && (
          <div dir="rtl" className="mt-6 flex flex-wrap justify-center gap-3">
            {pool.map((ch, i) => (
              <button
                key={ch + i}
                type="button"
                onClick={() => {
                  if (ch === target.letters[picked.length]) {
                    setPicked((x) => [...x, ch])
                    setWrong(null)
                  } else setWrong(ch)
                }}
                className={`h-20 w-20 rounded-[1.4rem] font-quran text-5xl ring-2 transition ${wrong === ch ? 'bg-gold-soft/50 ring-gold' : 'bg-card ring-line hover:ring-night/30'}`}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
        {wrong && !done && <p className="mt-3 text-sm text-night/70">{L('ليس بعد. ابحث عن الحرف التالي في الكلمة', 'Not yet. Look for the next letter in the word')}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="ghost" onClick={() => setPicked([])}>
            {L('من جديد', 'Start over')}
          </Button>
          <Button
            variant={done ? 'gold' : 'outline'}
            onClick={() => {
              setWi((wi + 1) % JOIN_WORDS.length)
              setPicked([])
              setWrong(null)
            }}
          >
            {L('الكلمة التالية', 'Next word')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function KidsReading() {
  const { L, N } = useL()
  const p = useActive()!
  const [lesson, setLesson] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const cur = READING_LESSONS.find((x) => x.id === lesson)

  if (!cur)
    return (
      <div className="mx-auto max-w-2xl">
        <ScreenHeader backTo="#/" title={L('أقرأ', 'I can read')} subtitle={L('يقرأ الطفل بصوت عالٍ، ويضغط المرافق على النتيجة', 'The child reads aloud; the adult taps how it went')} />
        <div className="space-y-3">
          {READING_LESSONS.map((x, k) => {
            const best = p.kids.lessons[`read-${x.id}`] ?? 0
            return (
              <Card key={x.id} onClick={() => (setLesson(x.id), setI(0), setResults([]))} className="flex items-center gap-4 p-5">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl font-quran text-2xl ${TILE[k % TILE.length]}`}>{x.items[0]}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{L(x.ar, x.en)}</span>
                  <span className="block text-sm text-muted">{best ? L(`أفضل نتيجة: ${N(best)} من ${N(x.items.length)}`, `Best: ${best} of ${x.items.length}`) : L(`${N(x.items.length)} تمارين`, `${x.items.length} items`)}</span>
                </span>
                {best >= x.items.length && <Icon name="star" fill className="text-gold" />}
              </Card>
            )
          })}
        </div>
      </div>
    )

  if (i >= cur.items.length) {
    const good = results.filter(Boolean).length
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-soft/60 text-gold">
          <Icon name="star" fill size={36} />
        </span>
        <h1 className="mt-5 font-arabic-display text-4xl">{good === cur.items.length ? L('ممتاز! ما شاء الله', 'Excellent! Masha’Allah') : L('أحسنت المحاولة!', 'Good effort!')}</h1>
        <p className="mt-2 text-muted">{L(`قرأت ${N(good)} من ${N(cur.items.length)} بشكل صحيح`, `${good} of ${cur.items.length} read well`)}</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="outline" onClick={() => (setI(0), setResults([]))}>
            {L('مرة أخرى', 'Again')}
          </Button>
          <Button onClick={() => setLesson(null)}>{L('الدروس', 'Lessons')}</Button>
        </div>
      </div>
    )
  }

  const mark = (ok: boolean) => {
    const r = [...results, ok]
    setResults(r)
    if (i === cur.items.length - 1) {
      const good = r.filter(Boolean).length
      updateActive((x) => logDay({ ...x, kids: { ...x.kids, lessons: { ...x.kids.lessons, [`read-${cur.id}`]: Math.max(good, x.kids.lessons[`read-${cur.id}`] ?? 0) } } }, { practiced: 1 }))
    }
    setI(i + 1)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={L(cur.ar, cur.en)} subtitle={L(`${N(i + 1)} من ${N(cur.items.length)}`, `${i + 1} of ${cur.items.length}`)} action={<Button variant="ghost" size="sm" onClick={() => setLesson(null)}>{L('خروج', 'Exit')}</Button>} />
      <div className="flex gap-1">
        {cur.items.map((_, k) => (
          <span key={k} className={`h-2 flex-1 rounded-full ${k < i ? (results[k] ? 'bg-leaf' : 'bg-gold') : k === i ? 'bg-night' : 'bg-night/10'}`} />
        ))}
      </div>
      <div key={i} className={`rise mt-8 flex min-h-64 items-center justify-center rounded-[2.4rem] ${TILE[i % TILE.length]}`}>
        <span dir="rtl" className="font-quran text-[6.5rem] leading-[1.6]">
          {cur.items[i]}
        </span>
      </div>
      <p className="mt-4 text-center text-muted">{L('اقرأها بصوت واضح', 'Read it out clearly')}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button size="lg" variant="outline" onClick={() => mark(false)}>
          {L('نحاول مرة أخرى', 'Let’s try again')}
        </Button>
        <Button size="lg" className="bg-leaf hover:bg-leaf/90" onClick={() => mark(true)}>
          <Icon name="star" fill size={18} />
          {L('قرأها جيدًا', 'Read it well')}
        </Button>
      </div>
    </div>
  )
}

export function KidsSurahs() {
  const { L, A } = useL()
  const p = useActive()!
  return (
    <div>
      <ScreenHeader backTo="#/" title={L('سوري القصيرة', 'My short surahs')} subtitle={L('استمع للمعلّم، ثم كرّر بعده', 'Listen to the teacher, then repeat')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORT_SURAHS_FOR_KIDS.map((s, k) => {
          const m = memorizedCount(p, s)
          const all = m >= surah(s).ayat
          return (
            <a key={s} href={`#/kids-surah/${s}`} className={`flex items-center gap-4 rounded-[1.8rem] p-5 transition hover:-translate-y-0.5 ${TILE[k % TILE.length]}`}>
              <span dir="rtl" className="font-quran text-3xl">
                {surah(s).ar}
              </span>
              <span className="flex-1 text-end text-sm text-night/60">{A(surah(s).ayat)}</span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${all ? 'bg-gold text-white' : 'bg-card/70 text-night/25'}`}>
                <Icon name="star" fill size={18} />
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function KidsSurah({ n }: { n: number }) {
  const { L, N, lang } = useL()
  const meta = surah(n)
  const { ayat } = useSurah(n)
  const player = useAyahPlayer(KIDS_RECITER)
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(false)
  const [yourTurn, setYourTurn] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Listen → child's turn (pause) → next ayah.
  const cycle = (k: number) => {
    setI(k)
    setYourTurn(false)
    player.play(n, k + 1, 1, () => {
      setYourTurn(true)
      timer.current = setTimeout(() => {
        setYourTurn(false)
        if (k + 1 < meta.ayat) cycle(k + 1)
        else setAuto(false)
      }, 5000)
    })
  }
  const stopAll = () => {
    clearTimeout(timer.current)
    player.stop()
    setAuto(false)
    setYourTurn(false)
  }

  if (done)
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-kid-1 p-6 text-center">
        <div className="rise max-w-sm">
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gold text-white">
            <Icon name="star" fill size={44} />
          </span>
          <h1 className="mt-6 font-arabic-display text-4xl">{L('ما شاء الله! حفظت السورة', 'Masha’Allah! You memorised it')}</h1>
          <p className="mt-2 text-night/60">{L(`سورة ${meta.ar} في قلبك. سنراجعها معًا غدًا.`, `Surah ${meta.en} is in your heart. We’ll revise it tomorrow.`)}</p>
          <Button size="lg" className="mt-8" href="#/kids/surahs">
            {L('سوري', 'My surahs')}
          </Button>
        </div>
      </div>
    )

  return (
    <div className="flex min-h-[100dvh] flex-col bg-kid-bg">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-5">
        <button type="button" onClick={() => (stopAll(), navigate('/kids/surahs'))} className="flex h-12 w-12 items-center justify-center rounded-full bg-card ring-1 ring-line" aria-label={L('خروج', 'Exit')}>
          <Icon name="x" />
        </button>
        <p className="flex-1 text-center font-arabic-display text-2xl">{L(`سورة ${meta.ar}`, `Surah ${meta.en}`)}</p>
        <span className="min-w-12 whitespace-nowrap text-center tabular-nums text-muted">
          {L(`${N(i + 1)} من ${N(meta.ayat)}`, `${i + 1} of ${meta.ayat}`)}
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6">
        {i === 0 && hasBismillahHeader(n) && <Bismillah className="mb-4 text-night/60" />}
        {ayat ? (
          <p key={i} dir="rtl" lang="ar" className="rise mushaf text-center" style={{ fontSize: 'clamp(2.2rem, 7vw, 3.4rem)' }}>
            {ayat[i]}
            <AyahMark n={i + 1} />
          </p>
        ) : (
          <div className="h-40 animate-pulse rounded-3xl bg-night/5" />
        )}
        <div className="mt-6 flex min-h-14 justify-center">
          {player.playing ? (
            <span className="flex items-center gap-2 rounded-full bg-sky/10 px-5 py-3 text-sky">
              <Icon name="wave" /> {L('استمع للمعلّم…', 'Listen to the teacher…')}
            </span>
          ) : yourTurn ? (
            <span className="rise flex items-center gap-2 rounded-full bg-gold-soft/70 px-5 py-3 font-semibold">
              <Icon name="mic" /> {L('دورك! كرّر الآية', 'Your turn! Repeat the ayah')}
            </span>
          ) : null}
        </div>
        {player.error && <p className="text-center text-sm text-clay">{L('تعذّر تشغيل الصوت. اطلب من والديك المساعدة.', 'Audio didn’t play. Ask a parent for help.')}</p>}
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center gap-4">
          <button type="button" disabled={i === 0} onClick={() => (stopAll(), setI(i - 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-card ring-1 ring-line disabled:opacity-30" aria-label={L('السابقة', 'Previous')}>
            <Icon name="chevron" className={lang === 'ar' ? '' : 'rotate-180'} />
          </button>
          <button
            type="button"
            onClick={() => (auto ? stopAll() : (setAuto(true), cycle(i)))}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${auto ? 'bg-clay' : 'bg-leaf'}`}
            aria-label={auto ? L('إيقاف', 'Stop') : L('استمع وكرّر', 'Listen and repeat')}
          >
            <Icon name={auto ? 'stop' : 'play'} size={32} fill />
          </button>
          <button type="button" disabled={i >= meta.ayat - 1} onClick={() => (stopAll(), setI(i + 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-card ring-1 ring-line disabled:opacity-30" aria-label={L('التالية', 'Next')}>
            <Icon name="chevron" className={lang === 'ar' ? 'rotate-180' : ''} />
          </button>
        </div>
        <Button
          size="lg"
          variant="gold"
          className="w-full"
          onClick={() => {
            stopAll()
            updateActive((x) => {
              let y = x
              for (let a = 1; a <= meta.ayat; a++) y = markMemorized(y, n, a)
              return y
            })
            setDone(true)
          }}
        >
          <Icon name="star" fill size={18} />
          {L('حفظت السورة كلها', 'I know the whole surah')}
        </Button>
      </div>
    </div>
  )
}
