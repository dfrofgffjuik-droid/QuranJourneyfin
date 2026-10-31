// المكافآت والإنجازات — adult and children's rewards (design preview).
// Everything is derived from the shared preview store (../progress):
//   • achievements are the ACHIEVEMENTS rules evaluated on the records; an earned
//     one is stored once with its date and triggering event and never removed
//   • only explicitly confirmed memorisation counts as memorisation; revision and
//     reading are separate; nothing is deducted; no streaks, no leaderboards
//   • kids' stars come from completed lesson records (one per lesson)
// Nothing here touches the app store or a real account.
import { useState } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { ACHIEVEMENTS, KIDS_BADGES, actions, derived, fmtDate, isDemoData, usePreview, type AchDef } from '../progress'
import { DataBar } from '../previewUi'

const ayatLabel = (n: number) => `${toAr(n)} ${n >= 3 && n <= 10 ? 'آيات' : 'آية'}`
const GROUPS: Record<AchDef['group'], string> = { hifz: 'الحفظ', juz: 'الأجزاء', revision: 'المراجعة', consistency: 'الثبات', plans: 'الخطط' }
const eventAr = (e: string) => (e === 'demo-seed' ? 'السيناريو التجريبي' : e.startsWith('task:') ? 'إتمام مهمة خطة' : e.startsWith('mem:journey') ? '«أتقنتها» في رحلة الحفظ' : e.startsWith('rev:') ? 'مراجعة مكتملة' : e.startsWith('lesson:') ? 'إتمام درس' : e.startsWith('edit:') ? 'تحديث خطة' : 'حدث في المعاينة')

export function Rewards() {
  const { nav, go } = useProto()
  const kids = nav.param === 'kids'
  const desk = useDevice() === 'desktop'
  const toggle = (
    <div role="tablist" aria-label="التجربة" className="grid w-full max-w-[320px] grid-cols-2 rounded-full bg-night/[.05] p-1 text-[13px]">
      {([['adult', 'الكبار'], ['kids', 'الأطفال']] as const).map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-selected={(k === 'kids') === kids} onClick={() => go('rewards', k)} className={`press h-9 rounded-full ${(k === 'kids') === kids ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`}>{l}</button>
      ))}
    </div>
  )
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}>
        {!desk && <MoreTabs />}
        <Head title="المكافآت والإنجازات" sub={kids ? 'نجوم وأوسمة لكل خطوة تعلّمتها حقًّا، بلا مقارنة ولا خسارة.' : 'احتفاء هادئ بما أتممته فعلًا: حفظ مؤكَّد، ومراجعة مكتملة، وثبات على خطتك.'} action={<DataBar />} />
        <div className="mb-5">{toggle}</div>
        {kids ? <KidsRewards /> : <AdultRewards />}
      </div>
    </Chrome>
  )
}

// ---- Adult
type Badge = { def: AchDef; p: number; evidence: string; earned: { at: string; eventId: string; demo?: boolean } | null }
function AdultRewards() {
  const desk = useDevice() === 'desktop'
  const { go } = useProto()
  const st = usePreview()
  const d = derived(st)
  const badges: Badge[] = ACHIEVEMENTS.filter((a) => st.achievements[a.id] || !a.hidden?.(d)).map((a) => ({ def: a, ...a.eval(d), earned: st.achievements[a.id] ?? null }))
  const [open, setOpen] = useState<Badge | null>(null)
  const earned = badges.filter((b) => b.earned).sort((a, b) => b.earned!.at.localeCompare(a.earned!.at))
  const juzDone = d.juz.filter((j) => j.status === 'done').length
  return (
    <div className="space-y-5" data-mode="adult">
      <div className={`grid gap-3 ${desk ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Summary icon="sprout" v={ayatLabel(d.memCount)} l="محفوظة بتأكيد" id="memorised" />
        <Summary icon="book" v={`${toAr(juzDone)} من ٣٠`} l="أجزاء مكتملة" />
        <Summary icon="star" v={toAr(earned.length)} l="إنجازات نلتها" id="earned" />
        <Summary icon="repeat" v={toAr(d.revSessions)} l="مراجعات مكتملة" id="revisions" />
      </div>
      <p className="text-[12px] leading-relaxed text-muted">{isDemoData(st) ? 'تشمل سجلات تجريبية محدّدة مسبقًا بتواريخ ثابتة؛ الإنجازات المعلَّمة «تجريبي» ليست إنجازات حقيقية.' : 'محسوبة من سجلاتك في المعاينة فقط.'} المراجعة والقراءة لا تزيدان الآيات المحفوظة، والأيام النشطة تُعدّ مجموعًا لا سلسلة.</p>

      {open && (
        <div role="dialog" aria-label="تفاصيل الإنجاز" className="flex items-center gap-4 rounded-[26px] bg-gold-soft/60 p-5 ring-1 ring-gold/30">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-white"><Icon name={open.def.icon} size={24} /></span>
          <div className="flex-1">
            <p className="text-[16px] font-semibold">{open.earned ? `ما شاء الله · ${open.def.ar}` : `في الطريق إلى: ${open.def.ar}`}</p>
            <p className="text-[12.5px] text-night/75">{open.evidence}{open.earned ? ` · نِلته ${fmtDate(open.earned.at.slice(0, 10))} عبر ${eventAr(open.earned.eventId)}${open.earned.demo ? ' (تجريبي)' : ''}` : ' · تقدّم بهدوء؛ لا شيء يُخصم.'}</p>
          </div>
          <button type="button" onClick={() => setOpen(null)} aria-label="إغلاق" className="press flex h-9 w-9 items-center justify-center rounded-full bg-card"><Icon name="x" size={15} /></button>
        </div>
      )}

      {(Object.keys(GROUPS) as AchDef['group'][]).map((g) => {
        const list = badges.filter((b) => b.def.group === g)
        if (!list.length) return null
        return (
          <section key={g} aria-label={GROUPS[g]}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">{GROUPS[g]}</h2>
              {g === 'juz' && <button type="button" onClick={() => go('library')} className="press ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-[12px] text-muted hover:bg-night/[.04]"><Icon name="layers" size={14} />مكتبة إنجازاتي</button>}
              {g === 'plans' && <button type="button" onClick={() => go('plans')} className="press ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-[12px] text-muted hover:bg-night/[.04]"><Icon name="target" size={14} />خططي</button>}
            </div>
            <ul className={`grid gap-2.5 ${desk ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {list.map((b) => (
                <li key={b.def.id}>
                  <button type="button" onClick={() => setOpen(b)} data-ach={b.def.id} data-earned={!!b.earned} className={`press flex w-full items-center gap-3 rounded-[20px] p-3.5 text-start ring-1 ${b.earned ? 'bg-card ring-gold/40' : 'bg-card/60 ring-line'}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${b.earned ? 'bg-gold text-white' : 'bg-night/[.05] text-muted'}`}><Icon name={b.earned ? b.def.icon : 'lock'} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{b.def.ar}{b.earned?.demo && <span className="ms-1 rounded-full bg-sky/10 px-1.5 text-[10px] font-semibold text-sky">تجريبي</span>}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className={`block h-full rounded-full ${b.earned ? 'bg-gold' : 'bg-sage'}`} style={{ width: `${Math.round((b.earned ? 1 : b.p) * 100)}%` }} /></span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted">{b.earned ? `نلته ${fmtDate(b.earned.at.slice(0, 10))}` : 'في الطريق'} · {b.evidence}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <section aria-label="سجل الإنجازات" className="rounded-[26px] bg-card p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-semibold">سجلّ ما نلته</h2>
        <p className="mb-3 text-[11.5px] text-muted">كل إنجاز يُسجَّل مرة واحدة مع تاريخه والحدث الذي حقّقه، ولا يُسحب أبدًا.</p>
        {earned.length === 0 ? <p className="text-[13px] text-muted">لم تنل إنجازًا بعد. ابدأ بخطة أو أتقن آية في رحلة الحفظ.</p> : (
          <ol className="relative space-y-3 border-s-2 border-gold/30 ps-4" data-history>
            {earned.map((b) => (
              <li key={b.def.id} className="relative">
                <span className="absolute -start-[23px] top-1 h-3 w-3 rounded-full bg-gold ring-4 ring-card" />
                <p className="text-[13.5px] font-medium">{b.def.ar}{b.earned!.demo ? ' · تجريبي' : ''}</p>
                <p className="text-[11.5px] text-muted">{fmtDate(b.earned!.at.slice(0, 10))} · {eventAr(b.earned!.eventId)} · {b.evidence}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <RulesLab />
    </div>
  )
}

function Summary({ icon, v, l, id }: { icon: string; v: string; l: string; id?: string }) {
  return (
    <div className="rounded-[22px] bg-card p-4 ring-1 ring-line" data-summary={id}>
      <Icon name={icon} size={18} className="text-gold" />
      <p className="mt-2 text-[20px] font-bold leading-none">{v}</p>
      <p className="mt-1 text-[12px] text-muted">{l}</p>
    </div>
  )
}

/** Interactive demonstration of the counting rules. */
function RulesLab() {
  const [hifz, setHifz] = useState(0)
  const [rev, setRev] = useState(0)
  const [log, setLog] = useState<{ ar: string; effect: string; counted: boolean }[]>([])
  const acts: { id: string; ar: string; icon: string; apply: () => { effect: string; counted: boolean } }[] = [
    { id: 'read', ar: 'قرأت صفحة', icon: 'book', apply: () => ({ effect: 'قراءة · لا تُحتسب حفظًا', counted: false }) },
    { id: 'listen', ar: 'استمعت لآية', icon: 'volume', apply: () => ({ effect: 'استماع · لا يُحتسب حفظًا', counted: false }) },
    { id: 'tafsir', ar: 'فتحت التفسير', icon: 'tafsir', apply: () => ({ effect: 'تفسير · لا يُحتسب حفظًا', counted: false }) },
    { id: 'reflect', ar: 'كتبت تأمّلًا', icon: 'note', apply: () => ({ effect: 'تدبّر · لا يُحتسب حفظًا', counted: false }) },
    { id: 'revise', ar: 'أكملت مهمة مراجعة', icon: 'repeat', apply: () => (setRev((x) => x + 1), { effect: '+١ مراجعة مكتملة', counted: true }) },
    { id: 'master', ar: 'أتقنت آية وأكّدت ذلك', icon: 'check', apply: () => (setHifz((x) => x + 1), { effect: '+١ آية محفوظة', counted: true }) },
  ]
  return (
    <section aria-label="كيف تُحتسب المكافآت" className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">كيف تُحتسب المكافآت؟ جرّب بنفسك <span className="text-[11.5px] font-normal text-muted">(مختبر توضيحي · لا يغيّر بياناتك)</span></h2>
        <span className="rounded-full bg-night/[.05] px-3 py-1 text-[12px]" data-count="hifz">حفظ مؤكَّد: <b>+{toAr(hifz)}</b></span>
        <span className="rounded-full bg-night/[.05] px-3 py-1 text-[12px]" data-count="rev">مراجعة: <b>+{toAr(rev)}</b></span>
      </div>
      <ul className="mt-2 space-y-1 text-[12.5px] text-night/80">
        <li>• يُحتسب الحفظ فقط حين تؤكّد أنك أتقنت الآية.</li>
        <li>• القراءة والاستماع والتفسير والتدبّر عبادات نافعة، لكنها لا تُسجَّل حفظًا تلقائيًا.</li>
        <li>• لا يُخصم شيء أبدًا، ولا خسارة عند انقطاع يوم، ولا ترتيب بين المستخدمين.</li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {acts.map((a) => (
          <button key={a.id} type="button" data-act={a.id} onClick={() => { const r = a.apply(); setLog((l) => [{ ar: a.ar, ...r }, ...l].slice(0, 6)) }} className="press flex h-10 items-center gap-1.5 rounded-full bg-night/[.04] px-3.5 text-[12.5px] ring-1 ring-line hover:ring-gold/50"><Icon name={a.icon} size={15} />{a.ar}</button>
        ))}
        {log.length > 0 && <button type="button" onClick={() => (setLog([]), setHifz(0), setRev(0))} className="press h-10 rounded-full px-3 text-[12px] text-muted">مسح</button>}
      </div>
      {log.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="سجل التجربة">
          {log.map((x, i) => <li key={i} className={`rounded-[12px] px-3 py-1.5 text-[12px] ${x.counted ? 'bg-leaf/10' : 'bg-night/[.03] text-muted'}`}>{x.ar} ← {x.effect}</li>)}
        </ul>
      )}
    </section>
  )
}

// ---- Kids
const STICKERS = [
  { ar: 'هلال', icon: 'moon', tile: 'bg-kid-3' },
  { ar: 'نجمة', icon: 'star', tile: 'bg-kid-2' },
  { ar: 'شمس', icon: 'sun', tile: 'bg-kid-2' },
  { ar: 'غرسة', icon: 'sprout', tile: 'bg-kid-1' },
  { ar: 'قلب', icon: 'heart', tile: 'bg-kid-4' },
  { ar: 'كتاب', icon: 'book', tile: 'bg-kid-5' },
  { ar: 'درع', icon: 'shield', tile: 'bg-kid-3' },
  { ar: 'بريق', icon: 'sparkle', tile: 'bg-kid-1' },
]
const PER_STICKER = 5
const THEMES = [
  { id: 'garden', ar: 'حديقة', tile: 'bg-kid-1', need: 0 },
  { id: 'sun', ar: 'شمسية', tile: 'bg-kid-2', need: 0 },
  { id: 'sky', ar: 'سماء', tile: 'bg-kid-3', need: 10 },
  { id: 'rose', ar: 'وردية', tile: 'bg-kid-4', need: 20 },
  { id: 'lilac', ar: 'بنفسجية', tile: 'bg-kid-5', need: 30 },
]
const TILES = ['bg-kid-1', 'bg-kid-2', 'bg-kid-3', 'bg-kid-4', 'bg-kid-5']

function KidsRewards() {
  const desk = useDevice() === 'desktop'
  const { go } = useProto()
  const st = usePreview()
  const d = derived(st)
  const stars = d.stars
  const unlocked = Math.min(STICKERS.length, Math.floor(stars / PER_STICKER))
  const toNext = PER_STICKER - (stars % PER_STICKER)
  const t = THEMES.find((x) => x.id === st.decor && stars >= x.need) ?? THEMES[0]
  return (
    <div className="space-y-5" data-mode="kids">
      <div className={`grid gap-4 ${desk ? 'grid-cols-[1.2fr_1fr]' : 'grid-cols-1'}`}>
        <section aria-label="نجومي" className="rounded-[30px] bg-kid-2 p-6 text-center">
          <p className="text-[14px] font-semibold">نجومي</p>
          <p className="mt-2 text-[54px] font-bold leading-none" data-stars={stars}>{toAr(stars)}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1" aria-hidden>{Array.from({ length: Math.min(stars, 30) }, (_, i) => <Icon key={i} name="star" size={16} fill className="text-gold" />)}</div>
          <p className="mt-3 text-[13px]">{stars === 0 ? 'أتمم درسك الأول لتنال أول نجمة!' : unlocked >= STICKERS.length ? 'جمعت كل الملصقات، ما شاء الله!' : `نجمة لكل درس أتممته. بقي ${toAr(toNext)} ${toNext > 2 ? 'نجوم' : 'نجمة'} لملصق جديد!`}</p>
          <span className="mx-auto mt-3 block h-2 max-w-[260px] overflow-hidden rounded-full bg-card/70"><span className="block h-full rounded-full bg-gold" style={{ width: `${((stars % PER_STICKER) / PER_STICKER) * 100}%` }} /></span>
        </section>
        <section aria-label="زيّن بيتك" className={`rounded-[30px] p-6 ${t.tile}`}>
          <p className="text-[14px] font-semibold">زيّن بيتك (اختياري)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {THEMES.map((x) => (
              <button key={x.id} type="button" disabled={stars < x.need} onClick={() => actions.setDecor(x.id)} aria-pressed={t.id === x.id} data-decor={x.id} className={`press flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-2 text-[12.5px] ring-2 disabled:opacity-50 ${t.id === x.id ? 'ring-night' : 'ring-transparent'}`}>
                <span className={`h-4 w-4 rounded-full ${x.tile} ring-1 ring-night/10`} />
                {x.ar}
                {stars < x.need && <span className="text-muted"> · {toAr(x.need)} نجمة</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-night/70">زينة فقط تُحفظ في المعاينة؛ لا تغيّر الدروس ولا التقدّم.</p>
        </section>
      </div>

      <section aria-label="أوسمتي">
        <h2 className="mb-2 text-[15px] font-semibold">أوسمتي</h2>
        <ul className={`grid gap-3 ${desk ? 'grid-cols-5' : 'grid-cols-2'}`}>
          {KIDS_BADGES.map((b, i) => {
            const e = st.kidsBadges[b.id]
            const ev = b.eval(d)
            return (
              <li key={b.id} data-kbadge={b.id} data-earned={!!e} className={`rounded-[24px] p-4 text-center ${e ? TILES[i % 5] : 'bg-card/70 ring-1 ring-dashed ring-line'}`}>
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${e ? 'bg-card text-gold' : 'bg-night/[.05] text-muted'}`}><Icon name={e ? b.icon : 'lock'} size={24} /></span>
                <p className="mt-2 text-[13.5px] font-semibold">{b.ar}</p>
                <p className="text-[11.5px] text-muted">{e ? `ما شاء الله! · ${fmtDate(e.at.slice(0, 10))}${e.demo ? ' · تجريبي' : ''}` : ev.evidence}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="مجموعة الملصقات" className="rounded-[30px] bg-card p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-semibold">مجموعة ملصقاتي · {toAr(unlocked)} من {toAr(STICKERS.length)}</h2>
        <ul className={`mt-3 grid gap-2.5 ${desk ? 'grid-cols-8' : 'grid-cols-4'}`}>
          {STICKERS.map((x, i) => (
            <li key={x.ar} className={`flex aspect-square flex-col items-center justify-center rounded-[20px] ${i < unlocked ? x.tile : 'bg-night/[.04]'}`} data-unlocked={i < unlocked}>
              <Icon name={i < unlocked ? x.icon : 'lock'} size={i < unlocked ? 28 : 18} className={i < unlocked ? 'text-night' : 'text-muted/60'} />
              <span className="mt-1 text-[11px]">{i < unlocked ? x.ar : `${toAr((i + 1) * PER_STICKER)} نجمة`}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[26px] bg-card p-5 ring-1 ring-line" aria-label="لولي الأمر">
        <p className="text-[13.5px] font-semibold">لوليّ الأمر</p>
        <ul className="mt-2 space-y-1 text-[12.5px] text-night/80">
          <li>• النجمة تُمنح مرة واحدة عند إتمام درس فعلًا، لا بمجرد فتحه أو تكرار الضغط.</li>
          <li>• السورة القصيرة تُحسب محفوظة فقط حين تؤكّد أنت أن طفلك أتقنها.</li>
          <li>• لا تُسحب نجمة أبدًا، ولا مقارنة بين الأطفال.</li>
        </ul>
        <button type="button" onClick={() => go('kids')} className="press mt-3 flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment"><Icon name="home" size={15} />إلى عالم الأطفال</button>
      </section>
    </div>
  )
}
