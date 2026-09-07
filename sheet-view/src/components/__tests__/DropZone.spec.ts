import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DropZone from '../DropZone.vue'
import { useSheetStore } from '@/stores/sheet'

const SAMPLE_CHORDPRO = '{title: T}\n[C]hello'

describe('DropZone', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads a valid ChordPro file via input change', async () => {
    const wrapper = mount(DropZone)
    const store = useSheetStore()
    const input = wrapper.find('input[type=file]')
    const file = new File([SAMPLE_CHORDPRO], 'a.cho', { type: 'text/plain' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
    expect(store.filename).toBe('a.cho')
    expect(store.song).not.toBeNull()
  })

  it('shows an error for unsupported file types', async () => {
    const wrapper = mount(DropZone)
    const store = useSheetStore()
    const input = wrapper.find('input[type=file]')
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
    expect(wrapper.find('.error').exists()).toBe(true)
    expect(store.song).toBeNull()
  })

  it('fetches and loads a chart from a pasted URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(SAMPLE_CHORDPRO, { status: 200 })),
    )
    const wrapper = mount(DropZone)
    const store = useSheetStore()
    await wrapper.find('.url-form input').setValue('https://example.com/song.chopro')
    await wrapper.find('.url-form').trigger('submit')
    await flushPromises()
    expect(store.filename).toBe('song.chopro')
    expect(store.song).not.toBeNull()
  })

  it('shows an error when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const wrapper = mount(DropZone)
    const store = useSheetStore()
    await wrapper.find('.url-form input').setValue('https://example.com/song.chopro')
    await wrapper.find('.url-form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.error').text()).toMatch(/CORS/)
    expect(store.song).toBeNull()
  })
})
