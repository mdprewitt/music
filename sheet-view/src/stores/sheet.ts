import { ref, markRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { detectInstrument } from '@/chords/detectInstrument'
import { readStored, writeStored } from '@/stores/storage'
import {
  isDiagramPosition,
  isInstrument,
  type DiagramPosition,
  type Instrument,
} from '@/chords/types'

type SourceFormat = 'chordpro'
export type ViewFormat = 'chordpro' | 'html' | 'html-inline' | 'pdf'

export function isViewFormat(value: unknown): value is ViewFormat {
  return (
    value === 'chordpro' || value === 'html' || value === 'html-inline' || value === 'pdf'
  )
}

const INSTRUMENT_STORAGE_KEY = 'sheet-view:instrument'
const DIAGRAM_POSITION_STORAGE_KEY = 'sheet-view:diagramPosition'
const PIN_DIAGRAMS_STORAGE_KEY = 'sheet-view:pinDiagrams'
const VIEW_FORMAT_STORAGE_KEY = 'sheet-view:viewFormat'
const DISPLAY_PANEL_STORAGE_KEY = 'sheet-view:displayPanel'
const DEFAULT_INSTRUMENT: Instrument = 'guitar'
const DEFAULT_DIAGRAM_POSITION: DiagramPosition = 'top'
const DEFAULT_VIEW_FORMAT: ViewFormat = 'html'

const asInstrument = (raw: string): Instrument | null => (isInstrument(raw) ? raw : null)
const asDiagramPosition = (raw: string): DiagramPosition | null =>
  isDiagramPosition(raw) ? raw : null
const asViewFormat = (raw: string): ViewFormat | null => (isViewFormat(raw) ? raw : null)
const asBoolean = (raw: string): boolean => raw === 'true'

/**
 * Map a human-facing GitHub URL to its CORS-enabled raw equivalent, so a pasted
 * "view this file on GitHub" link fetches the file rather than the HTML page:
 *
 *   github.com/{o}/{r}/blob/{ref}/{path}  → raw.githubusercontent.com/{o}/{r}/{ref}/{path}
 *   github.com/{o}/{r}/raw/{ref}/{path}   → (same)
 *   gist.github.com/{u}/{id}              → gist.githubusercontent.com/{u}/{id}/raw
 *
 * The query and hash are dropped on rewrite (`?plain=1`, `#L4-L9` are page-viewer
 * params). Any other URL — including already-raw links — is returned unchanged.
 */
export function toFetchableUrl(url: URL): URL {
  const host = url.hostname.replace(/^www\./, '')
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'github.com' && (segments[2] === 'blob' || segments[2] === 'raw')) {
    const [owner, repo, , ...rest] = segments
    if (owner && repo && rest.length > 0) {
      return new URL(`https://raw.githubusercontent.com/${owner}/${repo}/${rest.join('/')}`)
    }
  }

  if (host === 'gist.github.com') {
    const [user, id] = segments
    if (user && id) {
      return new URL(`https://gist.githubusercontent.com/${user}/${id}/raw`)
    }
  }

  return url
}

export const useSheetStore = defineStore('sheet', () => {
  const rawText = ref<string | null>(null)
  const filename = ref<string | null>(null)
  const song = ref<Song | null>(null)
  const parseError = ref<string | null>(null)
  const sourceFormat = ref<SourceFormat>('chordpro')
  const viewFormat = ref<ViewFormat>(
    readStored(VIEW_FORMAT_STORAGE_KEY, asViewFormat) ?? DEFAULT_VIEW_FORMAT,
  )
  const instrument = ref<Instrument>(
    readStored(INSTRUMENT_STORAGE_KEY, asInstrument) ?? DEFAULT_INSTRUMENT,
  )
  const diagramPosition = ref<DiagramPosition>(
    readStored(DIAGRAM_POSITION_STORAGE_KEY, asDiagramPosition) ?? DEFAULT_DIAGRAM_POSITION,
  )
  // When pinned, the diagram strip stays put (position: sticky) while the chart scrolls.
  const pinDiagrams = ref<boolean>(readStored(PIN_DIAGRAMS_STORAGE_KEY, asBoolean) ?? false)
  // Whether the "Display" settings panel in the viewer header is expanded.
  const displayPanelOpen = ref<boolean>(readStored(DISPLAY_PANEL_STORAGE_KEY, asBoolean) ?? false)
  const showDiagrams = ref(true)
  // A remembered choice is authoritative; auto-detection only fills the gap for
  // the first sheet loaded on a fresh browser. `autoDetecting` marks the one
  // assignment that came from detection rather than the user, so it is not
  // mistaken for an explicit choice and persisted.
  let instrumentPinned = readStored(INSTRUMENT_STORAGE_KEY, asInstrument) !== null
  let autoDetecting = false

  watch(
    instrument,
    (value) => {
      if (autoDetecting) return
      instrumentPinned = true
      writeStored(INSTRUMENT_STORAGE_KEY, value)
    },
    { flush: 'sync' },
  )

  // Nothing auto-detects a diagram position, so no pinned/auto bookkeeping —
  // every assignment is an explicit user choice worth persisting.
  watch(diagramPosition, (value) => writeStored(DIAGRAM_POSITION_STORAGE_KEY, value), {
    flush: 'sync',
  })
  watch(pinDiagrams, (value) => writeStored(PIN_DIAGRAMS_STORAGE_KEY, String(value)), {
    flush: 'sync',
  })
  watch(viewFormat, (value) => writeStored(VIEW_FORMAT_STORAGE_KEY, value), { flush: 'sync' })
  watch(displayPanelOpen, (value) => writeStored(DISPLAY_PANEL_STORAGE_KEY, String(value)), {
    flush: 'sync',
  })

  function parse() {
    if (!rawText.value) return
    try {
      switch (sourceFormat.value) {
        case 'chordpro':
          song.value = markRaw(new ChordProParser().parse(rawText.value))
          break
      }
      parseError.value = null
      if (!instrumentPinned && song.value) {
        autoDetecting = true
        instrument.value = detectInstrument(song.value as Song)
        autoDetecting = false
      }
    } catch (err) {
      song.value = null
      parseError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadFile(file: File) {
    filename.value = file.name
    rawText.value = await file.text()
    parse()
  }

  /** Last path segment of a URL, decoded — or the hostname when there is none. */
  function filenameFromUrl(url: URL): string {
    const last = url.pathname.split('/').filter(Boolean).pop()
    try {
      return last ? decodeURIComponent(last) : url.hostname
    } catch {
      return last ?? url.hostname
    }
  }

  /**
   * Fetch a chart from `rawUrl` and load it as if it had been dropped in.
   * Throws on a bad URL or a failed fetch so the caller can surface the message;
   * a fetched-but-unparseable body lands in `parseError` like any other sheet.
   */
  async function loadFromUrl(rawUrl: string) {
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      throw new Error('That does not look like a valid URL.')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('The URL must start with http:// or https://.')
    }
    let res: Response
    try {
      res = await fetch(toFetchableUrl(url).href)
    } catch {
      throw new Error(
        'Could not load that URL. The site may block cross-origin requests (CORS) or ' +
          'require a browser. Try downloading the file and dropping it in instead.',
      )
    }
    if (!res.ok) {
      throw new Error(`Could not fetch the chart — the server returned ${res.status}.`)
    }
    const text = await res.text()
    if (/^\s*<(?:!doctype html|html[\s>])/i.test(text)) {
      throw new Error(
        'That URL returned a web page, not a chart file. Link directly to the .cho or .txt file.',
      )
    }
    // A rewritten GitHub URL points at the raw host; the original URL still
    // carries the real filename (and avoids naming a gist chart "raw").
    filename.value = filenameFromUrl(url)
    rawText.value = text
    parse()
  }

  function reset() {
    rawText.value = null
    filename.value = null
    song.value = null
    parseError.value = null
    sourceFormat.value = 'chordpro'
    showDiagrams.value = true
    // keep `instrument`, `diagramPosition`, `pinDiagrams`, `viewFormat` and
    // `displayPanelOpen` — they are user preferences that outlive a single sheet
  }

  return {
    rawText,
    filename,
    song,
    parseError,
    sourceFormat,
    viewFormat,
    instrument,
    diagramPosition,
    pinDiagrams,
    displayPanelOpen,
    showDiagrams,
    loadFile,
    loadFromUrl,
    reset,
  }
})
