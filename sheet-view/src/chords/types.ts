export type Instrument =
  | 'guitar'
  | 'ukulele'
  | 'tenor'
  | 'tenor-chicago'
  | 'formby'
  | 'bflat'
  | 'celtic'
  | 'open-d'
  | 'open-g'
  | 'guitalele'
  | 'mandolin'
  | 'banjo'
  | 'banjo-c'

/**
 * Coarse grouping for the instrument picker only — it has no effect on chord
 * resolution or rendering. The `INSTRUMENTS` registry is ordered by family so
 * `INSTRUMENT_IDS` is already grouped and the selector needs no sorting.
 */
export type InstrumentFamily = 'ukulele' | 'guitar' | 'other'

export const INSTRUMENT_FAMILIES: readonly { id: InstrumentFamily; label: string }[] = [
  { id: 'ukulele', label: 'Ukulele' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'other', label: 'Other' },
]

export interface InstrumentSpec {
  id: Instrument
  label: string
  /** Which picker group this instrument sits in. */
  family: InstrumentFamily
  stringCount: number
  /**
   * Open-string pitch classes in string order — string 1 first (0 = C). For an
   * ascending tuning that is also lowest-pitched first; the GCEA ukulele is
   * re-entrant, so its string 1 (G) is not its lowest note.
   */
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
 *   1. Add an entry here — `family`, `stringCount`, `tuning` (pitch classes,
 *      lowest string first), `diagrams`, and any directive `aliases`. Widen the
 *      `Instrument` union above with its id, and keep the object grouped by
 *      `family` (the selector renders `INSTRUMENT_IDS` in order).
 *   2. Unless `diagrams` is `'chordsheetjs'`, generate a shape dictionary:
 *        bun run generate:chords <id>
 *      after adding a matching row to `TARGETS` in that script.
 *   3. Register the generated dictionary in `BUILTIN_SHAPES` (`./definitions`).
 *   4. Only if a `{define}` of some string count unambiguously implies the new
 *      instrument, add a row to `DEFAULT_BY_STRING_COUNT` in `./detectInstrument`
 *      — otherwise it relies on an explicit `{instrument: …}` directive or the
 *      reader's pick in the Display panel. Four- and six-string counts are both
 *      shared by several instruments now, so new ones almost always rely on the
 *      directive or the picker.
 *
 * Nothing else branches on the instrument: the selector, the store, the diagram
 * geometry and the resolver are all driven by this table.
 *
 * Only alternate-tuning six-string instruments are `diagrams: 'builtin'` despite
 * having six strings — `chordsheetjs`' bundled library is standard-tuning
 * shapes, so it would draw the wrong grips (and `PdfFormatter` would try to).
 * `diagrams: 'chordsheetjs'` is standard-tuning guitar only.
 */
export const INSTRUMENTS: Record<Instrument, InstrumentSpec> = {
  // --- Ukulele family ---
  ukulele: {
    id: 'ukulele',
    label: 'Usual (GCEA)',
    family: 'ukulele',
    stringCount: 4,
    tuning: [7, 0, 4, 9],
    diagrams: 'builtin',
    aliases: ['uke', 'ukulele', 'soprano', 'gcea'],
  },
  // DGBE is the same tuning as a Chicago-tuned tenor guitar; the id stays
  // `tenor-chicago` because that is the persisted `sheet-view:instrument` value
  // and the name of its generated shape table (`tenorChicago.ts`).
  'tenor-chicago': {
    id: 'tenor-chicago',
    label: 'Baritone (DGBE)',
    family: 'ukulele',
    stringCount: 4,
    tuning: [2, 7, 11, 4],
    diagrams: 'builtin',
    aliases: [
      'baritone uke',
      'baritone ukulele',
      'baritone',
      'bari uke',
      'chicago tenor',
      'tenor chicago',
      'tenor-dgbe',
      'chicago',
      'dgbe',
    ],
  },
  formby: {
    id: 'formby',
    label: "D 'Formby' (ADF#B)",
    family: 'ukulele',
    stringCount: 4,
    tuning: [9, 2, 6, 11],
    diagrams: 'builtin',
    aliases: ['formby uke', 'formby ukulele', 'formby', 'd tuning uke', 'adf#b'],
  },
  bflat: {
    id: 'bflat',
    label: 'B-Flat (FBbDG)',
    family: 'ukulele',
    stringCount: 4,
    tuning: [5, 10, 2, 7],
    diagrams: 'builtin',
    aliases: ['b-flat uke', 'bflat uke', 'b-flat ukulele', 'b flat', 'bflat', 'fbbdg'],
  },
  // --- Guitar family ---
  guitar: {
    id: 'guitar',
    label: 'Standard (EADGBE)',
    family: 'guitar',
    stringCount: 6,
    tuning: [4, 9, 2, 7, 11, 4],
    diagrams: 'chordsheetjs',
    aliases: ['guitar', 'eadgbe'],
  },
  celtic: {
    id: 'celtic',
    label: 'Celtic (DADGAD)',
    family: 'guitar',
    stringCount: 6,
    tuning: [2, 9, 2, 7, 9, 2],
    diagrams: 'builtin',
    aliases: ['celtic guitar', 'celtic', 'dadgad'],
  },
  'open-d': {
    id: 'open-d',
    label: 'Open D (DADF#AD)',
    family: 'guitar',
    stringCount: 6,
    tuning: [2, 9, 2, 6, 9, 2],
    diagrams: 'builtin',
    aliases: ['open d guitar', 'open d', 'dadf#ad'],
  },
  'open-g': {
    id: 'open-g',
    label: 'Open G (DGDGBD)',
    family: 'guitar',
    stringCount: 6,
    tuning: [2, 7, 2, 7, 11, 2],
    diagrams: 'builtin',
    aliases: ['open g guitar', 'open g', 'dgdgbd'],
  },
  guitalele: {
    id: 'guitalele',
    label: 'Guitalele (ADGCEA)',
    family: 'guitar',
    stringCount: 6,
    tuning: [9, 2, 7, 0, 4, 9],
    diagrams: 'builtin',
    aliases: ['guitalele', 'guilele', 'guitarlele', 'adgcea'],
  },
  // --- Other ---
  mandolin: {
    id: 'mandolin',
    label: 'Mandolin (GDAE)',
    family: 'other',
    stringCount: 4,
    tuning: [7, 2, 9, 4],
    diagrams: 'builtin',
    aliases: ['mandolin', 'mando', 'gdae'],
  },
  tenor: {
    id: 'tenor',
    label: 'Tenor Guitar (CGDA)',
    family: 'other',
    stringCount: 4,
    tuning: [0, 7, 2, 9],
    diagrams: 'builtin',
    aliases: ['tenor guitar', 'tenor-cgda', 'tenor', 'cgda'],
  },
  banjo: {
    id: 'banjo',
    label: 'Banjo (DGBD)',
    family: 'other',
    stringCount: 4,
    tuning: [2, 7, 11, 2],
    diagrams: 'builtin',
    aliases: ['banjo', 'dgbd'],
  },
  'banjo-c': {
    id: 'banjo-c',
    label: 'Banjo C (CGBD)',
    family: 'other',
    stringCount: 4,
    tuning: [0, 7, 11, 2],
    diagrams: 'builtin',
    aliases: ['banjo c', 'cgbd'],
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
