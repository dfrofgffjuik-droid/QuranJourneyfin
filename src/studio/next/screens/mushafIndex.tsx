// فهرس المصحف — surah / juz index that opens the Digital Mushaf (design preview).
// All figures come from the project's metadata (surahs.json, Tanzil quran-meta):
// ayah counts, Makki/Madani, starting pages and juz start positions.
import { useMemo, useState } from 'react'
import { JUZ, PAGES, juzEnd, juzOf, pageOf, surah } from '../../../lib/quran'
import { searchSurahs } from '../../mushaf/nav'
import { juzName, juzStart, surahStart, type Focus } from '../../mushaf/page'
import { Chrome, Head, Icon, toAr, useDevice } from '../core'

type Tab = 'surah' | 'juz'
/** Arabic count agreement: 3–10 take the plural آيات, everything else the singular آية. */
const ayatLabel = (n: number) => `${toAr(n)} ${n >= 3 && n <= 10 ? 'آيات' : 'آية'}`
const AMIRI = { fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }

function Diamond({ n, on }: { n: number; on?: boolean }) {
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <span className={`absolute inset-[7px] rotate-45 rounded-[9px] transition-colors ${on ? 'bg-gold text-white' : 'bg-night/[.06] group-hover:bg-gold-soft'}`} />
      <span className={`relative text-[14px] font-semibold tabular-nums ${on ? 'text-white' : ''}`}>{toAr(n)}</span>
    </span>
  )
}

export function MushafIndex({ pg, onOpen }: { pg: number; onOpen: (pg: number, focus?: Focus) => void }) {
  const desk = useDevice() === 'desktop'
  const [tab, setTab] = useState<Tab>('surah')
  const [asc, setAsc] = useState(true)
  const [q, setQ] = useState('')
  const [s0, a0] = PAGES[pg - 1]
  const curJuz = juzOf(s0, a0)
  const surahs = useMemo(() => {
    const l = searchSurahs(q)
    return asc ? l : [...l].reverse()
  }, [q, asc])
  const juz = useMemo(() => {
    const l = JUZ.map((_, k) => k + 1)
    return asc ? l : l.reverse()
  }, [asc])
  const card = 'group press flex w-full items-center gap-3.5 rounded-[20px] bg-card p-3.5 text-start ring-1 ring-line transition-shadow hover:shadow-[0_12px_30px_-20px_rgba(16,24,40,.45)] hover:ring-gold/40'

  return (
    <Chrome dock={!desk}>
      <div className={desk ? 'mx-auto max-w-[1000px] px-8 py-8' : 'px-5 pt-4'}>
        <Head
          title="المصحف الرقمي"
          sub="١١٤ سورة · ٣٠ جزءًا · ٦٠٤ صفحات — اختر سورة أو جزءًا لتبدأ القراءة من موضعه."
          action={
            <button type="button" onClick={() => onOpen(pg)} className="press flex h-11 shrink-0 items-center gap-2 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">
              <Icon name="book" size={17} />
              {desk ? `تابع القراءة · ص ${toAr(pg)}` : `ص ${toAr(pg)}`}
            </button>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex gap-1 border-b border-line">
            {([['surah', 'سورة'], ['juz', 'جزء']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 pb-2.5 text-[15px] ${tab === k ? 'border-gold font-semibold text-night' : 'border-transparent text-muted hover:text-night'}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={() => setAsc(!asc)} aria-label={`الترتيب: ${asc ? 'تصاعدي' : 'تنازلي'}`} className="press ms-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-muted hover:bg-night/[.04]">
            ترتيب: <b className="font-semibold text-night">{asc ? 'تصاعدي' : 'تنازلي'}</b>
            <Icon name="chevron" size={14} className={asc ? 'rotate-90' : '-rotate-90'} />
          </button>
        </div>

        {tab === 'surah' && (
          <label className="mb-4 flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[13.5px] text-muted ring-1 ring-line focus-within:ring-2 focus-within:ring-gold">
            <Icon name="search" size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم السورة أو رقمها · Search" aria-label="ابحث عن سورة بالعربية أو الإنجليزية" className="h-full min-w-0 flex-1 bg-transparent text-night outline-none placeholder:text-muted" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="مسح البحث"><Icon name="x" size={15} /></button>}
          </label>
        )}

        {tab === 'surah' ? (
          <ul className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-1'}`} aria-label="السور">
            {surahs.map((x) => {
              const st = surahStart(x.n)
              const here = x.n === s0
              return (
                <li key={x.n}>
                  <button type="button" onClick={() => onOpen(st.pg, st.focus)} aria-current={here ? 'true' : undefined} className={card}>
                    <Diamond n={x.n} on={here} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[21px] font-bold" style={AMIRI}>{x.ar}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted" dir="ltr" style={{ textAlign: 'right' }}>{x.en} · {x.meaning}</span>
                    </span>
                    <span className="shrink-0 text-end leading-tight">
                      <span className="block text-[12.5px] font-medium">{ayatLabel(x.ayat)}</span>
                      <span className="mt-1 block text-[11px] text-muted">{x.place === 'makkah' ? 'مكية' : 'مدنية'} · ص {toAr(st.pg)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {surahs.length === 0 && <li className="col-span-full py-10 text-center text-[13.5px] text-muted">لا توجد سورة بهذا الاسم</li>}
          </ul>
        ) : (
          <ul className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-1'}`} aria-label="الأجزاء">
            {juz.map((j) => {
              const st = juzStart(j)
              const [e1, e2] = juzEnd(j)
              const endPg = pageOf(e1, e2)
              return (
                <li key={j}>
                  <button type="button" onClick={() => onOpen(st.pg, st.focus)} aria-current={j === curJuz ? 'true' : undefined} className={card}>
                    <Diamond n={j} on={j === curJuz} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[18px] font-bold" style={AMIRI}>{juzName(j)}</span>
                      <span className="mt-1 block truncate text-[12px] text-muted">
                        {surah(st.focus.s).ar} {toAr(st.focus.a)} ← {surah(e1).ar} {toAr(e2)}
                      </span>
                    </span>
                    <span className="shrink-0 text-end text-[11px] leading-tight text-muted">
                      <span className="block text-[12.5px] font-medium text-night">ص {toAr(st.pg)}</span>
                      <span className="mt-1 block">إلى {toAr(endPg)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-6 pb-4 text-center text-[11.5px] leading-relaxed text-muted">أسماء السور بخط Amiri · البيانات من فهرس المشروع وبيانات Tanzil لصفحات مصحف المدينة</p>
      </div>
    </Chrome>
  )
}
