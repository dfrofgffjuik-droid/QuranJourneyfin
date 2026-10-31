// Isolated preview data for the Design Studio. Nothing here reads or writes the
// real app store; Quran text is the verified Tanzil sample already in the repo.
import sample from '../data/quran-sample.json'
import meta from '../data/surahs.json'
export { LETTERS, GROUPS, HARAKAT, JOIN_WORDS, READING_LESSONS, forms } from '../screens/kidsData'

export type SurahMeta = { n: number; ar: string; en: string; meaning: string; place: string; ayat: number; pages: number[] }
export const SURAHS = (meta as { surahs: SurahMeta[] }).surahs
export const BISMILLAH = (meta as { bismillah: string }).bismillah

const S = (sample as { surahs: { sura: number; name: string; ayat: { aya: number; text: string; words: string[] }[] }[] }).surahs
export const sampleSurah = (n: number) => S.find((s) => s.sura === n)
export const FATIHA = sampleSurah(1)!
export const SHORT = [114, 113, 112, 1].map((n) => sampleSurah(n)!)

export const surah = (n: number) => SURAHS[n - 1]

// Brief simplified meanings, labelled as preview text in the UI.
export const FATIHA_MEANING = [
  'أبدأ باسم الله، الرحمن الرحيم.',
  'الثناء الكامل لله، ربّ الخلائق كلّها.',
  'الرحمن الرحيم، واسع الرحمة.',
  'المالك ليوم الجزاء والحساب.',
  'نخصّك وحدك بالعبادة، وبك وحدك نستعين.',
  'دُلّنا على الطريق المستقيم وثبّتنا عليه.',
  'طريق الذين أنعمت عليهم، لا طريق المغضوب عليهم ولا الضالين.',
]

export const toAr = (n: number | string) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

export const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
export const DAYS_SHORT = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']

export const USER = { name: 'أحمد', streak: 12, memorizedAyat: 412, juzDone: 2.4, minutesToday: 18, goalMinutes: 25 }

export type PlanType = 'hifz' | 'muraja' | 'wird' | 'khatmah' | 'custom'
export const PLAN_TYPES: { id: PlanType; ar: string; desc: string; unit: string; icon: string; tone: string }[] = [
  { id: 'hifz', ar: 'خطة حفظ', desc: 'حفظ مقطع جديد كل يوم مع تثبيت ما قبله', unit: 'آيات', icon: 'sprout', tone: 'a' },
  { id: 'muraja', ar: 'خطة مراجعة', desc: 'تدوير ما حفظته سابقًا حتى لا يتفلّت', unit: 'صفحات', icon: 'repeat', tone: 'b' },
  { id: 'wird', ar: 'ورد يومي', desc: 'قراءة ثابتة كل يوم بلا ضغط', unit: 'صفحات', icon: 'book', tone: 'c' },
  { id: 'khatmah', ar: 'خطة ختمة', desc: 'ختم المصحف كاملًا في مدة تختارها', unit: 'صفحات', icon: 'star', tone: 'd' },
  { id: 'custom', ar: 'خطة مخصّصة', desc: 'اختر المقطع والوتيرة والأيام بحرّية', unit: 'آيات', icon: 'layers', tone: 'e' },
]

export type Plan = { id: string; type: PlanType; title: string; target: string; perDay: number; unit: string; days: number[]; done: number; total: number; ends: string }
export const PLANS: Plan[] = [
  { id: 'p1', type: 'hifz', title: 'حفظ جزء تبارك', target: 'الملك ← المرسلات', perDay: 5, unit: 'آيات', days: [0, 1, 2, 3, 4], done: 86, total: 431, ends: '٢٤ رجب' },
  { id: 'p2', type: 'muraja', title: 'مراجعة جزء عمّ', target: 'النبأ ← الناس', perDay: 4, unit: 'صفحات', days: [0, 1, 2, 3, 4, 5, 6], done: 9, total: 23, ends: 'دورية' },
  { id: 'p3', type: 'khatmah', title: 'ختمة رمضان', target: 'المصحف كاملًا', perDay: 20, unit: 'صفحات', days: [0, 1, 2, 3, 4, 5, 6], done: 214, total: 604, ends: '٣٠ رمضان' },
  { id: 'p4', type: 'wird', title: 'الورد اليومي', target: 'من حيث توقفت', perDay: 10, unit: 'صفحات', days: [0, 1, 2, 3, 4, 5], done: 52, total: 70, ends: 'أسبوعي' },
  { id: 'p5', type: 'custom', title: 'الكهف كل جمعة', target: 'سورة الكهف', perDay: 11, unit: 'صفحات', days: [6], done: 3, total: 4, ends: 'شهري' },
]

// Today's agenda (shared by the planner-style concepts).
export const AGENDA = [
  { time: '٥:٤٠', label: 'حفظ جديد', detail: 'الملك ١٦–٢٠', mins: 15, tone: 'a', screen: 'memorize', done: false },
  { time: '٦:٠٠', label: 'مراجعة', detail: 'النبأ + النازعات', mins: 12, tone: 'b', screen: 'revision', done: true },
  { time: '١٣:٠٠', label: 'تسميع', detail: 'الملك ١–١٥', mins: 6, tone: 'e', screen: 'recite', done: false },
  { time: '٢١:٠٠', label: 'الورد', detail: 'صفحة ٢١٥–٢٢٤', mins: 20, tone: 'c', screen: 'khatmah', done: false },
]

export const REVISION = [
  { n: 78, part: 'النبأ ١–٤٠', strength: 0.9, due: 'اليوم' },
  { n: 79, part: 'النازعات ١–٤٦', strength: 0.62, due: 'اليوم' },
  { n: 80, part: 'عبس ١–٤٢', strength: 0.38, due: 'اليوم' },
  { n: 81, part: 'التكوير', strength: 0.74, due: 'غدًا' },
  { n: 82, part: 'الانفطار', strength: 0.55, due: 'غدًا' },
  { n: 83, part: 'المطففين', strength: 0.81, due: 'الاثنين' },
  { n: 67, part: 'الملك ١–١٥', strength: 0.47, due: 'الثلاثاء' },
]

// Week-at-a-glance used by plan & revision schedule previews.
export const WEEK = DAYS.map((d, i) => ({
  day: d,
  short: DAYS_SHORT[i],
  date: toAr(14 + i),
  items: [
    ...(i < 5 ? [{ tone: 'a', label: 'حفظ', detail: `الملك ${toAr(16 + i * 5)}–${toAr(20 + i * 5)}` }] : []),
    { tone: 'b', label: 'مراجعة', detail: ['النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق'][i] },
    ...(i !== 5 ? [{ tone: 'c', label: 'ورد', detail: `${toAr(10)} صفحات` }] : []),
    ...(i === 6 ? [{ tone: 'e', label: 'الكهف', detail: 'يوم الجمعة' }] : []),
  ],
  done: i < 2,
  today: i === 2,
}))

export const HEAT = Array.from({ length: 84 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 1.7) + Math.cos(i * 0.6))
  return i > 80 ? 0 : v > 1.3 ? 3 : v > 0.8 ? 2 : v > 0.3 ? 1 : 0
})

export const JOURNEY = [
  { title: 'أتممت جزء عمّ', when: 'رمضان ١٤٤٥', done: true },
  { title: 'ثلاثون يومًا متتالية', when: 'شوال', done: true },
  { title: 'أول ختمة كاملة', when: 'ذو القعدة', done: true },
  { title: 'جزء تبارك', when: '٢٠٪ متبقٍ', done: false },
  { title: 'جزء قد سمع', when: 'القادم', done: false },
]

// Per-word tasmee' result (demo of Muaalem feedback): 0 correct, 1 close, 2 wrong.
export const RESULT = FATIHA.ayat.slice(0, 4).map((a, ai) => ({
  aya: a.aya,
  words: a.words.map((w, wi) => ({ w, s: ai === 1 && wi === 3 ? 1 : ai === 3 && wi === 1 ? 2 : ai === 2 && wi === 0 ? 1 : 0 })),
}))
export const RESULT_NOTES = [
  { word: 'ٱلْعَـٰلَمِينَ', note: 'مدّ العين أقصر من حركتين', level: 1 },
  { word: 'يَوْمِ', note: 'الواو الساكنة: لِين، لا تُمَدّ', level: 2 },
  { word: 'ٱلرَّحْمَـٰنِ', note: 'الراء مفخّمة هنا', level: 1 },
]

export const KIDS = [
  { id: 'maryam', name: 'مريم', age: 7, stars: 46, letters: 18, surahs: 3, streak: 5, today: 'حرف الخاء', minutes: [8, 12, 0, 10, 15, 9, 6] },
  { id: 'yusuf', name: 'يوسف', age: 9, stars: 112, letters: 28, surahs: 7, streak: 11, today: 'سورة الفلق', minutes: [14, 10, 12, 0, 18, 20, 11] },
]
export const KID = KIDS[0]

export const BADGES = [
  { id: 'b1', ar: 'نجمة الحروف', got: true, tone: 'a' },
  { id: 'b2', ar: 'صديق الحركات', got: true, tone: 'b' },
  { id: 'b3', ar: 'قارئ صغير', got: true, tone: 'c' },
  { id: 'b4', ar: 'حافظ الناس', got: true, tone: 'd' },
  { id: 'b5', ar: 'خمسة أيام', got: false, tone: 'e' },
  { id: 'b6', ar: 'حافظ الفلق', got: false, tone: 'a' },
]

export const ENCOURAGE = ['أحسنت!', 'رائع جدًّا!', 'ما شاء الله!', 'بطل!', 'استمرّ هكذا!']

export const RECITERS = ['مشاري العفاسي', 'محمود خليل الحصري', 'عبد الرحمن السديس', 'محمد صدّيق المنشاوي']
