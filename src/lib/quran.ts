import index from '../data/surahs.json'
import meta from '../data/quran-meta.json'

// Verified text: Tanzil Uthmani 1.1 (CC BY 3.0), split per surah into
// public/quran/{n}.json. Never edited, never generated.
export type SurahMeta = { n: number; ar: string; en: string; meaning: string; place: string; ayat: number; pages: number[] }
export const SURAHS = index.surahs as SurahMeta[]
export const BISMILLAH = index.bismillah
export const QURAN_SOURCE = index.source
export const surah = (n: number) => SURAHS[n - 1]

const cache = new Map<number, Promise<string[]>>()
export function loadSurah(n: number): Promise<string[]> {
  if (!cache.has(n)) {
    const p = fetch(`${import.meta.env.BASE_URL}quran/${n}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { ayat: string[] }) => d.ayat)
    p.catch(() => cache.delete(n))
    cache.set(n, p)
  }
  return cache.get(n)!
}

/** KFGQPC Hafs edition (display only, paired with the KFGQPC HAFS font). */
const hafsCache = new Map<number, Promise<string[]>>()
export function loadHafs(n: number): Promise<string[]> {
  if (!hafsCache.has(n)) {
    const p = fetch(`${import.meta.env.BASE_URL}quran-hafs/${n}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { ayat: string[] }) => d.ayat)
    p.catch(() => hafsCache.delete(n))
    hafsCache.set(n, p)
  }
  return hafsCache.get(n)!
}
/** Reading text: KFGQPC Hafs when available, otherwise the Tanzil text (with its own font). */
export const loadMushaf = (n: number): Promise<{ ayat: string[]; hafs: boolean }> =>
  loadHafs(n)
    .then((ayat) => ({ ayat, hafs: true }))
    .catch(() => loadSurah(n).then((ayat) => ({ ayat, hafs: false })))
export const BISMILLAH_HAFS = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'
/** Decorative marks that are not words (hizb quarter, sajdah). */
export const isMark = (w: string) => w === '۞' || w === '۩'

// KFGQPC text joins ۞ to the next word with a no-break space; treat it as a separator.
export const words = (ayah: string) => ayah.split(/[ \u00a0]/).filter(Boolean)

/** First grapheme (letter + its harakat) of a word, used as a recall cue. */
export function firstLetter(word: string) {
  type Seg = new (l: string, o: { granularity: 'grapheme' }) => { segment(s: string): Iterable<{ segment: string }> }
  const Ctor = (Intl as unknown as { Segmenter?: Seg }).Segmenter
  const seg = Ctor ? new Ctor('ar', { granularity: 'grapheme' }) : null
  if (seg) {
    for (const s of seg.segment(word)) return s.segment
  }
  return word.slice(0, 2)
}

export const hasBismillahHeader = (n: number) => n !== 1 && n !== 9

// Verified Madani mushaf metadata (Tanzil quran-data.xml, CC BY 3.0): starts of
// the 604 pages, 240 hizb quarters and 30 juz as [surah, ayah].
export type Pos = [number, number]
export const META_SOURCE = meta.source
export const PAGES = meta.pages as Pos[]
export const QUARTERS = meta.quarters as Pos[]
export const JUZ = meta.juz as Pos[]
export const TOTAL_AYAT = 6236

const before = (x: Pos, y: Pos) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1])
/** 1-based index of the last start that is <= pos. */
function locate(starts: Pos[], s: number, a: number) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (before([s, a], starts[mid])) hi = mid - 1
    else lo = mid
  }
  return lo + 1
}
export const juzOf = (s: number, a: number) => locate(JUZ, s, a)
export const pageOf = (s: number, a: number) => locate(PAGES, s, a)
/** Hizb (1–60) and quarter within it (1–4). */
export function hizbOf(s: number, a: number) {
  const q = locate(QUARTERS, s, a)
  return { hizb: Math.ceil(q / 4), quarter: ((q - 1) % 4) + 1 }
}
export const isPageStart = (s: number, a: number) => {
  const p = pageOf(s, a)
  return PAGES[p - 1][0] === s && PAGES[p - 1][1] === a
}

// Global ayah index (1..6236) for ranges that cross surahs.
const OFFSET: number[] = []
SURAHS.reduce((acc, x) => (OFFSET.push(acc), acc + x.ayat), 0)
export const gIndex = (s: number, a: number) => OFFSET[s - 1] + a
export function fromGIndex(g: number): Pos {
  const c = Math.min(TOTAL_AYAT, Math.max(1, g))
  let s = 1
  while (s < 114 && OFFSET[s] < c) s++
  return [s, c - OFFSET[s - 1]]
}
/** Last ayah of a juz / page (the ayah before the next start). */
export const juzEnd = (j: number): Pos => (j >= 30 ? [114, 6] : fromGIndex(gIndex(...JUZ[j]) - 1))
export const pageEnd = (pg: number): Pos => (pg >= 604 ? [114, 6] : fromGIndex(gIndex(...PAGES[pg]) - 1))

export const toAr = (n: number | string) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

// Juz 'Amma (78–114), the usual starting point for children and new huffaz.
export const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i)
export const SHORT_SURAHS_FOR_KIDS = [1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101]

export type Reciter = { id: string; ar: string; en: string; folder: string }
// Per-ayah recordings streamed from EveryAyah.com (not bundled).
export const RECITERS: Reciter[] = [
  { id: 'husary', ar: 'محمود خليل الحصري (مرتّل)', en: 'Al-Husary (murattal)', folder: 'Husary_128kbps' },
  { id: 'husary_muallim', ar: 'الحصري (المصحف المعلّم)', en: 'Al-Husary (teaching)', folder: 'Husary_Muallim_128kbps' },
  { id: 'minshawi', ar: 'محمد صديق المنشاوي (مرتّل)', en: 'Al-Minshawi (murattal)', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'alafasy', ar: 'مشاري راشد العفاسي', en: 'Mishary Alafasy', folder: 'Alafasy_128kbps' },
]
export const reciter = (id: string) => RECITERS.find((r) => r.id === id) ?? RECITERS[0]
export const ayahAudioUrl = (reciterId: string, s: number, a: number) =>
  `https://everyayah.com/data/${reciter(reciterId).folder}/${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3`
