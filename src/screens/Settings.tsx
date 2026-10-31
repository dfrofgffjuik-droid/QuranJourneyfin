import { useState } from 'react'
import { Icon } from '../components/Icon'
import { AiNotice } from '../components/AiNotice'
import { ModePicker, PalettePicker } from '../components/Appearance'
import { Button, Card, ScreenHeader, Section, Segmented, Sheet, Stepper } from '../components/ui'
import { Avatar } from '../app/Shell'
import { useL } from '../lib/i18n'
import { hifzPlanOf, patchPlan } from '../lib/plans'
import { navigate } from '../lib/router'
import { RECITERS } from '../lib/quran'
import { resetAll, setState, updateProfile, useActive, useStore, type LearningPath } from '../lib/store'
import { AddLearnerSheet } from './Guide'

export function Settings() {
  const { L, N, A, lang } = useL()
  const reciter = useStore((s) => s.reciter)
  const fontScale = useStore((s) => s.fontScale)
  const profiles = useStore((s) => s.profiles)
  const mode = useStore((s) => s.mode)
  const p = useActive()
  const [adding, setAdding] = useState(() => location.hash.includes('add=1'))
  const [confirmReset, setConfirmReset] = useState(false)
  const [notice, setNotice] = useState(false)

  return (
    <div className="space-y-10">
      <ScreenHeader title={L('الإعدادات', 'Settings')} />

      <Section title={L('اللغة والعرض', 'Language & display')}>
        <Card className="divide-y divide-line">
          <Row label={L('لغة الواجهة', 'Interface language')}>
            <Segmented
              value={lang}
              onChange={(v) => setState((s) => ({ ...s, lang: v }))}
              options={[
                { value: 'ar', label: 'العربية' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Row>
          <div className="p-5">
            <p className="font-medium">{L('المظهر', 'Appearance')}</p>
            <p className="text-sm text-muted">{L('اختر الوضع النهاري أو الليلي أو التلقائي مع الجهاز', 'Day, night, or follow your device')}</p>
            <div className="mt-4 max-w-sm">
              <ModePicker />
            </div>
          </div>
          <div className="p-5">
            <p className="font-medium">{L('لون التطبيق', 'App colour')}</p>
            <p className="mb-4 text-sm text-muted">{L('يتغيّر لون الواجهة والخلفية في كل الصفحات', 'Changes the accent and backdrop across every screen')}</p>
            <PalettePicker />
          </div>
          <Row label={L('حجم خط المصحف', 'Quran text size')}>
            <Stepper value={Math.round(fontScale * 10)} min={8} max={16} onChange={(v) => setState((s) => ({ ...s, fontScale: v / 10 }))} format={(n) => `${N(n * 10)}٪`} />
          </Row>
          <div className="p-5">
            <p className="font-medium">{L('القارئ', 'Reciter')}</p>
            <p className="text-sm text-muted">{L('للاستماع والتكرار في المصحف وجلسات الحفظ', 'For listening and repetition while reading and memorising')}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {RECITERS.map((r) => (
                <button key={r.id} type="button" onClick={() => setState((s) => ({ ...s, reciter: r.id }))} className={`flex items-center justify-between rounded-2xl p-4 text-start ring-1 ${reciter === r.id ? 'bg-card ring-night' : 'ring-line hover:ring-night/30'}`}>
                  {L(r.ar, r.en)}
                  {reciter === r.id && <Icon name="check" className="text-leaf" />}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      {p && mode === 'learner' && (
        <Section title={L('ملفي', 'My profile')}>
          <Card className="divide-y divide-line">
            <Row label={L('الاسم', 'Name')}>
              <input value={p.name} onChange={(e) => updateProfile(p.id, (x) => ({ ...x, name: e.target.value.slice(0, 30) }))} className="h-10 w-44 rounded-xl bg-parchment/60 px-3 ring-1 ring-line outline-none" />
            </Row>
            <div className="p-5">
              <p className="font-medium">{L('مسار التعلّم', 'Learning path')}</p>
              <div className="mt-3">
                <Segmented<LearningPath>
                  value={p.path}
                  onChange={(v) => updateProfile(p.id, (x) => ({ ...x, path: v }))}
                  options={[
                    { value: 'hifz', label: L('الحفظ', 'Hifz') },
                    { value: 'reading', label: L('التلاوة', 'Reading') },
                    { value: 'kids', label: L('تعلّم القراءة', 'Learn to read') },
                  ]}
                />
              </div>
            </div>
            <Row label={L('هدف الحفظ اليومي', 'Daily memorisation goal')}>
              <Stepper value={p.dailyAyat} min={1} max={20} onChange={(v) => updateProfile(p.id, (x) => { const h = hifzPlanOf(x); const y = { ...x, dailyAyat: v }; return h ? patchPlan(y, h.id, (pl) => ({ ...pl, daily: v })) : y })} format={(n) => A(n)} />
            </Row>
            <Row label={L('وقت التلاوة اليومي', 'Daily reading time')}>
              <Stepper value={p.dailyMinutes} min={5} max={60} onChange={(v) => updateProfile(p.id, (x) => ({ ...x, dailyMinutes: v }))} format={(n) => `${N(n)} ${L('د', 'min')}`} />
            </Row>
          </Card>
        </Section>
      )}

      <Section title={L('المتعلّمون على هذا الجهاز', 'Learners on this device')} action={<Button size="sm" variant="outline" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{L('إضافة', 'Add')}</Button>}>
        <Card className="divide-y divide-line">
          {profiles.map((x) => (
            <button key={x.id} type="button" onClick={() => (setState((s) => ({ ...s, activeId: x.id, mode: 'learner' })), navigate('/'))} className="flex w-full items-center gap-3 p-4 text-start hover:bg-night/[0.03]">
              <Avatar name={x.name} kid={x.path === 'kids'} />
              <span className="flex-1">{x.name}</span>
              {mode === 'learner' && p?.id === x.id && <span className="text-xs text-leaf">{L('الملف الحالي', 'Current')}</span>}
            </button>
          ))}
          <button type="button" onClick={() => (setState((s) => ({ ...s, mode: 'guide' })), navigate('/'))} className="flex w-full items-center gap-3 p-4 text-start hover:bg-night/[0.03]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-night text-parchment">
              <Icon name="users" size={18} />
            </span>
            <span className="flex-1">{L('لوحة ولي الأمر / المعلّم', 'Parent / teacher dashboard')}</span>
          </button>
        </Card>
      </Section>

      <Section title={L('الخصوصية والثقة', 'Privacy & trust')}>
        <Card className="space-y-4 p-5 text-sm leading-relaxed">
          <p>
            <strong>{L('بياناتك على جهازك.', 'Your data stays on this device.')}</strong> {L('التقدّم والتكليفات والتسجيلات تُحفظ محليًا فقط، ولا يوجد حساب ولا خادم يجمع بياناتك، ولا إعلانات.', 'Progress, assignments and recordings are stored locally only. No account, no server collecting your data, no ads.')}
          </p>
          <p className="text-muted">{L('الاستماع للتلاوات يتم بتشغيلها من موقع EveryAyah عند الطلب.', 'Recitation audio is streamed from EveryAyah when you press play.')}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setNotice(true)}>
              {L('تنبيه الذكاء الاصطناعي', 'AI notice')}
            </Button>
            {confirmReset ? (
              <>
                <Button size="sm" variant="danger" onClick={() => (resetAll(), navigate('/'))}>
                  {L('نعم، احذف كل شيء', 'Yes, delete everything')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  {L('إلغاء', 'Cancel')}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-clay" onClick={() => setConfirmReset(true)}>
                {L('حذف كل البيانات من هذا الجهاز', 'Delete all data on this device')}
              </Button>
            )}
          </div>
        </Card>
      </Section>

      <Section title={L('المصادر', 'Sources')}>
        <Card className="space-y-3 p-5 text-sm leading-relaxed text-muted">
          <p>
            {L('نص المصحف: ', 'Quran text: ')}
            <a href="https://tanzil.net" target="_blank" rel="noreferrer" className="text-gold underline">
              Tanzil Quran Text
            </a>{' '}
            (Uthmani 1.1) © 2007–2024 Tanzil Project, CC BY 3.0. {L('منقول حرفيًا دون أي تعديل.', 'Reproduced verbatim, unmodified.')}
          </p>
          <p>
            {L('نص القراءة وخطّه: ', 'Reading text & typeface: ')}
            {L('نص مجمع الملك فهد لطباعة المصحف الشريف (رواية حفص) وخط «KFGQPC HAFS Uthmanic Script»، عبر Quran Foundation. الخط موزّع دون تعديل وفق ترخيص المجمع. يُستخدم نص تنزيل للتسميع والتحليل.', 'King Fahd Glorious Quran Printing Complex Hafs text and the “KFGQPC HAFS Uthmanic Script” typeface, via the Quran Foundation. The font is distributed unmodified under the KFGQPC licence. Tanzil text is used for recitation and analysis.')}
          </p>
          <p>
            {L('أرقام الصفحات والأجزاء والأحزاب (مصحف المدينة): ', 'Page, juz and hizb data (Madani mushaf): ')}
            Tanzil Quran Metadata 1.0 © 2008–2009 Tanzil.info, CC BY 3.0.
          </p>
          <p>
            {L('التفسير: ', 'Tafsir: ')}
            <a href="https://quran.com" target="_blank" rel="noreferrer" className="text-gold underline">
              Quran Foundation · Quran.com API
            </a>
            {L(' · يُعرض النص كما هو مع اسم الكتاب ومؤلّفه.', ' · shown verbatim with book and author.')}
          </p>
          <p>
            {L('التلاوات: ', 'Recitations: ')}
            <a href="https://everyayah.com" target="_blank" rel="noreferrer" className="text-gold underline">
              EveryAyah.com
            </a>
            {L(' · أسماء السور وترجماتها: Quran.com', ' · Surah names & meanings: Quran.com')}
          </p>
          <p>{L('محرّك الاستماع التجريبي: Quran Muaalem (رخصة QML-1.0)، ولا يعمل إلا عند توصيل خادمه.', 'Experimental listening engine: Quran Muaalem (QML-1.0). Active only when its server is connected.')}</p>
          <p className="pt-2">
            <a href="#/dev" className="inline-flex items-center gap-1.5 text-xs text-muted/80 hover:text-night">
              <Icon name="layers" size={14} />
              {L('منطقة المطوّرين: مختبر محرّك التسميع', 'Developer area: recitation engine lab')}
            </a>
            <a href="#/design-studio" className="ms-4 inline-flex items-center gap-1.5 text-xs text-muted/80 hover:text-night">
              <Icon name="sparkle" size={14} />
              {L('استوديو التصميم: مقارنة الاتجاهات البصرية', 'Design Studio: compare visual directions')}
            </a>
          </p>
        </Card>
      </Section>

      <AddLearnerSheet open={adding} onClose={() => setAdding(false)} />
      <Sheet open={notice} onClose={() => setNotice(false)} title={L('تنبيه الذكاء الاصطناعي', 'AI notice')}>
        <AiNotice />
      </Sheet>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  )
}
