/**
 * A single entry point for turning the chords used in a song into
 * diagram-ready {@link DiagramShape}s, plus a name-keyed lookup so a chord
 * label picked out of the rendered chart can be matched back to its shape.
 *
 * Wraps {@link resolveDiagramChords} + {@link toDiagramShape} — no new
 * resolution logic. Building the index runs the (expensive, ~900-shape)
 * guitar merge once, so callers should memoise it per (song, instrument).
 */
import type { Song } from 'chordsheetjs'
import { canonicalChordName, resolveDiagramChords } from './definitions'
import { toDiagramShape } from './diagram'
import type { DiagramShape, Instrument } from './types'

export interface DiagramIndex {
  /** Resolvable shapes, in the order the chords first appear — the strip. */
  shapes: DiagramShape[]
  /**
   * Shape by name, keyed on both the chart's spelling and its canonical
   * spelling. Not keyed on `shape.name` — that is the matched *definition's*
   * name and can differ (a chart's `Gb` resolves to the library's `F#`).
   */
  byName: Map<string, DiagramShape>
}

export function buildDiagramIndex(
  song: Song,
  instrument: Instrument,
  rawText: string | null,
): DiagramIndex {
  const shapes: DiagramShape[] = []
  const byName = new Map<string, DiagramShape>()

  for (const resolved of resolveDiagramChords(song, instrument, rawText)) {
    if (!resolved.definition) continue
    const shape = toDiagramShape(resolved.definition)
    shapes.push(shape)
    byName.set(resolved.name, shape)
    const canonical = canonicalChordName(resolved.name)
    if (!byName.has(canonical)) byName.set(canonical, shape)
  }

  return { shapes, byName }
}

/**
 * Look a chord up by the name shown in the chart. The displayed name may
 * carry brackets (`[C]`) and diverges from `song.getChords()` under
 * transpose/capo, so try the raw name, then its canonical form. `null` when
 * no shape is known for this chord on this instrument.
 */
export function findShape(index: DiagramIndex, displayName: string): DiagramShape | null {
  const name = displayName.trim().replace(/^\[|\]$/g, '')
  return index.byName.get(name) ?? index.byName.get(canonicalChordName(name)) ?? null
}
