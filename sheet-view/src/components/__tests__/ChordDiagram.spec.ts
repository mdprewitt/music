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

  it('names AND describes the fingering, not just the chord name (WCAG 1.1.1)', () => {
    const shape = toDiagramShape({ name: 'Am7', baseFret: 1, frets: ['x', 0, 2, 0] })
    const wrapper = mount(ChordDiagram, { props: { shape } })
    const svg = wrapper.find('svg')

    // role="img" prunes the SVG's own text nodes from the accessibility tree,
    // so aria-label carries the only text a screen reader gets — it must
    // include the per-string fingering, not just repeat the visible title.
    const label = svg.attributes('aria-label')
    expect(label).toContain('Am7 chord diagram')
    expect(label).toContain('string 1 muted')
    expect(label).toContain('string 3 fret 2')

    // <title>/<desc> are a redundant fallback for consumers that read those
    // directly; each instance gets its own ids so two diagrams for the same
    // chord (the strip + a popover) never collide.
    expect(wrapper.find('title').text()).toBe('Am7 chord diagram')
    expect(wrapper.find('desc').text()).toBe(label!.replace('Am7 chord diagram. ', ''))
  })

  it('gives two instances of the same chord distinct title/desc ids', () => {
    // useId() is unique per Vue app instance, not globally — two separate
    // mount() calls each start a fresh app and would both get "v-0". Mount
    // both diagrams under one parent, as they really appear together (the
    // strip + a popover for the same chord), to exercise the real guarantee.
    const shape = toDiagramShape({ name: 'Am7', baseFret: 1, frets: ['x', 0, 2, 0] })
    const wrapper = mount({
      components: { ChordDiagram },
      setup: () => ({ shape }),
      template: '<div><ChordDiagram :shape="shape" /><ChordDiagram :shape="shape" /></div>',
    })
    const [titleA, titleB] = wrapper.findAll('title')
    expect(titleA?.attributes('id')).not.toBe(titleB?.attributes('id'))
  })
})
