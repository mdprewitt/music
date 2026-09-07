import { ref, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { ChordProParser, type Song } from 'chordsheetjs'

type SourceFormat = 'chordpro'
type ViewFormat = 'html'

export const useSheetStore = defineStore('sheet', () => {
  const rawText = ref<string | null>(null)
  const filename = ref<string | null>(null)
  const song = ref<Song | null>(null)
  const parseError = ref<string | null>(null)
  const sourceFormat = ref<SourceFormat>('chordpro')
  const viewFormat = ref<ViewFormat>('html')

  function parse() {
    if (!rawText.value) return
    try {
      switch (sourceFormat.value) {
        case 'chordpro':
          song.value = markRaw(new ChordProParser().parse(rawText.value))
          break
      }
      parseError.value = null
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
  }

  return { rawText, filename, song, parseError, sourceFormat, viewFormat, loadFile, reset }
})
