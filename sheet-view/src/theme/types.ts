export type ThemeId = 'light' | 'dark' | 'sepia' | 'stage' | 'custom'

/** The five colours a theme authors; everything else is derived in CSS. */
export interface ThemeColors {
  /** Page + sheet background. */
  background: string
  /** Body / lyric text (also chord-diagram ink). */
  lyrics: string
  /** Chord text, diagram dots, and the UI accent. */
  chord: string
  /** `{comment}` lines and muted / secondary text. */
  comment: string
  /** Heading, filename, and title / subtitle metadata. */
  meta: string
}

export const THEME_COLOR_KEYS = [
  'background',
  'lyrics',
  'chord',
  'comment',
  'meta',
] as const satisfies readonly (keyof ThemeColors)[]

export interface ThemePreset {
  id: Exclude<ThemeId, 'custom'>
  label: string
  colors: ThemeColors
}

/** Order shown in the selector; `custom` is appended by the component. */
export const THEME_IDS: readonly ThemeId[] = ['light', 'dark', 'sepia', 'stage', 'custom']

export function isThemeId(value: unknown): value is ThemeId {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'sepia' ||
    value === 'stage' ||
    value === 'custom'
  )
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** True when `value` is a `ThemeColors` with all five slots as `#rrggbb` strings. */
export function isThemeColors(value: unknown): value is ThemeColors {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return THEME_COLOR_KEYS.every(
    (key) => typeof record[key] === 'string' && HEX_RE.test(record[key] as string),
  )
}
