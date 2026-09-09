import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InstrumentSelector from '../InstrumentSelector.vue'
import { INSTRUMENT_IDS, INSTRUMENTS, INSTRUMENT_FAMILIES } from '@/chords/types'

describe('InstrumentSelector', () => {
  it('renders every instrument exactly once, grouped by family in registry order', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    expect(wrapper.findAll('label').map((l) => l.text())).toEqual(
      INSTRUMENT_IDS.map((id) => INSTRUMENTS[id].label),
    )
  })

  it('captions each non-empty family with its label', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    const captions = wrapper.findAll('legend.caption').map((l) => l.text())
    const nonEmpty = INSTRUMENT_FAMILIES.filter((f) =>
      INSTRUMENT_IDS.some((id) => INSTRUMENTS[id].family === f.id),
    ).map((f) => f.label)
    expect(captions).toEqual(nonEmpty)
  })

  it('shares one radio group across the families (single choice, one selection)', () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'ukulele' } })
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.every((r) => r.attributes('name') === 'instrument')).toBe(true)
    const checked = radios.filter((r) => (r.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe('ukulele')
  })

  it('emits update:modelValue with the picked instrument', async () => {
    const wrapper = mount(InstrumentSelector, { props: { modelValue: 'guitar' } })
    const tenor = wrapper
      .findAll('input[type="radio"]')
      .find((r) => r.attributes('value') === 'tenor')
    await tenor?.setValue()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tenor'])
  })
})
