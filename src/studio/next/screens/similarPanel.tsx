// متشابهات هذا المقطع — Quranic Similarities in the context of the active
// memorisation passage (inside رحلة الحفظ). Two strictly separated sources:
//  - Verified references (../mutashabihat): shown only when traceable; none bundled yet,
//    so every passage shows the honest empty state.
//  - Automatic textual matches the user linked from the extended search, always
//    labelled as such.
// Exercises are optional and only feed «التمييز بين المتشابهات»; they never mark an ayah memorised.
import { useEffect, useMemo, useState } from 'react'
import { Icon, toAr, useProto } from '../core'
import { surah } from '../../../lib/quran'
import { KIND_AR, verifiedFor, type VerifiedMatch } from '../mutashabihat'
import { pairsForPassage, useSession, type PassagePair, type Ref, type SimProgress } from '../session'
import { AyahText, Empty, diffRun, explain, refAr, skel, useOpenAndReturn, usePairTexts } from './similar'

type Tab = 'verified' | 'linked' | 'test' | 'revise'

export function SimilarPanel() {
  const ses = useSession()
  const { passage: p, cur, pairs: all, nonce } = ses.s
  const { go } = useProto()
  const verified = verifiedFor(p, cur)
  const linked = useMemo(() => pairsForPassage(p, all).sort((x, y) => Number(y.mine.a === cur) - Number(x.mine.a === cur) || x.mine.a - y.mine.a), [p, all, cur])
  const [tab, setTab] = useState<Tab>(linked.length && !verified.length ? 'linked' : 'verified')
  const extended = () => (ses.setAway({ panel: 'similar' }), go('similar'))
  return (
    <div data-similar-panel>
      <div className="mb-3">
        <h3 className="font-arabic-display text-[18px] font-bold">متشابهات هذا المقطع</h3>
        <p className="text-[12.5px] text-muted">آيات قد تتشابه عليك أثناء الحفظ</p>
      </div>
      <p className="mb-3 flex flex-wrap items-center gap-1.5 rounded-[14px] bg-night/[.04] px-3 py-2 text-[12px]" data-sim-context>
        <Icon name="sprout" size={14} className="text-gold" />
        سورة {surah(p.s).ar} · الآيات {toAr(p.from)}–{toAr(p.to)} · <b className="font-semibold">الآية الحالية {toAr(cur)}</b>
      </p>
      <SimMeter sim={ses.s.sim} />
      <div role="tablist" aria-label="متشابهات المقطع" className="mb-4 grid grid-cols-4 rounded-full bg-night/[.06] p-1 text-[12px]">
        {([['verified', 'موثّقة'], ['linked', `المرتبطة${linked.length ? ` · ${toAr(linked.length)}` : ''}`], ['test', 'اختبار قصير'], ['revise', 'مراجعة']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`press h-8 truncate rounded-full px-1 ${tab === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      {tab === 'verified' && <VerifiedList list={verified} />}
      {tab === 'linked' && <LinkedList list={linked} onExtended={extended} />}
      {tab === 'test' && <SelfTest key={nonce} pairs={linked} />}
      {tab === 'revise' && <RevisionRecall key={nonce} pairs={linked} />}
      <section className="mt-5 rounded-[20px] border border-dashed border-line p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Icon name="search" size={15} />البحث النصي الموسّع</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">مرجع ثانوي اختياري: <b className="font-semibold text-night">مطابقة نصية آلية</b> في القرآن كاملًا انطلاقًا من مقطعك، وليست تصنيفًا موثّقًا للمتشابهات. يُحمَّل النص الكامل عند البحث فقط، وتعود بعدها إلى الآية نفسها.</p>
        <button type="button" onClick={extended} className="press mt-3 flex h-10 items-center gap-1.5 rounded-full bg-night/[.06] px-4 text-[12.5px] font-semibold" data-open-extended><Icon name="search" size={14} />افتح البحث الموسّع</button>
      </section>
    </div>
  )
}

/** «التمييز بين المتشابهات» — its own progress, never counted as memorisation. */
function SimMeter({ sim }: { sim: SimProgress }) {
  const items: [string, number][] = [
    ['مراجع موثّقة رُوجعت', Object.keys(sim.reviewed).length],
    ['مقارنات مكتملة', Object.keys(sim.compared).length],
    ['تمارين التمييز', sim.diffDone],
    ['استرجاع ناجح', sim.recallOk],
  ]
  return (
    <section className="mb-4 rounded-[18px] bg-sky/[.06] p-3.5 ring-1 ring-sky/20" aria-label="التمييز بين المتشابهات" data-sim-progress>
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Icon name="layers" size={14} className="text-sky" />التمييز بين المتشابهات</p>
      <dl className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-[12px] bg-card/80 px-1 py-2"><dd className="text-[16px] font-bold">{toAr(v)}</dd><dt className="mt-0.5 text-[10px] leading-tight text-muted">{k}</dt></div>
        ))}
      </dl>
      <p className="mt-2 text-[10.5px] text-muted">مستقل عن الحفظ: لا تُحتسب هذه التمارين آياتٍ محفوظة. الحفظ يُسجَّل فقط بـ«أتقنتها».{sim.recallTried > 0 && ` · محاولات الاسترجاع ${toAr(sim.recallTried)}`}</p>
    </section>
  )
}

function OriginBadge({ origin }: { origin: 'verified' | 'textual' }) {
  return origin === 'verified' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[10.5px] font-semibold text-leaf"><Icon name="shield" size={11} />مرجع موثّق</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-night/[.06] px-2 py-0.5 text-[10.5px] font-semibold text-muted" title="مطابقة نصية آلية اختارها المستخدم، وليست تصنيفًا موثّقًا"><Icon name="search" size={11} />مطابقة نصية آلية</span>
  )
}

function VerifiedList({ list }: { list: VerifiedMatch[] }) {
  const ses = useSession()
  const [open, setOpen] = useState<string | null>(null)
  if (list.length === 0)
    return (
      <Empty
        icon="shield"
        title="المتشابهات الموثّقة قيد الإعداد"
        body="نُعدّ قاعدة للمتشابهات اللفظية من مصادر علمية معتمدة، ويُراجَع كل سجلّ فيها قبل نشره. لا توجد سجلات موثّقة بعد، ولذلك لا نعرض أزواجًا مخترعة ولا نتائج بحث آلي على أنها متشابهات معتمدة. ستظهر هنا المراجع الموثّقة بمصدرها ومن راجعها فور إضافتها."
      />
    )
  return (
    <ul className="space-y-2.5">
      {list.map((m) => {
        const linked = ses.s.pairs.some((x) => x.id === m.id)
        return (
          <li key={m.id} className="rounded-[20px] bg-card p-4 ring-1 ring-line" data-verified>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <OriginBadge origin="verified" />
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10.5px] font-semibold">{KIND_AR[m.rec.kind].ar}</span>
              {m.mine.a === ses.s.cur && <span className="text-[10.5px] font-semibold text-gold">الآية الحالية</span>}
            </div>
            <p className="text-[13px] leading-relaxed">الآية {toAr(m.mine.a)} من مقطعك {KIND_AR[m.rec.kind].why} سورة {refAr(m.other)}.</p>
            <p className="mt-1 text-[11.5px] text-muted">المصدر: {m.rec.source.title} · {m.rec.source.author}{m.rec.source.page ? ` · ص ${m.rec.source.page}` : ''} · راجعه: {m.rec.verifiedBy}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="press h-9 rounded-full bg-night px-3.5 text-[12px] font-semibold text-parchment">{open === m.id ? 'إخفاء المقارنة' : 'قارن'}</button>
              <button type="button" disabled={linked} onClick={() => ses.link(m.mine, m.other, 'verified')} className="press h-9 rounded-full bg-night/[.06] px-3.5 text-[12px] font-semibold disabled:opacity-50">{linked ? 'مرتبطة بالمقطع' : 'اربطها بالمقطع'}</button>
              <button type="button" disabled={!!ses.s.sim.reviewed[m.id]} onClick={() => ses.recordSim({ kind: 'reviewed', id: m.id })} className="press h-9 rounded-full bg-night/[.06] px-3.5 text-[12px] disabled:opacity-50">{ses.s.sim.reviewed[m.id] ? 'رُوجعت' : 'راجعتها'}</button>
            </div>
            {open === m.id && <PairCompare mine={m.mine} other={m.other} origin="verified" note={m.rec.note} source={`${m.rec.source.title} · ${m.rec.source.author}`} />}
          </li>
        )
      })}
    </ul>
  )
}

function LinkedList({ list, onExtended }: { list: PassagePair[]; onExtended: () => void }) {
  const ses = useSession()
  const [open, setOpen] = useState<string | null>(null)
  if (list.length === 0)
    return <Empty icon="layers" title="لم تربط أيّ زوج بهذا المقطع بعد" body="اربط مرجعًا موثّقًا من «موثّقة»، أو قارن آية من مقطعك بآية أخرى في البحث النصي الموسّع ثم اربطهما (تُوسم «مطابقة نصية آلية»)." action={<button type="button" onClick={onExtended} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">افتح البحث الموسّع</button>} />
  return (
    <ul className="space-y-2.5">
      {list.map((x) => (
        <li key={x.id} className="rounded-[20px] bg-card p-4 ring-1 ring-line" data-linked>
          <div className="flex flex-wrap items-center gap-1.5">
            <OriginBadge origin={x.origin} />
            {x.mine.a === ses.s.cur && <span className="text-[10.5px] font-semibold text-gold">الآية الحالية</span>}
          </div>
          <p className="mt-1.5 text-[13px]">الآية {toAr(x.mine.a)} من مقطعك ↔ سورة {refAr(x.other)}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setOpen(open === x.id ? null : x.id)} className="press h-9 rounded-full bg-night px-3.5 text-[12px] font-semibold text-parchment">{open === x.id ? 'إخفاء المقارنة' : 'راجع المقارنة'}</button>
            <button type="button" onClick={() => ses.unlink(x.id)} className="press h-9 rounded-full px-3.5 text-[12px] text-muted ring-1 ring-line">إزالة الربط</button>
          </div>
          {open === x.id && <PairCompare mine={x.mine} other={x.other} origin={x.origin} />}
        </li>
      ))}
    </ul>
  )
}

/** Exact verse in the passage vs the matching verse, differences highlighted on the exact text. */
function PairCompare({ mine, other, origin, note, source }: { mine: Ref; other: Ref; origin: 'verified' | 'textual'; note?: string; source?: string }) {
  const ses = useSession()
  const open = useOpenAndReturn('similar')
  const [attempt, setAttempt] = useState(0)
  const texts = usePairTexts([{ a: mine, b: other }], attempt)
  const A = texts ? texts[`${mine.s}:${mine.a}`] : null
  const B = texts ? texts[`${other.s}:${other.a}`] : null
  const r = A && B ? diffRun(A.t, B.t) : null
  const id = `${mine.s}:${mine.a}|${other.s}:${other.a}`
  useEffect(() => {
    if (r) ses.recordSim({ kind: 'compared', id })
  }, [!!r, id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (texts === false) return <p className="mt-3 text-[12.5px]">تعذّر تحميل نص الآيتين. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">أعد المحاولة</button></p>
  if (!A || !B || !r) return <div className="mt-3 h-20 animate-pulse rounded-[16px] bg-night/[.05]" />
  const side = (label: string, ref: Ref, t: typeof A, parts: typeof r.d.a) => (
    <div className="rounded-[16px] bg-night/[.03] p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold">{label} · سورة {refAr(ref)}</p>
      <div className="mf-paper rounded-[14px] px-3 py-2"><AyahText t={t.t} hafs={t.hafs} parts={parts} size={19} /></div>
      <button type="button" onClick={() => open(ref.s, ref.a)} className="press mt-2 flex h-8 items-center gap-1 rounded-full bg-gold-soft px-3 text-[11.5px] font-medium" data-open-mushaf><Icon name="book" size={13} />افتح في المصحف</button>
    </div>
  )
  return (
    <div className="mt-3 space-y-2" data-compare>
      {side('آيتك في المقطع', mine, A, r.d.a)}
      {side('الآية المشابهة', other, B, r.d.b)}
      {origin === 'verified' && note ? (
        <p className="rounded-[14px] bg-leaf/[.06] p-3 text-[12.5px] leading-relaxed">«{note}» <span className="text-muted">— {source}</span></p>
      ) : (
        <p className="rounded-[14px] bg-night/[.04] p-3 text-[12.5px] leading-relaxed">{explain(r.d)}{r.mine && r.other && <> الفرق المميِّز لآيتك: «<span className="mf-text inline text-[16px]">{r.mine.text}</span>» مقابل «<span className="mf-text inline text-[16px]">{r.other.text}</span>».</>} <span className="text-muted">(وصف آلي للنص، لا حكم علمي.)</span></p>
      )}
    </div>
  )
}

// ---- Optional short self-test: notice the difference · which surah? · complete the distinction
type Q =
  | { kind: 'notice'; x: PassagePair; parts: { w: string; tag: 'same' | 'diff' | 'mark' }[]; hafs: boolean }
  | { kind: 'which'; x: PassagePair; t: string; hafs: boolean }
  | { kind: 'complete'; x: PassagePair; parts: { w: string; tag: 'same' | 'diff' | 'mark' }[]; run: { i: number; j: number; text: string }; wrong: string; hafs: boolean }

function SelfTest({ pairs }: { pairs: PassagePair[] }) {
  const ses = useSession()
  const [started, setStarted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const use = pairs.slice(0, 3)
  const texts = usePairTexts(started ? use.map((x) => ({ a: x.mine, b: x.other })) : [], attempt)
  const qs = useMemo<Q[]>(() => {
    if (!texts) return []
    return use.flatMap((x) => {
      const A = texts[`${x.mine.s}:${x.mine.a}`]
      const B = texts[`${x.other.s}:${x.other.a}`]
      if (!A || !B) return []
      const r = diffRun(A.t, B.t)
      if (!r.mine || !r.other) return []
      return [
        { kind: 'notice' as const, x, parts: r.d.a, hafs: A.hafs },
        { kind: 'which' as const, x, t: B.t, hafs: B.hafs },
        { kind: 'complete' as const, x, parts: r.d.a, run: r.mine, wrong: r.other.text, hafs: A.hafs },
      ]
    })
  }, [texts]) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(0)
  const [ans, setAns] = useState<{ right: boolean; v: string } | null>(null)
  if (pairs.length === 0) return <Empty icon="sprout" title="لا توجد متشابهات مرتبطة للاختبار" body="الاختبار القصير يُبنى فقط من الأزواج المرتبطة بهذا المقطع، حتى لا يُعرض عليك شيء لم تختره أو لم يُوثَّق." />
  if (!started)
    return (
      <div className="rounded-[22px] bg-card p-5 text-center ring-1 ring-line">
        <p className="text-[14.5px] font-semibold">اختبار قصير اختياري</p>
        <p className="mx-auto mt-1 max-w-[340px] text-[12.5px] leading-relaxed text-muted">لاحظ الفرق · أيّ سورة؟ · أكمل العبارة المميِّزة — من {toAr(use.length)} زوج مرتبط. لا يقطع حفظك ولا يُحتسب حفظًا.</p>
        <button type="button" onClick={() => setStarted(true)} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment" data-start-test>ابدأ اختبارًا قصيرًا</button>
      </div>
    )
  if (texts === false) return <p className="text-[12.5px]">تعذّر تحميل الآيات. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">أعد المحاولة</button></p>
  if (!texts) return <p className="py-6 text-center text-[13px] text-muted" role="status">جارٍ تحميل الآيات…</p>
  if (qs.length === 0) return <Empty icon="sprout" title="لا يوجد اختلاف في الكلمات" body="الأزواج المرتبطة لا تختلف في رسم كلماتها، فلا يوجد ما نختبره." />
  if (i >= qs.length)
    return (
      <div className="rounded-[22px] bg-card p-6 text-center ring-1 ring-line" role="status" data-test-done>
        <p className="text-[16px] font-semibold">أتممت الاختبار</p>
        <p className="mt-1 text-[12.5px] text-muted">أصبت {toAr(ok)} من {toAr(qs.length)}. يُضاف إلى «التمييز بين المتشابهات» فقط؛ حالة حفظ الآيات لم تتغيّر.</p>
        <button type="button" onClick={() => (setI(0), setOk(0), setAns(null))} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد الاختبار</button>
      </div>
    )
  const q = qs[i]
  const answer = (right: boolean, v: string) => {
    if (ans) return
    setAns({ right, v })
    if (right) setOk((n) => n + 1)
    ses.recordSim(q.kind === 'complete' ? { kind: 'recall', ok: right } : { kind: 'diff' })
  }
  const title = q.kind === 'notice' ? 'لاحظ الفرق' : q.kind === 'which' ? 'أيّ سورة؟' : 'أكمل العبارة المميِّزة'
  return (
    <div className="rounded-[22px] bg-card p-4 ring-1 ring-line" data-test-q={q.kind}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex flex-1 gap-1">{qs.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? 'bg-leaf' : k === i ? 'bg-gold' : 'bg-night/10'}`} />)}</span>
        <span className="text-[11.5px] text-muted">{toAr(i + 1)}/{toAr(qs.length)}</span>
      </div>
      <p className="mb-1 text-[13px] font-semibold">{toAr(i + 1)}. {title}</p>
      {q.kind === 'notice' && (
        <>
          <p className="mb-2 text-[12px] text-muted">اضغط الكلمة التي تختلف بها الآية {toAr(q.x.mine.a)} من مقطعك عن سورة {refAr(q.x.other)}.</p>
          <div className="mf-paper rounded-[16px] p-3">
            <p className={`mf-text ${q.hafs ? '' : 'tanzil'}`} style={{ fontSize: 20, lineHeight: 2.2, textAlign: 'right', textAlignLast: 'right' }}>
              {q.parts.map((w, k) => w.tag === 'mark' ? <span key={k}> {w.w}</span> : (
                <span key={k}> <button type="button" disabled={!!ans} onClick={() => answer(w.tag === 'diff', w.w)} className={`rounded-md px-0.5 ${ans && w.tag === 'diff' ? 'bg-gold-soft ring-1 ring-gold/60' : ans && ans.v === w.w ? 'bg-clay/10' : 'hover:bg-night/[.06]'}`}>{w.w}</button></span>
              ))}
            </p>
          </div>
        </>
      )}
      {q.kind === 'which' && (
        <>
          <div className="mf-paper rounded-[16px] p-3"><AyahText t={q.t} hafs={q.hafs} size={19} /></div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[q.x.mine, q.x.other].sort((a, b) => a.s - b.s || a.a - b.a).map((r) => {
              const right = r === q.x.other
              return <button key={`${r.s}:${r.a}`} type="button" disabled={!!ans} onClick={() => answer(right, `${r.s}:${r.a}`)} className={`press h-11 rounded-[14px] text-[13px] font-semibold ring-1 ${ans ? (right ? 'bg-leaf/12 ring-leaf' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>سورة {refAr(r)}</button>
            })}
          </div>
        </>
      )}
      {q.kind === 'complete' && (
        <>
          <p className="mb-2 text-[12px] text-muted">استحضر العبارة التي تميّز الآية {toAr(q.x.mine.a)} من مقطعك.</p>
          <div className="mf-paper rounded-[16px] p-3">
            <p className={`mf-text ${q.hafs ? '' : 'tanzil'}`} style={{ fontSize: 20, lineHeight: 2.2, textAlign: 'right', textAlignLast: 'right' }}>
              {q.parts.map((w, k) => (k > q.run.i && k <= q.run.j ? null : <span key={k}>{k > 0 && ' '}{k === q.run.i ? <span className="inline-block min-w-14 rounded-md border-b-2 border-dashed border-gold px-1 text-center">{ans?.right ? q.run.text : '…'}</span> : w.w}</span>))}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[q.run.text, q.wrong].sort((a, b) => skel(a).localeCompare(skel(b))).map((o) => (
              <button key={o} type="button" disabled={!!ans} onClick={() => answer(o === q.run.text, o)} className={`press mf-text min-h-12 rounded-[14px] px-2 text-[18px] ring-1 ${ans ? (o === q.run.text ? 'bg-leaf/12 ring-leaf' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>{o}</button>
            ))}
          </div>
        </>
      )}
      {ans && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[12.5px]">{ans.right ? 'أحسنت.' : q.kind === 'which' ? `هذه الآية من سورة ${refAr(q.x.other)}.` : 'المظلّل هو موضع الاختلاف؛ راجعه في المقارنة.'}</p>
          <button type="button" onClick={() => (setI(i + 1), setAns(null))} className="press h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">التالي</button>
        </div>
      )}
    </div>
  )
}

/** Revisit the passage's linked similarities while revising it: recall the distinguishing phrase, then self-check. */
export function RevisionRecall({ pairs, compact = false }: { pairs: PassagePair[]; compact?: boolean }) {
  const ses = useSession()
  const [attempt, setAttempt] = useState(0)
  const texts = usePairTexts(pairs.map((x) => ({ a: x.mine, b: x.other })), attempt)
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  if (pairs.length === 0) return compact ? null : <Empty icon="refresh" title="لا توجد متشابهات مرتبطة للمراجعة" body="عند ربط متشابهات بهذا المقطع، تعود إليك هنا كلما راجعته لتستحضر الفرق قبل أن تراه." />
  if (texts === false) return <p className="text-[12.5px]">تعذّر تحميل الآيات. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">أعد المحاولة</button></p>
  if (!texts) return <div className="h-16 animate-pulse rounded-[16px] bg-night/[.05]" />
  return (
    <div data-revision-recall>
      <p className="mb-2 text-[12.5px] text-muted">قبل أن ترى الفرق، استحضر العبارة التي تميّز آيتك عن نظيرتها، ثم تحقّق.</p>
      <ul className="space-y-2">
        {pairs.map((x) => {
          const A = texts[`${x.mine.s}:${x.mine.a}`]
          const B = texts[`${x.other.s}:${x.other.a}`]
          const r = A && B ? diffRun(A.t, B.t) : null
          if (!A || !r || !r.mine) return null
          return (
            <li key={x.id} className="rounded-[18px] bg-card p-3.5 ring-1 ring-line">
              <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px]"><b className="font-semibold">الآية {toAr(x.mine.a)}</b> ↔ سورة {refAr(x.other)} <OriginBadge origin={x.origin} /></p>
              <div className="mf-paper rounded-[14px] px-3 py-2">
                <p className={`mf-text ${A.hafs ? '' : 'tanzil'}`} style={{ fontSize: 18, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
                  {r.d.a.map((w, k) => <span key={k}>{k > 0 && ' '}{k >= r.mine!.i && k <= r.mine!.j ? <span className={shown[x.id] ? 'rounded-md bg-gold-soft px-0.5 ring-1 ring-gold/60' : 'rounded-md bg-night/10 text-transparent'}>{w.w}</span> : w.w}</span>)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!shown[x.id] ? (
                  <button type="button" onClick={() => setShown((s) => ({ ...s, [x.id]: true }))} className="press h-8 rounded-full bg-night px-3.5 text-[12px] font-semibold text-parchment">أظهر الفرق</button>
                ) : done[x.id] ? (
                  <span className="text-[12px] text-muted">سُجّلت المحاولة في «التمييز بين المتشابهات».</span>
                ) : (
                  ([['تذكّرتها', true], ['لم أتذكّرها', false]] as const).map(([l, ok]) => (
                    <button key={l} type="button" onClick={() => (setDone((d) => ({ ...d, [x.id]: true })), ses.recordSim({ kind: 'recall', ok }))} className={`press h-8 rounded-full px-3.5 text-[12px] font-semibold ${ok ? 'bg-leaf/10 text-leaf' : 'bg-night/[.06]'}`}>{l}</button>
                  ))
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
