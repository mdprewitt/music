/**
 * WCAG contrast-ratio helpers, used to (a) regression-test the theme presets
 * and the `color-mix()` tokens derived from them in `base.css` /
 * `ChordDiagram.vue`, and (b) warn on a poor pairing in `CustomColorEditor`.
 * No Vue imports — plain colour math, like the rest of `src/theme`.
 */

const HEX_RE = /^#([0-9a-fA-F]{6})$/

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX_RE.exec(hex)
  const digits = match?.[1]
  if (!digits) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const n = parseInt(digits, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** sRGB -> linear-light, per the WCAG 2.x relative luminance formula. */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two `#rrggbb` colours, in [1, 21]. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(hexToRgb(a))
  const l2 = relativeLuminance(hexToRgb(b))
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Resolve `color-mix(in srgb, a p%, b)` — a simple per-channel sRGB lerp,
 * matching the browser's behaviour for two opaque sRGB colours (the only kind
 * this app ever mixes). `p` is 0-1.
 */
export function mixSrgb(a: string, p: number, b: string): string {
  const [aR, aG, aB] = hexToRgb(a)
  const [bR, bG, bB] = hexToRgb(b)
  const round = (x: number, y: number) => Math.round(x * p + y * (1 - p))
  return toHex([round(aR, bR), round(aG, bG), round(aB, bB)])
}

/** WCAG AA minimum for normal-size text (1.4.3). */
export const AA_TEXT = 4.5
/** WCAG AA minimum for UI components and graphical objects (1.4.11) and for a
 * focus indicator's contrast against its unfocused state (2.4.11). */
export const AA_NON_TEXT = 3
