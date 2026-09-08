import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChordDiagram from '../ChordDiagram.vue'
import { toDiagramShape } from '@/chords/diagram'

describe('ChordDiagram', () => {
  it('draws a nut, a grid and one dot per marker for a near-nut shape', () => {
    const shape = toDiagramShape({ name: 'C', baseFret: 1, frets: [0, 0, 0, 3] })
    const wrapper = mount(ChordDiagram, { props: { shape } })

    expect(wrapper.find('.cd-nut').exists()).toBe(true)
    expect(wrapper.find('.cd-basefret').exists()).toBe(false)
    expect(wrapper.findAll('.cd-dot')).toHaveLength(1)
    // 4 strings + (fretCount + 1) fret lines
    expect(wrapper.findAll('.cd-grid line')).toHaveLength(4 + (shape.fretCount + 1))
    expect(wrapper.find('.cd-title').text()).toBe('C')
  })

  it('shows a base-fret label instead of the nut for a shape up the neck', () => {
    const shape = toDiagramShape({ name: 'E7-9', baseFret: 1, frets: [6, 4, 4, 8] })
    const wrapper = mount(ChordDiagram, { props: { shape } })

    expect(wrapper.find('.cd-nut').exists()).toBe(false)
    expect(wrapper.find('.cd-basefret').text()).toBe('4fr')
  })

  it('renders a barre as a rounded rect', () => {
    const shape = toDiagramShape({
      name: 'Gsus2/B',
      baseFret: 1,
      frets: [2, 2, 3, 2],
      fingers: [1, 1, 2, 1],
    })
    const wrapper = mount(ChordDiagram, { props: { shape } })
    expect(wrapper.findAll('.cd-barre')).toHaveLength(1)
  })

  it('draws an open ring per open string and a cross per muted string', () => {
    // string 1 muted, strings 2 & 4 open, string 3 fretted
    const shape = toDiagramShape({ name: 'Am7', baseFret: 1, frets: ['x', 0, 2, 0] })
    const wrapper = mount(ChordDiagram, { props: { shape } })
    expect(wrapper.findAll('.cd-indicators circle')).toHaveLength(2) // two open strings
    expect(wrapper.findAll('.cd-indicators line')).toHaveLength(2) // one cross = two lines
  })
})
