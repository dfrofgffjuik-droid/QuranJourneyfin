import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { AyahMark } from '../components/Mushaf'
import { RangePicker, type Range } from '../components/RangePicker'
import { AiNotice } from '../components/AiNotice'
import { Button, Card, Pill, ScreenHeader, Section, Sheet } from '../components/ui'
import { useL } from '../lib/i18n'
import { hifzPlanOf } from '../lib/plans'
import { loadSurah, surah, words } from '../lib/quran'
import { blobToMono16k, encodeWav, startRecording, type Recorder } from '../lib/audio'
import { analyze, type Analysis } from '../lib/muaalem'
import { describe, laneOf, wordLabel } from '../lib/lanes'
import { useEngine } from '../lib/useEngine'
import { putAudio } from '../lib/idb'
import { setState, uid, useActive, useStore, type Observation, type Submission } from '../lib/store'
import { today } from '../lib/date'
import { rangeLabel } from './Home'

const MAX_RECORD_S = 120
const MAX_ANALYZE_S = 30

type Clip = { wav: Blob; url: string; seconds: number; name: string }

export function toObservations(r: Analysis): Observation[] {
  if (!r.reliable) return []
  return r.errors.map((e) => {
    const lane = laneOf(e)
    const ws = e.word_indices.map((i) => r.words[i]?.text).filter(Boolean).join(' ')
    const rules = [...(e.ref_tajweed_rules || []), ...(e.missing_tajweed_rules || []), ...(e.replaced_tajweed_rules || [])]
    return {
      lane,
      words: ws,
      label: lane === 'word' ? wordLabel(e) : lane === 'tajweed' ? rules.map((x) => x.name.ar).join('، ') : describe(e),
      detail: lane === 'tajweed' && e.expected_len != null ? `expected ≈${e.expected_len}, heard ≈${e.predicted_len ?? '?'}` : `expected “${e.expected_ph || '∅'}”, heard “${e.preditected_ph || '∅'}”`,
    }
  })
}

export function Recite({ q }: { q: Record<string, string> }) {
  const { L, N, lang } = useL()
  const p = useActive()!
  const aiAccepted = useStore((s) => s.aiNoticeAccepted)
  const submissions = useStore((s) => s.submissions)
  const engine = useEngine()
  const initial: Range = q.s ? { s: Number(q.s), from: Number(q.from) || 1, to: Number(q.to) || Number(q.from) || 1 } : (() => { const h = hifzPlanOf(p); return h ? { s: h.start[0], from: h.start[1], to: Math.min(h.start[0] === h.end[0] ? h.end[1] : surah(h.start[0]).ayat, h.start[1] + 4) } : { s: 1, from: 1, to: 7 } })()
  const [range, setRange] = useState<Range>(initial)
  const [text, setText] = useState<string[] | null>(null)
  const [rec, setRec] = useState<Recorder | null>(null)
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [clip, setClip] = useState<Clip | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [selfCheck, setSelfCheck] = useState<Set<number> | null>(null)
  const [ai, setAi] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(false)
  const [sent, setSent] = useState(false)
  const feedback = q.feedback ? submissions.find((s) => s.id === q.feedback) : null

  useEffect(() => {
    if (feedback && !feedback.seenByLearner) setState((st) => ({ ...st, submissions: st.submissions.map((x) => (x.id === feedback.id ? { ...x, seenByLearner: true } : x)) }))
  }, [feedback])

  useEffect(() => {
    let live = true
    setText(null)
    loadSurah(range.s).then((a) => live && setText(a.slice(range.from - 1, range.to)))
    resetTake()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.s, range.from, range.to])

  useEffect(() => {
    if (!rec) return
    const t0 = performance.now()
    let raf = 0
    const loop = () => {
      setLevel(rec.level())
      const e = (performance.now() - t0) / 1000
      setElapsed(e)
      if (e >= MAX_RECORD_S) void toggle()
      else raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec])

  function resetTake() {
    setClip((old) => (old && URL.revokeObjectURL(old.url), null))
    setSelfCheck(null)
    setAi(null)
    setSent(false)
    setErr(null)
  }

  const takeBlob = async (b: Blob, name: string) => {
    try {
      const pcm = await blobToMono16k(b)
      const wav = encodeWav(pcm)
      setClip({ wav, url: URL.createObjectURL(wav), seconds: pcm.length / 16000, name })
    } catch {
      setErr(L('تعذّر قراءة الملف الصوتي.', 'Couldn’t read that audio file.'))
    }
  }

  const toggle = async () => {
    setErr(null)
    if (rec) {
      const b = await rec.stop()
      setRec(null)
      await takeBlob(b, L('تسجيل من الميكروفون', 'Microphone recording'))
      return
    }
    try {
      resetTake()
      setRec(await startRecording())
    } catch {
      setErr(L('لا يمكن الوصول إلى الميكروفون. اسمح بالوصول أو ارفع ملفًا صوتيًا.', 'Microphone unavailable. Allow access or upload a file.'))
    }
  }

  const runAi = async () => {
    if (!clip) return
    if (!aiAccepted) return setNotice(true)
    setBusy(true)
    setErr(null)
    try {
      setAi(await analyze(clip.wav, range.s, range.from, range.to, { madd_monfasel_len: 4, madd_mottasel_len: 4, madd_aared_len: 4 }))
    } catch (e) {
      setErr(L(`تعذّر التحليل: ${(e as Error).message}. لم يُحلَّل التسجيل.`, `Analysis failed: ${(e as Error).message}. The recording was not analysed.`))
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (!clip) return
    const id = uid()
    let audioId: string | null = id
    try {
      await putAudio(id, clip.wav)
    } catch {
      audioId = null
    }
    const sub: Submission = {
      id,
      learnerId: p.id,
      s: range.s,
      from: range.from,
      to: range.to,
      createdAt: new Date().toISOString(),
      seconds: clip.seconds,
      audioId,
      ai: ai ? { engine: ai.model, reliable: ai.reliable, abstainReason: ai.abstain_reason, observations: toObservations(ai) } : null,
      selfCheck: selfCheck ? [...selfCheck] : null,
    }
    setState((st) => ({
      ...st,
      submissions: [sub, ...st.submissions],
      assignments: q.assignment ? st.assignments.map((x) => (x.id === q.assignment ? { ...x, doneAt: today() } : x)) : st.assignments,
    }))
    setSent(true)
  }

  const allWords = text ? text.flatMap((t, k) => words(t).map((w, j) => ({ w, a: range.from + k, last: j === words(t).length - 1 }))) : []
  const aiStatus = (i: number) => (ai && ai.reliable ? ai.words[i]?.status : null)

  return (
    <div className="space-y-8">
      <ScreenHeader title={L('التسميع', 'Recitation')} subtitle={L('سمّع من حفظك، ثم راجع نفسك أو أرسل التسجيل لمعلّمك', 'Recite from memory, then check yourself or send it to your teacher')} />

      {feedback?.teacher && (
        <Card className="flex gap-4 border-s-4 border-leaf p-5">
          <Icon name={feedback.teacher.verdict === 'good' ? 'star' : 'heart'} className="mt-1 text-leaf" />
          <div>
            <p className="font-semibold">{feedback.teacher.verdict === 'good' ? L('معلّمك: أحسنت! تسميع متقن', 'Your teacher: well done!') : L('معلّمك: تحتاج إلى مراجعة يسيرة', 'Your teacher: a little more practice')}</p>
            <p className="text-sm text-muted">{rangeLabel(L, N, feedback.s, feedback.from, feedback.to, lang)}</p>
            {feedback.teacher.note && <p className="mt-2">“{feedback.teacher.note}”</p>}
            {feedback.ai?.observations.some((o) => o.review === 'confirmed') && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-leaf">{L('ملاحظات أكّدها معلّمك', 'Confirmed by your teacher')}</p>
                <ul className="mt-1 space-y-1">
                  {feedback.ai.observations
                    .filter((o) => o.review === 'confirmed')
                    .map((o, i) => (
                      <li key={i} className="text-sm">
                        <span dir="rtl" className="font-quran text-lg">{o.words}</span> <span className="text-muted">· {o.label}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <RangePicker value={range} onChange={setRange} />
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className={`h-2 w-2 rounded-full ${engine.status === 'online' ? 'bg-leaf' : engine.status === 'offline' ? 'bg-clay' : 'animate-pulse bg-gold'}`} />
          {engine.status === 'online'
            ? L('الاستماع الآلي متصل (تجريبي)', 'Automatic listening connected (experimental)')
            : engine.status === 'offline'
              ? L('الاستماع الآلي غير متصل في هذه النسخة. التسجيل والمراجعة الذاتية والإرسال للمعلّم متاحة.', 'Automatic listening isn’t connected in this version. Recording, self-check and sending to your teacher all work.')
              : L('جارٍ التحقق من الاستماع الآلي…', 'Checking automatic listening…')}
          {engine.status === 'offline' && (
            <button type="button" onClick={engine.recheck} className="ms-auto shrink-0 rounded-full px-3 py-1 text-xs font-medium text-gold ring-1 ring-line hover:ring-gold/50">
              {L('أعد الفحص', 'Check again')}
            </button>
          )}
        </p>
      </Card>

      {/* Recorder */}
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <button
            type="button"
            onClick={toggle}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl transition ${rec ? 'bg-clay' : 'bg-gold hover:brightness-95'}`}
            aria-label={rec ? L('إيقاف التسجيل', 'Stop recording') : L('ابدأ التسجيل', 'Start recording')}
          >
            {rec && <span className="absolute inset-0 rounded-full bg-clay/40" style={{ transform: `scale(${1 + level * 0.6})`, transition: 'transform 80ms' }} />}
            <Icon name={rec ? 'stop' : 'mic'} size={34} fill={!!rec} className="relative" />
          </button>
          <p className="mt-4 font-medium">{rec ? L(`جارٍ التسجيل · ${N(Math.floor(elapsed))} ث`, `Recording · ${Math.floor(elapsed)}s`) : clip ? L('سُجّلت تلاوتك', 'Recitation captured') : L('اضغط وابدأ التلاوة من حفظك', 'Tap and recite from memory')}</p>
          <p className="mt-1 text-sm text-muted">{rec ? L('اضغط مرة أخرى عند الانتهاء', 'Tap again when you finish') : L(`حتى دقيقتين · يبقى التسجيل على جهازك`, `Up to ${MAX_RECORD_S / 60} minutes · stays on your device`)}</p>
          {!rec && (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-night">
              <Icon name="upload" size={16} />
              {L('أو ارفع ملفًا صوتيًا', 'or upload an audio file')}
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    resetTake()
                    void takeBlob(f, f.name)
                  }
                  e.target.value = ''
                }}
              />
            </label>
          )}
          {err && <p className="mt-4 text-sm text-clay">{err}</p>}
        </div>
        {clip && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-parchment/50 px-5 py-4">
            <audio src={clip.url} controls className="h-10 max-w-full flex-1" />
            <span className="text-xs text-muted">{N(clip.seconds.toFixed(1))} {L('ث', 's')}</span>
            <Button size="sm" variant="ghost" onClick={resetTake}>
              {L('أعد التسجيل', 'Record again')}
            </Button>
          </div>
        )}
      </Card>

      {/* Passage, hidden until the learner chooses to check */}
      {clip && (
        <Section title={L('راجع تلاوتك', 'Check your recitation')}>
          <div className="grid gap-3 md:grid-cols-3">
            <ActionCard
              icon="eye"
              title={L('راجع نفسك', 'Check yourself')}
              body={L('اكشف النص وحدّد الكلمات التي أخطأت فيها أو تردّدت', 'Reveal the text and mark words you missed or hesitated on')}
              on={!!selfCheck}
              onClick={() => setSelfCheck(selfCheck ?? new Set())}
            />
            <ActionCard
              icon="sparkle"
              title={L('ملاحظات الذكاء الاصطناعي', 'AI observations')}
              body={
                engine.status === 'online'
                  ? clip.seconds > MAX_ANALYZE_S
                    ? L(`المحرّك يقبل حتى ${N(MAX_ANALYZE_S)} ثانية. سجّل مقطعًا أقصر.`, `The engine accepts up to ${MAX_ANALYZE_S}s. Record a shorter portion.`)
                    : L('تجريبي: ملاحظات محتملة على مستوى الكلمة والتجويد', 'Experimental: possible word-level and Tajweed observations')
                  : L('غير متصل بعد. لن يُحلَّل التسجيل آليًا.', 'Not connected yet. The recording won’t be analysed automatically.')
              }
              disabled={engine.status !== 'online' || clip.seconds > MAX_ANALYZE_S || busy}
              on={!!ai}
              onClick={runAi}
              badge={engine.status === 'online' ? <Pill tone="leaf">{L('متصل', 'Online')}</Pill> : engine.status === 'checking' || engine.status === 'starting' ? <Pill>{L('جارٍ التحقق…', 'Checking…')}</Pill> : <Pill tone="clay">{L('غير متصل', 'Offline')}</Pill>}
              busy={busy}
            />
            <ActionCard icon="send" title={L('أرسل لمعلّمك', 'Send to your teacher')} body={sent ? L('أُرسل. سيظهر في لوحة المعلّم على هذا الجهاز.', 'Sent. It appears in the teacher view on this device.') : L('يستمع ولي الأمر أو المعلّم ويعطيك ملاحظته', 'A parent or teacher listens and gives feedback')} on={sent} disabled={sent} onClick={send} />
          </div>

          {busy && (
            <div className="flex items-center gap-3 rounded-2xl bg-gold-soft/50 p-4 text-sm" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
              {L('يحلّل المحرّك التسجيل… لا تُعرض أي ملاحظة قبل وصول نتيجته الفعلية.', 'The engine is analysing the recording… nothing is shown until its actual result arrives.')}
            </div>
          )}

          {(selfCheck || ai) && text && (
            <Card className="p-6">
              {ai && !ai.reliable && (
                <div className="mb-4 rounded-2xl bg-gold-soft/40 p-4 text-sm">
                  <p className="font-semibold">{L('لم يتمكّن المحرّك من متابعة التلاوة بثقة', 'The engine couldn’t follow this recitation confidently')}</p>
                  <p className="mt-1 text-muted">{L('لذلك لا يقدّم ملاحظات. تأكّد من اختيار الآيات الصحيحة وأعد التسجيل في مكان هادئ.', 'So it gives no observations. Check the selected ayat and record again somewhere quiet.')}</p>
                </div>
              )}
              <p dir="rtl" lang="ar" className="mushaf text-[1.9rem] text-night">
                {allWords.map((x, i) => {
                  const st = aiStatus(i)
                  const missed = selfCheck?.has(i)
                  return (
                    <span key={i}>
                      <button
                        type="button"
                        disabled={!selfCheck}
                        onClick={() =>
                          setSelfCheck((s) => {
                            const n = new Set(s)
                            if (n.has(i)) n.delete(i)
                            else n.add(i)
                            return n
                          })
                        }
                        className={`rounded-lg px-1 transition ${missed ? 'bg-clay/15 text-clay' : ''} ${st === 'suspected' ? 'underline decoration-gold decoration-wavy decoration-2 underline-offset-[12px]' : st === 'tajweed' ? 'underline decoration-sky decoration-dotted decoration-[3px] underline-offset-[12px]' : ''} ${selfCheck ? 'hover:bg-night/5' : ''}`}
                      >
                        {x.w}
                      </button>
                      {x.last ? <AyahMark n={x.a} /> : ' '}
                    </span>
                  )
                })}
              </p>
              {ai?.reliable && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span className="underline decoration-gold decoration-wavy decoration-2 underline-offset-4">كلمة</span>{L('كلمة يُحتمل أنها تحتاج مراجعة', 'Word may need review')}</span>
                  <span className="flex items-center gap-1.5"><span className="underline decoration-sky decoration-dotted decoration-[3px] underline-offset-4">كلمة</span>{L('ملاحظة تجويد محتملة', 'Possible tajweed note')}</span>
                  <span className="flex items-center gap-1.5"><span className="rounded bg-clay/15 px-1 text-clay">كلمة</span>{L('حدّدتها أنت', 'Marked by you')}</span>
                </div>
              )}
              {selfCheck && <p className="mt-3 text-sm text-muted">{selfCheck.size ? L(`حدّدت ${N(selfCheck.size)} كلمة للمراجعة`, `${selfCheck.size} words marked for review`) : L('اضغط على أي كلمة أخطأت فيها أو تردّدت', 'Tap any word you missed or hesitated on')}</p>}
              {ai?.reliable && <AiObservations a={ai} />}
            </Card>
          )}

          {!ai && engine.status !== 'online' && (
            <div className="flex gap-3 rounded-2xl bg-night/[0.04] p-4 text-sm text-muted">
              <Icon name="shield" size={20} className="mt-0.5 shrink-0" />
              <p>
                {L(
                  'الاستماع الآلي (محرّك «المعلّم القرآني») غير متصل في هذه النسخة، فلا تُعرض أي ملاحظات آلية. يمكنك مراجعة نفسك أو إرسال التسجيل لمعلّمك، وكل ميزات الحفظ والمراجعة تعمل كالمعتاد.',
                  'Automatic listening (the Quran Muaalem engine) isn’t connected in this version, so no AI observations are shown. You can check yourself or send the recording to your teacher. Everything else works as usual.',
                )}
              </p>
            </div>
          )}
        </Section>
      )}

      <Sheet open={notice} onClose={() => setNotice(false)} title={L('قبل أول تحليل', 'Before your first analysis')}>
        <AiNotice />
        <p className="mt-4 text-sm text-muted">{L('يُرسل التسجيل إلى خادم الاستماع المتصل بهذا التطبيق فقط، ويُحلَّل في الذاكرة ثم يُحذف.', 'The recording is sent only to the listening server connected to this app, analysed in memory, then discarded.')}</p>
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            setState((s) => ({ ...s, aiNoticeAccepted: true }))
            setNotice(false)
          }}
        >
          {L('فهمت، تابع', 'I understand, continue')}
        </Button>
      </Sheet>
    </div>
  )
}

function ActionCard({ icon, title, body, on, disabled, onClick, badge, busy }: { icon: string; title: string; body: string; on?: boolean; disabled?: boolean; onClick: () => void; badge?: React.ReactNode; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled && !on} className={`flex flex-col rounded-3xl p-5 text-start ring-1 transition disabled:cursor-not-allowed ${on ? 'bg-night text-parchment ring-night' : disabled ? 'bg-card/60 ring-line' : 'bg-card ring-line hover:ring-night/30'}`}>
      <div className="flex w-full items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${on ? 'bg-white/10 text-gold-soft' : 'bg-gold-soft/50'}`}>{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-night/20 border-t-night" /> : <Icon name={on ? 'check' : icon} size={20} />}</span>
        {badge}
      </div>
      <span className="mt-3 font-semibold">{title}</span>
      <span className={`mt-1 text-sm ${on ? 'text-parchment/70' : 'text-muted'}`}>{body}</span>
    </button>
  )
}

function AiObservations({ a }: { a: Analysis }) {
  const { L, N } = useL()
  const obs = toObservations(a)
  const groups = [
    { lane: 'word', ar: 'على مستوى الكلمة', en: 'Word level' },
    { lane: 'sound', ar: 'الحروف والحركات', en: 'Letters & vowels' },
    { lane: 'tajweed', ar: 'التجويد (حيث توجد قاعدة)', en: 'Tajweed (rule-backed only)' },
  ] as const
  return (
    <div className="mt-6 space-y-4 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {L('اقتراحات آلية', 'AI suggestions')} <span className="ms-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold">{L('غير مؤكدة · تحتاج مراجعة معلّم', 'Unconfirmed · needs teacher review')}</span>
        </p>
        <span className="text-xs text-muted">{L(`${a.model.split('/').pop()} · ${N(a.timing.inference_seconds.toFixed(1))} ث`, `${a.model.split('/').pop()} · ${a.timing.inference_seconds.toFixed(1)}s`)}</span>
      </div>
      {obs.length === 0 ? (
        <p className="rounded-2xl bg-leaf/10 p-4 text-sm text-leaf">{L('لم يرصد المحرّك اختلافًا عن النص. هذا لا يعني أن التلاوة مُجازة، فاعرضها على معلّمك.', 'The engine found no difference. That isn’t certification. Recite to your teacher.')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {groups.map((g) => {
            const xs = obs.filter((o) => o.lane === g.lane)
            return (
              <div key={g.lane} className="rounded-2xl bg-parchment/70 p-4">
                <p className="text-sm font-medium">
                  {L(g.ar, g.en)} <span className="text-muted">· {N(xs.length)}</span>
                </p>
                <ul className="mt-2 space-y-2">
                  {xs.map((o, i) => (
                    <li key={i} className="text-sm">
                      <span dir="rtl" className="font-quran text-xl">
                        {o.words}
                      </span>
                      <span className="block text-xs text-muted">{o.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs text-muted">{L('قد يخطئ النموذج. هو للإعانة فقط وليس بديلًا عن معلّم متقن مُجاز.', 'The model can be wrong. It assists only and does not replace a qualified teacher.')}</p>
    </div>
  )
}
