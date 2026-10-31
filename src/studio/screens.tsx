import { useEffect, useState } from 'react'
import { useP } from './proto'
import { AyahNo, Bar, Btn, Card, Chip, I, IconBtn, Q, Section, Stepper, Title, Toggle, TopBar, useTone } from './kit'
import { ProgressViz, WeekView, estimate, useSurahText, type WeekDay } from './parts'
import { AGENDA, BISMILLAH, DAYS, DAYS_SHORT, FATIHA, FATIHA_MEANING, JOURNEY, KIDS, PLANS, PLAN_TYPES, RECITERS, RESULT, RESULT_NOTES, REVISION, SHORT, SURAHS, USER, surah, toAr } from './data'

const wrap = (desktop: boolean) => (desktop ? 'mx-auto w-full max-w-[1040px] px-8 pb-16' : 'px-5 pb-10')

// 1. Onboarding & learning path -----------------------------------------------
export function Onboarding() {
  const { tab, setMode, theme, desktop, concept } = useP()
  const [step, setStep] = useState(0)
  const [who, setWho] = useState('me')
  const [path, setPath] = useState('hifz')
  const [mins, setMins] = useState(15)
  const paths = [
    ['read', 'تعلّم القراءة من البداية', 'الحروف والحركات حتى قراءة المصحف', 'letters'],
    ['tajweed', 'تحسين التلاوة', 'تسميع مع ملاحظات فورية على النطق', 'mic'],
    ['hifz', 'الحفظ', 'خطة حفظ بوتيرة تناسبك', 'sprout'],
    ['muraja', 'تثبيت المحفوظ', 'جدول مراجعة ذكي لما حفظته', 'repeat'],
    ['wird', 'الورد والختمة', 'قراءة يومية وختمة بموعد محدد', 'book'],
  ]
  const finish = () => (who === 'kid' ? setMode('kids', 'k-home') : who === 'guide' ? tab('guide') : tab('home'))
  return (
    <div className={`flex min-h-full flex-col ${desktop ? 'items-center justify-center py-10' : ''}`}>
      {step === 0 ? (
        <div className={`flex flex-1 flex-col ${desktop ? 'w-full max-w-[920px] flex-row overflow-hidden rounded-[28px] ' + (theme.card === 'block' ? 'border-2 border-(--ink) !rounded-none' : '') : ''}`}>
          <div className={`relative flex flex-col justify-end overflow-hidden p-6 text-(--hero-ink) ${desktop ? 'min-h-[520px] flex-1' : 'min-h-[52%] flex-1'}`} style={{ background: 'var(--hero)' }}>
            <div className="absolute inset-0 opacity-60" style={{ background: 'var(--hero-art, none)' }} />
            <div className="relative">
              <div className="mb-4 font-(family-name:--font-quran) text-[64px] leading-none opacity-90">ٱقْرَأْ</div>
              <div className="text-[12px] font-semibold uppercase tracking-[.2em] opacity-75">{concept.name}</div>
            </div>
          </div>
          <div className={`flex flex-col gap-4 bg-(--bg) p-6 ${desktop ? 'w-[420px] justify-center' : ''}`}>
            <Title size="xl" sub="تعلّم القراءة، احفظ وراجع، وحسّن تلاوتك، خطوة بخطوة. مجاني بالكامل، بلا إعلانات ولا اشتراكات.">القرآن رفيقي</Title>
            <div className="flex justify-center gap-1.5 py-1">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-6 bg-(--accent)' : 'w-1.5 bg-(--line)'}`} />)}</div>
            <Btn size="lg" full onClick={() => setStep(1)}>ابدأ الرحلة <I n="arrow" s={18} /></Btn>
            <Btn kind="soft" full onClick={() => tab('home')}>لديّ ملف على هذا الجهاز</Btn>
            <p className="text-center text-[11px] text-(--muted)">بياناتك تبقى على جهازك. لا حساب مطلوب.</p>
          </div>
        </div>
      ) : (
        <div className={`flex flex-1 flex-col p-5 ${desktop ? 'w-full max-w-[640px]' : ''}`}>
          <div className="flex items-center gap-3">
            <IconBtn n="chevron" label="رجوع" onClick={() => setStep(step - 1)} />
            <div className="flex flex-1 gap-1.5">{[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-(--accent)' : 'bg-(--line)'}`} />)}</div>
            <span className="text-[12px] text-(--muted)">{toAr(step)}/٣</span>
          </div>
          {step === 1 && (
            <div className="mt-6 flex-1">
              <Title size="lg" sub="يمكن إضافة ملفات أخرى لاحقًا على الجهاز نفسه.">لمن هذا الملف؟</Title>
              <div className="mt-5 grid gap-3">
                {[
                  ['me', 'لي أنا', 'تجربة البالغين: حفظ ومراجعة وورد وختمة', 'user'],
                  ['kid', 'لطفلي', 'وضع الأطفال: حروف وحركات وسور قصيرة', 'star'],
                  ['guide', 'أنا وليّ أمر أو معلّم', 'متابعة تقدّم الأطفال والتكليفات', 'users'],
                ].map(([id, t, d, ic]) => (
                  <Card key={id} onClick={() => setWho(id)} className={who === id ? '!ring-2 !ring-(--accent)' : ''}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-full bg-(--surface-2) text-(--accent)"><I n={ic} /></span>
                      <div className="flex-1"><div className="text-[15px] font-semibold text-(--ink)">{t}</div><div className="text-[12px] text-(--muted)">{d}</div></div>
                      <span className={`grid size-5 place-items-center rounded-full border-2 ${who === id ? 'border-(--accent) bg-(--accent)' : 'border-(--line)'}`}>{who === id && <I n="check" s={12} className="text-(--accent-ink)" />}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="mt-6 flex-1">
              <Title size="lg" sub={who === 'kid' ? 'سنبدأ بالحروف والأصوات، ثم الحركات، ثم السور القصيرة.' : 'اختر مسارك الأول، وتستطيع إضافة غيره متى شئت.'}>{who === 'kid' ? 'مسار الطفل' : 'ما الذي تريد البدء به؟'}</Title>
              <div className="mt-5 grid gap-2.5">
                {(who === 'kid'
                  ? [
                      ['k1', 'أبدأ من الحروف', 'عمر ٤–٦ سنوات', 'letters'],
                      ['k2', 'أعرف الحروف، أريد القراءة', 'عمر ٦–٩ سنوات', 'book'],
                      ['k3', 'أحفظ السور القصيرة', 'كل الأعمار', 'sprout'],
                    ]
                  : who === 'guide'
                    ? [
                        ['g1', 'متابعة أطفالي في البيت', 'ملفات على هذا الجهاز', 'users'],
                        ['g2', 'حلقة تحفيظ', 'تكليفات وتسجيلات للمراجعة', 'layers'],
                      ]
                    : paths
                ).map(([id, t, d, ic]) => (
                  <Card key={id} onClick={() => setPath(id)} className={path === id ? '!ring-2 !ring-(--accent)' : ''}>
                    <div className="flex items-center gap-3">
                      <I n={ic} className="text-(--accent)" />
                      <div className="flex-1"><div className="text-[14px] font-semibold text-(--ink)">{t}</div><div className="text-[12px] text-(--muted)">{d}</div></div>
                      {path === id && <I n="check" className="text-(--accent)" />}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="mt-6 flex-1">
              <Title size="lg" sub="القليل الدائم خير من الكثير المنقطع.">كم دقيقة في اليوم؟</Title>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {[5, 10, 15, 25].map((m) => (
                  <Card key={m} onClick={() => setMins(m)} className={`text-center ${mins === m ? '!ring-2 !ring-(--accent)' : ''}`}>
                    <div className="font-(family-name:--font-display) text-[26px] font-bold text-(--ink)">{toAr(m)}</div>
                    <div className="text-[11px] text-(--muted)">دقيقة</div>
                  </Card>
                ))}
              </div>
              <Card className="mt-4">
                <div className="text-[13px] font-semibold text-(--ink)">تذكير يومي</div>
                <div className="mt-2 flex flex-wrap gap-2">{['بعد الفجر', 'بعد العصر', 'قبل النوم'].map((t, i) => <Chip key={t} active={i === 0}>{t}</Chip>)}</div>
              </Card>
            </div>
          )}
          <Btn size="lg" full className="mt-6" onClick={() => (step < 3 ? setStep(step + 1) : finish())}>{step < 3 ? 'التالي' : who === 'kid' ? 'افتح عالم الطفل' : 'لنبدأ'}</Btn>
        </div>
      )}
    </div>
  )
}

// 3. Quran library ------------------------------------------------------------
export function Library() {
  const { go, desktop, sheet, theme } = useP()
  const [q, setQ] = useState('')
  const [tabId, setTab] = useState('surah')
  const list = SURAHS.filter((s) => !q || s.ar.includes(q) || s.en.toLowerCase().includes(q.toLowerCase()) || String(s.n) === q)
  const memorized = new Set([1, 67, ...Array.from({ length: 37 }, (_, i) => 78 + i)])
  return (
    <div>
      <TopBar title="المصحف" sub="١١٤ سورة · ٦٠٤ صفحات" noBack actions={<IconBtn n="settings" label="تصفية" onClick={() => sheet('filter')} />} />
      <div className={wrap(desktop)}>
        <label className={`mt-2 flex h-12 items-center gap-2 px-4 text-(--muted) ${theme.card === 'block' ? 'border-2 border-(--ink)' : theme.card === 'rule' ? 'border-b border-(--ink)' : 'rounded-full bg-(--surface) ring-1 ring-(--line)'}`}>
          <I n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم السورة أو رقمها" className="h-full flex-1 bg-transparent text-[14px] text-(--ink) outline-none placeholder:text-(--muted)" />
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {[['surah', 'السور'], ['juz', 'الأجزاء'], ['mem', 'المحفوظ'], ['marks', 'العلامات']].map(([id, l]) => <Chip key={id} active={tabId === id} onClick={() => setTab(id)}>{l}</Chip>)}
        </div>
        <Card className="mt-4" onClick={() => go('reader', { n: 67 })}>
          <div className="flex items-center gap-3">
            <I n="bookmark" className="text-(--accent)" />
            <div className="flex-1"><div className="text-[12px] text-(--muted)">تابع من حيث توقفت</div><div className="text-[15px] font-semibold text-(--ink)">الملك · الآية ١٦ · صفحة ٥٦٣</div></div>
            <I n="chevron" s={18} className="rotate-180 text-(--muted)" />
          </div>
        </Card>
        {tabId === 'juz' ? (
          <div className={`mt-4 grid gap-2 ${desktop ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
              <Card key={j} onClick={() => go('reader', { n: j === 30 ? 78 : j === 29 ? 67 : 1 })} className="text-center">
                <div className="text-[11px] text-(--muted)">الجزء</div>
                <div className="font-(family-name:--font-display) text-[24px] font-bold text-(--ink)">{toAr(j)}</div>
                <Bar v={j === 30 ? 1 : j === 29 ? 0.42 : 0} className="mt-2" />
              </Card>
            ))}
          </div>
        ) : tabId === 'marks' ? (
          <div className="mt-4 space-y-2">
            {[['البقرة', 255, 'آية الكرسي'], ['الكهف', 10, 'دعاء الفتية'], ['الملك', 16, 'آخر قراءة']].map(([s, a, l]) => (
              <Card key={l as string} onClick={() => go('reader', { n: 1 })}><div className="flex items-center gap-3"><I n="bookmark" fill className="text-(--accent)" /><div className="flex-1"><div className="font-semibold text-(--ink)">{s} · {toAr(a)}</div><div className="text-[12px] text-(--muted)">{l}</div></div></div></Card>
            ))}
          </div>
        ) : (
          <div className={`mt-4 ${desktop ? 'grid grid-cols-3 gap-3' : theme.card === 'rule' ? '' : 'space-y-2'}`}>
            {(tabId === 'mem' ? list.filter((s) => memorized.has(s.n)) : list).map((s) => (
              <Card key={s.n} onClick={() => go('reader', { n: s.n })} className={theme.card === 'soft' || theme.card === 'glow' ? '!py-3' : ''}>
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center text-[13px] font-bold text-(--accent) ${theme.card === 'block' ? 'border-2 border-(--ink) text-(--ink)' : theme.card === 'rule' ? 'font-(family-name:--font-display) text-[18px]' : 'rounded-[12px] bg-(--surface-2)'}`}>{toAr(s.n)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-(--ink)">{s.ar}</div>
                    <div className="text-[11.5px] text-(--muted)">{s.place === 'makkah' ? 'مكية' : 'مدنية'} · {toAr(s.ayat)} آية · {s.en}</div>
                  </div>
                  {memorized.has(s.n) && <span className="size-2 rounded-full bg-(--good)" title="محفوظة" />}
                  <span className="font-(family-name:--font-quran) text-[20px] text-(--ink) opacity-80">{s.ar}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 4. Quran reader -------------------------------------------------------------
export function Reader() {
  const { cur, theme, sheet, desktop, st, flag, go, tab } = useP()
  const n = Number(cur.p?.n ?? 1)
  const meta = surah(n)
  const ayat = useSurahText(n)
  const [i, setI] = useState(0)
  const [marked, setMarked] = useState<number[]>([])
  const playing = !!st.flags.playing
  useEffect(() => setI(0), [n])
  const actions = (
    <>
      <IconBtn n="search" label="بحث" onClick={() => tab('library')} />
      <IconBtn n="type" label="إعدادات العرض" onClick={() => sheet('display')} />
    </>
  )
  const player = (
    <div className="pointer-events-none sticky bottom-3 z-10 mt-4 flex justify-center px-4">
      <div className={`pointer-events-auto flex items-center gap-3 px-3 py-2 text-(--ink) ${theme.card === 'block' ? 'border-2 border-(--ink) bg-(--surface)' : theme.card === 'rule' ? 'border border-(--ink) bg-(--bg)' : 'rounded-full bg-(--surface) shadow-[0_10px_30px_-10px_rgba(0,0,0,.35)] ring-1 ring-(--line)'}`}>
        <button onClick={() => sheet('reciter')} className="flex items-center gap-1 text-[12px] font-semibold"><I n="chevronDown" s={16} />{String(st.flags.reciter ?? RECITERS[0])}</button>
        <button aria-label="تكرار" className="text-(--muted)" onClick={() => flag('repeat', !st.flags.repeat)}><I n="repeat" s={18} className={st.flags.repeat ? 'text-(--accent)' : ''} /></button>
        <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={() => flag('playing', !playing)} className="grid size-9 place-items-center rounded-full bg-(--accent) text-(--accent-ink)"><I n={playing ? 'pause' : 'play'} s={16} fill /></button>
      </div>
    </div>
  )
  if (!ayat) return <div><TopBar title={meta.ar} /><div className="p-10 text-center text-(--muted)">يُحمَّل النص…</div></div>
  const meaning = (k: number) => (n === 1 ? FATIHA_MEANING[k] : null)
  const header = (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-(--muted)">
      <span className="font-semibold text-(--ink)">{meta.ar}</span>
      <span className="rounded-full bg-(--surface-2) px-2.5 py-1">{toAr(meta.ayat)} آية</span>
      <span className="rounded-full bg-(--surface-2) px-2.5 py-1">{meta.place === 'makkah' ? 'مكية' : 'مدنية'}</span>
      <span className="rounded-full bg-(--surface-2) px-2.5 py-1">صفحة {toAr(meta.pages[0])}</span>
    </div>
  )

  if (theme.reader === 'focus') {
    const a = ayat[i]
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title={meta.ar} sub={`الآية ${toAr(i + 1)} من ${toAr(ayat.length)}`} actions={actions} />
        <div className={`flex flex-1 flex-col ${wrap(desktop)}`}>
          <div className="mt-2 flex gap-1">{ayat.slice(0, 40).map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-1 flex-1 rounded-full ${k === i ? 'bg-(--accent)' : k < i ? 'bg-(--ink)/40' : 'bg-(--surface-2)'}`} />)}</div>
          <button onClick={() => sheet('ayah', { n, a: i + 1, text: a })} className={`my-6 flex flex-1 flex-col items-center justify-center text-center ${theme.card === 'glow' ? 'rounded-[28px] bg-gradient-to-b from-(--surface) to-transparent p-6 ring-1 ring-white/5' : ''}`}>
            <Q className={`text-(--ink) ${desktop ? 'text-[46px]' : 'text-[34px]'}`}>{a}</Q>
            <AyahNo n={i + 1} className="mt-4 text-[26px]" />
            {meaning(i) && <p className="mt-4 max-w-md text-[13px] text-(--muted)">{meaning(i)}</p>}
          </button>
          <div className="flex items-center justify-between gap-3 pb-4">
            <Btn kind="soft" disabled={i === ayat.length - 1} onClick={() => setI(i + 1)}>التالية</Btn>
            <button onClick={() => flag('playing', !playing)} className="grid size-16 place-items-center rounded-full bg-(--accent) text-(--accent-ink) shadow-[0_0_30px_-6px_var(--accent)]"><I n={playing ? 'pause' : 'play'} s={24} fill /></button>
            <Btn kind="soft" disabled={i === 0} onClick={() => setI(i - 1)}>السابقة</Btn>
          </div>
          <div className="flex justify-center gap-2 pb-6"><Chip onClick={() => go('memorize')}><I n="sprout" s={15} />احفظ</Chip><Chip onClick={() => go('recite')}><I n="mic" s={15} />سمّع</Chip><Chip onClick={() => sheet('ayah', { n, a: i + 1, text: a })}><I n="more" s={15} />المزيد</Chip></div>
        </div>
      </div>
    )
  }

  if (theme.reader === 'lines')
    return (
      <div>
        <TopBar title={meta.ar} sub={`${meta.en} · صفحة ${toAr(meta.pages[0])}`} actions={actions} />
        <div className={`${wrap(desktop)} pt-4`}>
          <div className="flex items-center justify-between">{header}<div className="flex gap-2"><Chip active>آيات</Chip><Chip onClick={() => sheet('display')}>صفحة</Chip></div></div>
          <div className="mt-4 overflow-hidden rounded-[10px] border border-(--line) bg-(--surface)">
            <div className="grid grid-cols-[48px_1fr_88px] border-b border-(--line) bg-(--surface-2) px-2 py-2 text-[11px] font-semibold text-(--muted)"><span>رقم</span><span>الآية</span><span className="text-center">الحالة</span></div>
            {ayat.map((a, k) => (
              <button key={k} onClick={() => sheet('ayah', { n, a: k + 1, text: a })} className="grid w-full grid-cols-[48px_1fr_88px] items-center border-b border-(--line) px-2 py-2 text-start last:border-0 hover:bg-(--surface-2)">
                <span className="text-[12px] font-bold text-(--muted)">{toAr(k + 1)}</span>
                <Q className="text-[22px] leading-[2] text-(--ink)">{a}</Q>
                <span className="text-center"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={k < 3 ? { background: '#dcfce7', color: '#166534' } : k < 5 ? { background: '#fef3c7', color: '#92400e' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>{k < 3 ? 'محفوظة' : k < 5 ? 'مراجعة' : 'جديدة'}</span></span>
              </button>
            ))}
          </div>
        </div>
        {player}
      </div>
    )

  if (theme.reader === 'page')
    return (
      <div>
        <TopBar title={meta.ar} sub={`الجزء ${toAr(Math.min(30, Math.ceil(meta.pages[0] / 20.2)))} · صفحة ${toAr(meta.pages[0])}`} actions={actions} />
        <div className={`${wrap(desktop)} pt-2`}>
          <div className={`mx-auto max-w-[620px] p-[6px] ${theme.card === 'organic' ? 'rounded-[28px] bg-(--surface-2)' : 'border border-(--accent)'}`}>
            <div className={`px-5 pb-6 pt-4 ${theme.card === 'organic' ? 'rounded-[22px] bg-(--surface)' : 'border-[3px] border-double border-(--accent) bg-(--surface)'}`}>
              <div className={`mx-auto mb-3 flex max-w-[300px] items-center justify-center py-2 text-center font-(family-name:--font-display) text-[20px] font-bold text-(--ink) ${theme.card === 'organic' ? 'rounded-full bg-(--surface-2)' : 'border-y border-(--accent)'}`}>سورة {meta.ar}</div>
              {n !== 1 && n !== 9 && <div className="mb-2 text-center"><Q className="text-[22px] text-(--ink)">{BISMILLAH}</Q></div>}
              <p className={`text-justify text-(--ink) [text-align-last:center] ${desktop ? 'text-[30px]' : 'text-[24px]'}`}>
                {ayat.map((a, k) => (
                  <button key={k} onClick={() => sheet('ayah', { n, a: k + 1, text: a })} className={`inline rounded-[6px] transition hover:bg-(--accent)/10 ${playing && k === 1 ? 'bg-(--accent)/15' : ''}`}>
                    <Q>{a}</Q> <AyahNo n={k + 1} className="mx-1" />{' '}
                  </button>
                ))}
              </p>
              <div className="mt-4 text-center text-[11px] text-(--muted)">{toAr(meta.pages[0])}</div>
            </div>
          </div>
        </div>
        {player}
      </div>
    )

  // cards (default)
  const near = [n - 1, n, n + 1, n + 2].filter((x) => x >= 1 && x <= 114)
  return (
    <div>
      <TopBar title={meta.ar} actions={actions} />
      <div className="flex gap-5 overflow-x-auto border-b border-(--line) px-5 no-scrollbar">
        {near.map((x) => (
          <button key={x} onClick={() => go('reader', { n: x })} className={`shrink-0 border-b-2 pb-2.5 pt-1 text-[14px] ${x === n ? 'border-(--accent) font-semibold text-(--accent)' : 'border-transparent text-(--muted)'}`}>{surah(x).ar}</button>
        ))}
      </div>
      <div className={`${wrap(desktop)} pt-4`}>
        {header}
        <div className={`mt-4 ${desktop ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
          {ayat.map((a, k) => (
            <Card key={k}>
              <div className="flex items-start gap-3">
                <span className="mt-2 grid size-8 shrink-0 place-items-center rounded-full border border-(--line) text-[12px] text-(--muted)">{toAr(k + 1)}</span>
                <Q className="flex-1 text-[25px] text-(--ink)">{a}</Q>
              </div>
              {meaning(k) && <p className="mt-2 rounded-[14px] bg-(--surface-2) px-3 py-2.5 text-[12.5px] leading-relaxed text-(--muted)">{meaning(k)}</p>}
              <div className="mt-3 flex items-center justify-end gap-4 text-[12px] text-(--muted)">
                <button onClick={() => setMarked((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]))} className="flex items-center gap-1.5">
                  <span className={`grid size-4 place-items-center rounded-[5px] border ${marked.includes(k) ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--line)'}`}>{marked.includes(k) && <I n="check" s={11} />}</span>علّم
                </button>
                <button onClick={() => sheet('ayah', { n, a: k + 1, text: a })} aria-label="خيارات الآية" className="grid size-7 place-items-center rounded-[8px] border border-(--line)"><I n="more" s={16} /></button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {player}
    </div>
  )
}

// 6. Memorization -------------------------------------------------------------
export function Memorize() {
  const { back, desktop, theme, toast } = useP()
  const ayat = useSurahText(67)
  const [k, setK] = useState(0)
  const [level, setLevel] = useState(0)
  const [reps, setReps] = useState(0)
  const [target, setTarget] = useState(5)
  const [peek, setPeek] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const total = 5
  const a = ayat?.[k] ?? ''
  const words = a.split(' ')
  if (done)
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="grid size-24 place-items-center rounded-full bg-(--accent) text-(--accent-ink)"><I n="check" s={44} /></div>
        <Title size="lg" sub="الملك ١٦–٢٠ أُضيفت إلى جدول مراجعتك: غدًا، بعد ٣ أيام، ثم بعد أسبوع.">أتممت ورد الحفظ</Title>
        <div className="flex gap-2"><Btn onClick={back}>العودة</Btn><Btn kind="soft" onClick={() => { setDone(false); setK(0); setLevel(2) }}>اختبر نفسك</Btn></div>
      </div>
    )
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-3">
        <IconBtn n="x" label="إغلاق" onClick={back} />
        <div className="flex-1"><div className="text-[13px] font-semibold text-(--ink)">حفظ · الملك {toAr(16 + k)}</div><Bar v={(k + reps / target / 1) / total} className="mt-1.5" /></div>
        <span className="text-[12px] text-(--muted)">{toAr(k + 1)}/{toAr(total)}</span>
      </div>
      <div className={`flex flex-1 flex-col ${wrap(desktop)}`}>
        <div className="mt-5 flex justify-center gap-1 rounded-full bg-(--surface-2) p-1 text-[12.5px]">
          {['النص كاملًا', 'أوائل الكلمات', 'مخفي'].map((l, i) => (
            <button key={l} onClick={() => { setLevel(i); setPeek([]) }} className={`flex-1 rounded-full py-2 font-semibold transition ${level === i ? 'bg-(--surface) text-(--ink) shadow-sm' : 'text-(--muted)'}`}>{l}</button>
          ))}
        </div>
        <Card className="mt-5 flex min-h-[220px] flex-1 items-center justify-center text-center">
          {!ayat ? <span className="text-(--muted)">…</span> : (
            <p className={`leading-[2.4] text-(--ink) ${desktop ? 'text-[38px]' : 'text-[28px]'}`}>
              {words.map((w, wi) => {
                const shown = level === 0 || peek.includes(wi)
                return (
                  <button key={wi} onClick={() => level > 0 && setPeek((p) => [...p, wi])} className="mx-1 inline-block">
                    {shown ? <Q>{w}</Q> : level === 1 ? <Q className="text-(--muted)"><span className="text-(--ink)">{[...w][0]}</span>{'ـ'.repeat(2)}</Q> : <span className="inline-block h-6 w-14 translate-y-1 rounded-[6px] bg-(--surface-2)" />}
                  </button>
                )
              })}
              <AyahNo n={16 + k} className="text-[22px]" />
            </p>
          )}
        </Card>
        {level > 0 && <p className="mt-2 text-center text-[11.5px] text-(--muted)">اضغط على كلمة مخفية لتلمح إليها</p>}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[13px] text-(--muted)">التكرار</span>
          <div className="flex gap-1.5">{[3, 5, 7].map((t) => <Chip key={t} active={target === t} onClick={() => { setTarget(t); setReps(0) }}>×{toAr(t)}</Chip>)}</div>
        </div>
        <div className="mt-3 flex justify-center gap-2">{Array.from({ length: target }, (_, i) => <span key={i} className={`size-3 rounded-full transition ${i < reps ? 'bg-(--accent)' : 'bg-(--surface-2)'} ${theme.card === 'block' ? '!rounded-none' : ''}`} />)}</div>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-6">
          <Btn kind="soft" onClick={() => toast('تمّ تسجيل محاولتك')}><I n="mic" s={17} />سمّع</Btn>
          <button onClick={() => setReps((r) => Math.min(target, r + 1))} className="grid size-16 place-items-center rounded-full bg-(--accent) text-(--accent-ink) shadow-[0_8px_24px_-8px_var(--accent)]" aria-label="استمع وكرّر"><I n="play" s={24} fill /></button>
          <Btn onClick={() => { if (k < total - 1) { setK(k + 1); setReps(0); setPeek([]) } else setDone(true) }}>{k < total - 1 ? 'الآية التالية' : 'إنهاء'}</Btn>
        </div>
      </div>
    </div>
  )
}

// 7. Plans dashboard ----------------------------------------------------------
export function Plans() {
  const { go, desktop, st, set, theme } = useP()
  const tone = useTone()
  const extras = st.extraPlans.map((p) => ({ ...p, target: 'خطة جديدة', unit: PLAN_TYPES.find((t) => t.id === p.type)?.unit ?? '', done: 0, total: 1 }))
  const all = [...extras, ...PLANS]
  const start = (type: string) => {
    set((s) => ({ ...s, draft: { ...s.draft, type, step: 1 } }))
    go('plan-new')
  }
  return (
    <div>
      <TopBar title="الخطط" sub="حفظ · مراجعة · ورد · ختمة · مخصّصة" noBack actions={<Btn size="sm" onClick={() => { set((s) => ({ ...s, draft: { ...s.draft, step: 0 } })); go('plan-new') }}><I n="plus" s={16} />خطة جديدة</Btn>} />
      <div className={wrap(desktop)}>
        <div className={`mt-2 grid gap-3 ${desktop ? 'grid-cols-[1.3fr_1fr]' : ''}`}>
          <div className="space-y-3">
            {all.map((p) => {
              const t = PLAN_TYPES.find((x) => x.id === p.type)!
              return (
                <Card key={p.id} onClick={() => go(p.type === 'muraja' ? 'revision' : p.type === 'khatmah' || p.type === 'wird' ? 'khatmah' : 'memorize')}>
                  <div className="flex items-start gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center ${theme.card === 'block' ? '' : 'rounded-[14px]'}`} style={tone(t.tone)}><I n={t.icon} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="text-[15px] font-semibold text-(--ink)">{p.title}</span><span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={tone(t.tone)}>{t.ar}</span></div>
                      <div className="mt-0.5 text-[12px] text-(--muted)">{p.target} · {toAr(p.perDay)} {p.unit} يوميًا · ينتهي {p.ends}</div>
                      <Bar v={p.done / p.total} className="mt-3" tone={tone(t.tone).color} />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-1">{DAYS_SHORT.map((d, i) => <span key={i} className={`grid size-5 place-items-center rounded-full text-[9.5px] ${p.days.includes(i) ? 'font-bold text-(--ink)' : 'text-(--muted) opacity-40'}`} style={p.days.includes(i) ? tone(t.tone) : undefined}>{d}</span>)}</div>
                        <span className="text-[11px] text-(--muted)">{toAr(Math.round((p.done / p.total) * 100))}٪</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
          <div>
            <Section title="هذا الأسبوع" className="!mt-0" action={<span className="text-[12px] text-(--muted)">١٤–٢٠ شعبان</span>}>
              <WeekView />
            </Section>
          </div>
        </div>
        <Section title="ابدأ خطة من نوع">
          <div className={`grid gap-2 ${desktop ? 'grid-cols-5' : 'grid-cols-2'}`}>
            {PLAN_TYPES.map((t) => (
              <Card key={t.id} onClick={() => start(t.id)}>
                <span className="grid size-9 place-items-center rounded-full" style={tone(t.tone)}><I n={t.icon} s={18} /></span>
                <div className="mt-2 text-[14px] font-semibold text-(--ink)">{t.ar}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-(--muted)">{t.desc}</div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

// 8. Create plan flow ---------------------------------------------------------
export function PlanNew() {
  const { st, set, back, tab, toast, desktop } = useP()
  const tone = useTone()
  const d = st.draft
  const up = (p: Partial<typeof d>) => set((s) => ({ ...s, draft: { ...s.draft, ...p } }))
  const [byDate, setByDate] = useState(false)
  const t = PLAN_TYPES.find((x) => x.id === d.type)!
  const total = d.type === 'khatmah' || d.type === 'wird' ? 604 : d.type === 'muraja' ? (d.to - d.from + 1) * 20 : SURAHS.slice(d.from - 1, d.to).reduce((a, s) => a + s.ayat, 0)
  const est = estimate(total, d.perDay, d.days)
  const steps = ['النوع', 'الهدف', 'الوتيرة', 'الأيام', 'المراجعة']
  const week: WeekDay[] = DAYS.map((day, i) => ({ day, short: DAYS_SHORT[i], date: toAr(14 + i), today: i === 2, done: false, items: d.days.includes(i) ? [{ tone: t.tone, label: t.ar.replace('خطة ', ''), detail: `${toAr(d.perDay)} ${t.unit}` }] : [] }))
  const save = () => {
    set((s) => ({ ...s, extraPlans: [{ id: 'n' + Date.now(), type: d.type, title: d.type === 'khatmah' ? 'ختمة جديدة' : `${t.ar}: ${d.target}`, perDay: d.perDay, days: d.days, ends: est.greg }, ...s.extraPlans], draft: { ...s.draft, step: 0 } }))
    tab('plans')
    toast('أُنشئت الخطة وأُضيفت إلى جدولك')
  }
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-3">
        <IconBtn n="x" label="إغلاق" onClick={back} />
        <div className="flex-1 text-[15px] font-semibold text-(--ink)">خطة جديدة</div>
        <span className="text-[12px] text-(--muted)">{steps[d.step]}</span>
      </div>
      <div className="flex gap-1.5 px-4 pt-3">{steps.map((_, i) => <button key={i} onClick={() => up({ step: i })} className={`h-1.5 flex-1 rounded-full ${i <= d.step ? 'bg-(--accent)' : 'bg-(--line)'}`} aria-label={steps[i]} />)}</div>
      <div className={`flex-1 pt-5 ${wrap(desktop)} ${desktop ? '!max-w-[720px]' : ''}`}>
        {d.step === 0 && (
          <>
            <Title size="lg" sub="كل نوع له منطق مختلف في الجدولة.">ما نوع الخطة؟</Title>
            <div className="mt-4 space-y-2">
              {PLAN_TYPES.map((p) => (
                <Card key={p.id} onClick={() => up({ type: p.id, perDay: p.id === 'khatmah' ? 20 : p.id === 'wird' ? 10 : p.id === 'muraja' ? 4 : 5, step: 1 })} className={d.type === p.id ? '!ring-2 !ring-(--accent)' : ''}>
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full" style={tone(p.tone)}><I n={p.icon} s={19} /></span><div className="flex-1"><div className="font-semibold text-(--ink)">{p.ar}</div><div className="text-[12px] text-(--muted)">{p.desc}</div></div><I n="chevron" s={18} className="rotate-180 text-(--muted)" /></div>
                </Card>
              ))}
            </div>
          </>
        )}
        {d.step === 1 && (
          <>
            <Title size="lg" sub={t.desc}>{d.type === 'khatmah' ? 'ختمة كاملة' : d.type === 'muraja' ? 'ماذا تراجع؟' : d.type === 'wird' ? 'من أين تقرأ؟' : 'ماذا تريد أن تحفظ؟'}</Title>
            {d.type === 'khatmah' ? (
              <Card className="mt-4"><div className="text-[14px] text-(--ink)">من الفاتحة إلى الناس · ٦٠٤ صفحات · ٣٠ جزءًا</div><div className="mt-3 flex flex-wrap gap-2">{['ختمة عادية', 'ختمة رمضان', 'ختمة تدبّر'].map((x, i) => <Chip key={x} active={i === 0}>{x}</Chip>)}</div></Card>
            ) : d.type === 'muraja' ? (
              <div className="mt-4 grid grid-cols-5 gap-2">{Array.from({ length: 30 }, (_, i) => 30 - i).map((j) => { const on = j >= d.from && j <= d.to; return <Chip key={j} active={on} onClick={() => up(j < d.from ? { from: j } : { to: j, from: Math.min(d.from, j) })} className="justify-center">{toAr(j)}</Chip> })}<p className="col-span-5 mt-1 text-[12px] text-(--muted)">اختر الأجزاء المحفوظة (الجزء {toAr(d.from)}–{toAr(d.to)})</p></div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[['من سورة', 'from'], ['إلى سورة', 'to']].map(([l, key]) => (
                  <label key={key} className="block"><span className="text-[12px] text-(--muted)">{l}</span>
                    <select value={d[key as 'from' | 'to']} onChange={(e) => { const v = Number(e.target.value); up(key === 'from' ? { from: v, to: Math.max(v, d.to), target: surah(v).ar } : { to: Math.max(v, d.from) }) }} className="mt-1 h-12 w-full rounded-[12px] border border-(--line) bg-(--surface) px-3 text-[14px] text-(--ink)">
                      {SURAHS.map((s) => <option key={s.n} value={s.n}>{toAr(s.n)}. {s.ar}</option>)}
                    </select>
                  </label>
                ))}
                <div className="col-span-2 flex flex-wrap gap-2">{[['جزء عمّ', 78, 114], ['جزء تبارك', 67, 77], ['الكهف', 18, 18], ['البقرة', 2, 2]].map(([l, f, to]) => <Chip key={l as string} active={d.from === f && d.to === to} onClick={() => up({ from: f as number, to: to as number, target: l as string })}>{l}</Chip>)}</div>
              </div>
            )}
            <Card className="mt-4"><div className="flex justify-between text-[13px]"><span className="text-(--muted)">حجم الهدف</span><span className="font-semibold text-(--ink)">{toAr(total)} {d.type === 'khatmah' || d.type === 'wird' || d.type === 'muraja' ? 'صفحة' : 'آية'}</span></div></Card>
          </>
        )}
        {d.step === 2 && (
          <>
            <Title size="lg" sub="حدّد الورد اليومي، أو حدّد موعد الانتهاء ونحسب لك الورد.">الوتيرة اليومية</Title>
            <div className="mt-4 flex gap-1 rounded-full bg-(--surface-2) p-1 text-[13px]">{['حسب الورد', 'حسب المدة'].map((l, i) => <button key={l} onClick={() => setByDate(i === 1)} className={`flex-1 rounded-full py-2 font-semibold ${byDate === (i === 1) ? 'bg-(--surface) text-(--ink) shadow-sm' : 'text-(--muted)'}`}>{l}</button>)}</div>
            {byDate ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[[30, 'شهر'], [60, 'شهران'], [90, '٣ أشهر'], [180, '٦ أشهر']].map(([days, l]) => { const pd = Math.max(1, Math.ceil(total / ((days as number) * (d.days.length / 7)))); return <Card key={l as string} onClick={() => up({ perDay: pd })} className={d.perDay === pd ? '!ring-2 !ring-(--accent)' : ''}><div className="font-semibold text-(--ink)">{l}</div><div className="text-[12px] text-(--muted)">≈ {toAr(pd)} {t.unit} يوميًا</div></Card> })}
              </div>
            ) : (
              <Card className="mt-4"><Stepper value={d.perDay} onChange={(v) => up({ perDay: v })} unit={`${t.unit} في كل يوم دراسة`} max={60} /><div className="mt-4 flex justify-center gap-2">{(d.type === 'khatmah' ? [10, 20, 40] : [3, 5, 10]).map((v) => <Chip key={v} active={d.perDay === v} onClick={() => up({ perDay: v })}>{toAr(v)}</Chip>)}</div></Card>
            )}
            <p className="mt-3 text-center text-[12px] text-(--muted)">≈ {toAr(Math.max(5, Math.round(d.perDay * (d.type === 'khatmah' || d.type === 'wird' ? 2 : 3))))} دقيقة يوميًا</p>
          </>
        )}
        {d.step === 3 && (
          <>
            <Title size="lg" sub="الأيام غير المختارة تبقى للراحة أو للمراجعة الحرة.">أيام الدراسة</Title>
            <div className="mt-4 grid grid-cols-7 gap-1.5">{DAYS.map((day, i) => { const on = d.days.includes(i); return <button key={i} onClick={() => up({ days: on ? d.days.filter((x) => x !== i) : [...d.days, i].sort() })} className={`flex flex-col items-center gap-1 rounded-[14px] border py-3 text-[11px] ${on ? 'border-(--accent) bg-(--accent) text-(--accent-ink)' : 'border-(--line) bg-(--surface) text-(--muted)'}`}><span className="text-[15px] font-bold">{DAYS_SHORT[i]}</span>{day.slice(0, 5)}</button> })}</div>
            <div className="mt-3 flex flex-wrap gap-2">{[['كل يوم', [0, 1, 2, 3, 4, 5, 6]], ['أيام الأسبوع', [0, 1, 2, 3, 4]], ['عطلة نهاية الأسبوع', [5, 6]]].map(([l, ds]) => <Chip key={l as string} onClick={() => up({ days: ds as number[] })}>{l}</Chip>)}</div>
            <Card className="mt-4"><div className="flex items-center justify-between"><span className="text-[13px] text-(--ink)">وقت التذكير</span><span className="text-[13px] font-semibold text-(--accent)">بعد الفجر</span></div></Card>
          </>
        )}
        {d.step === 4 && (
          <>
            <Title size="lg" sub="راجع الجدول قبل الحفظ.">{d.type === 'khatmah' ? 'ختمة جديدة' : `${t.ar}: ${d.target}`}</Title>
            <Card className="mt-4">
              <div className="text-[12px] text-(--muted)">تاريخ الإنجاز المتوقع</div>
              <div className="mt-1 font-(family-name:--font-display) text-[26px] font-bold text-(--accent)">{est.greg}</div>
              {est.hijri && <div className="text-[12px] text-(--muted)">{est.hijri}</div>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[[toAr(d.perDay), `${t.unit}/يوم`], [toAr(d.days.length), 'أيام/أسبوع'], [toAr(est.weeks), 'أسبوعًا']].map(([v, l]) => <div key={l} className="rounded-[12px] bg-(--surface-2) py-2"><div className="text-[18px] font-bold text-(--ink)">{v}</div><div className="text-[11px] text-(--muted)">{l}</div></div>)}
              </div>
            </Card>
            <Section title="معاينة الأسبوع الأول"><WeekView week={week} /></Section>
          </>
        )}
      </div>
      <div className={`sticky bottom-0 flex gap-2 border-t border-(--line) bg-(--bg) p-4 ${desktop ? 'justify-center' : ''}`}>
        {d.step > 0 && <Btn kind="soft" onClick={() => up({ step: d.step - 1 })}>السابق</Btn>}
        <Btn full={!desktop} disabled={d.step === 3 && d.days.length === 0} onClick={() => (d.step < 4 ? up({ step: d.step + 1 }) : save())}>{d.step < 4 ? 'التالي' : 'احفظ الخطة'}</Btn>
      </div>
    </div>
  )
}

// 9. Revision schedule & session ---------------------------------------------
export function Revision() {
  const { go, desktop, theme } = useP()
  const today = REVISION.filter((r) => r.due === 'اليوم')
  const strengthColor = (s: number) => (s > 0.75 ? 'var(--good)' : s > 0.5 ? 'var(--warn)' : 'var(--bad)')
  return (
    <div>
      <TopBar title="المراجعة" sub="تثبيت ما حفظت بجدول متباعد" noBack />
      <div className={wrap(desktop)}>
        <Card className="mt-2">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[12px] text-(--muted)">مراجعة اليوم</div>
              <div className="font-(family-name:--font-display) text-[24px] font-bold text-(--ink)">{toAr(today.length)} مقاطع · ١٢ دقيقة</div>
              <div className="mt-1 text-[12px] text-(--muted)">الأضعف أولًا: عبس</div>
            </div>
            <Btn onClick={() => go('revision-session')}><I n="play" s={16} fill />ابدأ</Btn>
          </div>
        </Card>
        <div className={`${desktop ? 'grid grid-cols-2 gap-6' : ''}`}>
          <Section title="مستحقة اليوم">
            <div className={theme.card === 'rule' ? '' : 'space-y-2'}>
              {today.map((r) => (
                <Card key={r.n} onClick={() => go('revision-session')}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><div className="font-semibold text-(--ink)">{r.part}</div><div className="mt-1.5 flex items-center gap-2"><Bar v={r.strength} tone={strengthColor(r.strength)} className="max-w-[140px]" /><span className="text-[11px] text-(--muted)">قوة الحفظ {toAr(Math.round(r.strength * 100))}٪</span></div></div>
                    <I n="chevron" s={18} className="rotate-180 text-(--muted)" />
                  </div>
                </Card>
              ))}
            </div>
          </Section>
          <Section title="القادم">
            <div className={theme.card === 'rule' ? '' : 'space-y-2'}>
              {REVISION.filter((r) => r.due !== 'اليوم').map((r) => (
                <Card key={r.n}><div className="flex items-center gap-3"><span className="w-16 text-[12px] font-semibold text-(--accent)">{r.due}</span><span className="flex-1 text-[14px] text-(--ink)">{r.part}</span><span className="size-2.5 rounded-full" style={{ background: strengthColor(r.strength) }} /></div></Card>
              ))}
            </div>
          </Section>
        </div>
        <Section title="طريقة الجدولة">
          <div className="flex flex-wrap gap-2">{['الأضعف أولًا', 'القريب والبعيد', 'جزء كل أسبوع', 'حسب الخطة'].map((x, i) => <Chip key={x} active={i === 0}>{x}</Chip>)}</div>
        </Section>
      </div>
    </div>
  )
}

export function RevisionSession() {
  const { back, desktop, toast } = useP()
  const deck = SHORT.slice(0, 2).flatMap((s) => s.ayat.slice(0, 3).map((a) => ({ s: s.name, n: a.aya, text: a.text, words: a.words })))
  const [k, setK] = useState(0)
  const [shown, setShown] = useState(false)
  const [grades, setGrades] = useState<number[]>([])
  if (k >= deck.length)
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Title size="lg" sub="المقاطع التي تردّدت فيها ستعود غدًا، والمتقنة بعد أسبوع.">انتهت جلسة المراجعة</Title>
        <div className="grid w-full max-w-sm grid-cols-3 gap-2">{[['أتقنت', 0, 'var(--good)'], ['تردّدت', 1, 'var(--warn)'], ['نسيت', 2, 'var(--bad)']].map(([l, g, c]) => <Card key={l as string} className="text-center"><div className="text-[24px] font-bold" style={{ color: c as string }}>{toAr(grades.filter((x) => x === g).length)}</div><div className="text-[12px] text-(--muted)">{l}</div></Card>)}</div>
        <Btn onClick={back}>العودة إلى الجدول</Btn>
      </div>
    )
  const c = deck[k]
  const grade = (g: number) => { setGrades([...grades, g]); setShown(false); setK(k + 1) }
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-3"><IconBtn n="x" label="إغلاق" onClick={back} /><div className="flex-1"><div className="text-[13px] font-semibold text-(--ink)">مراجعة · {c.s}</div><Bar v={k / deck.length} className="mt-1.5" /></div><span className="text-[12px] text-(--muted)">{toAr(k + 1)}/{toAr(deck.length)}</span></div>
      <div className={`flex flex-1 flex-col ${wrap(desktop)}`}>
        <p className="mt-6 text-center text-[13px] text-(--muted)">{shown ? 'قارن بما قرأته' : 'أكمل الآية من حفظك، ثم أظهرها'}</p>
        <Card className="mt-4 flex flex-1 items-center justify-center text-center">
          <p className={`leading-[2.4] text-(--ink) ${desktop ? 'text-[38px]' : 'text-[28px]'}`}>
            {c.words.map((w, i) => (i < 2 || shown ? <Q key={i} className="mx-1">{w}</Q> : <span key={i} className="mx-1 inline-block h-6 w-12 translate-y-1 rounded-[6px] bg-(--surface-2)" />))}
            <AyahNo n={c.n} className="text-[22px]" />
          </p>
        </Card>
        <div className="py-6">
          {!shown ? (
            <div className="flex gap-2"><Btn kind="soft" onClick={() => toast('يُسجَّل صوتك للمقارنة')}><I n="mic" s={17} />سمّع</Btn><Btn full onClick={() => setShown(true)}><I n="eye" s={17} />أظهر الآية</Btn></div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Btn kind="soft" onClick={() => grade(2)} className="!text-(--bad)">نسيت</Btn>
              <Btn kind="soft" onClick={() => grade(1)} className="!text-(--warn)">تردّدت</Btn>
              <Btn onClick={() => grade(0)}>أتقنت</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 10. Daily reading & Khatmah -------------------------------------------------
export function Khatmah() {
  const { go, desktop, theme } = useP()
  const done = 214
  return (
    <div>
      <TopBar title="الورد والختمة" sub="ختمة رمضان · بدأت ١ رمضان" />
      <div className={wrap(desktop)}>
        <div className="relative mt-2 overflow-hidden p-5 text-(--hero-ink)" style={{ background: 'var(--hero)', borderRadius: theme.card === 'block' || theme.card === 'rule' ? 0 : 24 }}>
          <div className="text-[12px] opacity-80">ثبّت همّتك حتى الختام</div>
          <div className="mt-1 font-(family-name:--font-display) text-[28px] font-bold leading-tight">١٠٫٧ من ٣٠ جزءًا</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${(done / 604) * 100}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] opacity-85"><span>{toAr(done)}/٦٠٤ صفحة</span><span>متبقٍ ١٩ يومًا</span></div>
        </div>
        <div className={desktop ? 'grid grid-cols-2 gap-6' : ''}>
          <Section title="ورد اليوم">
            <Card>
              <div className="flex items-center justify-between"><div><div className="text-[15px] font-semibold text-(--ink)">صفحة ٢١٥ ← ٢٣٤</div><div className="text-[12px] text-(--muted)">الأنفال ٤١ ← التوبة ٣٣ · ≈ ٤٠ دقيقة</div></div><Btn size="sm" onClick={() => go('reader', { n: 8 })}>اقرأ</Btn></div>
              <div className="mt-3 grid grid-cols-4 gap-2">{['بعد الفجر', 'الظهر', 'العصر', 'العشاء'].map((p, i) => <div key={p} className={`rounded-[12px] py-2 text-center text-[11px] ${i === 0 ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface-2) text-(--muted)'}`}>{p}<div className="font-bold">{toAr(5)} ص</div></div>)}</div>
            </Card>
          </Section>
          <Section title="المواظبة" action={<span className="rounded-full bg-(--surface-2) px-2 py-0.5 text-[12px] font-semibold text-(--warn)">{toAr(USER.streak)} يومًا</span>}>
            <div className="flex justify-between gap-1.5">{DAYS_SHORT.map((d, i) => <div key={i} className={`flex flex-1 flex-col items-center gap-1.5 rounded-[14px] py-2.5 ${i < 3 ? 'bg-(--surface)' : 'bg-(--surface-2)'}`}><span className={`grid size-6 place-items-center rounded-full ${i < 3 ? 'bg-(--good) text-white' : 'border border-(--line)'}`}>{i < 3 && <I n="check" s={12} />}</span><span className="text-[11px] text-(--muted)">{d}</span></div>)}</div>
          </Section>
        </div>
        <Section title="الأجزاء">
          <div className={`grid gap-1.5 ${desktop ? 'grid-cols-15' : 'grid-cols-10'}`} style={desktop ? { gridTemplateColumns: 'repeat(15,minmax(0,1fr))' } : undefined}>
            {Array.from({ length: 30 }, (_, i) => <span key={i} className={`grid aspect-square place-items-center text-[11px] font-semibold ${theme.card === 'block' ? '' : 'rounded-[8px]'} ${i < 10 ? 'bg-(--accent) text-(--accent-ink)' : i === 10 ? 'bg-(--accent)/40 text-(--ink)' : 'bg-(--surface-2) text-(--muted)'}`}>{toAr(i + 1)}</span>)}
          </div>
        </Section>
        <Section title="مدة الختمة">
          <div className="flex flex-wrap gap-2">{['٧ أيام', '١٥ يومًا', '٣٠ يومًا', '٦٠ يومًا', 'مخصّصة'].map((x, i) => <Chip key={x} active={i === 2}>{x}</Chip>)}</div>
        </Section>
      </div>
    </div>
  )
}

// 11. Recitation & Tasmee' ----------------------------------------------------
export function Recite() {
  const { desktop, st, flag, theme, toast } = useP()
  const [phase, setPhase] = useState<'idle' | 'rec' | 'analyze' | 'result'>('idle')
  const [secs, setSecs] = useState(0)
  const [coach, setCoach] = useState(st.flags.coachDone ? -1 : 0)
  const [passage, setPassage] = useState('الفاتحة ١–٤')
  useEffect(() => {
    if (phase === 'rec') {
      const t = setInterval(() => setSecs((x) => x + 1), 1000)
      return () => clearInterval(t)
    }
    if (phase === 'analyze') {
      const t = setTimeout(() => setPhase('result'), 1400)
      return () => clearTimeout(t)
    }
  }, [phase])
  const col = (s: number) => (s === 0 ? 'var(--good)' : s === 1 ? 'var(--warn)' : 'var(--bad)')
  const coachSteps = [['الخطوة ١', 'اضغط للتسجيل', 'اقرأ المقطع بصوتك كما تقرأه عادةً.'], ['الخطوة ٢', 'اقرأ بهدوء', 'يحلّل النموذج تلاوتك على جهازك، دون رفع الصوت إلى أي خادم.'], ['الخطوة ٣', 'ملاحظات فورية', 'تظهر الكلمات بالأخضر والأصفر والأحمر مع تلميح لكل ملاحظة.']]
  return (
    <div className="relative flex min-h-full flex-col">
      <TopBar title="التسميع" sub="ملاحظات على النطق والتجويد" actions={<IconBtn n="info" label="كيف يعمل" onClick={() => setCoach(0)} />} />
      <div className={`flex flex-1 flex-col ${wrap(desktop)}`}>
        <div className="mt-1 flex gap-2 overflow-x-auto no-scrollbar">{['الفاتحة ١–٤', 'الإخلاص', 'الفلق', 'الملك ١–١٥'].map((p) => <Chip key={p} active={passage === p} onClick={() => { setPassage(p); setPhase('idle') }}>{p}</Chip>)}</div>
        <Card className="mt-4 flex-1">
          {phase === 'result' && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1"><div className="text-[12px] text-(--muted)">النتيجة</div><div className="font-(family-name:--font-display) text-[30px] font-bold text-(--ink)">٨٨٪</div></div>
              <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">{[['صحيح', 0], ['قريب', 1], ['خطأ', 2]].map(([l, s]) => <span key={l} className="flex items-center gap-1 rounded-full bg-(--surface-2) px-2.5 py-1 text-(--ink)"><span className="size-2 rounded-full" style={{ background: col(s as number) }} />{l}</span>)}</div>
            </div>
          )}
          <div className="text-center leading-[2.3]">
            {RESULT.map((a) => (
              <span key={a.aya} className={`${desktop ? 'text-[32px]' : 'text-[25px]'}`}>
                {a.words.map((w, i) => <Q key={i} className="mx-1 transition-colors" ><span style={{ color: phase === 'result' ? col(w.s) : 'var(--ink)' }}>{w.w}</span></Q>)}
                <AyahNo n={a.aya} className="text-[20px]" />{' '}
              </span>
            ))}
          </div>
          {phase === 'result' && (
            <div className="mt-4 space-y-2">
              {RESULT_NOTES.map((n) => <div key={n.word} className="flex items-center gap-3 rounded-[14px] bg-(--surface-2) px-3 py-2.5"><span className="size-2.5 rounded-full" style={{ background: col(n.level) }} /><Q className="text-[19px] leading-none text-(--ink)">{n.word}</Q><span className="flex-1 text-[12px] text-(--muted)">{n.note}</span><button aria-label="استمع للصحيح" onClick={() => toast('تشغيل النطق الصحيح')} className="text-(--accent)"><I n="volume" s={18} /></button></div>)}
            </div>
          )}
        </Card>
        <div className="flex flex-col items-center gap-3 py-6">
          {phase === 'rec' && <div className="flex h-8 items-center gap-1">{Array.from({ length: 24 }, (_, i) => <span key={i} className="w-1 animate-pulse rounded-full bg-(--accent)" style={{ height: 6 + ((i * 7 + secs * 5) % 24), animationDelay: `${i * 40}ms` }} />)}</div>}
          {phase === 'analyze' && <div className="w-48"><Bar v={0.7} /><p className="mt-2 text-center text-[12px] text-(--muted)">يحلّل على جهازك…</p></div>}
          <div className="flex items-center gap-5">
            {phase === 'rec' && <Btn kind="soft" size="sm" onClick={() => { setPhase('idle'); setSecs(0) }}><I n="x" s={15} />إلغاء</Btn>}
            <button onClick={() => (phase === 'rec' ? setPhase('analyze') : (setSecs(0), setPhase('rec')))} aria-label={phase === 'rec' ? 'إيقاف' : 'سجّل'} className={`relative grid size-20 place-items-center rounded-full text-white transition ${phase === 'rec' ? 'bg-(--bad)' : 'bg-(--mic, var(--accent))'}`} style={{ boxShadow: theme.dark ? '0 0 0 10px rgba(255,255,255,.04), 0 0 50px -6px var(--mic, var(--accent))' : '0 10px 30px -10px var(--mic, var(--accent))' }}>
              <I n={phase === 'rec' ? 'stop' : 'mic'} s={30} fill={phase === 'rec'} />
            </button>
            {phase === 'rec' && <span className="w-12 text-[13px] font-semibold text-(--ink)">٠٠:{toAr(String(secs).padStart(2, '0'))}</span>}
          </div>
          <p className="text-[12px] text-(--muted)">{phase === 'rec' ? 'اضغط للإيقاف والتحليل' : phase === 'result' ? 'سجّل مرة أخرى للتحسين' : 'اضغط لتبدأ التسجيل'}</p>
          <p className="text-[10.5px] text-(--muted) opacity-70">تقنية Muaalem · معاينة تصميمية ببيانات تجريبية</p>
        </div>
      </div>
      {coach >= 0 && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60 p-4" onClick={() => { setCoach(-1); flag('coachDone', true) }}>
          <div onClick={(e) => e.stopPropagation()} className={`mx-auto mb-28 w-full max-w-md overflow-hidden ${theme.dark ? 'bg-[#1c1d24] text-white' : 'bg-(--surface) text-(--ink)'} ${theme.card === 'block' ? 'border-2 border-(--ink)' : 'rounded-[24px]'}`}>
            <div className="flex items-start gap-4 p-5">
              <div className="flex-1">
                <span className="inline-block rounded-full bg-gradient-to-l from-(--accent) to-(--mic,var(--accent)) px-3 py-1 text-[12px] font-bold text-white">{coachSteps[coach][0]}</span>
                <div className="mt-3 text-[22px] font-bold leading-tight">{coachSteps[coach][1]}</div>
                <p className="mt-2 text-[13px] opacity-70">{coachSteps[coach][2]}</p>
              </div>
              <button aria-label="إغلاق" onClick={() => { setCoach(-1); flag('coachDone', true) }} className="grid size-8 place-items-center rounded-full bg-black/10"><I n="x" s={16} /></button>
            </div>
            <div className="flex items-center justify-between border-t border-black/10 px-5 py-3">
              <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full ${i === coach ? 'w-5 bg-(--accent)' : 'w-1.5 bg-current opacity-25'}`} />)}</div>
              <Btn size="sm" onClick={() => (coach < 2 ? setCoach(coach + 1) : (setCoach(-1), flag('coachDone', true)))}>{coach < 2 ? 'التالي' : 'جرّب الآن'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 12. Progress & journey ------------------------------------------------------
export function Progress() {
  const { desktop, theme } = useP()
  const mins = [18, 25, 12, 30, 22, 0, 15]
  return (
    <div>
      <TopBar title="رحلتي" sub="التقدّم والإنجازات" noBack />
      <div className={wrap(desktop)}>
        {theme.progress !== 'numbers' && (
          <div className={`mt-2 grid gap-2 ${desktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {[['flame', toAr(USER.streak), 'يومًا متتاليًا'], ['sprout', toAr(USER.memorizedAyat), 'آية محفوظة'], ['book', '١٠٫٧', 'جزءًا في الختمة'], ['target', '٩٣٪', 'دقة التسميع']].map(([ic, v, l]) => (
              <Card key={l}><I n={ic} className="text-(--accent)" /><div className="mt-2 font-(family-name:--font-display) text-[24px] font-bold text-(--ink)">{v}</div><div className="text-[12px] text-(--muted)">{l}</div></Card>
            ))}
          </div>
        )}
        <Section title={theme.progress === 'garden' ? 'حديقة جزء عمّ' : theme.progress === 'ledger' ? 'سجلّ الأجزاء' : theme.progress === 'heat' ? 'أيام المواظبة' : 'التقدّم'}><ProgressViz /></Section>
        <div className={desktop ? 'grid grid-cols-2 gap-6' : ''}>
          <Section title="دقائق هذا الأسبوع">
            <Card>
              <div className="flex h-28 items-end gap-2">{mins.map((m, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1.5"><div className={`w-full ${theme.card === 'block' ? '' : 'rounded-[6px]'}`} style={{ height: `${(m / 30) * 100}%`, minHeight: 3, background: i === 2 ? 'var(--accent)' : 'var(--surface-2)' }} /><span className="text-[10px] text-(--muted)">{DAYS_SHORT[i]}</span></div>)}</div>
            </Card>
          </Section>
          <Section title="محطات الرحلة">
            <div className="relative ps-6">
              <div className="absolute inset-y-2 start-[7px] w-0.5 bg-(--line)" />
              {JOURNEY.map((j) => (
                <div key={j.title} className="relative pb-4">
                  <span className={`absolute -start-6 top-0.5 size-4 rounded-full border-2 ${j.done ? 'border-(--accent) bg-(--accent)' : 'border-(--line) bg-(--bg)'}`} />
                  <div className={`text-[14px] font-semibold ${j.done ? 'text-(--ink)' : 'text-(--muted)'}`}>{j.title}</div>
                  <div className="text-[12px] text-(--muted)">{j.when}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// 13. Settings & profile switching -------------------------------------------
export function Settings() {
  const { sheet, desktop, st, flag, go } = useP()
  const tg = (k: string, def = false) => ({ on: (st.flags[k] as boolean | undefined) ?? def, onClick: () => flag(k, !((st.flags[k] as boolean | undefined) ?? def)) })
  const Row = ({ ic, l, children, onClick }: { ic: string; l: string; children?: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick} className={`flex items-center gap-3 border-b border-(--line) py-3 last:border-0 ${onClick ? 'cursor-pointer' : ''}`}><I n={ic} s={19} className="text-(--muted)" /><span className="flex-1 text-[14px] text-(--ink)">{l}</span>{children}</div>
  )
  return (
    <div>
      <TopBar title="الإعدادات" noBack />
      <div className={`${wrap(desktop)} ${desktop ? '!max-w-[720px]' : ''}`}>
        <Card className="mt-2" onClick={() => sheet('profiles')}>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-(--accent) text-[18px] font-bold text-(--accent-ink)">أ</span>
            <div className="flex-1"><div className="text-[16px] font-semibold text-(--ink)">{USER.name}</div><div className="text-[12px] text-(--muted)">ملف بالغ · ٣ ملفات على هذا الجهاز</div></div>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-(--accent)"><I n="swap" s={16} />تبديل</span>
          </div>
        </Card>
        <Section title="القراءة والصوت"><Card pad={false} className="px-4"><Row ic="volume" l="القارئ" onClick={() => sheet('reciter')}><span className="text-[13px] text-(--muted)">{String(st.flags.reciter ?? RECITERS[0])}</span></Row><Row ic="type" l="حجم خط المصحف" onClick={() => sheet('display')}><span className="text-[13px] text-(--muted)">كبير</span></Row><Row ic="note" l="إظهار المعنى الميسّر"><Toggle {...tg('meaning', true)} /></Row><Row ic="repeat" l="تكرار الآية تلقائيًا"><Toggle {...tg('autorepeat')} /></Row></Card></Section>
        <Section title="التذكير"><Card pad={false} className="px-4"><Row ic="bell" l="تذكير الورد اليومي"><Toggle {...tg('remind', true)} /></Row><Row ic="repeat" l="تذكير المراجعة"><Toggle {...tg('remind2', true)} /></Row><Row ic="moon" l="الوضع الليلي"><Toggle {...tg('night')} /></Row></Card></Section>
        <Section title="العائلة والحلقة"><Card pad={false} className="px-4"><Row ic="users" l="لوحة وليّ الأمر / المعلّم" onClick={() => go('guide')}><I n="chevron" s={17} className="rotate-180 text-(--muted)" /></Row><Row ic="lock" l="قفل وضع الأطفال"><Toggle {...tg('kidlock', true)} /></Row></Card></Section>
        <Card className="mt-6"><div className="flex items-start gap-3"><I n="shield" className="text-(--good)" /><p className="text-[12.5px] leading-relaxed text-(--muted)"><b className="text-(--ink)">مجاني بالكامل، بلا إعلانات ولا اشتراكات.</b> بياناتك وتسجيلاتك تبقى على هذا الجهاز.</p></div></Card>
      </div>
    </div>
  )
}

// Parent / teacher -------------------------------------------------------------
export function Guide() {
  const { go, desktop, sheet } = useP()
  return (
    <div>
      <TopBar title="متابعة الأطفال" sub="وليّ الأمر / المعلّم" actions={<IconBtn n="plus" label="تكليف" onClick={() => sheet('assign', { kid: 'مريم' })} />} />
      <div className={wrap(desktop)}>
        <div className={`mt-2 grid gap-3 ${desktop ? 'grid-cols-2' : ''}`}>
          {KIDS.map((k) => (
            <Card key={k.id} onClick={() => go('guide-child', { id: k.id })}>
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-(--surface-2) text-[18px] font-bold text-(--accent)">{k.name[0]}</span>
                <div className="flex-1"><div className="text-[15px] font-semibold text-(--ink)">{k.name} · {toAr(k.age)} سنوات</div><div className="text-[12px] text-(--muted)">اليوم: {k.today} · {toAr(k.streak)} أيام متتالية</div></div>
                <span className="text-[13px] font-bold text-(--warn)">★ {toAr(k.stars)}</span>
              </div>
              <div className="mt-3 flex h-12 items-end gap-1.5">{k.minutes.map((m, i) => <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${(m / 20) * 100}%`, minHeight: 3, background: 'var(--accent)', opacity: m ? 1 : 0.2 }} />)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-(--muted)"><div><b className="block text-[15px] text-(--ink)">{toAr(k.letters)}/٢٨</b>حرفًا</div><div><b className="block text-[15px] text-(--ink)">{toAr(k.surahs)}</b>سور</div><div><b className="block text-[15px] text-(--ink)">{toAr(k.minutes.reduce((a, b) => a + b, 0))}</b>دقيقة/أسبوع</div></div>
            </Card>
          ))}
        </div>
        <Section title="تسجيلات بانتظار الاستماع">
          <div className="space-y-2">{[['مريم', 'سورة الناس', 'أمس'], ['يوسف', 'الفلق ١–٥', 'اليوم']].map(([n, p, w]) => <Card key={p}><div className="flex items-center gap-3"><button className="grid size-10 place-items-center rounded-full bg-(--accent) text-(--accent-ink)" aria-label="استماع"><I n="play" s={15} fill /></button><div className="flex-1"><div className="text-[14px] font-semibold text-(--ink)">{n} · {p}</div><div className="text-[12px] text-(--muted)">{w} · ٠:٤٢</div></div><Btn size="sm" kind="soft" onClick={() => sheet('praise', { kid: n })}>شجّع</Btn></div></Card>)}</div>
        </Section>
        <Section title="التكليفات"><div className="space-y-2">{[['مريم', 'حرف الخاء + قراءة ٣ كلمات', 'حتى الخميس'], ['يوسف', 'حفظ الفلق مع التكرار', 'حتى السبت']].map(([n, t, d]) => <Card key={t}><div className="flex items-center gap-3"><I n="note" className="text-(--accent)" /><div className="flex-1"><div className="text-[14px] text-(--ink)">{t}</div><div className="text-[12px] text-(--muted)">{n} · {d}</div></div></div></Card>)}</div></Section>
      </div>
    </div>
  )
}

export function GuideChild() {
  const { cur, desktop, sheet, setMode } = useP()
  const k = KIDS.find((x) => x.id === cur.p?.id) ?? KIDS[0]
  return (
    <div>
      <TopBar title={k.name} sub={`${toAr(k.age)} سنوات · مسار الأطفال`} actions={<IconBtn n="star" label="افتح كطفل" onClick={() => setMode('kids', 'k-home')} />} />
      <div className={wrap(desktop)}>
        <div className="mt-2 grid grid-cols-3 gap-2">{[[toAr(k.stars), 'نجمة'], [toAr(k.streak), 'أيام متتالية'], [toAr(k.surahs), 'سور محفوظة']].map(([v, l]) => <Card key={l} className="text-center"><div className="text-[22px] font-bold text-(--ink)">{v}</div><div className="text-[11px] text-(--muted)">{l}</div></Card>)}</div>
        <Section title="الحروف المتقنة"><div className="grid grid-cols-7 gap-1.5">{'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('').map((ch, i) => <span key={ch} className={`grid aspect-square place-items-center rounded-[10px] font-(family-name:--font-quran) text-[20px] ${i < k.letters ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface-2) text-(--muted)'}`}>{ch}</span>)}</div></Section>
        <Section title="يحتاج إلى دعم"><Card><div className="text-[13px] leading-relaxed text-(--ink)">يخلط بين <b>ح</b> و<b>خ</b> أحيانًا، والتنوين يحتاج إلى تدريب إضافي.</div></Card></Section>
        <div className="mt-6 flex gap-2"><Btn full onClick={() => sheet('assign', { kid: k.name })}><I n="plus" s={16} />كلّف بنشاط</Btn><Btn kind="soft" onClick={() => sheet('praise', { kid: k.name })}><I n="heart" s={16} />شجّع</Btn></div>
      </div>
    </div>
  )
}

// Shared sheet bodies ---------------------------------------------------------
export function SheetBody({ id, p }: { id: string; p?: Record<string, unknown> }) {
  const { go, close, sheet, toast, flag, st, theme } = useP()
  const tone = useTone()
  if (id === 'ayah') {
    const n = Number(p?.n ?? 1)
    const a = Number(p?.a ?? 1)
    const text = String(p?.text ?? FATIHA.ayat[0].text)
    const acts: [string, string, () => void][] = [
      ['play', 'استماع', () => { flag('playing', true); close() }],
      ['sprout', 'احفظ', () => go('memorize')],
      ['repeat', 'راجع', () => go('revision-session')],
      ['mic', 'سمّع', () => go('recite')],
      ['bookmark', 'علامة', () => { toast('حُفظت العلامة'); close() }],
      ['note', 'التفسير', () => sheet('tafsir', p)],
      ['share', 'مشاركة', () => { toast('نُسخ رابط الآية'); close() }],
      ['layers', 'إلى خطة', () => go('plan-new')],
    ]
    return (
      <div>
        <div className="font-(family-name:--font-display) text-[22px] font-bold text-(--ink)">{surah(n).ar}: {toAr(a)}</div>
        <Card className="mt-3"><Q className="block text-center text-[24px] text-(--ink)">{text}</Q>{n === 1 && <p className="mt-2 rounded-[12px] bg-(--surface-2) p-2.5 text-[12px] text-(--muted)">{FATIHA_MEANING[a - 1]}</p>}</Card>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {acts.map(([ic, l, f]) => (
            <button key={l} onClick={f} className="flex flex-col items-center gap-1.5">
              <span className={`grid size-14 place-items-center text-(--ink) ${theme.card === 'block' ? 'border-2 border-(--ink)' : theme.card === 'rule' ? 'border border-(--line)' : 'rounded-[18px] bg-(--surface-2)'}`}><I n={ic} /></span>
              <span className="text-[11.5px] text-(--ink)">{l}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (id === 'tafsir')
    return (
      <div>
        <div className="text-[18px] font-bold text-(--ink)">المعنى والتفسير</div>
        <p className="mt-3 text-[14px] leading-loose text-(--ink)">{Number(p?.n) === 1 ? FATIHA_MEANING[Number(p?.a ?? 1) - 1] : 'يُعرض هنا تفسير من مصدر موثّق ومرخّص عند ربط التصميم بالتطبيق.'}</p>
        <div className="mt-3 flex gap-2">{['الميسّر', 'السعدي', 'ابن كثير'].map((x, i) => <Chip key={x} active={i === 0}>{x}</Chip>)}</div>
        <p className="mt-3 text-[11px] text-(--muted)">نص معاينة لأغراض التصميم.</p>
      </div>
    )
  if (id === 'reciter')
    return (
      <div>
        <div className="mb-3 text-[18px] font-bold text-(--ink)">اختر القارئ</div>
        {RECITERS.map((r) => <button key={r} onClick={() => { flag('reciter', r); close() }} className="flex w-full items-center justify-between border-b border-(--line) py-3 text-[14px] text-(--ink) last:border-0">{r}{(st.flags.reciter ?? RECITERS[0]) === r && <I n="check" className="text-(--accent)" />}</button>)}
      </div>
    )
  if (id === 'display')
    return (
      <div>
        <div className="mb-3 text-[18px] font-bold text-(--ink)">إعدادات العرض</div>
        <div className="text-[12px] text-(--muted)">حجم الخط</div>
        <div className="mt-2 flex gap-2">{['صغير', 'متوسط', 'كبير', 'كبير جدًا'].map((x, i) => <Chip key={x} active={i === 2}>{x}</Chip>)}</div>
        <div className="mt-4 text-[12px] text-(--muted)">طريقة العرض</div>
        <div className="mt-2 flex gap-2">{['آية آية', 'صفحة المصحف', 'مع المعنى'].map((x, i) => <Chip key={x} active={i === 0}>{x}</Chip>)}</div>
      </div>
    )
  if (id === 'filter')
    return (
      <div>
        <div className="mb-3 text-[18px] font-bold text-(--ink)">ترتيب وتصفية</div>
        <div className="flex flex-wrap gap-2">{['ترتيب المصحف', 'الأقصر أولًا', 'مكية', 'مدنية', 'محفوظة', 'لم تُحفظ'].map((x, i) => <Chip key={x} active={i === 0}>{x}</Chip>)}</div>
        <Btn full className="mt-5" onClick={close}>تطبيق</Btn>
      </div>
    )
  if (id === 'assign')
    return (
      <div>
        <div className="text-[18px] font-bold text-(--ink)">تكليف {String(p?.kid ?? '')}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">{[['letters', 'حرف جديد', 'a'], ['book', 'تمرين قراءة', 'c'], ['ear', 'استماع لسورة', 'b'], ['sprout', 'حفظ مع التكرار', 'd']].map(([ic, l, t]) => <Card key={l}><span className="grid size-9 place-items-center rounded-full" style={tone(t)}><I n={ic} s={18} /></span><div className="mt-2 text-[13px] font-semibold text-(--ink)">{l}</div></Card>)}</div>
        <div className="mt-3 flex gap-2">{['اليوم', 'هذا الأسبوع'].map((x, i) => <Chip key={x} active={i === 1}>{x}</Chip>)}</div>
        <Btn full className="mt-4" onClick={() => { toast('أُرسل التكليف'); close() }}>أرسل التكليف</Btn>
      </div>
    )
  if (id === 'praise')
    return (
      <div>
        <div className="text-[18px] font-bold text-(--ink)">رسالة تشجيع لـ{String(p?.kid ?? '')}</div>
        <div className="mt-3 flex flex-wrap gap-2">{['أحسنت يا بطل!', 'صوتك جميل ما شاء الله', 'فخور بك', 'استمرّ هكذا'].map((x) => <Chip key={x} onClick={() => { toast('أُرسلت نجمة ورسالة'); close() }}>{x}</Chip>)}</div>
      </div>
    )
  return null
}

export { AGENDA }
