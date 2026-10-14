import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readStored, writeStored } from '@/stores/storage'
import { isThemeColors, isThemeId, type ThemeColors, type ThemeId } from '@/theme/types'
import { DEFAULT_PRESET_ID, THEME_PRESETS } from '@/theme/presets'

const THEME_STORAGE_KEY = 'sheet-view:theme'
const CUSTOM_COLORS_STORAGE_KEY = 'sheet-view:customColors'

const asThemeId = (raw: string): ThemeId | null => (isThemeId(raw) ? raw : null)

const asThemeColors = (raw: string): ThemeColors | null => {
  try {
    const parsed: unknown = JSON.parse(raw)
    return isThemeColors(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * The OS colour-scheme preference, honoured only when nothing is stored yet.
 * `matchMedia` is absent in jsdom and some non-browser contexts — guard it.
 */
function osDefaultTheme(): ThemeId {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch {
    // matchMedia unavailable — fall through to the light default
  }
  return DEFAULT_PRESET_ID
}

export const useThemeStore = defineStore('theme', () => {
  const themeId = ref<ThemeId>(readStored(THEME_STORAGE_KEY, asThemeId) ?? osDefaultTheme())
  const customColors = ref<ThemeColors>(
    readStored(CUSTOM_COLORS_STORAGE_KEY, asThemeColors) ?? {
      ...THEME_PRESETS[DEFAULT_PRESET_ID].colors,
    },
  )
  // Whether the custom palette was ever explicitly stored. Until it is, the
  // first switch to `custom` seeds it from whatever theme is on screen.
  let customPinned = readStored(CUSTOM_COLORS_STORAGE_KEY, asThemeColors) !== null

  /** The colours currently in effect — a preset's, or the custom palette. */
  const colors = computed<ThemeColors>(() =>
    themeId.value === 'custom'
      ? customColors.value
      : THEME_PRESETS[themeId.value].colors,
  )

  watch(themeId, (value) => writeStored(THEME_STORAGE_KEY, value), { flush: 'sync' })
  watch(
    customColors,
    (value) => {
      customPinned = true
      writeStored(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true, flush: 'sync' },
  )

  function selectTheme(id: ThemeId): void {
    if (id === 'custom' && !customPinned) {
      // Start the pickers from what the viewer is already looking at.
      customColors.value = { ...colors.value }
    }
    themeId.value = id
  }

  function resetCustom(): void {
    customColors.value = { ...THEME_PRESETS[DEFAULT_PRESET_ID].colors }
  }

  return { themeId, customColors, colors, selectTheme, resetCustom }
})
