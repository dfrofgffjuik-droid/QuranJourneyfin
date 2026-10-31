// Design Studio registry. To add a concept: create src/studio/concepts/<id>.tsx
// exporting a Concept and append it to CONCEPTS. To add a reference: drop the
// image in public/design-studio/refs/ and append an entry to REFERENCES; existing
// concepts are never replaced automatically.
import type { Concept } from './kit'
import { sakina } from './concepts/sakina'
import { mihrab } from './concepts/mihrab'
import { jadwal } from './concepts/jadwal'
import { makhtut } from './concepts/makhtut'
import { rawda } from './concepts/rawda'
import { nuqta } from './concepts/nuqta'

export const CONCEPTS: Concept[] = [sakina, mihrab, jadwal, makhtut, rawda, nuqta]

export type Reference = { id: string; file: string; title: string; notes: string; batch: number }
export const REFERENCES: Reference[] = [
  { id: 'r01', file: 'r01.jpg', title: 'Khatam, reader & ayah sheet', notes: 'Green dawn header, 3D book, ayah cards with Mark, action sheet tiles, floating reciter pill.', batch: 1 },
  { id: 'r02', file: 'r02.webp', title: 'Ramadhan Pro schedule', notes: 'Sidebar workspace, week calendar, pastel colour-coded sessions.', batch: 1 },
  { id: 'r03', file: 'r03.webp', title: 'Iqraa onboarding & home', notes: 'Soft green gradient, icon tiles, floating dock, Hifz cards.', batch: 1 },
  { id: 'r04', file: 'r04.jpg', title: 'Recitation result', notes: 'Dark teal card, correct / intermediate / wrong word colours.', batch: 1 },
  { id: 'r05', file: 'r05.jpg', title: 'AI feedback, step 3', notes: 'Coach-mark popover with gradient step pill, glowing mic.', batch: 1 },
  { id: 'r06', file: 'r06.jpg', title: 'AI feedback, transition', notes: 'Animated step change in the coach mark.', batch: 1 },
  { id: 'r07', file: 'r07.jpg', title: 'AI feedback, step 1', notes: 'Record / discard / send controls preview.', batch: 1 },
  { id: 'r08', file: 'r08.jpg', title: 'AI feedback, step 1 (alt)', notes: 'Minimal record prompt.', batch: 1 },
  { id: 'r09', file: 'r09.jpg', title: 'AI feedback, step 3 (alt)', notes: 'Progress bar and "Good job" confirmation.', batch: 1 },
  { id: 'r10', file: 'r10.jpg', title: 'Alphabet lesson (kha)', notes: 'Large letter, articulation diagram, pronunciation tip, letter carousel, mic.', batch: 1 },
]
