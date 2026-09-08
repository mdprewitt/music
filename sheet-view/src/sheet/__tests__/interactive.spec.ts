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

  it('strips injected elements the formatter would otherwise pass through raw', () => {
    const dirty =
      '<table class="row"><tr><td class="lyrics">hi ' +
      '<img src=x onerror="alert(1)"> <script>alert(2)</script>there</td></tr></table>'
    const out = markChordCells(dirty)
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('<script')
    // the surrounding lyric text is kept
    expect(out).toContain('hi ')
    expect(out).toContain('there')
  })

  it('strips event-handler and style attributes from allowed elements', () => {
    const out = markChordCells(
      '<div class="chord-sheet" onclick="steal()" style="x"><span onmouseover="x()">a</span></div>',
    )
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('onmouseover')
    expect(out).not.toContain('style')
    expect(out).toContain('class="chord-sheet"')
  })

  it('drops javascript: hrefs but keeps a safe one', () => {
    const bad = markChordCells('<div><a href="javascript:alert(1)">x</a></div>')
    expect(bad).not.toContain('javascript:')
    const good = markChordCells('<div><a href="https://example.com/song">x</a></div>')
    expect(good).toContain('href="https://example.com/song"')
  })
})
