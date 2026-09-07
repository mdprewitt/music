export type Instrument = 'guitar' | 'ukulele'

export interface InstrumentSpec {
  id: Instrument
  label: string
  stringCount: number
  /** Open-string pitch classes, lowest-pitched string first (0 = C). */
  tuning: number[]
}

export const INSTRUMENTS: Record<Instrument, InstrumentSpec> = {
  guitar: { id: 'guitar', label: 'Guitar', stringCount: 6, tuning: [4, 9, 2, 7, 11, 4] },
  ukulele: { id: 'ukulele', label: 'Ukulele', stringCount: 4, tuning: [7, 0, 4, 9] },
}

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as Instrument[]

export function isInstrument(value: unknown): value is Instrument {
  return value === 'guitar' || value === 'ukulele'
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
