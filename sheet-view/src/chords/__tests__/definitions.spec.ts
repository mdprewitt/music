import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import {
  canonicalChordName,
  compareChordNames,
  recoverDroppedDefinitions,
  resolveDiagramChords,
} from '../definitions'

function parse(chordpro: string): Song {
  return new ChordProParser().parse(chordpro)
}

describe('compareChordNames', () => {
  const sort = (names: string[]) => [...names].sort(compareChordNames)

  it('orders by root letter A–G', () => {
    expect(sort(['G', 'C', 'Am', 'D'])).toEqual(['Am', 'C', 'D', 'G'])
  })

  it('orders accidentals in pitch order within a letter', () => {
    expect(sort(['A#', 'Ab', 'A'])).toEqual(['Ab', 'A', 'A#'])
  })

  it('puts a plain triad before its suffixed forms and compares suffixes numerically', () => {
    expect(sort(['Amaj7', 'Am7', 'A', 'A7', 'A13', 'A9'])).toEqual([
      'A',
      'A7',
      'A9',
      'A13',
      'Am7',
      'Amaj7',
    ])
  })

  it('sorts non-chord names after every real chord', () => {
    expect(sort(['N.C.', 'G', 'C'])).toEqual(['C', 'G', 'N.C.'])
  })
})

describe('canonicalChordName', () => {
  it('normalises enharmonic roots to a flat spelling', () => {
    expect(canonicalChordName('C#m7')).toBe('Dbm7')
    expect(canonicalChordName('A#')).toBe('Bb')
  })

  it('normalises quality spellings', () => {
    expect(canonicalChordName('Fmaj7')).toBe('Fmaj7')
    expect(canonicalChordName('FM7')).toBe('Fmaj7')
    expect(canonicalChordName('E7-9')).toBe('E7b9')
    expect(canonicalChordName('F#7-5')).toBe('Gb7b5')
    expect(canonicalChordName('Gsus')).toBe('Gsus4')
  })

  it('drops a bass note', () => {
    expect(canonicalChordName('G/B')).toBe('G')
    expect(canonicalChordName('Am/G')).toBe('Am')
  })

  it('passes non-chord text through untouched', () => {
    expect(canonicalChordName('N.C.')).toBe('N.C.')
  })
})

describe('recoverDroppedDefinitions', () => {
  it('recovers a define that chordsheetjs drops because of an `add:` clause', () => {
    const raw =
      '{define: Gsus2/B frets 2 2 3 2 fingers 1 1 2 1 add: string 3 fret 2 finger 1}\n[Gsus2/B]x'
    // chordsheetjs itself silently loses it
    expect(parse(raw).getChordDefinitions()['Gsus2/B']).toBeUndefined()

    const recovered = recoverDroppedDefinitions(raw)
    expect(recovered.get('Gsus2/B')).toMatchObject({ frets: [2, 2, 3, 2], fingers: [1, 1, 2, 1] })
  })

  it('returns an empty map for text with no add-clause defines', () => {
    expect(recoverDroppedDefinitions('[C]hello').size).toBe(0)
    expect(recoverDroppedDefinitions(null).size).toBe(0)
  })
})

describe('resolveDiagramChords', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('prefers a definition from the sheet over the library', () => {
    const song = parse('{define: C frets 5 4 3 5}\n[C]x')
    const [entry] = resolveDiagramChords(song, 'ukulele')
    expect(entry?.source).toBe('sheet')
    expect(entry?.definition?.frets).toEqual([5, 4, 3, 5])
  })

  it('falls back to a recovered add-clause definition', () => {
    const raw =
      '{define: Asus2/C# frets 4 4 5 4 fingers 1 1 2 1 add: string 3 fret 5 finger 1}\n[Asus2/C#]x'
    const entry = resolveDiagramChords(parse(raw), 'ukulele', raw)[0]
    expect(entry?.source).toBe('sheet-recovered')
    expect(entry?.definition?.frets).toEqual([4, 4, 5, 4])
  })

  it('matches a recovered define through an enharmonic spelling', () => {
    // the define is named Gb (and dropped for its add: clause); the chart writes F#
    const raw = '{define: Gb frets 2 1 1 2 fingers 2 1 1 3 add: string 2 fret 1 finger 1}\n[F#]x'
    const entry = resolveDiagramChords(parse(raw), 'ukulele', raw)[0]
    expect(entry?.source).toBe('sheet-recovered')
    expect(entry?.definition?.frets).toEqual([2, 1, 1, 2])
  })

  it('resolves a guitar chord through the bundled library by exact then normalised name', () => {
    const song = parse('[Am7]a [Fmaj7]b')
    const resolved = resolveDiagramChords(song, 'guitar')
    const am7 = resolved.find((r) => r.name === 'Am7')
    const fmaj7 = resolved.find((r) => r.name === 'Fmaj7')
    expect(am7?.source).toBe('library')
    expect(am7?.definition?.frets).toHaveLength(6)
    // the bundled library spells it "Fma7"
    expect(fmaj7?.source).toBe('library-normalized')
    expect(fmaj7?.definition?.frets).toHaveLength(6)
  })

  it('never injects a six-string guitar shape for a ukulele chart', () => {
    const song = parse('[C]a [G]b [Am]c [F]d')
    const resolved = resolveDiagramChords(song, 'ukulele')
    expect(resolved.every((r) => !r.definition || r.definition.frets.length === 4)).toBe(true)
  })

  it('ignores a sheet {define} whose string count does not match the instrument', () => {
    // a six-string guitar define, but the reader has selected ukulele
    const song = parse('{define: C frets x 3 2 0 1 0}\n[C]x')
    const [entry] = resolveDiagramChords(song, 'ukulele')
    expect(entry?.source).not.toBe('sheet')
    expect(entry?.definition?.frets).toHaveLength(4) // fell through to the uke builtin
  })

  it('resolves through the built-in table for tenor guitar, never the guitar library', () => {
    const song = parse('[C]a [G]b [Am7]c [Fmaj7]d')
    const resolved = resolveDiagramChords(song, 'tenor')
    expect(resolved.map((r) => r.name)).toEqual(['C', 'G', 'Am7', 'Fmaj7'])
    expect(resolved.every((r) => r.definition && r.definition.frets.length === 4)).toBe(true)
    expect(resolved.every((r) => r.source === 'library' || r.source === 'library-normalized')).toBe(
      true,
    )
  })

  it('returns definition: null for a chord it cannot place', () => {
    const song = parse('[Fmag7]x') // a typo, not a real chord
    const [entry] = resolveDiagramChords(song, 'guitar')
    expect(entry).toMatchObject({ name: 'Fmag7', definition: null, source: null })
  })

  it('lists each chord once, in first-appearance order', () => {
    const song = parse('[G]a [C]b [G]c [D]d')
    expect(resolveDiagramChords(song, 'guitar').map((r) => r.name)).toEqual(['G', 'C', 'D'])
  })
})
