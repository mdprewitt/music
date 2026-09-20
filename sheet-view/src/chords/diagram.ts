import type { DiagramBarre, DiagramMarker, DiagramShape, RawChordDefinition } from './types'

/**
 * A run of consecutive strings that all resolve to the same
 * {@link describeString} text — a barre reads as one clause rather than one
 * per string.
 */
interface StringGroup {
  from: number
  to: number
  description: string
}

/** Minimum number of fret rows a diagram draws, even for shapes near the nut. */
export const MIN_FRET_COUNT = 4

const NON_SOUNDING = new Set(['x', 'X', 'n', 'N', '-1'])

type FretClass = 'muted' | 'open' | number

function classifyFret(fret: number | string): FretClass {
  if (typeof fret === 'number') {
    if (Number.isNaN(fret) || fret < 0) return 'muted'
    return fret === 0 ? 'open' : fret
  }
  const trimmed = fret.trim()
  if (NON_SOUNDING.has(trimmed)) return 'muted'
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed) || parsed < 0) return 'muted'
  return parsed === 0 ? 'open' : parsed
}

/**
 * Turn a `chordsheetjs` chord definition into instrument-agnostic diagram
 * geometry.
 *
 * Ported from `chordsheetjs`' internal `buildChordDiagram` /
 * `groupFretsByFinger` / `addBarreIfValid` (`lib/pdf/module.js`), with two
 * corrections: the string count comes from the definition itself instead of a
 * hard-coded 6, and the visible fret window is derived from the actual marker
 * positions instead of a fixed 4 — so a shape played high up the neck is drawn
 * inside the neck with a base-fret label rather than off the bottom.
 */
export function toDiagramShape(
  definition: RawChordDefinition,
  minFretCount: number = MIN_FRET_COUNT,
): DiagramShape {
  const stringCount = definition.frets.length
  const definitionBaseFret = Math.max(1, Math.round(definition.baseFret || 1))
  const fingers = definition.fingers ?? []

  const openStrings: number[] = []
  const mutedStrings: number[] = []
  // Absolute fret per string; null for open or muted strings.
  const absoluteFrets: Array<number | null> = definition.frets.map((raw, index) => {
    const stringNumber = index + 1
    const fret = classifyFret(raw)
    if (fret === 'muted') {
      mutedStrings.push(stringNumber)
      return null
    }
    if (fret === 'open') {
      openStrings.push(stringNumber)
      return null
    }
    return definitionBaseFret - 1 + fret
  })

  const fretted = absoluteFrets.filter((value): value is number => value !== null)
  let baseFret = 1
  let fretCount = minFretCount
  if (fretted.length > 0) {
    const highest = Math.max(...fretted)
    const lowest = Math.min(...fretted)
    if (highest <= minFretCount) {
      fretCount = Math.max(minFretCount, highest)
    } else {
      baseFret = lowest
      fretCount = Math.max(minFretCount, highest - lowest + 1)
    }
  }

  const { markers, barres } = deriveMarkersAndBarres(absoluteFrets, fingers)

  // A marker is redundant only when the *same finger*'s barre already covers it
  // at the same fret. A note pressed by a different finger at that fret (a sus
  // note under a barre, say) is real information and must survive.
  const visibleMarkers = markers.filter(
    (marker) =>
      !barres.some(
        (barre) =>
          marker.fret === barre.fret &&
          marker.finger === barre.finger &&
          marker.string >= barre.from &&
          marker.string <= barre.to,
      ),
  )

  return {
    name: definition.name,
    stringCount,
    baseFret,
    fretCount,
    openStrings,
    mutedStrings,
    markers: visibleMarkers.sort((a, b) => a.string - b.string),
    barres: barres.sort((a, b) => a.fret - b.fret || a.from - b.from),
  }
}

function fingerSuffix(finger: number): string {
  return finger > 0 ? `, finger ${finger}` : ''
}

function groupConsecutive(descriptions: readonly string[]): StringGroup[] {
  const groups: StringGroup[] = []
  for (const [index, description] of descriptions.entries()) {
    const stringNumber = index + 1
    const last = groups[groups.length - 1]
    if (last && last.description === description && last.to === stringNumber - 1) {
      last.to = stringNumber
    } else {
      groups.push({ from: stringNumber, to: stringNumber, description })
    }
  }
  return groups
}

/**
 * A plain-language equivalent of the diagram geometry — every string's fret,
 * finger and open/muted state — for use as an SVG `<title>`/`aria-label`.
 * `ChordDiagram.vue`'s `role="img"` collapses the SVG's own text nodes from
 * the accessibility tree, so this is the only way the fingering itself
 * (not just the chord's name) reaches a screen-reader user (WCAG 1.1.1).
 */
export function describeShape(shape: DiagramShape): string {
  const openStrings = new Set(shape.openStrings)
  const mutedStrings = new Set(shape.mutedStrings)
  const barreByString = new Map<number, DiagramBarre>()
  for (const barre of shape.barres) {
    for (let s = barre.from; s <= barre.to; s++) barreByString.set(s, barre)
  }
  const markerByString = new Map<number, DiagramMarker>()
  for (const marker of shape.markers) markerByString.set(marker.string, marker)

  function describeString(stringNumber: number): string {
    if (openStrings.has(stringNumber)) return 'open'
    if (mutedStrings.has(stringNumber)) return 'muted'
    const barre = barreByString.get(stringNumber)
    if (barre) return `fret ${barre.fret}${fingerSuffix(barre.finger)}`
    const marker = markerByString.get(stringNumber)
    if (marker) return `fret ${marker.fret}${fingerSuffix(marker.finger)}`
    return 'not played'
  }

  const descriptions = Array.from({ length: shape.stringCount }, (_, i) => describeString(i + 1))
  const clauses = groupConsecutive(descriptions).map((group) =>
    group.from === group.to
      ? `string ${group.from} ${group.description}`
      : `strings ${group.from}-${group.to} ${group.description}`,
  )

  const stringWord = shape.stringCount === 1 ? 'string' : 'strings'
  const baseFretNote = shape.baseFret > 1 ? ` Base fret ${shape.baseFret}.` : ''
  return `${shape.stringCount} ${stringWord}.${baseFretNote} ${clauses.join(', ')}.`
}

function deriveMarkersAndBarres(
  absoluteFrets: Array<number | null>,
  fingers: number[],
): { markers: DiagramMarker[]; barres: DiagramBarre[] } {
  const markers: DiagramMarker[] = []
  const barres: DiagramBarre[] = []

  const hasFingering = fingers.some((finger) => typeof finger === 'number' && finger > 0)
  if (!hasFingering) {
    absoluteFrets.forEach((fret, index) => {
      if (fret !== null) markers.push({ string: index + 1, fret, finger: 0 })
    })
    return { markers, barres }
  }

  // Group same-finger, same-fret strings, then split each group into runs of
  // *consecutive* strings: a run of two or more is a barre, a lone string is a
  // marker. (chordsheetjs upstream draws one bar across the whole min–max span,
  // which paints a barre over strings the definition never assigns to that
  // finger — e.g. a differently-fretted note it steps over.)
  const groups = new Map<string, { fret: number; finger: number; strings: number[] }>()
  absoluteFrets.forEach((fret, index) => {
    if (fret === null) return
    const finger = fingers[index] ?? 0
    if (!finger || finger <= 0) {
      markers.push({ string: index + 1, fret, finger: 0 })
      return
    }
    const key = `${fret}:${finger}`
    const group = groups.get(key) ?? { fret, finger, strings: [] }
    group.strings.push(index + 1)
    groups.set(key, group)
  })

  for (const group of groups.values()) {
    const strings = group.strings.sort((a, b) => a - b)
    let run: number[] = []
    const flushRun = () => {
      const first = run[0]
      const last = run[run.length - 1]
      if (first === undefined || last === undefined) return
      if (run.length > 1) {
        barres.push({ from: first, to: last, fret: group.fret, finger: group.finger })
      } else {
        markers.push({ string: first, fret: group.fret, finger: group.finger })
      }
      run = []
    }
    for (const stringNumber of strings) {
      const prev = run[run.length - 1]
      if (prev !== undefined && stringNumber !== prev + 1) flushRun()
      run.push(stringNumber)
    }
    flushRun()
  }

  return { markers, barres }
}
