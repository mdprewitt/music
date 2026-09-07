import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSheetStore, toFetchableUrl } from '../sheet'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const SAMPLE_CHORDPRO = '{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world'
const UKULELE_CHORDPRO =
  '{title: Uke Song}\n{define: C frets 0 0 0 3}\n{define: G frets 0 2 3 2}\n\n[C]Hello [G]world'
const SAMPLE_WITH_KEY =
  '{title: Keyed Song}\n{artist: Some Artist}\n{key: C}\n\n[C]Hello [Am]world [F]now [G7]end'
const NO_KEY_CHORDPRO = '{title: Keyless}\n{artist: Some Artist}\n\n[C]Hello [F]world'

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

  it('resets sheet state to defaults but keeps view preferences', async () => {
    const store = useSheetStore()
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.showDiagrams = false
    store.viewFormat = 'pdf'
    store.reset()
    expect(store.filename).toBeNull()
    expect(store.song).toBeNull()
    expect(store.rawText).toBeNull()
    expect(store.parseError).toBeNull()
    expect(store.sourceFormat).toBe('chordpro')
    expect(store.showDiagrams).toBe(true)
    // viewFormat is a remembered preference — it survives a reset
    expect(store.viewFormat).toBe('pdf')
  })

  it('defaults the view format to html', () => {
    expect(useSheetStore().viewFormat).toBe('html')
  })

  it('persists the view format and restores it in a fresh store', () => {
    useSheetStore().viewFormat = 'chordpro'
    setActivePinia(createPinia())
    expect(useSheetStore().viewFormat).toBe('chordpro')
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

  it('defaults displayPanelOpen to false and persists it across a fresh store', () => {
    const store = useSheetStore()
    expect(store.displayPanelOpen).toBe(false)
    store.displayPanelOpen = true
    setActivePinia(createPinia())
    expect(useSheetStore().displayPanelOpen).toBe(true)
  })

  it('keeps displayPanelOpen across a reset', async () => {
    const store = useSheetStore()
    store.displayPanelOpen = true
    await store.loadFile(fileOf(SAMPLE_CHORDPRO))
    store.reset()
    expect(store.displayPanelOpen).toBe(true)
  })

  describe('changing the key', () => {
    it('exposes the original key and its transpose targets for a keyed sheet', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(SAMPLE_WITH_KEY))
      expect(store.originalKey).toBe('C')
      expect(store.canChangeKey).toBe(true)
      expect(store.availableKeys).toContain('E')
      expect(store.availableKeys).toContain('C')
    })

    it('leaves a keyless sheet unchangeable and its display song untransformed', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(NO_KEY_CHORDPRO))
      expect(store.originalKey).toBeNull()
      expect(store.canChangeKey).toBe(false)
      expect(store.availableKeys).toEqual([])
      // Setting a target key must not throw and must be a no-op.
      store.targetKey = 'E'
      expect(store.displaySong).toBe(store.song)
    })

    it('transposes the display song when a target key is set', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(SAMPLE_WITH_KEY))
      store.targetKey = 'E'
      expect(store.displaySong).not.toBe(store.song)
      expect(store.displaySong?.key).toBe('E')
      expect(store.displaySong?.getChords()).toEqual(['E', 'C#m', 'A', 'B7'])
      // The pristine song is untouched.
      expect(store.song?.getChords()).toEqual(['C', 'Am', 'F', 'G7'])
    })

    it('clears the target key on reset', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(SAMPLE_WITH_KEY))
      store.targetKey = 'E'
      store.reset()
      expect(store.targetKey).toBeNull()
    })

    it('remembers the key per song and restores it in a fresh store', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(SAMPLE_WITH_KEY))
      store.targetKey = 'E'

      setActivePinia(createPinia())
      const fresh = useSheetStore()
      await fresh.loadFile(fileOf(SAMPLE_WITH_KEY))
      expect(fresh.targetKey).toBe('E')
      expect(fresh.displaySong?.key).toBe('E')
    })

    it('does not carry a remembered key onto a different song', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf(SAMPLE_WITH_KEY))
      store.targetKey = 'E'
      await store.loadFile(
        fileOf('{title: Another Song}\n{artist: X}\n{key: G}\n\n[G]a [C]b', 'other.cho'),
      )
      expect(store.targetKey).toBeNull()
    })

    it('identifies a titleless sheet by its filename', async () => {
      const store = useSheetStore()
      await store.loadFile(fileOf('{key: C}\n\n[C]a [F]b', 'song-a.cho'))
      store.targetKey = 'E'

      setActivePinia(createPinia())
      const fresh = useSheetStore()
      await fresh.loadFile(fileOf('{key: C}\n\n[C]a [F]b', 'song-a.cho'))
      expect(fresh.targetKey).toBe('E')
    })
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
