import { useP } from '../proto'

export const NAV = [
  { s: 'home', l: 'الرئيسية', ic: 'home' },
  { s: 'library', l: 'المصحف', ic: 'book' },
  { s: 'plans', l: 'الخطط', ic: 'calendar' },
  { s: 'revision', l: 'المراجعة', ic: 'repeat' },
  { s: 'khatmah', l: 'الورد', ic: 'bookmark' },
  { s: 'recite', l: 'التسميع', ic: 'mic' },
  { s: 'progress', l: 'رحلتي', ic: 'path' },
  { s: 'settings', l: 'الإعدادات', ic: 'settings' },
]
export const KNAV = [
  { s: 'k-home', l: 'بيتي', ic: 'home' },
  { s: 'k-letters', l: 'الحروف', ic: 'letters' },
  { s: 'k-surahs', l: 'السور', ic: 'book' },
  { s: 'k-rewards', l: 'جوائزي', ic: 'trophy' },
]
export const pick = (...ids: string[]) => ids.map((id) => [...NAV, ...KNAV].find((n) => n.s === id)!)

export function useRootTab() {
  const { stack } = useP()
  return stack[0]?.s
}

export const SIX = [
  { s: 'k-letters', l: 'الحروف', ic: 'letters', d: 'أصوات ومخارج' },
  { s: 'k-harakat', l: 'الحركات', ic: 'sparkle', d: 'فتحة كسرة ضمة' },
  { s: 'k-joining', l: 'وصل الحروف', ic: 'layers', d: 'اصنع كلمة' },
  { s: 'k-reading', l: 'أقرأ', ic: 'book', d: 'تمارين قصيرة' },
  { s: 'k-surahs', l: 'سوري', ic: 'ear', d: 'استمع واحفظ' },
  { s: 'k-rewards', l: 'جوائزي', ic: 'trophy', d: 'نجوم وملصقات' },
]
