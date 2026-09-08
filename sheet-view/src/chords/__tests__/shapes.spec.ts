import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { buildDiagramIndex, findShape } from '../shapes'

function parse(chordpro: string): Song {
  return new ChordProParser().parse(chordpro)
}

describe('buildDiagramIndex', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists resolvable shapes once, in musical alphabetical order', () => {
    const index = buildDiagramIndex(parse('[G]a [C]b [G]c [D]d'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['C', 'D', 'G'])
  })

  it('sorts the strip even when chords first appear out of order and repeat', () => {
    const index = buildDiagramIndex(parse('[G]a [Am]b [C]c [G]d'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['Am', 'C', 'G'])
  })

  it('drops chords with no known shape from the strip', () => {
    const index = buildDiagramIndex(parse('[C]a [Fmag7]b'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['C'])
  })

  it('shows one diagram when a slash chord resolves to a base-chord shape', () => {
    const index = buildDiagramIndex(parse('[C]a [C/G]b'), 'ukulele', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['C'])
    // both spellings still resolve for the click-to-peek popover
    expect(findShape(index, 'C/G')).not.toBeNull()
    expect(findShape(index, 'C')).not.toBeNull()
  })

  it('shows one diagram when two enharmonic spellings resolve to the same shape', () => {
    const index = buildDiagramIndex(parse('[C]a [F#]b [Gb]c [Am]d'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['Am', 'C', 'F#'])
    expect(findShape(index, 'Gb')).not.toBeNull()
    expect(findShape(index, 'F#')).not.toBeNull()
  })
})

describe('findShape', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('finds a shape by the exact name used in the chart', () => {
    const index = buildDiagramIndex(parse('[C]a [G7]b'), 'guitar', null)
    expect(findShape(index, 'G7')?.name).toBe('G7')
  })

  it('finds a shape by a bracketed label', () => {
    const index = buildDiagramIndex(parse('[C]a'), 'guitar', null)
    expect(findShape(index, '[C]')).not.toBeNull()
  })

  it('finds a shape through an alternate / enharmonic spelling', () => {
    const index = buildDiagramIndex(parse('[Fmaj7]a'), 'guitar', null)
    // the chart wrote Fmaj7; ask with the M7 spelling
    expect(findShape(index, 'FM7')).not.toBeNull()
  })

  it('returns null for a chord that has no shape', () => {
    const index = buildDiagramIndex(parse('[C]a [Fmag7]b'), 'guitar', null)
    expect(findShape(index, 'Fmag7')).toBeNull()
  })
})
