// Storage safety for the Next Preview (preview-only, this browser/device only).
//
//  - Unreadable saved data is never discarded: the raw value is copied to a
//    `<key>.recovery.<timestamp>` entry before anything else may overwrite it,
//    and the user is told in Arabic (not silently reset).
//  - Every write goes through `safeWrite`, which records quota / blocked-storage
//    failures so the screens can show a clear Arabic warning instead of
//    pretending the progress was saved.
//  - Nothing here syncs anywhere: all preview data lives in this browser only.
import { useSyncExternalStore } from 'react'

export type WriteFailure = 'quota' | 'blocked'
type Health = { failed: Record<string, WriteFailure>; recovered: { key: string; backup: string | null; partial: boolean }[]; dismissed: boolean }
let health: Health = { failed: {}, recovered: [], dismissed: false }
const subs = new Set<() => void>()
const set = (h: Health) => ((health = h), subs.forEach((f) => f()))
export const useStorageHealth = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => health)
export const getStorageHealth = () => health

/** Arabic name of each preview store, for messages. */
export const STORE_AR: Record<string, string> = {
  'quranJourney.nextPreview.v1': 'الخطط والتقدّم والإنجازات',
  'quranJourney.nextPreview.azkar.v1': 'تقدّم الأذكار والمفضّلة',
  'quranJourney.nextPreview.session.v1': 'جلسة الحفظ والتأمّلات',
  'quranJourney.nextPreview.activeTask.v1': 'المهمة المفتوحة',
}

const isQuota = (e: unknown) => {
  const n = (e as { name?: string; code?: number })?.name
  const c = (e as { code?: number })?.code
  return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' || c === 22 || c === 1014
}

/** Reads a key. `blocked` means storage itself is unavailable (private mode, disabled storage). */
export function readRaw(key: string): { raw: string | null; blocked: boolean } {
  try {
    return { raw: localStorage.getItem(key), blocked: false }
  } catch {
    if (!health.failed[key]) set({ ...health, failed: { ...health.failed, [key]: 'blocked' } })
    return { raw: null, blocked: true }
  }
}

/** Writes a key; returns false (and records why) when the browser refuses. */
export function safeWrite(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    if (health.failed[key]) {
      const failed = { ...health.failed }
      delete failed[key]
      set({ ...health, failed })
    }
    return true
  } catch (e) {
    const why: WriteFailure = isQuota(e) ? 'quota' : 'blocked'
    if (health.failed[key] !== why) set({ ...health, failed: { ...health.failed, [key]: why }, dismissed: false })
    return false
  }
}

/**
 * Keeps an unreadable saved value before the store falls back to a fresh state.
 * Reuses an existing recovery copy with identical content, so reloads do not pile up copies.
 * Returns the recovery key, or null when even the copy could not be written.
 */
export function quarantine(key: string, raw: string, partial = false): string | null {
  let backup: string | null = null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(`${key}.recovery.`) && localStorage.getItem(k) === raw) backup = k
    }
    if (!backup) {
      const k = `${key}.recovery.${new Date().toISOString().replace(/[:.]/g, '-')}`
      localStorage.setItem(k, raw)
      backup = k
    }
  } catch {
    backup = null
  }
  if (!health.recovered.some((r) => r.key === key)) set({ ...health, recovered: [...health.recovered, { key, backup, partial }], dismissed: false })
  return backup
}

export const dismissStorageNotice = () => set({ ...health, dismissed: true })

/** Arabic warning shown at the top of every preview screen when saving or reading failed. */
export function StorageNotice() {
  const h = useStorageHealth()
  const failed = Object.entries(h.failed)
  if (h.dismissed || (failed.length === 0 && h.recovered.length === 0)) return null
  const quota = failed.some(([, w]) => w === 'quota')
  return (
    <div role="alert" className="mx-4 mt-3 rounded-[18px] bg-clay/10 px-4 py-3 text-[12.5px] leading-relaxed text-night ring-1 ring-clay/30" data-storage-notice>
      {failed.length > 0 && (
        <p>
          <b className="font-semibold text-clay">{quota ? 'تعذّر الحفظ: مساحة التخزين في هذا المتصفح ممتلئة.' : 'تعذّر الحفظ: التخزين المحلي غير متاح في هذا المتصفح (قد يكون وضع التصفّح الخاص).'}</b>{' '}
          لم يُحفظ على هذا الجهاز: {failed.map(([k]) => STORE_AR[k] ?? k).join('، ')}. ما تسجّله الآن يبقى حتى إغلاق الصفحة فقط.
        </p>
      )}
      {h.recovered.length > 0 && (
        <p className={failed.length ? 'mt-1.5' : ''}>
          <b className="font-semibold text-clay">تعذّرت قراءة بعض البيانات المحفوظة:</b> {h.recovered.map((r) => STORE_AR[r.key] ?? r.key).join('، ')}.{' '}
          {h.recovered.every((r) => r.backup) ? 'لم تُحذف: احتفظنا بنسخة كاملة منها على هذا الجهاز.' : 'تعذّر حفظ نسخة احتياطية منها على هذا الجهاز.'}{' '}
          {h.recovered.every((r) => r.partial) ? 'استُبعدت السجلات غير الصالحة فقط، وبقي سائر تقدّمك كما هو.' : 'بدأ الجزء المتأثّر من حالة فارغة.'}
        </p>
      )}
      <button type="button" onClick={dismissStorageNotice} className="press mt-2 h-9 rounded-full bg-card px-4 text-[12px] font-semibold ring-1 ring-line">فهمت</button>
    </div>
  )
}
