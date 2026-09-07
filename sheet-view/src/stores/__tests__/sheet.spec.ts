import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSheetStore, toFetchableUrl } from '../sheet'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const SAMPLE_CHORDPRO = '{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world'
const UKULELE_CHORDPRO =
  '{title: Uke Song}\n{define: C frets 0 0 0 3}\n{define: G frets 0 2 3 2}\n\n[C]Hello [G]world'

function fileOf(text: string, name = 'test.cho') {
  return new File([text], name, { type: 'text/plain' })
}

describe('useSheetStore', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('defaults the diagram position to top', () => {
    expect(useSheetStore().diagramPosition).toBe('top')
  })

  it('keeps the diagram position across a reset', async () => {
    const store = useSheetStore()
    store.diagramPosition = 'right'
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.reset()
    expect(store.diagramPosition).toBe('right')
  })

  it('persists the diagram position and restores it in a fresh store', () => {
    useSheetStore().diagramPosition = 'bottom'
    setActivePinia(createPinia())
    expect(useSheetStore().diagramPosition).toBe('bottom')
  })

  it('defaults pinDiagrams to false', () => {
    expect(useSheetStore().pinDiagrams).toBe(false)
  })

  it('keeps pinDiagrams across a reset', async () => {
    const store = useSheetStore()
    store.pinDiagrams = true
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.reset()
    expect(store.pinDiagrams).toBe(true)
  })

  it('persists pinDiagrams and restores it in a fresh store', () => {
    useSheetStore().pinDiagrams = true
    setActivePinia(createPinia())
    expect(useSheetStore().pinDiagrams).toBe(true)
  })

  describe('loadFromUrl', () => {
    it('fetches a chart and parses it, naming it from the URL path', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(SAMPLE_CHORDPRO, { status: 200 })),
      )
      const store = useSheetStore()
      await store.loadFromUrl('https://example.com/charts/My%20Song.chopro')
      expect(fetch).toHaveBeenCalledWith('https://example.com/charts/My%20Song.chopro')
      expect(store.filename).toBe('My Song.chopro')
      expect(store.song?.title).toBe('Test Song')
      expect(store.parseError).toBeNull()
    })

    it('rejects a malformed URL without fetching', async () => {
      const fetchSpy = vi.fn<() => Promise<Response>>()
      vi.stubGlobal('fetch', fetchSpy)
      const store = useSheetStore()
      await expect(store.loadFromUrl('not a url')).rejects.toThrow(/valid URL/)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('rejects a non-http protocol', async () => {
      const store = useSheetStore()
      await expect(store.loadFromUrl('ftp://example.com/song.cho')).rejects.toThrow(/http/)
    })

    it('rewrites a GitHub blob URL to raw.githubusercontent.com and keeps the filename', async () => {
      const fetchSpy = vi.fn<(input: string) => Promise<Response>>(
        async () => new Response(SAMPLE_CHORDPRO, { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchSpy)
      const store = useSheetStore()
      await store.loadFromUrl('https://github.com/user/repo/blob/main/charts/song.cho')
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo/main/charts/song.cho',
      )
      expect(store.filename).toBe('song.cho')
      expect(store.song?.title).toBe('Test Song')
    })

    it('drops page-viewer query params when rewriting a GitHub URL', async () => {
      const fetchSpy = vi.fn<(input: string) => Promise<Response>>(
        async () => new Response(SAMPLE_CHORDPRO, { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchSpy)
      await useSheetStore().loadFromUrl('https://github.com/user/repo/raw/main/song.cho?plain=1')
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo/main/song.cho',
      )
    })

    it('rewrites a gist URL to its raw endpoint', () => {
      expect(toFetchableUrl(new URL('https://gist.github.com/user/abc123')).href).toBe(
        'https://gist.githubusercontent.com/user/abc123/raw',
      )
    })

    it('leaves a non-GitHub URL untouched', () => {
      const url = new URL('https://example.com/charts/song.cho?v=2')
      expect(toFetchableUrl(url).href).toBe('https://example.com/charts/song.cho?v=2')
    })

    it('surfaces a blocked fetch as a CORS error with a download hint', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn<() => Promise<Response>>(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )
      const store = useSheetStore()
      await expect(store.loadFromUrl('https://example.com/song.cho')).rejects.toThrow(
        /CORS.*dropping/s,
      )
    })

    it('rejects a body that is an HTML page rather than a chart', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('<!DOCTYPE html>\n<html><body>nope</body></html>')),
      )
      const store = useSheetStore()
      await expect(store.loadFromUrl('https://example.com/song')).rejects.toThrow(/web page/)
      expect(store.song).toBeNull()
    })

    it('surfaces a non-OK response as an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('nope', { status: 404 })),
      )
      const store = useSheetStore()
      await expect(store.loadFromUrl('https://example.com/missing.cho')).rejects.toThrow(/404/)
    })
  })
})
