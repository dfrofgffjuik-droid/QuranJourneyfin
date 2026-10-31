// Small shared UI for the preview progress model: data indicator + reset,
// confirmation dialog and transient toast. Same Sakina tokens as the screens.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './core'
import { actions, isDemoData, storageStatus, usePreview } from './progress'

/** Always visible where preview progress is shown: says what the data is, and offers reset. */
export function DataBar({ compact = false }: { compact?: boolean }) {
  const st = usePreview()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'demo' | 'empty' | null>(null)
  const demo = isDemoData(st)
  const store = storageStatus()
  return (
    <div className="relative" data-databar>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${demo ? 'bg-sky/10 text-sky' : 'bg-night/[.06] text-muted'}`} title="بيانات المعاينة — ليست تقدّمك الحقيقي">
        <Icon name="info" size={12} />
        {demo ? 'بيانات تجريبية' : 'بيانات المعاينة'}
        {!compact && <Icon name="chevronDown" size={12} />}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-[80] mt-2 w-[290px] rounded-[20px] bg-card p-4 text-start shadow-[0_20px_50px_-20px_rgba(0,0,0,.4)] ring-1 ring-line" role="dialog" aria-label="بيانات المعاينة">
          <p className="text-[13px] font-semibold">{demo ? 'سيناريو تجريبي محدّد مسبقًا' : 'بيانات أنشأتها في المعاينة'}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {demo ? 'السجلات التجريبية بتواريخ ثابتة ومعلَّمة، ولا تمثّل حفظًا أو إنجازًا حقيقيًا.' : 'كل ما تسجّله هنا للمعاينة فقط.'} تُحفظ على هذا المتصفح بمفتاح منفصل عن التطبيق، ولا تمسّ بيانات حسابك.
          </p>
          {store !== 'ok' && <p className="mt-2 rounded-[12px] bg-clay/10 px-2.5 py-1.5 text-[11.5px] text-clay" role="alert">{store === 'unavailable' ? 'تعذّر الحفظ في المتصفح؛ ستبقى التغييرات حتى إغلاق الصفحة فقط.' : 'كانت بيانات المعاينة المحفوظة تالفة، فاستُعيد السيناريو التجريبي.'}</p>}
          <div className="mt-3 grid gap-1.5">
            <button type="button" onClick={() => setConfirm('demo')} className="press h-9 rounded-full bg-night text-[12.5px] font-semibold text-parchment" data-reset="demo">استعادة البيانات التجريبية</button>
            <button type="button" onClick={() => setConfirm('empty')} className="press h-9 rounded-full text-[12.5px] ring-1 ring-line" data-reset="empty">ابدأ من حالة فارغة</button>
          </div>
        </div>
      )}
      {confirm && (
        <Confirm
          title={confirm === 'demo' ? 'استعادة البيانات التجريبية؟' : 'البدء من حالة فارغة؟'}
          body={confirm === 'demo' ? 'تُحذف خططك وسجلاتك في المعاينة ويعود السيناريو التجريبي الأصلي.' : 'تُحذف كل بيانات المعاينة (الخطط، السجلات، الإنجازات، النجوم) لتجرّب التجربة من البداية.'}
          confirm={confirm === 'demo' ? 'استعادة' : 'ابدأ من جديد'}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => (actions.reset(confirm), setConfirm(null), setOpen(false))}
        />
      )}
    </div>
  )
}

/** Renders overlays inside the current device frame (its .pv-root), not over the whole review page. */
export function Layer({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<Element | null>(null)
  return (
    <>
      <span hidden ref={(el) => { if (el && !host) setHost(el.closest('.pv-root') ?? document.body) }} />
      {host && createPortal(children, host)}
    </>
  )
}

export function Confirm({ title, body, confirm, danger = false, onConfirm, onCancel }: { title: string; body: ReactNode; confirm: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Layer>
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/35 p-4" role="alertdialog" aria-modal="true" aria-label={title} data-confirm>
      <div className="w-full max-w-[360px] rounded-[26px] bg-parchment p-5 text-night shadow-[0_30px_60px_-20px_rgba(0,0,0,.5)]" dir="rtl">
        <p className="text-[16px] font-semibold">{title}</p>
        <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onConfirm} className={`press h-10 flex-1 rounded-full text-[13px] font-semibold text-white ${danger ? 'bg-clay' : 'bg-night'}`} data-confirm-yes>{confirm}</button>
          <button type="button" onClick={onCancel} className="press h-10 rounded-full px-4 text-[13px] ring-1 ring-line" autoFocus>إلغاء</button>
        </div>
      </div>
    </div>
    </Layer>
  )
}

export function useToast() {
  const [t, setT] = useState<string | null>(null)
  useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(null), 2800)
    return () => clearTimeout(id)
  }, [t])
  const el = t ? <Layer><p role="status" className="pointer-events-none absolute inset-x-0 bottom-8 z-[150] mx-auto w-fit max-w-[90%] rounded-full bg-night px-4 py-2 text-center text-[12.5px] text-parchment shadow-lg" data-toast>{t}</p></Layer> : null
  return { show: setT, el }
}
