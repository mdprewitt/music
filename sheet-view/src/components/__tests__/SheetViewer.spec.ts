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
    // the instrument/view selectors live in a nested div, so the header's only
    // direct-child button is still the reset button
    await wrapper.find('.viewer-header > button').trigger('click')
    expect(store.song).toBeNull()
    expect(store.filename).toBeNull()
  })

  it('shows the chord-diagram strip above the HTML view', async () => {
    const { wrapper } = await mountWithSong('html')
    const diagrams = wrapper.find('.chord-diagrams')
    expect(diagrams.exists()).toBe(true)
    expect(diagrams.findAll('svg.chord-diagram').length).toBeGreaterThan(0)
  })

  it('hides the chord-diagram strip when showDiagrams is off', async () => {
    const { store, wrapper } = await mountWithSong('html')
    store.showDiagrams = false
    await nextTick()
    expect(wrapper.find('.chord-diagrams').exists()).toBe(false)
  })

  describe('chord-diagram position', () => {
    it('defaults the sheet body to the top position', async () => {
      const { wrapper } = await mountWithSong('html')
      expect(wrapper.find('.sheet-body').classes()).toContain('pos-top')
    })

    it('moves the strip when the store position changes', async () => {
      const { store, wrapper } = await mountWithSong('html')
      store.diagramPosition = 'right'
      await nextTick()
      expect(wrapper.find('.sheet-body').classes()).toContain('pos-right')
      expect(wrapper.find('.chord-diagrams').classes()).toContain('pos-right')
      store.diagramPosition = 'bottom'
      await nextTick()
      expect(wrapper.find('.sheet-body').classes()).toContain('pos-bottom')
    })

    it('keeps the strip in the plain-text views', async () => {
      const { wrapper } = await mountWithSong('chordpro')
      expect(wrapper.find('.sheet-body .chord-diagrams').exists()).toBe(true)
      expect(wrapper.find('pre.plain').exists()).toBe(true)
    })

    it('shows the position selector only with diagrams on and outside the PDF view', async () => {
      const { store, wrapper } = await mountWithSong('html')
      expect(wrapper.find('.position-selector').exists()).toBe(true)
      store.showDiagrams = false
      await nextTick()
      expect(wrapper.find('.position-selector').exists()).toBe(false)
      store.showDiagrams = true
      store.viewFormat = 'pdf'
      await nextTick()
      expect(wrapper.find('.position-selector').exists()).toBe(false)
    })
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
