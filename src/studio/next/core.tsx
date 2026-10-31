// Shared prototype plumbing for the Next-generation preview (design only).
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { loadMushaf } from '../../lib/quran'
import { I } from '../kit'

/** Production icon set + Studio extras (info, lock, leaf…), same 24px stroke style. */
export function Icon({ name, size = 22, className = '', fill = false }: { name: string; size?: number; className?: string; fill?: boolean }) {
  return <I n={name} s={size} className={className} fill={fill} />
}

export type ScreenId = 'home' | 'mushaf' | 'ayah' | 'similar' | 'plans' | 'revision' | 'recite' | 'map' | 'library' | 'rewards' | 'kids' | 'week' | 'azkar' | 'azkar-list'
export type Device = 'mobile' | 'desktop'
export type Nav = { screen: ScreenId; param?: string }

type Ctx = { nav: Nav; go: (s: ScreenId, param?: string) => void; device: Device }
export const ProtoCtx = createContext<Ctx>({ nav: { screen: 'home' }, go: () => {}, device: 'mobile' })
export const useProto = () => useContext(ProtoCtx)
export const useDevice = () => useContext(ProtoCtx).device

export const toAr = (n: number | string) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

/** Every demonstration number in the preview carries this badge. */
export function Demo({ className = '', children }: { className?: string; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky ${className}`} title="Demonstration data — not real progress">
      <Icon name="info" size={11} />
      {children ?? 'بيانات تجريبية'}
    </span>
  )
}

/** Labelled stand-in for religious content that has no verified source in the repo yet. */
export function Placeholder({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[18px] border border-dashed border-clay/40 bg-clay/[.04] p-4 ${className}`}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-clay">
        <Icon name="shield" size={13} />
        محتوى مؤقّت للتصميم · ليس نصًّا معتمدًا
      </p>
      <div className="text-[13px] leading-relaxed text-muted">{children}</div>
    </div>
  )
}

/** Scales a fixed artboard to its container width. */
export function Fit({ w, h, children, max = 1 }: { w: number; h: number; children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(max)
  useLayoutEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(() => setK(Math.min(max, el.clientWidth / w)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, max])
  return (
    <div ref={ref} className="w-full">
      <div className="relative mx-auto" style={{ width: w * k, height: h * k }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${k})` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export type Look = { palette: string; dark: boolean }
/** A frame that carries its own copy of the production appearance attributes. */
export function Themed({ look, kids = false, className = '', children }: { look: Look; kids?: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      className={`pv-root app-backdrop text-night ${className}`}
      data-theme={look.dark ? 'dark' : undefined}
      data-palette={look.palette === 'garden' ? undefined : look.palette}
      data-kids={kids ? '' : undefined}
      dir="rtl"
      lang="ar"
      style={{ backgroundAttachment: 'scroll', colorScheme: look.dark ? 'dark' : 'light' }}
    >
      {children}
    </div>
  )
}

/** iPhone-sized artboard; the status bar lives inside the themed frame so it follows dark mode. */
export function PhoneShell({ look, kids = false, children }: { look: Look; kids?: boolean; children: ReactNode }) {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[54px] shadow-[0_0_0_10px_#15181c,0_0_0_11px_#2a2e34,0_40px_80px_-30px_rgba(0,0,0,.55)]">
      <Themed look={look} kids={kids} className="relative h-full overflow-hidden">
        {children}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex h-12 items-center justify-between px-8 pt-1 text-[14px] font-semibold text-night" dir="ltr">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2.5 h-[30px] w-[118px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1.5">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x=".5" y=".5" width="21" height="10" rx="3" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="7" rx="1.6" fill="currentColor" /></svg>
          </span>
        </div>
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-[70] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-night/80" />
      </Themed>
    </div>
  )
}

export const NAV: { id: ScreenId; icon: string; ar: string; dock?: boolean }[] = [
  { id: 'home', icon: 'home', ar: 'رحلتك اليوم', dock: true },
  { id: 'mushaf', icon: 'book', ar: 'المصحف', dock: true },
  { id: 'ayah', icon: 'sparkle', ar: 'رحلة الحفظ', dock: true },
  { id: 'azkar', icon: 'sun', ar: 'أذكاري', dock: true },
  { id: 'plans', icon: 'target', ar: 'خططي' },
  { id: 'week', icon: 'calendar', ar: 'خطة الأسبوع' },
  { id: 'revision', icon: 'repeat', ar: 'المراجعة' },
  { id: 'recite', icon: 'mic', ar: 'التلاوة والتجويد' },
  { id: 'rewards', icon: 'gift', ar: 'المكافآت والإنجازات' },
  { id: 'library', icon: 'layers', ar: 'مكتبة إنجازاتي' },
  { id: 'map', icon: 'path', ar: 'خريطة الرحلة' },
  { id: 'kids', icon: 'letters', ar: 'عالم الأطفال' },
]

const active = (s: ScreenId) => (s === 'azkar-list' ? 'azkar' : s)

/** App chrome matching the production Shell: desktop side rail, mobile floating dock. */
export function Chrome({ children, bare = false, dock = true }: { children: ReactNode; bare?: boolean; dock?: boolean }) {
  const { nav, go, device } = useProto()
  if (device === 'desktop')
    return (
      <div className="flex h-full">
        <aside className="flex w-60 shrink-0 flex-col border-e border-line/70 px-4 py-6">
          <div className="mb-7 flex items-center gap-2.5 px-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gold text-white"><Icon name="book" size={20} /></span>
            <span className="leading-none"><span className="block font-arabic-display text-xl font-bold">القرآن رفيقي</span><span className="mt-1 block text-[11px] tracking-[0.18em] text-muted">AL-QURAN RAFIQI</span></span>
          </div>
          <nav className="flex flex-1 flex-col gap-1" aria-label="التنقل">
            {NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={active(nav.screen) === n.id ? 'page' : undefined} className={`press flex items-center gap-3 rounded-full px-4 py-2.5 text-start text-[14.5px] ${active(nav.screen) === n.id ? 'bg-night font-medium text-parchment' : 'text-night/70 hover:bg-night/5'}`}>
                <Icon name={n.icon} size={20} />
                {n.ar}
              </button>
            ))}
          </nav>
          <p className="px-3 text-[11px] leading-relaxed text-muted">معاينة تصميم · لا تتصل ببيانات التطبيق</p>
        </aside>
        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    )
  return (
    <div className="relative h-full">
      <main className={`no-scrollbar h-full overflow-y-auto ${bare ? '' : 'pt-12'} ${dock ? 'pb-28' : ''}`}>{children}</main>
      {dock && (
        <nav className="absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-6" aria-label="التنقل">
          <div className="glass-panel flex items-center gap-1 rounded-full p-1.5">
            {NAV.filter((n) => n.dock).map((n) => {
              const on = active(nav.screen) === n.id
              return (
                <button key={n.id} type="button" onClick={() => go(n.id)} aria-label={n.ar} aria-current={on ? 'page' : undefined} className={`press flex h-12 w-12 items-center justify-center rounded-full ${on ? 'bg-night text-parchment' : 'text-muted hover:text-night'}`}>
                  <Icon name={n.icon} size={21} />
                </button>
              )
            })}
            <button type="button" onClick={() => go('plans')} aria-label="المزيد" className={`press flex h-12 w-12 items-center justify-center rounded-full ${NAV.some((n) => !n.dock && n.id === active(nav.screen)) ? 'bg-night text-parchment' : 'text-muted hover:text-night'}`}>
              <Icon name="more" size={21} />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

/** Screen heading used across new screens (title + optional subtitle/action). */
export function Head({ title, sub, action, back }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; back?: ScreenId }) {
  const { go, device } = useProto()
  return (
    <header className={`flex items-start gap-3 ${device === 'desktop' ? 'mb-8' : 'mb-5'}`}>
      {back && (
        <button type="button" onClick={() => go(back)} aria-label="رجوع" className="press -ms-1 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-night/5">
          <Icon name="back" className="rotate-180" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={`font-arabic-display font-bold leading-tight ${device === 'desktop' ? 'text-[30px]' : 'text-[24px]'}`}>{title}</h1>
        {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  )
}

/** Mini sub-navigation for the secondary screens on mobile (reached from the dock's "more"). */
export function MoreTabs() {
  const { nav, go, device } = useProto()
  if (device === 'desktop') return null
  return (
    <div className="no-scrollbar -mx-5 mb-5 flex gap-1.5 overflow-x-auto px-5">
      {NAV.filter((n) => !n.dock).map((n) => (
        <button key={n.id} type="button" onClick={() => go(n.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] ${nav.screen === n.id ? 'bg-night text-parchment' : 'bg-card text-night/75 ring-1 ring-line'}`}>
          <Icon name={n.icon} size={15} />
          {n.ar}
        </button>
      ))}
    </div>
  )
}

/** One verified ayah (KFGQPC Hafs, Tanzil fallback) — never hand-typed. */
export function useAyahText(s: number, a: number) {
  const [t, setT] = useState<{ text: string; hafs: boolean } | null>(null)
  useEffect(() => {
    loadMushaf(s).then((r) => setT({ text: r.ayat[a - 1], hafs: r.hafs }))
  }, [s, a])
  return t
}
