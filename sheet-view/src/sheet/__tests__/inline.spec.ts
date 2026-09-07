import { describe, it, expect } from 'vitest'
import { ChordProParser } from 'chordsheetjs'
import { toInlineSheet } from '../inline'

const parse = (text: string) => new ChordProParser().parse(text)

describe('toInlineSheet', () => {
  it('lifts the title and subtitle off the metadata', () => {
    const sheet = toInlineSheet(parse('{title: Amazing Grace}\n{subtitle: Trad.}\n\n[C]Hi'))
    expect(sheet.title).toBe('Amazing Grace')
    expect(sheet.subtitle).toBe('Trad.')
  })

  it('pairs each chord with the lyric fragment that follows it', () => {
    const [paragraph] = toInlineSheet(parse('[C]Amazing [F]grace')).paragraphs
    expect(paragraph?.lines[0]?.tokens).toEqual([
      { kind: 'pair', chord: 'C', lyrics: 'Amazing ' },
      { kind: 'pair', chord: 'F', lyrics: 'grace' },
    ])
  })

  it('reproduces the source lyric line when the fragments are concatenated', () => {
    const [paragraph] = toInlineSheet(parse('[C]Amazing [F]grace, how [C]sweet')).paragraphs
    const lyrics = (paragraph?.lines[0]?.tokens ?? [])
      .map((t) => (t.kind === 'pair' ? t.lyrics : ''))
      .join('')
    expect(lyrics).toBe('Amazing grace, how sweet')
  })

  it('keeps the body clear of the metadata directives', () => {
    const sheet = toInlineSheet(parse('{title: T}\n{artist: A}\n\n[C]Hello'))
    expect(sheet.paragraphs).toHaveLength(1)
    expect(sheet.paragraphs[0]?.lines[0]?.tokens).toEqual([
      { kind: 'pair', chord: 'C', lyrics: 'Hello' },
    ])
  })

  it('carries the section label and type through', () => {
    const sheet = toInlineSheet(
      parse('{start_of_chorus: label="Chorus 1"}\n[G]Sing\n{end_of_chorus}'),
    )
    expect(sheet.paragraphs[0]?.label).toBe('Chorus 1')
    expect(sheet.paragraphs[0]?.type).toBe('chorus')
  })

  it('surfaces a {comment} tag as a comment line', () => {
    const sheet = toInlineSheet(parse('{comment: play softly}\n[C]Hello'))
    const commentLine = sheet.paragraphs[0]?.lines[0]
    expect(commentLine?.isComment).toBe(true)
    expect(commentLine?.tokens).toEqual([{ kind: 'comment', text: 'play softly' }])
  })

  it('renders an annotation as its own token, not a chord', () => {
    const [paragraph] = toInlineSheet(parse('[*quietly]Hello')).paragraphs
    expect(paragraph?.lines[0]?.tokens).toEqual([
      { kind: 'annotation', text: 'quietly', lyrics: 'Hello' },
    ])
  })
})
