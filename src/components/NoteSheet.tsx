import { useEffect, useState } from 'react'
import { Button, Sheet } from './ui'
import { useL } from '../lib/i18n'
import { surah } from '../lib/quran'
import { key, setNote, useActive } from '../lib/store'

/** Personal reflection note on one ayah (stored on this device, per profile). */
export function NoteSheet({ at, onClose }: { at: { s: number; a: number } | null; onClose: () => void }) {
  const { L, N, lang } = useL()
  const p = useActive()
  const [text, setText] = useState('')
  useEffect(() => {
    if (at) setText(p?.notes?.[key(at.s, at.a)] ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at?.s, at?.a])
  if (!at || !p) return null
  const had = !!p.notes?.[key(at.s, at.a)]
  return (
    <Sheet open onClose={onClose} title={lang === 'ar' ? `ملاحظة · ${surah(at.s).ar} ${N(at.a)}` : `Note · ${surah(at.s).en} ${at.a}`}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={L('ما الذي استوقفك في هذه الآية؟', 'What stood out to you in this ayah?')}
        className="w-full resize-none rounded-2xl bg-card p-4 text-[16px] leading-relaxed ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-gold/60"
      />
      <p className="mt-2 text-xs text-muted">{L('تُحفظ ملاحظاتك على هذا الجهاز فقط.', 'Notes are saved on this device only.')}</p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => (setNote(at.s, at.a, text), onClose())}>
          {L('حفظ', 'Save')}
        </Button>
        {had && (
          <Button variant="outline" onClick={() => (setNote(at.s, at.a, ''), onClose())}>
            {L('حذف', 'Delete')}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
