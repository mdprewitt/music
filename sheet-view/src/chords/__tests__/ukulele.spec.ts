import { describe, it, expect } from 'vitest'
import { ChordDefinition } from 'chordsheetjs'
import { UKULELE_CHORDS } from '../ukulele'
import { canonicalChordName } from '../definitions'
import { INSTRUMENTS } from '../types'

const GCEA = INSTRUMENTS.ukulele.tuning // [7, 0, 4, 9]

const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  mmaj7: [0, 3, 7, 11],
  add9: [0, 2, 4, 7],
  '9': [0, 2, 4, 7, 10],
  maj9: [0, 2, 4, 7, 11],
  m9: [0, 2, 3, 7, 10],
  '7sus4': [0, 5, 7, 10],
  '11': [0, 2, 5, 7, 10],
  '13': [0, 2, 4, 9, 10],
  '7b9': [0, 1, 4, 7, 10],
  '7#9': [0, 3, 4, 7, 10],
  '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10],
}

const ROOT_PITCH_CLASS: Record<string, number> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
}

function splitName(name: string): { root: string; quality: string } {
  const match = /^([A-G]b?)(.*)$/.exec(name)
  return { root: match?.[1] ?? '', quality: match?.[2] ?? '' }
}

const entries = Object.entries(UKULELE_CHORDS)

describe('UKULELE_CHORDS', () => {
  it('is a non-trivial dictionary', () => {
    expect(entries.length).toBeGreaterThan(250)
  })

  it('every entry parses to a 4-string definition whose key matches its name', () => {
    const bad = entries.filter(([key, str]) => {
      const parsed = ChordDefinition.parse(str)
      return parsed.frets.length !== 4 || parsed.name !== key
    })
    expect(bad.map(([key]) => key)).toEqual([])
  })

  it('every key is already canonical', () => {
    const nonCanonical = Object.keys(UKULELE_CHORDS).filter(
      (key) => canonicalChordName(key) !== key,
    )
    expect(nonCanonical).toEqual([])
  })

  it('has an interval table for every quality it uses', () => {
    const unknownQualities = [...new Set(entries.map(([key]) => splitName(key).quality))].filter(
      (quality) => QUALITY_INTERVALS[quality] === undefined,
    )
    expect(unknownQualities).toEqual([])
  })

  it('every shape only sounds pitches that belong to the chord, including the root', () => {
    const offenders: string[] = []
    for (const [key, str] of entries) {
      const { root, quality } = splitName(key)
      const rootPc = ROOT_PITCH_CLASS[root] ?? 0
      const intervals = QUALITY_INTERVALS[quality] ?? []
      const chordPcs = new Set(intervals.map((i) => (rootPc + i) % 12))

      const sounded = new Set<number>()
      ChordDefinition.parse(str).frets.forEach((fret, string) => {
        if (fret === 'x' || fret === -1 || fret === 'N') return
        sounded.add(((GCEA[string] ?? 0) + Number(fret)) % 12)
      })

      const foreign = [...sounded].filter((pc) => !chordPcs.has(pc))
      if (foreign.length > 0)
        offenders.push(`${key}: unexpected pitch classes ${foreign.join(',')}`)
      if (!sounded.has(rootPc)) offenders.push(`${key}: root not sounded`)
    }
    expect(offenders).toEqual([])
  })
})
