import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiagramPositionSelector from '../DiagramPositionSelector.vue'

describe('DiagramPositionSelector', () => {
  it('renders one button per position', () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'top' } })
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Top', 'Right', 'Bottom'])
  })

  it('marks the active position', () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'right' } })
    const active = wrapper.findAll('button').filter((b) => b.classes('active'))
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('Right')
    expect(active[0]?.attributes('aria-checked')).toBe('true')
  })

  it('emits update:modelValue with the selected position', async () => {
    const wrapper = mount(DiagramPositionSelector, { props: { modelValue: 'top' } })
    await wrapper.findAll('button')[2]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['bottom'])
  })
})
