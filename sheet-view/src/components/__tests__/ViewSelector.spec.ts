import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ViewSelector from '../ViewSelector.vue'

describe('ViewSelector', () => {
  it('renders one radio per view format', () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'html' } })
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual([
      'ChordPro',
      'HTML',
      'HTML inline',
      'PDF',
    ])
  })

  it('checks exactly the active view', () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'chordpro' } })
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((i) => (i.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe('chordpro')
  })

  it('emits update:modelValue with the selected format', async () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'html' } })
    await wrapper.findAll('input[type="radio"]')[3]?.setValue()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['pdf'])
  })
})
