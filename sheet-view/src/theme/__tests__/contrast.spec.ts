import { describe, it, expect } from 'vitest'
import { THEME_PRESETS, THEME_PRESET_IDS } from '../presets'
import { AA_NON_TEXT, AA_TEXT, contrastRatio, mixSrgb } from '../contrast'

/**
 * Resolve the `color-mix()` tokens `base.css` / `ChordDiagram.vue` derive from
 * a preset's five authored colours, so this spec can assert the same
 * thresholds WCAG 2.2 applies to the rendered page. Keep these formulas in
 * sync with the CSS — that's the whole point of the test.
 */
function derivedTokens(colors: (typeof THEME_PRESETS)['light']['colors']) {
  const surface = mixSrgb(colors.lyrics, 0.06, colors.background)
  const surfaceHover = mixSrgb(colors.lyrics, 0.12, colors.background)
  const border = mixSrgb(colors.lyrics, 0.6, colors.background)
  const error = mixSrgb('#c0392b', 0.6, colors.lyrics)
  const errorBg = mixSrgb(error, 0.12, colors.background)
  const cdGrid = mixSrgb(colors.lyrics, 0.6, colors.background)
  return { surface, surfaceHover, border, error, errorBg, cdGrid }
}

describe.each(THEME_PRESET_IDS.map((id) => THEME_PRESETS[id]))('theme preset contrast: $label', (preset) => {
  const { background, lyrics, chord, comment, meta } = preset.colors
  const { surfaceHover, border, surface, error, errorBg, cdGrid } = derivedTokens(preset.colors)

  it('body/lyric text clears 4.5:1 (1.4.3)', () => {
    expect(contrastRatio(lyrics, background)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('meta (headings, filename) text clears 4.5:1 (1.4.3)', () => {
    expect(contrastRatio(meta, background)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('comment text clears 4.5:1 (1.4.3)', () => {
    expect(contrastRatio(comment, background)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('chord text clears 4.5:1 against the page background (1.4.3)', () => {
    expect(contrastRatio(chord, background)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('chord text clears 4.5:1 on its own hover/focus/open background (1.4.3)', () => {
    // The chord's hover, focus and "diagram open" states all paint
    // --sv-surface-hover behind the still-visible chord text — this is
    // the pairing that failed on the original Light/Sepia chord hues.
    expect(contrastRatio(chord, surfaceHover)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('error text clears 4.5:1 against both the page and its own error background (1.4.3)', () => {
    expect(contrastRatio(error, background)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(error, errorBg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('control borders clear 3:1 against the page and against --sv-surface (1.4.11)', () => {
    expect(contrastRatio(border, background)).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrastRatio(border, surface)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('the chord-diagram grid clears 3:1 against the page (1.4.11)', () => {
    expect(contrastRatio(cdGrid, background)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('the focus ring (--sv-focus = --sv-chord) clears 3:1 against the page background (2.4.11)', () => {
    // outline-offset pushes the ring outside the focused element's own box,
    // so what it renders against is always the surrounding background (page
    // or panel), never the element's own fill.
    expect(contrastRatio(chord, background)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('contrastRatio / mixSrgb', () => {
  it('gives identical colours a ratio of 1', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('gives black/white the maximum ratio of 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('is symmetric in its two arguments', () => {
    expect(contrastRatio('#0066cc', '#f4ecd8')).toBeCloseTo(contrastRatio('#f4ecd8', '#0066cc'), 10)
  })

  it('mixes two colours the way CSS color-mix(in srgb, a p%, b) does', () => {
    expect(mixSrgb('#000000', 0.5, '#ffffff')).toBe('#808080')
    expect(mixSrgb('#ffffff', 1, '#000000')).toBe('#ffffff')
    expect(mixSrgb('#ffffff', 0, '#000000')).toBe('#000000')
  })
})
