import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import DisplayPanel from '../DisplayPanel.vue'
import { PANEL_GUTTER, panelShift } from '../displayPanel'
import CustomColorEditor from '../CustomColorEditor.vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

describe('DisplayPanel', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is collapsed by default and toggles from the trigger', async () => {
    const wrapper = mount(DisplayPanel, { attachTo: document.body })
    const trigger = wrapper.find('.panel-trigger')
    expect(wrapper.find('.panel').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(wrapper.find('.panel').exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await trigger.trigger('click')
    expect(wrapper.find('.panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reflects a persisted open state on mount', () => {
    useSheetStore().displayPanelOpen = true
    const wrapper = mount(DisplayPanel)
    expect(wrapper.find('.panel').exists()).toBe(true)
  })

  it('closes on Escape', async () => {
    const store = useSheetStore()
    store.displayPanelOpen = true
    const wrapper = mount(DisplayPanel)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(store.displayPanelOpen).toBe(false)
    expect(wrapper.find('.panel').exists()).toBe(false)
  })

  it('closes on an outside pointerdown but not one inside the panel', async () => {
    const store = useSheetStore()
    store.displayPanelOpen = true
    const wrapper = mount(DisplayPanel, { attachTo: document.body })

    wrapper.find('.panel input[type="radio"]').element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    )
    await nextTick()
    expect(store.displayPanelOpen).toBe(true)

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(store.displayPanelOpen).toBe(false)
    wrapper.unmount()
  })

  it('shows the custom colour editor only for the custom theme', async () => {
    const theme = useThemeStore()
    useSheetStore().displayPanelOpen = true
    const wrapper = mount(DisplayPanel)
    expect(wrapper.findComponent(CustomColorEditor).exists()).toBe(false)

    theme.selectTheme('custom')
    await nextTick()
    expect(wrapper.findComponent(CustomColorEditor).exists()).toBe(true)
  })

  it('explains why diagram placement is unavailable in the PDF view', async () => {
    const store = useSheetStore()
    store.displayPanelOpen = true
    store.viewFormat = 'pdf'
    const wrapper = mount(DisplayPanel)
    expect(wrapper.find('.position-selector').exists()).toBe(false)
    expect(wrapper.find('.panel-note').text()).toMatch(/PDF/)
  })

  it('carries an inline right offset so it can be clamped to the viewport', () => {
    useSheetStore().displayPanelOpen = true
    const wrapper = mount(DisplayPanel)
    expect(wrapper.find('.panel').attributes('style')).toContain('right:')
  })

  describe('panelShift', () => {
    it('does not move a panel that already fits under its trigger', () => {
      // trigger right edge at 900, 240px panel, 1000px viewport → left edge 660, fits.
      expect(panelShift(900, 240, 1000)).toBe(0)
    })

    it('nudges a panel right until its left edge clears the gutter', () => {
      // trigger right edge at 120, 240px panel → anchored left edge is -120.
      const shift = panelShift(120, 240, 390)
      expect(shift).toBe(PANEL_GUTTER - (120 - 240))
      expect(120 - 240 + shift).toBe(PANEL_GUTTER)
    })

    it('returns 0 when the panel cannot be measured', () => {
      expect(panelShift(120, 0, 390)).toBe(0)
    })
  })
})
