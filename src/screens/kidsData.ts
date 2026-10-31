// Children's reading path content. Letters, names and everyday practice words
// only. No Quranic text is typed here (surahs come from the verified Tanzil files).

export type Letter = { ch: string; name: string; sound: string; group: Group; joinsNext: boolean }
export type Group = 'jawf' | 'halq' | 'lisan' | 'shafatan'

export const GROUPS: Record<Group, { ar: string; en: string; hint: [string, string] }> = {
  jawf: { ar: 'الجوف', en: 'The open mouth', hint: ['يخرج الصوت ممتدًّا من الفم المفتوح', 'The sound flows out of the open mouth'] },
  halq: { ar: 'الحلق', en: 'The throat', hint: ['يخرج الصوت من الحلق', 'The sound comes from the throat'] },
  lisan: { ar: 'اللسان', en: 'The tongue', hint: ['يعمل اللسان في نطق هذا الحرف', 'The tongue makes this sound'] },
  shafatan: { ar: 'الشفتان', en: 'The lips', hint: ['تشترك الشفتان في نطق هذا الحرف', 'The lips make this sound'] },
}

const L = (ch: string, name: string, sound: string, group: Group, joinsNext = true): Letter => ({ ch, name, sound, group, joinsNext })

export const LETTERS: Letter[] = [
  L('ا', 'أَلِف', 'a / ā', 'jawf', false),
  L('ب', 'بَاء', 'b', 'shafatan'),
  L('ت', 'تَاء', 't', 'lisan'),
  L('ث', 'ثَاء', 'th', 'lisan'),
  L('ج', 'جِيم', 'j', 'lisan'),
  L('ح', 'حَاء', 'ḥ', 'halq'),
  L('خ', 'خَاء', 'kh', 'halq'),
  L('د', 'دَال', 'd', 'lisan', false),
  L('ذ', 'ذَال', 'dh', 'lisan', false),
  L('ر', 'رَاء', 'r', 'lisan', false),
  L('ز', 'زَاي', 'z', 'lisan', false),
  L('س', 'سِين', 's', 'lisan'),
  L('ش', 'شِين', 'sh', 'lisan'),
  L('ص', 'صَاد', 'ṣ', 'lisan'),
  L('ض', 'ضَاد', 'ḍ', 'lisan'),
  L('ط', 'طَاء', 'ṭ', 'lisan'),
  L('ظ', 'ظَاء', 'ẓ', 'lisan'),
  L('ع', 'عَيْن', 'ʿ', 'halq'),
  L('غ', 'غَيْن', 'gh', 'halq'),
  L('ف', 'فَاء', 'f', 'shafatan'),
  L('ق', 'قَاف', 'q', 'lisan'),
  L('ك', 'كَاف', 'k', 'lisan'),
  L('ل', 'لَام', 'l', 'lisan'),
  L('م', 'مِيم', 'm', 'shafatan'),
  L('ن', 'نُون', 'n', 'lisan'),
  L('ه', 'هَاء', 'h', 'halq'),
  L('و', 'وَاو', 'w', 'shafatan', false),
  L('ي', 'يَاء', 'y', 'lisan'),
]

const ZWJ = '\u200D'
/** Contextual forms rendered by the browser's Arabic shaping. */
export function forms(l: Letter) {
  return {
    isolated: l.ch,
    initial: l.joinsNext ? l.ch + ZWJ : l.ch,
    medial: l.joinsNext ? ZWJ + l.ch + ZWJ : ZWJ + l.ch,
    final: ZWJ + l.ch,
  }
}

export const HARAKAT = [
  { mark: '\u064E', ar: 'فَتْحَة', en: 'Fatha', sound: (s: string) => `${s}a` },
  { mark: '\u0650', ar: 'كَسْرَة', en: 'Kasra', sound: (s: string) => `${s}i` },
  { mark: '\u064F', ar: 'ضَمَّة', en: 'Damma', sound: (s: string) => `${s}u` },
  { mark: '\u0652', ar: 'سُكُون', en: 'Sukun', sound: (s: string) => `${s} (stop)` },
  { mark: '\u064B', ar: 'تَنْوِين فَتْح', en: 'Tanwin fath', sound: (s: string) => `${s}an` },
  { mark: '\u064D', ar: 'تَنْوِين كَسْر', en: 'Tanwin kasr', sound: (s: string) => `${s}in` },
  { mark: '\u064C', ar: 'تَنْوِين ضَمّ', en: 'Tanwin damm', sound: (s: string) => `${s}un` },
  { mark: '\u0651', ar: 'شَدَّة', en: 'Shadda', sound: (s: string) => `${s}${s} (doubled)` },
]

/** Everyday words (not Quranic text) for joining practice. */
export const JOIN_WORDS: { word: string; letters: string[]; meaning: [string, string] }[] = [
  { word: 'باب', letters: ['ب', 'ا', 'ب'], meaning: ['باب', 'door'] },
  { word: 'بيت', letters: ['ب', 'ي', 'ت'], meaning: ['بيت', 'house'] },
  { word: 'قلم', letters: ['ق', 'ل', 'م'], meaning: ['قلم', 'pen'] },
  { word: 'شمس', letters: ['ش', 'م', 'س'], meaning: ['شمس', 'sun'] },
  { word: 'قمر', letters: ['ق', 'م', 'ر'], meaning: ['قمر', 'moon'] },
  { word: 'نور', letters: ['ن', 'و', 'ر'], meaning: ['نور', 'light'] },
  { word: 'بحر', letters: ['ب', 'ح', 'ر'], meaning: ['بحر', 'sea'] },
  { word: 'كتاب', letters: ['ك', 'ت', 'ا', 'ب'], meaning: ['كتاب', 'book'] },
]

/** Graded reading drills: syllables → voweled words. */
export const READING_LESSONS: { id: string; ar: string; en: string; items: string[] }[] = [
  { id: 'fatha', ar: 'حروف بالفتحة', en: 'Letters with fatha', items: ['بَ', 'تَ', 'ثَ', 'جَ', 'حَ', 'خَ', 'دَ', 'ذَ', 'رَ', 'زَ'] },
  { id: 'mixed', ar: 'فتحة وكسرة وضمة', en: 'Fatha, kasra, damma', items: ['بَ', 'بِ', 'بُ', 'مَ', 'مِ', 'مُ', 'نَ', 'نِ', 'نُ', 'كَ', 'كِ', 'كُ'] },
  { id: 'words3', ar: 'كلمات من ثلاثة أحرف', en: 'Three-letter words', items: ['كَتَبَ', 'ذَهَبَ', 'جَلَسَ', 'فَتَحَ', 'خَرَجَ', 'دَخَلَ', 'شَكَرَ', 'سَمِعَ'] },
  { id: 'sukun', ar: 'السكون', en: 'Sukun', items: ['مِنْ', 'عَنْ', 'لَمْ', 'هَلْ', 'قُلْ', 'بَلْ', 'كَمْ', 'أَنْ'] },
  { id: 'madd', ar: 'المدّ بالألف والواو والياء', en: 'Long vowels', items: ['بَا', 'بُو', 'بِي', 'قَالَ', 'نُورٌ', 'كِتَابٌ', 'بَابٌ', 'فِيلٌ'] },
]
