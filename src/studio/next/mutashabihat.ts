// Verified Quranic similarity references (mutashabihat lafziyya) for the preview.
//
// INTEGRITY RULES
//  - Only records taken from a real, traceable scholarly source belong here, each
//    reviewed by a named person. Nothing is generated, guessed or mined from a
//    word search; automatic text matches are a separate, labelled lens.
//  - `a` / `b` are references only. The verse text is always loaded from the
//    verified KFGQPC Hafs edition at runtime and differences are highlighted
//    against that exact text — never hand-typed here.
//  - `note` is the distinction as stated by the source, quoted, not paraphrased by AI.
//
// No verified dataset is bundled yet, so this list is intentionally empty and the
// Memorization Journey shows an honest empty state for every passage.
import { inPassage, pairId, type Passage, type Ref } from './session'

export type SimKind = 'start' | 'end' | 'wording' | 'sequence'
export type VerifiedSimilarity = {
  a: Ref
  b: Ref
  kind: SimKind
  /** The distinction exactly as the source states it (Arabic). */
  note: string
  source: { title: string; author: string; edition?: string; page?: string; url?: string }
  status: 'verified'
  /** Who checked the record against the source. */
  verifiedBy: string
}

export const VERIFIED_SIMILARITIES: VerifiedSimilarity[] = []

/** A record is shown only if it is fully traceable. */
export const isTraceable = (r: VerifiedSimilarity) =>
  r.status === 'verified' && !!r.source.title.trim() && !!r.source.author.trim() && !!r.verifiedBy.trim() && !!r.note.trim()

export const KIND_AR: Record<SimKind, { ar: string; why: string }> = {
  start: { ar: 'بداية متشابهة', why: 'تبدأ بألفاظ متقاربة' },
  end: { ar: 'خاتمة متشابهة', why: 'تُختم بألفاظ متقاربة' },
  wording: { ar: 'لفظ متقارب في سورة أخرى', why: 'تتقارب ألفاظها مع' },
  sequence: { ar: 'تسلسل قد يلتبس', why: 'يتشابه سياقها وترتيبها مع' },
}
const ORDER: SimKind[] = ['start', 'end', 'wording', 'sequence']

/** Verified records touching the passage; the current ayah first, then beginnings, endings, wording, sequences. */
export function verifiedFor(p: Passage, cur: number) {
  return VERIFIED_SIMILARITIES.filter(isTraceable)
    .flatMap((r) => (inPassage(p, r.a) ? [{ rec: r, mine: r.a, other: r.b }] : inPassage(p, r.b) ? [{ rec: r, mine: r.b, other: r.a }] : []))
    .map((x) => ({ ...x, id: pairId(x.mine, x.other) }))
    .sort((x, y) => Number(y.mine.a === cur) - Number(x.mine.a === cur) || ORDER.indexOf(x.rec.kind) - ORDER.indexOf(y.rec.kind) || x.mine.a - y.mine.a)
}
export type VerifiedMatch = ReturnType<typeof verifiedFor>[number]
