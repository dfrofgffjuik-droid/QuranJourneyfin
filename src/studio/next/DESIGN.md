# Sakina — design system notes (as implemented)

Documented from the production code (`src/index.css`, `src/lib/theme.ts`,
`src/components/ui.tsx`, `src/components/Appearance.tsx`). The Next-generation
preview (`src/studio/next`) uses these tokens directly; it adds no new theme.

## Theme architecture
- Tokens are Tailwind v4 `@theme` colours, consumed as utilities (`bg-card`,
  `text-night`, `ring-line`, `bg-gold-soft` …).
- Appearance is two attributes on `<html>`: `data-theme="dark"` (resolved from
  Light / Dark / System) and `data-palette` (`sea | dusk | sand | rose`; Garden
  is the default and has no attribute). `data-kids` re-tones the canvas.
- Palettes re-map the same semantic names, so components never branch on
  palette. Mushaf (`--mf-*`) and atmosphere (`--hero-*`, `--bd-*`) tokens are
  derived from them with `color-mix(in oklab, …)`.
- The preview mirrors these exact rules onto `.pv-root` frames at runtime
  (`themeScope.ts`) so several palettes can be compared side by side.

## Semantic colour roles
| Token | Role |
|---|---|
| `night`, `night-2` | primary ink, strong surfaces (active nav, primary button) |
| `parchment` | page canvas |
| `card` | raised surfaces |
| `line` | hairlines, rings |
| `muted` | secondary text |
| `gold`, `gold-soft` | accent (palette hue) — selection, primary actions, in-progress |
| `leaf` | success / memorised / complete |
| `clay` | error, destructive |
| `sky` | informational, Kids, rest |
| `--mf-*` | Mushaf paper, frame, ink, ayah marker |

State mapping used everywhere: complete = `leaf`, in progress = `gold`,
not started = `muted/line`, rest = `sky` (never a failure colour), unavailable = `clay`
only for real errors, otherwise neutral.

## Typography
- UI: IBM Plex Sans Arabic (+ IBM Plex Sans), `font-arabic-display` = 600, −0.01em.
- Quran: KFGQPC Uthmanic Script HAFS (`Rafiqi Hafs`), Tanzil fallback Amiri Quran.
  Line-height 2.0–2.35; never letter-spaced; justified with centred last line on pages.
- Titles/numerals on Mushaf furniture: Amiri.
- Scale (UI): 11 · 12 · 13 · 15 · 17 · 22 · 28 · 40. Large Arabic display keeps
  tracking near 0 (Arabic must not be negatively tracked hard); Latin display −0.02em.

## Shape, depth, motion
- Radii: pills (full) for controls; 22–28 px for cards; 2–10 px for paper.
- Depth: `glass-panel` (translucent, blur 28 px) for floating chrome; soft long
  shadows for cards; paper uses `--mf-shadow`.
- Motion: `.press` (scale .95 on press), `.materialize` (scale + blur + opacity
  from the trigger), view-transition cross-fade for theme change; all reduced
  under `prefers-reduced-motion`.

## Iconography & illustration
- 24 px stroke icons, 1.8 stroke, round caps (`components/Icon.tsx`).
- Isometric illustrations (preview): 30° projection hairline drawings, tokens
  only (`card`, `line`, `night` mixes); glow is reserved for *live* states
  (complete = leaf, in progress = gold) and drops in reduced-transparency.

## Content integrity rules
- Quran text only from bundled KFGQPC Hafs / Tanzil files.
- Tafsir only from `loadTafsir` with book + author + source shown.
- Azkar, word meanings and recitation analyses have no verified source in the
  repo yet: the preview shows labelled placeholders, never invented content.
- Demonstration progress is always badged "بيانات تجريبية".
