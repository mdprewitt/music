import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ChordProParser, type Song } from 'chordsheetjs'
import InlineSheet from '../InlineSheet.vue'

const songOf = (text: string) => new ChordProParser().parse(text) as Song

describe('InlineSheet', () => {
  it('renders each chord bracketed and coloured in the lyric flow', () => {
    const wrapper = mount(InlineSheet, { props: { song: songOf('[C]Amazing [G]grace') } })
    expect(wrapper.findAll('.chord').map((c) => c.text())).toEqual(['[C]', '[G]'])
  })

  it('reproduces the source line when the rendered text is read back', () => {
    const wrapper = mount(InlineSheet, {
      props: { song: songOf('[C]Amazing [G]grace, how [C]sweet the sound') },
    })
    expect(wrapper.find('p.line').text()).toBe('[C]Amazing [G]grace, how [C]sweet the sound')
  })

  it('shows the title and a section label', () => {
    const wrapper = mount(InlineSheet, {
      props: {
        song: songOf(
          '{title: Grace}\n\n{start_of_chorus: label="Chorus"}\n[G]Sing\n{end_of_chorus}',
        ),
      },
    })
    expect(wrapper.find('h1.title').text()).toBe('Grace')
    expect(wrapper.find('h3.label').text()).toBe('Chorus')
  })

  it('renders a {comment} as an aside, not a lyric line', () => {
    const wrapper = mount(InlineSheet, { props: { song: songOf('{comment: softly}\n[C]Hi') } })
    const comment = wrapper.find('p.comment')
    expect(comment.exists()).toBe(true)
    expect(comment.text()).toBe('softly')
  })
})
