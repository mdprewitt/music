import { describe, it, expect } from 'vitest'
import { THEME_PRESETS, THEME_PRESET_IDS } from '../presets'
import { THEME_COLOR_KEYS, isThemeColors, isThemeId } from '../types'

describe('theme presets', () => {
  it('has the four standard templates', () => {
    expect(THEME_PRESET_IDS).toEqual(['light', 'dark', 'sepia', 'stage'])
  })

  it('gives every preset all five colour slots as #rrggbb', () => {
    for (const id of THEME_PRESET_IDS) {
      const preset = THEME_PRESETS[id]
      expect(preset.id).toBe(id)
      expect(preset.label.length).toBeGreaterThan(0)
      expect(isThemeColors(preset.colors)).toBe(true)
      for (const key of THEME_COLOR_KEYS) {
        expect(preset.colors[key]).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('uses a distinct label per preset', () => {
    const labels = THEME_PRESET_IDS.map((id) => THEME_PRESETS[id].label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('isThemeId', () => {
  it('accepts the five theme ids', () => {
    for (const id of ['light', 'dark', 'sepia', 'stage', 'custom']) {
      expect(isThemeId(id)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    for (const junk of ['', 'Light', 'solarized', null, undefined, 3, {}]) {
      expect(isThemeId(junk)).toBe(false)
    }
  })
})

describe('isThemeColors', () => {
  it('rejects incomplete or malformed palettes', () => {
    expect(isThemeColors(null)).toBe(false)
    expect(isThemeColors({ background: '#fff' })).toBe(false)
    expect(
      isThemeColors({
        background: '#ffffff',
        lyrics: '#1a1a1a',
        chord: 'blue',
        comment: '#767676',
        meta: '#1a1a1a',
      }),
    ).toBe(false)
  })
})
