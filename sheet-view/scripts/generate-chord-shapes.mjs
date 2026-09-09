/**
 * Generates one of the built-in chord-shape dictionaries under `src/chords/`
 * (`ukulele.ts`, `tenor.ts`, `tenorChicago.ts`), each keyed by a canonical
 * `<flat-root><quality>` name (see `canonicalChordName` in
 * `src/chords/definitions.ts`).
 *
 * The output is committed as reviewed data; this script only needs to run when
 * the quality table, the scoring, or an instrument's tuning changes. Run with:
 *
 *   bun run generate:chords <instrument>          # or: bun scripts/generate-chord-shapes.mjs <id>
 *
 * (bun, not node — this imports `src/chords/types.ts` for the tuning.) <instrument>
 * is a key of TARGETS below (`ukulele`, `tenor`, `tenor-chicago`). To add another
 * built-in instrument, add a TARGETS row and a matching INSTRUMENTS entry in
 * `src/chords/types.ts`. The generated file is Prettier-formatted before it is
 * written, so its style matches the rest of `src/`.
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
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { INSTRUMENTS } from '../src/chords/types.ts'

// Per-instrument config. The tuning comes from INSTRUMENTS[id] so it cannot
// drift from the app. `maxSpan` is a list of reach budgets tried in order; the
// first that yields a shape wins. `title` goes in the file header.
const TARGETS = {
  ukulele: {
    maxFret: 7,
    maxSpan: [7],
    out: 'ukulele.ts',
    exportName: 'UKULELE_CHORDS',
    title: 'Standard GCEA ukulele',
  },
  tenor: {
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'tenor.ts',
    exportName: 'TENOR_CHORDS',
    title: 'Standard CGDA tenor-guitar',
  },
  'tenor-chicago': {
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'tenorChicago.ts',
    exportName: 'TENOR_CHICAGO_CHORDS',
    title: 'Chicago (DGBE) tenor-guitar / DGBE baritone ukulele',
  },
  // GCEA transposed ±2 semitones — same shapes, same reach budget as the uke.
  formby: {
    maxFret: 7,
    maxSpan: [7],
    out: 'formby.ts',
    exportName: 'FORMBY_CHORDS',
    title: "D 'Formby' (ADF#B) ukulele",
  },
  bflat: {
    maxFret: 7,
    maxSpan: [7],
    out: 'bflat.ts',
    exportName: 'BFLAT_CHORDS',
    title: 'B-flat (FBbDG) ukulele',
  },
  // Four-string fifths / open tunings — wider stretches, tried widest-last.
  mandolin: {
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'mandolin.ts',
    exportName: 'MANDOLIN_CHORDS',
    title: 'Mandolin (GDAE)',
  },
  banjo: {
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'banjo.ts',
    exportName: 'BANJO_CHORDS',
    title: 'Tenor banjo (DGBD)',
  },
  'banjo-c': {
    maxFret: 7,
    maxSpan: [4, 5, 7],
    out: 'banjoC.ts',
    exportName: 'BANJO_C_CHORDS',
    title: 'Banjo C (CGBD)',
  },
  // Six-string alternate tunings. A hand rarely spans past four frets across
  // six strings, and the all-strings-ringing bonus pulls toward compact grips
  // before the search reaches for a stretch. `maxFret` runs higher because an
  // open tuning parks some chords further up the neck.
  celtic: {
    maxFret: 9,
    maxSpan: [3, 4, 5],
    out: 'celtic.ts',
    exportName: 'CELTIC_CHORDS',
    title: 'Celtic guitar (DADGAD)',
  },
  'open-d': {
    maxFret: 9,
    maxSpan: [3, 4, 5],
    out: 'openD.ts',
    exportName: 'OPEN_D_CHORDS',
    title: 'Open D guitar (DADF#AD)',
  },
  'open-g': {
    maxFret: 9,
    maxSpan: [3, 4, 5],
    out: 'openG.ts',
    exportName: 'OPEN_G_CHORDS',
    title: 'Open G guitar (DGDGBD)',
  },
  guitalele: {
    maxFret: 9,
    maxSpan: [3, 4, 5],
    out: 'guitalele.ts',
    exportName: 'GUITALELE_CHORDS',
    title: 'Guitalele (ADGCEA)',
  },
}

const id = process.argv[2]
const target = TARGETS[id]
if (!target) {
  console.error(`usage: bun scripts/generate-chord-shapes.mjs <${Object.keys(TARGETS).join('|')}>`)
  process.exit(1)
}

const TUNING = INSTRUMENTS[id].tuning
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

// Depth-first walk over the fret combinations on `STRINGS` strings; -1 means the
// string is not played. Two branches are pruned because `scoreVoicing` would
// reject them anyway: a sounded string whose pitch class is not in the chord,
// and a reach across the already-fixed strings wider than `maxSpan` (the span
// only ever grows as more strings are pinned). The muted branch (-1) is visited
// first and frets ascend, and the first string varies slowest, so candidates
// come out in exactly the order the old exhaustive nested-loop generator used —
// tie-breaking, and therefore the committed tables, are unchanged. The pruning
// is what makes a six-string neck tractable: ~5e5 raw combinations per chord
// collapse to a few thousand.
function* voicings(chordPcs, maxSpan) {
  const state = Array.from({ length: STRINGS }, () => -1)
  function* walk(i, lo, hi) {
    if (i === STRINGS) {
      yield state
      return
    }
    state[i] = -1
    yield* walk(i + 1, lo, hi)
    for (let fret = 0; fret <= MAX_FRET; fret += 1) {
      if (!chordPcs.has((TUNING[i] + fret) % 12)) continue
      const nextLo = fret < lo ? fret : lo
      const nextHi = fret > hi ? fret : hi
      if (nextHi - nextLo > maxSpan) continue
      state[i] = fret
      yield* walk(i + 1, nextLo, nextHi)
    }
    state[i] = -1
  }
  yield* walk(0, Infinity, -Infinity)
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
  // Note on the lowest string *index* played. For a re-entrant tuning (GCEA
  // ukulele) that is not the lowest-pitched string, but keying the tie-break on
  // the true bass string pushes E/F voicings needlessly up the neck — the
  // lowest-index heuristic yields more playable open shapes in practice.
  const lowestPc = playedStrings[0].pc

  let score = 0
  score += muted * 60 // strongly prefer all strings ringing
  score += maxFret * 9 // prefer low positions
  score += span * 9 // prefer compact shapes
  score += fretted.length * 2 // fewer fingers
  if (lowestPc !== rootPc) score += 6 // mild preference for root in the bass
  return { score, frets: frets.map((f) => (f < 0 ? 'x' : f)) }
}

function bestShape(rootIndex, quality, intervals, maxSpan) {
  const chordPcs = new Set(intervals.map((i) => (rootIndex + i) % 12))
  const mandatoryPcs = new Set((MANDATORY[quality] ?? [0, 4]).map((i) => (rootIndex + i) % 12))
  let best = null
  for (const v of voicings(chordPcs, maxSpan)) {
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

if (entries.length === 0) {
  console.error('generated no shapes — refusing to overwrite the table')
  process.exit(1)
}

const body = entries.map(([k, v]) => `  '${k}': '${v}',`).join('\n')
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
execFileSync('bunx', ['prettier', '--write', OUT], { stdio: 'inherit' })
console.log(`wrote ${entries.length} shapes to ${OUT}`)
if (missing.length) {
  console.log(`no playable shape found for: ${missing.join(', ')}`)
  process.exitCode = 1
}
