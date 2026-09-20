import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeySelector from '../KeySelector.vue'

const KEYS = ['C', 'D', 'E', 'F', 'G'] as const

describe('KeySelector', () => {
  it('renders one option per key and marks the original', () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: KEYS, originalKey: 'C' },
    })
    const options = wrapper.findAll('option').map((o) => o.text())
    expect(options).toEqual(['C (original)', 'D', 'E', 'F', 'G'])
  })

  it('selects the original key when no target is set', () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: KEYS, originalKey: 'C' },
    })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('C')
    expect(wrapper.find('.key-reset').exists()).toBe(false)
  })

  it('shows a disabled control with a hint when the sheet has no key', () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: [], originalKey: null },
    })
    const select = wrapper.find('select')
    expect(select.attributes('disabled')).toBeDefined()
    expect(select.attributes('title')).toMatch(/\{key: C\}/)
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['—'])
  })

  it('explains a disabled control with visible text, not just a title tooltip (3.3.2)', () => {
    // A disabled element's own title is unreachable by keyboard, touch and
    // most screen readers — title stays only as a mouse-hover convenience.
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: [], originalKey: null },
    })
    const select = wrapper.find('select')
    const hintId = select.attributes('aria-describedby')
    expect(hintId).toBeTruthy()
    expect(wrapper.find(`#${hintId}`).text()).toMatch(/\{key: C\}/)
  })

  it('carries no hint or aria-describedby once the sheet has a key', () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: KEYS, originalKey: 'C' },
    })
    expect(wrapper.find('select').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.find('.key-hint').exists()).toBe(false)
  })

  it('associates the visible "Key" label with the select via <label for>', () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: KEYS, originalKey: 'C' },
    })
    const label = wrapper.find('label')
    expect(label.text()).toBe('Key')
    expect(label.attributes('for')).toBe(wrapper.find('select').attributes('id'))
  })

  it('emits the chosen key on change', async () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: null, keys: KEYS, originalKey: 'C' },
    })
    await wrapper.find('select').setValue('E')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['E'])
  })

  it('emits null when the original key is re-selected', async () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: 'E', keys: KEYS, originalKey: 'C' },
    })
    await wrapper.find('select').setValue('C')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  it('shows a reset button only when transposed, and it clears the key', async () => {
    const wrapper = mount(KeySelector, {
      props: { modelValue: 'E', keys: KEYS, originalKey: 'C' },
    })
    const reset = wrapper.find('.key-reset')
    expect(reset.exists()).toBe(true)
    // Its only visible content is the "↺" glyph — an accessible name is
    // needed separately (4.1.2).
    expect(reset.attributes('aria-label')).toBe('Back to C')
    await reset.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
  })
})
