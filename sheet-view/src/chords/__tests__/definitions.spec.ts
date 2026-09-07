import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { canonicalChordName, recoverDroppedDefinitions, resolveDiagramChords } from '../definitions'

function parse(chordpro: string): Song {
  return new ChordProParser().parse(chordpro)
}

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
