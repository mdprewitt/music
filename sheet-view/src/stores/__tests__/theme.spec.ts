import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '../theme'
import { THEME_PRESETS } from '@/theme/presets'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const THEME_KEY = 'sheet-view:theme'
const CUSTOM_KEY = 'sheet-view:customColors'

describe('useThemeStore', () => {
  beforeEach(() => {
    installMemoryStorage()
    // jsdom has no matchMedia; the store must fall back to the light default.
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to light with empty storage and no matchMedia', () => {
    expect(useThemeStore().themeId).toBe('light')
  })

  it('honours the OS preference on first run when matchMedia says dark', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    setActivePinia(createPinia())
    expect(useThemeStore().themeId).toBe('dark')
  })

  it('exposes the active preset colours through `colors`', () => {
    const store = useThemeStore()
    store.selectTheme('sepia')
    expect(store.colors).toEqual(THEME_PRESETS.sepia.colors)
  })

  it('persists the theme id and restores it in a fresh store', () => {
    useThemeStore().selectTheme('stage')
    expect(localStorage.getItem(THEME_KEY)).toBe('stage')
    setActivePinia(createPinia())
    expect(useThemeStore().themeId).toBe('stage')
  })

  it('falls back to the default on a corrupt stored theme id', () => {
    localStorage.setItem(THEME_KEY, 'solarized')
    expect(useThemeStore().themeId).toBe('light')
  })

  it('seeds custom colours from the active theme on first switch to custom', () => {
    const store = useThemeStore()
    store.selectTheme('dark')
    store.selectTheme('custom')
    expect(store.customColors).toEqual(THEME_PRESETS.dark.colors)
    expect(store.colors).toEqual(THEME_PRESETS.dark.colors)
  })

  it('persists custom colours and restores both id and palette', () => {
    const store = useThemeStore()
    store.selectTheme('custom')
    store.customColors.chord = '#123456'
    expect(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '{}').chord).toBe('#123456')

    setActivePinia(createPinia())
    const fresh = useThemeStore()
    expect(fresh.themeId).toBe('custom')
    expect(fresh.customColors.chord).toBe('#123456')
  })

  it('does not re-seed custom colours once they have been stored', () => {
    const first = useThemeStore()
    first.selectTheme('custom')
    first.customColors.background = '#0a0a0a'

    setActivePinia(createPinia())
    const second = useThemeStore()
    second.selectTheme('light')
    second.selectTheme('custom')
    expect(second.customColors.background).toBe('#0a0a0a')
  })

  it('resetCustom restores the Light palette', () => {
    const store = useThemeStore()
    store.selectTheme('custom')
    store.customColors.lyrics = '#abcdef'
    store.resetCustom()
    expect(store.customColors).toEqual(THEME_PRESETS.light.colors)
  })
})
