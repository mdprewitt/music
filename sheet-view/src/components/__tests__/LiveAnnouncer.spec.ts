import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LiveAnnouncer from '../LiveAnnouncer.vue'
import { useAnnouncerStore } from '@/stores/announcer'

describe('LiveAnnouncer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a visually-hidden polite status region reflecting the store', async () => {
    const wrapper = mount(LiveAnnouncer)
    const region = wrapper.find('[role="status"]')
    expect(region.attributes('aria-live')).toBe('polite')
    expect(region.classes()).toContain('sr-only')
    expect(region.text()).toBe('')

    await useAnnouncerStore().announce('Key: D')
    expect(wrapper.find('[role="status"]').text()).toBe('Key: D')
  })
})
