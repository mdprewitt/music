import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiagramPositionSelector from '../DiagramPositionSelector.vue'

describe('DiagramPositionSelector', () => {
  it('renders one radio per position', () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'top' } })
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual(['Top', 'Right', 'Bottom'])
  })

  it('checks exactly the active position', () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'right' } })
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((i) => (i.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe('right')
  })

  it('emits update:modelValue with the selected position', async () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'top' } })
    await wrapper.findAll('input[type="radio"]')[2]?.setValue()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['bottom'])
  })
})
