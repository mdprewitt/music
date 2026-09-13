import { describe, it, expect } from 'vitest'
import { ChordProParser } from 'chordsheetjs'
import { pageTitle } from '../title'

describe('pageTitle', () => {
  it('is the bare app name with no song loaded', () => {
    expect(pageTitle(null, null)).toBe('Sheet-View')
    expect(pageTitle(null, 'song.cho')).toBe('Sheet-View')
  })

  it('uses the {title} directive when present', () => {
    const song = new ChordProParser().parse('{title: Wild Horses}\n[C]hello')
    expect(pageTitle(song, 'wild-horses.cho')).toBe('Wild Horses - Sheet-View')
  })

  it('falls back to the filename, extension stripped, with no {title}', () => {
    const song = new ChordProParser().parse('[C]hello')
    expect(pageTitle(song, 'highway-to-hell-ac-dc.cho')).toBe('highway-to-hell-ac-dc - Sheet-View')
  })

  it('falls back to the bare app name with neither a title nor a filename', () => {
    const song = new ChordProParser().parse('[C]hello')
    expect(pageTitle(song, null)).toBe('Sheet-View')
  })
})
