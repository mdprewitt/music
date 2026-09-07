import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ThemeSelector from '../ThemeSelector.vue'
import CustomColorEditor from '../CustomColorEditor.vue'
import { useThemeStore } from '@/stores/theme'
import { THEME_PRESETS } from '@/theme/presets'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const customColors = { ...THEME_PRESETS.light.colors }

describe('ThemeSelector', () => {
  it('renders one button per theme, custom last', () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'light', customColors } })
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual([
      'Light',
      'Dark',
      'Sepia',
      'Stage',
      'Custom',
    ])
  })

  it('marks exactly the active theme', () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'sepia', customColors } })
    const active = wrapper.findAll('button').filter((b) => b.classes('active'))
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('Sepia')
    expect(active[0]?.attributes('aria-checked')).toBe('true')
  })

  it('emits update:modelValue with the clicked theme id', async () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'light', customColors } })
    await wrapper.findAll('button')[4]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['custom'])
  })
})

describe('CustomColorEditor', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders five colour inputs bound to the store palette', () => {
    const wrapper = mount(CustomColorEditor)
    const inputs = wrapper.findAll('input[type="color"]')
    expect(inputs).toHaveLength(5)
  })

  it('writes a picked colour back to the store', async () => {
    const store = useThemeStore()
    const wrapper = mount(CustomColorEditor)
    const chordInput = wrapper.get('input[aria-label="Chords"]')
    await chordInput.setValue('#abcdef')
    expect(store.customColors.chord).toBe('#abcdef')
  })

  it('resets the palette to Light', async () => {
    const store = useThemeStore()
    store.customColors.lyrics = '#010203'
    const wrapper = mount(CustomColorEditor)
    await wrapper.get('button').trigger('click')
    expect(store.customColors).toEqual(THEME_PRESETS.light.colors)
  })
})
