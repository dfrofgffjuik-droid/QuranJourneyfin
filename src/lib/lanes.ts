import type { ReciterError } from './muaalem'

export type Lane = 'word' | 'sound' | 'tajweed'

// Grouping heuristic (NOT a model output). Muaalem reports phoneme-level
// differences; we only decide which panel to show them in.
//  - tajweed: the explainer attached a Tajweed rule to the span (evidence).
//  - word: an insertion/deletion/replacement spanning ≥3 phoneme characters,
//          which is how whole-word omissions, repetitions and swaps surface.
//  - sound: everything else (short vowel / letter-level differences).
export function laneOf(e: ReciterError): Lane {
  if (e.has_tajweed_evidence) return 'tajweed'
  const span = Math.max(e.expected_ph.length, e.preditected_ph.length)
  if (e.error_type === 'normal' && span >= 3) return 'word'
  return 'sound'
}

export function describe(e: ReciterError): string {
  const kind = { insert: 'Extra sound heard', delete: 'Expected sound not heard', replace: 'Different sound heard' }[e.speech_error_type]
  return kind
}

export function wordLabel(e: ReciterError): string {
  if (e.speech_error_type === 'delete') return 'Possible omission'
  if (e.speech_error_type === 'insert') return 'Possible extra or repeated word'
  return 'Possible different word'
}
