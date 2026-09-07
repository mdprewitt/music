import { Chord, ChordDefinition, type Song } from 'chordsheetjs'
import type { Instrument, RawChordDefinition } from './types'
import { UKULELE_CHORDS } from './ukulele'

export interface ResolvedChord {
  name: string
  /** null when no shape could be found for this chord on this instrument. */
  definition: RawChordDefinition | null
  /** Where the shape came from — useful for tests and debugging. */
  source: 'sheet' | 'sheet-recovered' | 'library' | 'library-normalized' | null
}

const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const LETTER_PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// Ordered longest-first so `maj7` is matched before `maj`, `m7b5` before `m7`.
const SUFFIX_ALIASES: Array<[RegExp, string]> = [
  [/^(?:maj|major|ma|M|Δ)9$/, 'maj9'],
  [/^(?:maj|major|ma|M|Δ)7$/, 'maj7'],
  [/^(?:m|min|mi)7\(?b5\)?$/, 'm7b5'],
  [/^(?:m|min|mi)\(?maj?7\)?$/, 'mmaj7'],
  [/^(?:m|min|mi)M7$/, 'mmaj7'],
  [/^(?:min|mi)9$/, 'm9'],
  [/^(?:min|mi)7$/, 'm7'],
  [/^(?:min|mi)6$/, 'm6'],
  [/^(?:min|mi)$/, 'm'],
  [/^7sus4?$/, '7sus4'],
  [/^7\(?b9\)?$/, '7b9'],
  [/^7\(?#9\)?$/, '7#9'],
  [/^7\(?b5\)?$/, '7b5'],
  [/^7\(?#5\)?$/, '7#5'],
  [/^(?:\+|aug)$/, 'aug'],
  [/^(?:°|dim)$/, 'dim'],
  [/^(?:°7|dim7)$/, 'dim7'],
  [/^(?:ø|ø7)$/, 'm7b5'],
  [/^sus$/, 'sus4'],
  [/^add(?:9|2)$/, 'add9'],
  [/^(?:6\/9|69)$/, '6'],
]

/**
 * Collapse the many ways of spelling a chord name into a single canonical
 * `<flat-root><quality>` token, so a lookup succeeds regardless of whether the
 * chart wrote `F#`, `Gb`, `maj7`, `M7`, `7-9` or `7b9`. Bass notes are dropped.
 * Returns the input unchanged when it does not look like a chord symbol.
 */
export function canonicalChordName(name: string): string {
  const match = /^([A-G])([#b]?)(.*)$/.exec(name.trim())
  if (!match) return name.trim()
  const [, letter = '', accidental = '', rest = ''] = match

  const base = LETTER_PITCH_CLASS[letter]
  if (base === undefined) return name.trim()
  const pitchClass = (base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
  const root = FLAT_ROOTS[pitchClass] ?? letter

  let suffix = rest.split('/')[0]?.trim() ?? ''
  // `-` / `+` before an alteration digit mean flat / sharp.
  suffix = suffix.replace(/-(?=\d)/g, 'b').replace(/\+(?=\d)/g, '#')
  suffix = suffix.replace(/\s+/g, '')

  for (const [pattern, canonical] of SUFFIX_ALIASES) {
    if (pattern.test(suffix)) {
      suffix = canonical
      break
    }
  }
  return `${root}${suffix}`
}

function chordsheetjsNormalized(name: string): string | null {
  try {
    return Chord.parse(name)?.normalize()?.toString() ?? null
  } catch {
    return null
  }
}

const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
}

/** Alternative spellings of a chord name to try against a library. */
function nameCandidates(name: string): string[] {
  const candidates = new Set<string>([name])
  const enharmonicRoot = /^([A-G][#b])(.*)$/.exec(name)
  if (enharmonicRoot) {
    const flipped = ENHARMONIC[enharmonicRoot[1] as string]
    if (flipped) candidates.add(`${flipped}${enharmonicRoot[2]}`)
  }
  for (const candidate of Array.from(candidates)) {
    const normalized = chordsheetjsNormalized(candidate)
    if (normalized) candidates.add(normalized)
  }
  return Array.from(candidates)
}

function toRaw(definition: {
  name: string
  baseFret: number
  frets: Array<number | string>
  fingers?: number[]
}): RawChordDefinition {
  return {
    name: definition.name,
    baseFret: definition.baseFret,
    frets: [...definition.frets],
    fingers: definition.fingers ? [...definition.fingers] : [],
  }
}

/**
 * Recover chord definitions that `chordsheetjs` drops on the floor: a
 * `{define}` / `{chord}` line carrying a ChordPro-6 `add: string N fret N
 * finger N` clause fails its PEG grammar and is discarded *without a warning*.
 * We strip the `add:` clauses (they only add extra barre fingers, so the base
 * shape survives) and re-parse the remainder.
 */
export function recoverDroppedDefinitions(rawText: string | null): Map<string, RawChordDefinition> {
  const recovered = new Map<string, RawChordDefinition>()
  if (!rawText) return recovered

  const directive = /\{\s*(?:define|chord)(?:-[a-z0-9]+)?[:\s]\s*([^}]*)\}/gi
  let match: RegExpExecArray | null
  while ((match = directive.exec(rawText)) !== null) {
    const body = match[1]?.trim()
    if (!body || !/\badd:/i.test(body)) continue
    const stripped = body.slice(0, body.search(/\s*\badd:/i)).trim()
    try {
      const parsed = ChordDefinition.parse(stripped)
      if (parsed?.name) recovered.set(parsed.name, toRaw(parsed))
    } catch {
      // give up on this one line, keep scanning
    }
  }
  return recovered
}

const ukuleleCache = new Map<string, RawChordDefinition | null>()

function ukuleleShape(key: string): RawChordDefinition | null {
  if (ukuleleCache.has(key)) return ukuleleCache.get(key) ?? null
  const raw = UKULELE_CHORDS[key]
  let shape: RawChordDefinition | null = null
  if (raw) {
    try {
      shape = toRaw(ChordDefinition.parse(raw))
    } catch {
      shape = null
    }
  }
  ukuleleCache.set(key, shape)
  return shape
}

/**
 * Resolve every chord used in `song` to diagram-ready fret data for the chosen
 * instrument, in the order the chords first appear. Resolution order per chord:
 *
 *   1. a `{define}` / `{chord}` in the chart itself;
 *   2. a chart definition recovered from a dropped `add:` line;
 *   3. the instrument's built-in library, by exact name;
 *   4. the built-in library, by normalised name;
 *   5. nothing — the chord is returned with `definition: null` and skipped by
 *      the renderer.
 *
 * The guitar library is `chordsheetjs`' bundled set (6-string). The ukulele
 * library is our own `UKULELE_CHORDS` — `chordsheetjs` ships no ukulele shapes,
 * and its `withDefaults()` would silently inject guitar shapes, so it is never
 * consulted for ukulele.
 */
export function resolveDiagramChords(
  song: Song,
  instrument: Instrument,
  rawText: string | null = null,
): ResolvedChord[] {
  const context = {
    configuration: { instrument: { type: instrument } },
    metadata: song.metadata,
  } as unknown as Parameters<Song['getChordDefinitions']>[0]

  let sheetDefs: Record<string, { name: string; baseFret: number; frets: Array<number | string> }>
  try {
    sheetDefs = song.getChordDefinitions(context) as typeof sheetDefs
  } catch {
    sheetDefs = {}
  }
  const recovered = recoverDroppedDefinitions(rawText)

  const guitarSet =
    instrument === 'guitar'
      ? (() => {
          try {
            return song.chordDefinitions.withDefaults()
          } catch {
            return null
          }
        })()
      : null

  const libraryExact = (name: string): RawChordDefinition | null => {
    if (instrument === 'ukulele') return ukuleleShape(name)
    const hit = guitarSet?.get(name) ?? null
    return hit ? toRaw(hit) : null
  }

  const libraryNormalized = (name: string): RawChordDefinition | null => {
    if (instrument === 'ukulele') return ukuleleShape(canonicalChordName(name))
    for (const candidate of nameCandidates(name)) {
      const hit = guitarSet?.get(candidate)
      if (hit) return toRaw(hit)
    }
    return null
  }

  const seen = new Set<string>()
  const result: ResolvedChord[] = []
  for (const name of song.getChords()) {
    if (seen.has(name)) continue
    seen.add(name)

    const sheet = sheetDefs[name]
    if (sheet) {
      result.push({ name, definition: toRaw(sheet), source: 'sheet' })
      continue
    }
    const fromRecovered = recovered.get(name)
    if (fromRecovered) {
      result.push({ name, definition: fromRecovered, source: 'sheet-recovered' })
      continue
    }
    const exact = libraryExact(name)
    if (exact) {
      result.push({ name, definition: exact, source: 'library' })
      continue
    }
    const normalized = libraryNormalized(name)
    if (normalized) {
      result.push({ name, definition: normalized, source: 'library-normalized' })
      continue
    }
    result.push({ name, definition: null, source: null })
  }
  return result
}
