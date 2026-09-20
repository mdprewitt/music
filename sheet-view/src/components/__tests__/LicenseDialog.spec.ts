import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LicenseDialog from '../LicenseDialog.vue'

// jsdom (29.x) has no HTMLDialogElement.showModal/close, so the component falls
// back to toggling the `open` attribute — which is what these assertions read.
function vmOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm as unknown as { isOpen: boolean }
}

describe('LicenseDialog', () => {
  it('renders a labelled dialog, closed, on mount', () => {
    const wrapper = mount(LicenseDialog)
    const dialog = wrapper.find('dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-labelledby')).toBe('license-title')
    expect(wrapper.find('#license-title').text()).toBe('License')
    expect(dialog.attributes('open')).toBeUndefined()
  })

  it('opens and closes via the exposed isOpen ref', async () => {
    const wrapper = mount(LicenseDialog)
    vmOf(wrapper).isOpen = true
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()

    vmOf(wrapper).isOpen = false
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('closes on Escape, a backdrop click, and the close button', async () => {
    const wrapper = mount(LicenseDialog)

    for (const close of [
      () => wrapper.find('dialog').trigger('keydown', { key: 'Escape' }),
      () => wrapper.find('dialog').trigger('click'), // click.self — target is the dialog
      () => wrapper.find('.close-btn').trigger('click'),
    ]) {
      vmOf(wrapper).isOpen = true
      await flushPromises()
      await close()
      expect(vmOf(wrapper).isOpen).toBe(false)
    }
  })

  it('marks the external license link safe to open and announces it opens a new window (3.2.5)', () => {
    const wrapper = mount(LicenseDialog)
    const link = wrapper.find('a[href="https://www.gnu.org/licenses/agpl-3.0.html"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.text()).toContain('opens in a new window')
  })
})
