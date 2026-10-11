/**
 * Chart typography: the size steps and the small set of fonts the reader can
 * choose from. System font stacks only — no web-font downloads.
 */

export const SHEET_FONTS = [
  {
    id: 'mono',
    label: 'Monospace',
    stack: "ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  },
  {
    id: 'sans',
    label: 'Sans-serif',
    stack:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  },
  { id: 'serif', label: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
] as const

export type SheetFontId = (typeof SHEET_FONTS)[number]['id']

export const DEFAULT_SHEET_FONT: SheetFontId = 'mono'

export function isSheetFontId(value: unknown): value is SheetFontId {
  return SHEET_FONTS.some((font) => font.id === value)
}

export function fontStack(id: SheetFontId): string {
  return (SHEET_FONTS.find((font) => font.id === id) ?? SHEET_FONTS[0]).stack
}

/** Multipliers applied to the chart's base size (1rem). */
export const FONT_SCALES = [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.75, 2, 2.5] as const

export const DEFAULT_FONT_SCALE = 1

export function isFontScale(value: unknown): value is number {
  return typeof value === 'number' && (FONT_SCALES as readonly number[]).includes(value)
}

/** The next larger (+1) or smaller (-1) step, clamped at both ends of the range. */
export function stepFontScale(current: number, direction: 1 | -1): number {
  const last = FONT_SCALES.length - 1
  let index = FONT_SCALES.findIndex((scale) => scale >= current)
  if (index === -1) index = last
  // An off-grid value snaps to the nearest step in the requested direction.
  const onGrid = FONT_SCALES[index] === current
  const next = direction === 1 ? (onGrid ? index + 1 : index) : index - 1
  return FONT_SCALES[Math.min(Math.max(next, 0), last)] ?? DEFAULT_FONT_SCALE
}
