import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ViewSelector from '../ViewSelector.vue'

describe('ViewSelector', () => {
  it('renders one button per view format', () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'html' } })
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).toEqual(['ChordPro', 'HTML', 'HTML inline', 'PDF'])
  })

  it('marks the active view', () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'chordpro' } })
    const active = wrapper.findAll('button').filter((b) => b.classes('active'))
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('ChordPro')
    expect(active[0]?.attributes('aria-checked')).toBe('true')
  })

  it('emits update:modelValue with the selected format', async () => {
    const wrapper = mount(ViewSelector, { props: { modelValue: 'html' } })
    await wrapper.findAll('button')[3]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['pdf'])
  })
})
