import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Segmented } from '../components/ui'
import { Logo } from '../app/Shell'
import { useL } from '../lib/i18n'
import { CalendarArt, MicArt, MushafArt } from '../components/Illustrations'
import { addPlan, newPlan } from '../lib/plans'
import { navigate } from '../lib/router'
import { addKnown, newProfile, setState, useStore, type LearningPath } from '../lib/store'
import { surah } from '../lib/quran'
import { today } from '../lib/date'

type Choice = 'hifz' | 'reading' | 'guide'
const STARTS = [
  { s: 114, ar: 'من سورة الناس، صعودًا في جزء عمّ', en: 'From An-Nas, up through Juz ʿAmma' },
  { s: 1, ar: 'سورة الفاتحة', en: 'Al-Fatiha' },
  { s: 67, ar: 'سورة الملك', en: 'Al-Mulk' },
  { s: 18, ar: 'سورة الكهف', en: 'Al-Kahf' },
  { s: 2, ar: 'من أول المصحف: البقرة', en: 'From the start: Al-Baqarah' },
]
const KNOWN = [1, 114, 113, 112, 111, 110, 109, 108, 103]

export function Onboarding() {
  const { L, N, A, lang } = useL()
  const hasProfiles = useStore((s) => s.profiles.length > 0)
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<Choice>('hifz')
  const [kind, setKind] = useState<'adult' | 'child'>('adult')
  const [readingLevel, setReadingLevel] = useState<'letters' | 'reads'>('reads')
  const [name, setName] = useState('')
  const [daily, setDaily] = useState(3)
  const [minutes, setMinutes] = useState(10)
  const [start, setStart] = useState(114)
  const [known, setKnown] = useState<number[]>([])

  const path: LearningPath = choice === 'reading' ? (readingLevel === 'letters' ? 'kids' : 'reading') : 'hifz'
  const steps = choice === 'guide' ? ['welcome', 'path', 'guide'] : choice === 'reading' ? ['welcome', 'path', 'who', 'goal'] : ['welcome', 'path', 'who', 'goal', 'start']
  const at = steps[step]
  const next = () => setStep((x) => Math.min(steps.length - 1, x + 1))
  const prev = () => setStep((x) => Math.max(0, x - 1))

  const finish = () => {
    if (choice === 'guide') {
      setState((s) => ({ ...s, onboarded: true, mode: 'guide', guideName: name.trim() }))
      navigate('/')
      return
    }
    let p = newProfile({ name: name.trim() || L('أنا', 'Me'), kind, path, dailyAyat: daily, dailyMinutes: minutes })
    if (path === 'hifz') {
      for (const s of known) p = addKnown(p, s, 1, surah(s).ayat)
      // If the chosen start is already known, the plan still targets it (user can change later).
      const target = start === 114 ? firstUnknownFromNas(known) : start
      p = addPlan(p, newPlan({ kind: 'hifz', start: [target, 1], end: [target, surah(target).ayat], daily }), true)
    }
    setState((s) => ({ ...s, onboarded: true, mode: 'learner', profiles: [...s.profiles, p], activeId: p.id }))
    navigate('/')
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-parchment text-night">
      <div className="hero-fade absolute inset-x-0 top-0 h-[62vh]" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-6 pt-6">
        <div className="flex items-center justify-between text-white">
          {step > 0 ? (
            <button type="button" onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur" aria-label={L('رجوع', 'Back')}>
              <Icon name="back" className={lang === 'ar' ? 'rotate-180' : ''} />
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
          <button type="button" onClick={() => setState((s) => ({ ...s, lang: s.lang === 'ar' ? 'en' : 'ar' }))} className="rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur">
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div key={at} className={`rise flex flex-1 flex-col ${at === 'welcome' ? 'pt-6' : 'pt-6'}`}>
          {at === 'welcome' && (
            <div className="flex flex-1 flex-col">
              {/* Showcase: what the app holds */}
              <div className="flex flex-1 items-center justify-center py-6">
                <div className="relative w-full max-w-[19rem]">
                  <div className="mx-auto h-44 w-56 rounded-t-[2.4rem] border-[7px] border-b-0 border-[#0f1a14] bg-[#2a5a3e]/60" aria-hidden />
                  <div className="absolute inset-x-0 top-10 flex items-center justify-center gap-2 rounded-[22px] bg-card p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,.45)] ring-1 ring-line">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-parchment"><MushafArt size={44} /></span>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-parchment"><MicArt size={44} /></span>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-parchment"><CalendarArt size={44} /></span>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-soft text-[15px] font-bold text-gold">{N(114)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[30px] bg-card px-6 pb-6 pt-8 text-center shadow-[0_-10px_40px_-24px_rgba(0,0,0,.35)] ring-1 ring-line">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                  <Icon name="book" />
                </span>
                <h1 className="mt-4 text-[1.9rem] font-bold leading-[1.25]">{L('رفيقك اليومي مع القرآن، خطوة بخطوة', 'Your daily Quran companion, step by step')}</h1>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {L('قراءة بالرسم العثماني، وحفظ بالإخفاء التدريجي، ومراجعة تأتي في وقتها.', 'Uthmani reading, progressive memorisation, and revision that comes back on time.')}
                </p>
                <ul className="mt-5 space-y-2 text-start text-[13.5px] text-night/80">
                  {[
                    ['heart', L('مجاني، بلا إعلانات ولا اشتراكات', 'Free. No ads, no subscriptions')],
                    ['shield', L('تقدّمك محفوظ على جهازك، ولا حاجة لحساب', 'Progress stays on your device. No account needed')],
                  ].map(([ic, t]) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Icon name={ic} size={17} className="text-gold" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-6 w-full" onClick={next}>
                  {L('لنبدأ', 'Let’s begin')}
                </Button>
                {hasProfiles && (
                  <Button size="lg" variant="outline" className="mt-2.5 w-full" onClick={() => setState((s) => ({ ...s, onboarded: true, activeId: s.activeId ?? s.profiles[0].id }))}>
                    {L('العودة إلى ملفي', 'Back to my profile')}
                  </Button>
                )}
                <p className="mt-4 text-[12px] text-muted">{L('نص المصحف من مصادر موثّقة: تنزيل ومجمع الملك فهد.', 'Quran text from verified sources: Tanzil and the King Fahd Complex.')}</p>
              </div>
            </div>
          )}

          {at === 'path' && (
            <Step title={L('ماذا تريد أن تفعل؟', 'What would you like to do?')} sub={L('يمكنك تغيير ذلك لاحقًا.', 'You can change this later.')}>
              <div className="space-y-3">
                <Option on={choice === 'hifz'} onClick={() => setChoice('hifz')} icon="sprout" title={L('أحفظ القرآن وأراجعه', 'Memorise and revise')} body={L('ورد يومي، وإخفاء تدريجي للكلمات، ومراجعة متباعدة', 'Daily portion, progressive word hiding, spaced revision')} />
                <Option on={choice === 'reading'} onClick={() => setChoice('reading')} icon="book" title={L('أتعلّم قراءة القرآن', 'Learn to read the Quran')} body={L('من الحروف والحركات إلى قراءة السور القصيرة', 'From letters and harakat to short surahs')} />
                <Option on={choice === 'guide'} onClick={() => setChoice('guide')} icon="users" title={L('أنا ولي أمر أو معلّم', 'I’m a parent or teacher')} body={L('تابع المتعلّمين، وكلّفهم بالحفظ والمراجعة، واستمع لتسميعهم', 'Follow learners, assign portions, listen to recitations')} />
              </div>
              <Next onClick={next} label={L('التالي', 'Next')} />
            </Step>
          )}

          {at === 'who' && (
            <Step title={L('من سيتعلّم؟', 'Who is learning?')}>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'adult', label: <span className="text-night">{L('أنا (بالغ)', 'Me (adult)')}</span> },
                  { value: 'child', label: <span className="text-night">{L('طفل', 'A child')}</span> },
                ]}
              />
              {choice === 'reading' && (
                <div className="mt-6 space-y-3">
                  <Option on={readingLevel === 'letters'} onClick={() => setReadingLevel('letters')} icon="letters" title={L('يبدأ من الحروف', 'Starting with letters')} body={L('الحروف وأصواتها، والحركات، ووصل الحروف', 'Letters and sounds, harakat, joining')} />
                  <Option on={readingLevel === 'reads'} onClick={() => setReadingLevel('reads')} icon="book" title={L('يقرأ، ويريد التلاوة بانتظام', 'Can read; wants regular recitation')} body={L('ورد تلاوة يومي مع الاستماع لقارئ متقن', 'A daily reading portion, listening to a skilled reciter')} />
                </div>
              )}
              <label className="mt-8 block">
                <span className="text-sm text-muted">{kind === 'child' ? L('اسم الطفل (اختياري)', 'Child’s name (optional)') : L('اسمك (اختياري)', 'Your name (optional)')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="mt-2 h-14 w-full rounded-2xl bg-parchment px-5 text-lg text-night outline-none ring-1 ring-line placeholder:text-muted/60 focus:ring-gold" placeholder={L('مثال: عبد الله', 'e.g. Abdullah')} />
              </label>
              <Next onClick={next} label={L('التالي', 'Next')} />
            </Step>
          )}

          {at === 'goal' && (
            <Step title={L('هدف يومي تستطيع الاستمرار عليه', 'A daily goal you can keep')} sub={L('القليل الدائم خير من الكثير المنقطع.', 'A little, consistently, beats a lot, occasionally.')}>
              {path === 'hifz' ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 3, 5, 10].map((n) => (
                    <Option key={n} on={daily === n} onClick={() => setDaily(n)} title={n === 1 ? L('آية واحدة', '1 ayah') : A(n)} body={n === 1 ? L('بداية لطيفة', 'Gentle start') : n === 3 ? L('موصى به', 'Recommended') : n === 5 ? L('همّة عالية', 'Ambitious') : L('للمتمرّسين', 'Experienced')} compact />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[5, 10, 15, 20].map((n) => (
                    <Option key={n} on={minutes === n} onClick={() => setMinutes(n)} title={`${N(n)} ${L('دقائق', 'minutes')}`} body={n === 10 ? L('موصى به', 'Recommended') : n === 5 ? L('بداية لطيفة', 'Gentle start') : ''} compact />
                  ))}
                </div>
              )}
              {path === 'hifz' ? <Next onClick={next} label={L('التالي', 'Next')} /> : <Next onClick={finish} label={L('ابدأ', 'Start')} />}
            </Step>
          )}

          {at === 'start' && (
            <Step title={L('من أين تبدأ الحفظ؟', 'Where do you start?')}>
              <div className="space-y-2">
                {STARTS.map((x) => (
                  <Option key={x.s} on={start === x.s} onClick={() => setStart(x.s)} title={L(x.ar, x.en)} compact />
                ))}
              </div>
              <p className="mt-8 text-sm text-muted">{L('هل تحفظ شيئًا من هذه السور؟ سنضيفها إلى المراجعة.', 'Already know any of these? We’ll add them to revision.')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {KNOWN.map((s) => {
                  const on = known.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => setKnown((k) => (on ? k.filter((x) => x !== s) : [...k, s]))} className={`rounded-full px-4 py-2 text-sm ring-1 transition ${on ? 'bg-gold text-white ring-gold' : 'ring-line hover:ring-gold/50'}`}>
                      {lang === 'ar' ? surah(s).ar : surah(s).en}
                    </button>
                  )
                })}
              </div>
              <Next onClick={finish} label={L('ابدأ رحلتي', 'Start my journey')} />
            </Step>
          )}

          {at === 'guide' && (
            <Step title={L('مرحبًا بك مشرفًا', 'Welcome, guide')} sub={L('ستضيف المتعلّمين من لوحة المتابعة. كل البيانات تبقى على هذا الجهاز.', 'You’ll add learners from your dashboard. Everything stays on this device.')}>
              <label className="block">
                <span className="text-sm text-muted">{L('اسمك (اختياري)', 'Your name (optional)')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="mt-2 h-14 w-full rounded-2xl bg-parchment px-5 text-lg text-night outline-none ring-1 ring-line focus:ring-gold" placeholder={L('مثال: أم يوسف', 'e.g. Umm Yusuf')} />
              </label>
              <Next onClick={finish} label={L('افتح لوحة المتابعة', 'Open dashboard')} />
            </Step>
          )}
        </div>
      </div>
    </div>
  )
}

function firstUnknownFromNas(known: number[]) {
  for (let s = 114; s >= 78; s--) if (!known.includes(s)) return s
  return 77
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-1 pb-6 text-white">
        <h2 className="text-[1.9rem] font-bold leading-tight">{title}</h2>
        {sub && <p className="mt-2 text-white/80">{sub}</p>}
      </div>
      <div className="flex flex-1 flex-col rounded-[30px] bg-card p-5 shadow-[0_-10px_40px_-24px_rgba(0,0,0,.35)] ring-1 ring-line">{children}</div>
    </div>
  )
}

function Next({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-auto pt-8">
      <Button size="lg" className="w-full" onClick={onClick}>
        {label}
      </Button>
    </div>
  )
}

function Option({ on, onClick, icon, title, body, compact }: { on: boolean; onClick: () => void; icon?: string; title: string; body?: string; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`flex w-full items-center gap-4 rounded-3xl text-start ring-1 transition ${compact ? 'px-5 py-4' : 'p-5'} ${on ? 'bg-gold-soft/60 text-night ring-gold' : 'bg-parchment ring-line hover:ring-gold/40'}`}>
      {icon && (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-gold text-white' : 'bg-card text-gold ring-1 ring-line'}`}>
          <Icon name={icon} />
        </span>
      )}
      <span className="flex-1">
        <span className="block text-[17px] font-semibold">{title}</span>
        {body && <span className="mt-0.5 block text-sm text-muted">{body}</span>}
      </span>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ${on ? 'bg-gold text-white ring-gold' : 'ring-line'}`}>{on && <Icon name="check" size={14} />}</span>
    </button>
  )
}
