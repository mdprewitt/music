import type { Song } from 'chordsheetjs'
import type { Instrument } from './types'
import { isInstrument } from './types'

/**
 * Best guess at the instrument a chart is written for:
 *
 * 1. an explicit `{instrument: ...}` / `{meta: instrument ...}` directive;
 * 2. otherwise the string count of the chart's own `{define}` shapes
 *    (4 → ukulele, 6 → guitar);
 * 3. otherwise guitar.
 *
 * None of this is authoritative — the viewer always lets the reader override it.
 */
export function detectInstrument(song: Song): Instrument {
  const declared = readInstrumentMetadata(song)
  if (declared) return declared

  const fromDefinitions = instrumentFromDefinitionWidth(song)
  if (fromDefinitions) return fromDefinitions

  return 'guitar'
}

function readInstrumentMetadata(song: Song): Instrument | null {
  let raw: unknown
  try {
    raw = song.metadata.get('instrument')
  } catch {
    return null
  }
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (isInstrument(normalized)) return normalized
  if (normalized.includes('ukulele') || normalized === 'uke') return 'ukulele'
  if (normalized.includes('guitar')) return 'guitar'
  return null
}

function instrumentFromDefinitionWidth(song: Song): Instrument | null {
  let definitions: Record<string, { frets: unknown[] }>
  try {
    definitions = song.getChordDefinitions() as Record<string, { frets: unknown[] }>
  } catch {
    return null
  }
  const widths = Object.values(definitions)
    .map((definition) => definition.frets?.length ?? 0)
    .filter((width) => width > 0)
  if (widths.length === 0) return null

  const fourString = widths.filter((width) => width === 4).length
  const sixString = widths.filter((width) => width === 6).length
  if (fourString > sixString) return 'ukulele'
  if (sixString > fourString) return 'guitar'
  return null
}
