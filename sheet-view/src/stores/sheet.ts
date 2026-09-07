import { ref, markRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'
import { detectInstrument } from '@/chords/detectInstrument'
import { isInstrument, type Instrument } from '@/chords/types'

type SourceFormat = 'chordpro'
export type ViewFormat = 'chordpro' | 'text' | 'chords-over-words' | 'html' | 'pdf'

const INSTRUMENT_STORAGE_KEY = 'sheet-view:instrument'
const DEFAULT_INSTRUMENT: Instrument = 'guitar'

function readStoredInstrument(): Instrument | null {
  try {
    const stored = localStorage.getItem(INSTRUMENT_STORAGE_KEY)
    return isInstrument(stored) ? stored : null
  } catch {
    return null
  }
}

function writeStoredInstrument(value: Instrument): void {
  try {
    localStorage.setItem(INSTRUMENT_STORAGE_KEY, value)
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
  const instrument = ref<Instrument>(readStoredInstrument() ?? DEFAULT_INSTRUMENT)
  const showDiagrams = ref(true)
  // A remembered choice is authoritative; auto-detection only fills the gap for
  // the first sheet loaded on a fresh browser. `autoDetecting` marks the one
  // assignment that came from detection rather than the user, so it is not
  // mistaken for an explicit choice and persisted.
  let instrumentPinned = readStoredInstrument() !== null
  let autoDetecting = false

  watch(
    instrument,
    (value) => {
      if (autoDetecting) return
      instrumentPinned = true
      writeStoredInstrument(value)
    },
    { flush: 'sync' },
  )

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
    // keep `instrument` — it is a user preference that outlives a single sheet
  }

  return {
    rawText,
    filename,
    song,
    parseError,
    sourceFormat,
    viewFormat,
    instrument,
    showDiagrams,
    loadFile,
    reset,
  }
})
