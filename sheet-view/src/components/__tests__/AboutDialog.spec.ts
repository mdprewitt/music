import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AboutDialog from '../AboutDialog.vue'

// jsdom (29.x) has no HTMLDialogElement.showModal/close, so the component falls
// back to toggling the `open` attribute — which is what these assertions read.
function vmOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm as unknown as { isOpen: boolean }
}

describe('AboutDialog', () => {
  it('renders a labelled dialog, closed, on mount', () => {
    const wrapper = mount(AboutDialog)
    const dialog = wrapper.find('dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-labelledby')).toBe('about-title')
    expect(wrapper.find('#about-title').text()).toBe('About Sheet-View')
    expect(dialog.attributes('open')).toBeUndefined()
  })

  it('opens and closes via the exposed isOpen ref', async () => {
    const wrapper = mount(AboutDialog)
    vmOf(wrapper).isOpen = true
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()

    vmOf(wrapper).isOpen = false
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('closes on Escape, a backdrop click, and the close button', async () => {
    const wrapper = mount(AboutDialog)

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

  it('lists only Chord Pro under file support', () => {
    const wrapper = mount(AboutDialog)
    const list = wrapper.findAll('ul')[0]
    expect(list?.text()).toContain('Chord Pro')
    expect(wrapper.text()).not.toMatch(/Ultimate Guitar|Chords over words/)
  })
})
