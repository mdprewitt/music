import { describe, it, expect } from 'vitest'
import { INSTRUMENTS, INSTRUMENT_IDS, INSTRUMENT_FAMILIES, isInstrument } from '../types'

describe('INSTRUMENTS registry', () => {
  it('every row declares a family listed in INSTRUMENT_FAMILIES', () => {
    const known = new Set(INSTRUMENT_FAMILIES.map((f) => f.id))
    const orphans = INSTRUMENT_IDS.filter((id) => !known.has(INSTRUMENTS[id].family))
    expect(orphans).toEqual([])
  })

  it('lists the ids grouped by family in the family order (so the picker needs no sort)', () => {
    const familyRank = new Map(INSTRUMENT_FAMILIES.map((f, i) => [f.id, i]))
    const ranks = INSTRUMENT_IDS.map((id) => familyRank.get(INSTRUMENTS[id].family) ?? -1)
    const sorted = [...ranks].sort((a, b) => a - b)
    expect(ranks).toEqual(sorted)
  })

  it('every row is keyed by its own id and every id is an Instrument', () => {
    for (const id of INSTRUMENT_IDS) {
      expect(INSTRUMENTS[id].id).toBe(id)
      expect(isInstrument(id)).toBe(true)
    }
  })

  it('each tuning has one pitch class (0-11) per string', () => {
    const bad = INSTRUMENT_IDS.filter((id) => {
      const { tuning, stringCount } = INSTRUMENTS[id]
      return (
        tuning.length !== stringCount ||
        tuning.some((pc) => !Number.isInteger(pc) || pc < 0 || pc > 11)
      )
    })
    expect(bad).toEqual([])
  })

  it('only standard-tuning guitar uses the chordsheetjs shape library', () => {
    const csjs = INSTRUMENT_IDS.filter((id) => INSTRUMENTS[id].diagrams === 'chordsheetjs')
    expect(csjs).toEqual(['guitar'])
  })
})
