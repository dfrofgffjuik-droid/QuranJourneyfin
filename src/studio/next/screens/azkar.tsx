// أذكاري — Azkar (design preview). Content is the verified Hisn al-Muslim library
// in ../azkar (verbatim text, the book's counts and footnotes); Quranic
// supplications are rendered from the project's verified Mushaf. Progress lives
// in the isolated preview store ../azkar/store (its own localStorage key).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Chrome, Head, Icon, toAr, useDevice, useProto } from '../core'
import { loadMushaf, surah } from '../../../lib/quran'
import { ALL_ITEMS, CHAPTERS, COLLECTIONS, GROUPS, SOURCE, collection, collectionsOf, countable, findItem, itemsOf, plainOf, searchKey, timeOfDay, type Collection, type HisnItem, type Item, type QuranItem, type Seg } from '../azkar/catalog'
import { DAILY_IDS, azkar, azkarStorage, progressOf, todaySummary, useAzkar, type AState, type FontSize } from '../azkar/store'
import { Confirm } from '../previewUi'

const SIZE: Record<FontSize, number> = { s: 19, m: 22, l: 26, xl: 30 }
const SIZE_AR: Record<FontSize, string> = { s: 'صغير', m: 'متوسط', l: 'كبير', xl: 'كبير جدًا' }
const times = (n: number) => (n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتان' : `${toAr(n)} ${n >= 3 && n <= 10 ? 'مرات' : 'مرة'}`)
/** Home collection for an item when opened outside a collection (favourites, search). */
const homeOf = (id: string) => {
  const cols = collectionsOf(id)
  return cols.find((c) => c.id === timeOfDay()) ?? cols[0]
}

/** Scroll a card into view inside its own scroll container (not the review page). */
function scrollWithin(el: HTMLElement | null) {
  if (!el) return
  let p = el.parentElement
  while (p && !/(auto|scroll)/.test(getComputedStyle(p).overflowY)) p = p.parentElement
  if (p) p.scrollTop += el.getBoundingClientRect().top - p.getBoundingClientRect().top - 24
}

function Ring({ v, size = 48, stroke = 'var(--color-leaf)', children }: { v: number; size?: number; stroke?: string; children?: ReactNode }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="4" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, v))} style={{ transition: 'stroke-dashoffset .4s' }} /></svg>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- home
export function AzkarHome() {
  const device = useDevice()
  const desk = device === 'desktop'
  const { go } = useProto()
  const st = useAzkar()
  const now = timeOfDay()
  const other = now === 'morning' ? 'evening' : 'morning'
  const p = progressOf(st, now)
  const sum = todaySummary(st)
  const unfinished = DAILY_IDS.map((id) => ({ id, ...progressOf(st, id) })).filter((x) => x.done > 0 && x.done < x.total)
  const last = st.lastCollection ? collection(st.lastCollection) : undefined
  const [q, setQ] = useState('')
  const hero = (
    <div className="hero-fade relative overflow-hidden rounded-[28px] p-6 text-white" data-azkar-hero={now}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] backdrop-blur"><Icon name={now === 'morning' ? 'sun' : 'moon'} size={14} />{now === 'morning' ? 'وقت الصباح' : 'وقت المساء'} · بحسب ساعة جهازك</span>
      <p className="mt-4 font-arabic-display text-[26px] font-bold">{collection(now)!.ar}</p>
      <p className="mt-1 text-[13px] text-white/80">{p.done === 0 ? 'ابدأ وردك الآن' : p.done === p.total ? 'أتممت الورد، بارك الله فيك' : 'تابع من حيث توقفت'}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white transition-[width]" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></span>
        <span className="text-[12px] text-white/85" data-hero-progress>{toAr(p.done)} من {toAr(p.total)}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => go('azkar-list', now)} className="press h-10 rounded-full bg-white px-4 text-[13px] font-semibold text-night" data-open-now>{p.done > 0 && p.done < p.total ? 'تابع' : 'ابدأ'}</button>
        <button type="button" onClick={() => go('azkar-list', other)} className="press h-10 rounded-full bg-white/15 px-4 text-[13px] font-medium backdrop-blur">{collection(other)!.ar}</button>
      </div>
    </div>
  )
  const summary = (
    <section className="rounded-[24px] bg-card p-5 ring-1 ring-line" aria-label="ملخّص اليوم" data-azkar-summary>
      <p className="text-[14px] font-semibold">ملخّص اليوم</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['أذكار اكتملت', sum.completed], ['تكرارات', sum.reps], ['من الورد اليومي', `${toAr(sum.dailyDone)}/${toAr(sum.dailyTotal)}`]].map(([l, v]) => (
          <div key={l as string} className="rounded-[16px] bg-night/[.04] px-2 py-3"><p className="text-[18px] font-bold" data-sum={l}>{typeof v === 'number' ? toAr(v) : v}</p><p className="mt-0.5 text-[11px] text-muted">{l}</p></div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {sum.daily.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => go('azkar-list', x.id)} className="press flex w-full items-center gap-2 rounded-[12px] px-1 py-1 text-start text-[12.5px] hover:bg-night/[.03]">
              <span className="w-28 shrink-0">{collection(x.id)!.ar}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-leaf" style={{ width: `${x.total ? (x.done / x.total) * 100 : 0}%` }} /></span>
              <span className="w-12 text-end tabular-nums text-muted">{toAr(x.done)}/{toAr(x.total)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">يتجدّد العدّ مع بداية يوم جديد بحسب تقويم جهازك · مجموع ما أتممته في المعاينة: {toAr(sum.lifetime)} ذكرًا في {toAr(sum.days)} يوم.</p>
    </section>
  )
  const cont = unfinished.length > 0 && (
    <section className="rounded-[24px] bg-gold-soft/50 p-4 ring-1 ring-gold/30" data-continue>
      <p className="text-[13.5px] font-semibold">جلسة لم تكتمل</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {unfinished.map((x) => <button key={x.id} type="button" onClick={() => go('azkar-list', x.id)} className="press h-9 rounded-full bg-card px-3.5 text-[12.5px] font-medium ring-1 ring-line">تابع {collection(x.id)!.ar} · {toAr(x.done)}/{toAr(x.total)}</button>)}
      </div>
    </section>
  )
  const favs = (
    <section aria-label="المفضّلة">
      <div className="mb-2 flex items-center gap-2">
        <p className="flex-1 text-[13px] font-semibold text-muted">المفضّلة · {toAr(st.favorites.length)}</p>
        {st.favorites.length > 0 && <button type="button" onClick={() => go('azkar-list', 'favorites')} className="text-[12.5px] font-medium text-gold hover:underline" data-open-favs>عرض الكل</button>}
      </div>
      {st.favorites.length === 0 ? <p className="rounded-[18px] bg-card/70 p-3.5 text-[12.5px] text-muted ring-1 ring-line">اضغط القلب على أي ذكر ليظهر هنا.</p> : (
        <ul className="space-y-2">
          {st.favorites.slice(0, 4).map((id) => {
            const it = findItem(id)
            if (!it) return null
            const c = homeOf(id)
            return (
              <li key={id}>
                <button type="button" onClick={() => go('azkar-list', `${c?.id ?? 'favorites'}~${id}`)} className="press flex w-full items-center gap-2.5 rounded-[18px] bg-card p-3 text-start ring-1 ring-line">
                  <Icon name="heart" size={16} fill className="shrink-0 text-gold" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px]" style={{ fontFamily: "'Amiri', serif" }}>{it.kind === 'quran' ? `سورة ${surah(it.s).ar} ${toAr(it.from)}` : plainOf(it).replace(/[«»()]/g, '').slice(0, 70)}</span><span className="block text-[11px] text-muted">{c?.ar}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
  const search = (
    <form onSubmit={(e) => (e.preventDefault(), q.trim() && go('azkar-list', `search:${q.trim()}`))} className="flex gap-2" role="search">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بنص الذكر أو باسم القسم" aria-label="ابحث في الأذكار" className="h-11 min-w-0 flex-1 rounded-full bg-card px-4 text-[13.5px] outline-none ring-1 ring-line focus:ring-2 focus:ring-gold" data-azkar-search />
      <button type="submit" className="press flex h-11 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment"><Icon name="search" size={15} />بحث</button>
    </form>
  )
  const groups = (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <section key={g.id} aria-label={g.ar}>
          <h2 className="mb-0.5 flex items-center gap-2 text-[15px] font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={g.icon} size={16} /></span>{g.ar}</h2>
          <p className="mb-2.5 ms-10 text-[11.5px] text-muted">{g.sub}</p>
          <div className={`grid gap-2 ${desk ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {COLLECTIONS.filter((c) => c.group === g.id).map((c) => {
              const pr = progressOf(st, c.id)
              const n = itemsOf(c).length
              return (
                <button key={c.id} type="button" onClick={() => go('azkar-list', c.id)} data-col={c.id} className="press flex min-h-[68px] items-center gap-2.5 rounded-[18px] bg-card px-3.5 py-3 text-start ring-1 ring-line hover:ring-gold/40">
                  {pr.total > 0 ? <Ring v={pr.done / pr.total} size={36}><span className="text-[10px] font-bold">{toAr(pr.done)}</span></Ring> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night/[.05] text-muted"><Icon name={c.icon} size={16} /></span>}
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium leading-snug">{c.ar}</span><span className="block text-[11px] text-muted">{pr.total > 0 ? `${toAr(pr.done)} من ${toAr(pr.total)}` : `${toAr(n)} ${n >= 3 && n <= 10 ? 'أذكار' : 'ذكر'}`}</span></span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
  const lastLink = last && (
    <button type="button" onClick={() => go('azkar-list', last.id)} className="press flex w-full items-center gap-2 rounded-[18px] bg-card px-3.5 py-3 text-start text-[12.5px] ring-1 ring-line" data-last>
      <Icon name="clock" size={15} className="text-muted" />آخر ما فتحته: <b className="font-semibold">{last.ar}</b>
    </button>
  )
  const sourceNote = <SourceNote />
  if (desk)
    return (
      <Chrome>
        <div className="no-scrollbar h-full overflow-y-auto px-10 py-9">
          <Head title="أذكاري" sub="أذكار حصن المسلم بنصّها ومصدرها، مع عدّاد يحفظ تقدّمك اليومي." />
          <div className="grid grid-cols-[1fr_340px] gap-8">
            <div className="space-y-6">{search}{groups}{sourceNote}</div>
            <div className="space-y-5">{hero}{cont}{summary}{lastLink}{favs}</div>
          </div>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="space-y-5 px-5 pb-8 pt-4">
        <Head title="أذكاري" sub="أذكار حصن المسلم بنصّها ومصدرها." />
        {hero}
        {cont}
        {search}
        {summary}
        {lastLink}
        {favs}
        {groups}
        {sourceNote}
      </div>
    </Chrome>
  )
}

function SourceNote() {
  const s = azkarStorage()
  return (
    <section className="rounded-[20px] bg-night/[.03] p-4 text-[12px] leading-relaxed text-muted ring-1 ring-line" data-source-note>
      <p className="flex items-center gap-1.5 font-semibold text-night"><Icon name="shield" size={14} className="text-leaf" />المصدر</p>
      <p className="mt-1">«{SOURCE.title}» — {SOURCE.author}، طبعة {SOURCE.publisher}. النصوص منقولة كما هي بتشكيلها وحواشيها، وأعداد التكرار من الكتاب مع مقارنتها بـ hisnmuslim.com. الآيات مطابقة لنص المصحف المعتمد في التطبيق. لا تتوفّر تسجيلات صوتية مرخّصة، لذلك لا يوجد زر استماع.</p>
      <p className="mt-1">يُحفظ التقدّم في هذا المتصفح للمعاينة فقط، بمفتاح منفصل عن التطبيق.{s !== 'ok' && (s === 'unavailable' ? ' تعذّر الحفظ في المتصفح؛ سيضيع التقدّم عند الإغلاق.' : ' كانت البيانات المحفوظة تالفة فبدأت جلسة جديدة.')}</p>
    </section>
  )
}

// ---------------------------------------------------------------- list / favourites / search
export function AzkarList() {
  const desk = useDevice() === 'desktop'
  const { nav, go } = useProto()
  const st = useAzkar()
  const raw = nav.param ?? timeOfDay()
  const [param, jump] = raw.split('~')
  const view = param === 'favorites' ? 'favorites' : param.startsWith('search:') ? 'search' : 'collection'
  const col = view === 'collection' ? collection(param) ?? collection(timeOfDay())! : undefined
  useEffect(() => {
    if (col) azkar.visit(col.id)
  }, [col?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const toolbar = <Toolbar st={st} col={col} />
  const body =
    view === 'search' ? <SearchView initial={param.slice(7)} /> : view === 'favorites' ? <Favorites st={st} /> : <CollectionView key={col!.id} col={col!} st={st} jump={jump} />
  return (
    <Chrome>
      <div className={`no-scrollbar ${desk ? 'mx-auto h-full max-w-[820px] overflow-y-auto px-10 py-9' : 'px-4 pb-8 pt-4'}`} data-azkar-list={col?.id ?? view}>
        <button type="button" onClick={() => go('azkar')} className="press mb-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line" data-back-azkar><Icon name="back" size={15} className="rotate-180" />أذكاري</button>
        {view === 'collection' ? null : <Head title={view === 'favorites' ? 'المفضّلة' : 'البحث في الأذكار'} sub={view === 'favorites' ? 'الأذكار التي حفظتها بالقلب، مع عدّادها في قسمها.' : 'ابحث بنص الذكر (دون اعتبار التشكيل) أو باسم القسم.'} />}
        {toolbar}
        {body}
      </div>
    </Chrome>
  )
}

function Toolbar({ st, col }: { st: AState; col?: Collection }) {
  const [ask, setAsk] = useState(false)
  const sizes: FontSize[] = ['s', 'm', 'l', 'xl']
  const i = sizes.indexOf(st.settings.size)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]" data-azkar-toolbar>
      <span className="inline-flex items-center rounded-full bg-night/[.05] p-1">
        <button type="button" disabled={i === 0} onClick={() => azkar.setSettings({ size: sizes[i - 1] })} aria-label="تصغير الخط" className="press h-8 w-8 rounded-full text-[13px] disabled:opacity-30" data-font="down">أ-</button>
        <span className="px-1.5 text-muted" data-font-size={st.settings.size}>الخط: {SIZE_AR[st.settings.size]}</span>
        <button type="button" disabled={i === sizes.length - 1} onClick={() => azkar.setSettings({ size: sizes[i + 1] })} aria-label="تكبير الخط" className="press h-8 w-8 rounded-full text-[15px] font-bold disabled:opacity-30" data-font="up">أ+</button>
      </span>
      <span role="radiogroup" aria-label="طريقة العرض" className="inline-flex rounded-full bg-night/[.05] p-1">
        {([[false, 'مفصّل'], [true, 'مختصر']] as const).map(([v, l]) => <button key={l} type="button" role="radio" aria-checked={st.settings.compact === v} onClick={() => azkar.setSettings({ compact: v })} className={`press h-8 rounded-full px-3 ${st.settings.compact === v ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`} data-compact={String(v)}>{l}</button>)}
      </span>
      {col && progressOf(st, col.id).reps > 0 && <button type="button" onClick={() => setAsk(true)} className="press ms-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-muted ring-1 ring-line" data-reset-session><Icon name="refresh" size={14} />إعادة جلسة اليوم</button>}
      {ask && col && <Confirm title={`إعادة «${col.ar}»؟`} body="يُصفَّر عدّاد هذا القسم لليوم. المفضّلة وسجلّ الأيام السابقة لا تتأثّر." confirm="إعادة" danger onCancel={() => setAsk(false)} onConfirm={() => (azkar.resetSession(col.id), setAsk(false))} />}
    </div>
  )
}

function CollectionView({ col, st, jump }: { col: Collection; st: AState; jump?: string }) {
  const { go } = useProto()
  const items = itemsOf(col)
  const pr = progressOf(st, col.id)
  const list = useRef<HTMLOListElement>(null)
  const [flash, setFlash] = useState<string | undefined>(jump)
  useEffect(() => {
    // Open at a requested ayah/dhikr, otherwise at the first unfinished one.
    const target = jump ?? (pr.done > 0 ? items.find((i) => countable(i) && (st.counts[`${col.id}:${i.id}`] ?? 0) < i.count)?.id : undefined)
    if (target) requestAnimationFrame(() => scrollWithin(list.current?.querySelector(`[data-item="${target}"]`) ?? null))
    const t = setTimeout(() => setFlash(undefined), 2200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const pair = col.timing ? (col.timing === 'morning' ? 'evening' : 'morning') : null
  let lastChapter = -1
  return (
    <div>
      <header className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-arabic-display text-[26px] font-bold leading-tight" data-col-title>{col.ar}</h1>
          <p className="mt-1 text-[13px] text-muted" data-col-progress>{pr.total ? `${toAr(pr.done)} من ${toAr(pr.total)} مكتملة اليوم` : `${toAr(items.length)} ${items.length >= 3 && items.length <= 10 ? 'أذكار' : 'ذكر'}`}</p>
        </div>
        {pr.total > 0 && <Ring v={pr.done / pr.total}><span className="text-[12px] font-bold">{toAr(pr.done)}</span></Ring>}
      </header>
      {pair && (
        <div role="tablist" aria-label="الصباح والمساء" className="mb-4 grid grid-cols-2 rounded-full bg-night/[.05] p-1 text-[13px]">
          {(['morning', 'evening'] as const).map((id) => <button key={id} type="button" role="tab" aria-selected={col.id === id} onClick={() => go('azkar-list', id)} className={`press h-9 rounded-full ${col.id === id ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`} data-switch={id}>{collection(id)!.ar}</button>)}
        </div>
      )}
      {col.note && <p className="mb-4 rounded-[16px] bg-sky/[.07] p-3 text-[12.5px] leading-relaxed text-night/80 ring-1 ring-sky/20">{col.note}</p>}
      <ol ref={list} className="space-y-4">
        {items.map((it) => {
          const ch = it.kind === 'quran' ? -1 : it.chapter
          const head = ch !== lastChapter && col.chapters.length > 1 && ch > 0
          lastChapter = ch
          return (
            <li key={it.id} data-item={it.id} className={flash === it.id ? 'rounded-[28px] ring-2 ring-gold ring-offset-2 ring-offset-parchment' : ''}>
              {head && <p className="mb-2 mt-2 text-[13px] font-semibold text-muted">باب: {CHAPTERS[String(ch)]}</p>}
              <Card it={it} colId={col.id} timing={col.timing} st={st} />
            </li>
          )
        })}
      </ol>
      {pr.total > 0 && pr.done === pr.total && (
        <section className="mt-6 rounded-[24px] bg-leaf/10 p-5 text-center" role="status" data-col-done>
          <p className="text-[16px] font-semibold text-leaf">أتممت {col.ar}</p>
          <p className="mt-1 text-[12.5px] text-muted">{toAr(pr.total)} ذكرًا · {toAr(pr.reps)} تكرارًا اليوم. تقبّل الله منك.</p>
          <button type="button" onClick={() => go('azkar')} className="press mt-3 h-10 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">العودة إلى أذكاري</button>
        </section>
      )}
    </div>
  )
}

function Favorites({ st }: { st: AState }) {
  const { go } = useProto()
  const items = st.favorites.map(findItem).filter((x): x is Item => !!x)
  if (items.length === 0)
    return (
      <div className="rounded-[26px] border border-dashed border-line bg-card/60 px-6 py-10 text-center" data-empty>
        <Icon name="heart" size={26} className="mx-auto text-muted" />
        <p className="mt-3 font-semibold">لا توجد أذكار مفضّلة بعد</p>
        <p className="mt-1 text-[13px] text-muted">اضغط القلب على أي ذكر لتجده هنا.</p>
        <button type="button" onClick={() => go('azkar-list', timeOfDay())} className="press mt-4 h-10 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">افتح {collection(timeOfDay())!.ar}</button>
      </div>
    )
  return (
    <ol className="space-y-4" data-favorites>
      {items.map((it) => {
        const c = homeOf(it.id)!
        return (
          <li key={it.id} data-item={it.id}>
            <p className="mb-1.5 text-[12px] text-muted">من {c.ar}</p>
            <Card it={it} colId={c.id} timing={c.timing} st={st} />
          </li>
        )
      })}
    </ol>
  )
}

function SearchView({ initial }: { initial: string }) {
  const { go } = useProto()
  const [q, setQ] = useState(initial)
  const key = searchKey(q.trim())
  const results = useMemo(() => {
    if (key.length < 2) return { cols: [] as Collection[], items: [] as { it: Item; c: Collection }[] }
    const cols = COLLECTIONS.filter((c) => searchKey(c.ar).includes(key))
    const seen = new Set<string>()
    const items: { it: Item; c: Collection }[] = []
    for (const it of ALL_ITEMS) {
      if (it.kind === 'quran' || seen.has(it.id) || !searchKey(plainOf(it)).includes(key)) continue
      seen.add(it.id)
      items.push({ it, c: homeOf(it.id)! })
    }
    return { cols, items }
  }, [key])
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: أصبحنا، سيد الاستغفار، النوم" aria-label="نص البحث" className="mb-4 h-12 w-full rounded-full bg-card px-5 text-[14px] outline-none ring-1 ring-line focus:ring-2 focus:ring-gold" data-search-input />
      {key.length < 2 ? <p className="text-[13px] text-muted">اكتب حرفين على الأقل.</p> : results.cols.length + results.items.length === 0 ? <p className="text-[13px] text-muted" data-no-results>لا نتائج. جرّب كلمة أخرى من نص الذكر.</p> : (
        <div className="space-y-4">
          {results.cols.length > 0 && (
            <div className="flex flex-wrap gap-2">{results.cols.map((c) => <button key={c.id} type="button" onClick={() => go('azkar-list', c.id)} className="press h-9 rounded-full bg-gold-soft px-3.5 text-[12.5px] font-medium">{c.ar}</button>)}</div>
          )}
          <p className="text-[12px] text-muted" role="status">{toAr(results.items.length)} نتيجة</p>
          <ul className="space-y-2" data-search-results>
            {results.items.slice(0, 40).map(({ it, c }) => (
              <li key={it.id}>
                <button type="button" onClick={() => go('azkar-list', `${c.id}~${it.id}`)} className="press w-full rounded-[18px] bg-card p-3.5 text-start ring-1 ring-line hover:ring-gold/40" data-result={it.id}>
                  <span className="block text-[11.5px] text-muted">{c.ar}</span>
                  <span className="mt-1 block text-[16px] leading-[1.9]" style={{ fontFamily: "'Amiri', serif" }}>{plainOf(it).replace(/\s+/g, ' ').slice(0, 160)}{plainOf(it).length > 160 ? '…' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- cards
function Card({ it, colId, timing, st }: { it: Item; colId: string; timing?: 'morning' | 'evening'; st: AState }) {
  if (it.kind === 'quran') return <QuranCard it={it} st={st} />
  return <DhikrCard it={it} colId={colId} timing={timing} st={st} />
}

function Fav({ id, on }: { id: string; on: boolean }) {
  return (
    <button type="button" onClick={() => azkar.toggleFavorite(id)} aria-pressed={on} aria-label={on ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'} className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-night/5" data-fav={id}>
      <Icon name="heart" size={19} fill={on} className={on ? 'text-gold' : 'text-muted'} />
    </button>
  )
}

/** The book's text, verbatim, styled by segment type; footnote marks become local numbers. */
function Text({ segs, size, fnIndex }: { segs: Seg[]; size: number; fnIndex: (n: number) => number }) {
  return (
    <p dir="rtl" style={{ fontSize: size, lineHeight: 2.15, textAlign: 'right' }} data-dhikr-text>
      {segs.map((s, i) => {
        if (s.k === 'br') return <br key={i} />
        if (s.k === 'fn') return <sup key={i} className="mx-0.5 text-[11px] font-semibold text-gold">{toAr(fnIndex(s.n))}</sup>
        if (s.k === 'q')
          return (
            <span key={i} className="mf-text inline" style={{ fontSize: size + 2 }}>
              {s.t.split(/(\d+)/).map((part, k) => (/^\d+$/.test(part) ? <span key={k} className="mf-num">{toAr(part)}</span> : part))}
            </span>
          )
        return <span key={i} style={{ fontFamily: "'Amiri', serif" }} className={s.k === 'p' ? 'text-[0.82em] text-muted' : 'text-night'}>{s.t}</span>
      })}
    </p>
  )
}

function DhikrCard({ it, colId, timing, st }: { it: HisnItem; colId: string; timing?: 'morning' | 'evening'; st: AState }) {
  const compact = st.settings.compact
  const [open, setOpen] = useState(!compact)
  useEffect(() => setOpen(!compact), [compact])
  const fav = st.favorites.includes(it.id)
  const order = it.notes.map((n) => n.n)
  const fnIndex = (n: number) => order.indexOf(n) + 1
  const takhrij = it.notes.find((n) => n.kind === 'takhrij')
  const eveningNotes = timing === 'evening' ? it.notes.filter((n) => n.kind === 'note' && /أمسى/.test(n.text)) : []
  const canCount = countable(it)
  const n = canCount ? Math.min(it.count, st.counts[`${colId}:${it.id}`] ?? 0) : 0
  const full = canCount && n >= it.count
  return (
    <article className={`rounded-[26px] ring-1 transition ${compact ? 'p-4' : 'p-5'} ${full ? 'bg-leaf/[.06] ring-leaf/30' : 'bg-card ring-line'}`} data-dhikr={it.id} data-full={full}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">حصن المسلم · {toAr(it.hisnNo)}</span>
        <div className="flex items-center gap-1">
          {full && <span className="flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf" data-done><Icon name="check" size={12} />مكتمل</span>}
          {it.kind === 'instruction' && <span className="rounded-full bg-night/[.06] px-2 py-0.5 text-[11px] text-muted">إرشاد من الكتاب</span>}
          <Fav id={it.id} on={fav} />
        </div>
      </div>
      {eveningNotes.length > 0 && (
        <div className="mt-2 rounded-[16px] bg-sky/[.08] p-3 text-[13px] leading-relaxed ring-1 ring-sky/25" data-evening-note>
          <p className="mb-1 text-[11.5px] font-semibold text-sky">في المساء · من حاشية الكتاب</p>
          {eveningNotes.map((x) => <p key={x.n} style={{ fontFamily: "'Amiri', serif", fontSize: SIZE[st.settings.size] - 3 }}>{x.text}</p>)}
        </div>
      )}
      <div className={compact ? 'my-3' : 'my-4'}><Text segs={it.segs} size={SIZE[st.settings.size]} fnIndex={fnIndex} /></div>
      {canCount ? (
        <div className="flex items-center gap-4">
          <button type="button" disabled={full} onClick={() => azkar.tap(colId, it.id, it.count)} aria-label={full ? 'مكتمل' : `عُدّ مرة، المتبقي ${it.count - n}`} className={`press relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-[20px] font-bold ${full ? 'bg-leaf text-white' : 'bg-night text-parchment'}`} data-counter={it.id}>
            {full ? <Icon name="check" size={26} /> : <span className="tabular-nums">{toAr(n)}</span>}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold" data-remaining>{full ? 'أتممته' : `متبقٍ ${toAr(it.count - n)}`}</p>
            <p className="text-[12px] text-muted">التكرار: {times(it.count)}{it.countNote ? ` · ${it.countNote}` : ''}</p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-leaf transition-[width]" style={{ width: `${(n / it.count) * 100}%` }} /></span>
          </div>
          {n > 0 && <button type="button" onClick={() => azkar.resetItem(colId, it.id)} aria-label="إعادة عدّ هذا الذكر" className="press flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-night/5" data-reset-item={it.id}><Icon name="refresh" size={16} /></button>}
        </div>
      ) : it.kind === 'instruction' ? (
        <p className="text-[12px] text-muted">فعل يُؤدّى وليس لفظًا يُعَدّ؛ لا يدخل في العدّاد ولا في التقدّم.</p>
      ) : (
        <p className="rounded-[14px] bg-clay/10 px-3 py-2 text-[12px] text-clay">عدد التكرار قيد المراجعة؛ لا يُحتسب في التقدّم.</p>
      )}
      <div className="mt-3 border-t border-line/70 pt-2.5">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="press flex w-full items-center gap-1.5 text-start text-[12px] text-muted" data-source-toggle>
          <Icon name="shield" size={13} className="text-leaf" />
          <span className="flex-1 truncate">{takhrij ? takhrij.text.replace(/^«[^»]*»\.?\s*/, '').slice(0, 70) : 'حصن المسلم'}</span>
          <Icon name="chevronDown" size={13} className={open ? 'rotate-180' : ''} />
        </button>
        {open && <Details it={it} fnIndex={fnIndex} />}
      </div>
    </article>
  )
}

function Details({ it, fnIndex }: { it: HisnItem; fnIndex: (n: number) => number }) {
  const q = it.quran.filter((x): x is { s: number; from: number; to: number; match: string } => 's' in x)
  return (
    <div className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed" data-details>
      {it.notes.map((x) => (
        <p key={x.n} className="rounded-[12px] bg-night/[.03] px-3 py-2"><b className="font-semibold text-gold">{toAr(fnIndex(x.n))}</b> · <span className="text-muted">{x.kind === 'takhrij' ? 'التخريج' : 'حاشية'}:</span> {x.text}</p>
      ))}
      <p><span className="text-muted">درجة الحديث:</span> {it.grading.length ? <>كما في الحاشية: «{it.grading.join('»، «')}»</> : 'لم يُذكر حكم صريح في الكتاب؛ لا نضيف حكمًا من عندنا.'}</p>
      {q.length > 0 && <p><span className="text-muted">الآيات:</span> {q.map((x) => `${surah(x.s).ar} ${toAr(x.from)}${x.to !== x.from ? `–${toAr(x.to)}` : ''}`).join('، ')} · مطابقة حرفيًا لنص المصحف المعتمد في التطبيق</p>}
      <Checklist it={it} />
    </div>
  )
}

function Checklist({ it }: { it: HisnItem }) {
  const rows: [string, string, boolean][] = [
    ['النص', 'منقول حرفيًا من الطبعة الرسمية', true],
    ['التشكيل', 'كما في المصدر', true],
    ['العدد', it.kind === 'instruction' ? 'لا ينطبق (إرشاد)' : `${times(it.count ?? it.countBook)} — مطابق بين الكتاب وhisnmuslim.com`, it.kind === 'instruction' || it.count != null],
    ['المناسبة', `الباب ${toAr(it.chapter)}: ${CHAPTERS[String(it.chapter)]}`, true],
    ['المصدر', it.notes.some((n) => n.kind === 'takhrij') ? 'تخريج الكتاب مذكور أعلاه' : 'لا تخريج', it.notes.some((n) => n.kind === 'takhrij')],
    ['الحكم', it.grading.length ? 'منصوص في الحاشية' : 'غير مذكور في الكتاب', it.grading.length > 0],
    ['الروايات', it.notes.length > 1 ? 'الحواشي محفوظة كما هي' : 'لا فروق مذكورة', true],
    ['مراجعة عالم', 'لم تتم بعد في هذه المعاينة', false],
  ]
  return (
    <details className="rounded-[12px] bg-night/[.03] px-3 py-2" data-checklist>
      <summary className="cursor-pointer text-[12px] font-semibold">قائمة التحقّق ({it.status === 'source-verified' ? 'موثّق من المصدر' : 'يحتاج مراجعة'})</summary>
      <ul className="mt-2 space-y-1 text-[12px]">
        {rows.map(([k, v, ok]) => <li key={k} className="flex gap-2"><span className={ok ? 'text-leaf' : 'text-muted'}>{ok ? '✓' : '○'}</span><span className="w-16 shrink-0 text-muted">{k}</span><span>{v}</span></li>)}
      </ul>
    </details>
  )
}

function QuranCard({ it, st }: { it: QuranItem; st: AState }) {
  const [t, setT] = useState<{ ayat: string[]; hafs: boolean } | null | false>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setT(null)
    loadMushaf(it.s).then((r) => live && setT({ ayat: r.ayat.slice(it.from - 1, it.to), hafs: r.hafs }), () => live && setT(false))
    return () => {
      live = false
    }
  }, [it.s, it.from, it.to, attempt])
  const size = SIZE[st.settings.size] + 2
  return (
    <article className="rounded-[26px] bg-card p-5 ring-1 ring-line" data-quran={it.id}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">آية من القرآن · سورة {surah(it.s).ar} {toAr(it.from)}{it.to !== it.from ? `–${toAr(it.to)}` : ''}</span>
        <Fav id={it.id} on={st.favorites.includes(it.id)} />
      </div>
      <div className="mf-paper my-3 rounded-[18px] px-4 py-3">
        {t === null ? <div className="h-16 animate-pulse rounded-xl bg-night/5" role="status" aria-label="جارٍ التحميل" /> : t === false ? (
          <p role="alert" className="text-[13px]">تعذّر تحميل نص الآية. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">أعد المحاولة</button></p>
        ) : (
          <p className={`mf-text ${t.hafs ? '' : 'tanzil'}`} style={{ fontSize: size, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
            {t.ayat.map((a, i) => <span key={i}>{a} <span className="mf-num">{toAr(it.from + i)}</span> </span>)}
          </p>
        )}
      </div>
      <p className="text-[11.5px] text-muted">القرآن الكريم · {t && !t.hafs ? 'نص Tanzil (احتياطي)' : 'نص KFGQPC حفص'} · لا يُذكر عدد تكرار · اختيار الآية تحريري</p>
    </article>
  )
}
