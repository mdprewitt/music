import { describe, it, expect } from 'vitest'
import { toDiagramShape, MIN_FRET_COUNT } from '../diagram'
import type { RawChordDefinition } from '../types'

function def(partial: Partial<RawChordDefinition>): RawChordDefinition {
  return { name: 'X', baseFret: 1, frets: [], fingers: [], ...partial }
}

describe('toDiagramShape', () => {
  it('reads the string count from the definition, not a fixed 6', () => {
    const uke = toDiagramShape(def({ frets: [0, 0, 0, 3] }))
    expect(uke.stringCount).toBe(4)

    const guitar = toDiagramShape(def({ frets: ['x', 3, 2, 0, 1, 0] }))
    expect(guitar.stringCount).toBe(6)
  })

  it('classifies open and non-sounding strings', () => {
    const shape = toDiagramShape(def({ name: 'Am7', frets: ['x', 0, 2, 0, 1, 0] }))
    expect(shape.mutedStrings).toEqual([1])
    expect(shape.openStrings).toEqual([2, 4, 6])
    expect(shape.markers.map((m) => [m.string, m.fret])).toEqual([
      [3, 2],
      [5, 1],
    ])
  })

  it('keeps a near-nut shape on a minimum-height neck with the nut showing', () => {
    const shape = toDiagramShape(def({ name: 'C', frets: [0, 0, 0, 3] }))
    expect(shape.baseFret).toBe(1)
    expect(shape.fretCount).toBe(MIN_FRET_COUNT)
  })

  it('windows a shape played high up the neck instead of running off the bottom', () => {
    // deacon-blues E7-9: frets 6 4 4 8, base-fret 1
    const shape = toDiagramShape(def({ name: 'E7-9', frets: [6, 4, 4, 8] }))
    expect(shape.baseFret).toBe(4)
    expect(shape.fretCount).toBe(5) // 8 - 4 + 1
    const rows = shape.markers.map((m) => m.fret - shape.baseFret + 1)
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...rows)).toBeLessThanOrEqual(shape.fretCount)
  })

  it('honours an explicit base fret from the definition', () => {
    const shape = toDiagramShape(def({ name: 'C', baseFret: 3, frets: [1, 3, 3, 2, 1, 1] }))
    // fret value 1 with base-fret 3 is absolute fret 3
    expect(shape.baseFret).toBe(3)
    expect(shape.markers.every((m) => m.fret >= 3)).toBe(true)
  })

  it('derives a barre from repeated finger numbers and drops the covered markers', () => {
    // fingers: three strings held by finger 1 at fret 2 -> one barre, not three dots
    const shape = toDiagramShape(
      def({ name: 'Gsus2/B', frets: [2, 2, 3, 2], fingers: [1, 1, 2, 1] }),
    )
    expect(shape.barres).toEqual([{ from: 1, to: 4, fret: 2, finger: 1 }])
    expect(shape.markers).toEqual([{ string: 3, fret: 3, finger: 2 }])
  })

  it('emits plain dots when the definition has no fingering', () => {
    const shape = toDiagramShape(def({ name: 'Bb', frets: [3, 2, 1, 1] }))
    expect(shape.barres).toEqual([])
    expect(shape.markers.map((m) => m.string)).toEqual([1, 2, 3, 4])
  })
})
