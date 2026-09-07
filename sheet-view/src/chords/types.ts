export type Instrument = 'guitar' | 'ukulele' | 'tenor' | 'tenor-chicago'

export interface InstrumentSpec {
  id: Instrument
  label: string
  stringCount: number
  /** Open-string pitch classes, lowest-pitched string first (0 = C). */
  tuning: number[]
  /**
   * Where this instrument's fallback chord shapes come from:
   *
   * - `'chordsheetjs'` — the library's bundled set. Six-string only, and the
   *   only case `PdfFormatter` can draw its own diagrams for (its neck builder
   *   hard-codes 6 strings).
   * - `'builtin'` — one of our own generated dictionaries, registered in
   *   `BUILTIN_SHAPES` in `./definitions`. Diagrams are drawn by us, both on
   *   screen (`ChordDiagram.vue`) and in the PDF (`drawDiagramSheet`).
   */
  diagrams: 'chordsheetjs' | 'builtin'
  /** Extra lower-case spellings an `{instrument: …}` directive may use. */
  aliases: string[]
}

/**
 * Adding an instrument:
 *
 *   1. Add an entry here — `stringCount`, `tuning` (pitch classes, lowest
 *      string first), `diagrams`, and any directive `aliases`. Widen the
 *      `Instrument` union above with its id.
 *   2. Unless `diagrams` is `'chordsheetjs'`, generate a shape dictionary:
 *        node scripts/generate-chord-shapes.mjs <id>
 *      after adding a matching row to `TARGETS` in that script.
 *   3. Register the generated dictionary in `BUILTIN_SHAPES` (`./definitions`).
 *   4. Only if a `{define}` of some string count unambiguously implies the new
 *      instrument, add a row to `DEFAULT_BY_STRING_COUNT` in `./detectInstrument`
 *      — otherwise it relies on an explicit `{instrument: …}` directive or the
 *      reader's pick in the Display panel.
 *
 * Nothing else branches on the instrument: the selector, the store, the diagram
 * geometry and the resolver are all driven by this table.
 */
export const INSTRUMENTS: Record<Instrument, InstrumentSpec> = {
  guitar: {
    id: 'guitar',
    label: 'Guitar',
    stringCount: 6,
    tuning: [4, 9, 2, 7, 11, 4],
    diagrams: 'chordsheetjs',
    aliases: [],
  },
  ukulele: {
    id: 'ukulele',
    label: 'Ukulele',
    stringCount: 4,
    tuning: [7, 0, 4, 9],
    diagrams: 'builtin',
    aliases: ['uke'],
  },
  tenor: {
    id: 'tenor',
    label: 'Tenor (CGDA)',
    stringCount: 4,
    tuning: [0, 7, 2, 9],
    diagrams: 'builtin',
    aliases: ['tenor guitar', 'tenor-cgda', 'cgda'],
  },
  'tenor-chicago': {
    id: 'tenor-chicago',
    label: 'Tenor (DGBE)',
    stringCount: 4,
    tuning: [2, 7, 11, 4],
    diagrams: 'builtin',
    aliases: ['chicago tenor', 'tenor chicago', 'tenor-dgbe', 'chicago', 'dgbe'],
  },
}

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as Instrument[]

export function isInstrument(value: unknown): value is Instrument {
  return typeof value === 'string' && (INSTRUMENT_IDS as string[]).includes(value)
}

/** Where the chord-diagram strip sits relative to the chart. */
export type DiagramPosition = 'top' | 'right' | 'bottom'

export const DIAGRAM_POSITIONS: readonly { id: DiagramPosition; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'right', label: 'Right' },
  { id: 'bottom', label: 'Bottom' },
]

export function isDiagramPosition(value: unknown): value is DiagramPosition {
  return value === 'top' || value === 'right' || value === 'bottom'
}

/**
 * A raw chord definition as produced by `chordsheetjs`' `ChordDefinition` /
 * `ChordDefinition.parse()`. Frets are relative to `baseFret` (see chordpro's
 * define directive); non-sounding strings are `'x'`, `'N'` or `'-1'`.
 */
export interface RawChordDefinition {
  name: string
  baseFret: number
  frets: Array<number | string>
  fingers?: number[]
}

export interface DiagramMarker {
  /** 1-based string number, 1 = leftmost (lowest-pitched) string. */
  string: number
  /** Absolute fret number (1 = first fret). */
  fret: number
  /** 0 when the fingering is unknown. */
  finger: number
}

export interface DiagramBarre {
  from: number
  to: number
  fret: number
  finger: number
}

/**
 * Instrument-agnostic geometry for one chord diagram: everything a renderer
 * needs, already resolved to absolute fret numbers and a visible fret window.
 */
export interface DiagramShape {
  name: string
  stringCount: number
  /** Absolute fret number of the first visible fret row. 1 → draw the nut. */
  baseFret: number
  /** Number of fret rows to draw. */
  fretCount: number
  /** 1-based string numbers played open. */
  openStrings: number[]
  /** 1-based string numbers not sounded. */
  mutedStrings: number[]
  markers: DiagramMarker[]
  barres: DiagramBarre[]
}
