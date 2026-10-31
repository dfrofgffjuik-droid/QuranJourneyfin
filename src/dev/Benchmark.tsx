import { useMemo, useState } from 'react'
import muaalemJson from '../data/benchmark-muaalem.json'
import tilawaJson from '../data/benchmark-tilawa.json'
import sensitivityJson from '../data/moshaf-sensitivity.json'

type MErr = { error_type: string; speech_error_type: string; expected_ph: string; preditected_ph: string; expected_len: number | null; predicted_len: number | null; word_indices: number[]; rules: string[] }
type MRow = {
  id: string
  category: string
  reciter: string
  source: string
  label: { errors: Record<string, unknown>[] }
  score: {
    reliable: boolean
    per: number
    flagged_words: number[]
    non_tajweed_flagged_words: number[]
    tajweed_flagged_words: number[]
    n_words: number
    false_alert_words_non_tajweed?: number
    false_alert_words_tajweed?: number
    verse_id_correct?: boolean
    detected?: boolean
    location_correct?: boolean
    abstained?: boolean
  }
  timing: { audio_seconds: number; inference_seconds: number; real_time_factor: number }
  output: { reference_phonemes: string; predicted_phonemes: string; errors: MErr[]; words: { idx: number; aya: number; text: string; status: string }[]; abstain_reason: string | null }
}
type TRow = {
  id: string
  category: string
  reciter: string
  audio_seconds: number
  score: { verse_id_correct: boolean; false_alerts?: number; detected?: boolean; location_correct?: boolean; flagged_or_unmatched?: boolean }
  correction: { issues: { kind: string; ayah: number; word: number }[]; seconds: number }
}
const muaalem = muaalemJson as unknown as { meta: { generated_at: string; model_load_seconds: number; not_run: { id: string; audio_seconds: number; reason: string }[] }; rows: MRow[] }
const tilawa = tilawaJson as unknown as { meta: { generated_at: string }; rows: TRow[] }
const sensitivity = sensitivityJson as { reciter: string; override: Record<string, number>; rows: { id: string; tajweed_flags: number; other_flags: number }[] }

const CATS: { key: string; label: string }[] = [
  { key: 'word_omission', label: 'Word omission' },
  { key: 'word_repetition', label: 'Word repetition' },
  { key: 'word_substitution', label: 'Word substitution' },
  { key: 'ayah_omission', label: 'Ayah omission (multi-ayah)' },
]

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}
const p90 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0
}

const UNTESTED = [
  ['Real learner recitations (children or adults)', 'No consented learner recordings exist yet. All audio here is professional reciters.'],
  ['Pronunciation errors (makharij, letter swaps such as ح/ه, ض/د)', 'Requires human-recorded mistakes; cannot be produced honestly by splicing.'],
  ['Tajweed errors (madd length, ghunnah, qalqalah, ikhfa, idgham)', 'Requires a reciter deliberately making them plus teacher annotation. Detection of real Tajweed mistakes is UNPROVEN.'],
  ['Teacher-verified labels', 'No qualified teacher has reviewed any clip or label. Constructed labels are known by construction only.'],
  ['Noisy phone recordings, children’s voices, women’s voices, slow learners', 'Not represented in the test set.'],
  ['Long passages (> 30 s) and live streaming feedback', 'Muaalem runs on whole clips; streaming was not evaluated.'],
  ['On-device (browser or phone) Muaalem', 'No ONNX/mobile export exists; only server-side CPU inference was measured.'],
]

export function Benchmark() {
  const m = muaalem.rows
  const t = tilawa.rows
  const [open, setOpen] = useState<string | null>(null)

  const stats = useMemo(() => {
    const correct = m.filter((r) => r.category === 'correct')
    const byReciter = [...new Set(correct.map((r) => r.reciter))].map((rec) => {
      const rs = correct.filter((r) => r.reciter === rec)
      return {
        rec,
        n: rs.length,
        clean: rs.filter((r) => r.score.reliable && r.score.non_tajweed_flagged_words.length === 0 && r.score.tajweed_flagged_words.length === 0).length,
        fpWords: rs.reduce((a, r) => a + (r.score.false_alert_words_non_tajweed ?? 0), 0),
        fpTaj: rs.reduce((a, r) => a + (r.score.false_alert_words_tajweed ?? 0), 0),
        words: rs.reduce((a, r) => a + r.score.n_words, 0),
        abstained: rs.filter((r) => !r.score.reliable).length,
        verseOk: rs.filter((r) => r.score.verse_id_correct).length,
        tFalse: t.filter((x) => x.category === 'correct' && x.reciter === rec).reduce((a, x) => a + (x.score.false_alerts ?? 0), 0),
        tVerseOk: t.filter((x) => x.category === 'correct' && x.reciter === rec && x.score.verse_id_correct).length,
        tN: t.filter((x) => x.category === 'correct' && x.reciter === rec).length,
      }
    })
    const cats = CATS.map((c) => {
      const rs = m.filter((r) => r.category === c.key)
      const ts = t.filter((r) => r.category === c.key)
      return {
        ...c,
        n: rs.length,
        detected: rs.filter((r) => r.score.detected).length,
        located: rs.filter((r) => r.score.location_correct).length,
        abstained: rs.filter((r) => !r.score.reliable).length,
        tN: ts.length,
        tDetected: ts.filter((r) => r.score.detected).length,
        tLocated: ts.filter((r) => r.score.location_correct).length,
      }
    })
    const wrong = m.filter((r) => r.category === 'wrong_passage')
    const multi = m.filter((r) => r.category === 'correct_multi')
    const infer = m.map((r) => r.timing.inference_seconds)
    const rtf = m.map((r) => r.timing.real_time_factor)
    const tRtf = t.map((r) => r.correction.seconds / r.audio_seconds)
    return { byReciter, cats, wrong, multi, infer, rtf, tRtf, correctN: correct.length }
  }, [m, t])

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">Benchmark · v0 (engineering smoke test)</p>
        <h2 className="font-display text-4xl leading-tight">What actually ran, and what it showed</h2>
        <p className="leading-relaxed text-ink/75">
          Every number below is computed in your browser from the recorded engine outputs in <code className="font-mono text-sm">poc/*/results/</code>. Audio is professional murattal recitation
          (Husary, Alafasy, Minshawi via QuranicAudio / Quran.com); errors were <em>constructed by splicing</em> at Quran.com word timestamps. This is not learner speech and{' '}
          <strong>no Quran teacher has reviewed the labels</strong>.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Tag tone="alert">Teacher-verified benchmark: NOT COMPLETED</Tag>
          <Tag tone="alert">Tajweed-error detection: UNTESTED</Tag>
          <Tag tone="moss">Muaalem run {muaalem.meta.generated_at.slice(0, 10)}</Tag>
          <Tag tone="moss">Tilawa run {tilawa.meta.generated_at.slice(0, 10)}</Tag>
        </div>
      </header>

      <section className="space-y-4">
        <H3 n="A" title="Correct recitations — false alerts" />
        <p className="max-w-3xl text-sm text-ink/70">
          One clip per ayah of Al-Fatiha 2–7, Al-Ikhlas, Al-Falaq, and An-Nas. Every word flagged here is a false alarm, because the recitations are professional. Muaalem used one fixed Hafs setting
          (munfasil 4, muttasil 4, ʿarid 4) for all reciters.
        </p>
        <Table
          head={['Reciter', 'Clips', 'Muaalem: clips with zero flags', 'Muaalem: false word flags (non-Tajweed)', 'Muaalem: false Tajweed flags', 'Muaalem: verse ID', 'Tilawa: false flags', 'Tilawa: verse ID']}
          rows={stats.byReciter.map((r) => [
            r.rec.replace('_murattal', ''),
            r.n,
            `${r.clean}/${r.n}`,
            `${r.fpWords} of ${r.words} words`,
            `${r.fpTaj} of ${r.words} words`,
            `${r.verseOk}/${r.n}`,
            `${r.tFalse} in ${r.tN} clips`,
            `${r.tVerseOk}/${r.tN}`,
          ])}
        />
        <p className="text-sm text-ink/70">
          Multi-ayah correct passages (Husary): Muaalem flagged {stats.multi.reduce((a, r) => a + r.score.flagged_words.length, 0)} words across {stats.multi.length} passages.
        </p>
        <div className="max-w-3xl rounded-xl border border-violet/30 bg-violet/5 p-4 text-sm leading-relaxed">
          <p className="font-semibold text-violet">Moshaf configuration test</p>
          <p className="mt-1 text-ink/80">
            Every Muaalem Tajweed flag on Minshawi was "madd ʿarid: expected 4, heard 2". Hafs permits 2, 4, or 6 for ʿarid. Re-running his {sensitivity.rows.length} clips with ʿarid ={' '}
            {sensitivity.override.madd_aared_len} gave <strong>{sensitivity.rows.reduce((a, r) => a + r.tajweed_flags, 0)} Tajweed flags</strong> and{' '}
            {sensitivity.rows.reduce((a, r) => a + r.other_flags, 0)} other flag(s). So these were reference-configuration mismatches, not recitation errors. The madd-count channel does track
            real duration on professional audio. That does not yet show it catches learners' madd mistakes.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <H3 n="B" title="Known memorisation errors — detected, missed, located" />
        <Table
          head={['Error type', 'Cases', 'Muaalem detected', 'Muaalem correct location', 'Muaalem abstained', 'Tilawa detected', 'Tilawa correct location']}
          rows={stats.cats.map((c) => [c.label, c.n, `${c.detected}/${c.n}`, `${c.located}/${c.n}`, `${c.abstained}`, `${c.tDetected}/${c.tN}`, `${c.tLocated}/${c.tN}`])}
        />
        <p className="max-w-3xl text-sm text-ink/70">
          "Detected" means at least one non-Tajweed difference was reported while the engine did not abstain. "Correct location" means a flag landed on the target word (or the word after a
          repetition, where the insertion is reported). Tilawa's correction mode pauses after its first issue and waits for a retry, so only its first flag per clip is scored.
        </p>
      </section>

      <section className="space-y-4">
        <H3 n="C" title="Wrong passage — does it refuse to correct?" />
        <Table
          head={['Case', 'Muaalem PER', 'Muaalem abstained', 'Tilawa flagged / did not match']}
          rows={stats.wrong.map((r) => {
            const tr = t.find((x) => x.id === r.id)
            return [r.id.replace('wrong_passage_', '').replace(/_/g, ' '), `${Math.round(r.score.per * 100)}%`, r.score.abstained ? 'yes' : 'no', tr ? (tr.score.flagged_or_unmatched ? 'yes' : 'no') : '—']
          })}
        />
      </section>

      <section className="space-y-4">
        <H3 n="D" title="Cost and privacy" />
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Muaalem inference per clip (median / p90)" value={`${median(stats.infer).toFixed(2)} s / ${p90(stats.infer).toFixed(2)} s`} note={`RTF median ${median(stats.rtf).toFixed(2)}; 6 CPU threads, no GPU, bf16`} />
          <Stat label="Muaalem memory & size" value="≈3.3 GB peak RSS" note={`2.4 GB fp32 weights (loaded as bf16). Cold load ≈20 s (first run); warm reload 2–6 s. Max inference ${Math.max(...stats.infer).toFixed(1)} s (longest clip). ${muaalem.meta.not_run.map((x) => `${x.id} (${x.audio_seconds} s) not run: ${x.reason}`).join('; ')}`} />
          <Stat label="Tilawa (whole session, median RTF)" value={median(stats.tRtf).toFixed(2)} note="66 MB int8 ONNX, onnxruntime-node CPU. Also runs in-browser via WASM, so audio never has to leave the device." />
        </div>
        <p className="max-w-3xl text-sm text-ink/70">
          <strong>Does audio leave the device?</strong> Muaalem: yes, today. It needs a Python server (here, the same machine as the browser preview); no browser or mobile build exists. Tilawa: no, it is
          designed for fully on-device use.
        </p>
      </section>

      <section className="space-y-4">
        <H3 n="E" title="Not tested — do not infer anything about these" />
        <ul className="grid gap-3 md:grid-cols-2">
          {UNTESTED.map(([a, b]) => (
            <li key={a} className="rounded-xl border border-dashed border-alert/50 bg-alert/5 p-4">
              <p className="text-sm font-semibold">{a}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/70">{b}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <H3 n="F" title="Every case, with raw model output" />
        <div className="overflow-hidden rounded-xl border border-rule">
          {m.map((r) => {
            const tr = t.find((x) => x.id === r.id)
            const isOpen = open === r.id
            const flagged = r.score.flagged_words.length
            return (
              <div key={r.id} className="border-b border-rule last:border-0">
                <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 bg-sheet px-4 py-2.5 text-left text-sm hover:bg-paper">
                  <span className="w-72 font-mono text-xs">{r.id}</span>
                  <span className="text-xs text-ink/60">PER {(r.score.per * 100).toFixed(0)}%</span>
                  <span className={`text-xs ${r.score.reliable ? (flagged ? 'text-amber' : 'text-moss') : 'text-ink/50'}`}>
                    {r.score.reliable ? `${flagged} word${flagged === 1 ? '' : 's'} flagged` : 'abstained'}
                  </span>
                  {tr && <span className="text-xs text-ink/60">Tilawa: {tr.correction.issues.length ? tr.correction.issues.map((i) => `${i.kind.replace('possible_', '')}@${i.ayah}:${i.word}`).join(', ') : 'no issue'}</span>}
                </button>
                {isOpen && (
                  <div className="space-y-3 bg-paper/60 px-4 py-4 text-sm">
                    <p className="text-xs text-ink/60">Label: {JSON.stringify(r.label.errors)}</p>
                    <p dir="rtl" lang="ar" className="font-quran text-2xl leading-loose">
                      {r.output.words.map((w) => (
                        <span key={w.idx} className={`px-1 ${w.status === 'suspected' ? 'underline decoration-amber decoration-wavy' : w.status === 'tajweed' ? 'underline decoration-violet decoration-dotted' : w.status === 'unassessed' ? 'text-ink/50' : ''}`}>
                          {w.text}{' '}
                        </span>
                      ))}
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <p>
                        <span className="text-xs text-ink/50">reference </span>
                        <span className="phon" dir="rtl">{r.output.reference_phonemes}</span>
                      </p>
                      <p>
                        <span className="text-xs text-ink/50">predicted </span>
                        <span className="phon" dir="rtl">{r.output.predicted_phonemes}</span>
                      </p>
                    </div>
                    {r.output.errors.length > 0 && (
                      <ul className="space-y-1 font-mono text-[11px] text-ink/80">
                        {r.output.errors.map((e, i) => (
                          <li key={i}>
                            {e.error_type}/{e.speech_error_type} words={JSON.stringify(e.word_indices)} expected=<span className="phon">{e.expected_ph || '∅'}</span> heard=<span className="phon">{e.preditected_ph || '∅'}</span>
                            {e.rules.length ? ` rules=${e.rules.join(',')}` : ''}
                            {e.expected_len != null ? ` len ${e.expected_len}→${e.predicted_len}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.output.abstain_reason && <p className="text-xs text-amber">{r.output.abstain_reason}</p>}
                    <p className="text-xs text-ink/50">
                      {r.timing.audio_seconds}s audio · {r.timing.inference_seconds}s inference · source {r.source}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function H3({ n, title }: { n: string; title: string }) {
  return (
    <h3 className="flex items-baseline gap-3 font-display text-2xl">
      <span className="font-mono text-sm text-moss">{n}</span>
      {title}
    </h3>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'alert' | 'moss' }) {
  return <span className={`rounded-full border px-3 py-1 ${tone === 'alert' ? 'border-alert/40 bg-alert/5 text-alert' : 'border-moss/40 bg-moss/5 text-moss'}`}>{children}</span>
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-rule bg-sheet p-4">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink/60">{note}</p>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-sheet">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-xs text-ink/60">
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-rule/60 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2.5 ${j === 0 ? 'font-medium' : 'font-mono text-xs'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
