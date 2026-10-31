import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/ui'
import { useL } from '../lib/i18n'
import { navigate } from '../lib/router'
import { setState, useActive, useStore } from '../lib/store'
import { AppearanceButton } from '../components/Appearance'

/** Open the profile switcher from screens that render their own header. */
export const openProfiles = () => dispatchEvent(new Event('rafiqi:profiles'))

type NavItem = { to: string; route: string; icon: string; ar: string; en: string }

const ADULT: NavItem[] = [
  { to: '/', route: '', icon: 'home', ar: 'الرئيسية', en: 'Home' },
  { to: '/quran', route: 'quran', icon: 'book', ar: 'المصحف', en: 'Quran' },
  { to: '/plan', route: 'plan', icon: 'calendar', ar: 'الخطط', en: 'Plans' },
  { to: '/recite', route: 'recite', icon: 'mic', ar: 'التسميع', en: 'Recite' },
  { to: '/journey', route: 'journey', icon: 'path', ar: 'رحلتي', en: 'Journey' },
]
const KIDS: NavItem[] = [
  { to: '/', route: '', icon: 'home', ar: 'بيتي', en: 'Home' },
  { to: '/kids/letters', route: 'kids', icon: 'letters', ar: 'الحروف', en: 'Letters' },
  { to: '/kids/surahs', route: 'kids-surahs', icon: 'book', ar: 'سوري', en: 'My surahs' },
  { to: '/recite', route: 'recite', icon: 'mic', ar: 'أسمِع', en: 'Recite' },
  { to: '/journey', route: 'journey', icon: 'star', ar: 'نجومي', en: 'My stars' },
]
const GUIDE: NavItem[] = [
  { to: '/', route: '', icon: 'users', ar: 'المتعلّمون', en: 'Learners' },
  { to: '/quran', route: 'quran', icon: 'book', ar: 'المصحف', en: 'Quran' },
  { to: '/settings', route: 'settings', icon: 'settings', ar: 'الإعدادات', en: 'Settings' },
]

export function Shell({ children, focus, route }: { children: ReactNode; focus: boolean; route: string }) {
  const { L } = useL()
  const mode = useStore((s) => s.mode)
  const active = useActive()
  const [switcher, setSwitcher] = useState(false)
  const themeBtn = <AppearanceButton className="text-night/70 hover:bg-night/5" />
  // Screens with their own top header (Home hero, Reader tabs) on mobile.
  const bare = (route === '' && mode !== 'guide' && active?.path !== 'kids') || route === 'surah'
  useEffect(() => {
    const open = () => setSwitcher(true)
    addEventListener('rafiqi:profiles', open)
    return () => removeEventListener('rafiqi:profiles', open)
  }, [])
  const items = mode === 'guide' ? GUIDE : active?.path === 'kids' ? KIDS : ADULT
  const current = route === 'kids' && location.hash.includes('surahs') ? 'kids-surahs' : route === 'surah' ? 'quran' : route === 'learner' || route === 'review' ? '' : route

  if (focus) return <div className="app-backdrop min-h-[100dvh] text-night">{children}</div>

  return (
    <div className="app-backdrop min-h-[100dvh] text-night md:flex">
      {/* Desktop side rail */}
      <aside className="app-backdrop sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-e border-line/70 px-4 py-6 md:flex">
        <a href="#/" className="mb-8 block px-3">
          <Logo />
        </a>
        <nav className="flex flex-1 flex-col gap-1" aria-label={L('التنقل الرئيسي', 'Main navigation')}>
          {items.map((it) => (
            <a
              key={it.to}
              href={`#${it.to}`}
              aria-current={current === it.route ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-3 text-[15px] transition ${current === it.route ? 'bg-night font-medium text-parchment' : 'text-night/70 hover:bg-night/5'}`}
            >
              <Icon name={it.icon} />
              {L(it.ar, it.en)}
            </a>
          ))}
        </nav>
        <button type="button" onClick={() => setSwitcher(true)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-start hover:bg-night/5">
          <Avatar name={mode === 'guide' ? L('مشرف', 'Guide') : (active?.name ?? '')} kid={active?.path === 'kids' && mode !== 'guide'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{mode === 'guide' ? L('ولي الأمر / المعلّم', 'Parent / teacher') : active?.name}</span>
            <span className="block text-xs text-muted">{L('تبديل الملف', 'Switch profile')}</span>
          </span>
        </button>
        <div className="mt-1 flex items-center">
          {mode !== 'guide' && (
            <a href="#/settings" className="flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted hover:bg-night/5">
              <Icon name="settings" size={20} />
              {L('الإعدادات', 'Settings')}
            </a>
          )}
          {themeBtn}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className={`sticky top-0 z-30 h-16 items-center justify-between border-b border-line/40 bg-parchment/55 px-5 backdrop-blur-xl md:hidden ${bare ? 'hidden' : 'flex'}`}>
          <a href="#/">
            <Logo compact />
          </a>
          <div className="flex items-center gap-1">
            {themeBtn}
            {mode !== 'guide' && (
              <a href="#/settings" aria-label={L('الإعدادات', 'Settings')} className="flex h-10 w-10 items-center justify-center rounded-full text-night/70 hover:bg-night/5">
                <Icon name="settings" size={20} />
              </a>
            )}
            <button type="button" onClick={() => setSwitcher(true)} aria-label={L('تبديل الملف', 'Switch profile')}>
              <Avatar name={mode === 'guide' ? L('مشرف', 'Guide') : (active?.name ?? '')} kid={active?.path === 'kids' && mode !== 'guide'} />
            </button>
          </div>
        </div>

        <main className={`mx-auto w-full max-w-5xl px-5 pb-32 md:px-10 md:pb-16 md:pt-10 ${bare ? 'pt-0' : 'pt-6'}`}>{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      {/* Mobile floating dock (Sakina) */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden" aria-label={L('التنقل الرئيسي', 'Main navigation')}>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/92 p-1.5 shadow-[0_14px_34px_-12px_rgba(16,24,40,.38)] ring-1 ring-line backdrop-blur">
          {items.map((it) => {
            const on = current === it.route
            return (
              <a key={it.to} href={`#${it.to}`} aria-current={on ? 'page' : undefined} aria-label={L(it.ar, it.en)} title={L(it.ar, it.en)} className={`flex h-12 w-12 items-center justify-center rounded-full transition ${on ? 'bg-night text-parchment' : 'text-muted hover:text-night'}`}>
                <Icon name={it.icon} size={21} />
              </a>
            )
          })}
        </div>
      </nav>

      <ProfileSwitcher open={switcher} onClose={() => setSwitcher(false)} />
    </div>
  )
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex ${compact ? 'h-9 w-9' : 'h-10 w-10'} items-center justify-center rounded-[12px] ${light ? 'bg-white/15 text-white' : 'bg-gold text-white'}`} aria-hidden>
        <Icon name="book" size={compact ? 18 : 20} />
      </span>
      <span className="leading-none">
        <span dir="rtl" className={`block font-arabic-display ${compact ? 'text-lg' : 'text-xl'} font-bold ${light ? 'text-parchment' : 'text-night'}`}>
          القرآن رفيقي
        </span>
        {!compact && <span className={`mt-1 block text-[11px] tracking-[0.18em] ${light ? 'text-parchment/60' : 'text-muted'}`}>AL-QURAN RAFIQI</span>}
      </span>
    </span>
  )
}

export function Avatar({ name, kid = false, size = 40 }: { name: string; kid?: boolean; size?: number }) {
  const ch = [...(name.trim() || '؟')][0]
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${kid ? 'bg-sky/15 text-sky' : 'bg-gold-soft text-night'}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {ch}
    </span>
  )
}

function ProfileSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useL()
  const profiles = useStore((s) => s.profiles)
  const activeId = useStore((s) => s.activeId)
  const mode = useStore((s) => s.mode)
  const pick = (id: string) => {
    setState((s) => ({ ...s, activeId: id, mode: 'learner' }))
    onClose()
    navigate('/')
  }
  return (
    <Sheet open={open} onClose={onClose} title={L('من يتعلّم الآن؟', 'Who is learning now?')}>
      <div className="space-y-2">
        {profiles.map((p) => (
          <button key={p.id} type="button" onClick={() => pick(p.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-start ring-1 ${mode === 'learner' && p.id === activeId ? 'bg-card ring-night' : 'bg-card/60 ring-line hover:ring-night/30'}`}>
            <Avatar name={p.name} kid={p.path === 'kids'} />
            <span className="flex-1">
              <span className="block font-medium">{p.name}</span>
              <span className="block text-xs text-muted">{p.path === 'kids' ? L('مسار تعلّم القراءة', 'Learning to read') : p.path === 'reading' ? L('مسار التلاوة', 'Reading path') : L('مسار الحفظ', 'Memorisation path')}</span>
            </span>
            {mode === 'learner' && p.id === activeId && <Icon name="check" className="text-leaf" />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setState((s) => ({ ...s, mode: 'guide' }))
            onClose()
            navigate('/')
          }}
          className={`flex w-full items-center gap-3 rounded-2xl p-3 text-start ring-1 ${mode === 'guide' ? 'bg-card ring-night' : 'bg-card/60 ring-line hover:ring-night/30'}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-night text-parchment">
            <Icon name="users" size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-medium">{L('ولي الأمر / المعلّم', 'Parent / teacher')}</span>
            <span className="block text-xs text-muted">{L('متابعة المتعلّمين والتكليفات والتسميع', 'Learners, assignments, recitation reviews')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/settings?add=1')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-3 text-sm text-muted hover:text-night"
        >
          <Icon name="plus" size={18} />
          {L('إضافة متعلّم', 'Add a learner')}
        </button>
      </div>
    </Sheet>
  )
}
