import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InstrumentSelector from '../InstrumentSelector.vue'
import { INSTRUMENT_IDS, INSTRUMENTS } from '@/chords/types'

describe('InstrumentSelector', () => {
  it('renders one button per instrument', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(
      INSTRUMENT_IDS.map((id) => INSTRUMENTS[id].label),
    )
  })

  it('marks the active instrument', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'ukulele' } })
    const active = wrapper.findAll('button').filter((b) => b.classes('active'))
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('Ukulele')
    expect(active[0]?.attributes('aria-checked')).toBe('true')
  })

  it('emits update:modelValue with the selected instrument', async () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    await wrapper.findAll('button')[1]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ukulele'])
  })
})
