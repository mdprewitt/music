/**
 * The browser tab title for the current sheet: `<song name> - Sheet-View`, or
 * the bare app name when nothing is loaded (drop zone, or a chart that failed
 * to parse — `song` is `null` in both cases). The song name is its `{title}`
 * directive when present, else the loaded filename with its extension
 * stripped (same regex as `pdfFilename` in `SheetViewer.vue`) — the same
 * fallback order the viewer header itself has no title to show otherwise.
 */
import type { Song } from 'chordsheetjs'
import { metaText } from '@/sheet/key'

const BASE_TITLE = 'Sheet-View'

function stripExtension(filename: string | null): string {
  return (filename ?? '').trim().replace(/\.[^./]*$/, '')
}

export function pageTitle(song: Song | null, filename: string | null): string {
  if (!song) return BASE_TITLE
  const name = metaText(song.title) || stripExtension(filename)
  return name ? `${name} - ${BASE_TITLE}` : BASE_TITLE
}
