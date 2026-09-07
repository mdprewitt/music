import type { DiagramShape } from './types'

/**
 * Minimal surface of jsPDF that `drawDiagramSheet` needs. Typed loosely on
 * purpose — `chordsheetjs/pdf` ships its own jsPDF and the app never depends on
 * jsPDF's types directly.
 */
export interface PdfDoc {
  insertPage(n: number): void
  setPage(n: number): void
  setFontSize(size: number): void
  setDrawColor(r: number, g?: number, b?: number): void
  setFillColor(r: number, g?: number, b?: number): void
  setLineWidth(width: number): void
  line(x1: number, y1: number, x2: number, y2: number): void
  circle(x: number, y: number, r: number, style?: string): void
  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: string,
  ): void
  text(text: string, x: number, y: number, options?: { align?: string }): void
}

export interface PageSize {
  width: number
  height: number
}

// One diagram's intrinsic drawing box, before scaling (matches ChordDiagram.vue).
const BOX_WIDTH = 84
const PAD_LEFT = 14
const PAD_RIGHT = 14
const PAD_TOP = 26
const PAD_BOTTOM = 16
const ROW_HEIGHT = 15
const DOT_RADIUS = 4.6
const NECK_WIDTH = BOX_WIDTH - PAD_LEFT - PAD_RIGHT

const ACCENT: [number, number, number] = [66, 184, 131]
const GRID_GRAY = 150
const INK = 51

function boxHeight(shape: DiagramShape): number {
  return PAD_TOP + Math.max(shape.fretCount, 1) * ROW_HEIGHT + PAD_BOTTOM
}

/**
 * Prepend a page of chord-fingering diagrams to an already-formatted PDF
 * document. Used for the ukulele view, where `chordsheetjs`' own diagram
 * renderer cannot be told the neck only has four strings and would draw
 * six-string shapes. No-op when there is nothing to draw.
 */
export function drawDiagramSheet(doc: PdfDoc, pageSize: PageSize, shapes: DiagramShape[]): void {
  if (shapes.length === 0) return

  doc.insertPage(1)
  doc.setPage(1)

  const margin = 42
  const scale = 1.15
  const cellWidth = BOX_WIDTH * scale + 16
  const cellHeight = Math.max(...shapes.map(boxHeight)) * scale + 14
  const columns = Math.max(1, Math.floor((pageSize.width - 2 * margin) / cellWidth))

  doc.setFontSize(16)
  doc.setDrawColor(INK)
  doc.text('Chord diagrams', margin, margin - 12)

  shapes.forEach((shape, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const originX = margin + column * cellWidth
    const originY = margin + row * cellHeight
    if (originY + cellHeight > pageSize.height - margin) return // ran off the page
    drawOne(doc, shape, originX, originY, scale)
  })
}

function drawOne(doc: PdfDoc, shape: DiagramShape, ox: number, oy: number, scale: number): void {
  const columns = Math.max(shape.stringCount, 1)
  const rows = Math.max(shape.fretCount, 1)
  const px = (value: number) => ox + value * scale
  const py = (value: number) => oy + value * scale

  const stringX = (index: number) =>
    columns === 1 ? PAD_LEFT + NECK_WIDTH / 2 : PAD_LEFT + (index * NECK_WIDTH) / (columns - 1)
  const markerY = (absoluteFret: number) =>
    PAD_TOP + (absoluteFret - shape.baseFret + 0.5) * ROW_HEIGHT

  const left = stringX(0)
  const right = stringX(columns - 1)
  const indicatorY = PAD_TOP - 9

  doc.setFontSize(11 * scale)
  doc.setDrawColor(INK)
  doc.text(shape.name, px(BOX_WIDTH / 2), py(12), { align: 'center' })

  // open / muted indicators
  doc.setLineWidth(0.8 * scale)
  doc.setDrawColor(90)
  for (const stringNumber of shape.openStrings) {
    doc.circle(px(stringX(stringNumber - 1)), py(indicatorY), 3 * scale, 'S')
  }
  for (const stringNumber of shape.mutedStrings) {
    const cx = stringX(stringNumber - 1)
    doc.line(px(cx - 3), py(indicatorY - 3), px(cx + 3), py(indicatorY + 3))
    doc.line(px(cx - 3), py(indicatorY + 3), px(cx + 3), py(indicatorY - 3))
  }

  // nut or base-fret label
  if (shape.baseFret === 1) {
    doc.setLineWidth(3 * scale)
    doc.setDrawColor(INK)
    doc.line(px(left), py(PAD_TOP), px(right), py(PAD_TOP))
  } else {
    doc.setFontSize(8 * scale)
    doc.setDrawColor(110)
    doc.text(`${shape.baseFret}fr`, px(PAD_LEFT - 6), py(markerY(shape.baseFret) + 2), {
      align: 'right',
    })
  }

  // grid
  doc.setLineWidth(1 * scale)
  doc.setDrawColor(GRID_GRAY)
  for (let row = 0; row <= rows; row += 1) {
    const y = PAD_TOP + row * ROW_HEIGHT
    doc.line(px(left), py(y), px(right), py(y))
  }
  for (let column = 0; column < columns; column += 1) {
    const x = stringX(column)
    doc.line(px(x), py(PAD_TOP), px(x), py(PAD_TOP + rows * ROW_HEIGHT))
  }

  // barres and dots
  doc.setFillColor(...ACCENT)
  for (const barre of shape.barres) {
    const bx = stringX(barre.from - 1) - DOT_RADIUS
    const by = markerY(barre.fret) - DOT_RADIUS
    const width = stringX(barre.to - 1) - stringX(barre.from - 1) + DOT_RADIUS * 2
    doc.roundedRect(
      px(bx),
      py(by),
      width * scale,
      DOT_RADIUS * 2 * scale,
      DOT_RADIUS * scale,
      DOT_RADIUS * scale,
      'F',
    )
  }
  for (const marker of shape.markers) {
    doc.circle(px(stringX(marker.string - 1)), py(markerY(marker.fret)), DOT_RADIUS * scale, 'F')
  }
}
