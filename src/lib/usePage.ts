import { useEffect, useState } from 'react'
import { PAGES, fromGIndex, gIndex, hasBismillahHeader, hizbOf, juzOf, loadMushaf, pageEnd, surah, type Pos } from './quran'

export type PageBlock = { s: number; header: boolean; bism: boolean; ayat: { a: number; t: string }[] }
export type MushafPageData = { pg: number; blocks: PageBlock[]; hafs: boolean; juz: number; hizb: number; quarter: number; start: Pos; end: Pos }

export const TOTAL_PAGES = PAGES.length // 604, Madani mushaf (Tanzil metadata)
export const clampPage = (pg: number) => Math.min(TOTAL_PAGES, Math.max(1, Math.round(pg) || 1))
export const pageStart = (pg: number): Pos => PAGES[clampPage(pg) - 1]

/** Every surah that has at least one ayah on the page, with its ayah range. */
export function pageSpans(pg: number): { s: number; from: number; to: number }[] {
  const start = pageStart(pg)
  const end = pageEnd(clampPage(pg))
  const out: { s: number; from: number; to: number }[] = []
  for (let g = gIndex(...start); g <= gIndex(...end); ) {
    const [s, a] = fromGIndex(g)
    const to = s === end[0] ? end[1] : surah(s).ayat
    out.push({ s, from: a, to })
    g += to - a + 1
  }
  return out
}

const cache = new Map<number, Promise<MushafPageData>>()
export function loadPage(pg: number): Promise<MushafPageData> {
  pg = clampPage(pg)
  if (!cache.has(pg)) {
    const spans = pageSpans(pg)
    const p = Promise.all(spans.map((x) => loadMushaf(x.s))).then((texts) => {
      const start = pageStart(pg)
      const h = hizbOf(...start)
      return {
        pg,
        start,
        end: pageEnd(pg),
        juz: juzOf(...start),
        hizb: h.hizb,
        quarter: h.quarter,
        hafs: texts.every((t) => t.hafs),
        blocks: spans.map((x, i) => ({
          s: x.s,
          header: x.from === 1,
          bism: x.from === 1 && hasBismillahHeader(x.s),
          ayat: texts[i].ayat.slice(x.from - 1, x.to).map((t, k) => ({ a: x.from + k, t })),
        })),
      }
    })
    p.catch(() => cache.delete(pg))
    cache.set(pg, p)
  }
  return cache.get(pg)!
}

/** One Mushaf page of verified text; neighbours are prefetched for smooth turning. */
export function usePage(pg: number) {
  const [st, setSt] = useState<{ d: MushafPageData | null; error: boolean }>({ d: null, error: false })
  useEffect(() => {
    let live = true
    setSt((x) => (x.d?.pg === pg ? x : { d: null, error: false }))
    loadPage(pg)
      .then((d) => live && setSt({ d, error: false }))
      .catch(() => live && setSt({ d: null, error: true }))
    if (pg < TOTAL_PAGES) void loadPage(pg + 1).catch(() => {})
    if (pg > 1) void loadPage(pg - 1).catch(() => {})
    return () => {
      live = false
    }
  }, [pg])
  return st
}
