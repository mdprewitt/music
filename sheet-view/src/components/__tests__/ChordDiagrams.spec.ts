import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChordDiagrams from '../ChordDiagrams.vue'
import { toDiagramShape } from '@/chords/diagram'

const shapes = [
  toDiagramShape({ name: 'C', baseFret: 1, frets: [0, 0, 0, 3], fingers: [] }),
  toDiagramShape({ name: 'G', baseFret: 1, frets: [0, 2, 3, 2], fingers: [] }),
]

describe('ChordDiagrams', () => {
  it('renders one ChordDiagram per shape', () => {
    const wrapper = mount(ChordDiagrams, { props: { shapes } })
    expect(wrapper.findAll('svg.chord-diagram')).toHaveLength(2)
  })

  it('renders nothing when there are no shapes', () => {
    const wrapper = mount(ChordDiagrams, { props: { shapes: [] } })
    expect(wrapper.find('.chord-diagrams').exists()).toBe(false)
  })

  it('reflects position and pinned on the container', () => {
    const wrapper = mount(ChordDiagrams, { props: { shapes, position: 'right', pinned: true } })
    const el = wrapper.find('.chord-diagrams')
    expect(el.classes()).toContain('pos-right')
    expect(el.classes()).toContain('pinned')
  })

  it('defaults to the top position', () => {
    const wrapper = mount(ChordDiagrams, { props: { shapes } })
    expect(wrapper.find('.chord-diagrams').classes()).toContain('pos-top')
  })
})
