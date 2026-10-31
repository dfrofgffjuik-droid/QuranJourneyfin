// Typed client for poc/muaalem/server.py (proxied by Vite at /muaalem).

export type TajweedRule = { name: { ar: string; en: string }; golden_len: number; correctness_type: string; tag: string | null }

export type ReciterError = {
  uthmani_pos: [number, number]
  ph_pos: [number, number]
  error_type: 'normal' | 'tajweed' | 'tashkeel'
  speech_error_type: 'insert' | 'delete' | 'replace'
  expected_ph: string
  preditected_ph: string
  expected_len: number | null
  predicted_len: number | null
  ref_tajweed_rules: TajweedRule[] | null
  replaced_tajweed_rules: TajweedRule[] | null
  missing_tajweed_rules: TajweedRule[] | null
  inserted_tajweed_rules: TajweedRule[] | null
  word_indices: number[]
  has_tajweed_evidence: boolean
}

export type Word = { idx: number; aya: number; sura: number; text: string; status: 'ok' | 'suspected' | 'tajweed' | 'unassessed'; error_ids: number[] }
export type Ayah = { sura: number; aya: number; sura_name: string; uthmani: string; words: string[] }

export type Analysis = {
  model: string
  passage: { sura: number; aya_from: number; aya_to: number; ayat: Ayah[] }
  reference_phonemes: string
  predicted_phonemes: string
  phoneme_probs: number[]
  phoneme_error_rate: number
  reliable: boolean
  abstain_reason: string | null
  low_confidence_phoneme_count: number
  min_phoneme_prob: number | null
  mean_phoneme_prob: number | null
  errors: ReciterError[]
  words: Word[]
  verse_search: { start: { sura: number; aya: number; word: number }; end: { sura: number; aya: number; word: number }; uthmani_text: string }[] | null
  timing: { audio_seconds: number; inference_seconds: number; real_time_factor: number; server_total_seconds?: number }
  privacy?: string
}

export type Health = { status: string; model: string; model_loaded: boolean; model_error: string | null; max_audio_seconds: number }

const BASE = '/muaalem'

async function json<T>(r: Response): Promise<T> {
  const body = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
  return body as T
}

export async function health(signal?: AbortSignal): Promise<Health> {
  const r = await fetch(`${BASE}/health`, { signal, cache: 'no-store' })
  const ct = r.headers.get('content-type') || ''
  if (!ct.includes('json')) throw new Error('Inference service is not reachable')
  return json<Health>(r)
}

export async function passage(sura: number, from: number, to: number): Promise<Ayah[]> {
  const r = await fetch(`${BASE}/passage?sura=${sura}&from=${from}&to=${to}`)
  return (await json<{ ayat: Ayah[] }>(r)).ayat
}

export type MoshafOptions = { madd_monfasel_len: number; madd_mottasel_len: number; madd_aared_len: number }

export async function analyze(wav: Blob, sura: number, from: number, to: number, m: MoshafOptions): Promise<Analysis> {
  const q = new URLSearchParams({ sura: String(sura), from: String(from), to: String(to) })
  for (const [k, v] of Object.entries(m)) q.set(k, String(v))
  const r = await fetch(`${BASE}/analyze?${q}`, { method: 'POST', body: wav, headers: { 'Content-Type': 'audio/wav' } })
  return json<Analysis>(r)
}
