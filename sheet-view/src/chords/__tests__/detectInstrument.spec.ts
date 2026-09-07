import { describe, it, expect } from 'vitest'
import { ChordProParser, type Song } from 'chordsheetjs'
import { detectInstrument } from '../detectInstrument'

const parse = (text: string): Song => new ChordProParser().parse(text)

describe('detectInstrument', () => {
  it('honours an explicit instrument directive', () => {
    expect(detectInstrument(parse('{meta: instrument Ukulele}\n[C]x'))).toBe('ukulele')
    expect(detectInstrument(parse('{instrument: guitar}\n[C]x'))).toBe('guitar')
  })

  it('resolves tenor-guitar directives by alias, longest phrase first', () => {
    // "tenor guitar" must not fall through to the bare "guitar" substring.
    expect(detectInstrument(parse('{meta: instrument Tenor Guitar}\n[C]x'))).toBe('tenor')
    expect(detectInstrument(parse('{meta: instrument tenor}\n[C]x'))).toBe('tenor')
    expect(detectInstrument(parse('{meta: instrument CGDA}\n[C]x'))).toBe('tenor')
    expect(detectInstrument(parse('{meta: instrument DGBE}\n[C]x'))).toBe('tenor-chicago')
    expect(detectInstrument(parse('{meta: instrument tenor-chicago}\n[C]x'))).toBe('tenor-chicago')
  })

  it('infers ukulele from 4-string chord definitions', () => {
    const song = parse('{define: C frets 0 0 0 3}\n{define: G frets 0 2 3 2}\n[C]x [G]y')
    expect(detectInstrument(song)).toBe('ukulele')
  })

  it('infers guitar from 6-string chord definitions', () => {
    const song = parse('{define: C frets x 3 2 0 1 0}\n[C]x')
    expect(detectInstrument(song)).toBe('guitar')
  })

  it('defaults to guitar when there is nothing to go on', () => {
    expect(detectInstrument(parse('[C]hello [G]world'))).toBe('guitar')
  })
})
