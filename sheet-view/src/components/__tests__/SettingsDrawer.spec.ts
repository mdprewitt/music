import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SettingsDrawer from '../SettingsDrawer.vue'
import { useSheetStore } from '@/stores/sheet'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

describe('SettingsDrawer', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens as a labelled dialog holding every set-once section', async () => {
    const wrapper = mount(SettingsDrawer)
    await flushPromises()
    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('open')).toBeDefined()
    expect(dialog.attributes('aria-labelledby')).toBe(wrapper.find('h2').attributes('id'))
    const headings = wrapper.findAll('.drawer-heading').map((h) => h.text())
    expect(headings).toEqual(['Layout', 'View', 'Diagrams', 'Text', 'Page turner', 'Theme'])
  })

  it('toggles performance mode, which adds the Instrument section', async () => {
    const store = useSheetStore()
    const wrapper = mount(SettingsDrawer)
    await flushPromises()
    expect(wrapper.find('.instrument-selector').exists()).toBe(false)
    await wrapper.find('.drawer-check input').setValue(true)
    expect(store.performanceMode).toBe(true)
    expect(wrapper.find('.instrument-selector').exists()).toBe(true)
    expect(wrapper.findAll('.drawer-heading').map((h) => h.text())).toContain('Instrument')
  })

  it('switches the view format from the drawer', async () => {
    const store = useSheetStore()
    const wrapper = mount(SettingsDrawer)
    await flushPromises()
    await wrapper.find('.view-selector input[value="chordpro"]').setValue(true)
    expect(store.viewFormat).toBe('chordpro')
  })

  it('emits close from the Close button, Escape and a backdrop click', async () => {
    const wrapper = mount(SettingsDrawer)
    await flushPromises()
    await wrapper.find('.drawer-close').trigger('click')
    await wrapper.find('dialog').trigger('keydown', { key: 'Escape' })
    await wrapper.find('dialog').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('shows notes instead of controls in the PDF view', async () => {
    const store = useSheetStore()
    store.viewFormat = 'pdf'
    const wrapper = mount(SettingsDrawer)
    await flushPromises()
    expect(wrapper.find('.position-selector').exists()).toBe(false)
    expect(wrapper.find('.font-controls').exists()).toBe(false)
    expect(wrapper.findAll('.drawer-note').length).toBeGreaterThanOrEqual(3)
  })
})
