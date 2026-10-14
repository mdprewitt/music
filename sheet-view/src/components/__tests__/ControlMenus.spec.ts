import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import ControlMenus from '../ControlMenus.vue'
import CustomColorEditor from '../CustomColorEditor.vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

async function mountMenus(text = '{title: T}\n{key: C}\n\n[C]Hello') {
  const store = useSheetStore()
  await store.loadFile(new File([text], 'song.cho', { type: 'text/plain' }))
  const wrapper = mount(ControlMenus, { attachTo: document.body })
  await flushPromises()
  return { store, wrapper }
}

async function open(wrapper: ReturnType<typeof mount>, index: number) {
  await wrapper.findAll('.menu-trigger')[index]!.trigger('click')
  await nextTick()
}

describe('ControlMenus', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('summarises current state on the triggers', async () => {
    const { store, wrapper } = await mountMenus()
    const labels = () =>
      wrapper.findAll('.menu-trigger').map((t) => t.text().replace('▾', '').trim())
    expect(labels()).toEqual(['Song: C', 'View: HTML', 'Settings'])
    store.viewFormat = 'pdf'
    store.targetKey = 'G'
    await nextTick()
    expect(labels()).toEqual(['Song: G', 'View: PDF', 'Settings'])
    wrapper.unmount()
  })

  it('shows "no key" for a sheet without {key}', async () => {
    const { wrapper } = await mountMenus('{title: T}\n\n[C]Hello')
    expect(wrapper.findAll('.menu-trigger')[0]!.text()).toContain('Song: no key')
    wrapper.unmount()
  })

  it('puts key and instrument under Song', async () => {
    const { wrapper } = await mountMenus()
    await open(wrapper, 0)
    expect(wrapper.find('.menu-panel .key-selector').exists()).toBe(true)
    expect(wrapper.find('.menu-panel .instrument-selector').exists()).toBe(true)
    wrapper.unmount()
  })

  it('puts format, diagrams and text under View, using h2 headings (1.3.1)', async () => {
    const { store, wrapper } = await mountMenus()
    await open(wrapper, 1)
    const headings = wrapper.findAll('.menu-heading')
    expect(headings.map((h) => h.element.tagName)).toEqual(['H2', 'H2', 'H2'])
    expect(headings.map((h) => h.text())).toEqual(['Format', 'Diagrams', 'Text'])
    await wrapper.find('.view-selector input[value="chordpro"]').setValue(true)
    expect(store.viewFormat).toBe('chordpro')
    expect(wrapper.find('.position-selector').exists()).toBe(true)
    wrapper.unmount()
  })

  it('explains why diagram placement and text are unavailable in the PDF view', async () => {
    const { store, wrapper } = await mountMenus()
    store.viewFormat = 'pdf'
    await open(wrapper, 1)
    expect(wrapper.find('.position-selector').exists()).toBe(false)
    expect(wrapper.find('.font-controls').exists()).toBe(false)
    expect(wrapper.findAll('.menu-note').length).toBe(2)
    wrapper.unmount()
  })

  it('selects a page turner preset and shows the custom editor only for the custom theme', async () => {
    const { store, wrapper } = await mountMenus()
    await open(wrapper, 2)
    const radios = wrapper.findAll('input[name="page-turner"]')
    expect(radios).toHaveLength(5)
    await radios[3]?.setValue()
    expect(store.pageTurner).toBe('page-keys')
    expect(wrapper.text()).toContain('Page Down = next page')

    expect(wrapper.findComponent(CustomColorEditor).exists()).toBe(false)
    useThemeStore().selectTheme('custom')
    await nextTick()
    expect(wrapper.findComponent(CustomColorEditor).exists()).toBe(true)
    wrapper.unmount()
  })
})
