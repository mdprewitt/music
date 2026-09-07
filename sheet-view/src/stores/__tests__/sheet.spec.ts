import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSheetStore } from '../sheet'

const SAMPLE_CHORDPRO = '{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world'

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
    const file = new File([SAMPLE_CHORDPRO], 'test.cho', { type: 'text/plain' })
    await store.loadFile(file)
    store.reset()
    expect(store.filename).toBeNull()
    expect(store.song).toBeNull()
    expect(store.rawText).toBeNull()
    expect(store.parseError).toBeNull()
    expect(store.sourceFormat).toBe('chordpro')
    expect(store.viewFormat).toBe('html')
  })
})
