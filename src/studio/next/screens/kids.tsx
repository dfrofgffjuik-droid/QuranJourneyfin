// عالم الأطفال — isometric learning house (design preview). Lesson inventories
// come from screens/kidsData.ts; completion comes from the shared preview store
// (../progress): every lesson has a stable id, is recorded once and earns one star.
// Lessons are played inside the preview so nothing is written to the app's kids data.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { Box, GlowDefs, STATUS_COLOR, kernel, tint, type Faces, type Status } from '../iso'
import { actions, derived, usePreview, type Room as KidsRoom } from '../progress'
import { DataBar } from '../previewUi'
import { HARAKAT, JOIN_WORDS, LETTERS, READING_LESSONS } from '../../../screens/kidsData'
import { BISMILLAH_HAFS, hasBismillahHeader, loadMushaf, surah } from '../../../lib/quran'

const roomStatus = (r: KidsRoom): Status => (r.done === 0 ? 'idle' : r.done >= r.total ? 'done' : 'progress')
const DECOR: Record<string, string> = { garden: 'var(--color-kid-1)', sun: 'var(--color-kid-2)', sky: 'var(--color-kid-3)', rose: 'var(--color-kid-4)', lilac: 'var(--color-kid-5)' }

const WALL = 56
const T = 6
type Rect = { x: number; y: number; w: number; d: number }
const ROOMS: Record<KidsRoom['id'], Rect & { tone: string }> = {
  letters: { x: 0, y: 0, w: 112, d: 108, tone: 'var(--color-kid-1)' },
  harakat: { x: 112, y: 0, w: 112, d: 108, tone: 'var(--color-kid-2)' },
  joining: { x: 224, y: 0, w: 112, d: 108, tone: 'var(--color-kid-3)' },
  reading: { x: 0, y: 140, w: 168, d: 100, tone: 'var(--color-kid-4)' },
  surahs: { x: 168, y: 140, w: 168, d: 100, tone: 'var(--color-kid-5)' },
}

/** Shortcut to the children's rewards (Rewards & Achievements, kids mode). */
function StarsLink() {
  const { go } = useProto()
  const stars = derived(usePreview()).stars
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={() => go('rewards', 'kids')} className="press flex h-9 items-center gap-1.5 rounded-full bg-kid-2 px-3 text-[12.5px] font-semibold" data-kids-stars={stars}><Icon name="star" size={15} fill className="text-gold" />نجومي · {toAr(stars)}</button>
      <DataBar compact />
    </span>
  )
}

export function KidsHouse() {
  const device = useDevice()
  const [sel, setSel] = useState<KidsRoom['id']>('letters')
  const st = usePreview()
  const rooms = derived(st).rooms
  const room = rooms.find((r) => r.id === sel)!
  const intro = 'خمس غرف، لكل غرفة درس. اختر غرفة لترى رحلتها وتقدّمك فيها.'
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
            <Head title="عالم الأطفال" sub={intro} action={<StarsLink />} />
            <House rooms={rooms} decor={st.decor} sel={sel} onSel={setSel} />
          </div>
          <aside className="no-scrollbar w-[370px] shrink-0 overflow-y-auto border-s border-line/60 bg-card/60 p-6"><RoomPanel r={room} /></aside>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-8 pt-4">
        <MoreTabs />
        <Head title="عالم الأطفال" sub={intro} action={<StarsLink />} />
        <House rooms={rooms} decor={st.decor} sel={sel} onSel={setSel} />
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {rooms.map((r) => (
            <button key={r.id} type="button" onClick={() => setSel(r.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] ${sel === r.id ? 'bg-night text-parchment' : 'bg-card ring-1 ring-line'}`}>
              <Icon name={r.icon} size={15} />
              {r.ar}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-[26px] bg-card p-5 ring-1 ring-line"><RoomPanel r={room} /></div>
      </div>
    </Chrome>
  )
}

function House({ rooms, decor, sel, onSel }: { rooms: KidsRoom[]; decor: string; sel: KidsRoom['id']; onSel: (id: KidsRoom['id']) => void }) {
  const k = kernel(244, 86)
  // The optional decoration the child unlocked tints the garden around the house.
  const ground = tint(decor === 'garden' ? 'var(--color-leaf)' : DECOR[decor] ?? 'var(--color-leaf)', decor === 'garden' ? 0.18 : 0.5)
  return (
    <svg viewBox="0 0 540 420" className="mx-auto w-full max-w-[640px]" role="group" aria-label="بيت التعلّم: خمس غرف">
      <GlowDefs id="kid" />
      <Box k={k} x={-18} y={-18} z={-10} w={372} d={278} h={10} f={ground} />
      {/* Courtyard path between the two rows */}
      <polygon points={k.poly([[-18, 112], [354, 112], [354, 136], [-18, 136]].map(([x, y]) => [x, y, 0] as [number, number, number]))} fill="var(--color-card)" opacity={0.9} />
      {rooms.map((r) => (
        <Room key={r.id} k={k} r={r} rect={ROOMS[r.id]} on={sel === r.id} onSel={() => onSel(r.id)} />
      ))}
      {/* Entrance sign */}
      <g>
        <Box k={k} x={160} y={262} z={0} w={4} d={4} h={34} f={tint('var(--color-gold)', 0.4)} />
        <g transform={k.FRONT(132, 266, 52)}>
          <rect width={60} height={18} rx={4} fill="var(--color-gold)" />
          <text x={30} y={12.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="white">بيت التعلّم</text>
        </g>
      </g>
    </svg>
  )
}

function Room({ k, r, rect, on, onSel }: { k: ReturnType<typeof kernel>; r: KidsRoom; rect: Rect & { tone: string }; on: boolean; onSel: () => void }) {
  const { x, y, w, d, tone } = rect
  const st = roomStatus(r)
  const wall: Faces = { top: 'var(--color-card)', front: `color-mix(in oklab, ${tone} 55%, var(--color-card))`, side: `color-mix(in oklab, ${tone} 70%, var(--color-night) 10%)`, stroke: 'color-mix(in oklab, var(--color-line) 70%, var(--color-night) 15%)' }
  const floor = `color-mix(in oklab, ${tone} 80%, var(--color-card))`
  const [lx, ly] = k.P(x + w / 2, y + d / 2, WALL + 24)
  const [cx, cy] = k.P(x + w / 2, y + d / 2, 10)
  return (
    <g className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`غرفة ${r.ar}: ${r.done} من ${r.total}`} onClick={onSel} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel())}>
      <polygon points={k.poly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill={floor} stroke={wall.stroke} strokeWidth={0.8} />
      {st !== 'idle' && <ellipse className="iso-halo" cx={cx} cy={cy} rx={w * 0.55} ry={d * 0.3} fill={STATUS_COLOR[st]} filter="url(#kid-bloom)" />}
      <Box k={k} x={x} y={y} z={0} w={w} d={T} h={WALL} f={wall} />
      <Box k={k} x={x} y={y} z={0} w={T} d={d} h={WALL} f={wall} />
      <Props k={k} id={r.id} x={x} y={y} w={w} d={d} lit={st !== 'idle'} />
      {on && <polygon points={k.poly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="none" stroke="var(--color-night)" strokeWidth={1.8} />}
      <g className="iso-lift">
        <rect x={lx - 38} y={ly - 13} width={76} height={24} rx={12} fill="var(--color-card)" stroke={on ? 'var(--color-night)' : 'var(--color-line)'} strokeWidth={on ? 1.4 : 0.8} />
        <circle cx={lx + 26} cy={ly - 1} r={4} fill={st === 'idle' ? 'var(--color-line)' : STATUS_COLOR[st]} />
        <text x={lx - 4} y={ly + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--color-night)">{r.ar}</text>
      </g>
    </g>
  )
}

/** Room furniture that tells what is learned inside. */
function Props({ k, id, x, y, w, d, lit }: { k: ReturnType<typeof kernel>; id: KidsRoom['id']; x: number; y: number; w: number; d: number; lit: boolean }) {
  const ink = 'var(--color-night)'
  const wood = tint('var(--color-gold)', 0.35)
  const board = (children: ReactNode, bw = w - 40, bh = 28, bg = 'color-mix(in oklab, var(--color-leaf) 55%, var(--color-night) 35%)') => (
    <g transform={k.FRONT(x + 20, y + T, WALL - 10)}>
      <rect width={bw} height={bh} rx={3} fill={bg} stroke="var(--color-gold)" strokeWidth={1} />
      {children}
    </g>
  )
  if (id === 'letters')
    return (
      <g>
        {board(<text x={(w - 40) / 2} y={20} textAnchor="middle" fontSize={15} fill="white" fontFamily="'IBM Plex Sans Arabic'">أ ب ت</text>)}
        <Box k={k} x={x + 30} y={y + 50} z={0} w={34} d={22} h={14} f={wood} />
        <Box k={k} x={x + 72} y={y + 54} z={0} w={12} d={12} h={9} f={tint('var(--color-sky)', 0.5)} />
      </g>
    )
  if (id === 'harakat')
    return (
      <g>
        {board(<text x={(w - 40) / 2} y={21} textAnchor="middle" fontSize={16} fill="var(--color-night)" fontFamily="'Amiri'">بَ بِ بُ</text>, w - 40, 28, 'var(--color-card)')}
        {[0, 1, 2].map((i) => <Box key={i} k={k} x={x + 22 + i * 26} y={y + 62} z={0} w={20} d={20} h={7} f={tint(['var(--color-clay)', 'var(--color-gold)', 'var(--color-sky)'][i], 0.55)} />)}
      </g>
    )
  if (id === 'joining')
    return (
      <g>
        {['ب', 'ي', 'ت'].map((ch, i) => (
          <g key={ch}>
            <Box k={k} x={x + 24 + i * 24} y={y + 46} z={0} w={20} d={20} h={20} f={tint(['var(--color-sky)', 'var(--color-gold)', 'var(--color-leaf)'][i], 0.6)} />
            <g transform={k.FRONT(x + 24 + i * 24, y + 66, 20)}><text x={10} y={15} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>{ch}</text></g>
          </g>
        ))}
        <g transform={k.FRONT(x + 20, y + T, WALL - 12)}><text x={(w - 40) / 2} y={14} textAnchor="middle" fontSize={11} fill={ink}>بـيـت = بيت</text></g>
      </g>
    )
  if (id === 'reading')
    return (
      <g>
        <Box k={k} x={x + T} y={y + 12} z={0} w={16} d={70} h={44} f={wood} />
        {[0, 1, 2, 3].map((i) => <Box key={i} k={k} x={x + T + 4} y={y + 18 + i * 15} z={24} w={10} d={10} h={14} f={tint(['var(--color-clay)', 'var(--color-sky)', 'var(--color-gold)', 'var(--color-leaf)'][i], 0.55)} />)}
        <Box k={k} x={x + 62} y={y + 40} z={0} w={50} d={30} h={16} f={wood} />
        <polygon points={k.poly([[x + 66, y + 44, 17], [x + 87, y + 44, 21], [x + 87, y + 66, 21], [x + 66, y + 66, 17]])} fill="var(--color-card)" stroke="var(--color-line)" strokeWidth={0.6} />
        <polygon points={k.poly([[x + 87, y + 44, 21], [x + 108, y + 44, 17], [x + 108, y + 66, 17], [x + 87, y + 66, 21]])} fill="var(--color-card)" stroke="var(--color-line)" strokeWidth={0.6} />
        <g transform={k.FRONT(x + 40, y + T, WALL - 10)}><text x={50} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>اقرأ</text></g>
      </g>
    )
  // surahs: book stand (rahl) with a lantern
  const [lx, ly] = k.P(x + 120, y + 40, 46)
  return (
    <g>
      <Box k={k} x={x + 40} y={y + 40} z={0} w={60} d={34} h={10} f={tint('var(--color-leaf)', 0.4)} />
      <polygon points={k.poly([[x + 52, y + 50, 10], [x + 88, y + 50, 10], [x + 88, y + 62, 30], [x + 52, y + 62, 30]])} fill={wood.front} stroke={wood.stroke} strokeWidth={0.8} />
      <polygon points={k.poly([[x + 55, y + 52, 13], [x + 85, y + 52, 13], [x + 85, y + 61, 28], [x + 55, y + 61, 28]])} fill="var(--color-card)" />
      <line x1={lx} y1={ly - 22} x2={lx} y2={ly - 8} stroke="var(--color-line)" strokeWidth={0.8} />
      {lit && <circle className="iso-halo" cx={lx} cy={ly} r={16} fill="var(--color-gold)" filter="url(#kid-bloom)" />}
      <rect x={lx - 5} y={ly - 8} width={10} height={14} rx={3} fill={lit ? 'var(--color-gold)' : 'var(--color-card)'} stroke="var(--color-gold)" strokeWidth={0.8} />
    </g>
  )
}

function RoomPanel({ r }: { r: KidsRoom }) {
  const st = roomStatus(r)
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gold-soft text-gold"><Icon name={r.icon} size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-arabic-display text-[20px] font-bold">{r.ar}</h2>
          <p className="text-[13px] text-muted">{r.sub}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span><b className="text-[20px]">{toAr(r.done)}</b> <span className="text-muted">من {toAr(r.total)}</span></span>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${st === 'done' ? 'bg-leaf/10 text-leaf' : st === 'progress' ? 'bg-gold-soft' : 'bg-night/[.05] text-muted'}`}>{st === 'done' ? 'اكتملت' : st === 'progress' ? 'نتعلّمها الآن' : 'لم نبدأ بعد'}</span>
      </div>
      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-gold" style={{ width: `${(r.done / r.total) * 100}%` }} /></span>
      <RoomLessons key={r.id} r={r} />
    </div>
  )
}

/** Room journey (each tile is a lesson) + the lesson player. Progress is recorded once per lesson. */
function RoomLessons({ r }: { r: KidsRoom }) {
  const st = usePreview()
  const done = derived(st).lessonsDone
  const firstOpen = r.lessons.findIndex((l) => !done.has(l.id))
  const [cur, setCur] = useState(firstOpen < 0 ? 0 : firstOpen)
  const l = r.lessons[cur]
  return (
    <div>
      <p className="mb-2 mt-5 text-[12.5px] font-semibold text-muted">رحلة الغرفة · اختر درسًا</p>
      <ol className="grid grid-cols-5 gap-1.5" dir="rtl">
        {r.lessons.map((it, i) => {
          const s = done.has(it.id) ? 'done' : i === cur ? 'next' : 'todo'
          return (
            <li key={it.id}>
              <button type="button" onClick={() => setCur(i)} aria-pressed={i === cur} aria-label={`${it.label}${s === 'done' ? '، مكتمل' : ''}`} data-lesson={it.id} data-done={s === 'done'} className={`press flex aspect-square w-full items-center justify-center rounded-[14px] text-center ${r.id === 'reading' || r.id === 'surahs' ? 'text-[10.5px] leading-tight' : 'text-[20px]'} ${s === 'done' ? 'bg-leaf/12 text-leaf ring-1 ring-leaf/30' : 'bg-night/[.04] text-muted'} ${i === cur ? 'ring-2 ring-gold' : ''}`} style={r.id === 'letters' || r.id === 'harakat' || r.id === 'joining' ? { fontFamily: "'Amiri'" } : undefined}>
                {it.label}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-leaf" />مكتمل</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" />المختار</span>
      </div>
      <div className="mt-4 rounded-[22px] bg-kid-2/50 p-4" data-player={l.id}>
        <Player key={l.id} room={r.id} index={cur} id={l.id} done={done.has(l.id)} onNext={() => setCur((c) => Math.min(r.lessons.length - 1, c + 1))} last={cur === r.lessons.length - 1} />
      </div>
    </div>
  )
}

function Player({ room, index, id, done, onNext, last }: { room: KidsRoom['id']; index: number; id: string; done: boolean; onNext: () => void; last: boolean }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [won, setWon] = useState(false)
  const finish = () => {
    if (won) return
    setWon(true)
    // The store ignores a second completion of the same lesson; no duplicate stars.
    const fresh = actions.completeLesson(id)
    setMsg(fresh ? 'أحسنت! نلت نجمة' : 'أحسنت! أتممت هذا الدرس من قبل، ونجمته محفوظة لك.')
  }
  const footer = (
    <div className="mt-3 flex items-center gap-2">
      <p className="flex-1 text-[12.5px] font-semibold" role="status" data-player-msg>{msg ?? (done ? 'أتممت هذا الدرس · يمكنك التدرّب مرة أخرى' : '')}</p>
      {(won || done) && !last && <button type="button" onClick={onNext} className="press h-9 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment">الدرس التالي</button>}
    </div>
  )
  if (room === 'letters' || room === 'harakat') {
    const pool = room === 'letters' ? LETTERS.map((x) => ({ show: x.ch, name: x.name })) : HARAKAT.map((h) => ({ show: `ب${h.mark}`, name: h.ar }))
    const q = pool[index]
    const opts = [index, (index + 3) % pool.length, (index + 7) % pool.length].filter((v, i, xs) => xs.indexOf(v) === i).sort((a, b) => ((a * 5) % 7) - ((b * 5) % 7))
    return (
      <div>
        <p className="text-[14px] font-semibold">{room === 'letters' ? <>أين حرف «{q.name}»؟</> : <>ما اسم هذه الحركة؟ <span className="text-[28px]" style={{ fontFamily: "'Amiri'" }}>{q.show}</span></>}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {opts.map((o) => (
            <button key={o} type="button" disabled={won} onClick={() => (o === index ? finish() : setMsg('حاول مرة أخرى، أنت قريب!'))} data-opt={o === index ? 'right' : 'wrong'} className={`press h-16 rounded-[18px] bg-card ring-1 ring-line ${room === 'letters' ? 'text-[30px]' : 'text-[14px] font-semibold'} ${won && o === index ? 'bg-leaf/15 ring-leaf' : ''}`} style={room === 'letters' ? { fontFamily: "'Amiri'" } : undefined}>
              {room === 'letters' ? pool[o].show : pool[o].name}
            </button>
          ))}
        </div>
        {footer}
      </div>
    )
  }
  if (room === 'joining') return <JoinPlayer word={JOIN_WORDS[index]} won={won} onWin={finish} footer={footer} />
  if (room === 'reading') return <ReadPlayer items={READING_LESSONS[index].items} title={READING_LESSONS[index].ar} won={won} onWin={finish} footer={footer} />
  return <SurahPlayer n={Number(id.split(':')[1])} won={won} onWin={finish} footer={footer} />
}

function JoinPlayer({ word, won, onWin, footer }: { word: (typeof JOIN_WORDS)[number]; won: boolean; onWin: () => void; footer: ReactNode }) {
  const tiles = useMemo(() => word.letters.map((ch, i) => ({ ch, i })).sort((a, b) => ((a.i * 7 + 3) % 5) - ((b.i * 7 + 3) % 5)), [word])
  const [picked, setPicked] = useState<number[]>([])
  const [hint, setHint] = useState('')
  const tap = (i: number) => {
    if (won || picked.includes(i)) return
    if (word.letters[picked.length] !== word.letters[i]) return setHint('ليس هذا الحرف، جرّب حرفًا آخر')
    const next = [...picked, i]
    setPicked(next)
    setHint('')
    if (next.length === word.letters.length) onWin()
  }
  return (
    <div>
      <p className="text-[14px] font-semibold">صِل الحروف لتكتب: «{word.meaning[0]}»</p>
      <p className="mt-2 min-h-12 rounded-[16px] bg-card px-3 py-2 text-center text-[30px]" style={{ fontFamily: "'Amiri'" }} data-built>{picked.map((i) => word.letters[i]).join('') || '…'}</p>
      <div className="mt-2 flex justify-center gap-2">
        {tiles.map((t) => <button key={t.i} type="button" disabled={won || picked.includes(t.i)} onClick={() => tap(t.i)} className="press h-14 w-14 rounded-[16px] bg-card text-[26px] ring-1 ring-line disabled:opacity-30" style={{ fontFamily: "'Amiri'" }} data-tile>{t.ch}</button>)}
      </div>
      {hint && <p className="mt-2 text-center text-[12px] text-muted">{hint}</p>}
      {!won && picked.length > 0 && <button type="button" onClick={() => setPicked([])} className="press mx-auto mt-2 block text-[12px] text-muted underline">ابدأ الكلمة من جديد</button>}
      {footer}
    </div>
  )
}

function ReadPlayer({ items, title, won, onWin, footer }: { items: string[]; title: string; won: boolean; onWin: () => void; footer: ReactNode }) {
  const [read, setRead] = useState<Record<number, true>>({})
  const all = Object.keys(read).length === items.length
  return (
    <div>
      <p className="text-[14px] font-semibold">{title}: اقرأ كل بطاقة بصوت عالٍ ثم المسها</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {items.map((it, i) => <button key={i} type="button" onClick={() => setRead((x) => ({ ...x, [i]: true }))} aria-pressed={!!read[i]} className={`press min-w-14 rounded-[14px] px-3 py-2 text-[24px] ring-1 ${read[i] ? 'bg-leaf/15 ring-leaf' : 'bg-card ring-line'}`} style={{ fontFamily: "'Amiri'" }} data-read-item>{it}</button>)}
      </div>
      <button type="button" disabled={!all || won} onClick={onWin} className="press mt-3 h-11 w-full rounded-full bg-night text-[13px] font-semibold text-parchment disabled:opacity-40" data-read-done>{all ? 'أتممت الدرس' : `بقي ${toAr(items.length - Object.keys(read).length)}`}</button>
      {footer}
    </div>
  )
}

/**
 * Short surah: the real text from the verified Mushaf, read and repeated ayah by ayah with a
 * parent. No licensed audio is bundled, so there is no play button — the screen says so.
 * The star is granted once, only after the parent confirms (the store ignores repeats).
 */
function SurahPlayer({ n, won, onWin, footer }: { n: number; won: boolean; onWin: () => void; footer: ReactNode }) {
  const [sure, setSure] = useState(false)
  const [text, setText] = useState<{ n: number; ayat: string[]; hafs: boolean } | null | false>(null)
  const [attempt, setAttempt] = useState(0)
  const [reps, setReps] = useState<Record<number, number>>({})
  useEffect(() => {
    let live = true
    setText(null)
    loadMushaf(n).then((r) => live && setText({ n, ayat: r.ayat, hafs: r.hafs }), () => live && setText(false))
    return () => {
      live = false
    }
  }, [n, attempt])
  const ready = text && text.n === n ? text : null
  const total = ready ? ready.ayat.length : surah(n).ayat
  const readAll = !!ready && ready.ayat.every((_, i) => (reps[i] ?? 0) >= 1)
  const repeated = ready ? ready.ayat.filter((_, i) => (reps[i] ?? 0) >= 1).length : 0
  return (
    <div data-kids-surah={n}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-semibold">سورة {surah(n).ar} · {toAr(total)} {total >= 3 && total <= 10 ? 'آيات' : 'آية'}</p>
        <span className="rounded-full bg-card px-2.5 py-1 text-[11.5px] font-semibold" data-kids-progress>كرّرت {toAr(repeated)} من {toAr(total)}</span>
      </div>
      <p className="mt-2 flex items-start gap-1.5 rounded-[14px] bg-card/70 p-2.5 text-[12px] text-muted" data-audio-unavailable><Icon name="info" size={14} className="mt-0.5 shrink-0" />الاستماع غير متوفّر حاليًا في هذه المعاينة. اقرأ الآيات مع وليّ أمرك أو معلّمك، وكرّر كل آية بعده.</p>
      <div className="mf-paper mt-3 rounded-[20px] p-3">
        {text === false ? (
          <p role="alert" className="text-[13px]">تعذّر تحميل نص السورة. <button type="button" onClick={() => setAttempt((x) => x + 1)} className="font-semibold underline">أعد المحاولة</button></p>
        ) : !ready ? (
          <div className="h-20 animate-pulse rounded-xl bg-night/5" role="status" aria-label="جارٍ تحميل السورة" />
        ) : (
          <>
            {hasBismillahHeader(n) && <p className={`mf-text ${ready.hafs ? '' : 'tanzil'} text-center`} style={{ fontSize: 20, lineHeight: 2 }}>{BISMILLAH_HAFS}</p>}
            <ol className="space-y-1.5">
              {ready.ayat.map((t, i) => {
                const r = reps[i] ?? 0
                return (
                  <li key={i} className={`rounded-[14px] px-2 py-1 ${r ? 'bg-leaf/10' : ''}`}>
                    <p className={`mf-text ${ready.hafs ? '' : 'tanzil'}`} style={{ fontSize: 22, lineHeight: 2.05, textAlign: 'right', textAlignLast: 'right' }}>{t} <span className="mf-num">{toAr(i + 1)}</span></p>
                    <div className="flex items-center justify-end gap-2 pb-1">
                      <span className="flex gap-1" aria-label={`كُرّرت ${r} من ٣`}>{[0, 1, 2].map((k) => <span key={k} className={`h-2 w-2 rounded-full ${k < r ? 'bg-gold' : 'bg-night/15'}`} />)}</span>
                      <button type="button" disabled={r >= 3 || won} onClick={() => setReps((x) => ({ ...x, [i]: Math.min(3, (x[i] ?? 0) + 1) }))} className="press h-10 rounded-full bg-card px-4 text-[12.5px] font-semibold ring-1 ring-line disabled:opacity-50" data-repeat={i + 1}>{r >= 3 ? 'أحسنت!' : 'كرّرتها'}</button>
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </div>
      <p className="mt-3 text-[12.5px] text-muted">تُحسب السورة محفوظة فقط حين يستمع وليّ الأمر إلى طفله ويؤكّد أنه أتقنها.</p>
      <label className={`mt-2 flex items-center gap-2 rounded-[14px] bg-card p-3 text-[13px] ${!readAll && !won ? 'opacity-60' : ''}`}>
        <input type="checkbox" checked={sure} disabled={won || !readAll} onChange={(e) => setSure(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" data-parent-confirm />
        أؤكّد (وليّ الأمر) أنني استمعت وأن طفلي أتقن سورة {surah(n).ar}
      </label>
      {!readAll && !won && <p className="mt-1 text-[11.5px] text-muted">كرّر كل آية مرة على الأقل ليظهر تأكيد وليّ الأمر.</p>}
      <button type="button" disabled={!sure || won || !readAll} onClick={onWin} className="press mt-3 h-11 w-full rounded-full bg-night text-[13px] font-semibold text-parchment disabled:opacity-40" data-surah-done>سجّل السورة محفوظة</button>
      {footer}
    </div>
  )
}
