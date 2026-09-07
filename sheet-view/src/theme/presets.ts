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
      chord: '#0066cc',
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
      chord: '#a0522d',
      comment: '#7a6a55',
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
