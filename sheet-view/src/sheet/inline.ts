/**
 * Flatten a parsed {@link Song} into a small renderable model for the
 * "HTML inline" view, where chords sit bracketed inside the lyric flow
 * (`[C]Amazing [F]grace`) rather than stacked on their own row.
 *
 * chordsheetjs ships no inline HTML formatter, so we walk the AST ourselves.
 * `InlineSheet.vue` renders the result as real nodes — keeping us off `v-html`
 * and letting Vue escape the lyric text.
 */
import {
  ChordLyricsPair,
  SoftLineBreak,
  Tag,
  templateHelpers,
  type Line,
  type Song,
} from 'chordsheetjs'

export type InlineToken =
  | { kind: 'pair'; chord: string; lyrics: string }
  | { kind: 'annotation'; text: string; lyrics: string }
  | { kind: 'rhythm'; symbol: string; lyrics: string }
  | { kind: 'comment'; text: string }

export interface InlineLine {
  tokens: InlineToken[]
  /** True when every token is a comment — rendered as an aside, not a lyric line. */
  isComment: boolean
}

export interface InlineParagraph {
  label: string | null
  /** `verse` | `chorus` | `bridge` | … — carried through as a CSS class. */
  type: string
  lines: InlineLine[]
}

export interface InlineSheet {
  title: string | null
  subtitle: string | null
  paragraphs: InlineParagraph[]
}

type Item = Line['items'][number]

function lineToTokens(line: Line, song: Song): InlineToken[] {
  const tokens: InlineToken[] = []

  for (const item of line.items as Item[]) {
    if (item instanceof ChordLyricsPair) {
      const lyrics = item.lyrics ?? ''
      if (item.annotation) {
        tokens.push({ kind: 'annotation', text: item.annotation, lyrics })
      } else if (item.isRhythmSymbol) {
        tokens.push({ kind: 'rhythm', symbol: item.chords, lyrics })
      } else {
        const chord = item.chords ? templateHelpers.renderChord(item.chords, line, song) : ''
        if (chord === '' && lyrics === '') continue
        tokens.push({ kind: 'pair', chord, lyrics })
      }
    } else if (item instanceof Tag && item.isComment()) {
      tokens.push({ kind: 'comment', text: item.value })
    } else if (item instanceof SoftLineBreak) {
      // Fold the soft break into the lyric flow so the line still wraps here.
      const last = tokens[tokens.length - 1]
      if (last && last.kind !== 'comment') last.lyrics += item.content
      else tokens.push({ kind: 'pair', chord: '', lyrics: item.content })
    }
    // Literal / Ternary / section-delimiter tags / {image} — dropped.
  }

  return tokens
}

export function toInlineSheet(song: Song): InlineSheet {
  const paragraphs: InlineParagraph[] = []

  for (const paragraph of song.bodyParagraphs) {
    if (!paragraph.hasRenderableItems()) continue

    const lines: InlineLine[] = []
    for (const line of paragraph.lines) {
      if (!line.hasRenderableItems()) continue
      const tokens = lineToTokens(line, song)
      if (tokens.length === 0) continue
      lines.push({ tokens, isComment: tokens.every((t) => t.kind === 'comment') })
    }
    if (lines.length === 0) continue

    paragraphs.push({ label: paragraph.label, type: paragraph.type, lines })
  }

  return { title: song.title, subtitle: song.subtitle, paragraphs }
}
