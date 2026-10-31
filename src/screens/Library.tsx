import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { SurahBadge } from '../components/Mushaf'
import { Card, Empty, ProgressRing, ScreenHeader, Segmented } from '../components/ui'
import { useL } from '../lib/i18n'
import { JUZ, SURAHS, surah, toAr } from '../lib/quran'
import { memorizedCount, parseKey, useActive } from '../lib/store'

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[-'ʿ’\s]/g, '')
    .replace(/^(al|an|ar|as|ash|at|ad|adh|az)/, '')
    .replace(/^ال/, '')

export function Library() {
  const { L, N, A, lang } = useL()
  const p = useActive()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'juz' | 'amma' | 'saved' | 'mine'>('all')

  const list = useMemo(() => {
    const nq = norm(q.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
    return SURAHS.filter((s) => {
      if (filter === 'amma' && s.n < 78) return false
      if (filter === 'mine' && (!p || memorizedCount(p, s.n) === 0)) return false
      if (!nq) return true
      return String(s.n) === nq || norm(s.ar).includes(nq) || norm(s.en).includes(nq) || norm(s.meaning).includes(nq)
    })
  }, [q, filter, p])

  return (
    <div>
      <ScreenHeader title={L('المصحف', 'The Quran')} subtitle={L('١١٤ سورة · الرسم العثماني', '114 surahs · Uthmani script')} />
      <div className="sticky top-[60px] z-20 -mx-5 space-y-3 bg-parchment/90 px-5 pb-4 pt-1 backdrop-blur md:static md:mx-0 md:px-0">
        <label className="flex h-13 items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line focus-within:ring-night/40">
          <Icon name="search" className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('ابحث باسم السورة أو رقمها', 'Search by surah name or number')} className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted/70" aria-label={L('بحث', 'Search')} />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={L('مسح', 'Clear')}>
              <Icon name="x" size={18} className="text-muted" />
            </button>
          )}
        </label>
        <div className="no-scrollbar overflow-x-auto">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: L('السور', 'Surahs') },
              { value: 'juz', label: L('الأجزاء', 'Juz') },
              { value: 'amma', label: L('جزء عمّ', 'Juz ʿAmma') },
              { value: 'mine', label: L('محفوظاتي', 'Memorised') },
              { value: 'saved', label: L('المحفوظة', 'Saved') },
            ]}
          />
        </div>
      </div>

      {filter === 'juz' ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {JUZ.map(([js, ja], i) => (
            <li key={i}>
              <a href={`#/surah/${js}?a=${ja}`} className="block rounded-2xl bg-card p-4 ring-1 ring-line transition hover:ring-gold/50">
                <span className="block text-xs text-muted">{L('الجزء', 'Juz')}</span>
                <span className="block text-2xl font-bold text-night">{N(i + 1)}</span>
                <span className="mt-1 block truncate text-xs text-muted">{lang === 'ar' ? `${surah(js).ar} ${toAr(ja)}` : `${surah(js).en} ${ja}`}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : filter === 'saved' ? (
        !p || (p.bookmarks.length === 0 && !Object.keys(p.notes ?? {}).length) ? (
          <Empty icon="bookmark" title={L('لا آيات محفوظة بعد', 'Nothing saved yet')} body={L('اضغط على أي آية في المصحف ثم «احفظ الآية» أو «ملاحظة» لتعود إليها.', 'Tap any ayah while reading, then “Save” or “Note”.')} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {[...new Set([...p.bookmarks, ...Object.keys(p.notes ?? {})])].map((k) => {
              const [s, a] = parseKey(k)
              const note = p.notes?.[k]
              return (
                <Card key={k} className="flex items-start gap-3 p-4">
                  <Icon name={p.bookmarks.includes(k) ? 'bookmark' : 'note'} className="mt-0.5 text-gold" fill={p.bookmarks.includes(k)} />
                  <a href={`#/surah/${s}?a=${a}`} className="min-w-0 flex-1">
                    <span className="block font-medium">{lang === 'ar' ? `${surah(s).ar} · الآية ${toAr(a)}` : `${surah(s).en} · ayah ${a}`}</span>
                    {note && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{note}</span>}
                  </a>
                  <a href={`#/tafsir/${s}/${a}`} className="shrink-0 rounded-full bg-gold-soft/70 px-3 py-1.5 text-xs font-medium text-gold">
                    {L('التفسير', 'Tafsir')}
                  </a>
                </Card>
              )
            })}
          </div>
        )
      ) : list.length === 0 ? (
        <Empty icon="search" title={L('لا نتائج', 'No results')} body={L('جرّب اسمًا آخر أو رقمًا من ١ إلى ١١٤.', 'Try another name or a number from 1 to 114.')} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((s) => {
            const m = p ? memorizedCount(p, s.n) : 0
            return (
              <li key={s.n}>
                <a href={`#/surah/${s.n}`} className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-line transition hover:ring-night/30">
                  <SurahBadge n={s.n} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{lang === 'ar' ? `سورة ${s.ar}` : s.en}</span>
                    <span className="block truncate text-xs text-muted">
                      {lang === 'ar' ? `${s.place === 'makkah' ? 'مكية' : 'مدنية'} · ${A(s.ayat)}` : `${s.meaning} · ${s.place === 'makkah' ? 'Meccan' : 'Medinan'} · ${s.ayat} ayat`}
                    </span>
                  </span>
                  <span dir="rtl" className="font-quran text-2xl text-night/80">
                    {s.ar}
                  </span>
                  {m > 0 && (
                    <ProgressRing value={m / s.ayat} size={34} stroke={3.5}>
                      {m >= s.ayat ? <Icon name="check" size={14} className="text-leaf" /> : null}
                    </ProgressRing>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
