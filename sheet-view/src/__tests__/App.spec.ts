import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import SheetViewer from '../components/SheetViewer.vue'
import DropZone from '../components/DropZone.vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { THEME_PRESETS } from '@/theme/presets'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const SAMPLE_CHORDPRO = '{title: Param Song}\n[C]hello'

describe('App — ?view= URL parameter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('auto-loads the chart named by ?view= and rewrites a GitHub link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(input: string) => Promise<Response>>(
        async () => new Response(SAMPLE_CHORDPRO, { status: 200 }),
      ),
    )
    window.history.pushState({}, '', '/?view=https://github.com/u/r/blob/main/song.cho')
    const wrapper = mount(App)
    const store = useSheetStore()
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/u/r/main/song.cho')
    expect(store.song?.title).toBe('Param Song')
    expect(wrapper.findComponent(SheetViewer).exists()).toBe(true)
  })

  it('does nothing when ?view= is absent', async () => {
    const fetchSpy = vi.fn<() => Promise<Response>>()
    vi.stubGlobal('fetch', fetchSpy)
    const wrapper = mount(App)
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(wrapper.findComponent(DropZone).exists()).toBe(true)
  })

  it('surfaces an error when the ?view= chart cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    window.history.pushState({}, '', '/?view=https://example.com/song.cho')
    const wrapper = mount(App)
    const store = useSheetStore()
    await flushPromises()

    expect(store.parseError).toMatch(/CORS/)
    expect(wrapper.find('.error').text()).toMatch(/CORS/)
  })
})

describe('App — theme wiring', () => {
  beforeEach(() => {
    installMemoryStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const prop of ['background', 'lyrics', 'chord', 'comment', 'meta']) {
      document.documentElement.style.removeProperty(`--sv-${prop}`)
    }
  })

  it('writes the active palette to :root and follows a theme change', async () => {
    mount(App)
    const theme = useThemeStore()
    const root = document.documentElement.style

    theme.selectTheme('dark')
    await nextTick()
    expect(root.getPropertyValue('--sv-background')).toBe(THEME_PRESETS.dark.colors.background)
    expect(root.getPropertyValue('--sv-chord')).toBe(THEME_PRESETS.dark.colors.chord)

    theme.selectTheme('stage')
    await nextTick()
    expect(root.getPropertyValue('--sv-background')).toBe(THEME_PRESETS.stage.colors.background)
  })
})
