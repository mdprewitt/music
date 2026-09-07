import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SheetViewer from '../SheetViewer.vue'
import { useSheetStore } from '@/stores/sheet'

const SAMPLE_CHORDPRO = '{title: Test}\n{artist: Artist}\n\n[C]Hello [G]world'

describe('SheetViewer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders HTML output containing chord classes', async () => {
    const store = useSheetStore()
    await store.loadFile(new File([SAMPLE_CHORDPRO], 'song.cho', { type: 'text/plain' }))
    const wrapper = mount(SheetViewer)
    await flushPromises()
    expect(wrapper.find('.sheet').exists()).toBe(true)
    expect(wrapper.html()).toContain('chord')
  })

  it('resets the store when "Load another" is clicked', async () => {
    const store = useSheetStore()
    await store.loadFile(new File([SAMPLE_CHORDPRO], 'song.cho', { type: 'text/plain' }))
    const wrapper = mount(SheetViewer)
    await wrapper.find('button').trigger('click')
    expect(store.song).toBeNull()
    expect(store.filename).toBeNull()
  })
})
