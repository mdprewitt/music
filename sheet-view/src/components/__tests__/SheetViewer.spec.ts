import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import SheetViewer from '../SheetViewer.vue'
import { useSheetStore } from '@/stores/sheet'
import type { ViewFormat } from '@/stores/sheet'

const SAMPLE_CHORDPRO = '{title: Test}\n{artist: Artist}\n\n[C]Hello [G]world'

async function mountWithSong(view: ViewFormat) {
  const store = useSheetStore()
  await store.loadFile(new File([SAMPLE_CHORDPRO], 'song.cho', { type: 'text/plain' }))
  store.viewFormat = view
  const wrapper = mount(SheetViewer)
  await flushPromises()
  await nextTick()
  return { store, wrapper }
}

describe('SheetViewer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders HTML output containing chord classes', async () => {
    const { wrapper } = await mountWithSong('html')
    expect(wrapper.find('.sheet').exists()).toBe(true)
    expect(wrapper.html()).toContain('chord')
  })

  it('renders the ChordPro view with directives and inline chords', async () => {
    const { wrapper } = await mountWithSong('chordpro')
    const text = wrapper.find('pre.plain').text()
    expect(text).toContain('{title: Test}')
    expect(text).toContain('[C]Hello')
  })

  it('renders the plain-text view with a title header and chords over lyrics', async () => {
    const { wrapper } = await mountWithSong('text')
    const text = wrapper.find('pre.plain').text()
    expect(text).toContain('TEST') // TextFormatter upper-cases the title
    expect(text).toMatch(/C\s+G/)
    expect(text).toContain('Hello world')
  })

  it('renders the chords-over-words view with a metadata header', async () => {
    const { wrapper } = await mountWithSong('chords-over-words')
    const text = wrapper.find('pre.plain').text()
    expect(text).toContain('title: Test')
    expect(text).toContain('artist: Artist')
    expect(text).toMatch(/C\s+G/)
    expect(text).toContain('Hello world')
  })

  it('switches views reactively without remounting', async () => {
    const { store, wrapper } = await mountWithSong('html')
    store.viewFormat = 'chordpro'
    await nextTick()
    expect(wrapper.find('.sheet').exists()).toBe(false)
    expect(wrapper.find('pre.plain').text()).toContain('{title: Test}')
  })

  it('resets the store when "Load another" is clicked', async () => {
    const { store, wrapper } = await mountWithSong('html')
    await wrapper.find('.viewer-header > button').trigger('click')
    expect(store.song).toBeNull()
    expect(store.filename).toBeNull()
  })

  describe('PDF view', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn<() => string>(() => 'blob:pdf-preview'),
        revokeObjectURL: vi.fn<() => void>(),
      })
    })

    it('renders an iframe preview and a download link', async () => {
      const { wrapper } = await mountWithSong('pdf')
      const iframe = wrapper.find('iframe.pdf-frame')
      expect(iframe.exists()).toBe(true)
      expect(iframe.attributes('src')).toBe('blob:pdf-preview')
      const link = wrapper.find('a.download')
      expect(link.attributes('href')).toBe('blob:pdf-preview')
      expect(link.attributes('download')).toBe('song.pdf')
    })
  })
})
