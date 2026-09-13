import type { ThemeId, ThemePreset } from './types'

type PresetId = Exclude<ThemeId, 'custom'>

/**
 * The four standard colour templates. Each authors only the five colours in
 * `ThemeColors`; the chrome colours (borders, surfaces, hovers) are derived
 * from these with `color-mix()` in `base.css`.
 */
export const THEME_PRESETS: Record<PresetId, ThemePreset> = {
  light: {
    id: 'light',
    label: 'Light',
    colors: {
      background: '#ffffff',
      lyrics: '#1a1a1a',
      // #0066cc measured 4.38:1 against --sv-surface-hover (a chord's own
      // hover/focus/open background) — below the 4.5:1 text minimum. #005fbf
      // clears it (4.87:1) while staying visually the same blue.
      chord: '#005fbf',
      comment: '#767676',
      meta: '#1a1a1a',
    },
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    colors: {
      background: '#1a1a1a',
      lyrics: '#e8e8e8',
      chord: '#6ab0ff',
      comment: '#9a9a9a',
      meta: '#ffffff',
    },
  },
  sepia: {
    id: 'sepia',
    label: 'Sepia',
    colors: {
      background: '#f4ecd8',
      lyrics: '#3b2f22',
      // #a0522d measured 3.85:1 against --sv-surface-hover (below 4.5:1); #8b4513
      // clears it (4.87:1) at the same warm-brown hue.
      chord: '#8b4513',
      // #7a6a55 measured 4.44:1 against the background — just under 4.5:1.
      // #6f5f4a clears it (5.23:1).
      comment: '#6f5f4a',
      meta: '#3b2f22',
    },
  },
  stage: {
    id: 'stage',
    label: 'Stage',
    colors: {
      background: '#000000',
      lyrics: '#f5f5f5',
      chord: '#ffb300',
      comment: '#a0a0a0',
      meta: '#ffffff',
    },
  },
}

export const THEME_PRESET_IDS = Object.keys(THEME_PRESETS) as PresetId[]

export const DEFAULT_PRESET_ID: PresetId = 'light'
