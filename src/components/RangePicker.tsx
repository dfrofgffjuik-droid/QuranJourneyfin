import { useL } from '../lib/i18n'
import { SURAHS, surah } from '../lib/quran'
import { Icon } from './Icon'

export type Range = { s: number; from: number; to: number }

export function RangePicker({ value, onChange, compact = false }: { value: Range; onChange: (r: Range) => void; compact?: boolean }) {
  const { L, N, lang } = useL()
  const max = surah(value.s).ayat
  return (
    <div className={`grid grid-cols-2 gap-3 ${compact ? 'sm:grid-cols-[1fr_auto_auto]' : 'sm:grid-cols-[2fr_1fr_1fr]'}`}>
      <label className="col-span-2 block sm:col-span-1">
        <span className="mb-1.5 block text-xs text-muted">{L('السورة', 'Surah')}</span>
        <span className="relative block">
          <select
            value={value.s}
            onChange={(e) => {
              const s = Number(e.target.value)
              onChange({ s, from: 1, to: Math.min(surah(s).ayat, Math.max(1, value.to - value.from + 1)) })
            }}
            className="h-12 w-full appearance-none rounded-2xl bg-card pe-10 ps-4 ring-1 ring-line outline-none focus:ring-night/40"
          >
            {SURAHS.map((x) => (
              <option key={x.n} value={x.n}>
                {lang === 'ar' ? `${N(x.n)}. ${x.ar}` : `${x.n}. ${x.en}`}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={18} className="pointer-events-none absolute end-3 top-3.5 text-muted" />
        </span>
      </label>
      <NumberBox label={L('من الآية', 'From ayah')} value={value.from} min={1} max={max} onChange={(v) => onChange({ ...value, from: v, to: Math.max(v, value.to) })} />
      <NumberBox label={L('إلى الآية', 'To ayah')} value={value.to} min={value.from} max={max} onChange={(v) => onChange({ ...value, to: v })} />
    </div>
  )
}

function NumberBox({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="h-12 w-full rounded-2xl bg-card px-4 tabular-nums ring-1 ring-line outline-none focus:ring-night/40"
      />
    </label>
  )
}
