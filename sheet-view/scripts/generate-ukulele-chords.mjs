/**
 * Generates `src/chords/ukulele.ts` — a dictionary of standard GCEA ukulele
 * chord shapes, keyed by a canonical `<flat-root><quality>` name (see
 * `canonicalChordName` in `src/chords/definitions.ts`).
 *
 * The output is committed as reviewed data; this script only needs to run when
 * the quality table or scoring changes. Run with:
 *
 *   node scripts/generate-ukulele-chords.mjs
 *
 * Shapes are chosen by brute-forcing every fret combination in a small window
 * and scoring for playability (all strings sounding, low position, short span).
 * Hand-fix any individual entry in the generated file afterwards if needed.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/chords/ukulele.ts')

// GCEA, lowest-pitched string first. Pitch classes, 0 = C.
const TUNING = [7, 0, 4, 9]
const MAX_FRET = 7

// 12 roots, flat-preferring spelling — matches canonicalChordName().
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// quality token -> intervals (semitones from root). The 3rd and 7th (or their
// substitutes) are mandatory in a voicing; everything else is a bonus.
const QUALITIES = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  mmaj7: [0, 3, 7, 11],
  add9: [0, 2, 4, 7],
  '9': [0, 2, 4, 7, 10],
  maj9: [0, 2, 4, 7, 11],
  m9: [0, 2, 3, 7, 10],
  '7sus4': [0, 5, 7, 10],
  '11': [0, 2, 5, 7, 10],
  '13': [0, 2, 4, 9, 10],
  '7b9': [0, 1, 4, 7, 10],
  '7#9': [0, 3, 4, 7, 10],
  '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10],
}

// Tones that must be audible for the shape to deserve the name. The 5th is
// dropped wherever something more characteristic needs the string.
const MANDATORY = {
  '': [0, 4],
  m: [0, 3],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '6': [0, 4, 9],
  m6: [0, 3, 9],
  '7': [0, 4, 10],
  maj7: [0, 4, 11],
  m7: [0, 3, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  mmaj7: [0, 3, 11],
  add9: [0, 2, 4],
  '9': [0, 2, 4, 10],
  maj9: [0, 2, 4, 11],
  m9: [0, 2, 3, 10],
  '7sus4': [0, 5, 10],
  '11': [0, 5, 7, 10],
  '13': [0, 4, 9, 10],
  '7b9': [0, 1, 4, 10],
  '7#9': [0, 3, 4, 10],
  '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10],
}

// Every fret combination on four strings; -1 means the string is not played.
function* voicings() {
  for (let a = -1; a <= MAX_FRET; a++)
    for (let b = -1; b <= MAX_FRET; b++)
      for (let c = -1; c <= MAX_FRET; c++)
        for (let d = -1; d <= MAX_FRET; d++) yield [a, b, c, d]
}

function scoreVoicing(frets, rootPc, chordPcs, mandatoryPcs) {
  const sounded = []
  const soundedPcs = new Set()
  frets.forEach((fret, string) => {
    if (fret < 0) return
    const pc = (TUNING[string] + fret) % 12
    if (!chordPcs.has(pc)) {
      sounded.push(null)
      return
    }
    sounded.push({ string, fret, pc })
    soundedPcs.add(pc)
  })
  if (sounded.some((s) => s === null)) return null
  const playedStrings = sounded.filter(Boolean)
  if (playedStrings.length < 3) return null
  for (const pc of mandatoryPcs) if (!soundedPcs.has(pc)) return null

  const positions = playedStrings.map((s) => s.fret) // includes 0 for open strings
  const fretted = positions.filter((f) => f > 0)
  const maxFret = fretted.length ? Math.max(...fretted) : 0
  // Span across every sounding string, so a wide stretch that happens to use
  // open strings is still penalised.
  const span = Math.max(...positions) - Math.min(...positions)
  const muted = 4 - playedStrings.length
  const lowestPc = playedStrings[0].pc

  let score = 0
  score += muted * 60 // strongly prefer all four strings ringing
  score += maxFret * 9 // prefer low positions
  score += span * 9 // prefer compact shapes
  score += fretted.length * 2 // fewer fingers
  if (lowestPc !== rootPc) score += 6 // mild preference for root in the bass
  if (maxFret > MAX_FRET) score += 100
  return { score, frets: frets.map((f) => (f < 0 ? 'x' : f)) }
}

function bestShape(rootIndex, quality, intervals) {
  const chordPcs = new Set(intervals.map((i) => (rootIndex + i) % 12))
  const mandatoryPcs = new Set(
    (MANDATORY[quality] ?? [0, 4]).map((i) => (rootIndex + i) % 12),
  )
  let best = null
  for (const v of voicings()) {
    const scored = scoreVoicing(v, rootIndex % 12, chordPcs, mandatoryPcs)
    if (!scored) continue
    if (!best || scored.score < best.score) best = scored
  }
  return best
}

const entries = []
const missing = []
ROOTS.forEach((root, rootIndex) => {
  for (const [quality, intervals] of Object.entries(QUALITIES)) {
    const shape = bestShape(rootIndex, quality, intervals)
    const name = `${root}${quality}`
    if (!shape) {
      missing.push(name)
      continue
    }
    entries.push([name, `${name} base-fret 1 frets ${shape.frets.join(' ')}`])
  }
})

const body = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')
const file = `// GENERATED by scripts/generate-ukulele-chords.mjs — do not edit by hand except to
// hand-fix an individual shape. Standard GCEA ukulele voicings, keyed by the
// canonical chord name produced by canonicalChordName() in ./definitions.
//
// Each value is a chordsheetjs define string, ready for ChordDefinition.parse().

export const UKULELE_CHORDS: Record<string, string> = {
${body}
}
`

writeFileSync(OUT, file)
console.log(`wrote ${entries.length} shapes to ${OUT}`)
if (missing.length) console.log(`no playable shape found for: ${missing.join(', ')}`)
