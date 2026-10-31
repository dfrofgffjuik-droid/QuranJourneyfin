// البحث النصي الموسّع — secondary extended-reference view of Quranic Similarities.
// The primary entry point is the «متشابهات هذا المقطع» panel inside رحلة الحفظ;
// this view receives that active passage and its linked pairs from the shared
// session, and its back button returns to the same passage and ayah.
// Data integrity: everything here is automatic textual matching over the exact
// KFGQPC Hafs text — a description of wording, never a scholarly classification
// of mutashabihat. Verified references live in ../mutashabihat (none bundled yet).
// All Quranic text is loaded verbatim, never edited.
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Chrome, Head, Icon, toAr, useDevice, useProto } from '../core'
import { SURAHS, isMark, loadMushaf, pageOf, surah, words } from '../../../lib/quran'
import { useOpenInMushaf } from './mushaf'
import { VERIFIED_SIMILARITIES, isTraceable } from '../mutashabihat'
import { inPassage, pairId, pairsForPassage, useSession, type PanelId, type PassagePair, type Ref } from '../session'

// ---- Shared UI state of this view (both device frames show the same search); pairs live in the session.
type St = { pkey: string; lens: 'textual' | 'thematic'; tab: 'discover' | 'compare' | 'practice' | 'connect'; slotA: Ref | null; slotB: Ref | null; q: string; where: 'any' | 'start' | 'end' }
let st: St = { pkey: '', lens: 'textual', tab: 'discover', slotA: null, slotB: null, q: '', where: 'any' }
const subs = new Set<() => void>()
const set = (p: Partial<St>) => ((st = { ...st, ...p }), subs.forEach((f) => f()))
const useSt = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => st)

/** Opens an ayah in the Digital Mushaf and remembers where in the journey to come back to. */
export function useOpenAndReturn(panel: PanelId | null) {
  const open = useOpenInMushaf()
  const { setAway } = useSession()
  return (s: number, a: number) => (setAway({ panel }), open(s, a))
}

// ---- Text utilities (matching only; display always uses the original words)
/** Consonantal skeleton for matching Uthmani text against typed text: drops harakat, Quranic marks, alef/hamza seats and tatweel. */
export const skel = (w: string) =>
  w
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[إأآٱاء]/g, '')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
export const tokens = (t: string) => words(t).map((w) => ({ w, k: isMark(w) ? '' : skel(w) }))
export const refAr = (r: Ref) => `${surah(r.s).ar} · ${toAr(r.a)}`

type Row = { s: number; a: number; t: string; hafs: boolean; sk: string }
let corpus: Promise<Row[]> | null = null
/** All 6,236 ayat (loaded once, verbatim, on the first search), fetched a few surahs at a time. */
export function loadCorpus() {
  corpus ??= (async () => {
    const out: Row[][] = []
    for (let i = 0; i < SURAHS.length; i += 8) {
      const batch = await Promise.all(SURAHS.slice(i, i + 8).map((x) => loadMushaf(x.n).then((r) => r.ayat.map((t, k) => ({ s: x.n, a: k + 1, t, hafs: r.hafs, sk: ` ${tokens(t).map((z) => z.k).filter(Boolean).join(' ')} ` })))))
      out.push(...batch)
    }
    return out.flat()
  })()
  corpus.catch(() => (corpus = null))
  return corpus
}
export function useAyah(r: Ref | null) {
  const [t, setT] = useState<{ key: string; t: string; hafs: boolean } | null>(null)
  const key = r ? `${r.s}:${r.a}` : ''
  useEffect(() => {
    if (!r) return
    let live = true
    loadMushaf(r.s).then((x) => live && setT({ key, t: x.ayat[r.a - 1], hafs: x.hafs }), () => {})
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return t && t.key === key ? t : null
}

/** Word-level diff (LCS over comparable words). Each original word is tagged same / diff / mark. */
export function diff(ta: string, tb: string) {
  const A = tokens(ta)
  const B = tokens(tb)
  const ia = A.map((x, i) => i).filter((i) => A[i].k)
  const ib = B.map((x, i) => i).filter((i) => B[i].k)
  const n = ia.length
  const m = ib.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[ia[i]].k === B[ib[j]].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const sa = new Set<number>()
  const sb = new Set<number>()
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (A[ia[i]].k === B[ib[j]].k) (sa.add(ia[i]), sb.add(ib[j]), i++, j++)
    else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  let pre = 0
  while (pre < Math.min(n, m) && A[ia[pre]].k === B[ib[pre]].k) pre++
  let suf = 0
  while (suf < Math.min(n, m) - pre && A[ia[n - 1 - suf]].k === B[ib[m - 1 - suf]].k) suf++
  const tag = (T: typeof A, same: Set<number>) => T.map((x, i) => ({ w: x.w, tag: !x.k ? ('mark' as const) : same.has(i) ? ('same' as const) : ('diff' as const) }))
  return { a: tag(A, sa), b: tag(B, sb), common: sa.size, onlyA: n - sa.size, onlyB: m - sb.size, pre, suf, n, m }
}

// ---- Screen
export function Similarities() {
  const desk = useDevice() === 'desktop'
  const s = useSt()
  const { go } = useProto()
  const ses = useSession()
  const { passage: p, cur } = ses.s
  const pairs = pairsForPassage(p, ses.s.pairs)
  // A new memorisation passage starts a fresh search context (temporary state only).
  const pkey = `${p.s}:${p.from}-${p.to}`
  useEffect(() => {
    if (st.pkey !== pkey) set({ pkey, slotA: { s: p.s, a: cur }, slotB: null, q: '', tab: 'discover' })
  }, [pkey]) // eslint-disable-line react-hooks/exhaustive-deps
  const back = () => go('ayah')
  const tabs = [
    { id: 'discover', ar: 'ابحث', icon: 'search' },
    { id: 'compare', ar: 'قارن', icon: 'layers' },
    { id: 'practice', ar: 'أكمل الفرق', icon: 'sprout' },
    { id: 'connect', ar: 'أيّ سورة؟', icon: 'path' },
  ] as const
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}>
        <button type="button" onClick={back} className="press mb-4 flex h-10 items-center gap-1.5 rounded-full bg-card px-4 text-[13px] font-medium ring-1 ring-line" data-back-journey>
          <Icon name="back" size={17} className="rotate-180" />
          العودة إلى رحلة الحفظ · سورة {surah(p.s).ar} · الآية {toAr(cur)}
        </button>
        <Head title="البحث النصي الموسّع" sub="مرجع إضافي اختياري: مطابقة لفظية آلية في النص القرآني كاملًا لمقطع حفظك. ليست تصنيفًا موثّقًا للمتشابهات." />
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[20px] bg-card p-3.5 text-[12.5px] ring-1 ring-line" data-context>
          <Icon name="sprout" size={16} className="text-gold" />
          <span className="font-semibold">مقطع الحفظ: سورة {surah(p.s).ar} · الآيات {toAr(p.from)}–{toAr(p.to)}</span>
          <span className="text-muted">الآية الحالية {toAr(cur)}</span>
          <span className="ms-auto rounded-full bg-gold-soft px-2.5 py-1 font-medium">{toAr(pairs.length)} مرتبطة بالمقطع</span>
        </div>
        <div role="tablist" aria-label="نوع الصلة" className="mb-4 grid grid-cols-2 rounded-full bg-night/[.05] p-1 text-[13.5px]">
          {([['textual', 'تشابه لفظي (آلي)'], ['thematic', 'روابط موضوعية']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={s.lens === k} onClick={() => set({ lens: k })} className={`press h-10 rounded-full ${s.lens === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
        {s.lens === 'thematic' ? (
          <Empty icon="sparkle" title="لا توجد روابط موضوعية موثّقة بعد" body="الروابط الموضوعية (آيات تتناول المعنى نفسه بألفاظ مختلفة) تحتاج مصدرًا علميًا موثّقًا ومراجعة. لا نعرض أمثلة مخترعة ولا تصنيفًا آليًا لها، ولا نخلطها بالتشابه اللفظي." />
        ) : (
          <>
            <DataStatus />
            <div role="tablist" aria-label="أوضاع التشابه اللفظي" className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={s.tab === t.id} onClick={() => set({ tab: t.id })} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] ${s.tab === t.id ? 'bg-night text-parchment' : 'bg-card text-night/75 ring-1 ring-line'}`}>
                  <Icon name={t.icon} size={15} />
                  {t.ar}
                  {(t.id === 'practice' || t.id === 'connect') && pairs.length > 0 && <span className="rounded-full bg-gold px-1.5 text-[10.5px] text-white">{toAr(pairs.length)}</span>}
                </button>
              ))}
            </div>
            {s.tab === 'discover' && <Discover />}
            {s.tab === 'compare' && <Compare />}
            {s.tab === 'practice' && <Practice key={ses.s.nonce} pairs={pairs} />}
            {s.tab === 'connect' && <Connect key={ses.s.nonce} pairs={pairs} />}
          </>
        )}
      </div>
    </Chrome>
  )
}

function DataStatus() {
  const n = VERIFIED_SIMILARITIES.filter(isTraceable).length
  return (
    <div className="mb-4 rounded-[20px] bg-sky/[.07] p-4 ring-1 ring-sky/20" role="note">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Icon name="shield" size={16} className="text-sky" />قاعدة المتشابهات الموثّقة: {n ? `${toAr(n)} مرجع` : 'غير متوفرة بعد · ٠ مرجع'}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-night/75">هذه الشاشة <b className="font-semibold">مطابقة نصية آلية</b>: تبحث في النص القرآني وتقارن الآيات التي تختارها لفظًا بلفظ. نتيجتها وصف للنص، لا حكم علمي بأن الآيتين من المتشابهات. المراجع الموثّقة تظهر في «متشابهات هذا المقطع» داخل رحلة الحفظ.</p>
    </div>
  )
}

export function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-dashed border-line bg-card/60 px-6 py-10 text-center" data-empty>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-night/[.05] text-muted"><Icon name={icon} size={24} /></span>
      <p className="mt-4 text-[16px] font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function AyahText({ t, hafs, parts, size = 21 }: { t?: string; hafs: boolean; parts?: { w: string; tag: 'same' | 'diff' | 'mark' }[]; size?: number }) {
  return (
    <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: size, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
      {parts ? parts.map((x, i) => <span key={i}>{i > 0 && ' '}<span data-diff={x.tag} className={x.tag === 'diff' ? 'rounded-md bg-gold-soft px-0.5 ring-1 ring-gold/60' : ''}>{x.w}</span></span>) : t}
    </p>
  )
}

// ---- Discover: transparent word search across the whole Quran (full text loaded only on explicit search)
function Discover() {
  const s = useSt()
  const { passage: p, cur } = useSession().s
  const open = useOpenAndReturn('similar')
  const curText = useAyah({ s: p.s, a: cur })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [input, setInput] = useState(s.q)
  useEffect(() => setInput(s.q), [s.q])
  useEffect(() => {
    if (!s.q.trim() || rows) return
    let live = true
    setErr(false)
    loadCorpus().then((r) => live && setRows(r), () => live && setErr(true))
    return () => {
      live = false
    }
  }, [s.q, rows, attempt])
  const q = ` ${tokens(s.q).map((z) => z.k).filter(Boolean).join(' ')} `
  const hits = useMemo(() => {
    if (!rows || q.trim() === '') return []
    return rows.filter((r) => (s.where === 'start' ? r.sk.startsWith(q) : s.where === 'end' ? r.sk.endsWith(q) : r.sk.includes(q.trim())))
  }, [rows, q, s.where])
  const quick = (where: 'start' | 'end') => {
    if (!curText) return
    const ws = words(curText.t).filter((w) => !isMark(w))
    const k = Math.min(3, ws.length)
    set({ q: (where === 'start' ? ws.slice(0, k) : ws.slice(-k)).join(' '), where })
  }
  const field = 'h-11 rounded-full bg-card px-4 text-[13.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-gold'
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
        <span className="text-muted">من الآية الحالية ({toAr(cur)}):</span>
        <button type="button" disabled={!curText} onClick={() => quick('start')} className="press h-8 rounded-full bg-gold-soft px-3 font-medium disabled:opacity-40">ابحث ببدايتها</button>
        <button type="button" disabled={!curText} onClick={() => quick('end')} className="press h-8 rounded-full bg-gold-soft px-3 font-medium disabled:opacity-40">ابحث بخاتمتها</button>
      </div>
      <form onSubmit={(e) => (e.preventDefault(), set({ q: input }))} className="flex flex-wrap gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب كلمات من آية، مثل: فبأي آلاء ربكما" aria-label="ابحث بألفاظ الآية" className={`${field} min-w-0 flex-1`} />
        <select value={s.where} onChange={(e) => set({ where: e.target.value as St['where'] })} aria-label="موضع اللفظ" className={field}>
          <option value="any">في أي موضع</option>
          <option value="start">في بداية الآية</option>
          <option value="end">في نهاية الآية</option>
        </select>
        <button type="submit" className="press h-11 rounded-full bg-night px-5 text-[13.5px] font-semibold text-parchment">ابحث</button>
      </form>
      <p className="mt-2 text-[11.5px] text-muted">مطابقة لفظية آلية على رسم الحروف (دون الحركات والهمزات)، في النص القرآني كاملًا ({rows ? `${toAr(rows.length)} آية` : 'يُحمَّل عند أول بحث'}). النص المعروض هو النص الأصلي دون تعديل.</p>
      <div className="mt-4">
        {err ? (
          <Empty icon="info" title="تعذّر تحميل النص القرآني" body="تحقّق من الاتصال ثم أعد المحاولة. لا تُعرض نتائج جزئية." action={<button type="button" onClick={() => (setErr(false), setAttempt((n) => n + 1))} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment" data-retry>أعد المحاولة</button>} />
        ) : !s.q.trim() ? (
          <Empty icon="search" title="ابدأ بكلمات من آية" body="ستظهر الآيات التي تحتوي هذه الألفاظ نفسها، ويمكنك وضع أيّ اثنتين منها في المقارنة لترى الفروق كلمةً كلمة." />
        ) : !rows ? (
          <p className="py-6 text-center text-[13px] text-muted" role="status">جارٍ تحميل النص القرآني…</p>
        ) : hits.length === 0 ? (
          <Empty icon="search" title="لا توجد آية بهذه الألفاظ" body="جرّب كلمات أقل، أو غيّر موضع اللفظ." />
        ) : (
          <>
            <p className="mb-2 text-[12.5px] font-medium" role="status">{toAr(hits.length)} آية تحتوي هذا اللفظ (مطابقة آلية){hits.length > 40 ? ' · تُعرض أول ٤٠' : ''}</p>
            <ul className="space-y-2" aria-label="نتائج البحث">
              {hits.slice(0, 40).map((r) => (
                <li key={`${r.s}:${r.a}`} className="rounded-[20px] bg-card p-4 ring-1 ring-line">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">سورة {refAr(r)}</span>
                    {inPassage(p, r) && <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[10.5px] font-semibold text-leaf">من مقطعك</span>}
                    <span className="text-[11.5px] text-muted">ص {toAr(pageOf(r.s, r.a))}</span>
                    <span className="ms-auto flex gap-1">
                      <button type="button" onClick={() => set({ slotA: { s: r.s, a: r.a }, tab: s.slotB ? 'compare' : s.tab })} className="press h-8 rounded-full bg-night/[.05] px-3 text-[12px]">ضعها في (أ)</button>
                      <button type="button" onClick={() => set({ slotB: { s: r.s, a: r.a }, tab: s.slotA ? 'compare' : s.tab })} className="press h-8 rounded-full bg-night/[.05] px-3 text-[12px]">ضعها في (ب)</button>
                      <button type="button" onClick={() => open(r.s, r.a)} aria-label={`افتح سورة ${refAr(r)} في المصحف`} className="press flex h-8 items-center gap-1 rounded-full bg-gold-soft px-3 text-[12px] font-medium"><Icon name="book" size={13} />المصحف</button>
                    </span>
                  </div>
                  <AyahText t={r.t} hafs={r.hafs} size={19} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Compare: side by side with highlighted word differences
function RefPicker({ label, r, onPick }: { label: string; r: Ref | null; onPick: (r: Ref) => void }) {
  const s0 = r?.s ?? 1
  const field = 'h-9 rounded-full bg-night/[.04] px-2.5 text-[12.5px] ring-1 ring-line'
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      <span className="font-semibold text-night">{label}</span>
      <select aria-label={`سورة ${label}`} value={s0} onChange={(e) => onPick({ s: Number(e.target.value), a: 1 })} className={`${field} max-w-[150px]`}>
        {SURAHS.map((x) => <option key={x.n} value={x.n}>{toAr(x.n)}. {x.ar}</option>)}
      </select>
      <input aria-label={`آية ${label}`} type="number" min={1} max={surah(s0).ayat} value={r?.a ?? ''} placeholder="آية" onChange={(e) => onPick({ s: s0, a: Math.min(surah(s0).ayat, Math.max(1, Number(e.target.value) || 1)) })} className={`${field} w-20 text-center`} />
    </div>
  )
}

function Compare() {
  const s = useSt()
  const desk = useDevice() === 'desktop'
  const ses = useSession()
  const p = ses.s.passage
  const open = useOpenAndReturn('similar')
  const A = useAyah(s.slotA)
  const B = useAyah(s.slotB)
  const d = A && B ? diff(A.t, B.t) : null
  const same = s.slotA && s.slotB && s.slotA.s === s.slotB.s && s.slotA.a === s.slotB.a
  // A link needs one side inside the active passage — that is what "associated with this passage" means.
  const mine = s.slotA && inPassage(p, s.slotA) ? s.slotA : s.slotB && inPassage(p, s.slotB) ? s.slotB : null
  const other = mine && (mine === s.slotA ? s.slotB : s.slotA)
  const linked = !!(mine && other && ses.s.pairs.some((x) => x.id === pairId(mine, other) || x.id === pairId(other, mine)))
  useEffect(() => {
    if (d && mine && other && !same) ses.recordSim({ kind: 'compared', id: pairId(mine, other) })
  }, [!!d, mine?.s, mine?.a, other?.s, other?.a]) // eslint-disable-line react-hooks/exhaustive-deps
  const card = (k: 'A' | 'B', r: Ref | null, t: typeof A, parts?: ReturnType<typeof diff>['a']) => (
    <section className="rounded-[24px] bg-card p-4 ring-1 ring-line" aria-label={k === 'A' ? 'الآية (أ)' : 'الآية (ب)'}>
      <RefPicker label={k === 'A' ? '(أ)' : '(ب)'} r={r} onPick={(x) => set(k === 'A' ? { slotA: x } : { slotB: x })} />
      {r && t ? (
        <>
          <div className="mf-paper mt-3 rounded-[18px] p-4"><AyahText hafs={t.hafs} parts={parts} t={t.t} /></div>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span className="font-semibold" data-ref>سورة {refAr(r)}</span>
            {inPassage(p, r) && <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[10.5px] font-semibold text-leaf">من مقطعك</span>}
            <span className="text-muted">ص {toAr(pageOf(r.s, r.a))}</span>
            <button type="button" onClick={() => open(r.s, r.a)} className="press ms-auto flex h-8 items-center gap-1 rounded-full bg-gold-soft px-3 font-medium"><Icon name="book" size={13} />افتح في المصحف</button>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-[18px] bg-night/[.03] p-6 text-center text-[12.5px] text-muted">اختر سورة ورقم آية، أو أضفها من «ابحث».</p>
      )}
    </section>
  )
  return (
    <div>
      <div className={`grid gap-3 ${desk ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {card('A', s.slotA, A, d?.a)}
        {card('B', s.slotB, B, d?.b)}
      </div>
      {d && !same && (
        <section className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line" aria-label="نتيجة المقارنة">
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            <span className="rounded-full bg-night/[.05] px-3 py-1.5">كلمات مشتركة: <b>{toAr(d.common)}</b></span>
            <span className="rounded-full bg-gold-soft px-3 py-1.5">مختلفة في (أ): <b>{toAr(d.onlyA)}</b></span>
            <span className="rounded-full bg-gold-soft px-3 py-1.5">مختلفة في (ب): <b>{toAr(d.onlyB)}</b></span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed" data-explain>{explain(d)}</p>
          <p className="mt-1 text-[11.5px] text-muted">وصف آلي للتطابق اللفظي في الرسم، وليس حكمًا علميًا بأن الآيتين من المتشابهات.</p>
          <button type="button" disabled={linked || !mine} onClick={() => mine && other && ses.link(mine, other, 'textual')} className="press mt-4 flex h-11 items-center gap-2 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment disabled:opacity-50">
            <Icon name={linked ? 'check' : 'plus'} size={16} />
            {linked ? 'مرتبطة بمقطع حفظك' : 'اربطها بمقطع حفظك للتدريب'}
          </button>
          <p className="mt-1.5 text-[11px] text-muted">{mine ? 'تُحفظ في جلسة المعاينة فقط، وتُوسم «مطابقة نصية آلية» لا «متشابهات موثّقة».' : `للربط، اجعل إحدى الآيتين من مقطعك (سورة ${surah(p.s).ar} ${toAr(p.from)}–${toAr(p.to)}).`}</p>
        </section>
      )}
      {same && <p className="mt-3 text-center text-[12.5px] text-muted">اختر آيتين مختلفتين للمقارنة.</p>}
    </div>
  )
}

/** Mechanical description of a word diff (shared with the journey's comparison card). */
export function explain(d: ReturnType<typeof diff>) {
  const n = (k: number) => `${toAr(k)} ${k > 2 && k < 11 ? 'كلمات' : 'كلمة'}`
  return `${d.pre > 0 ? `تبدأ الآيتان بالكلمات نفسها (${n(d.pre)}). ` : 'تختلف بداية الآيتين. '}${d.suf > 0 ? `وتنتهيان بالكلمات نفسها (${n(d.suf)}). ` : 'وتختلف نهايتهما. '}${d.onlyA + d.onlyB > 0 ? 'الكلمات المظلّلة هي مواضع الاختلاف.' : 'لا يوجد اختلاف في رسم الكلمات.'}`
}

// ---- Exercises use only pairs linked to the active passage
type Texts = Record<string, { t: string; hafs: boolean }>
/** Verbatim text for every ayah in the given pairs; `null` while loading, `false` on failure. */
export function usePairTexts(pairs: { a: Ref; b: Ref }[], attempt = 0) {
  const [m, setM] = useState<{ key: string; t: Texts } | false | null>(null)
  const key = pairs.map((x) => `${x.a.s}:${x.a.a}|${x.b.s}:${x.b.a}`).join(',')
  useEffect(() => {
    let live = true
    setM((x) => (x && x.key === key ? x : null))
    const need = [...new Set(pairs.flatMap((x) => [x.a.s, x.b.s]))]
    Promise.all(need.map((n) => loadMushaf(n).then((r) => [n, r] as const))).then(
      (all) => {
        if (!live) return
        const out: Texts = {}
        for (const x of pairs) for (const r of [x.a, x.b]) { const got = all.find((y) => y[0] === r.s)![1]; out[`${r.s}:${r.a}`] = { t: got.ayat[r.a - 1], hafs: got.hafs } }
        setM({ key, t: out })
      },
      () => live && setM(false),
    )
    return () => {
      live = false
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  return m === false ? false : m && m.key === key ? m.t : null
}

/** The first run of differing words in `mine`, and the matching run in `other`. */
export function diffRun(ta: string, tb: string) {
  const d = diff(ta, tb)
  const run = (parts: typeof d.a) => {
    const i = parts.findIndex((x) => x.tag === 'diff')
    if (i < 0) return null
    let j = i
    while (j + 1 < parts.length && parts[j + 1].tag !== 'same') j++
    while (parts[j].tag === 'mark') j--
    return { i, j, text: parts.slice(i, j + 1).map((x) => x.w).join(' ') }
  }
  return { d, mine: run(d.a), other: run(d.b) }
}

function Progress({ i, n, ok }: { i: number; n: number; ok: number }) {
  return (
    <div className="mb-4 flex items-center gap-3" aria-label={`السؤال ${toAr(Math.min(i + 1, n))} من ${toAr(n)}`}>
      <span className="flex flex-1 gap-1">{Array.from({ length: n }, (_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? 'bg-leaf' : k === i ? 'bg-gold' : 'bg-night/10'}`} />)}</span>
      <span className="text-[12px] text-muted">{toAr(Math.min(i + 1, n))}/{toAr(n)} · أصبت {toAr(ok)}</span>
    </div>
  )
}

const LoadFail = ({ retry }: { retry: () => void }) => <Empty icon="info" title="تعذّر تحميل نص الآيات" body="تحقّق من الاتصال ثم أعد المحاولة." action={<button type="button" onClick={retry} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد المحاولة</button>} />

function Practice({ pairs }: { pairs: PassagePair[] }) {
  const ses = useSession()
  const [attempt, setAttempt] = useState(0)
  const texts = usePairTexts(pairs.map((x) => ({ a: x.mine, b: x.other })), attempt)
  const qs = useMemo(() => {
    if (!texts) return []
    return pairs.flatMap((x) => {
      const A = texts[`${x.mine.s}:${x.mine.a}`]
      const B = texts[`${x.other.s}:${x.other.a}`]
      if (!A || !B) return []
      const r = diffRun(A.t, B.t)
      return r.mine && r.other ? [{ pair: x, parts: r.d.a, run: r.mine, wrong: r.other.text, hafs: A.hafs }] : []
    })
  }, [pairs, texts])
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  if (pairs.length === 0) return <Empty icon="sprout" title="لا توجد أزواج مرتبطة بهذا المقطع" body="قارن آية من مقطعك بآية أخرى في «قارن» ثم اربطهما، وسيظهر هنا تدريب «أكمل الفرق»." action={<button type="button" onClick={() => set({ tab: 'compare' })} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">اذهب إلى المقارنة</button>} />
  if (texts === false) return <LoadFail retry={() => setAttempt((n) => n + 1)} />
  if (!texts) return <p className="py-6 text-center text-[13px] text-muted" role="status">جارٍ تحميل الآيات…</p>
  if (qs.length === 0) return <Empty icon="sprout" title="لا يوجد اختلاف في الكلمات" body="الأزواج المرتبطة لا تختلف في رسم كلماتها، فلا يوجد ما نتدرّب عليه." />
  if (i >= qs.length)
    return (
      <div className="rounded-[26px] bg-card p-8 text-center ring-1 ring-line" role="status">
        <p className="text-[18px] font-semibold">أحسنت، أتممت التدريب</p>
        <p className="mt-1 text-[13px] text-muted">أصبت {toAr(ok)} من {toAr(qs.length)}. يُحتسب في «التمييز بين المتشابهات» فقط، ولا يغيّر حفظ أي آية.</p>
        <button type="button" onClick={() => (setI(0), setOk(0), setPick(null))} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد التدريب</button>
      </div>
    )
  const q = qs[i]
  const opts = [q.run.text, q.wrong].sort((x, y) => skel(x).localeCompare(skel(y)))
  return (
    <div className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <Progress i={i} n={qs.length} ok={ok} />
      <p className="mb-2 text-[13px] font-semibold">ما الذي يكمل الآية في سورة {refAr(q.pair.mine)}؟</p>
      <div className="mf-paper rounded-[18px] p-4">
        <p className={`mf-text ${q.hafs ? '' : 'tanzil'}`} style={{ fontSize: 21, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
          {q.parts.map((x, k) => (k > q.run.i && k <= q.run.j ? null : <span key={k}>{k > 0 && ' '}{k === q.run.i ? <span data-blank className="inline-block min-w-16 rounded-md border-b-2 border-dashed border-gold px-1 text-center">{pick ? (pick === q.run.text ? q.run.text : '؟') : '…'}</span> : x.w}</span>))}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button key={o} type="button" disabled={!!pick} onClick={() => (setPick(o), o === q.run.text && setOk(ok + 1), ses.recordSim({ kind: 'recall', ok: o === q.run.text }))} className={`press mf-text min-h-14 rounded-[16px] px-2 text-[20px] ring-1 ${pick ? (o === q.run.text ? 'bg-leaf/12 ring-leaf' : o === pick ? 'bg-night/[.04] ring-line' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>{o}</button>
        ))}
      </div>
      {pick && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[12.5px]">{pick === q.run.text ? 'أحسنت.' : `ليست هذه؛ «${pick}» في سورة ${refAr(q.pair.other)}.`}</p>
          <button type="button" onClick={() => (setI(i + 1), setPick(null))} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">التالي</button>
        </div>
      )}
    </div>
  )
}

// ---- Which surah does this verse belong to?
function Connect({ pairs }: { pairs: PassagePair[] }) {
  const ses = useSession()
  const [attempt, setAttempt] = useState(0)
  const texts = usePairTexts(pairs.map((x) => ({ a: x.mine, b: x.other })), attempt)
  const qs = useMemo(() => (texts ? pairs.flatMap((x, k) => [k % 2 ? x.other : x.mine, k % 2 ? x.mine : x.other].map((r) => ({ r, other: r === x.mine ? x.other : x.mine }))).filter((x) => texts[`${x.r.s}:${x.r.a}`]) : []), [pairs, texts])
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  if (pairs.length === 0) return <Empty icon="path" title="لا توجد أزواج مرتبطة بهذا المقطع" body="بعد ربط آية من مقطعك بآية أخرى في «قارن»، تدرّب هنا على تذكّر موضع كل آية." action={<button type="button" onClick={() => set({ tab: 'compare' })} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">اذهب إلى المقارنة</button>} />
  if (texts === false) return <LoadFail retry={() => setAttempt((n) => n + 1)} />
  if (!texts) return <p className="py-6 text-center text-[13px] text-muted" role="status">جارٍ تحميل الآيات…</p>
  if (i >= qs.length)
    return (
      <div className="rounded-[26px] bg-card p-8 text-center ring-1 ring-line" role="status">
        <p className="text-[18px] font-semibold">بارك الله فيك</p>
        <p className="mt-1 text-[13px] text-muted">حدّدت موضع {toAr(ok)} من {toAr(qs.length)} آية. لا يغيّر هذا حفظ أي آية.</p>
        <button type="button" onClick={() => (setI(0), setOk(0), setPick(null))} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد</button>
      </div>
    )
  const q = qs[i]
  const t = texts[`${q.r.s}:${q.r.a}`]
  const opts = [q.r, q.other].sort((x, y) => x.s - y.s || x.a - y.a)
  const k = (r: Ref) => `${r.s}:${r.a}`
  return (
    <div className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <Progress i={i} n={qs.length} ok={ok} />
      <p className="mb-2 text-[13px] font-semibold">في أي سورة وأي آية هذا النص؟</p>
      <div className="mf-paper rounded-[18px] p-4"><AyahText t={t.t} hafs={t.hafs} /></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {opts.map((r) => (
          <button key={k(r)} type="button" disabled={pick !== null} onClick={() => (setPick(k(r)), k(r) === k(q.r) && setOk(ok + 1), ses.recordSim({ kind: 'diff' }))} className={`press h-12 rounded-[16px] text-[14px] font-semibold ring-1 ${pick !== null ? (k(r) === k(q.r) ? 'bg-leaf/12 ring-leaf' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>سورة {refAr(r)}</button>
        ))}
      </div>
      {pick !== null && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[12.5px]">{pick === k(q.r) ? 'أحسنت.' : `هذه الآية من سورة ${refAr(q.r)}.`}</p>
          <button type="button" onClick={() => (setI(i + 1), setPick(null))} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">التالي</button>
        </div>
      )}
    </div>
  )
}
