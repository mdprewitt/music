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

  it('derives a barre from a consecutive run of same-finger strings', () => {
    // finger 1 lies across strings 1-3 at fret 1; finger 2 takes string 4
    const shape = toDiagramShape(def({ name: 'Fmaj7', frets: [1, 1, 1, 2], fingers: [1, 1, 1, 2] }))
    expect(shape.barres).toEqual([{ from: 1, to: 3, fret: 1, finger: 1 }])
    expect(shape.markers).toEqual([{ string: 4, fret: 2, finger: 2 }])
  })

  it('splits a finger group at a gap and keeps a note pressed under the span', () => {
    // finger 1 presses strings 1 and 5 but nothing between; finger 2 presses
    // string 3 at the same fret. A single 1->5 bar would be wrong, and the
    // finger-2 note must not be swallowed by it.
    const shape = toDiagramShape(
      def({ name: 'Wide', frets: [1, 'x', 1, 'x', 1, 'x'], fingers: [1, 0, 2, 0, 1, 0] }),
    )
    expect(shape.barres).toEqual([])
    expect(shape.markers).toEqual([
      { string: 1, fret: 1, finger: 1 },
      { string: 3, fret: 1, finger: 2 },
      { string: 5, fret: 1, finger: 1 },
    ])
  })

  it('keeps a differently-fingered note at a barre fret from being dropped', () => {
    // finger 1 bars strings 1-3 at fret 2; finger 2 also presses fret 2 on
    // string 4 — same fret, different finger, so it stays a visible dot.
    const shape = toDiagramShape(
      def({ name: 'Under', frets: [2, 2, 2, 2], fingers: [1, 1, 1, 2] }),
    )
    expect(shape.barres).toEqual([{ from: 1, to: 3, fret: 2, finger: 1 }])
    expect(shape.markers).toEqual([{ string: 4, fret: 2, finger: 2 }])
  })

  it('emits plain dots when the definition has no fingering', () => {
    const shape = toDiagramShape(def({ name: 'Bb', frets: [3, 2, 1, 1] }))
    expect(shape.barres).toEqual([])
    expect(shape.markers.map((m) => m.string)).toEqual([1, 2, 3, 4])
  })
})
