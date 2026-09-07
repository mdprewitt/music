import { describe, it, expect } from 'vitest'
import { markChordCells } from '../interactive'

describe('markChordCells', () => {
  const html =
    '<table class="row"><tr>' +
    '<td class="chord">C</td><td class="chord"></td><td class="chord">G7</td>' +
    '</tr><tr>' +
    '<td class="lyrics">Amazing </td><td class="lyrics">grace</td>' +
    '</tr></table>'

  it('makes every non-empty chord cell focusable and a button', () => {
    const out = markChordCells(html)
    const doc = new DOMParser().parseFromString(out, 'text/html')
    const marked = doc.querySelectorAll('td.chord[tabindex="0"][role="button"]')
    expect([...marked].map((c) => c.textContent)).toEqual(['C', 'G7'])
  })

  it('leaves the empty spacer chord cell inert', () => {
    const doc = new DOMParser().parseFromString(markChordCells(html), 'text/html')
    const empty = [...doc.querySelectorAll('td.chord')].find((c) => !c.textContent?.trim())
    expect(empty?.hasAttribute('tabindex')).toBe(false)
  })

  it('does not touch lyric cells', () => {
    const doc = new DOMParser().parseFromString(markChordCells(html), 'text/html')
    expect(doc.querySelector('td.lyrics')?.hasAttribute('role')).toBe(false)
  })
})
