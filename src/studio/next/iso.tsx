// Isometric SVG kernel (30° projection) adapted from the iso-glow skill's
// kernel (iso-figure, MIT). Colours are only Sakina tokens; glow is reserved
// for live states and is a plain SVG blur, so no 3D library is needed.
export const C = Math.cos(Math.PI / 6)
export const S = Math.sin(Math.PI / 6)

export function kernel(OX: number, OY: number) {
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C + OX, (x + y) * S - z + OY]
  const D = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * S - z]
  const plane = (o: [number, number, number], u: [number, number, number], v: [number, number, number]) => {
    const O = P(...o)
    const U = D(...u)
    const V = D(...v)
    return `matrix(${U[0]} ${U[1]} ${V[0]} ${V[1]} ${O[0]} ${O[1]})`
  }
  /** Face transforms: draw rects/text in local units and they land on the plane. */
  const TOP = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 1, 0])
  const FRONT = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 0, -1]) // constant y, faces lower-left
  const SIDE = (x: number, y: number, z: number) => plane([x, y, z], [0, -1, 0], [0, 0, -1]) // constant x, faces lower-right
  const poly = (pts: [number, number, number][]) => pts.map((p) => P(...p).join(',')).join(' ')
  return { P, D, TOP, FRONT, SIDE, poly }
}

export type Faces = { top: string; front: string; side: string; stroke?: string }
export const SURFACE: Faces = {
  top: 'var(--color-card)',
  front: 'color-mix(in oklab, var(--color-card) 90%, var(--color-night))',
  side: 'color-mix(in oklab, var(--color-card) 80%, var(--color-night))',
  stroke: 'color-mix(in oklab, var(--color-line) 70%, var(--color-night) 12%)',
}
export const tint = (c: string, k = 1): Faces => ({
  top: `color-mix(in oklab, ${c} ${Math.round(70 * k)}%, var(--color-card))`,
  front: `color-mix(in oklab, ${c} ${Math.round(86 * k)}%, var(--color-night) 8%)`,
  side: `color-mix(in oklab, ${c} ${Math.round(74 * k)}%, var(--color-night) 22%)`,
  stroke: `color-mix(in oklab, ${c} 60%, var(--color-night) 20%)`,
})

/** A box as its three visible faces. */
export function Box({ k, x, y, z, w, d, h, f = SURFACE, className = '' }: { k: ReturnType<typeof kernel>; x: number; y: number; z: number; w: number; d: number; h: number; f?: Faces; className?: string }) {
  const sw = 0.8
  return (
    <g className={className} stroke={f.stroke} strokeWidth={sw} strokeLinejoin="round">
      <polygon points={k.poly([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x, y + d, z]])} fill={f.front} />
      <polygon points={k.poly([[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y, z]])} fill={f.side} />
      <polygon points={k.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={f.top} />
    </g>
  )
}

/** Soft bloom filters (dropped automatically where transparency is reduced). */
export function GlowDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-bloom`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

export type Status = 'done' | 'progress' | 'idle' | 'rest' | 'locked'
export const STATUS_COLOR: Record<Status, string> = {
  done: 'var(--color-leaf)',
  progress: 'var(--color-gold)',
  idle: 'var(--color-muted)',
  rest: 'var(--color-sky)',
  locked: 'var(--color-muted)',
}
