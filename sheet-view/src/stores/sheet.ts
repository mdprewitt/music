import { ref, markRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { detectInstrument } from '@/chords/detectInstrument'
import {
  isDiagramPosition,
  isInstrument,
  type DiagramPosition,
  type Instrument,
} from '@/chords/types'

type SourceFormat = 'chordpro'
export type ViewFormat = 'chordpro' | 'text' | 'chords-over-words' | 'html' | 'pdf'

const INSTRUMENT_STORAGE_KEY = 'sheet-view:instrument'
const DIAGRAM_POSITION_STORAGE_KEY = 'sheet-view:diagramPosition'
const PIN_DIAGRAMS_STORAGE_KEY = 'sheet-view:pinDiagrams'
const DEFAULT_INSTRUMENT: Instrument = 'guitar'
const DEFAULT_DIAGRAM_POSITION: DiagramPosition = 'top'

/** Read a persisted preference, running `parse` on the raw string (absent → null). */
function readStored<T>(key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : parse(raw)
  } catch {
    return null
  }
}

const asInstrument = (raw: string): Instrument | null => (isInstrument(raw) ? raw : null)
const asDiagramPosition = (raw: string): DiagramPosition | null =>
  isDiagramPosition(raw) ? raw : null
const asBoolean = (raw: string): boolean => raw === 'true'

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode, disabled) — the choice just won't persist
  }
}

export const useSheetStore = defineStore('sheet', () => {
  const rawText = ref<string | null>(null)
  const filename = ref<string | null>(null)
  const song = ref<Song | null>(null)
  const parseError = ref<string | null>(null)
  const sourceFormat = ref<SourceFormat>('chordpro')
  const viewFormat = ref<ViewFormat>('html')
  const instrument = ref<Instrument>(
    readStored(INSTRUMENT_STORAGE_KEY, asInstrument) ?? DEFAULT_INSTRUMENT,
  )
  const diagramPosition = ref<DiagramPosition>(
    readStored(DIAGRAM_POSITION_STORAGE_KEY, asDiagramPosition) ?? DEFAULT_DIAGRAM_POSITION,
  )
  // When pinned, the diagram strip stays put (position: sticky) while the chart scrolls.
  const pinDiagrams = ref<boolean>(readStored(PIN_DIAGRAMS_STORAGE_KEY, asBoolean) ?? false)
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

  function reset() {
    rawText.value = null
    filename.value = null
    song.value = null
    parseError.value = null
    sourceFormat.value = 'chordpro'
    viewFormat.value = 'html'
    showDiagrams.value = true
    // keep `instrument`, `diagramPosition` and `pinDiagrams` — they are user
    // preferences that outlive a single sheet
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
    showDiagrams,
    loadFile,
    reset,
  }
})
