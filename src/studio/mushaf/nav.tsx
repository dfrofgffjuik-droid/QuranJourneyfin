// Mushaf navigation for the design preview: the Phase 1 page / surah / juz panel,
// now driven by the real Tanzil metadata (604 pages, 114 surahs, 30 juz).
// Shared by the mobile bottom sheet and the desktop popover. Design only.
import { useEffect, useMemo, useState } from 'react'
import { I } from '../kit'
import { JUZ, PAGES, juzOf, surah } from '../../lib/quran'
import { SURAHS, TOTAL_PAGES, clampPage, juzName, juzStart, parsePage, surahName, surahStart, toAr, type Go, type PageData } from './page'

export type NavTab = 'page' | 'surah' | 'juz'

/** Loose match for Arabic (diacritics, hamza forms, ta marbuta, "سورة") and English (case, "al-", punctuation). */
const norm = (x: string) =>
  x
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^\s*(سوره|surah|sura)\s*/, '')
    .replace(/[^a-z0-9\u0621-\u064A]/g, '')

export function searchSurahs(q: string) {
  const n = parsePage(q) // digits in any script → surah number
  if (n !== null) return SURAHS.filter((s) => s.n === n)
  const k = norm(q)
  if (!k) return SURAHS
  return SURAHS.filter((s) => norm(s.ar).includes(k) || norm(s.en).includes(k) || norm(s.en).replace(/^a[ln]/, '').startsWith(k))
}

/** `tab` + `onTab` make the panel controlled (desktop toolbar); otherwise it keeps its own tab, starting at `initial`. */
export function NavPanel({ pg, d, onGo, initial = 'page', tab: tabIn, onTab, listH = 300 }: { pg: number; d: PageData | null; onGo?: Go; initial?: NavTab; tab?: NavTab; onTab?: (t: NavTab) => void; listH?: number }) {
  const [own, setOwn] = useState<NavTab>(initial)
  useEffect(() => setOwn(initial), [initial])
  const tab = tabIn ?? own
  const setTab = (t: NavTab) => (onTab ? onTab(t) : setOwn(t))
  const [q, setQ] = useState('')
  const [n, setN] = useState(pg)
  const [typed, setTyped] = useState<string | null>(null)
  useEffect(() => (setN(pg), setTyped(null)), [pg])
  const list = useMemo(() => searchSurahs(q), [q])
  const at = PAGES[n - 1]
  const curJuz = d?.juz ?? juzOf(...PAGES[pg - 1])
  const go = onGo ?? (() => {})
  const pct = ((n - 1) / (TOTAL_PAGES - 1)) * 100
  const step = (k: number) => (setTyped(null), setN((x) => clampPage(x + k)))

  return (
    <div>
      <div role="tablist" className="mb-5 grid grid-cols-3 rounded-full bg-(--ui-ink)/[.06] p-1 text-[13.5px]">
        {([['page', 'صفحة'], ['surah', 'سورة'], ['juz', 'جزء']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`mp-press h-9 rounded-full ${tab === k ? 'bg-(--ui-card) font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-(--ui-muted)'}`}>{l}</button>
        ))}
      </div>

      {tab === 'page' && (
        <div>
          <div className="flex items-center justify-center gap-6">
            <button type="button" onClick={() => step(-1)} disabled={n <= 1} aria-label="الصفحة السابقة" className="mp-press flex h-12 w-12 items-center justify-center rounded-full bg-(--ui-ink)/[.06] disabled:opacity-35"><I n="minus" s={20} /></button>
            <div className="text-center">
              <input
                aria-label="رقم الصفحة (١–٦٠٤)"
                inputMode="numeric"
                value={typed ?? toAr(n)}
                onChange={(e) => {
                  setTyped(e.target.value)
                  const v = parsePage(e.target.value)
                  if (v) setN(v)
                }}
                onBlur={() => setTyped(null)}
                onKeyDown={(e) => e.key === 'Enter' && parsePage(e.currentTarget.value) && go(parsePage(e.currentTarget.value)!)}
                className={`mp-serif w-[150px] bg-transparent text-center text-[56px] font-bold leading-none tabular-nums outline-none ${typed !== null && !parsePage(typed) ? 'text-(--ui-muted)' : ''}`}
              />
              <p className="mt-1 text-[12px] text-(--ui-muted)">من ٦٠٤ صفحة · {surahName(at[0])} · {juzName(juzOf(...at))}</p>
            </div>
            <button type="button" onClick={() => step(1)} disabled={n >= TOTAL_PAGES} aria-label="الصفحة التالية" className="mp-press flex h-12 w-12 items-center justify-center rounded-full bg-(--ui-ink)/[.06] disabled:opacity-35"><I n="plus" s={20} /></button>
          </div>
          <div className="relative mx-1 mt-8 h-1.5 rounded-full bg-(--ui-ink)/10">
            <span className="absolute inset-y-0 start-0 rounded-full bg-(--accent)" style={{ width: `${pct}%` }} />
            <span className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_1px_5px_rgba(0,0,0,.3)]" style={{ insetInlineStart: `${pct}%` }} />
            <input type="range" dir="rtl" min={1} max={TOTAL_PAGES} value={n} onChange={(e) => (setTyped(null), setN(Number(e.target.value)))} aria-label="الصفحة" className="absolute -inset-x-3 -top-3 h-7 cursor-pointer opacity-0" />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-(--ui-muted)"><span>١</span><span>٣٠٢</span><span>٦٠٤</span></div>
          <button type="button" onClick={() => go(n)} className="mp-press mt-5 flex h-12 w-full items-center justify-center rounded-full bg-(--ui-ink) text-[14px] font-semibold text-(--ui-bg)">
            {n === pg ? `أنت في الصفحة ${toAr(n)}` : `انتقل إلى الصفحة ${toAr(n)}`}
          </button>
          <p className="mb-2 mt-6 text-[12.5px] font-semibold text-(--ui-muted)">متابعة القراءة <span className="font-normal">(أمثلة)</span></p>
          <div className="space-y-2">
            {([['آخر قراءة', 'سورة البقرة · صفحة ٣', 'clock', 3], ['العلامة المرجعية', 'سورة الكهف · صفحة ٢٩٣', 'bookmark', 293]] as const).map(([a, b, icon, p]) => (
              <button key={a} type="button" onClick={() => go(p, p === 293 ? { s: 18, a: 1 } : undefined)} className="mp-press flex w-full items-center gap-3 rounded-[16px] bg-(--ui-ink)/[.04] px-4 py-3 text-start hover:bg-(--ui-ink)/[.07]">
                <I n={icon} s={18} className="text-(--accent)" />
                <span className="flex-1 text-[13.5px]"><b className="font-semibold">{a}</b> <span className="text-(--ui-muted)">· {b}</span></span>
                <I n="chevron" s={16} className="rotate-180 text-(--ui-muted)" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'surah' && (
        <div>
          <label className="mb-3 flex h-11 items-center gap-2 rounded-full bg-(--ui-ink)/[.05] px-4 text-[13.5px] text-(--ui-muted) focus-within:ring-2 focus-within:ring-(--accent)">
            <I n="search" s={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن سورة · Search surah" aria-label="ابحث عن سورة بالعربية أو الإنجليزية" className="h-full min-w-0 flex-1 bg-transparent text-(--ui-ink) outline-none placeholder:text-(--ui-muted)" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="مسح البحث"><I n="x" s={15} /></button>}
          </label>
          <p className="mb-1.5 px-1 text-[11.5px] text-(--ui-muted)">{toAr(list.length)} من ١١٤ سورة</p>
          <div className="mp-scroll -mx-1 space-y-1 overflow-y-auto overscroll-contain" style={{ maxHeight: listH }}>
            {list.map((s) => {
              const here = d?.surahs.includes(s.n)
              const start = surahStart(s.n)
              return (
                <button key={s.n} type="button" onClick={() => go(start.pg, start.focus)} aria-current={here ? 'true' : undefined} className={`mp-press flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-start ${here ? 'bg-(--accent-soft)' : 'hover:bg-(--ui-ink)/[.04]'}`}>
                  <span className="mp-serif flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-(--frame) text-[13px]">{toAr(s.n)}</span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[14px] font-medium">{surahName(s.n)}</span>
                    <span className="block text-[11.5px] text-(--ui-muted)" dir="ltr" style={{ textAlign: 'right' }}>{s.en} · {toAr(s.ayat)} آية</span>
                  </span>
                  <span className="text-[12px] text-(--ui-muted)">ص {toAr(start.pg)}</span>
                </button>
              )
            })}
            {list.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-(--ui-muted)">لا توجد سورة بهذا الاسم</p>}
          </div>
        </div>
      )}

      {tab === 'juz' && (
        <div className="mp-scroll overflow-y-auto" style={{ maxHeight: listH + 70 }}>
          <div className="grid grid-cols-5 gap-2">
            {JUZ.map((_, k) => {
              const j = k + 1
              const st = juzStart(j)
              return (
                <button key={j} type="button" onClick={() => go(st.pg, st.focus)} aria-current={j === curJuz ? 'true' : undefined} title={`${juzName(j)} · ${surahName(st.focus.s)} ${toAr(st.focus.a)} · ص ${toAr(st.pg)}`} className={`mp-press flex h-14 flex-col items-center justify-center rounded-[14px] leading-none ${j === curJuz ? 'bg-(--ui-ink) text-(--ui-bg)' : 'bg-(--ui-ink)/[.05] hover:bg-(--ui-ink)/[.09]'}`}>
                  <span className="mp-serif text-[17px]">{toAr(j)}</span>
                  <span className={`mt-1 text-[10px] ${j === curJuz ? 'opacity-70' : 'text-(--ui-muted)'}`}>ص {toAr(st.pg)}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-(--ui-muted)">يبدأ كل جزء من موضعه الفعلي في بيانات Tanzil؛ الأجزاء ٤ و٧ و١١ و٢٦ تبدأ في منتصف صفحة.</p>
        </div>
      )}
    </div>
  )
}

/** Review-chrome page selector (outside the device frames): all 604 pages, plus surah / juz shortcuts. */
export function PageSelector({ pg, onGo }: { pg: number; onGo: Go }) {
  const [typed, setTyped] = useState<string | null>(null)
  // Navigation from anywhere else (reader, dock, sheet) replaces stale typed text.
  useEffect(() => setTyped((t) => (t !== null && parsePage(t) === pg ? t : null)), [pg])
  const bad = typed !== null && typed.trim() !== '' && parsePage(typed) === null
  const [s0, a0] = PAGES[pg - 1]
  const sel = 'h-8 rounded-full bg-white px-2.5 text-[12.5px] text-black/75 ring-1 ring-black/10'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onGo(clampPage(pg - 1))} disabled={pg <= 1} aria-label="Previous page" className="h-8 w-8 rounded-full bg-black/[.05] text-black/65 hover:bg-black/[.09] disabled:opacity-35">‹</button>
      <input
        aria-label="Page (1–604, Arabic or English digits)"
        inputMode="numeric"
        value={typed ?? String(pg)}
        onChange={(e) => {
          setTyped(e.target.value)
          const v = parsePage(e.target.value)
          if (v) onGo(v)
        }}
        onBlur={() => setTyped(null)}
        className={`h-8 w-14 rounded-full bg-white text-center text-[13px] font-semibold tabular-nums outline-none ring-1 ${bad ? 'ring-[#cf5b45]' : 'ring-black/10 focus:ring-black/40'}`}
      />
      <span className="text-black/40">/ 604</span>
      <button type="button" onClick={() => onGo(clampPage(pg + 1))} disabled={pg >= TOTAL_PAGES} aria-label="Next page" className="h-8 w-8 rounded-full bg-black/[.05] text-black/65 hover:bg-black/[.09] disabled:opacity-35">›</button>
      <input type="range" min={1} max={TOTAL_PAGES} value={pg} onChange={(e) => (setTyped(null), onGo(Number(e.target.value)))} aria-label="Page slider" className="w-40 accent-[#16181d]" />
      <select aria-label="Surah" value={s0} onChange={(e) => { const st = surahStart(Number(e.target.value)); onGo(st.pg, st.focus) }} className={`${sel} max-w-[190px]`}>
        {SURAHS.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.en} · {s.ar}</option>)}
      </select>
      <select aria-label="Juz" value={juzOf(s0, a0)} onChange={(e) => { const st = juzStart(Number(e.target.value)); onGo(st.pg, st.focus) }} className={sel}>
        {JUZ.map((_, k) => <option key={k} value={k + 1}>Juz {k + 1}</option>)}
      </select>
      {bad && <span className="text-[11.5px] text-[#cf5b45]">Enter 1–604</span>}
      <span className="sr-only">{surah(s0).en}</span>
    </div>
  )
}
