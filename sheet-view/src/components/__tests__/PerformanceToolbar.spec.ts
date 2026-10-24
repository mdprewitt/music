import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import PerformanceToolbar from '../PerformanceToolbar.vue'
import { useSheetStore } from '@/stores/sheet'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const KEYED = '{title: Keyed}\n{key: C}\n\n[C]Hello [G]world'

async function mountKeyed(text = KEYED) {
  const store = useSheetStore()
  await store.loadFile(new File([text], 'song.cho', { type: 'text/plain' }))
  const wrapper = mount(PerformanceToolbar, { attachTo: document.body })
  await flushPromises()
  return { store, wrapper }
}

const byLabel = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))

describe('PerformanceToolbar', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('steps the key through the transpose targets and offers a way back', async () => {
    const { store, wrapper } = await mountKeyed()
    expect(wrapper.find('output[aria-label="Current key"]').text()).toBe('C')
    await byLabel(wrapper, 'Key up')?.trigger('click')
    const up = store.targetKey
    expect(up).not.toBeNull()
    expect(up).not.toBe('C')
    expect(wrapper.find('output[aria-label="Current key"]').text()).toBe(up)
    await wrapper.find('button[aria-label="Back to C"]').trigger('click')
    expect(store.targetKey).toBeNull()
  })

  it('disables the key stepper on a sheet without a {key}', async () => {
    const { wrapper } = await mountKeyed('{title: Plain}\n\n[C]Hello')
    expect(wrapper.find('output[aria-label="Current key"]').text()).toBe('No key')
    expect(byLabel(wrapper, 'Key up')?.attributes('disabled')).toBeDefined()
    expect(byLabel(wrapper, 'Key down')?.attributes('disabled')).toBeDefined()
  })

  it('changes the text size and stops at the ends', async () => {
    const { store, wrapper } = await mountKeyed()
    const before = store.fontScale
    await byLabel(wrapper, 'Larger text')?.trigger('click')
    expect(store.fontScale).toBeGreaterThan(before)
    store.fontScale = 0.75
    await nextTick()
    expect(byLabel(wrapper, 'Smaller text')?.attributes('disabled')).toBeDefined()
  })

  it('puts Scroll down at the far left and Scroll up at the far right', async () => {
    const { wrapper } = await mountKeyed()
    const buttons = wrapper.findAll('button')
    expect(buttons[0]?.text()).toContain('Scroll down')
    expect(buttons[buttons.length - 1]?.text()).toContain('Scroll up')

    await buttons[0]?.trigger('click')
    await buttons[buttons.length - 1]?.trigger('click')
    expect(wrapper.emitted('turn')).toEqual([[1], [-1]])
  })

  it('emits open-settings from the Settings button', async () => {
    const { wrapper } = await mountKeyed()
    await byLabel(wrapper, 'Settings')?.trigger('click')
    expect(wrapper.emitted('open-settings')).toHaveLength(1)
  })

  it('hides the scroll and text-size controls in the PDF view', async () => {
    const { store, wrapper } = await mountKeyed()
    store.viewFormat = 'pdf'
    await nextTick()
    expect(wrapper.find('[aria-label="Text size"]').exists()).toBe(false)
    expect(byLabel(wrapper, 'Scroll down')).toBeUndefined()
    expect(byLabel(wrapper, 'Scroll up')).toBeUndefined()
  })
})
