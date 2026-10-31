// Tafsir from the Quran Foundation public API (api.quran.com, v4). Text is shown
// verbatim with its book, author and source; nothing is generated or summarised.

export type TafsirBook = { id: number; ar: string; en: string; author: string; authorEn: string; kind: string; kindEn: string }

export const TAFSIRS: TafsirBook[] = [
  { id: 16, ar: 'التفسير الميسّر', en: 'Al-Muyassar', author: 'نخبة من العلماء · مجمع الملك فهد لطباعة المصحف الشريف', authorEn: 'King Fahd Quran Complex', kind: 'مختصر · لكل آية', kindEn: 'Concise · every ayah' },
  { id: 91, ar: 'تفسير السعدي', en: "Al-Sa'di", author: 'الشيخ عبد الرحمن بن ناصر السعدي · تيسير الكريم الرحمن', authorEn: "Abd al-Rahman al-Sa'di", kind: 'ميسّر · تدبّري', kindEn: 'Accessible · reflective' },
  { id: 14, ar: 'تفسير ابن كثير', en: 'Ibn Kathir', author: 'الحافظ إسماعيل بن كثير · تفسير القرآن العظيم', authorEn: 'Hafiz Ibn Kathir', kind: 'بالمأثور · مفصّل', kindEn: 'Narration-based · detailed' },
  { id: 15, ar: 'تفسير الطبري', en: 'Al-Tabari', author: 'ابن جرير الطبري · جامع البيان', authorEn: 'Ibn Jarir al-Tabari', kind: 'موسوعي', kindEn: 'Encyclopaedic' },
  { id: 94, ar: 'تفسير البغوي', en: 'Al-Baghawi', author: 'الحسين بن مسعود البغوي · معالم التنزيل', authorEn: 'Al-Baghawi', kind: 'متوسط', kindEn: 'Medium length' },
  { id: 90, ar: 'تفسير القرطبي', en: 'Al-Qurtubi', author: 'أبو عبد الله القرطبي · الجامع لأحكام القرآن', authorEn: 'Al-Qurtubi', kind: 'أحكام', kindEn: 'Rulings' },
]
export const tafsirBook = (id: number) => TAFSIRS.find((t) => t.id === id) ?? TAFSIRS[0]
export const TAFSIR_SOURCE = { name: 'Quran Foundation · Quran.com API', url: 'https://quran.com' }

export type Seg = { t: string; quote?: boolean }
export type TafsirText = { paragraphs: Seg[][]; words: number }

const BLOCK = new Set(['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE'])

/** Turn the API's HTML into plain paragraphs. Only text is kept; no markup is injected. */
function parse(html: string): TafsirText {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const paras: Seg[][] = [[]]
  const walk = (n: Node, quote: boolean) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? '').replace(/\s+/g, ' ')
      if (t.trim()) paras[paras.length - 1].push({ t, quote })
      return
    }
    if (!(n instanceof Element)) return
    const block = BLOCK.has(n.tagName)
    if (block && paras[paras.length - 1].length) paras.push([])
    const q = quote || (n.tagName === 'SPAN' && n.classList.contains('arabic') && (n.classList.contains('brown') || /^\s*[({﴿«]/.test(n.textContent ?? '')))
    n.childNodes.forEach((c) => walk(c, q))
    if (block && paras[paras.length - 1].length) paras.push([])
  }
  if (doc.body.firstChild) walk(doc.body.firstChild, false)
  const paragraphs = paras.filter((p) => p.some((s) => s.t.trim()))
  const words = paragraphs.reduce((n, p) => n + p.reduce((m, s) => m + s.t.split(/\s+/).filter(Boolean).length, 0), 0)
  return { paragraphs, words }
}

const cache = new Map<string, Promise<TafsirText>>()
export function loadTafsir(id: number, s: number, a: number): Promise<TafsirText> {
  const k = `${id}/${s}:${a}`
  if (!cache.has(k)) {
    const p = fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { tafsir?: { text?: string } }) => parse(d.tafsir?.text ?? ''))
    p.catch(() => cache.delete(k))
    cache.set(k, p)
  }
  return cache.get(k)!
}
