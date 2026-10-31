import { lazy, Suspense, useEffect } from 'react'
import { useRoute } from './lib/router'
import { useActive, useStore } from './lib/store'
import { useL } from './lib/i18n'
import { useApplyTheme } from './lib/theme'
import { Tafsir } from './screens/Tafsir'
import { Shell } from './app/Shell'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Reader } from './screens/Reader'
import { Memorize } from './screens/Memorize'
import { Revise } from './screens/Revise'
import { PlanDetail, PlanEditor, PlanScreen } from './screens/Plan'
import { Recite } from './screens/Recite'
import { Journey } from './screens/Journey'
import { Settings } from './screens/Settings'
import { KidsHome, KidsLetters, KidsLetter, KidsHarakat, KidsJoining, KidsReading, KidsSurahs, KidsSurah } from './screens/Kids'
import { GuideHome, GuideLearner, GuideReview } from './screens/Guide'

const DevLab = lazy(() => import('./dev/DevLab'))
const DesignStudio = lazy(() => import('./studio/Studio'))

// Full-screen focus routes: no navigation chrome during a session.
const FOCUS = new Set(['memorize', 'revise', 'kids-surah'])

export default function App() {
  const { parts, q } = useRoute()
  const onboarded = useStore((s) => s.onboarded)
  const mode = useStore((s) => s.mode)
  const active = useActive()
  const { lang, dir } = useL()
  // Studio and dev lab have their own palettes.
  useApplyTheme(parts[0] !== 'dev' && parts[0] !== 'design-studio' && !/\/design-studio\/?$/.test(location.pathname))

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    document.title = lang === 'ar' ? 'القرآن رفيقي' : 'Al-Quran Rafiqi'
  }, [lang, dir])

  if (parts[0] === 'dev')
    return (
      <div dir="ltr" lang="en" className="bg-paper text-ink">
        <Suspense fallback={null}>
          <DevLab />
        </Suspense>
      </div>
    )

  // Design exploration lives outside the real app shell and never reads its store.
  if (parts[0] === 'design-studio' || /\/design-studio\/?$/.test(location.pathname))
    return (
      <Suspense fallback={null}>
        <DesignStudio />
      </Suspense>
    )

  if (!onboarded || (mode === 'learner' && !active)) return <Onboarding />

  const r = parts[0] ?? ''
  const isKid = active?.path === 'kids'
  let screen: React.ReactNode
  let focus = FOCUS.has(r)

  if (mode === 'guide' && !['settings', 'surah', 'quran', 'tafsir', 'dev'].includes(r)) {
    screen = r === 'learner' && parts[1] ? <GuideLearner id={parts[1]} /> : r === 'review' && parts[1] ? <GuideReview id={parts[1]} /> : <GuideHome />
  } else
    switch (r) {
      case '':
        screen = isKid ? <KidsHome /> : <Home />
        break
      case 'quran':
        screen = <Library />
        break
      case 'surah':
        screen = <Reader n={Number(parts[1]) || 1} focusAyah={Number(q.a) || null} planId={q.plan} />
        break
      case 'tafsir':
        screen = <Tafsir s={Number(parts[1]) || 1} a={Number(parts[2]) || 1} />
        break
      case 'memorize':
        screen = <Memorize q={q} />
        break
      case 'revise':
        screen = <Revise q={q} />
        break
      case 'plan':
        screen = parts[1] === 'new' ? <PlanEditor key={`new-${q.kind ?? ''}`} kind={q.kind} /> : parts[1] && parts[2] === 'edit' ? <PlanEditor key={parts[1]} id={parts[1]} /> : parts[1] ? <PlanDetail id={parts[1]} /> : <PlanScreen />
        break
      case 'recite':
        screen = <Recite q={q} />
        break
      case 'journey':
        screen = <Journey />
        break
      case 'settings':
        screen = <Settings />
        break
      case 'kids':
        screen =
          parts[1] === 'letters' ? (
            parts[2] ? <KidsLetter letter={decodeURIComponent(parts[2])} /> : <KidsLetters />
          ) : parts[1] === 'harakat' ? (
            <KidsHarakat />
          ) : parts[1] === 'joining' ? (
            <KidsJoining />
          ) : parts[1] === 'reading' ? (
            <KidsReading />
          ) : parts[1] === 'surahs' ? (
            <KidsSurahs />
          ) : (
            <KidsHome />
          )
        break
      case 'kids-surah':
        screen = <KidsSurah n={Number(parts[1]) || 114} />
        focus = true
        break
      default:
        screen = isKid ? <KidsHome /> : <Home />
    }

  return (
    <Shell focus={focus} route={r}>
      {screen}
    </Shell>
  )
}
