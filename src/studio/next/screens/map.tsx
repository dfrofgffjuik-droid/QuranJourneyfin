// خريطة رحلة القرآن — 30-station isometric Juz map (design preview).
// Stations come from the shared preview memorisation records (../progress), the
// same source as the Achievement Library, so both always agree. Reading or
// revision never lights a station; only confirmed memorisation does.
import { useState } from 'react'
import { Chrome, Head, Icon, toAr, useDevice, useProto } from '../core'
import { JUZ_AR } from '../data'
import { derived, usePreview, type JuzInfo } from '../progress'
import { DataBar } from '../previewUi'
import { Box, C, GlowDefs, S, STATUS_COLOR, SURFACE, kernel, tint } from '../iso'
import { TOTAL_AYAT, surah } from '../../../lib/quran'

const STATUS_AR = { done: 'مكتمل الحفظ', progress: 'قيد الحفظ', idle: 'لم يبدأ', rest: '', locked: '' } as const
const pct = (j: JuzInfo) => Math.floor((j.memorised / j.total) * 100)

export function JourneyMap() {
  const device = useDevice()
  const d = derived(usePreview())
  const JUZ_INFO = d.juz
  const TOTAL_MEMORISED = d.memCount
  const [sel, setSel] = useState<number>(() => JUZ_INFO.find((j) => j.status === 'progress')?.j ?? 1)
  const j = JUZ_INFO[sel - 1]
  const done = JUZ_INFO.filter((x) => x.status === 'done').length
  const prog = JUZ_INFO.filter((x) => x.status === 'progress').length
  const summary = (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {[['آيات محفوظة', `${toAr(TOTAL_MEMORISED)}`, `من ${toAr(TOTAL_AYAT)}`], ['أجزاء مكتملة', toAr(done), 'من ٣٠'], ['قيد الحفظ', toAr(prog), 'أجزاء']].map(([l, v, s]) => (
        <div key={l} className="rounded-[18px] bg-card/80 p-3 ring-1 ring-line">
          <p className="text-[11.5px] text-muted">{l}</p>
          <p className="mt-0.5 text-[20px] font-bold leading-tight">{v}</p>
          <p className="text-[11px] text-muted">{s}</p>
        </div>
      ))}
    </div>
  )
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
            <Head title="خريطة رحلة القرآن" sub="ثلاثون محطة، لكلّ جزء محطة. تُضاء المحطة من سجلّ الآيات التي حفظتها فعلًا." action={<DataBar />} />
            {summary}
            <Legend />
            <MapSvg juz={JUZ_INFO} cols={5} width={760} sel={sel} onSel={setSel} />
          </div>
          <aside className="w-[360px] shrink-0 border-s border-line/60 bg-card/50 p-6">
            <JuzDetail j={j} />
          </aside>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-56 pt-4">
        <Head title="خريطة رحلة القرآن" sub="ثلاثون محطة تُضاء بما تحفظه فعلًا." action={<DataBar compact />} />
        {summary}
        <Legend />
        <MapSvg juz={JUZ_INFO} cols={3} width={350} sel={sel} onSel={setSel} />
      </div>
      <div className="glass-panel absolute inset-x-3 bottom-28 z-30 rounded-[26px] p-4">
        <JuzDetail j={j} compact />
      </div>
    </Chrome>
  )
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap gap-3 text-[12px] text-muted">
      {(['done', 'progress', 'idle'] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s], boxShadow: s === 'idle' ? undefined : `0 0 8px ${STATUS_COLOR[s]}` }} />{STATUS_AR[s]}</span>
      ))}
    </div>
  )
}

function MapSvg({ juz: JUZ_INFO, cols, width, sel, onSel }: { juz: JuzInfo[]; cols: number; width: number; sel: number; onSel: (j: number) => void }) {
  const rows = Math.ceil(30 / cols)
  const gapX = (width - 90) / (cols - 1)
  const gapY = cols === 3 ? 96 : 104
  const height = rows * gapY + 70
  const k = kernel(0, 0)
  // Lay stations out in screen space (serpentine), then invert to ground coordinates.
  const pos = JUZ_INFO.map((_, i) => {
    const r = Math.floor(i / cols)
    const c = r % 2 ? cols - 1 - (i % cols) : i % cols
    const X = width - 45 - c * gapX // RTL: the journey starts on the right
    const Y = 58 + r * gapY
    return { X, Y, x: (Y / S + X / C) / 2, y: (Y / S - X / C) / 2 }
  })
  const P = 46
  const road = pos.map((p) => `${p.X},${p.Y}`).join(' ')
  const litTo = JUZ_INFO.reduce((n, j, i) => (j.status !== 'idle' ? i : n), -1)
  const order = pos.map((p, i) => ({ ...p, i })).sort((a, b) => a.Y - b.Y || a.X - b.X)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="group" aria-label="خريطة الأجزاء الثلاثين">
      <GlowDefs id="map" />
      {/* Road on the ground plane */}
      <polyline points={road} fill="none" stroke="color-mix(in oklab, var(--color-line) 85%, var(--color-night) 6%)" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={road} fill="none" stroke="var(--color-card)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={road} fill="none" stroke="var(--color-line)" strokeWidth={1.4} strokeDasharray="3 7" strokeLinecap="round" />
      {pos.slice(0, -1).map((p, i) => {
        const a = JUZ_INFO[i].status
        const b = JUZ_INFO[i + 1].status
        if (a === 'idle' || b === 'idle' || i >= litTo) return null
        const c = a === 'done' && b === 'done' ? STATUS_COLOR.done : STATUS_COLOR.progress
        return <line key={i} x1={p.X} y1={p.Y} x2={pos[i + 1].X} y2={pos[i + 1].Y} stroke={c} strokeWidth={4} strokeLinecap="round" opacity={0.85} filter="url(#map-soft)" />
      })}
      {order.map(({ x, y, X, Y, i }) => {
        const j = JUZ_INFO[i]
        const h = j.status === 'done' ? 22 : j.status === 'progress' ? 15 : 8
        const f = j.status === 'idle' ? SURFACE : tint(STATUS_COLOR[j.status], j.status === 'done' ? 0.7 : 0.75)
        const on = sel === j.j
        return (
          <g key={j.j} className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`الجزء ${j.j}، ${STATUS_AR[j.status]}، ${pct(j)}٪`} onClick={() => onSel(j.j)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel(j.j))}>
            {j.status !== 'idle' && <ellipse className="iso-halo" cx={X} cy={Y} rx={46} ry={24} fill={STATUS_COLOR[j.status]} filter="url(#map-bloom)" />}
            <g className="iso-lift">
              <Box k={k} x={x - P / 2} y={y - P / 2} z={0} w={P} d={P} h={h} f={f} />
              {on && <polygon className="iso-focus" points={k.poly([[x - P / 2, y - P / 2, h], [x + P / 2, y - P / 2, h], [x + P / 2, y + P / 2, h], [x - P / 2, y + P / 2, h]])} fill="none" stroke="var(--color-night)" strokeWidth={1.6} />}
              <polygon className="iso-focus" points={k.poly([[x - P / 2, y - P / 2, h], [x + P / 2, y - P / 2, h], [x + P / 2, y + P / 2, h], [x - P / 2, y + P / 2, h]])} fill="none" stroke="transparent" />
              {j.status === 'progress' && (
                // Fill strip on the front face shows the real completion ratio.
                <g transform={k.FRONT(x - P / 2, y + P / 2, h)}>
                  <rect x={4} y={h - 5} width={(P - 8) * (j.memorised / j.total)} height={2.5} rx={1.2} fill="var(--color-gold)" />
                </g>
              )}
              <text x={X} y={Y - h - 4} textAnchor="middle" className="font-sans" fontSize={13} fontWeight={700} fill={j.status === 'idle' ? 'var(--color-muted)' : 'var(--color-night)'}>{toAr(j.j)}</text>
            </g>
          </g>
        )
      })}
      <text x={pos[0].X} y={pos[0].Y + 34} textAnchor="middle" fontSize={11} fill="var(--color-muted)">البداية</text>
      <text x={pos[29].X} y={pos[29].Y + 34} textAnchor="middle" fontSize={11} fill="var(--color-muted)">الختام</text>
    </svg>
  )
}

export function JuzDetail({ j, compact = false }: { j: JuzInfo; compact?: boolean }) {
  const { go } = useProto()
  const p = pct(j)
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-muted">الجزء {toAr(j.j)}</p>
          <h2 className="font-arabic-display text-[20px] font-bold">الجزء {JUZ_AR[j.j - 1]}</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: `color-mix(in oklab, ${STATUS_COLOR[j.status]} 16%, transparent)`, color: j.status === 'idle' ? 'var(--color-muted)' : 'var(--color-night)' }}>{STATUS_AR[j.status]}</span>
      </div>
      <p className="mt-2 text-[13px] text-muted">من {surah(j.start[0]).ar} {toAr(j.start[1])} إلى {surah(j.end[0]).ar} {toAr(j.end[1])}</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-[13px]"><b className="text-[22px] font-bold">{toAr(j.memorised)}</b> <span className="text-muted">/ {toAr(j.total)} آية محفوظة</span></p>
        <p className="text-[15px] font-bold">{toAr(p)}٪</p>
      </div>
      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full" style={{ width: `${(j.memorised / j.total) * 100}%`, background: STATUS_COLOR[j.status === 'idle' ? 'progress' : j.status] }} /></span>
      <p className="mt-1.5 text-[11px] text-muted">من سجلّ الحفظ المؤكَّد في المعاينة · القراءة والمراجعة لا تُضيئان المحطة</p>
      {!compact && (
        <div className="mt-5">
          <p className="mb-2 text-[12.5px] font-semibold text-muted">السور في هذا الجزء</p>
          <div className="flex flex-wrap gap-1.5">
            {j.surahs.slice(0, 12).map((n) => <span key={n} className="rounded-full bg-night/[.05] px-2.5 py-1 text-[12px]">{surah(n).ar}</span>)}
            {j.surahs.length > 12 && <span className="rounded-full px-2 py-1 text-[12px] text-muted">+{toAr(j.surahs.length - 12)}</span>}
          </div>
        </div>
      )}
      <div className={`grid grid-cols-2 gap-2 ${compact ? 'mt-3' : 'mt-6'}`}>
        <button type="button" onClick={() => go('ayah')} disabled={j.status === 'done'} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-night text-[13.5px] font-semibold text-parchment disabled:opacity-40"><Icon name="sprout" size={17} />احفظ</button>
        <button type="button" onClick={() => go('revision')} disabled={j.memorised === 0} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-gold-soft text-[13.5px] font-semibold disabled:opacity-40"><Icon name="repeat" size={17} />راجع</button>
      </div>
    </div>
  )
}
