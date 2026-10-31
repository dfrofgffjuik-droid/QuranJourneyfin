// مكتبة إنجازاتي — isometric achievements library (design preview).
// Books come from the same shared memorisation records as the Journey Map.
import { useState, type ReactElement } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { JUZ_AR } from '../data'
import { derived, usePreview, type JuzInfo } from '../progress'
import { DataBar } from '../previewUi'
import { Box, GlowDefs, STATUS_COLOR, SURFACE, kernel, tint } from '../iso'
import { gIndex, surah } from '../../../lib/quran'

const BW = 18 // book thickness
const BD = 36
const PANEL = 8
const BAY = 5 * (BW + 3) + 14
const W = PANEL * 3 + BAY * 2
const D = 46
const ROW = 92
const H = ROW * 3 + 8

export function Library() {
  const device = useDevice()
  const d = derived(usePreview())
  const JUZ_INFO = d.juz
  const [sel, setSel] = useState(30)
  const j = JUZ_INFO[sel - 1]
  const done = JUZ_INFO.filter((x) => x.status === 'done').length
  const prog = JUZ_INFO.filter((x) => x.status === 'progress').length
  const intro = 'كل كتاب جزء من القرآن. يُضاء الكتاب كاملًا فقط حين تُسجَّل جميع آياته محفوظة، ويمتلئ كعبه نورًا بقدر ما حفظت منه.'
  const stats = (
    <div className="mb-5 flex flex-wrap gap-2 text-[12.5px]">
      <span className="rounded-full bg-leaf/10 px-3 py-1.5 font-semibold text-leaf">{toAr(done)} كتب مكتملة</span>
      <span className="rounded-full bg-gold-soft px-3 py-1.5 font-semibold">{toAr(prog)} قيد الحفظ</span>
      <span className="rounded-full bg-night/[.05] px-3 py-1.5 text-muted">{toAr(30 - done - prog)} تنتظر</span>
      <DataBar compact />
    </div>
  )
  const body =
    device === 'desktop' ? (
      <div className="flex h-full">
        <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
          <Head title="مكتبة إنجازاتي" sub={intro} />
          {stats}
          <Case juz={JUZ_INFO} sel={sel} onSel={setSel} />
        </div>
        <aside className="no-scrollbar w-[360px] shrink-0 overflow-y-auto border-s border-line/60 bg-card/50 p-6"><BookDetail j={j} memBetween={d.memBetween} /></aside>
      </div>
    ) : (
      <div className="px-5 pb-8 pt-4">
        <MoreTabs />
        <Head title="مكتبة إنجازاتي" sub={intro} />
        {stats}
        <Case juz={JUZ_INFO} sel={sel} onSel={setSel} />
        <div className="mt-4 rounded-[26px] bg-card p-5 ring-1 ring-line"><BookDetail j={j} memBetween={d.memBetween} /></div>
      </div>
    )
  return <Chrome>{body}</Chrome>
}

function Case({ juz: JUZ_INFO, sel, onSel }: { juz: JuzInfo[]; sel: number; onSel: (j: number) => void }) {
  const k = kernel(72, H + 26)
  const [fx, fy] = k.P(W / 2, D / 2, 0)
  const recess = 'color-mix(in oklab, var(--color-card) 72%, var(--color-night))'
  const wood = tint('var(--color-gold)', 0.28)
  const parts: ReactElement[] = []
  parts.push(
    <g key="back" transform={k.FRONT(0, 0, H)}>
      <rect width={W} height={H} fill={recess} />
      {Array.from({ length: 3 }, (_, r) => <rect key={r} x={0} y={r * ROW + 8} width={W} height={ROW - 8} fill="color-mix(in oklab, var(--color-night) 5%, transparent)" />)}
    </g>,
  )
  parts.push(<Box key="lp" k={k} x={0} y={0} z={0} w={PANEL} d={D} h={H} f={wood} />)
  for (let r = 0; r < 3; r++) {
    const z = (2 - r) * ROW // top row = juz 1–10
    parts.push(<Box key={`b${r}`} k={k} x={PANEL} y={0} z={z} w={W - PANEL * 2} d={D} h={8} f={wood} />)
    for (let bay = 0; bay < 2; bay++) {
      const x0 = PANEL + bay * (BAY + PANEL) + 7
      for (let i = 0; i < 5; i++) {
        const jn = r * 10 + bay * 5 + i + 1
        parts.push(<Book key={jn} k={k} j={JUZ_INFO[jn - 1]} x={x0 + i * (BW + 3)} z={z + 8} on={sel === jn} onSel={onSel} />)
      }
      if (bay === 0) parts.push(<Box key={`m${r}`} k={k} x={PANEL + BAY} y={0} z={z + 8} w={PANEL} d={D} h={ROW - 8} f={wood} />)
      parts.push(
        <g key={`l${r}${bay}`} transform={k.FRONT(PANEL + bay * (BAY + PANEL) + BAY / 2 - 26, D, z + 7)}>
          <rect width={52} height={6} rx={1.5} fill="var(--color-card)" stroke="var(--color-line)" strokeWidth={0.4} />
          <text x={26} y={4.7} textAnchor="middle" fontSize={4.6} fill="var(--color-muted)">الأجزاء {toAr(r * 10 + bay * 5 + 1)}–{toAr(r * 10 + bay * 5 + 5)}</text>
        </g>,
      )
    }
  }
  parts.push(<Box key="rp" k={k} x={W - PANEL} y={0} z={0} w={PANEL} d={D} h={H} f={wood} />)
  parts.push(<Box key="top" k={k} x={0} y={0} z={H} w={W} d={D} h={8} f={wood} />)
  return (
    <svg viewBox={`0 0 ${Math.round(W * 0.866 + 104)} ${H + 190}`} className="mx-auto w-full max-w-[560px]" role="group" aria-label="رفوف الأجزاء">
      <GlowDefs id="lib" />
      <ellipse cx={fx} cy={fy + 20} rx={W * 0.55} ry={16} fill="color-mix(in oklab, var(--color-night) 10%, transparent)" filter="url(#lib-bloom)" />
      {parts}
    </svg>
  )
}

function Book({ k, j, x, z, on, onSel }: { k: ReturnType<typeof kernel>; j: JuzInfo; x: number; z: number; on: boolean; onSel: (j: number) => void }) {
  const h = 58 + ((j.j * 7) % 5) * 3
  const y = 4
  const r = j.memorised / j.total
  const f = j.status === 'done' ? tint(STATUS_COLOR.done, 0.75) : j.status === 'progress' ? SURFACE : { ...SURFACE, top: 'transparent', front: 'color-mix(in oklab, var(--color-card) 40%, transparent)', side: 'color-mix(in oklab, var(--color-card) 30%, transparent)' }
  const [cx, cy] = k.P(x + BW / 2, y + BD, z + h / 2)
  return (
    <g className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`الجزء ${j.j}: ${j.memorised} من ${j.total} آية`} onClick={() => onSel(j.j)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel(j.j))}>
      {j.status !== 'idle' && <ellipse className="iso-halo" cx={cx} cy={cy} rx={16} ry={34} fill={STATUS_COLOR[j.status]} filter="url(#lib-bloom)" />}
      <g className="iso-lift" strokeDasharray={j.status === 'idle' ? '2 2' : undefined}>
        <Box k={k} x={x} y={y} z={z} w={BW} d={BD} h={h} f={f} />
        <g transform={k.FRONT(x, y + BD, z + h)}>
          {j.status === 'progress' && <rect x={1.5} y={h * (1 - r)} width={BW - 3} height={h * r} fill="var(--color-gold)" opacity={0.85} />}
          <rect x={2} y={8} width={BW - 4} height={0.8} fill={j.status === 'idle' ? 'var(--color-line)' : 'color-mix(in oklab, var(--color-night) 25%, transparent)'} />
          <rect x={2} y={h - 9} width={BW - 4} height={0.8} fill={j.status === 'idle' ? 'var(--color-line)' : 'color-mix(in oklab, var(--color-night) 25%, transparent)'} />
          <text x={BW / 2} y={h / 2 + 3} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={j.status === 'idle' ? 'var(--color-muted)' : j.status === 'done' ? 'white' : 'var(--color-night)'}>{toAr(j.j)}</text>
        </g>
        {on && <polygon points={k.poly([[x, y + BD, z + h], [x + BW, y + BD, z + h], [x + BW, y + BD, z], [x, y + BD, z]])} fill="none" stroke="var(--color-night)" strokeWidth={1.4} />}
      </g>
    </g>
  )
}

function BookDetail({ j, memBetween: memorisedBetween }: { j: JuzInfo; memBetween: (a: number, b: number) => number }) {
  const { go } = useProto()
  const g0 = gIndex(...j.start)
  const g1 = gIndex(...j.end)
  return (
    <div>
      <p className="text-[12px] text-muted">الكتاب {toAr(j.j)} من ٣٠</p>
      <h2 className="font-arabic-display text-[20px] font-bold">الجزء {JUZ_AR[j.j - 1]}</h2>
      <p className="mt-1 text-[13px] text-muted">من {surah(j.start[0]).ar} {toAr(j.start[1])} إلى {surah(j.end[0]).ar} {toAr(j.end[1])}</p>
      <div className="mt-4 flex items-end justify-between">
        <p><b className="text-[22px]">{toAr(j.memorised)}</b> <span className="text-[13px] text-muted">/ {toAr(j.total)} آية</span></p>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${j.status === 'done' ? 'bg-leaf/10 text-leaf' : j.status === 'progress' ? 'bg-gold-soft' : 'bg-night/[.05] text-muted'}`}>{j.status === 'done' ? 'مكتمل · كل آياته محفوظة' : j.status === 'progress' ? 'قيد الحفظ' : 'لم يبدأ'}</span>
      </div>
      <p className="mb-2 mt-5 text-[12.5px] font-semibold text-muted">السور</p>
      <ul className="space-y-1.5">
        {j.surahs.slice(0, 14).map((n) => {
          // Only the part of the surah inside this juz counts towards this book.
          const s0 = Math.max(g0, gIndex(n, 1))
          const s1 = Math.min(g1, gIndex(n, surah(n).ayat))
          const tot = s1 - s0 + 1
          const mem = memorisedBetween(s0, s1)
          return (
            <li key={n} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-20 truncate">{surah(n).ar}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full" style={{ width: `${(mem / tot) * 100}%`, background: mem === tot ? STATUS_COLOR.done : STATUS_COLOR.progress }} /></span>
              <span className="w-14 text-end text-[11.5px] tabular-nums text-muted">{toAr(mem)}/{toAr(tot)}</span>
            </li>
          )
        })}
      </ul>
      {j.surahs.length > 14 && <p className="mt-2 text-[12px] text-muted">و{toAr(j.surahs.length - 14)} سورة أخرى</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go('map')} className="press flex h-10 items-center justify-center gap-1.5 rounded-full bg-night/[.05] text-[12.5px] font-semibold"><Icon name="path" size={15} />على الخريطة</button>
        <button type="button" onClick={() => go('rewards')} className="press flex h-10 items-center justify-center gap-1.5 rounded-full bg-night/[.05] text-[12.5px] font-semibold"><Icon name="star" size={15} />الإنجازات</button>
      </div>
      <p className="mt-3 text-[11px] text-muted">من سجلّ الحفظ المؤكَّد في المعاينة · نفس مصدر خريطة الرحلة</p>
    </div>
  )
}
