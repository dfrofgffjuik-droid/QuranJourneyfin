import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { AyahMark, SurahBadge } from '../components/Mushaf'
import { RangePicker, type Range } from '../components/RangePicker'
import { Bar, Button, Card, Empty, Pill, ScreenHeader, Section, Segmented, Sheet } from '../components/ui'
import { Avatar } from '../app/Shell'
import { useL } from '../lib/i18n'
import { addPlan, hifzPlanOf, newPlan, rangeText } from '../lib/plans'
import { navigate } from '../lib/router'
import { loadSurah, surah, SURAHS, words } from '../lib/quran'
import { getAudio } from '../lib/idb'
import { activeDays, memorizedCount, newProfile, revisionTasks, sampleLearners, setState, todaysHifz, uid, useStore, type Assignment, type LearningPath, type Profile } from '../lib/store'
import { addDays, today } from '../lib/date'
import { rangeLabel } from './Home'

export function GuideHome() {
  const { L, N, lang } = useL()
  const profiles = useStore((s) => s.profiles)
  const subs = useStore((s) => s.submissions)
  const name = useStore((s) => s.guideName)
  const assignments = useStore((s) => s.assignments)
  const [adding, setAdding] = useState(false)
  const pending = subs.filter((s) => !s.teacher)
  const hasSamples = profiles.some((p) => p.sample)

  return (
    <div className="space-y-10">
      <ScreenHeader title={name ? L(`أهلًا ${name}`, `Welcome, ${name}`) : L('لوحة المتابعة', 'Guide dashboard')} subtitle={L('تابع المتعلّمين، وكلّفهم، واستمع إلى تسميعهم', 'Follow learners, assign portions, and listen to their recitations')} />

      <Section title={L('بانتظار استماعك', 'Waiting for you to listen')}>
        {pending.length === 0 ? (
          <Empty icon="mic" title={L('لا تسميع جديد', 'No new recitations')} body={L('عندما يرسل المتعلّم تسجيلًا من شاشة التسميع يظهر هنا.', 'When a learner sends a recording from the Recite screen, it appears here.')} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((s) => {
              const who = profiles.find((p) => p.id === s.learnerId)
              return (
                <Card key={s.id} href={`#/review/${s.id}`} className="flex items-center gap-4 p-5">
                  <Avatar name={who?.name ?? '؟'} kid={who?.kind === 'child'} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{who?.name ?? L('متعلّم', 'Learner')}</span>
                    <span className="block truncate text-sm text-muted">
                      {rangeLabel(L, N, s.s, s.from, s.to, lang)} · {N(Math.round(s.seconds))} {L('ث', 's')}
                    </span>
                  </span>
                  {s.ai ? <Pill tone="sky">{L(`${N(s.ai.observations.length)} ملاحظة آلية`, `${s.ai.observations.length} AI notes`)}</Pill> : <Pill>{L('بلا تحليل آلي', 'No AI analysis')}</Pill>}
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      <Section
        title={L('المتعلّمون', 'Learners')}
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            {L('إضافة متعلّم', 'Add learner')}
          </Button>
        }
      >
        {profiles.length === 0 ? (
          <Empty
            icon="users"
            title={L('لا متعلّمين بعد', 'No learners yet')}
            body={L('أضف أبناءك أو طلابك ليستخدموا التطبيق على هذا الجهاز، أو جرّب ببيانات تجريبية.', 'Add your children or students to use the app on this device, or try with sample data.')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setAdding(true)}>{L('إضافة متعلّم', 'Add learner')}</Button>
                <Button variant="outline" onClick={() => setState((s) => ({ ...s, profiles: [...s.profiles, ...sampleLearners()] }))}>
                  {L('تحميل متعلّمين تجريبيين', 'Load sample learners')}
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {profiles.map((p) => (
              <LearnerCard key={p.id} p={p} open={assignments.filter((a) => a.learnerId === p.id && !a.doneAt).length} />
            ))}
          </div>
        )}
        {profiles.length > 0 && !hasSamples && (
          <button type="button" onClick={() => setState((s) => ({ ...s, profiles: [...s.profiles, ...sampleLearners()] }))} className="text-sm text-muted underline">
            {L('إضافة متعلّمين تجريبيين للاستكشاف', 'Add sample learners to explore')}
          </button>
        )}
      </Section>

      <AddLearnerSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

function LearnerCard({ p, open }: { p: Profile; open: number }) {
  const { L, N, lang } = useL()
  const due = revisionTasks(p).reduce((a, t) => a + t.count, 0)
  const hifz = todaysHifz(p)
  return (
    <Card href={`#/learner/${p.id}`} className="p-5">
      <div className="flex items-center gap-3">
        <Avatar name={p.name} kid={p.kind === 'child'} size={48} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {p.name} {p.sample && <Pill>{L('تجريبي', 'Sample')}</Pill>}
          </p>
          <p className="text-sm text-muted">{p.path === 'kids' ? L('تعلّم القراءة', 'Learning to read') : p.path === 'reading' ? L('تلاوة', 'Reading') : L('حفظ', 'Memorisation')}</p>
        </div>
        <Icon name="chevron" className={`text-muted ${lang === 'ar' ? 'rotate-180' : ''}`} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini v={N(memorizedCount(p))} l={L('محفوظ', 'memorised')} />
        <Mini v={N(due)} l={L('للمراجعة', 'due')} tone={due > 0 ? 'text-clay' : ''} />
        <Mini v={N(activeDays(p, 7))} l={L('أيام هذا الأسبوع', 'days this week')} />
      </div>
      {hifz && <p className="mt-3 truncate text-xs text-muted">{L(`الورد: ${surah(hifz.s).ar}`, `Portion: ${surah(hifz.s).en}`)}{open > 0 && ` · ${L(`${N(open)} تكليف مفتوح`, `${open} open assignment${open > 1 ? 's' : ''}`)}`}</p>}
    </Card>
  )
}

function Mini({ v, l, tone = '', raised = false }: { v: string; l: string; tone?: string; raised?: boolean }) {
  return (
    <div className={`rounded-2xl py-2.5 text-center ${raised ? 'bg-card py-4 ring-1 ring-line' : 'bg-parchment/70'}`}>
      <p className={`font-arabic-display text-2xl ${tone}`}>{v}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  )
}

export function AddLearnerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useL()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'child' | 'adult'>('child')
  const [path, setPath] = useState<LearningPath>('kids')
  return (
    <Sheet open={open} onClose={onClose} title={L('إضافة متعلّم', 'Add a learner')}>
      <label className="block">
        <span className="text-sm text-muted">{L('الاسم', 'Name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="mt-1.5 h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none focus:ring-night/40" />
      </label>
      <div className="mt-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'child', label: L('طفل', 'Child') },
            { value: 'adult', label: L('بالغ', 'Adult') },
          ]}
        />
      </div>
      <div className="mt-4 space-y-2">
        {(
          [
            ['kids', L('يتعلّم القراءة (الحروف والحركات)', 'Learning to read (letters, harakat)')],
            ['hifz', L('يحفظ ويراجع', 'Memorises and revises')],
            ['reading', L('يتلو بانتظام', 'Reads regularly')],
          ] as [LearningPath, string][]
        ).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setPath(v)} className={`flex w-full items-center justify-between rounded-2xl p-4 text-start ring-1 ${path === v ? 'bg-card ring-night' : 'ring-line'}`}>
            {t}
            {path === v && <Icon name="check" className="text-leaf" />}
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!name.trim()}
        onClick={() => {
          const p = newProfile({ name: name.trim(), kind, path, dailyAyat: kind === 'child' ? 2 : 3 })
          const withPlan = path === 'hifz' ? addPlan(p, newPlan({ kind: 'hifz', start: [114, 1], end: [114, 6], daily: p.dailyAyat }), true) : p
          setState((s) => ({ ...s, profiles: [...s.profiles, withPlan], activeId: s.activeId ?? withPlan.id }))
          setName('')
          onClose()
        }}
      >
        {L('إضافة', 'Add')}
      </Button>
    </Sheet>
  )
}

export function GuideLearner({ id }: { id: string }) {
  const { L, N, lang } = useL()
  const p = useStore((s) => s.profiles.find((x) => x.id === id))
  const assignments = useStore((s) => s.assignments)
  const subs = useStore((s) => s.submissions)
  const [assigning, setAssigning] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (!p) return <Empty icon="users" title={L('لم يُعثر على المتعلّم', 'Learner not found')} action={<Button href="#/">{L('العودة', 'Back')}</Button>} />
  const mine = assignments.filter((a) => a.learnerId === p.id)
  const tasks = revisionTasks(p)
  const hifz = todaysHifz(p)
  const memSurahs = SURAHS.filter((s) => memorizedCount(p, s.n) > 0)
  const mySubs = subs.filter((s) => s.learnerId === p.id)

  return (
    <div className="space-y-8">
      <ScreenHeader
        backTo="#/"
        title={p.name}
        subtitle={p.sample ? L('بيانات تجريبية للاستكشاف', 'Sample data for exploring') : p.kind === 'child' ? L('طفل', 'Child') : L('بالغ', 'Adult')}
        action={
          <Button size="sm" variant="outline" onClick={() => (setState((s) => ({ ...s, activeId: p.id, mode: 'learner' })), navigate('/'))}>
            {L('افتح كمتعلّم', 'Open as learner')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini raised v={N(memorizedCount(p))} l={L('آية محفوظة', 'ayat memorised')} />
        <Mini raised v={N(tasks.reduce((a, t) => a + t.count, 0))} l={L('مستحقّة للمراجعة', 'due for revision')} tone={tasks.length ? 'text-clay' : ''} />
        <Mini raised v={N(activeDays(p, 30))} l={L('يوم تعلّم من آخر ٣٠', 'of last 30 days')} />
        <Mini raised v={N(Object.keys(p.kids.letters).length)} l={L('حرفًا من ٢٨', 'of 28 letters')} />
      </div>

      {hifz && (
        <Card className="p-5">
          <p className="text-sm text-muted">{L('الورد الحالي', 'Current portion')}</p>
          <p className="mt-1 font-semibold">{(() => { const pl = hifzPlanOf(p); return pl ? rangeText(pl.start, pl.end, lang, N) : '' })()}</p>
          <Bar value={1 - hifz.remainingTotal / hifz.total} className="mt-3" />
          <p className="mt-2 text-xs text-muted">{L(`${N(hifz.goal)} آيات يوميًا`, `${hifz.goal} ayat a day`)}</p>
        </Card>
      )}

      <Section title={L('التكليفات', 'Assignments')} action={<Button size="sm" onClick={() => setAssigning(true)}><Icon name="plus" size={16} />{L('كلّف', 'Assign')}</Button>}>
        {mine.length === 0 ? (
          <Empty icon="calendar" title={L('لا تكليفات', 'No assignments')} body={L('كلّفه بحفظ أو مراجعة أو تسميع، فتظهر في صفحته الرئيسية.', 'Assign memorisation, revision or recitation. It shows on their home screen.')} />
        ) : (
          <ul className="space-y-2">
            {mine.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
                <Icon name={a.kind === 'recite' ? 'mic' : a.kind === 'revise' ? 'repeat' : 'sprout'} className="text-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{rangeLabel(L, N, a.s, a.from, a.to, lang)}</span>
                  <span className="block text-xs text-muted">
                    {a.kind === 'memorize' ? L('حفظ', 'Memorise') : a.kind === 'revise' ? L('مراجعة', 'Revise') : L('تسميع', 'Recite')} · {L('موعد', 'due')} {a.due}
                    {a.note && ` · “${a.note}”`}
                  </span>
                </span>
                {a.doneAt ? <Pill tone="leaf">{L('أُنجز', 'Done')}</Pill> : a.due < today() ? <Pill tone="clay">{L('متأخر', 'Late')}</Pill> : <Pill>{L('مفتوح', 'Open')}</Pill>}
                <button type="button" aria-label={L('حذف', 'Delete')} onClick={() => setState((s) => ({ ...s, assignments: s.assignments.filter((x) => x.id !== a.id) }))} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-night/5">
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={L('التسميع المُرسل', 'Submitted recitations')}>
        {mySubs.length === 0 ? (
          <p className="text-sm text-muted">{L('لا تسجيلات بعد.', 'No recordings yet.')}</p>
        ) : (
          <ul className="space-y-2">
            {mySubs.map((s) => (
              <li key={s.id}>
                <a href={`#/review/${s.id}`} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-line hover:ring-night/30">
                  <Icon name="mic" className="text-gold" />
                  <span className="flex-1">{rangeLabel(L, N, s.s, s.from, s.to, lang)}</span>
                  {s.teacher ? <Pill tone={s.teacher.verdict === 'good' ? 'leaf' : 'gold'}>{s.teacher.verdict === 'good' ? L('متقن', 'Solid') : L('يحتاج مراجعة', 'Needs work')}</Pill> : <Pill tone="sky">{L('بانتظارك', 'Waiting')}</Pill>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {memSurahs.length > 0 && (
        <Section title={L('المحفوظ', 'Memorised')}>
          <div className="flex flex-wrap gap-2">
            {memSurahs.map((s) => (
              <span key={s.n} className="flex items-center gap-2 rounded-full bg-card py-1.5 pe-3 ps-1.5 ring-1 ring-line">
                <SurahBadge n={s.n} size={28} />
                <span className="text-sm">{lang === 'ar' ? s.ar : s.en}</span>
                <span className="text-xs text-muted">
                  {L(`${N(memorizedCount(p, s.n))} من ${N(s.ayat)}`, `${memorizedCount(p, s.n)} of ${s.ayat}`)}
                </span>
              </span>
            ))}
          </div>
        </Section>
      )}

      <div className="border-t border-line pt-6">
        {confirmRemove ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">{L('حذف هذا المتعلّم وتقدّمه نهائيًا؟', 'Delete this learner and their progress permanently?')}</span>
            <Button size="sm" variant="danger" onClick={() => (setState((s) => ({ ...s, profiles: s.profiles.filter((x) => x.id !== p.id), assignments: s.assignments.filter((a) => a.learnerId !== p.id), submissions: s.submissions.filter((x) => x.learnerId !== p.id), activeId: s.activeId === p.id ? (s.profiles.find((x) => x.id !== p.id)?.id ?? null) : s.activeId })), navigate('/'))}>
              {L('حذف', 'Delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
              {L('إلغاء', 'Cancel')}
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className="text-sm text-clay underline">
            {L('حذف المتعلّم', 'Remove learner')}
          </button>
        )}
      </div>

      <AssignSheet open={assigning} onClose={() => setAssigning(false)} learner={p} />
    </div>
  )
}

function AssignSheet({ open, onClose, learner }: { open: boolean; onClose: () => void; learner: Profile }) {
  const { L } = useL()
  const [kind, setKind] = useState<Assignment['kind']>('memorize')
  const [r, setR] = useState<Range>(() => { const h = todaysHifz(learner); return h && h.next.length ? { s: h.s, from: h.next[0], to: h.next[h.next.length - 1] } : { s: 114, from: 1, to: 3 } })
  const [due, setDue] = useState(addDays(today(), 2))
  const [note, setNote] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title={L(`تكليف لـ${learner.name}`, `Assign to ${learner.name}`)}>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'memorize', label: L('حفظ', 'Memorise') },
          { value: 'revise', label: L('مراجعة', 'Revise') },
          { value: 'recite', label: L('تسميع', 'Recite') },
        ]}
      />
      <div className="mt-5">
        <RangePicker value={r} onChange={setR} />
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs text-muted">{L('الموعد', 'Due date')}</span>
        <input type="date" value={due} min={today()} onChange={(e) => setDue(e.target.value)} className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs text-muted">{L('ملاحظة (اختياري)', 'Note (optional)')}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" placeholder={L('مثال: انتبه للمدود', 'e.g. Mind the madd')} />
      </label>
      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={() => {
          const a: Assignment = { id: uid(), learnerId: learner.id, kind, s: r.s, from: r.from, to: r.to, due, note: note.trim(), createdAt: today() }
          setState((s) => ({ ...s, assignments: [a, ...s.assignments] }))
          setNote('')
          onClose()
        }}
      >
        {L('أرسل التكليف', 'Send assignment')}
      </Button>
    </Sheet>
  )
}

export function GuideReview({ id }: { id: string }) {
  const { L, N, lang } = useL()
  const sub = useStore((s) => s.submissions.find((x) => x.id === id))
  const who = useStore((s) => s.profiles.find((p) => p.id === sub?.learnerId))
  const [url, setUrl] = useState<string | null>(null)
  const [audioState, setAudioState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [text, setText] = useState<string[] | null>(null)
  const [verdict, setVerdict] = useState<'good' | 'needs_work' | null>(sub?.teacher?.verdict ?? null)
  const [note, setNote] = useState(sub?.teacher?.note ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!sub) return
    let u: string | null = null
    if (sub.audioId)
      getAudio(sub.audioId)
        .then((b) => {
          if (b) {
            u = URL.createObjectURL(b)
            setUrl(u)
            setAudioState('ok')
          } else setAudioState('missing')
        })
        .catch(() => setAudioState('missing'))
    else setAudioState('missing')
    loadSurah(sub.s).then((a) => setText(a.slice(sub.from - 1, sub.to)))
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [sub])

  if (!sub) return <Empty icon="mic" title={L('لم يُعثر على التسجيل', 'Recording not found')} action={<Button href="#/">{L('العودة', 'Back')}</Button>} />

  const setReview = (i: number, review: 'confirmed' | 'dismissed') =>
    setState((s) => ({
      ...s,
      submissions: s.submissions.map((x) => (x.id === sub.id && x.ai ? { ...x, ai: { ...x.ai, observations: x.ai.observations.map((o, k) => (k === i ? { ...o, review: o.review === review ? undefined : review } : o)) } } : x)),
    }))

  let wi = 0
  return (
    <div className="space-y-6">
      <ScreenHeader backTo="#/" title={L(`تسميع ${who?.name ?? ''}`, `${who?.name ?? 'Learner'}’s recitation`)} subtitle={`${rangeLabel(L, N, sub.s, sub.from, sub.to, lang)} · ${new Date(sub.createdAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}`} />

      <Card className="p-5">
        {audioState === 'ok' && url ? <audio src={url} controls className="w-full" /> : audioState === 'loading' ? <div className="h-10 animate-pulse rounded-full bg-night/5" /> : <p className="text-sm text-muted">{L('التسجيل غير متوفر على هذا الجهاز.', 'The recording isn’t available on this device.')}</p>}
      </Card>

      {text && (
        <Card className="p-6">
          <p dir="rtl" lang="ar" className="mushaf text-[1.8rem]">
            {text.map((t, k) => (
              <span key={k}>
                {words(t).map((w) => {
                  const i = wi++
                  const self = sub.selfCheck?.includes(i)
                  return (
                    <span key={i} className={`rounded px-0.5 ${self ? 'bg-clay/15 text-clay' : ''}`}>
                      {w}{' '}
                    </span>
                  )
                })}
                <AyahMark n={sub.from + k} />
              </span>
            ))}
          </p>
          {sub.selfCheck && <p className="mt-3 text-sm text-muted">{sub.selfCheck.length ? L(`حدّد المتعلّم ${N(sub.selfCheck.length)} كلمة رأى أنه أخطأ فيها (باللون الأحمر)`, `The learner marked ${sub.selfCheck.length} words they think they missed (in red)`) : L('راجع المتعلّم نفسه ولم يحدّد أخطاء.', 'The learner self-checked and marked nothing.')}</p>}
        </Card>
      )}

      <Section title={L('ملاحظات الذكاء الاصطناعي', 'AI observations')}>
        {!sub.ai ? (
          <div className="flex gap-3 rounded-2xl bg-night/[0.04] p-4 text-sm text-muted">
            <Icon name="shield" size={20} className="mt-0.5 shrink-0" />
            {L('لم يُحلَّل هذا التسجيل آليًا (لم يكن محرّك الاستماع متصلًا). اعتمد على استماعك.', 'This recording wasn’t analysed automatically (the listening engine wasn’t connected). Rely on your own listening.')}
          </div>
        ) : !sub.ai.reliable ? (
          <p className="rounded-2xl bg-gold-soft/40 p-4 text-sm">{L('امتنع المحرّك عن إعطاء ملاحظات لأنه لم يتابع التلاوة بثقة.', 'The engine declined to give observations because it couldn’t follow the recitation confidently.')}</p>
        ) : sub.ai.observations.length === 0 ? (
          <p className="rounded-2xl bg-leaf/10 p-4 text-sm text-leaf">{L('لم يرصد المحرّك اختلافات. القرار لك.', 'The engine noted no differences. The judgement is yours.')}</p>
        ) : (
          <ul className="space-y-2">
            {sub.ai.observations.map((o, i) => (
              <li key={i} className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 ring-1 ${o.review === 'confirmed' ? 'bg-leaf/5 ring-leaf/40' : o.review === 'dismissed' ? 'bg-card opacity-60 ring-line' : 'bg-card ring-line'}`}>
                <span className="min-w-0 flex-1">
                  <span dir="rtl" className="font-quran text-2xl">
                    {o.words}
                  </span>
                  <span className="block text-sm">{o.label}</span>
                  <span className="block text-xs text-muted" dir="ltr">
                    {o.detail}
                  </span>
                </span>
                <Button size="sm" variant={o.review === 'confirmed' ? 'primary' : 'outline'} onClick={() => setReview(i, 'confirmed')}>
                  {L('صحيحة', 'Confirm')}
                </Button>
                <Button size="sm" variant={o.review === 'dismissed' ? 'primary' : 'outline'} onClick={() => setReview(i, 'dismissed')}>
                  {L('ليست خطأ', 'Not an error')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={L('ملاحظتك للمتعلّم', 'Your feedback')}>
        <Card className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setVerdict('good')} className={`rounded-2xl p-4 ring-1 ${verdict === 'good' ? 'bg-leaf text-white ring-leaf' : 'ring-line'}`}>
              <Icon name="star" fill={verdict === 'good'} className="mx-auto" />
              <span className="mt-1 block">{L('تسميع متقن', 'Solid recitation')}</span>
            </button>
            <button type="button" onClick={() => setVerdict('needs_work')} className={`rounded-2xl p-4 ring-1 ${verdict === 'needs_work' ? 'bg-gold text-white ring-gold' : 'ring-line'}`}>
              <Icon name="heart" className="mx-auto" />
              <span className="mt-1 block">{L('يحتاج مراجعة', 'Needs more practice')}</span>
            </button>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder={L('كلمة تشجيع أو توجيه…', 'A word of encouragement or guidance…')} className="w-full rounded-2xl bg-parchment/60 p-4 ring-1 ring-line outline-none focus:ring-night/40" />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!verdict}
              onClick={() => {
                setState((s) => ({ ...s, submissions: s.submissions.map((x) => (x.id === sub.id ? { ...x, teacher: { verdict: verdict!, note: note.trim(), at: new Date().toISOString() }, seenByLearner: false } : x)) }))
                setSaved(true)
              }}
            >
              <Icon name="send" size={16} />
              {L('أرسل الملاحظة', 'Send feedback')}
            </Button>
            {verdict === 'needs_work' && who && (
              <Button
                variant="outline"
                onClick={() => {
                  setState((s) => ({ ...s, assignments: [{ id: uid(), learnerId: who.id, kind: 'revise', s: sub.s, from: sub.from, to: sub.to, due: addDays(today(), 1), note: note.trim(), createdAt: today() }, ...s.assignments] }))
                  setSaved(true)
                }}
              >
                {L('كلّفه بمراجعة هذا الموضع', 'Assign revision of this portion')}
              </Button>
            )}
            {saved && <span className="text-sm text-leaf">{L('حُفظ. سيظهر للمتعلّم في صفحته.', 'Saved. The learner will see it on their home screen.')}</span>}
          </div>
        </Card>
      </Section>
    </div>
  )
}
