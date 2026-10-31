import { useStore } from './store'
import { toAr } from './quran'

// Arabic-first, inline bilingual strings: L('الرئيسية', 'Home')
export function useL() {
  const lang = useStore((s) => s.lang)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const N = (n: number | string) => (lang === 'ar' ? toAr(n) : String(n))
  /** Count of ayat with Arabic number–noun agreement: ١ آية، ٢ آيتان، ٣ آيات، ١١ آية */
  const A = (n: number) => {
    if (lang !== 'ar') return `${n} ${n === 1 ? 'ayah' : 'ayat'}`
    const m = n % 100
    if (n === 2) return 'آيتان'
    if (m >= 3 && m <= 10) return `${toAr(n)} آيات`
    return `${toAr(n)} آية`
  }
  return { L, N, A, lang, dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const) }
}
