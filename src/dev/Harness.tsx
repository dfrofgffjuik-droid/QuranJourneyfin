import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AiNotice } from '../components/AiNotice'
import { QuranWords } from './QuranWords'
import { blobToMono16k, encodeWav, startRecording, type Recorder } from '../lib/audio'
import * as api from '../lib/muaalem'
import type { Analysis, Ayah, Health, MoshafOptions, ReciterError } from '../lib/muaalem'
import { describe, laneOf, wordLabel } from '../lib/lanes'
import sample from '../data/quran-sample.json'

const NOTICE_KEY = 'rafiqi.ai-notice.v1'
const PRESETS = [
  { label: 'Al-Ikhlas 1–4', sura: 112, from: 1, to: 4 },
  { label: 'Al-Fatiha 2', sura: 1, from: 2, to: 2 },
  { label: 'Al-Fatiha 2–4', sura: 1, from: 2, to: 4 },
  { label: 'An-Nas 1–3', sura: 114, from: 1, to: 3 },
  { label: 'Al-Falaq 1–2', sura: 113, from: 1, to: 2 },
]

type Attempt = { at: number; per: number; reliable: boolean; word: number; sound: number; tajweed: number; seconds: number }

function localPassage(sura: number, from: number, to: number): Ayah[] | null {
  const s = sample.surahs.find((x) => x.sura === sura)
  if (!s) return null
  const ayat = s.ayat.filter((a) => a.aya >= from && a.aya <= to)
  if (ayat.length !== to - from + 1) return null
  return ayat.map((a) => ({ sura, aya: a.aya, sura_name: s.name, uthmani: a.text, words: a.words }))
}

export function Harness() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem(NOTICE_KEY) === '1')
  const [health, setHealth] = useState<Health | null>(null)
  const [healthErr, setHealthErr] = useState<string | null>(null)

  useEffect(() => {
    let stop = false
    const tick = async () => {
      try {
        const h = await api.health()
        if (stop) return
        setHealth(h)
        setHealthErr(null)
        if (!h.model_loaded) setTimeout(tick, 3000)
      } catch (e) {
        if (stop) return
        setHealth(null)
        setHealthErr((e as Error).message)
        setTimeout(tick, 6000)
      }
    }
    void tick()
    return () => {
      stop = true
    }
  }, [])

  if (!accepted) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-rule bg-sheet p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">Before the first test</p>
        <h2 className="mt-2 font-display text-3xl">An honest helper, not a teacher</h2>
        <div className="mt-6 border-s-2 border-moss ps-5">
          <AiNotice />
        </div>
        <ul className="mt-6 space-y-2 text-sm leading-relaxed text-ink/80">
          <li>Your recording is decoded in this browser, sent only to the inference service running on this machine, analysed in memory, and discarded. Nothing is stored or uploaded elsewhere.</li>
          <li>Only record yourself, or someone who has agreed. Do not record a child without a parent's or guardian's consent.</li>
          <li>Every flag is a <em>possible</em> difference for you to check with a qualified teacher.</li>
        </ul>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(NOTICE_KEY, '1')
            setAccepted(true)
          }}
          className="mt-8 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-moss"
        >
          I understand — open the test harness
        </button>
      </section>
    )
  }

  return <HarnessBody health={health} healthErr={healthErr} />
}

function ServiceStatus({ health, healthErr }: { health: Health | null; healthErr: string | null }) {
  const ok = health?.model_loaded
  const dot = ok ? 'bg-moss' : health ? 'bg-amber animate-pulse' : 'bg-alert'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rule bg-sheet px-4 py-3 text-sm">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div>
        {ok ? (
          <p>
            <strong className="font-medium">Muaalem engine online</strong> — {health!.model} on CPU (bf16). Real inference.
          </p>
        ) : health ? (
          <p>
            <strong className="font-medium">Engine starting…</strong> loading 2.4 GB of model weights.{' '}
            {health.model_error ? <span className="text-alert">{health.model_error}</span> : null}
          </p>
        ) : (
          <div className="space-y-1">
            <p>
              <strong className="font-medium text-alert">Inference service offline.</strong> No analysis can run, and none will be simulated.
            </p>
            <p className="text-ink/60">
              Start it with <code className="font-mono text-xs">python poc/muaalem/server.py</code> (see <code className="font-mono text-xs">poc/muaalem/README.md</code>). {healthErr}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function HarnessBody({ health, healthErr }: { health: Health | null; healthErr: string | null }) {
  const [sura, setSura] = useState(112)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(4)
  const [ayat, setAyat] = useState<Ayah[] | null>(null)
  const [passageErr, setPassageErr] = useState<string | null>(null)
  const [moshaf, setMoshaf] = useState<MoshafOptions>({ madd_monfasel_len: 4, madd_mottasel_len: 4, madd_aared_len: 4 })

  const [rec, setRec] = useState<Recorder | null>(null)
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [clip, setClip] = useState<{ wav: Blob; url: string; seconds: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<Analysis | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [history, setHistory] = useState<Record<string, Attempt[]>>({})
  const key = `${sura}:${from}-${to}`
  const online = !!health?.model_loaded

  // Load the verified reference text for the chosen passage.
  useEffect(() => {
    let cancel = false
    setPassageErr(null)
    setResult(null)
    const local = localPassage(sura, from, to)
    if (online) {
      api
        .passage(sura, from, to)
        .then((a) => !cancel && setAyat(a))
        .catch((e) => !cancel && (setAyat(local), setPassageErr(local ? null : (e as Error).message)))
    } else {
      setAyat(local)
      if (!local) setPassageErr('Reference text for this passage is served by the engine. Start the service, or pick a preset.')
    }
    return () => {
      cancel = true
    }
  }, [sura, from, to, online])

  // Recording level meter / timer.
  useEffect(() => {
    if (!rec) return
    const t0 = performance.now()
    let raf = 0
    const loop = () => {
      setLevel(rec.level())
      setElapsed((performance.now() - t0) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [rec])

  const setClipFrom = useCallback(async (blob: Blob, name: string) => {
    const pcm = await blobToMono16k(blob)
    const wav = encodeWav(pcm)
    setClip((old) => {
      if (old) URL.revokeObjectURL(old.url)
      return { wav, url: URL.createObjectURL(wav), seconds: pcm.length / 16000, name }
    })
  }, [])

  const toggleRecord = async () => {
    setErr(null)
    if (rec) {
      const blob = await rec.stop()
      setRec(null)
      await setClipFrom(blob, 'Microphone recording').catch((e) => setErr(`Could not decode recording: ${(e as Error).message}`))
      return
    }
    try {
      setResult(null)
      setRec(await startRecording())
    } catch (e) {
      setErr(`Microphone unavailable: ${(e as Error).message}. You can upload a file instead.`)
    }
  }

  const run = async () => {
    if (!clip) return
    setBusy(true)
    setErr(null)
    setSelected(null)
    try {
      const r = await api.analyze(clip.wav, sura, from, to, moshaf)
      setResult(r)
      const lanes = r.errors.reduce((acc, e) => ((acc[laneOf(e)] += 1), acc), { word: 0, sound: 0, tajweed: 0 })
      setHistory((h) => ({
        ...h,
        [key]: [...(h[key] || []), { at: Date.now(), per: r.phoneme_error_rate, reliable: r.reliable, ...lanes, seconds: r.timing.inference_seconds }],
      }))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const tryAgain = () => {
    setResult(null)
    setSelected(null)
    setClip((old) => (old && URL.revokeObjectURL(old.url), null))
  }

  const words = useMemo(() => {
    if (result) return result.words
    if (!ayat) return []
    let i = 0
    return ayat.flatMap((a) => a.words.map((text) => ({ idx: i++, aya: a.aya, text, status: 'ok' as const })))
  }, [result, ayat])

  const maxAyah = sample.surahs.find((s) => s.sura === sura)?.ayat.length ?? 286

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <ServiceStatus health={health} healthErr={healthErr} />

        {/* 1. Passage */}
        <section className="rounded-2xl border border-rule bg-sheet p-6">
          <StepLabel n={1} title="Choose a passage" hint="Reference: Tanzil Uthmani 1.1 (verbatim)" />
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const on = p.sura === sura && p.from === from && p.to === to
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => (setSura(p.sura), setFrom(p.from), setTo(p.to))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink'}`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
            <NumField label="Surah" value={sura} min={1} max={114} onChange={(v) => (setSura(v), setFrom(1), setTo(1))} />
            <NumField label="From ayah" value={from} min={1} max={maxAyah} onChange={(v) => (setFrom(v), setTo(Math.max(v, to)))} />
            <NumField label="To ayah" value={to} min={from} max={maxAyah} onChange={setTo} />
            <span className="pb-2 text-xs text-ink/50">Keep it under {health?.max_audio_seconds ?? 30} s of recitation.</span>
          </div>
          <div className="mt-6 min-h-24 rounded-xl bg-paper/60 px-5 py-2">
            {passageErr ? <p className="py-6 text-sm text-alert">{passageErr}</p> : <QuranWords words={words} selected={selected} onSelect={setSelected} />}
          </div>
          {result && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink/70">
              <Legend className="decoration-amber decoration-wavy bg-amber/10" label="Suspected difference" />
              <Legend className="decoration-violet decoration-dotted bg-violet/10" label="Tajweed observation (rule evidence)" />
              {!result.reliable && <span>Grey = not assessed (engine abstained)</span>}
            </div>
          )}
        </section>

        {/* 2. Audio */}
        <section className="rounded-2xl border border-rule bg-sheet p-6">
          <StepLabel n={2} title="Recite or load a recording" hint="Only authorised recordings" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleRecord}
              disabled={busy}
              className={`flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium ${rec ? 'bg-alert text-paper' : 'bg-ink text-paper hover:bg-moss'} disabled:opacity-40`}
            >
              <span className={`h-3 w-3 ${rec ? 'rounded-sm bg-paper' : 'rounded-full bg-alert'}`} />
              {rec ? `Stop · ${elapsed.toFixed(1)} s` : 'Record'}
            </button>
            {rec && (
              <div className="h-2 w-40 overflow-hidden rounded-full bg-rule" aria-hidden>
                <div className="h-full bg-moss transition-[width]" style={{ width: `${Math.min(100, level * 140)}%` }} />
              </div>
            )}
            <label className="cursor-pointer rounded-full border border-rule px-4 py-2.5 text-sm hover:border-ink">
              Upload audio
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setClipFrom(f, f.name).catch((x) => setErr(`Could not decode file: ${(x as Error).message}`))
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {clip && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-paper/60 p-3">
              <audio src={clip.url} controls className="h-10" />
              <span className="text-xs text-ink/60">
                {clip.name} · {clip.seconds.toFixed(1)} s · 16 kHz mono (converted on this device)
              </span>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={!clip || !online || busy || !!passageErr}
              className="rounded-full bg-moss px-6 py-3 text-sm font-medium text-paper hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Running Muaalem…' : 'Analyse with Muaalem'}
            </button>
            {!online && <span className="text-xs text-ink/60">Disabled until the engine is online.</span>}
            {err && <span className="text-sm text-alert">{err}</span>}
          </div>
        </section>

        {result && <Results r={result} selected={selected} onTryAgain={tryAgain} showRaw={showRaw} setShowRaw={setShowRaw} />}
      </div>

      {/* Side rail */}
      <aside className="space-y-6">
        <section className="rounded-2xl border border-rule bg-sheet p-5">
          <h3 className="text-sm font-semibold">Recitation settings (Hafs)</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink/60">
            These lengths define the reference. If they don't match the way you were taught, valid recitation will be flagged as a Tajweed difference.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <Choice label="Madd munfasil" value={moshaf.madd_monfasel_len} options={[2, 4, 5]} onChange={(v) => setMoshaf({ ...moshaf, madd_monfasel_len: v })} />
            <Choice label="Madd muttasil" value={moshaf.madd_mottasel_len} options={[4, 5, 6]} onChange={(v) => setMoshaf({ ...moshaf, madd_mottasel_len: v })} />
            <Choice label="Madd ʿarid (at stop)" value={moshaf.madd_aared_len} options={[2, 4, 6]} onChange={(v) => setMoshaf({ ...moshaf, madd_aared_len: v })} />
          </div>
        </section>

        <section className="rounded-2xl border border-rule bg-sheet p-5">
          <h3 className="text-sm font-semibold">Attempts on {key}</h3>
          {(history[key] || []).length === 0 ? (
            <p className="mt-2 text-xs text-ink/60">No attempts yet. After practice, re-record the same passage to compare.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-xs">
              {(history[key] || []).map((a, i) => (
                <li key={a.at} className="flex items-center justify-between rounded-lg bg-paper/70 px-3 py-2">
                  <span className="font-medium">#{i + 1}</span>
                  {a.reliable ? (
                    <span className="text-ink/70">
                      {a.word} word · {a.sound} sound · {a.tajweed} tajweed
                    </span>
                  ) : (
                    <span className="text-amber">abstained</span>
                  )}
                  <span className="font-mono text-ink/50">PER {(a.per * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink/50">Kept in memory for this tab only. Fewer flags is not proof of improvement; the engine can miss errors.</p>
        </section>

        <details className="rounded-2xl border border-rule bg-sheet p-5 text-sm">
          <summary className="cursor-pointer font-semibold">AI notice (always available)</summary>
          <div className="mt-3">
            <AiNotice compact />
          </div>
        </details>
      </aside>
    </div>
  )
}

function Results({
  r,
  selected,
  onTryAgain,
  showRaw,
  setShowRaw,
}: {
  r: Analysis
  selected: number | null
  onTryAgain: () => void
  showRaw: boolean
  setShowRaw: (v: boolean) => void
}) {
  const lanes = { word: [] as [number, ReciterError][], sound: [] as [number, ReciterError][], tajweed: [] as [number, ReciterError][] }
  r.errors.forEach((e, i) => lanes[laneOf(e)].push([i, e]))
  const top = r.verse_search?.[0]
  const matchesSelected = top && 'start' in top && top.start.sura === r.passage.sura && top.start.aya === r.passage.aya_from
  const wordText = (e: ReciterError) => e.word_indices.map((i) => r.words[i]?.text).filter(Boolean).join(' ')
  const sel = (e: [number, ReciterError]) => selected == null || e[1].word_indices.includes(selected)

  return (
    <section className="space-y-5 rounded-2xl border border-ink/80 bg-sheet p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <StepLabel n={3} title="What the engine heard" hint={`${r.timing.inference_seconds.toFixed(2)} s inference · ${r.timing.audio_seconds.toFixed(1)} s audio · CPU`} />
        </div>
        <button type="button" onClick={onTryAgain} className="rounded-full border border-ink px-5 py-2.5 text-sm font-medium hover:bg-ink hover:text-paper">
          Practise, then try this passage again
        </button>
      </div>

      {!r.reliable ? (
        <div className="rounded-xl border border-amber/50 bg-amber/10 p-4 text-sm leading-relaxed">
          <p className="font-semibold text-amber">Not enough evidence to give corrections.</p>
          <p className="mt-1 text-ink/80">{r.abstain_reason}</p>
          {top && 'start' in top && !matchesSelected && (
            <p className="mt-2 text-ink/80">
              The audio resembles <strong>{top.start.sura}:{top.start.aya}</strong>. Did you recite a different passage?
            </p>
          )}
        </div>
      ) : r.errors.length === 0 ? (
        <div className="rounded-xl border border-moss/40 bg-moss/10 p-4 text-sm">
          <p className="font-semibold text-moss">No differences detected against the reference.</p>
          <p className="mt-1 text-ink/70">This means the engine found nothing, not that the recitation is certified correct. Confirm with your teacher.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Lane title="Verse identification" sub="Which passage does the audio match?">
          {top && 'start' in top ? (
            <p className="text-sm">
              Best match <strong>{top.start.sura}:{top.start.aya}</strong>
              {top.end.aya !== top.start.aya ? `–${top.end.aya}` : ''}{' '}
              {matchesSelected ? <span className="text-moss">· matches your selection</span> : <span className="text-amber">· differs from your selection</span>}
            </p>
          ) : (
            <p className="text-sm text-ink/60">No confident match in the phonetic index.</p>
          )}
        </Lane>

        <Lane title="Word-level differences" sub="Possible memorisation slips (omission, extra, swap)" count={r.reliable ? lanes.word.length : undefined}>
          {r.reliable && lanes.word.filter(sel).map(([i, e]) => <ErrorRow key={i} label={wordLabel(e)} words={wordText(e)} e={e} />)}
          {r.reliable && lanes.word.length === 0 && <Empty />}
        </Lane>

        <Lane title="Sound-level differences" sub="Letters and short vowels (phonetic)" count={r.reliable ? lanes.sound.length : undefined}>
          {r.reliable && lanes.sound.filter(sel).map(([i, e]) => <ErrorRow key={i} label={`${describe(e)}${e.error_type === 'tashkeel' ? ' (vowel)' : ''}`} words={wordText(e)} e={e} />)}
          {r.reliable && lanes.sound.length === 0 && <Empty />}
        </Lane>

        <Lane title="Tajweed observations" sub="Shown only when a rule is attached as evidence" count={r.reliable ? lanes.tajweed.length : undefined}>
          {r.reliable &&
            lanes.tajweed.filter(sel).map(([i, e]) => {
              const rules = [...(e.ref_tajweed_rules || []), ...(e.missing_tajweed_rules || []), ...(e.replaced_tajweed_rules || [])]
              return (
                <div key={i} className="rounded-lg bg-violet/5 p-3 text-sm">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span dir="rtl" lang="ar" className="font-naskh font-semibold text-violet">
                      {rules.map((x) => x.name.ar).join('، ')}
                    </span>
                    <span className="text-xs text-ink/60">{rules.map((x) => x.name.en).join(', ')}</span>
                  </p>
                  <p dir="rtl" lang="ar" className="mt-1 font-quran text-xl">{wordText(e)}</p>
                  {e.expected_len != null && (
                    <p className="mt-1 text-xs text-ink/70">
                      Expected about {e.expected_len} counts, heard about {e.predicted_len ?? '?'} (model estimate)
                    </p>
                  )}
                </div>
              )
            })}
          {r.reliable && lanes.tajweed.length === 0 && <Empty text="No rule-backed Tajweed observation. Many rules are not assessed by this engine." />}
        </Lane>
      </div>

      <div className="grid gap-3 rounded-xl bg-paper/70 p-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">Reference phonemes</p>
          <p dir="rtl" lang="ar" className="phon mt-1 text-lg">{r.reference_phonemes}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">Predicted phonemes (model output)</p>
          <p dir="rtl" lang="ar" className="phon mt-1 text-lg">{r.predicted_phonemes}</p>
        </div>
        <p className="text-xs text-ink/60 md:col-span-2">
          Phoneme error rate {(r.phoneme_error_rate * 100).toFixed(1)}% · mean phoneme probability {r.mean_phoneme_prob?.toFixed(2)} (uncalibrated) ·{' '}
          {r.low_confidence_phoneme_count} low-confidence phonemes · {r.privacy}
        </p>
      </div>

      <button type="button" onClick={() => setShowRaw(!showRaw)} className="text-xs text-ink/60 underline">
        {showRaw ? 'Hide' : 'Show'} raw engine JSON
      </button>
      {showRaw && <pre className="max-h-96 overflow-auto rounded-xl bg-ink p-4 text-[11px] leading-relaxed text-paper">{JSON.stringify({ ...r, phoneme_probs: `[${r.phoneme_probs.length} values]` }, null, 2)}</pre>}
    </section>
  )
}

function ErrorRow({ label, words, e }: { label: string; words: string; e: ReciterError }) {
  return (
    <div className="rounded-lg bg-amber/5 p-3 text-sm">
      <p className="font-medium text-amber">{label}</p>
      {words && <p dir="rtl" lang="ar" className="font-quran text-xl">{words}</p>}
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink/60">
        <span>
          expected <span className="phon text-ink">{e.expected_ph || '∅'}</span>
        </span>
        <span>
          heard <span className="phon text-ink">{e.preditected_ph || '∅'}</span>
        </span>
      </p>
    </div>
  )
}

function Lane({ title, sub, count, children }: { title: string; sub: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rule p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {count != null && <span className="font-mono text-xs text-ink/50">{count}</span>}
      </div>
      <p className="text-xs text-ink/55">{sub}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  )
}

const Empty = ({ text = 'Nothing flagged.' }: { text?: string }) => <p className="text-sm text-ink/50">{text}</p>

function StepLabel({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <span className="font-mono text-xs text-moss">0{n}</span>
      <h3 className="font-display text-xl">{title}</h3>
      {hint && <span className="text-xs text-ink/50">{hint}</span>}
    </div>
  )
}

function NumField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Math.max(min, Math.min(max, Number(e.target.value) || min))
          onChange(v)
        }}
        className="w-24 rounded-lg border border-rule bg-paper px-3 py-2 font-mono"
      />
    </label>
  )
}

function Choice({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink/80">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
            className={`h-8 w-8 rounded-full border text-xs ${o === value ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`rounded px-1.5 underline decoration-2 underline-offset-4 ${className}`}>كلمة</span>
      {label}
    </span>
  )
}
