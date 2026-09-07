import type { Song } from 'chordsheetjs'
import type { Instrument } from './types'
import { INSTRUMENT_IDS, INSTRUMENTS, isInstrument } from './types'

/**
 * Best guess at the instrument a chart is written for:
 *
 * 1. an explicit instrument in the metadata (`{meta: instrument ...}`, which is
 *    where chordsheetjs records it), matched against every id and its `aliases`
 *    (see `INSTRUMENTS`);
 * 2. otherwise the string count of the chart's own `{define}` shapes, via
 *    `DEFAULT_BY_STRING_COUNT`;
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

/**
 * `{instrument: N}` → id, N being any of the string counts that unambiguously
 * pick one instrument. Four strings is ambiguous (ukulele and tenor guitar in
 * either tuning all have four) and resolves to the most common four-string
 * instrument; a chart for anything else needs an explicit `{instrument: …}`
 * directive, or the reader picks it in the Display panel.
 */
const DEFAULT_BY_STRING_COUNT: Record<number, Instrument> = { 4: 'ukulele', 6: 'guitar' }

/** `[id | alias, id]` pairs, longest phrase first so `tenor guitar` beats `guitar`. */
const DIRECTIVE_ALIASES: Array<[needle: string, id: Instrument]> = INSTRUMENT_IDS.flatMap((id) => [
  [id.toLowerCase(), id] as [string, Instrument],
  ...INSTRUMENTS[id].aliases.map((alias) => [alias.toLowerCase(), id] as [string, Instrument]),
]).sort((a, b) => b[0].length - a[0].length)

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
  // exact id / alias first, then a substring match (longest phrase wins).
  for (const [needle, id] of DIRECTIVE_ALIASES) if (normalized === needle) return id
  for (const [needle, id] of DIRECTIVE_ALIASES) if (normalized.includes(needle)) return id
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

  const tally = new Map<number, number>()
  for (const width of widths) tally.set(width, (tally.get(width) ?? 0) + 1)
  let bestWidth = 0
  let bestCount = 0
  for (const [width, count] of tally) {
    if (count > bestCount) {
      bestWidth = width
      bestCount = count
    }
  }
  return DEFAULT_BY_STRING_COUNT[bestWidth] ?? null
}
