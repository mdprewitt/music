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
  it('renders one radio per theme, custom last', () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'light', customColors } })
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual([
      'Light',
      'Dark',
      'Sepia',
      'Stage',
      'Custom',
    ])
    // each option still carries its colour swatch
    expect(wrapper.findAll('label .swatch')).toHaveLength(5)
  })

  it('checks exactly the active theme', () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'sepia', customColors } })
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((i) => (i.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe('sepia')
  })

  it('emits update:modelValue with the chosen theme id', async () => {
    const wrapper = mount(ThemeSelector, { props: { modelValue: 'light', customColors } })
    await wrapper.findAll('input[type="radio"]')[4]?.setValue()
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

  it('writes a picked colour back to the store on change (not on every input)', async () => {
    const store = useThemeStore()
    const wrapper = mount(CustomColorEditor)
    const chordInput = wrapper.get('input[aria-label="Chords"]')
    ;(chordInput.element as HTMLInputElement).value = '#abcdef'
    await chordInput.trigger('input')
    expect(store.customColors.chord).not.toBe('#abcdef') // input alone does nothing
    await chordInput.trigger('change')
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
