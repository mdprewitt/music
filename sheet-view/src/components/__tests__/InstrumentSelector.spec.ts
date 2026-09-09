import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InstrumentSelector from '../InstrumentSelector.vue'
import { INSTRUMENT_IDS, INSTRUMENTS, INSTRUMENT_FAMILIES } from '@/chords/types'

describe('InstrumentSelector', () => {
  it('renders every instrument exactly once, in registry order', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    const options = wrapper.findAll('option')
    expect(options.map((o) => o.attributes('value'))).toEqual([...INSTRUMENT_IDS])
    expect(options.map((o) => o.text())).toEqual(INSTRUMENT_IDS.map((id) => INSTRUMENTS[id].label))
  })

  it('groups the options into one <optgroup> per non-empty family', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    const labels = wrapper.findAll('optgroup').map((g) => g.attributes('label'))
    const nonEmpty = INSTRUMENT_FAMILIES.filter((f) =>
      INSTRUMENT_IDS.some((id) => INSTRUMENTS[id].family === f.id),
    ).map((f) => f.label)
    expect(labels).toEqual(nonEmpty)
  })

  it('reflects the current instrument as the selected option', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'ukulele' } })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('ukulele')
  })

  it('emits update:modelValue with the picked instrument', async () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    await wrapper.find('select').setValue('tenor')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tenor'])
  })
})
