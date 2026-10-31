// Variant visualisations each concept selects through its theme.
import { useEffect, useState } from 'react'
import { useP } from './proto'
import { Bar, Card, I, Ring, ToneDot, useTone } from './kit'
import { HEAT, REVISION, SURAHS, WEEK, sampleSurah, toAr } from './data'

export type WeekDay = { day: string; short: string; date: string; items: { tone: string; label: string; detail: string }[]; done: boolean; today: boolean }

export function WeekView({ week = WEEK }: { week?: WeekDay[] }) {
  const { theme, desktop } = useP()
  const tone = useTone()
  const [sel, setSel] = useState(week.findIndex((d) => d.today) >= 0 ? week.findIndex((d) => d.today) : 0)
  const v = theme.week
  if (v === 'calendar')
    return (
      <div className="overflow-x-auto no-scrollbar rounded-[10px] border border-(--line) bg-(--surface)">
        <div className="grid min-w-[620px] grid-cols-7">
          {week.map((d, i) => (
            <div key={i} className={`border-s border-(--line) first:border-s-0 ${d.today ? 'bg-(--accent)/[.06]' : ''}`}>
              <div className={`border-b px-2 py-2 text-center text-[12px] ${d.today ? 'border-(--accent) border-b-2 font-bold text-(--accent)' : 'border-(--line) text-(--muted)'}`}>
                {d.day} {d.date}
              </div>
              <div className="flex min-h-[150px] flex-col gap-1.5 p-1.5">
                {d.items.map((it, j) => (
                  <div key={j} className="rounded-[6px] border-s-[3px] px-2 py-1.5 text-[11px] leading-snug" style={{ ...tone(it.tone), borderColor: tone(it.tone).color }}>
                    <div className="font-bold">{it.label}</div>
                    <div className="opacity-80">{it.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  if (v === 'timeline')
    return (
      <div className="relative ps-6">
        <div className="absolute inset-y-2 start-[9px] w-px bg-(--line)" />
        {week.map((d, i) => (
          <div key={i} className="relative pb-4">
            <span className={`absolute -start-6 top-1 grid size-[19px] place-items-center rounded-full border-2 ${d.done ? 'border-(--good) bg-(--good)' : d.today ? 'border-(--accent) bg-(--bg)' : 'border-(--line) bg-(--bg)'}`}>{d.done && <I n="check" s={11} className="text-(--bg)" />}</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-[14px] font-semibold ${d.today ? 'text-(--accent)' : 'text-(--ink)'}`}>{d.day}{d.today && ' · اليوم'}</span>
              <span className="text-[11px] text-(--muted)">{d.items.length} مهام</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {d.items.map((it, j) => (
                <span key={j} className="rounded-full px-2.5 py-1 text-[11px]" style={tone(it.tone)}>{it.label} · {it.detail}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  if (v === 'list')
    return (
      <div>
        {week.map((d, i) => (
          <div key={i} className={`grid grid-cols-[84px_1fr] gap-3 border-t border-(--line) py-3 ${d.today ? 'text-(--accent)' : ''}`}>
            <div className="font-(family-name:--font-display) text-[17px] font-bold">{d.day}<div className="text-[11px] font-normal text-(--muted)">{d.date} شعبان</div></div>
            <div className="text-[13px] leading-relaxed text-(--ink)">
              {d.items.map((it, j) => (
                <span key={j}>{j > 0 && <span className="mx-1.5 text-(--accent)">·</span>}<b className="font-semibold">{it.label}</b> {it.detail}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  if (v === 'grid') {
    const rows = ['حفظ', 'مراجعة', 'ورد', 'الكهف']
    return (
      <div className="border-2 border-(--ink)">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b-2 border-(--ink) text-center text-[11px] font-bold">
          <span />
          {week.map((d, i) => <span key={i} className={`py-1.5 ${d.today ? 'bg-(--ink) text-(--bg)' : ''}`}>{d.short}</span>)}
        </div>
        {rows.map((r) => (
          <div key={r} className="grid grid-cols-[64px_repeat(7,1fr)] items-center border-b border-(--line) last:border-0">
            <span className="px-2 py-2 text-[11px] font-bold">{r}</span>
            {week.map((d, i) => {
              const has = d.items.some((it) => it.label === r)
              return <span key={i} className="grid place-items-center py-2"><span className={`size-4 ${has ? (d.done ? 'bg-(--ink)' : 'bg-(--accent)') : 'border border-(--line)'}`} /></span>
            })}
          </div>
        ))}
      </div>
    )
  }
  // chips
  const d = week[sel]
  return (
    <div>
      <div className="flex justify-between gap-1.5">
        {week.map((w, i) => (
          <button key={i} onClick={() => setSel(i)} className={`flex flex-1 flex-col items-center gap-1.5 rounded-[16px] py-2 transition ${i === sel ? 'bg-(--accent) text-(--accent-ink)' : 'bg-(--surface) text-(--ink)'} ${desktop ? 'py-3' : ''}`}>
            <span className={`grid size-7 place-items-center rounded-full ${w.done ? 'bg-(--good) text-white' : i === sel ? 'bg-white/20' : 'bg-(--surface-2)'}`}>{w.done ? <I n="check" s={14} /> : <span className="text-[11px]">{w.date}</span>}</span>
            <span className="text-[11px] font-semibold">{w.short}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {d.items.map((it, j) => (
          <div key={j} className="flex items-center gap-3 rounded-[14px] bg-(--surface) px-3 py-2.5">
            <ToneDot t={it.tone} />
            <span className="text-[13px] font-semibold text-(--ink)">{it.label}</span>
            <span className="ms-auto text-[12px] text-(--muted)">{it.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const JUZ30 = SURAHS.slice(77)

export function ProgressViz() {
  const { theme, desktop } = useP()
  const v = theme.progress
  if (v === 'rings')
    return (
      <Card>
        <div className="flex items-center justify-around gap-2">
          {[
            ['الحفظ', 0.08, '٨٪'],
            ['المراجعة', 0.72, '٧٢٪'],
            ['الختمة', 0.35, '٣٥٪'],
          ].map(([l, val, t], i) => (
            <div key={i} className="text-center">
              <Ring v={val as number} size={desktop ? 96 : 76} stroke={8} color={['var(--accent)', 'var(--good)', 'var(--warn)'][i]}>{t}</Ring>
              <div className="mt-2 text-[12px] font-semibold text-(--muted)">{l}</div>
            </div>
          ))}
        </div>
      </Card>
    )
  if (v === 'bars') {
    const vals = [62, 70, 68, 81, 77, 86, 91, 88, 93]
    return (
      <Card>
        <div className="flex items-baseline justify-between"><span className="text-[13px] text-(--muted)">دقة التلاوة · آخر ٩ جلسات</span><span className="text-[22px] font-bold text-(--accent)">٩٣٪</span></div>
        <div className="mt-4 flex h-32 items-end gap-2">
          {vals.map((x, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-[8px]" style={{ height: `${x}%`, background: i === vals.length - 1 ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 35%, transparent)' }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-[11px] text-(--muted)"><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-(--good)" />صحيح ٨٨٪</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-(--warn)" />قريب ٨٪</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-(--bad)" />خطأ ٤٪</span></div>
      </Card>
    )
  }
  if (v === 'heat')
    return (
      <Card>
        <div className="mb-3 flex items-center justify-between text-[12px] text-(--muted)"><span>آخر ١٢ أسبوعًا</span><span className="flex items-center gap-1">أقل {[0, 1, 2, 3].map((l) => <span key={l} className="size-2.5 rounded-[3px]" style={{ background: heat(l) }} />)} أكثر</span></div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" dir="ltr">
          {HEAT.map((l, i) => <span key={i} className="aspect-square rounded-[3px]" style={{ background: heat(l) }} />)}
        </div>
      </Card>
    )
  if (v === 'ledger')
    return (
      <div>
        {Array.from({ length: 10 }, (_, i) => 30 - i).map((j) => {
          const val = j === 30 ? 1 : j === 29 ? 0.42 : j === 1 ? 0.3 : 0
          return (
            <div key={j} className="grid grid-cols-[70px_1fr_44px] items-center gap-3 border-t border-(--line) py-2.5 text-[13px]">
              <span className="font-(family-name:--font-display) font-bold">الجزء {toAr(j)}</span>
              <Bar v={val} />
              <span className="text-end text-(--muted)">{toAr(Math.round(val * 100))}٪</span>
            </div>
          )
        })}
      </div>
    )
  if (v === 'garden')
    return (
      <Card>
        <div className="grid grid-cols-8 gap-x-1 gap-y-3" style={desktop ? { gridTemplateColumns: 'repeat(13, minmax(0,1fr))' } : undefined}>
          {JUZ30.map((s, i) => {
            const r = REVISION.find((x) => x.n === s.n)?.strength ?? (i > 10 ? 0.85 : i < 3 ? 0.55 : 0)
            return (
              <div key={s.n} className="flex flex-col items-center" title={s.ar}>
                <Plant v={r} />
                <span className="mt-0.5 max-w-full truncate text-[8.5px] text-(--muted)">{s.ar}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex gap-3 text-[11px] text-(--muted)"><span>شجرة = متقنة</span><span>برعم = تحتاج سقيًا (مراجعة)</span><span>بذرة = لم تُحفظ</span></div>
      </Card>
    )
  // numbers
  return (
    <div className="grid grid-cols-2 border-2 border-(--ink)">
      {[
        ['٤١٢', 'آية محفوظة', 0.07],
        ['٢٫٤', 'جزء متقن', 0.08],
        ['٩٣', 'دقة التلاوة ٪', 0.93],
        ['١٢', 'يومًا متتاليًا', 0.4],
      ].map(([n, l, val], i) => (
        <div key={i} className={`p-4 ${i % 2 === 0 ? 'border-e-2 border-(--ink)' : ''} ${i < 2 ? 'border-b-2 border-(--ink)' : ''}`}>
          <div className="font-(family-name:--font-display) text-[44px] font-black leading-none">{n}</div>
          <div className="mb-2 mt-1 text-[12px] text-(--muted)">{l}</div>
          <Bar v={val as number} />
        </div>
      ))}
    </div>
  )
}
const heat = (l: number) => ['var(--surface-2)', 'color-mix(in oklab, var(--accent) 35%, transparent)', 'color-mix(in oklab, var(--accent) 65%, transparent)', 'var(--accent)'][l]

export function Plant({ v, size = 30 }: { v: number; size?: number }) {
  if (v === 0)
    return (
      <svg width={size} height={size} viewBox="0 0 30 30"><ellipse cx="15" cy="25" rx="8" ry="2.5" fill="var(--surface-2)" /><circle cx="15" cy="23" r="2.2" fill="var(--muted)" opacity=".5" /></svg>
    )
  const h = 6 + v * 14
  const lush = v > 0.7
  return (
    <svg width={size} height={size} viewBox="0 0 30 30">
      <ellipse cx="15" cy="26" rx="9" ry="2.5" fill="var(--surface-2)" />
      <path d={`M15 26V${26 - h}`} stroke="var(--good)" strokeWidth="1.8" strokeLinecap="round" />
      {lush ? (
        <circle cx="15" cy={26 - h} r={6 + v * 2} fill="var(--good)" opacity=".9" />
      ) : (
        <>
          <path d={`M15 ${26 - h * 0.6}c-4 0-6-2-6-5 3 0 6 2 6 5z`} fill="var(--warn)" />
          <path d={`M15 ${26 - h * 0.8}c4 0 6-2 6-5-3 0-6 2-6 5z`} fill="var(--good)" />
        </>
      )}
    </svg>
  )
}

// Fetch any surah's verified text from public/quran (read-only).
const cache: Record<number, string[]> = {}
export function useSurahText(n: number) {
  const local = sampleSurah(n)?.ayat.map((a) => a.text) ?? cache[n] ?? null
  const [ayat, setAyat] = useState<{ n: number; a: string[] } | null>(local ? { n, a: local } : null)
  useEffect(() => {
    if (local) return setAyat({ n, a: local })
    let live = true
    fetch(`${import.meta.env.BASE_URL}quran/${n}.json`)
      .then((r) => r.json())
      .then((d: { ayat: string[] }) => {
        cache[n] = d.ayat
        if (live) setAyat({ n, a: d.ayat })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return ayat?.n === n ? ayat.a : null
}

export function estimate(total: number, perDay: number, days: number[]) {
  const d = new Date()
  let left = total
  let sessions = 0
  for (let i = 0; left > 0 && i < 3000 && days.length; i++) {
    d.setDate(d.getDate() + 1)
    if (days.includes((d.getDay() + 1) % 7)) {
      left -= perDay
      sessions++
    }
  }
  const greg = d.toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' })
  let hijri = ''
  try {
    hijri = d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    hijri = ''
  }
  const weeks = Math.ceil(sessions / Math.max(1, days.length))
  return { greg, hijri, sessions, weeks }
}
