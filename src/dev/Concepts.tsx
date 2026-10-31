import { useRef, useState } from 'react'
import sample from '../data/quran-sample.json'
import { toArabicDigits } from './QuranWords'

const nas = sample.surahs.find((s) => s.sura === 114)!
const ikhlas = sample.surahs.find((s) => s.sura === 112)!

export function Concepts() {
  return (
    <div className="space-y-16">
      <header className="max-w-3xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">UX exploration · not user-tested</p>
        <h2 className="font-display text-4xl leading-tight">Familiar gestures, a different purpose</h2>
        <p className="leading-relaxed text-ink/75">
          Scroll The Bible's insight was strategic: take an interaction people already know, the vertical feed, and point it at something worth their attention. We keep the low-friction
          "next" gesture and drop what makes feeds harmful: no endless supply, no variable rewards, no streak guilt. Each session has a size chosen up front and a real ending. The Quranic
          text below is the verbatim Tanzil sample; no explanatory text is generated.
        </p>
      </header>

      <Doors />

      <ConceptFrame
        n="1"
        name="Ayah Stream"
        idea="One ayah per screen. Swipe up for the next. Tap to act on the ayah in front of you."
        principles={['Next ayah = one swipe', 'Tap → memorise / recite / reflect', 'Session size set before starting', 'A real last card: “stop here”']}
      >
        <StreamPrototype />
      </ConceptFrame>

      <ConceptFrame
        n="2"
        name="Fade to Memory"
        idea="Words fade step by step until the learner recites from memory, then the engine checks only what it can support (word level)."
        principles={['Retrieval practice, not re-reading', 'First-letter cues before full hiding', 'Feedback says “possible”, never “wrong”', 'Next review scheduled, not a streak']}
      >
        <FadePrototype />
      </ConceptFrame>

      <ConceptFrame
        n="3"
        name="The Circle (Halaqa)"
        idea="The teacher stays the authority. AI flags arrive as suggestions that a teacher or parent confirms or dismisses; only confirmed ones become practice."
        principles={['Teacher confirms every flag', 'Dismissals improve future thresholds', 'Parents see effort, not scores', 'Consent per learner, per recording']}
      >
        <CirclePrototype />
      </ConceptFrame>

      <Assessment />
    </div>
  )
}

function Doors() {
  const doors = [
    { ar: 'أتعلّم الحروف', en: 'Learning to read Arabic', who: 'Young children, first-time readers', first: 'Letter sounds and joining (Qaida-style). No full-ayah correction yet; the engine is not tested on beginners.' },
    { ar: 'أقرأ وأريد الحفظ', en: 'I can read; I want to memorise', who: 'Children who read, adult learners', first: 'Ayah Stream → Fade to Memory on a short surah, 5–10 minute sessions.' },
    { ar: 'أراجع حفظي', en: 'Reviewing what I know', who: 'Experienced huffaz', first: 'Recite from memory with the page hidden. Tilawa-style verse tracking plus word-level checks. Spaced review queue.' },
    { ar: 'أعلّم أو أتابع', en: 'Teaching or supporting', who: 'Parents, Quran teachers', first: 'The Circle: assign, listen, confirm or dismiss AI suggestions. Manage consent for minors.' },
  ]
  return (
    <section className="space-y-5">
      <div className="max-w-3xl">
        <h3 className="font-display text-2xl">Four doors, not one funnel</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          The first question is "where are you starting?", not "sign up". Each door opens a different home screen. Learners move between doors as they grow, and nobody has to start at
          the alphabet if they don't need it.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {doors.map((d) => (
          <div key={d.en} className="flex flex-col rounded-2xl border border-rule bg-sheet p-5">
            <p dir="rtl" lang="ar" className="font-naskh text-2xl text-moss">
              {d.ar}
            </p>
            <p className="mt-1 font-medium">{d.en}</p>
            <p className="text-xs text-ink/55">{d.who}</p>
            <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-ink/75">{d.first}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ConceptFrame({ n, name, idea, principles, children }: { n: string; name: string; idea: string; principles: string[]; children: React.ReactNode }) {
  return (
    <section className="grid items-start gap-10 lg:grid-cols-[1fr_auto]">
      <div className="max-w-xl space-y-4 lg:pt-10">
        <p className="font-mono text-sm text-moss">Concept {n}</p>
        <h3 className="font-display text-3xl">{name}</h3>
        <p className="leading-relaxed text-ink/80">{idea}</p>
        <ul className="space-y-2 pt-2">
          {principles.map((p) => (
            <li key={p} className="flex gap-3 text-sm">
              <span className="mt-2 h-px w-4 shrink-0 bg-ink/40" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto">{children}</div>
    </section>
  )
}

function Phone({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <div className={`relative h-[600px] w-[300px] overflow-hidden rounded-[2.6rem] border-[10px] border-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)] ${tone === 'dark' ? 'bg-[#16201b] text-paper' : 'bg-sheet'}`}>
      {children}
    </div>
  )
}

function StreamPrototype() {
  const ayat = nas.ayat
  const [idx, setIdx] = useState(0)
  const [sheet, setSheet] = useState<number | null>(null)
  const [mode, setMode] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const total = ayat.length + 1

  return (
    <Phone tone="dark">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4 text-[11px] text-paper/70">
        <span>Today · {nas.name}</span>
        <span>
          {Math.min(idx + 1, ayat.length)} / {ayat.length}
        </span>
      </div>
      <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`w-1 rounded-full transition-all ${i === idx ? 'h-5 bg-paper' : 'h-1.5 bg-paper/30'}`} />
        ))}
      </div>
      <div
        ref={ref}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
        className="h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]"
      >
        {ayat.map((a) => (
          <button
            key={a.aya}
            type="button"
            onClick={() => (setSheet(a.aya), setMode(null))}
            className="flex h-full w-full snap-start flex-col items-center justify-center px-8 text-center"
            aria-label={`Ayah ${a.aya}. Tap for actions`}
          >
            <p dir="rtl" lang="ar" className="font-quran text-[2rem] leading-[2.2]">
              {a.text}
            </p>
            <p className="mt-4 font-quran text-lg text-paper/50">﴿{toArabicDigits(a.aya)}﴾</p>
            <p className="mt-10 text-[11px] text-paper/40">tap to practise · swipe up for next</p>
          </button>
        ))}
        <div className="flex h-full snap-start flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="font-display text-2xl">That's today's portion.</p>
          <p className="text-sm leading-relaxed text-paper/70">You met all {ayat.length} ayat of {nas.name}. The stream ends here on purpose.</p>
          <div className="mt-4 flex w-full flex-col gap-2 text-sm">
            <span className="rounded-full bg-paper px-4 py-2.5 text-ink">Recite the whole surah once</span>
            <span className="rounded-full border border-paper/30 px-4 py-2.5">Done for today</span>
          </div>
          <p className="mt-2 text-[11px] text-paper/50">Next review suggested: tomorrow, after Fajr</p>
        </div>
      </div>
      {sheet != null && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/40" onClick={() => setSheet(null)}>
          <div className="w-full rounded-t-3xl bg-sheet p-5 text-ink" onClick={(e) => e.stopPropagation()}>
            <p dir="rtl" lang="ar" className="font-quran text-xl leading-loose">
              {ayat.find((a) => a.aya === sheet)?.text}
            </p>
            {!mode ? (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  ['حفظ', 'Memorise'],
                  ['تلاوة', 'Recite'],
                  ['تدبّر', 'Reflect'],
                ].map(([ar, en]) => (
                  <button key={en} type="button" onClick={() => setMode(en)} className="rounded-2xl border border-rule px-2 py-3 hover:border-ink">
                    <span dir="rtl" className="block font-naskh text-lg">
                      {ar}
                    </span>
                    {en}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-paper p-4 text-xs leading-relaxed">
                {mode === 'Memorise' && 'Opens Fade to Memory for this ayah (Concept 2).'}
                {mode === 'Recite' && 'Records this ayah only and checks it word by word. Feedback appears on the ayah itself, within seconds.'}
                {mode === 'Reflect' && (
                  <>
                    <strong>Tafsir panel.</strong> Shows a licensed, attributed tafsir (e.g. a scholar-reviewed simplified tafsir) chosen with qualified advisers. Placeholder: no
                    explanatory text is generated or invented here.
                  </>
                )}
                <button type="button" onClick={() => setMode(null)} className="mt-3 block underline">
                  back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Phone>
  )
}

function FadePrototype() {
  const ayah = ikhlas.ayat[2]
  const [level, setLevel] = useState(0)
  const [checked, setChecked] = useState(false)
  const levels = ['Read', 'Cue', 'Hidden', 'Recite']
  // Cue level keeps every other word visible; hidden level removes all of them.
  const hidden = ayah.words.map((_, i) => i)

  const show = (i: number, w: string) => {
    if (level === 0) return w
    if (level === 1) return i % 2 === 0 ? w : null
    return null
  }

  return (
    <Phone>
      <div className="flex h-full flex-col px-6 pb-6 pt-8">
        <p className="text-[11px] text-ink/60">
          {ikhlas.name} · ayah {ayah.aya}
        </p>
        <div className="mt-3 flex gap-1">
          {levels.map((l, i) => (
            <button key={l} type="button" onClick={() => (setLevel(i), setChecked(false))} className={`flex-1 rounded-full py-1.5 text-[11px] ${i <= level ? 'bg-moss text-paper' : 'bg-rule/60 text-ink/60'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p dir="rtl" lang="ar" className="text-center font-quran text-[2rem] leading-[2.4]">
            {hidden.map((i) => {
              const w = ayah.words[i]
              const s = show(i, w)
              return s ? (
                <span key={i} className="px-1">
                  {s}{' '}
                </span>
              ) : (
                <span key={i} className="mx-1 inline-block h-3 rounded-full bg-ink/15 align-middle" style={{ width: `${Math.max(2, w.length * 0.55)}rem` }} aria-label="hidden word" />
              )
            })}
          </p>
        </div>
        {level < 3 ? (
          <button type="button" onClick={() => setLevel(level + 1)} className="rounded-full bg-ink py-3 text-sm text-paper">
            {level === 2 ? 'I’m ready to recite' : 'Hide more'}
          </button>
        ) : !checked ? (
          <button type="button" onClick={() => setChecked(true)} className="flex items-center justify-center gap-2 rounded-full bg-alert py-3 text-sm text-paper">
            <span className="h-2.5 w-2.5 rounded-full bg-paper" /> Hold to recite
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl bg-paper p-4 text-xs leading-relaxed">
            <p className="font-semibold">How feedback would read here</p>
            <p>
              "We may not have heard the word <span className="font-quran text-base">{ayah.words[1]}</span>. Want to listen to it and try once more?"
            </p>
            <p className="text-ink/60">Illustrative wording only. In the product this comes from a real engine result, or says "we couldn't hear clearly".</p>
            <p className="border-t border-rule pt-2 text-ink/70">Next review: in 1 day → 3 days → 7 days</p>
          </div>
        )}
      </div>
    </Phone>
  )
}

function CirclePrototype() {
  const [items, setItems] = useState([
    { id: 1, who: 'Maryam (9)', where: `${ikhlas.name} 3`, word: ikhlas.ayat[2].words[2], kind: 'Possible omission', state: 'pending' as 'pending' | 'confirmed' | 'dismissed' },
    { id: 2, who: 'Maryam (9)', where: `${ikhlas.name} 4`, word: ikhlas.ayat[3].words[3], kind: 'Possible different word', state: 'pending' as 'pending' | 'confirmed' | 'dismissed' },
    { id: 3, who: 'Yusuf (12)', where: `${nas.name} 1`, word: nas.ayat[0].words[3], kind: 'Madd length (rule-backed)', state: 'pending' as 'pending' | 'confirmed' | 'dismissed' },
  ])
  const set = (id: number, state: 'confirmed' | 'dismissed') => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, state } : x)))
  return (
    <Phone>
      <div className="flex h-full flex-col px-5 pb-5 pt-8">
        <p className="text-[11px] text-ink/60">Teacher view · Thursday circle</p>
        <p className="mt-1 font-display text-xl">3 suggestions to review</p>
        <p className="text-[11px] text-ink/55">Sample entries to show the flow. Not real learner data.</p>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {items.map((x) => (
            <div key={x.id} className={`rounded-2xl border p-3 ${x.state === 'pending' ? 'border-rule bg-paper/60' : x.state === 'confirmed' ? 'border-moss/40 bg-moss/5' : 'border-rule opacity-50'}`}>
              <div className="flex items-center justify-between text-[11px] text-ink/60">
                <span>{x.who}</span>
                <span>{x.where}</span>
              </div>
              <p dir="rtl" lang="ar" className="mt-1 font-quran text-2xl">
                {x.word}
              </p>
              <p className="text-xs">{x.kind}</p>
              {x.state === 'pending' ? (
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="rounded-full border border-rule px-3 py-1.5">▶ clip</span>
                  <button type="button" onClick={() => set(x.id, 'confirmed')} className="rounded-full bg-moss px-3 py-1.5 text-paper">
                    Confirm
                  </button>
                  <button type="button" onClick={() => set(x.id, 'dismissed')} className="rounded-full border border-ink/30 px-3 py-1.5">
                    Not an error
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-ink/60">{x.state === 'confirmed' ? 'Added to the learner’s practice list' : 'Dismissed. Logged as a false alert for calibration'}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink/55">Clips are kept only if the parent opted in, and are deleted after review.</p>
      </div>
    </Phone>
  )
}

function Assessment() {
  const rows = [
    ['Ayah Stream', 'Very low friction; one gesture to learn', 'Large text, one item per screen; must offer button navigation as well as swipe, and respect reduced motion', 'Good for exposure and reading; weak alone for retention', 'Feed patterns can pull towards mindless scrolling, so the session cap and end card are essential'],
    ['Fade to Memory', 'Clear steps; needs a short first-time demo', 'Hidden-word placeholders need screen-reader labels; audio-first variant for low vision', 'Strongest: retrieval practice plus spacing', 'Must never make a child feel “wrong”; wording reviewed by teachers'],
    ['The Circle', 'Extra role to manage; worth it for families and maktabs', 'Teacher review is mostly listening, so it suits audio-first use', 'Highest-quality feedback, because a human confirms it', 'Best fit with mushafahah: AI assists, the teacher decides'],
  ]
  return (
    <section className="space-y-4">
      <h3 className="font-display text-2xl">Design assessment</h3>
      <p className="max-w-3xl text-sm text-ink/70">
        This is design judgment, not user research. A likely direction is to combine all three: the Stream for daily reading, Fade to Memory for hifz, and the Circle wrapping both
        whenever a teacher or parent is present. Validate with paper prototypes in two settings: a home with children and a mosque class.
      </p>
      <div className="overflow-x-auto rounded-xl border border-rule bg-sheet">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs text-ink/60">
              {['Concept', 'Usability', 'Accessibility', 'Memorisation effectiveness', 'Suitability / adab'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-rule/60 align-top last:border-0">
                {r.map((c, i) => (
                  <td key={i} className={`px-3 py-3 text-xs leading-relaxed ${i === 0 ? 'font-medium text-sm' : 'text-ink/75'}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
