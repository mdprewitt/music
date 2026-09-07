import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSheetStore } from '../sheet'

const SAMPLE_CHORDPRO = '{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world'
const UKULELE_CHORDPRO =
  '{title: Uke Song}\n{define: C frets 0 0 0 3}\n{define: G frets 0 2 3 2}\n\n[C]Hello [G]world'

function fileOf(text: string, name = 'test.cho') {
  return new File([text], name, { type: 'text/plain' })
}

describe('useSheetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('parses a ChordPro file and populates song', async () => {
    const store = useSheetStore()
    const file = new File([SAMPLE_CHORDPRO], 'test.cho', { type: 'text/plain' })
    await store.loadFile(file)
    expect(store.filename).toBe('test.cho')
    expect(store.song).not.toBeNull()
    expect(store.song?.title).toBe('Test Song')
    expect(store.parseError).toBeNull()
  })

  it('resets all state to defaults', async () => {
    const store = useSheetStore()
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.showDiagrams = false
    store.reset()
    expect(store.filename).toBeNull()
    expect(store.song).toBeNull()
    expect(store.rawText).toBeNull()
    expect(store.parseError).toBeNull()
    expect(store.sourceFormat).toBe('chordpro')
    expect(store.viewFormat).toBe('html')
    expect(store.showDiagrams).toBe(true)
  })

  it('auto-detects the instrument from a freshly loaded sheet', async () => {
    const store = useSheetStore()
    expect(store.instrument).toBe('guitar')
    await store.loadFile(fileOf(UKULELE_CHORDPRO))
    expect(store.instrument).toBe('ukulele')
  })

  it('stops auto-detecting once the instrument has been chosen explicitly', async () => {
    const store = useSheetStore()
    await store.loadFile(fileOf(UKULELE_CHORDPRO))
    expect(store.instrument).toBe('ukulele') // auto-detected

    store.instrument = 'guitar' // explicit override
    await store.loadFile(fileOf(UKULELE_CHORDPRO, 'other.cho'))
    expect(store.instrument).toBe('guitar') // not re-detected
  })

  it('keeps the instrument across a reset', async () => {
    const store = useSheetStore()
    store.instrument = 'ukulele'
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.reset()
    expect(store.instrument).toBe('ukulele')
  })
})
