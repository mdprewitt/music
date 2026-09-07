/**
 * Generates one of the built-in chord-shape dictionaries under `src/chords/`
 * (`ukulele.ts`, `tenor.ts`, `tenorChicago.ts`), each keyed by a canonical
 * `<flat-root><quality>` name (see `canonicalChordName` in
 * `src/chords/definitions.ts`).
 *
 * The output is committed as reviewed data; this script only needs to run when
 * the quality table, the scoring, or an instrument's tuning changes. Run with:
 *
 *   node scripts/generate-chord-shapes.mjs <instrument>
 *
 * where <instrument> is a key of TARGETS below (`ukulele`, `tenor`,
 * `tenor-chicago`). To add another built-in instrument, add a TARGETS row and a
 * matching entry to INSTRUMENTS in `src/chords/types.ts`.
 *
 * Shapes are chosen by brute-forcing every fret combination in a small window
 * and scoring for playability (all strings sounding, low position, short span).
 * `maxSpan` caps the reach across sounding strings and is tried widest-last —
 * a fifths tuning like CGDA legitimately needs bigger stretches than GCEA, but
 * without a cap the scorer will still pick an unplayable six-fret grip over
 * muting a string. Hand-fix any individual entry in the generated file
 * afterwards if needed.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Per-instrument config. `tuning` is pitch classes (0 = C), lowest-pitched
// string first — it must match INSTRUMENTS[id].tuning in src/chords/types.ts.
// `maxSpan` is a list of reach budgets tried in order; the first that yields a
// shape wins. `title` is spliced into the generated file's header comment.
const TARGETS = {
  ukulele: {
    tuning: [7, 0, 4, 9],
    maxFret: 7,
    maxSpan: [7],
    out: 'ukulele.ts',
    exportName: 'UKULELE_CHORDS',
    title: 'Standard GCEA ukulele',
  },
  tenor: {
    tuning: [0, 7, 2, 9],
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'tenor.ts',
    exportName: 'TENOR_CHORDS',
    title: 'Standard CGDA tenor-guitar',
  },
  'tenor-chicago': {
    tuning: [2, 7, 11, 4],
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'tenorChicago.ts',
    exportName: 'TENOR_CHICAGO_CHORDS',
    title: 'Chicago (DGBE) tenor-guitar',
  },
}

const id = process.argv[2]
const target = TARGETS[id]
if (!target) {
  console.error(
    `usage: node scripts/generate-chord-shapes.mjs <${Object.keys(TARGETS).join('|')}>`,
  )
  process.exit(1)
}

const TUNING = target.tuning
const STRINGS = TUNING.length
const MAX_FRET = target.maxFret
const SPAN_BUDGETS = target.maxSpan
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/chords/', target.out)

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

// Every fret combination on `STRINGS` strings; -1 means the string is not
// played. Yields with the first string varying slowest, matching the old
// nested-loop order so tie-breaking is unchanged for the ukulele table.
function* voicings() {
  const state = Array.from({ length: STRINGS }, () => -1)
  for (;;) {
    yield state
    let i = STRINGS - 1
    for (; i >= 0; i--) {
      state[i]++
      if (state[i] <= MAX_FRET) break
      state[i] = -1
    }
    if (i < 0) return
  }
}

function scoreVoicing(frets, rootPc, chordPcs, mandatoryPcs, maxSpan) {
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
  if (playedStrings.length < Math.min(3, STRINGS)) return null
  for (const pc of mandatoryPcs) if (!soundedPcs.has(pc)) return null

  const positions = playedStrings.map((s) => s.fret) // includes 0 for open strings
  const fretted = positions.filter((f) => f > 0)
  const maxFret = fretted.length ? Math.max(...fretted) : 0
  // Span across every sounding string, so a wide stretch that happens to use
  // open strings is still penalised.
  const span = Math.max(...positions) - Math.min(...positions)
  if (span > maxSpan) return null
  const muted = STRINGS - playedStrings.length
  const lowestPc = playedStrings[0].pc

  let score = 0
  score += muted * 60 // strongly prefer all strings ringing
  score += maxFret * 9 // prefer low positions
  score += span * 9 // prefer compact shapes
  score += fretted.length * 2 // fewer fingers
  if (lowestPc !== rootPc) score += 6 // mild preference for root in the bass
  if (maxFret > MAX_FRET) score += 100
  return { score, frets: frets.map((f) => (f < 0 ? 'x' : f)) }
}

function bestShape(rootIndex, quality, intervals, maxSpan) {
  const chordPcs = new Set(intervals.map((i) => (rootIndex + i) % 12))
  const mandatoryPcs = new Set((MANDATORY[quality] ?? [0, 4]).map((i) => (rootIndex + i) % 12))
  let best = null
  for (const v of voicings()) {
    const scored = scoreVoicing(v, rootIndex % 12, chordPcs, mandatoryPcs, maxSpan)
    if (!scored) continue
    if (!best || scored.score < best.score) best = scored
  }
  return best
}

const entries = []
const missing = []
ROOTS.forEach((root, rootIndex) => {
  for (const [quality, intervals] of Object.entries(QUALITIES)) {
    let shape = null
    for (const budget of SPAN_BUDGETS) {
      shape = bestShape(rootIndex, quality, intervals, budget)
      if (shape) break
    }
    const name = `${root}${quality}`
    if (!shape) {
      missing.push(name)
      continue
    }
    entries.push([name, `${name} base-fret 1 frets ${shape.frets.join(' ')}`])
  }
})

const body = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')
const file = `// GENERATED by scripts/generate-chord-shapes.mjs — do not edit by hand except to
// hand-fix an individual shape. ${target.title} voicings, keyed by the
// canonical chord name produced by canonicalChordName() in ./definitions.
//
// Each value is a chordsheetjs define string, ready for ChordDefinition.parse().

export const ${target.exportName}: Record<string, string> = {
${body}
}
`

writeFileSync(OUT, file)
console.log(`wrote ${entries.length} shapes to ${OUT}`)
if (missing.length) console.log(`no playable shape found for: ${missing.join(', ')}`)
