import { describe, it, expect } from 'vitest'
import { drawDiagramSheet, type PageSize, type PdfDoc } from '../pdf'
import { toDiagramShape } from '../diagram'
import type { RawChordDefinition } from '../types'

interface Call {
  fn: string
  args: unknown[]
}

function recorder(): { doc: PdfDoc; calls: Call[] } {
  const calls: Call[] = []
  const rec =
    (fn: string) =>
    (...args: unknown[]) => {
      calls.push({ fn, args })
    }
  const doc: PdfDoc = {
    insertPage: rec('insertPage'),
    setPage: rec('setPage'),
    setFontSize: rec('setFontSize'),
    setDrawColor: rec('setDrawColor'),
    setFillColor: rec('setFillColor'),
    setTextColor: rec('setTextColor'),
    setLineWidth: rec('setLineWidth'),
    line: rec('line'),
    circle: rec('circle'),
    roundedRect: rec('roundedRect'),
    text: rec('text'),
  }
  return { doc, calls }
}

const def = (p: Partial<RawChordDefinition>): RawChordDefinition => ({
  name: 'X',
  baseFret: 1,
  frets: [],
  fingers: [],
  ...p,
})
const shape = (p: Partial<RawChordDefinition>) => toDiagramShape(def(p))
const textArgs = (calls: Call[]) => calls.filter((c) => c.fn === 'text').map((c) => c.args[0])

const A4: PageSize = { width: 595, height: 842 }

describe('drawDiagramSheet', () => {
  it('does nothing when there are no shapes', () => {
    const { doc, calls } = recorder()
    drawDiagramSheet(doc, A4, [])
    expect(calls).toHaveLength(0)
  })

  it('inserts a single diagram page for a set that fits', () => {
    const { doc, calls } = recorder()
    drawDiagramSheet(doc, A4, [
      shape({ name: 'C', frets: [0, 0, 0, 3] }),
      shape({ name: 'G', frets: [0, 2, 3, 2] }),
      shape({ name: 'Am', frets: [2, 0, 0, 0] }),
    ])
    const inserts = calls.filter((c) => c.fn === 'insertPage')
    expect(inserts).toHaveLength(1)
    expect(inserts[0]?.args).toEqual([1])
    const titles = textArgs(calls)
    expect(titles.filter((t) => t === 'Chord diagrams')).toHaveLength(1)
    expect(titles).toEqual(expect.arrayContaining(['C', 'G', 'Am']))
  })

  it('paginates instead of dropping shapes that overflow a page', () => {
    const { doc, calls } = recorder()
    const tiny: PageSize = { width: 320, height: 180 }
    const shapes = Array.from({ length: 12 }, (_, i) => shape({ name: `s${i}`, frets: [0, 0, 0, 3] }))
    drawDiagramSheet(doc, tiny, shapes)
    const inserts = calls.filter((c) => c.fn === 'insertPage')
    expect(inserts.length).toBeGreaterThanOrEqual(2)
    const titles = textArgs(calls)
    for (let i = 0; i < 12; i += 1) expect(titles).toContain(`s${i}`)
    // the page header is redrawn once per inserted page
    expect(titles.filter((t) => t === 'Chord diagrams')).toHaveLength(inserts.length)
  })

  it('draws one vertical grid line per string', () => {
    const { doc, calls } = recorder()
    drawDiagramSheet(doc, A4, [shape({ name: 'C', frets: [0, 0, 0, 3] })]) // 4 strings
    const vertical = calls.filter(
      (c) => c.fn === 'line' && c.args[0] === c.args[2] && c.args[1] !== c.args[3],
    )
    expect(vertical).toHaveLength(4)
  })

  it('colours title text with setTextColor, not setDrawColor', () => {
    const { doc, calls } = recorder()
    drawDiagramSheet(doc, A4, [shape({ name: 'C', frets: [0, 0, 0, 3] })])
    const headerIdx = calls.findIndex((c) => c.fn === 'text' && c.args[0] === 'Chord diagrams')
    const colourBefore = calls
      .slice(0, headerIdx)
      .reverse()
      .find((c) => c.fn === 'setTextColor' || c.fn === 'setDrawColor')
    expect(colourBefore?.fn).toBe('setTextColor')
  })

  it('labels dots with finger numbers when the shape carries fingering', () => {
    const { doc, calls } = recorder()
    drawDiagramSheet(doc, A4, [shape({ name: 'X', frets: [1, 2, 3, 4], fingers: [1, 2, 3, 4] })])
    expect(textArgs(calls)).toEqual(expect.arrayContaining(['1', '2', '3', '4']))
  })
})
