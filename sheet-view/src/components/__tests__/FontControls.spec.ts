import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FontControls from '../FontControls.vue'
import { useSheetStore } from '@/stores/sheet'
import { useAnnouncerStore } from '@/stores/announcer'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

function buttonNamed(wrapper: ReturnType<typeof mount>, name: string) {
  const found = wrapper.findAll('button').find((b) => b.text().includes(name))
  if (!found) throw new Error(`no button ${name}`)
  return found
}

describe('FontControls', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('steps the size up and down and shows the percentage', async () => {
    const store = useSheetStore()
    const wrapper = mount(FontControls)
    expect(wrapper.find('output').text()).toBe('100%')
    await buttonNamed(wrapper, 'Larger text').trigger('click')
    expect(store.fontScale).toBe(1.125)
    expect(wrapper.find('output').text()).toBe('113%')
    await buttonNamed(wrapper, 'Smaller text').trigger('click')
    await buttonNamed(wrapper, 'Smaller text').trigger('click')
    expect(store.fontScale).toBe(0.875)
  })

  it('disables the buttons at the ends of the range', async () => {
    const store = useSheetStore()
    store.fontScale = 0.75
    const wrapper = mount(FontControls)
    expect(buttonNamed(wrapper, 'Smaller text').attributes('disabled')).toBeDefined()
    store.fontScale = 2.5
    await flushPromises()
    expect(buttonNamed(wrapper, 'Larger text').attributes('disabled')).toBeDefined()
  })

  it('resets to 100%', async () => {
    const store = useSheetStore()
    store.fontScale = 1.5
    const wrapper = mount(FontControls)
    await buttonNamed(wrapper, 'Reset').trigger('click')
    expect(store.fontScale).toBe(1)
  })

  it('selects a font from the radio group', async () => {
    const store = useSheetStore()
    const wrapper = mount(FontControls)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3)
    await wrapper.findAll('input[type="radio"]')[2]?.setValue()
    expect(store.sheetFont).toBe('serif')
  })

  it('announces the new size', async () => {
    const announcer = useAnnouncerStore()
    const wrapper = mount(FontControls)
    await buttonNamed(wrapper, 'Larger text').trigger('click')
    await flushPromises()
    expect(announcer.message).toBe('Text size 113%')
  })
})
