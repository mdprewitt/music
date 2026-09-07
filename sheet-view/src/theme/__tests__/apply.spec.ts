import { describe, it, expect } from 'vitest'
import { applyTheme } from '../apply'
import { THEME_PRESETS } from '../presets'

describe('applyTheme', () => {
  it('sets the five --sv-* custom properties inline on the element', () => {
    const el = document.createElement('div')
    applyTheme(THEME_PRESETS.dark.colors, el)

    expect(el.style.getPropertyValue('--sv-background')).toBe('#1a1a1a')
    expect(el.style.getPropertyValue('--sv-lyrics')).toBe('#e8e8e8')
    expect(el.style.getPropertyValue('--sv-chord')).toBe('#6ab0ff')
    expect(el.style.getPropertyValue('--sv-comment')).toBe('#9a9a9a')
    expect(el.style.getPropertyValue('--sv-meta')).toBe('#ffffff')
  })

  it('overwrites on a second call', () => {
    const el = document.createElement('div')
    applyTheme(THEME_PRESETS.dark.colors, el)
    applyTheme(THEME_PRESETS.sepia.colors, el)

    expect(el.style.getPropertyValue('--sv-background')).toBe('#f4ecd8')
    expect(el.style.getPropertyValue('--sv-chord')).toBe('#a0522d')
  })

  it('defaults to document.documentElement', () => {
    applyTheme(THEME_PRESETS.stage.colors)
    expect(document.documentElement.style.getPropertyValue('--sv-background')).toBe('#000000')
    // reset so it doesn't leak into other suites
    for (const prop of ['background', 'lyrics', 'chord', 'comment', 'meta']) {
      document.documentElement.style.removeProperty(`--sv-${prop}`)
    }
  })
})
