import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InstrumentSelector from '../InstrumentSelector.vue'
import { INSTRUMENT_IDS, INSTRUMENTS } from '@/chords/types'

describe('InstrumentSelector', () => {
  it('renders one radio per instrument', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual(
      INSTRUMENT_IDS.map((id) => INSTRUMENTS[id].label),
    )
  })

  it('checks exactly the active instrument', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'ukulele' } })
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((i) => (i.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe('ukulele')
  })

  it('emits update:modelValue with the selected instrument', async () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    await wrapper.findAll('input[type="radio"]')[1]?.setValue()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ukulele'])
  })
})
