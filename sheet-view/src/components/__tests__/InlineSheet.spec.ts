import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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

  it('emits chord-click with the bare chord name when a chord is clicked', async () => {
    const wrapper = mount(InlineSheet, { props: { song: songOf('[C]Amazing [G]grace') } })
    await wrapper.findAll('.chord')[1]!.trigger('click')
    const events = wrapper.emitted('chord-click')
    expect(events).toHaveLength(1)
    expect(events![0]![1]).toBe('G')
    expect(events![0]![0]).toBeInstanceOf(HTMLElement)
  })

  it('only makes real chords clickable, not annotations', () => {
    const wrapper = mount(InlineSheet, { props: { song: songOf('[C]hi [*loud]there') } })
    expect(wrapper.findAll('.chord.clickable').map((c) => c.text())).toEqual(['[C]'])
    expect(wrapper.find('.annotation').exists()).toBe(true)
    expect(wrapper.find('.annotation').classes()).not.toContain('clickable')
  })

  it('still reproduces the source line exactly with clickable chords', () => {
    const wrapper = mount(InlineSheet, {
      props: { song: songOf('[C]Amazing [G]grace, how [C]sweet the sound') },
    })
    expect(wrapper.find('p.line').text()).toBe('[C]Amazing [G]grace, how [C]sweet the sound')
  })

  it('is a labelled group describing the arrow-key convention (2.4.3)', () => {
    const wrapper = mount(InlineSheet, {
      props: { song: songOf('[C]hi'), navHintId: 'hint-id' },
    })
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-describedby')).toBe('hint-id')
  })

  describe('roving tab stop', () => {
    it('seeds only the first chord with tabindex="0" — the rest get "-1"', () => {
      const wrapper = mount(InlineSheet, {
        props: { song: songOf('[C]Amazing [G]grace, [Am]how [F]sweet') },
      })
      const chords = wrapper.findAll('.chord.clickable')
      expect(chords.map((c) => c.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    })

    it('re-seeds the first chord when the song changes', async () => {
      const wrapper = mount(InlineSheet, { props: { song: songOf('[C]hi [G]there') } })
      const cells = () => wrapper.findAll('.chord.clickable')
      // Move the tab stop off the first chord, then swap in a new song.
      await cells()[0]!.trigger('keydown', { key: 'ArrowRight' })
      expect(cells()[1]!.attributes('tabindex')).toBe('0')

      await wrapper.setProps({ song: songOf('[Am]new [F]song') })
      // The re-seed watcher awaits its own nextTick() beyond setProps()'s —
      // same idiom as announcer.announce() (see stores/announcer.ts).
      await flushPromises()
      const fresh = cells()
      expect(fresh.map((c) => c.attributes('tabindex'))).toEqual(['0', '-1'])
    })

    it('moves the tab stop with the arrow keys', async () => {
      const wrapper = mount(InlineSheet, {
        props: { song: songOf('[C]a [G]b [Am]c') },
      })
      const cells = () => wrapper.findAll('.chord.clickable')

      await cells()[0]!.trigger('keydown', { key: 'ArrowRight' })
      expect(cells().map((c) => c.attributes('tabindex'))).toEqual(['-1', '0', '-1'])

      await cells()[1]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(cells().map((c) => c.attributes('tabindex'))).toEqual(['0', '-1', '-1'])

      await cells()[0]!.trigger('keydown', { key: 'End' })
      expect(cells().map((c) => c.attributes('tabindex'))).toEqual(['-1', '-1', '0'])

      await cells()[2]!.trigger('keydown', { key: 'Home' })
      expect(cells().map((c) => c.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    })

    it('clamps at the last chord instead of wrapping', async () => {
      const wrapper = mount(InlineSheet, { props: { song: songOf('[C]a [G]b') } })
      const cells = () => wrapper.findAll('.chord.clickable')
      await cells()[0]!.trigger('keydown', { key: 'ArrowRight' })
      await cells()[1]!.trigger('keydown', { key: 'ArrowRight' })
      expect(cells().map((c) => c.attributes('tabindex'))).toEqual(['-1', '0'])
    })
  })
})
