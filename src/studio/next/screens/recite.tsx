// تصحيح التلاوة والتجويد — guided recitation practice (design preview).
// What is REAL here: the engine status (lib/useEngine polls the Muaalem service),
// microphone permission + recording (lib/audio, same code as the app), reference
// audio (EveryAyah) and — only when the engine reports itself online — the actual
// analysis via lib/muaalem.analyze. Nothing is ever fabricated: with the engine
// offline no result exists, and the result layout is shown only as an empty,
// labelled template. Recordings stay in this page's memory.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice } from '../core'
import { DEMO_PASSAGE, useSession } from '../session'
import { useEngine } from '../../../lib/useEngine'
import { analyze, type Analysis } from '../../../lib/muaalem'
import { blobToMono16k, encodeWav, startRecording, type Recorder } from '../../../lib/audio'
import { RECITERS, SURAHS, ayahAudioUrl, loadMushaf, surah } from '../../../lib/quran'

// ---- Shared passage (both device frames, and the Mushaf's "تسميع" action, use it)
type Passage = { s: number; from: number; to: number }
let passage: Passage = { ...DEMO_PASSAGE }
const subs = new Set<() => void>()
const setPassage = (p: Passage) => ((passage = p), subs.forEach((f) => f()))
const usePassage = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => passage)
/** Called from the Mushaf ayah menu: practise exactly that ayah. */
export const setReciteTarget = ({ s, a }: { s: number; a: number }) => setPassage({ s, from: a, to: a })
const MAX_AYAT = 10
/**
 * Recording limit when the engine cannot tell us its own: the same default as
 * poc/muaalem/server.py (MUAALEM_MAX_SECONDS = 30). When online, the engine's
 * reported `max_audio_seconds` is used instead.
 */
const FALLBACK_MAX_SECONDS = 30
const MIN_SECONDS = 0.5

// ---- Session history (in memory only; never written to the app store)
type Attempt = { id: number; p: Passage; seconds: number; result: 'analysed' | 'unreliable' | 'not-analysed'; flagged: number; teacher: 'none' | 'requested' }
let history: Attempt[] = []
const hsubs = new Set<() => void>()
const setHistory = (h: Attempt[]) => ((history = h), hsubs.forEach((f) => f()))
const useHistory = () => useSyncExternalStore((f) => (hsubs.add(f), () => hsubs.delete(f)), () => history)

const ref = (p: Passage) => `سورة ${surah(p.s).ar} · ${p.from === p.to ? `الآية ${toAr(p.from)}` : `الآيات ${toAr(p.from)}–${toAr(p.to)}`}`

export function ReciteJourney() {
  const desk = useDevice() === 'desktop'
  const eng = useEngine()
  const p = usePassage()
  const [rec, setRec] = useState<Rec>({ st: 'idle' })
  const [showTemplate, setShowTemplate] = useState(false)
  useEffect(() => setRec((r) => (r.st === 'recording' ? r : { st: 'idle' })), [p.s, p.from, p.to])
  // Each recording's object URL is released when it is replaced or the screen closes.
  const url = 'clip' in rec ? rec.clip.url : null
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url])
  const reported = eng.info?.max_audio_seconds
  const limit = { seconds: reported && reported > 0 ? reported : FALLBACK_MAX_SECONDS, fromEngine: !!(reported && reported > 0) }
  const step = rec.st === 'recorded' || rec.st === 'analysing' ? 4 : rec.st === 'result' || rec.st === 'not-analysed' ? 5 : 3

  const pill = (
    <div role="status" className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium ${eng.status === 'online' ? 'bg-leaf/10 text-leaf' : eng.status === 'checking' ? 'bg-night/[.05] text-muted' : 'bg-clay/10 text-clay'}`}>
      <span className={`h-2 w-2 rounded-full ${eng.status === 'online' ? 'bg-leaf' : eng.status === 'checking' ? 'animate-pulse bg-muted' : 'bg-clay'}`} />
      محرك التحليل: {eng.status === 'online' ? 'متصل' : eng.status === 'starting' ? 'يبدأ…' : eng.status === 'checking' ? 'يتحقّق…' : 'غير متصل'}
    </div>
  )
  const left = (
    <>
      <PassageCard p={p} />
      <TextCard p={p} />
      <EngineNote online={eng.status === 'online'} />
    </>
  )
  const right = (
    <>
      <RecorderCard p={p} rec={rec} setRec={setRec} online={eng.status === 'online'} recheck={eng.recheck} limit={limit} />
      <ResultCard rec={rec} showTemplate={showTemplate} setShowTemplate={setShowTemplate} />
      <HistoryCard />
    </>
  )
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}>
        {!desk && <MoreTabs />}
        <Head title="تصحيح التلاوة والتجويد" sub="اختر مقطعًا، استمع للقارئ، ثم سجّل تلاوتك. التحليل الآلي تجريبي وغير مُتحقَّق منه، ولا يُغني عن معلّم قرآن مؤهّل." action={desk ? pill : undefined} />
        {!desk && <div className="mb-4 flex">{pill}</div>}
        <Stepper step={step} />
        {desk ? (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
            <div className="space-y-5">{left}</div>
            <div className="space-y-5">{right}</div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">{left}{right}</div>
        )}
      </div>
    </Chrome>
  )
}

function Stepper({ step }: { step: number }) {
  const steps = ['المقطع', 'النص والاستماع', 'التسجيل', 'التحليل', 'المتابعة']
  return (
    <ol className="flex items-center gap-1.5" aria-label="خطوات التصحيح">
      {steps.map((x, i) => {
        const n = i + 1
        const st = n < step ? 'done' : n === step ? 'now' : 'todo'
        return (
          <li key={x} className="flex flex-1 items-center gap-1.5" aria-current={st === 'now' ? 'step' : undefined}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${st === 'done' ? 'bg-leaf text-white' : st === 'now' ? 'bg-gold text-white ring-4 ring-gold/20' : 'bg-card text-muted ring-1 ring-line'}`}>{st === 'done' ? <Icon name="check" size={14} /> : toAr(n)}</span>
            <span className={`hidden truncate text-[12.5px] sm:inline ${st === 'now' ? 'font-semibold' : 'text-muted'}`}>{x}</span>
            {i < steps.length - 1 && <span className={`h-0.5 min-w-3 flex-1 rounded-full ${st === 'done' ? 'bg-leaf' : 'bg-line'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

function Card({ title, icon, badge, children }: { title: string; icon: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={icon} size={17} /></span>
        <h2 className="flex-1 text-[15.5px] font-semibold">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}

/** Honest scope of the analysis engine (see poc/BENCHMARK.md). */
function EngineNote({ online }: { online: boolean }) {
  return (
    <section className="rounded-[22px] border border-dashed border-clay/40 bg-clay/[.04] p-4 text-[12.5px] leading-relaxed" data-engine-note>
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-clay"><Icon name="shield" size={14} />محرك تجريبي · ليس تصحيحًا معتمدًا</p>
      <ul className="space-y-1 text-night/75">
        <li>• اختُبر على مقاطع مركّبة من تلاوات قرّاء محترفين فقط؛ لم يُختبر على تلاوات المتعلّمين الحقيقية.</li>
        <li>• لم تُختبر أخطاء المخارج ولا أخطاء التجويد، ولم يُقَس توافقه مع المعلّمين.</li>
        <li>• لذلك لا تُعرض نسب صحة، وما يظهر «ملاحظات صوتية تجريبية غير مُتحقَّق منها» فقط، ويمتنع المحرك عن الحكم عند ضعف الثقة.</li>
        <li>• {online ? 'المحرك المتصل خدمة محلية للتطوير على هذا الجهاز، وليس خدمة إنتاجية.' : 'النسخة المنشورة لا تتضمن خادم تحليل، لذلك يظهر المحرك «غير متصل» ولا تُنشأ أي نتيجة.'}</li>
      </ul>
    </section>
  )
}

function PassageCard({ p }: { p: Passage }) {
  const mp = useSession().s.passage
  const n = surah(p.s).ayat
  const field = 'h-10 rounded-full bg-night/[.04] px-3 text-[13.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-gold'
  const clampTo = (from: number, to: number) => Math.min(n, Math.max(from, Math.min(to, from + MAX_AYAT - 1)))
  return (
    <Card title="١. اختر المقطع" icon="book">
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <label className="text-[12px] text-muted">السورة
          <select aria-label="السورة" value={p.s} onChange={(e) => { const s = Number(e.target.value); setPassage({ s, from: 1, to: Math.min(surah(s).ayat, 5) }) }} className={`${field} mt-1 w-full`}>
            {SURAHS.map((x) => <option key={x.n} value={x.n}>{toAr(x.n)}. {x.ar}</option>)}
          </select>
        </label>
        <label className="text-[12px] text-muted">من
          <input aria-label="من الآية" type="number" min={1} max={n} value={p.from} onChange={(e) => { const f = Math.min(n, Math.max(1, Number(e.target.value) || 1)); setPassage({ ...p, from: f, to: clampTo(f, p.to) }) }} className={`${field} mt-1 w-20 text-center`} />
        </label>
        <label className="text-[12px] text-muted">إلى
          <input aria-label="إلى الآية" type="number" min={p.from} max={n} value={p.to} onChange={(e) => setPassage({ ...p, to: clampTo(p.from, Number(e.target.value) || p.from) })} className={`${field} mt-1 w-20 text-center`} />
        </label>
      </div>
      <p className="mt-2.5 text-[12px] text-muted">{ref(p)} · حتى {toAr(MAX_AYAT)} آيات في المرة الواحدة</p>
      {(mp.s !== p.s || mp.from !== p.from || Math.min(mp.to, mp.from + MAX_AYAT - 1) !== p.to) && (
        <button type="button" onClick={() => setPassage({ s: mp.s, from: mp.from, to: Math.min(mp.to, mp.from + MAX_AYAT - 1) })} className="press mt-2 flex h-9 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[12px] font-medium">
          <Icon name="sprout" size={14} />استخدم مقطع الحفظ الحالي · {ref({ s: mp.s, from: mp.from, to: Math.min(mp.to, mp.from + MAX_AYAT - 1) })}
        </button>
      )}
    </Card>
  )
}

function TextCard({ p }: { p: Passage }) {
  const [t, setT] = useState<{ key: string; ayat: string[]; hafs: boolean } | null>(null)
  const [err, setErr] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const key = `${p.s}:${p.from}-${p.to}`
  useEffect(() => {
    let live = true
    setErr(false)
    loadMushaf(p.s).then((r) => live && setT({ key, ayat: r.ayat.slice(p.from - 1, p.to), hafs: r.hafs }), () => live && setErr(true))
    return () => {
      live = false
    }
  }, [key, p.s, p.from, p.to])
  useEffect(() => () => audio.current?.pause(), [])
  const play = (a: number) => {
    audio.current?.pause()
    if (playing === a) return setPlaying(null)
    const el = new Audio(ayahAudioUrl(RECITERS[0].id, p.s, a))
    audio.current = el
    el.onended = () => setPlaying(null)
    el.play().then(() => setPlaying(a), () => setPlaying(null))
  }
  const ready = t && t.key === key
  return (
    <Card title="٢. اقرأ واستمع" icon="volume" badge={ready && <span className="rounded-full bg-night/[.05] px-2.5 py-1 text-[11px] text-muted">{t.hafs ? 'KFGQPC Hafs' : 'نص Tanzil (احتياطي)'}</span>}>
      <div className="mf-paper rounded-[20px] p-4">
        {err ? (
          <p className="py-6 text-center text-[13px]">تعذّر تحميل نص السورة. تحقّق من الاتصال.</p>
        ) : !ready ? (
          <div className="space-y-3 py-2">{[92, 84, 88].map((w) => <div key={w} className="mx-auto h-3 animate-pulse rounded-full bg-night/10" style={{ width: `${w}%` }} />)}</div>
        ) : (
          <ol className="space-y-1">
            {t.ayat.map((x, i) => {
              const a = p.from + i
              return (
                <li key={a} className="flex items-start gap-2">
                  <p className={`mf-text flex-1 ${t.hafs ? '' : 'tanzil'}`} style={{ fontSize: 21, lineHeight: 2.05, textAlign: 'right', textAlignLast: 'right' }}>{x} <span className="mf-num">{toAr(a)}</span></p>
                  <button type="button" onClick={() => play(a)} aria-label={playing === a ? `إيقاف الآية ${toAr(a)}` : `استمع للآية ${toAr(a)}`} className={`press mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${playing === a ? 'bg-gold text-white' : 'bg-night/[.05] text-muted hover:text-night'}`}><Icon name={playing === a ? 'pause' : 'play'} size={14} /></button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
      <p className="mt-2 text-[11.5px] text-muted">التلاوة المرجعية: {RECITERS[0].ar} · EveryAyah</p>
    </Card>
  )
}

// ---- Recording (real microphone; analysis only when the engine is online)
type Clip = { wav: Blob; url: string; seconds: number }
type Rec =
  | { st: 'idle' }
  | { st: 'unsupported' }
  | { st: 'denied' }
  | { st: 'recording'; r: Recorder; t0: number; max: number }
  | { st: 'processing' }
  | { st: 'failed'; why: 'mic' | 'stop' | 'convert'; blob?: Blob }
  | { st: 'recorded'; clip: Clip }
  | { st: 'analysing'; clip: Clip }
  | { st: 'result'; clip: Clip; a: Analysis }
  | { st: 'not-analysed'; clip: Clip; why: 'offline' | 'error'; msg?: string }

function usePermission() {
  const [perm, setPerm] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown')
  useEffect(() => {
    let status: PermissionStatus | null = null
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((s) => {
        status = s
        setPerm(s.state as 'granted' | 'prompt' | 'denied')
        s.onchange = () => setPerm(s.state as 'granted' | 'prompt' | 'denied')
      })
      .catch(() => setPerm('unknown'))
    return () => {
      if (status) status.onchange = null
    }
  }, [])
  return perm
}

function RecorderCard({ p, rec, setRec, online, recheck, limit }: { p: Passage; rec: Rec; setRec: (r: Rec) => void; online: boolean; recheck: () => void; limit: { seconds: number; fromEngine: boolean } }) {
  const perm = usePermission()
  const [level, setLevel] = useState(0)
  const [, tick] = useState(0)
  const recRef = useRef(rec)
  recRef.current = rec
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const convert = async (blob: Blob) => {
    setRec({ st: 'processing' })
    try {
      const pcm = await blobToMono16k(blob)
      if (pcm.length === 0) throw new Error('empty recording')
      const wav = encodeWav(pcm)
      if (!mounted.current) return
      setRec({ st: 'recorded', clip: { wav, url: URL.createObjectURL(wav), seconds: pcm.length / 16000 } })
    } catch {
      if (mounted.current) setRec({ st: 'failed', why: 'convert', blob })
    }
  }
  const stop = async () => {
    const r = recRef.current
    if (r.st !== 'recording') return
    setRec({ st: 'processing' })
    let blob: Blob
    try {
      blob = await r.r.stop()
    } catch {
      r.r.cancel()
      if (mounted.current) setRec({ st: 'failed', why: 'stop' })
      return
    }
    await convert(blob)
  }
  useEffect(() => {
    if (rec.st !== 'recording') return
    const id = setInterval(() => (setLevel(rec.r.level()), tick((x) => x + 1)), 120)
    // Stop just under the limit so the decoded clip never exceeds what the engine accepts.
    const cap = setTimeout(() => void stop(), Math.max(1, rec.max - 0.4) * 1000)
    return () => (clearInterval(id), clearTimeout(cap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec])
  // Leaving the screen mid-recording releases the microphone.
  useEffect(() => () => void (recRef.current.st === 'recording' && recRef.current.r.cancel()), [])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setRec({ st: 'unsupported' })
    try {
      const r = await startRecording()
      if (!mounted.current) return r.cancel()
      setRec({ st: 'recording', r, t0: Date.now(), max: limit.seconds })
    } catch (e) {
      const name = (e as { name?: string } | null)?.name
      setRec(name === 'NotAllowedError' || name === 'SecurityError' ? { st: 'denied' } : { st: 'failed', why: 'mic' })
    }
  }
  const log = (a: Attempt) => setHistory([a, ...history])
  const run = async (clip: Clip) => {
    if (clip.seconds > limit.seconds || clip.seconds < MIN_SECONDS) return
    if (!online) {
      setRec({ st: 'not-analysed', clip, why: 'offline' })
      log({ id: Date.now(), p, seconds: clip.seconds, result: 'not-analysed', flagged: 0, teacher: 'none' })
      return
    }
    setRec({ st: 'analysing', clip })
    try {
      const a = await analyze(clip.wav, p.s, p.from, p.to, { madd_monfasel_len: 4, madd_mottasel_len: 4, madd_aared_len: 4 })
      if (!mounted.current) return
      setRec({ st: 'result', clip, a })
      log({ id: Date.now(), p, seconds: clip.seconds, result: a.reliable ? 'analysed' : 'unreliable', flagged: a.reliable ? a.words.filter((w) => w.status !== 'ok' && w.status !== 'unassessed').length : 0, teacher: 'none' })
    } catch (e) {
      if (!mounted.current) return
      setRec({ st: 'not-analysed', clip, why: 'error', msg: (e as Error)?.message || 'unknown error' })
      log({ id: Date.now(), p, seconds: clip.seconds, result: 'not-analysed', flagged: 0, teacher: 'none' })
    }
  }
  const secs = rec.st === 'recording' ? Math.floor((Date.now() - rec.t0) / 1000) : 0
  const mm = `${toAr(Math.floor(secs / 60))}:${toAr(String(secs % 60).padStart(2, '0'))}`
  const clip = 'clip' in rec ? rec.clip : null
  const lim = Math.floor(limit.seconds)
  const invalid = clip ? (clip.seconds > limit.seconds ? `مدة التسجيل ${toAr(Math.round(clip.seconds))} ث وتتجاوز حدّ المحرك (${toAr(lim)} ث). أعد التسجيل بمقطع أقصر.` : clip.seconds < MIN_SECONDS ? 'التسجيل قصير جدًا للتحليل. أعد التسجيل.' : null) : null

  return (
    <Card title="٣. سجّل تلاوتك" icon="mic" badge={<span className="text-[11.5px] text-muted">{ref(p)}</span>}>
      <p className="mb-4 rounded-[16px] bg-night/[.03] p-3 text-[12px] leading-relaxed text-muted">
        <b className="font-semibold text-night">الخصوصية:</b> يبقى التسجيل في ذاكرة هذه الصفحة ولا يُحفظ في حسابك. لا يُرسل إلا عند الضغط على «حلّل» وكان محرك التحليل المحلي متصلًا.
        <span data-perm={perm}>{perm === 'denied' ? ' الإذن بالميكروفون مرفوض حاليًا في المتصفح.' : perm === 'granted' ? ' الإذن بالميكروفون ممنوح.' : ' سيطلب المتصفح إذن الميكروفون عند البدء.'}</span>
      </p>
      {rec.st === 'failed' ? (
        <div role="alert" className="rounded-[18px] bg-clay/10 p-4 text-[13px] leading-relaxed" data-rec-failed={rec.why}>
          <p className="font-semibold text-clay">{rec.why === 'mic' ? 'تعذّر تشغيل الميكروفون' : rec.why === 'stop' ? 'تعذّر إنهاء التسجيل' : 'تعذّر تجهيز التسجيل الصوتي'}</p>
          <p className="mt-1 text-night/75">{rec.why === 'mic' ? 'قد يكون الميكروفون مستخدمًا في تطبيق آخر أو غير متصل. أُغلق الميكروفون.' : rec.why === 'stop' ? 'توقّف المسجّل بشكل غير متوقّع، وأُغلق الميكروفون. لم يُحفظ شيء.' : 'لم نتمكّن من تحويل الصوت إلى الصيغة المطلوبة على هذا الجهاز.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {rec.why === 'convert' && rec.blob && <button type="button" onClick={() => void convert(rec.blob!)} className="press h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">أعد محاولة التجهيز</button>}
            <button type="button" onClick={() => void start()} className={`press h-9 rounded-full px-4 text-[12.5px] font-semibold ${rec.why === 'convert' && rec.blob ? 'ring-1 ring-line' : 'bg-night text-parchment'}`}>أعد التسجيل</button>
          </div>
        </div>
      ) : rec.st === 'denied' || rec.st === 'unsupported' ? (
        <div role="alert" className="rounded-[18px] bg-clay/10 p-4 text-[13px] leading-relaxed">
          <p className="font-semibold text-clay">{rec.st === 'denied' ? 'لم يُسمح بالوصول إلى الميكروفون' : 'التسجيل غير مدعوم في هذا المتصفح'}</p>
          <p className="mt-1 text-night/75">{rec.st === 'denied' ? 'اسمح بالميكروفون من إعدادات الموقع في المتصفح ثم أعد المحاولة. يمكنك متابعة القراءة والاستماع دون تسجيل.' : 'جرّب متصفحًا حديثًا يدعم MediaRecorder.'}</p>
          <button type="button" onClick={() => setRec({ st: 'idle' })} className="press mt-3 h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">حسنًا</button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 items-end gap-1" aria-hidden>
            {Array.from({ length: 22 }, (_, i) => (
              <span key={i} className={`w-1.5 rounded-full transition-[height] duration-150 ${rec.st === 'recording' ? 'bg-gold' : 'bg-night/15'}`} style={{ height: rec.st === 'recording' ? `${12 + Math.min(88, level * 160 * (0.55 + ((i * 7) % 10) / 20))}%` : '14%' }} />
            ))}
          </div>
          {rec.st === 'recording' ? (
            <button type="button" onClick={() => void stop()} aria-label="إيقاف التسجيل" className="press mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-clay text-white ring-8 ring-clay/15"><Icon name="stop" size={26} fill /></button>
          ) : (
            <button type="button" onClick={() => void start()} aria-label={clip ? 'أعد التسجيل' : 'ابدأ التسجيل'} disabled={rec.st === 'analysing' || rec.st === 'processing'} className="press mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-night text-parchment disabled:opacity-40"><Icon name="mic" size={26} /></button>
          )}
          <p className="mt-3 text-[14px] font-semibold tabular-nums">{rec.st === 'recording' ? `جارٍ التسجيل · ${mm} · متبقٍ ${toAr(Math.max(0, Math.floor(rec.max - 0.4) - secs))} ث` : rec.st === 'processing' ? 'يُجهَّز التسجيل…' : clip ? `تسجيل ${toAr(Math.round(clip.seconds))} ث · اضغط للإعادة` : 'اضغط وابدأ التلاوة'}</p>
          <p className="text-[11.5px] text-muted" data-limit>الحد الأقصى {toAr(lim)} ثانية · {limit.fromEngine ? 'حدّ محرك التحليل' : 'حدّ احتياطي آمن (المحرك لم يُبلغ حدّه)'} · يتوقّف التسجيل تلقائيًا</p>
          {clip && rec.st !== 'recording' && (
            <div className="mt-4 w-full space-y-2">
              <audio controls src={clip.url} className="w-full" aria-label="استمع لتسجيلك" />
              {invalid && <p role="alert" className="rounded-[14px] bg-clay/10 px-3 py-2 text-[12.5px] text-clay" data-invalid>{invalid}</p>}
              <button type="button" onClick={() => void run(clip)} disabled={rec.st === 'analysing' || !!invalid} className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-night text-[13.5px] font-semibold text-parchment disabled:opacity-50">
                <Icon name="wave" size={17} />
                {rec.st === 'analysing' ? 'يحلّل المحرك التلاوة…' : rec.st === 'not-analysed' && rec.why === 'error' ? 'أعد محاولة التحليل' : online ? 'حلّل التلاوة (تجريبي)' : 'حلّل التلاوة (المحرك غير متصل)'}
              </button>
              {!online && <button type="button" onClick={recheck} className="press mx-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-muted hover:bg-night/5"><Icon name="refresh" size={14} />أعد التحقّق من المحرك</button>}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ---- Results: real analysis only; otherwise an explicit "not analysed" state or an empty template
function ResultCard({ rec, showTemplate, setShowTemplate }: { rec: Rec; showTemplate: boolean; setShowTemplate: (b: boolean) => void }) {
  const toggle = (
    <button type="button" onClick={() => setShowTemplate(!showTemplate)} aria-pressed={showTemplate} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${showTemplate ? 'bg-sky/15 text-sky' : 'bg-night/[.05] text-muted'}`}>قالب النتيجة (نموذج)</button>
  )
  return (
    <Card title="٤. نتيجة التحليل" icon="wave" badge={toggle}>
      {showTemplate ? (
        <Template />
      ) : rec.st === 'result' ? (
        <RealResult a={rec.a} />
      ) : rec.st === 'analysing' ? (
        <p className="py-6 text-center text-[13px] text-muted">يحلّل المحرك تسجيلك ويطابقه مع النص…</p>
      ) : rec.st === 'not-analysed' ? (
        <div role="status" data-result="none" className="rounded-[18px] bg-night/[.03] p-4 text-[13px] leading-relaxed">
          <p className="font-semibold">لم يُحلَّل التسجيل · لا توجد نتيجة</p>
          <p className="mt-1 text-muted">{rec.why === 'offline' ? 'محرك التحليل غير متصل في هذه المعاينة، لذلك لا تُعرض أي ملاحظات على النطق أو التجويد.' : `${analysisError(rec.msg)} لم يُحلَّل التسجيل؛ يمكنك إعادة المحاولة من زر التحليل.`}</p>
          {rec.why === 'error' && rec.msg && <p className="mt-1 text-[11px] text-muted" dir="ltr">{rec.msg}</p>}
          <ul className="mt-3 space-y-1.5 text-night/80">
            <li>• استمع لتسجيلك ثم للقارئ وقارن بنفسك.</li>
            <li>• كرّر الآية التي تشعر أنها تحتاج تمرينًا.</li>
            <li>• اطلب مراجعة معلّمك من السجلّ أدناه.</li>
          </ul>
        </div>
      ) : (
        <p className="py-4 text-center text-[13px] text-muted">تظهر هنا نتيجة تحليل حقيقي بعد التسجيل، إن كان المحرك متصلًا.</p>
      )}
    </Card>
  )
}

/** Arabic summary of an engine / network failure (the raw message is shown separately). */
const analysisError = (msg?: string) =>
  !msg ? 'تعذّر التحليل.' : /limit is/i.test(msg) ? 'التسجيل أطول من الحد الذي يقبله المحرك.' : /too short/i.test(msg) ? 'التسجيل قصير جدًا.' : /loading|starting/i.test(msg) ? 'ما زال المحرك يبدأ.' : 'تعذّر الاتصال بمحرك التحليل أو أخفق التحليل.'

// Unvalidated categories: no correctness scores, wording marks them as experimental observations.
const CATS = [
  { id: 'practice', ar: 'مواضع محتملة للمراجعة', c: 'bg-gold' },
  { id: 'makhraj', ar: 'ملاحظات صوتية تجريبية غير مُتحقَّق منها', c: 'bg-clay' },
  { id: 'tajweed', ar: 'ملاحظات مدّ وتجويد تجريبية غير مُتحقَّق منها', c: 'bg-sky' },
  { id: 'repeat', ar: 'تكرار مقترح', c: 'bg-night/30' },
] as const

function Template() {
  return (
    <div data-template>
      <p className="mb-3 flex items-start gap-2 rounded-[14px] bg-sky/10 p-3 text-[12px] leading-relaxed text-night/80"><Icon name="info" size={15} className="mt-0.5 shrink-0 text-sky" />نموذج تصميم فارغ لشكل النتيجة. لا يحتوي على أي بيانات، ولا يمثّل تلاوة أحد.</p>
      <div className="grid grid-cols-2 gap-2">
        {CATS.map((c) => (
          <div key={c.id} className="rounded-[16px] bg-night/[.03] p-3 ring-1 ring-dashed ring-line">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${c.c}`} />{c.ar}</p>
            <p className="mt-1 text-[11.5px] text-muted">— يظهر بعد تحليل حقيقي</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-[16px] bg-night/[.03] p-3 text-[12px] text-muted ring-1 ring-dashed ring-line">لا تُعرض نسب صحة للمخارج أو التجويد: هذه الفئات لم يُتحقَّق منها مع معلّمين.</div>
    </div>
  )
}

/** Renders exactly what the engine returned; nothing is inferred beyond its fields. */
function RealResult({ a }: { a: Analysis }) {
  if (!a.reliable)
    return (
      <div role="status" className="rounded-[18px] bg-night/[.03] p-4 text-[13px]">
        <p className="font-semibold">لم يصل المحرك إلى حكم موثوق</p>
        <p className="mt-1 text-muted">{a.abstain_reason ?? 'جودة الصوت غير كافية'}. لذلك لا تُعرض ملاحظات؛ أعد التسجيل في مكان أهدأ.</p>
      </div>
    )
  const practice = a.words.filter((w) => w.status === 'suspected')
  const phon = a.errors.filter((e) => e.error_type === 'normal' || e.error_type === 'tashkeel')
  const taj = a.errors.filter((e) => e.error_type === 'tajweed')
  const repeat = [...new Set(a.words.filter((w) => w.status === 'suspected' || w.status === 'tajweed').map((w) => w.aya))]
  const color = { ok: '', suspected: 'bg-gold-soft ring-1 ring-gold/50', tajweed: 'bg-sky/15 ring-1 ring-sky/50', unassessed: 'bg-night/[.05]' } as const
  const wordText = (ids: number[]) => ids.map((i) => a.words[i]?.text).filter(Boolean).join(' ')
  return (
    <div data-automated>
      <p className="mb-3 flex items-start gap-2 rounded-[14px] bg-clay/[.06] p-3 text-[12px] leading-relaxed ring-1 ring-clay/20"><Icon name="shield" size={15} className="mt-0.5 shrink-0 text-clay" /><span><b className="font-semibold">نتيجة آلية تجريبية غير مُتحقَّق منها</b> ({a.model}). ليست تصحيحًا معتمدًا للمخارج أو التجويد، ولا تُغني عن معلّم قرآن مؤهّل.</span></p>
      <p className="mf-paper mf-text rounded-[18px] p-4" style={{ fontSize: 20, lineHeight: 2.2 }}>
        {a.words.map((w) => <span key={w.idx} className={`mx-0.5 rounded-md px-1 ${color[w.status]}`}>{w.text}</span>)}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[12.5px]">
        <Stat c="bg-gold" l="مواضع محتملة للمراجعة" v={`${toAr(practice.length)} كلمة`} />
      </div>
      {(phon.length > 0 || taj.length > 0) && (
        <div className="mt-3 space-y-2 text-[12.5px]">
          {phon.length > 0 && <p className="font-semibold">ملاحظات صوتية تجريبية غير مُتحقَّق منها</p>}
          <ul className="space-y-1.5">{phon.map((e, i) => <li key={`p${i}`} className="rounded-[12px] bg-night/[.03] px-3 py-2">«{wordText(e.word_indices)}» · اختلاف صوتي محتمل رصده المحرك: المتوقّع /{e.expected_ph}/ والملتقط /{e.preditected_ph}/</li>)}</ul>
          {taj.length > 0 && <p className="font-semibold">ملاحظات مدّ وتجويد تجريبية غير مُتحقَّق منها</p>}
          <ul className="space-y-1.5">{taj.map((e, i) => <li key={`t${i}`} className="rounded-[12px] bg-night/[.03] px-3 py-2">«{wordText(e.word_indices)}» · {(e.ref_tajweed_rules ?? e.missing_tajweed_rules ?? []).map((r) => r.name.ar).join('، ') || 'تجويد'}{e.expected_len != null && e.predicted_len != null ? ` · المدّ المتوقّع ${toAr(e.expected_len)} والملتقط ${toAr(e.predicted_len)}` : ''}</li>)}</ul>
        </div>
      )}
      {repeat.length > 0 && <p className="mt-3 text-[12.5px]"><b className="font-semibold">تكرار مقترح:</b> أعد {repeat.map((x) => `الآية ${toAr(x)}`).join('، ')} مع الاستماع للقارئ.</p>}
      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">«مواضع محتملة» من محرك تجريبي لم يُختبر على تلاوات المتعلّمين ولا على أخطاء المخارج والتجويد؛ المرجع هو المعلّم.</p>
    </div>
  )
}

function Stat({ c, l, v }: { c: string; l: string; v: string }) {
  return <span className="flex items-center gap-1.5 rounded-full bg-night/[.04] px-3 py-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}<b className="ms-auto font-semibold">{v}</b></span>
}

function HistoryCard() {
  const h = useHistory()
  return (
    <Card title="٥. السجلّ ومراجعة المعلّم" icon="users" badge={<span className="text-[11px] text-muted">هذه الجلسة فقط</span>}>
      {h.length === 0 ? (
        <p className="text-[13px] text-muted">لا توجد محاولات بعد. تظهر هنا كل محاولة بعد طلب التحليل، مع حالتها الحقيقية.</p>
      ) : (
        <ul className="space-y-2" aria-label="المحاولات">
          {h.map((x) => (
            <li key={x.id} className="rounded-[16px] bg-night/[.03] p-3 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="flex-1 font-semibold">{ref(x.p)}</span>
                <span className="text-muted">{toAr(Math.round(x.seconds))} ث</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.result === 'analysed' ? 'bg-gold-soft' : 'bg-night/[.06] text-muted'}`}>
                  آلي تجريبي: {x.result === 'analysed' ? `${toAr(x.flagged)} موضع محتمل` : x.result === 'unreliable' ? 'امتنع عن الحكم' : 'لم يُحلَّل'}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.teacher === 'requested' ? 'bg-sky/15 text-sky' : 'bg-night/[.06] text-muted'}`}>
                  المعلّم: {x.teacher === 'requested' ? 'طُلبت المراجعة (نموذج)' : 'لا توجد ملاحظة'}
                </span>
                {x.teacher === 'none' && <button type="button" onClick={() => setHistory(h.map((y) => (y.id === x.id ? { ...y, teacher: 'requested' } : y)))} className="press ms-auto h-8 rounded-full bg-night px-3 text-[11.5px] font-semibold text-parchment">اطلب مراجعة المعلّم</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">مراجعة المعلّم اختيارية وهي نموذج أولي: لا توجد خدمة مراجعة حقيقية ولا يُرسل التسجيل إلى أحد. ملاحظات المعلّم تظهر بلون أزرق منفصل عن الملاحظات الآلية.</p>
    </Card>
  )
}
