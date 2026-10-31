import { useEffect, useState } from 'react'
import { useP } from './proto'
import { Bar, Btn, Card, Chip, I, Q, Title, TopBar, useTone } from './kit'
import { BADGES, ENCOURAGE, GROUPS, HARAKAT, JOIN_WORDS, KID, LETTERS, READING_LESSONS, SHORT, forms, toAr } from './data'

const wrap = (desktop: boolean) => (desktop ? 'mx-auto w-full max-w-[960px] px-8 pb-16' : 'px-5 pb-10')
const TONES = ['a', 'b', 'c', 'd', 'e'] as const

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-(--surface) px-3 py-1.5 text-[14px] font-extrabold text-(--ink) ring-1 ring-(--line) ${className}`}>
      <I n="star" s={17} fill className="text-(--warn)" />
      {toAr(n)}
    </span>
  )
}

export function Makhraj({ group, className = '' }: { group: keyof typeof GROUPS; className?: string }) {
  const spot = { jawf: [38, 52], halq: [70, 60], lisan: [44, 60], shafatan: [16, 58] }[group]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label={GROUPS[group].ar}>
      <path d="M30 12c22-6 46 6 50 28 2 10 0 18-4 24v26H52V78c-8 2-16 0-22-4l-6-2c-4 0-6-3-5-6l1-4-4-2c-3-1-3-4-1-6l3-4-3-4c-2-3 0-6 3-8l4-4c0-14 2-20 8-22z" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1.5" />
      <path d="M22 56c10 2 22 2 34 6M24 62c8 0 18 0 26 2" stroke="var(--muted)" strokeWidth="1.4" fill="none" opacity=".6" />
      <path d="M58 46c6 4 10 10 12 22v22" stroke="var(--muted)" strokeWidth="1.4" fill="none" opacity=".6" />
      <circle cx={spot[0]} cy={spot[1]} r="9" fill="var(--accent)" opacity=".35" />
      <circle cx={spot[0]} cy={spot[1]} r="9" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
    </svg>
  )
}

function Big({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-(family-name:--font-quran) leading-none ${className}`}>{children}</span>
}

export function KLetters() {
  const { go, desktop, theme } = useP()
  const tone = useTone()
  return (
    <div>
      <TopBar title="الحروف وأصواتها" sub={`أتقنتِ ${toAr(KID.letters)} من ٢٨`} />
      <div className={wrap(desktop)}>
        <Bar v={KID.letters / 28} className="mt-1" />
        <div className={`mt-5 grid gap-3 ${desktop ? 'grid-cols-7' : 'grid-cols-4'}`}>
          {LETTERS.map((l, i) => {
            const done = i < KID.letters
            return (
              <button key={l.ch} onClick={() => go('k-letter', { i })} className={`relative flex aspect-square flex-col items-center justify-center transition active:scale-95 ${theme.card === 'mondrian' ? 'border-[3px] border-(--ink)' : theme.card === 'neon' ? 'rounded-[22px] ring-1 ring-white/10' : theme.card === 'story' ? 'rounded-[20px] border-2 border-dashed' : 'rounded-[22px] border-b-4 border-black/10'}`} style={tone(TONES[i % 5])}>
                <Big className="text-[38px]">{l.ch}</Big>
                <span className="mt-1 text-[10.5px] font-bold opacity-80">{l.name}</span>
                {done && <I n="star" s={14} fill className="absolute end-1.5 top-1.5 text-(--warn)" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function KLetter() {
  const { cur, go, sheet, desktop, st, set } = useP()
  const i = Number(cur.p?.i ?? 6)
  const l = LETTERS[i]
  const f = forms(l)
  const [play, setPlay] = useState(false)
  useEffect(() => {
    if (!play) return
    const t = setTimeout(() => setPlay(false), 900)
    return () => clearTimeout(t)
  }, [play])
  const nav = (d: number) => set((s) => ({ ...s, stacks: { ...s.stacks, kids: [...s.stacks.kids.slice(0, -1), { s: 'k-letter', p: { i: (i + d + 28) % 28 } }] } }))
  return (
    <div>
      <TopBar title="الحروف" sub={`${toAr(i + 1)}/٢٨`} actions={<Stars n={st.stars} />} />
      <div className={wrap(desktop)}>
        <Card className="mt-1 !p-0 overflow-hidden">
          <div className="flex items-center">
            <div className="grid flex-1 place-items-center py-6"><Big className={`text-(--ink) transition ${play ? 'scale-110' : ''} ${desktop ? 'text-[150px]' : 'text-[120px]'}`}>{l.ch}</Big></div>
            <div className="w-[44%] p-3"><Makhraj group={l.group} className="w-full" /><div className="text-center text-[11px] font-semibold text-(--muted)">من {GROUPS[l.group].ar}</div></div>
          </div>
          <div className="flex items-center justify-between border-t border-(--line) px-4 py-3">
            <span className="text-[12px] text-(--muted)">صوته: {l.sound}</span>
            <span className="text-[24px] font-extrabold text-(--ink)">{l.name}</span>
            <button onClick={() => setPlay(true)} aria-label="استمع" className={`grid size-12 place-items-center rounded-full bg-(--accent) text-(--accent-ink) ${play ? 'animate-pulse' : ''}`}><I n="volume" s={22} /></button>
          </div>
        </Card>
        <Card className="mt-3"><div className="flex items-start gap-2"><I n="sparkle" className="text-(--warn)" /><div><div className="text-[14px] font-bold text-(--ink)">نصيحة النطق</div><p className="text-[13px] text-(--muted)">{GROUPS[l.group].hint[0]}</p></div></div></Card>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[['وحده', f.isolated], ['أوّل', f.initial], ['وسط', f.medial], ['آخر', f.final]].map(([k, v]) => <Card key={k} className="!p-2"><Big className="text-[34px] text-(--ink)">{v}</Big><div className="mt-1 text-[11px] text-(--muted)">{k}</div></Card>)}
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {LETTERS.slice(Math.max(0, i - 3), i + 4).map((x) => { const j = LETTERS.indexOf(x); return <button key={x.ch} onClick={() => nav(j - i)} className={`grid size-14 shrink-0 place-items-center rounded-[16px] ${j === i ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface) text-(--ink) ring-1 ring-(--line)'}`}><Big className="text-[28px]">{x.ch}</Big></button> })}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Btn kind="soft" onClick={() => nav(-1)}>السابق</Btn>
          <button onClick={() => sheet('reward', { msg: 'نطقٌ جميل!' })} className="grid size-20 place-items-center rounded-full bg-(--mic,var(--accent)) text-white shadow-[0_0_0_8px_var(--surface-2)]" aria-label="سجّل صوتك"><I n="mic" s={30} /></button>
          <Btn kind="soft" onClick={() => nav(1)}>التالي</Btn>
        </div>
        <p className="mt-2 text-center text-[12px] text-(--muted)">اضغط وقل الحرف بصوتك</p>
        <Btn kind="ghost" full className="mt-2" onClick={() => go('k-harakat', { i })}>جرّب الحرف مع الحركات</Btn>
      </div>
    </div>
  )
}

export function KHarakat() {
  const { desktop, sheet, theme } = useP()
  const tone = useTone()
  const [ch, setCh] = useState('ب')
  const [hit, setHit] = useState<number | null>(null)
  const [ans, setAns] = useState<number | null>(null)
  const main = HARAKAT.slice(0, 4)
  const quiz = 1
  return (
    <div>
      <TopBar title="الحركات" sub="فتحة · كسرة · ضمّة · سكون" />
      <div className={wrap(desktop)}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">{['ب', 'ت', 'م', 'ن', 'ك', 'س'].map((x) => <Chip key={x} active={ch === x} onClick={() => setCh(x)}><span className="font-(family-name:--font-quran) text-[20px]">{x}</span></Chip>)}</div>
        <div className={`mt-4 grid gap-3 ${desktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {main.map((h, i) => (
            <button key={h.ar} onClick={() => setHit(i)} className={`flex flex-col items-center py-5 transition active:scale-95 ${theme.card === 'mondrian' ? 'border-[3px] border-(--ink)' : 'rounded-[24px]'} ${hit === i ? 'ring-4 ring-(--accent)' : ''}`} style={tone(TONES[i])}>
              <Big className="text-[72px]">{ch + h.mark}</Big>
              <span className="mt-3 text-[15px] font-extrabold">{h.ar}</span>
              <span className="text-[11px] opacity-75" dir="ltr">{h.sound(LETTERS.find((l) => l.ch === ch)?.sound.split(' ')[0] ?? 'b')}</span>
            </button>
          ))}
        </div>
        <Card className="mt-5">
          <div className="flex items-center gap-2"><I n="volume" className="text-(--accent)" /><span className="text-[15px] font-bold text-(--ink)">أين «{ch + HARAKAT[quiz].mark}»؟</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((k) => (
              <button key={k} onClick={() => { setAns(k); if (k === quiz) sheet('reward', { msg: 'إجابة صحيحة!' }) }} className={`rounded-[18px] py-3 transition ${ans === k ? (k === quiz ? 'bg-(--good) text-white' : 'bg-(--bad)/15 text-(--bad)') : 'bg-(--surface-2) text-(--ink)'}`}>
                <Big className="text-[44px]">{ch + HARAKAT[k].mark}</Big>
              </button>
            ))}
          </div>
          {ans !== null && ans !== quiz && <p className="mt-2 text-center text-[13px] font-semibold text-(--muted)">قريب! استمع مرة أخرى وحاول ثانية</p>}
        </Card>
        <div className="mt-4 flex flex-wrap gap-2">{HARAKAT.slice(4).map((h) => <span key={h.ar} className="rounded-full bg-(--surface) px-3 py-1.5 text-[12px] text-(--muted) ring-1 ring-(--line)"><span className="font-(family-name:--font-quran) text-[18px] text-(--ink)">{ch + h.mark}</span> {h.ar}</span>)}</div>
      </div>
    </div>
  )
}

export function KJoining() {
  const { desktop, sheet } = useP()
  const [wi, setWi] = useState(0)
  const [picked, setPicked] = useState<number[]>([])
  const w = JOIN_WORDS[wi]
  const pool = [...w.letters.map((l, i) => ({ l, i }))].sort((a, b) => (a.l + a.i > b.l + b.i ? 1 : -1))
  const complete = picked.length === w.letters.length
  const tap = (i: number) => {
    if (picked.includes(i) || w.letters[i] !== w.letters[picked.length]) return
    const next = [...picked, i]
    setPicked(next)
    if (next.length === w.letters.length) setTimeout(() => sheet('reward', { msg: `كوّنتِ كلمة «${w.word}»` }), 400)
  }
  return (
    <div>
      <TopBar title="وصل الحروف" sub="اضغط الحروف بالترتيب لتصنع كلمة" />
      <div className={wrap(desktop)}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">{JOIN_WORDS.map((x, i) => <Chip key={x.word} active={wi === i} onClick={() => { setWi(i); setPicked([]) }}>{x.meaning[0]}</Chip>)}</div>
        <Card className="mt-4 text-center">
          <div className="flex min-h-[110px] items-center justify-center gap-2">
            {complete ? <Big className="text-[84px] text-(--accent)">{w.word}</Big> : w.letters.map((l, i) => <span key={i} className={`grid size-16 place-items-center rounded-[16px] border-2 border-dashed ${i < picked.length ? 'border-(--accent) bg-(--accent)/10' : 'border-(--line)'}`}><Big className="text-[38px] text-(--ink)">{i < picked.length ? l : ''}</Big></span>)}
          </div>
          <p className="mt-2 text-[13px] text-(--muted)">{complete ? 'انظري كيف تتصل الحروف معًا' : `اصنعي كلمة «${w.meaning[0]}»`}</p>
        </Card>
        <div className="mt-4 flex justify-center gap-3">
          {pool.map(({ l, i }) => <button key={i} onClick={() => tap(i)} disabled={picked.includes(i)} className="grid size-[72px] place-items-center rounded-[20px] border-b-[5px] border-black/15 bg-(--surface) ring-1 ring-(--line) transition active:translate-y-0.5 disabled:opacity-25"><Big className="text-[42px] text-(--ink)">{l}</Big></button>)}
        </div>
        <div className="mt-4 flex justify-center gap-2"><Btn kind="soft" size="sm" onClick={() => setPicked([])}><I n="refresh" s={15} />من جديد</Btn><Btn size="sm" onClick={() => { setWi((wi + 1) % JOIN_WORDS.length); setPicked([]) }}>كلمة أخرى</Btn></div>
        <Card className="mt-5">
          <div className="text-[14px] font-bold text-(--ink)">أشكال الحرف</div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">{(() => { const f = forms(LETTERS[1]); return [['وحده', f.isolated], ['أوّل', f.initial], ['وسط', f.medial], ['آخر', f.final]] })().map(([k, v]) => <div key={k} className="rounded-[14px] bg-(--surface-2) py-2"><Big className="text-[32px] text-(--ink)">{v}</Big><div className="text-[11px] text-(--muted)">{k}</div></div>)}</div>
        </Card>
      </div>
    </div>
  )
}

export function KReading() {
  const { desktop, sheet, st, set } = useP()
  const [li, setLi] = useState(2)
  const [k, setK] = useState(0)
  const [read, setRead] = useState<number[]>([])
  const L = READING_LESSONS[li]
  const item = L.items[k]
  const ok = () => {
    const nr = [...read, k]
    setRead(nr)
    set((s) => ({ ...s, stars: s.stars + 1 }))
    if (k < L.items.length - 1) setK(k + 1)
    else sheet('reward', { msg: 'أنهيتِ الدرس كاملًا!' })
  }
  return (
    <div>
      <TopBar title="تمارين القراءة" sub={L.ar} actions={<Stars n={st.stars} />} />
      <div className={wrap(desktop)}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">{READING_LESSONS.map((x, i) => <Chip key={x.id} active={li === i} onClick={() => { setLi(i); setK(0); setRead([]) }}>{x.ar}</Chip>)}</div>
        <Card className="mt-4 py-10 text-center">
          <Big className={`text-(--ink) ${desktop ? 'text-[120px]' : 'text-[96px]'}`}>{item}</Big>
          <div className="mt-6 flex justify-center gap-1.5">{[...item].filter((c) => c.trim()).length > 0 && L.items.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === k ? 'w-6 bg-(--accent)' : read.includes(i) ? 'w-2 bg-(--good)' : 'w-2 bg-(--surface-2)'}`} />)}</div>
        </Card>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Btn kind="soft" size="lg" onClick={() => setK((k + 1) % L.items.length)}><I n="volume" s={20} />استمع</Btn>
          <Btn size="lg" onClick={ok}><I n="check" s={20} />قرأتها</Btn>
        </div>
        <div className={`mt-5 grid gap-2 ${desktop ? 'grid-cols-8' : 'grid-cols-4'}`}>{L.items.map((x, i) => <button key={i} onClick={() => setK(i)} className={`rounded-[14px] py-2 ${i === k ? 'bg-(--accent) text-(--accent-ink)' : read.includes(i) ? 'bg-(--good)/15 text-(--ink)' : 'bg-(--surface) text-(--ink) ring-1 ring-(--line)'}`}><Big className="text-[24px]">{x}</Big></button>)}</div>
      </div>
    </div>
  )
}

const KSURAHS = [
  { n: 114, ar: 'الناس', state: 'done' },
  { n: 113, ar: 'الفلق', state: 'now' },
  { n: 112, ar: 'الإخلاص', state: 'done' },
  { n: 1, ar: 'الفاتحة', state: 'done' },
  { n: 108, ar: 'الكوثر', state: 'lock' },
  { n: 103, ar: 'العصر', state: 'lock' },
]
export function KSurahs() {
  const { go, desktop, theme } = useP()
  const tone = useTone()
  return (
    <div>
      <TopBar title="السور القصيرة" sub="استمع، ثم كرّر، ثم احفظ" />
      <div className={`${wrap(desktop)} grid gap-3 ${desktop ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {KSURAHS.map((s, i) => (
          <button key={s.n} disabled={s.state === 'lock'} onClick={() => go('k-listen', { n: s.n })} className={`relative flex flex-col items-center gap-2 p-5 text-center transition active:scale-95 disabled:opacity-45 ${theme.card === 'mondrian' ? 'border-[3px] border-(--ink)' : 'rounded-[26px] border-b-[5px] border-black/10'}`} style={tone(TONES[i % 5])}>
            {s.state === 'lock' ? <I n="lock" s={26} /> : s.state === 'done' ? <I n="star" s={26} fill /> : <I n="play" s={26} fill />}
            <Q className="text-[30px] leading-[1.6]">{s.ar}</Q>
            <span className="text-[11px] font-bold opacity-80">{s.state === 'done' ? 'حفظتها' : s.state === 'now' ? 'نتعلّمها الآن' : 'قريبًا'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function KListen() {
  const { cur, go, desktop, st } = useP()
  const s = SHORT.find((x) => x.sura === Number(cur.p?.n ?? 113)) ?? SHORT[1]
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [times, setTimes] = useState(0)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setK((x) => {
      if (x >= s.ayat.length - 1) { setPlaying(false); setTimes((n) => n + 1); return 0 }
      return x + 1
    }), 1300)
    return () => clearInterval(t)
  }, [playing, s.ayat.length])
  return (
    <div>
      <TopBar title={`استمع: ${s.name}`} sub="تابع الآية المضيئة" actions={<Stars n={st.stars} />} />
      <div className={wrap(desktop)}>
        <Card className="mt-1 space-y-1 text-center">
          {s.ayat.map((a, i) => <p key={a.aya} className={`rounded-[16px] px-2 transition-all ${i === k && (playing || times) ? 'scale-[1.02] bg-(--accent)/15' : 'opacity-70'}`}><Q className={`text-(--ink) ${desktop ? 'text-[32px]' : 'text-[24px]'}`}>{a.text}</Q></p>)}
        </Card>
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="text-center"><div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`size-4 rounded-full ${i < times ? 'bg-(--warn)' : 'bg-(--surface-2)'}`} />)}</div><div className="mt-1 text-[11px] text-(--muted)">استمع ٣ مرات</div></div>
          <button onClick={() => setPlaying(!playing)} className="grid size-20 place-items-center rounded-full bg-(--accent) text-(--accent-ink) shadow-[0_8px_0_rgba(0,0,0,.12)]" aria-label={playing ? 'إيقاف' : 'تشغيل'}><I n={playing ? 'pause' : 'play'} s={32} fill /></button>
          <span className="w-[72px]" />
        </div>
        <Btn size="lg" full className="mt-6" disabled={times < 1} onClick={() => go('k-memorize', { n: s.sura })}>{times < 1 ? 'استمع مرة على الأقل' : 'هيا نحفظها!'}</Btn>
      </div>
    </div>
  )
}

export function KMemorize() {
  const { cur, sheet, desktop, set, back } = useP()
  const s = SHORT.find((x) => x.sura === Number(cur.p?.n ?? 113)) ?? SHORT[1]
  const [k, setK] = useState(0)
  const [reps, setReps] = useState(0)
  const [hide, setHide] = useState(false)
  const a = s.ayat[k]
  const tap = () => {
    const r = reps + 1
    if (r < 3) return setReps(r)
    setReps(0)
    set((x) => ({ ...x, stars: x.stars + 1 }))
    if (k < s.ayat.length - 1) setK(k + 1)
    else { setK(0); sheet('reward', { msg: `حفظتِ سورة ${s.name}!`, big: true }) }
  }
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-3">
        <button onClick={back} aria-label="رجوع" className="grid size-11 place-items-center rounded-full bg-(--surface) ring-1 ring-(--line)"><I n="x" s={20} /></button>
        <div className="flex flex-1 gap-1.5">{s.ayat.map((_, i) => <span key={i} className={`h-3 flex-1 rounded-full ${i < k ? 'bg-(--good)' : i === k ? 'bg-(--accent)' : 'bg-(--surface-2)'}`} />)}</div>
      </div>
      <div className={`flex flex-1 flex-col ${wrap(desktop)}`}>
        <Title size="md" className="mt-6 text-center" sub="كرّر الآية ثلاث مرات">{`الآية ${toAr(k + 1)}`}</Title>
        <Card className="mt-4 flex flex-1 items-center justify-center text-center">
          <p className={`leading-[2.2] ${desktop ? 'text-[42px]' : 'text-[32px]'}`}>{a.words.map((w, i) => (hide && i > 0 ? <span key={i} className="mx-1 inline-block h-7 w-12 translate-y-1 rounded-full bg-(--surface-2)" /> : <Q key={i} className="mx-1 text-(--ink)">{w}</Q>))}</p>
        </Card>
        <div className="mt-5 flex justify-center gap-3">{[0, 1, 2].map((i) => <span key={i} className={`grid size-12 place-items-center rounded-full text-[18px] font-extrabold transition ${i < reps ? 'scale-110 bg-(--warn) text-white' : 'bg-(--surface-2) text-(--muted)'}`}>{toAr(i + 1)}</span>)}</div>
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-3 pb-6">
          <Btn kind="soft" size="lg" onClick={() => setHide(!hide)}><I n={hide ? 'eye' : 'eyeOff'} s={20} /></Btn>
          <Btn size="lg" onClick={tap}><I n="repeat" s={20} />قلتها! ({toAr(reps)}/٣)</Btn>
        </div>
      </div>
    </div>
  )
}

export function KRewards() {
  const { desktop, st, theme } = useP()
  const tone = useTone()
  return (
    <div>
      <TopBar title="جوائزي" sub="كل خطوة صغيرة تُحسب" />
      <div className={wrap(desktop)}>
        <Card className="mt-1 text-center">
          <I n="star" s={56} fill className="mx-auto text-(--warn)" />
          <div className="mt-2 font-(family-name:--font-display) text-[44px] font-extrabold leading-none text-(--ink)">{toAr(st.stars)}</div>
          <div className="text-[13px] text-(--muted)">نجمة جمعتِها</div>
          <Bar v={(st.stars % 10) / 10} className="mx-auto mt-4 max-w-[240px]" tone="var(--warn)" />
          <div className="mt-1.5 text-[12px] text-(--muted)">{toAr(10 - (st.stars % 10))} نجوم حتى الملصق القادم</div>
        </Card>
        <div className={`mt-4 grid gap-3 ${desktop ? 'grid-cols-6' : 'grid-cols-3'}`}>
          {BADGES.map((b) => (
            <div key={b.id} className={`flex flex-col items-center gap-2 p-3 text-center ${theme.card === 'mondrian' ? 'border-[3px] border-(--ink)' : 'rounded-[22px]'} ${b.got ? '' : 'opacity-40 grayscale'}`} style={tone(b.tone)}>
              <span className="grid size-14 place-items-center rounded-full bg-white/60"><I n={b.got ? 'trophy' : 'lock'} s={26} /></span>
              <span className="text-[11.5px] font-bold leading-tight">{b.ar}</span>
            </div>
          ))}
        </div>
        <Card className="mt-4"><div className="text-[14px] font-bold text-(--ink)">أيامي هذا الأسبوع</div><div className="mt-3 flex justify-between">{KID.minutes.map((m, i) => <span key={i} className={`grid size-9 place-items-center rounded-full ${m ? 'bg-(--good) text-white' : 'bg-(--surface-2) text-(--muted)'}`}>{m ? <I n="check" s={16} /> : '·'}</span>)}</div><p className="mt-3 text-center text-[12px] text-(--muted)">لا بأس إن فاتك يوم، المهم أن تعود</p></Card>
      </div>
    </div>
  )
}

export function KidSheet({ id, p }: { id: string; p?: Record<string, unknown> }) {
  const { close, st, set, tab, setMode } = useP()
  const [pick, setPick] = useState<number | null>(null)
  if (id === 'reward') {
    const msg = String(p?.msg ?? ENCOURAGE[0])
    return (
      <div className="text-center">
        <div className="relative mx-auto grid size-28 place-items-center">
          {[0, 1, 2, 3, 4].map((i) => <I key={i} n="star" s={18} fill className="absolute animate-ping text-(--warn)" />)}
          <I n="star" s={96} fill className="text-(--warn) drop-shadow" />
        </div>
        <div className="mt-2 font-(family-name:--font-display) text-[30px] font-extrabold text-(--ink)">{ENCOURAGE[st.stars % ENCOURAGE.length]}</div>
        <p className="mt-1 text-[15px] text-(--muted)">{msg}</p>
        <div className="mt-3 text-[14px] font-bold text-(--warn)">+{toAr(p?.big ? 5 : 1)} نجمة</div>
        <Btn size="lg" full className="mt-5" onClick={() => { set((s) => ({ ...s, stars: s.stars + (p?.big ? 5 : 1), sheet: null })) }}>تابع</Btn>
      </div>
    )
  }
  if (id === 'gate')
    return (
      <div className="text-center">
        <I n="lock" s={36} className="mx-auto text-(--accent)" />
        <div className="mt-2 text-[20px] font-bold text-(--ink)">للكبار فقط</div>
        <p className="text-[13px] text-(--muted)">كم يساوي ٣ + ٤ ؟</p>
        <div className="mt-4 grid grid-cols-3 gap-2">{[6, 7, 8].map((v) => <button key={v} onClick={() => { setPick(v); if (v === 7) { setMode('adult', 'guide') } }} className={`h-14 rounded-[16px] text-[22px] font-bold ${pick === v && v !== 7 ? 'bg-(--bad)/15 text-(--bad)' : 'bg-(--surface-2) text-(--ink)'}`}>{toAr(v)}</button>)}</div>
        <Btn kind="ghost" full className="mt-3" onClick={() => { close(); tab('k-home') }}>إلغاء</Btn>
      </div>
    )
  return null
}
