import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { buildDiagramIndex, findShape } from '../shapes'

function parse(chordpro: string): Song {
  return new ChordProParser().parse(chordpro)
}

describe('buildDiagramIndex', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists resolvable shapes once, in first-appearance order', () => {
    const index = buildDiagramIndex(parse('[G]a [C]b [G]c [D]d'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['G', 'C', 'D'])
  })

  it('drops chords with no known shape from the strip', () => {
    const index = buildDiagramIndex(parse('[C]a [Fmag7]b'), 'guitar', null)
    expect(index.shapes.map((s) => s.name)).toEqual(['C'])
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
