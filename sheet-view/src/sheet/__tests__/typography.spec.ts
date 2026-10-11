import { describe, it, expect } from 'vitest'
import {
  FONT_SCALES,
  SHEET_FONTS,
  fontStack,
  isFontScale,
  isSheetFontId,
  stepFontScale,
} from '../typography'

describe('typography', () => {
  it('validates font ids and scales', () => {
    expect(isSheetFontId('serif')).toBe(true)
    expect(isSheetFontId('comic')).toBe(false)
    expect(isFontScale(1.25)).toBe(true)
    expect(isFontScale(1.3)).toBe(false)
    expect(isFontScale('1')).toBe(false)
  })

  it('steps up and down one notch', () => {
    expect(stepFontScale(1, 1)).toBe(1.125)
    expect(stepFontScale(1, -1)).toBe(0.875)
  })

  it('clamps at both ends', () => {
    expect(stepFontScale(0.75, -1)).toBe(0.75)
    expect(stepFontScale(2.5, 1)).toBe(2.5)
    expect(FONT_SCALES[0]).toBe(0.75)
    expect(FONT_SCALES[FONT_SCALES.length - 1]).toBe(2.5)
  })

  it('snaps an off-grid value in the requested direction', () => {
    expect(stepFontScale(1.05, 1)).toBe(1.125)
    expect(stepFontScale(1.05, -1)).toBe(1)
    expect(stepFontScale(9, 1)).toBe(2.5)
  })

  it('resolves a font stack', () => {
    expect(fontStack('serif')).toContain('Georgia')
    expect(SHEET_FONTS.map((f) => f.id)).toEqual(['mono', 'sans', 'serif'])
  })
})
