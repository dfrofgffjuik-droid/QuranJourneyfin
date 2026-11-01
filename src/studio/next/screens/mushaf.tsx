// المصحف الرقمي — the approved Phase 1 Mushaf design, hosted as a first-class
// screen of the Next-generation preview. It reuses the Phase 1 reader
// components as they are (src/studio/mushaf); only the host wiring lives here.
// Design only: no app store, no production Reader, no saved progress.
import { createContext, useContext, useState } from 'react'
import { pageOf } from '../../../lib/quran'
import '../../mushaf/mushaf-preview.css'
import { DesktopReader, type Tone } from '../../mushaf/desktop'
import { MobileReader, type MobileView } from '../../mushaf/mobile'
import { navTo, type Focus, type Go, type MushafNav } from '../../mushaf/page'
import { Chrome, Icon, toAr, useDevice, useProto } from '../core'
import { useSession } from '../session'
import { setActiveTask, useActiveTask } from '../taskNav'
import { actions, rangeAr, today, usePreview } from '../progress'
import { Confirm } from '../previewUi'
import { StorageNotice } from '../storageSafety'
import { surah } from '../../../lib/quran'
import { setReciteTarget } from './recite'
import { MushafIndex } from './mushafIndex'

/**
 * One navigation value (`nav`: page + optional exact ayah) shared by every frame.
 * `stage`: the surah / juz index first, then the reader (like opening a mushaf from its contents).
 */
export type MushafState = { nav: MushafNav; view: MobileView; tone: Tone; stage: 'index' | 'reader' }
export const MUSHAF_DEFAULT: MushafState = { nav: navTo(3), view: 'reading', tone: 'app', stage: 'index' }
/** Shared by the desktop and mobile frames so both show the same page and paper. */
export const MushafCtx = createContext<{ s: MushafState; set: (p: Partial<MushafState>) => void }>({ s: MUSHAF_DEFAULT, set: () => {} })

/** Opens the Digital Mushaf reader at an exact ayah (used by other screens, e.g. Similarities). */
export function useOpenInMushaf() {
  const { set } = useContext(MushafCtx)
  const { go } = useProto()
  return (s: number, a: number) => (set({ nav: navTo(pageOf(s, a), { s, a }), stage: 'reader', view: 'reading' }), go('mushaf'))
}

export function DigitalMushaf() {
  const device = useDevice()
  const { s, set } = useContext(MushafCtx)
  const { go: goScreen } = useProto()
  const setTone = (tone: Tone) => set({ tone })
  const back = () => set({ stage: 'index', view: 'reading', nav: navTo(s.nav.pg) })
  // Every entry point goes through navTo: manual page moves carry no focus (clearing any old one),
  // surah / juz moves carry their exact starting ayah, freshly stamped.
  const go: Go = (pg, focus) => set({ nav: navTo(pg, focus) })
  const open = (pg: number, focus?: Focus) => set({ nav: navTo(pg, focus), stage: 'reader', view: 'reading' })
  const recite = (rs: number, ra: number) => (setReciteTarget({ s: rs, a: ra }), goScreen('recite'))

  const ret = <><ReturnToJourney /><ReadingTaskBar /><RevisionTaskBar /></>

  if (s.stage === 'index') return <div className="relative h-full"><MushafIndex pg={s.nav.pg} onOpen={open} />{ret}</div>

  if (device === 'desktop')
    return (
      <Chrome dock={false}>
        <div className="mp relative h-full" data-tone={s.tone}>
          <DesktopReader nav={s.nav} onGo={go} tone={s.tone} setTone={setTone} auto onBack={back} onRecite={recite} />
          {ret}
        </div>
      </Chrome>
    )
  // Mobile reader is full-screen (no app dock), like the production Reader.
  return (
    <div className="mp absolute inset-0" data-tone={s.tone}>
      <div className="pointer-events-none absolute inset-x-0 top-12 z-[70] [&>*]:pointer-events-auto"><StorageNotice /></div>
      <MobileReader bare auto label="" pg={s.nav.pg} focus={s.nav.focus} view={s.view} tone={s.tone} setTone={setTone} onView={(view) => set({ view })} onGo={go} onBack={back} onRecite={recite} />
      {ret}
    </div>
  )
}

/** Opened from a reading / khatmah task: the explicit, confirmed way to record it, and back to the roadmap. */
function ReadingTaskBar() {
  const t = useActiveTask()
  const st = usePreview()
  const { go } = useProto()
  const [ask, setAsk] = useState(false)
  const [fail, setFail] = useState(false)
  if (!t || t.kind !== 'plan' || !t.planId || t.activity !== 'reading') return null
  const done = st.tasks.some((x) => x.planId === t.planId && x.date === t.date)
  const future = t.date > today()
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-40 z-[66] flex justify-center px-4">
      <div className="glass-panel pointer-events-auto flex max-w-[460px] flex-wrap items-center gap-2 rounded-[22px] px-3.5 py-2.5 text-[12.5px]" data-reading-task>
        <span className="min-w-0 flex-1"><b className="font-semibold">{t.name}</b> · ورد {rangeAr(t.unit, t.from, t.to)}{fail && <span className="block text-clay">لم يُسجَّل: الورد مسجّل أو لم يعد مستحقًّا.</span>}{future && <span className="block text-muted">ورد قادم · يُسجَّل في يومه</span>}</span>
        {done ? <span className="rounded-full bg-leaf/12 px-3 py-1.5 font-semibold text-leaf">سُجّلت القراءة</span> : !future && <button type="button" onClick={() => setAsk(true)} className="press h-8 rounded-full bg-night px-3 font-semibold text-parchment" data-complete-reading>أتممت الورد</button>}
        <button type="button" onClick={() => (setActiveTask(null), go('week'))} className="press h-8 rounded-full px-3 ring-1 ring-line">خريطة الأسبوع</button>
      </div>
      {ask && (
        <Confirm
          title="تأكيد إتمام الورد"
          body={`يُسجَّل ورد ${rangeAr(t.unit, t.from, t.to)} قراءةً فقط إذا قرأته فعلًا. القراءة لا تُحتسب حفظًا.`}
          confirm="سجّل القراءة"
          onCancel={() => setAsk(false)}
          onConfirm={() => (setFail(!actions.completeTask(t.planId!, t.date, { confirmedRead: true })), setAsk(false))}
        />
      )}
    </div>
  )
}

/** Opened from a page-based revision: which revision this page belongs to, and the way back to confirm it. */
function RevisionTaskBar() {
  const t = useActiveTask()
  const { go } = useProto()
  if (!t || t.activity !== 'revision') return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-40 z-[66] flex justify-center px-4">
      <div className="glass-panel pointer-events-auto flex max-w-[460px] flex-wrap items-center gap-2 rounded-[22px] px-3.5 py-2.5 text-[12.5px]" data-revision-bar>
        <span className="min-w-0 flex-1"><b className="font-semibold">مراجعة: {t.name}</b> · {rangeAr(t.unit, t.from, t.to)}</span>
        <button type="button" onClick={() => go('revision', t.taskId ?? 'scope')} className="press h-8 rounded-full bg-night px-3 font-semibold text-parchment" data-back-revision>العودة لتأكيد المراجعة</button>
      </div>
    </div>
  )
}

/** Shown when the Mushaf was opened from the Memorization Journey: back to the same passage and ayah. */
function ReturnToJourney() {
  const ses = useSession()
  const { go } = useProto()
  if (!ses.s.away) return null
  const { passage: p, cur } = ses.s
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[65] flex justify-center px-4">
      <button type="button" onClick={() => go('ayah')} className="press pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment shadow-[0_12px_30px_-10px_rgba(0,0,0,.5)]" data-return-journey>
        <Icon name="back" size={16} className="rotate-180" />
        العودة إلى رحلة الحفظ · {surah(p.s).ar} {toAr(cur)}
      </button>
    </div>
  )
}
