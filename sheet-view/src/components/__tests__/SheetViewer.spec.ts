import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import SheetViewer from '../SheetViewer.vue'
import { useSheetStore } from '@/stores/sheet'
import type { ViewFormat } from '@/stores/sheet'

const SAMPLE_CHORDPRO = '{title: Test}\n{artist: Artist}\n\n[C]Hello [G]world'
const KEYED_CHORDPRO = '{title: Keyed}\n{artist: Artist}\n{key: C}\n\n[C]Hello [G]world'

async function mountWithSong(view: ViewFormat) {
  const store = useSheetStore()
  await store.loadFile(new File([SAMPLE_CHORDPRO], 'song.cho', { type: 'text/plain' }))
  store.viewFormat = view
  const wrapper = mount(SheetViewer)
  await flushPromises()
  await nextTick()
  return { store, wrapper }
}

// The instrument / diagram-position / theme controls now live in the "Display"
// panel, which is collapsed by default — open it before querying them.
async function openPanel(wrapper: Awaited<ReturnType<typeof mountWithSong>>['wrapper']) {
  await wrapper.find('.panel-trigger').trigger('click')
  await nextTick()
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

  it('renders the HTML inline view with bracketed chords and no table', async () => {
    const { wrapper } = await mountWithSong('html-inline')
    expect(wrapper.find('.inline-sheet').exists()).toBe(true)
    expect(wrapper.find('.sheet').exists()).toBe(false)
    expect(wrapper.findAll('.inline-sheet .chord').map((c) => c.text())).toEqual(['[C]', '[G]'])
    // the chord-diagram strip still rides above the chart
    expect(wrapper.find('.sheet-body .chord-diagrams').exists()).toBe(true)
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

  it('re-renders the HTML view in the chosen key', async () => {
    const store = useSheetStore()
    await store.loadFile(new File([KEYED_CHORDPRO], 'keyed.cho', { type: 'text/plain' }))
    const wrapper = mount(SheetViewer)
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.sheet').text()).toContain('G')
    store.targetKey = 'E'
    await nextTick()
    const text = wrapper.find('.sheet').text()
    expect(text).toContain('E')
    expect(text).toContain('B')
    expect(text).not.toContain('G')
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
      await openPanel(wrapper)
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

  describe('pinned chord diagrams', () => {
    const pinToggle = (wrapper: Awaited<ReturnType<typeof mountWithSong>>['wrapper']) =>
      wrapper.findAll('.diagram-toggle').find((l) => l.text().includes('Pin'))

    it('is off by default and adds the pinned class when toggled on', async () => {
      const { store, wrapper } = await mountWithSong('html')
      expect(wrapper.find('.sheet-body').classes()).not.toContain('pinned')
      store.pinDiagrams = true
      await nextTick()
      expect(wrapper.find('.sheet-body').classes()).toContain('pinned')
      expect(wrapper.find('.chord-diagrams').classes()).toContain('pinned')
    })

    it('toggles store.pinDiagrams from the Pin checkbox', async () => {
      const { store, wrapper } = await mountWithSong('html')
      await openPanel(wrapper)
      await pinToggle(wrapper)?.find('input').setValue(true)
      expect(store.pinDiagrams).toBe(true)
    })

    it('hides the Pin checkbox with diagrams off and in the PDF view', async () => {
      const { store, wrapper } = await mountWithSong('html')
      await openPanel(wrapper)
      expect(pinToggle(wrapper)).toBeTruthy()
      store.showDiagrams = false
      await nextTick()
      expect(pinToggle(wrapper)).toBeUndefined()
      store.showDiagrams = true
      store.viewFormat = 'pdf'
      await nextTick()
      expect(pinToggle(wrapper)).toBeUndefined()
    })
  })

  describe('click a chord to peek its diagram', () => {
    it('opens a popover with a diagram when a chord is clicked in the HTML view', async () => {
      const { wrapper } = await mountWithSong('html')
      await wrapper.find('td.chord').trigger('click')
      await nextTick()
      const popover = wrapper.find('.chord-popover')
      expect(popover.exists()).toBe(true)
      expect(popover.find('svg.chord-diagram').exists()).toBe(true)
    })

    it('toggles the popover shut when the same chord is clicked again', async () => {
      const { wrapper } = await mountWithSong('html')
      const chord = wrapper.find('td.chord')
      await chord.trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover').exists()).toBe(true)
      await chord.trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover').exists()).toBe(false)
    })

    it('opens a popover from a chord in the HTML inline view', async () => {
      const { wrapper } = await mountWithSong('html-inline')
      await wrapper.find('.inline-sheet .chord').trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover svg.chord-diagram').exists()).toBe(true)
    })

    it('closes the popover on Escape', async () => {
      const { wrapper } = await mountWithSong('html')
      await wrapper.find('td.chord').trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover').exists()).toBe(true)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.find('.chord-popover').exists()).toBe(false)
    })

    it('still opens when the chord-diagram strip is turned off', async () => {
      const { store, wrapper } = await mountWithSong('html')
      store.showDiagrams = false
      await nextTick()
      expect(wrapper.find('.chord-diagrams').exists()).toBe(false)
      await wrapper.find('td.chord').trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover svg.chord-diagram').exists()).toBe(true)
    })

    it('shows a "no diagram" note for a chord with no known shape', async () => {
      const store = useSheetStore()
      await store.loadFile(new File(['[Zqz9]nope'], 'x.cho', { type: 'text/plain' }))
      store.viewFormat = 'html-inline'
      const wrapper = mount(SheetViewer)
      await flushPromises()
      await nextTick()
      await wrapper.find('.inline-sheet .chord').trigger('click')
      await nextTick()
      expect(wrapper.find('.chord-popover .no-diagram').exists()).toBe(true)
      expect(wrapper.find('.chord-popover svg.chord-diagram').exists()).toBe(false)
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
