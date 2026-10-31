// Real Tilawa (@tilawa/core 0.4.0, Zipformer a0w-ep1-a0.5 int8) run on the
// exact clips exported by poc/muaalem/export_cases.py. CPU, onnxruntime-node.
//
//   TILAWA_DIR=/tmp/tilawa-test CASES=/tmp/rafiqi-cases node poc/tilawa/benchmark.mjs
//
// TILAWA_DIR must contain node_modules/{@tilawa/core,onnxruntime-node} and the
// NPL-1.2 assets zipformer_a0w_ep1_a05.int8.onnx, zipformer_quran.json, quran.json.
// Assets are NOT committed (NPL-1.2 share-alike; see poc/README.md).
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = process.env.TILAWA_DIR || '/tmp/tilawa-test'
const casesDir = process.env.CASES || '/tmp/rafiqi-cases'
const req = createRequire(path.join(dir, 'package.json'))
const ort = req('onnxruntime-node')
const core = await import(path.join(dir, 'node_modules/@tilawa/core/dist/index.js'))

const model = await readFile(path.join(dir, 'zipformer_a0w_ep1_a05.int8.onnx'))
const corpus = JSON.parse(await readFile(path.join(dir, 'zipformer_quran.json'), 'utf8'))
const quran = JSON.parse(await readFile(path.join(dir, 'quran.json'), 'utf8'))
const manifest = JSON.parse(await readFile(path.join(casesDir, 'manifest.json'), 'utf8'))

const CHUNK = Math.round(0.3 * 16000)

async function runOnce(samples, mode, expected) {
  const events = []
  const session = await core.createZipformerSession({
    ort,
    model: () => model,
    corpus: () => corpus,
    quran: () => quran,
    onEvent: (m) => events.push(m),
  })
  if (mode === 'correction') {
    session.setMode('correction')
    session.setExpected(expected)
  }
  const t0 = performance.now()
  for (let i = 0; i < samples.length; i += CHUNK) await session.feed(samples.subarray(i, i + CHUNK))
  await session.stop()
  const seconds = (performance.now() - t0) / 1000
  const verses = events.filter((e) => e.type === 'verse_match').map((e) => `${e.surah}:${e.ayah}`)
  const issues = events
    .filter((e) => e.type === 'correction' && e.state?.issue)
    .map((e) => ({ kind: e.state.issue.kind, surah: e.state.issue.surah, ayah: e.state.issue.ayah, word: e.state.issue.word, wordIndex: e.state.issue.wordIndex, words: e.state.issue.words, source: e.state.issue.source }))
  const uniq = [...new Map(issues.map((x) => [`${x.kind}|${x.ayah}|${x.word}`, x])).values()]
  const transcript = events.filter((e) => e.type === 'raw_transcript').pop()?.text ?? null
  return { verses: [...new Set(verses)], issues: uniq, transcript, seconds }
}

const rows = []
for (const c of manifest) {
  const buf = await readFile(path.join(casesDir, `${c.id}.f32`))
  const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  const audioSeconds = samples.length / 16000
  const expected = { surah: c.sura, ayah: c.aya_from, ayahEnd: c.aya_to }
  const tracking = await runOnce(samples, 'tracking', null)
  const correction = await runOnce(samples, 'correction', expected)

  const want = []
  for (let a = c.aya_from; a <= c.aya_to; a++) want.push(`${c.sura}:${a}`)
  const lab = c.label.errors[0]
  const score = { verse_id_correct: tracking.verses[0] === want[0], verses_tracked: tracking.verses, n_issues: correction.issues.length }
  if (c.category.startsWith('correct')) score.false_alerts = correction.issues.length
  else if (lab?.kind === 'ayah_omission') {
    score.detected = correction.issues.length > 0
    score.location_correct = correction.issues.some((i) => i.ayah === lab.aya)
  } else if (lab?.kind === 'wrong_passage') {
    score.flagged_or_unmatched = correction.issues.length > 0 || !tracking.verses.includes(want[0])
  } else if (lab) {
    const ok = lab.kind === 'repetition' ? [lab.word, lab.word + 1] : [lab.word]
    score.detected = correction.issues.length > 0
    score.location_correct = correction.issues.some((i) => i.ayah === c.aya_from && ok.includes(i.word))
  }
  rows.push({ id: c.id, category: c.category, reciter: c.reciter, passage: `${c.sura}:${c.aya_from}-${c.aya_to}`, label: c.label, score, tracking, correction, audio_seconds: audioSeconds })
  console.log(c.id, JSON.stringify(score), JSON.stringify(correction.issues))
}

const here = path.dirname(fileURLToPath(import.meta.url))
await mkdir(path.join(here, 'results'), { recursive: true })
await writeFile(
  path.join(here, 'results', 'tilawa-results.json'),
  JSON.stringify({ meta: { generated_at: new Date().toISOString(), engine: '@tilawa/core 0.4.0 + zipformer_a0w_ep1_a05.int8.onnx', runtime: `onnxruntime-node ${ort.env?.versions?.common ?? ''}`, hardware: 'CPU only', teacher_reviewed: false }, rows }, null, 1),
)
console.log('wrote', path.join(here, 'results', 'tilawa-results.json'))
