import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CustomColorEditor from '../CustomColorEditor.vue'
import { useThemeStore } from '@/stores/theme'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

describe('CustomColorEditor', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders one colour input plus a contrast ratio per non-background slot', () => {
    const wrapper = mount(CustomColorEditor)
    expect(wrapper.findAll('input[type="color"]')).toHaveLength(5)
    // 4 ratios: lyrics, chord, comment, meta — not background against itself.
    expect(wrapper.findAll('.ratio')).toHaveLength(4)
  })

  it('shows a passing ratio with no warning for the Light preset colours (WCAG 1.4.3)', () => {
    const wrapper = mount(CustomColorEditor)
    const ratios = wrapper.findAll('.ratio')
    expect(ratios.every((r) => !r.classes().includes('low'))).toBe(true)
    expect(wrapper.text()).not.toContain('⚠')
  })

  it('flags a low-contrast pairing with a non-colour cue, not colour alone (1.4.1)', () => {
    const theme = useThemeStore()
    // Pale yellow lyrics on a near-white background: unreadable, ~1.05:1.
    theme.customColors.lyrics = '#fffee0'
    theme.customColors.background = '#ffffff'
    const wrapper = mount(CustomColorEditor)
    const lyricsRatio = wrapper.findAll('.slot')[1]!.find('.ratio')
    expect(lyricsRatio.classes()).toContain('low')
    // The glyph is aria-hidden — an sr-only span carries the equivalent text.
    expect(lyricsRatio.text()).toContain('⚠')
    expect(lyricsRatio.find('.sr-only').text()).toMatch(/low contrast/)
  })
})
