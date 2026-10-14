import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import MenuPanel from '../MenuPanel.vue'
import { MENU_GUTTER, menuShift } from '../menuPanel'

// Two menus sharing one open-id, like ControlMenus.vue wires them.
const Harness = defineComponent({
  setup() {
    const open = ref<string | null>(null)
    return () =>
      h('div', [
        h(
          MenuPanel,
          {
            id: 'a',
            label: 'Menu A',
            modelValue: open.value,
            'onUpdate:modelValue': (v: string | null) => (open.value = v),
          },
          { trigger: () => 'A', default: () => h('input', { type: 'radio', class: 'inside-a' }) },
        ),
        h(
          MenuPanel,
          {
            id: 'b',
            label: 'Menu B',
            modelValue: open.value,
            'onUpdate:modelValue': (v: string | null) => (open.value = v),
          },
          { trigger: () => 'B', default: () => h('p', 'b body') },
        ),
      ])
  },
})

const mountHarness = () => mount(Harness, { attachTo: document.body })

describe('MenuPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is collapsed by default and toggles from its trigger', async () => {
    const wrapper = mountHarness()
    const trigger = wrapper.findAll('.menu-trigger')[0]!
    expect(wrapper.find('.menu-panel').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(wrapper.find('.menu-panel').exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await trigger.trigger('click')
    expect(wrapper.find('.menu-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens one menu at a time', async () => {
    const wrapper = mountHarness()
    const [a, b] = wrapper.findAll('.menu-trigger')
    await a!.trigger('click')
    await b!.trigger('click')
    const panels = wrapper.findAll('.menu-panel')
    expect(panels).toHaveLength(1)
    expect(panels[0]!.attributes('aria-label')).toBe('Menu B')
    expect(a!.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('returns focus to the trigger on Escape when focus was inside the panel (2.4.3)', async () => {
    const wrapper = mountHarness()
    const trigger = wrapper.findAll('.menu-trigger')[0]!
    await trigger.trigger('click')
    ;(wrapper.find('.inside-a').element as HTMLElement).focus()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('.menu-panel').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('leaves focus alone on Escape when it was never inside the panel', async () => {
    const wrapper = mountHarness()
    await wrapper.findAll('.menu-trigger')[0]!.trigger('click')
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    elsewhere.focus()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(document.activeElement).toBe(elsewhere)
    wrapper.unmount()
  })

  it('closes on an outside pointerdown but not one inside the panel', async () => {
    const wrapper = mountHarness()
    await wrapper.findAll('.menu-trigger')[0]!.trigger('click')

    wrapper
      .find('.inside-a')
      .element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.menu-panel').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.menu-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('is a disclosure, not a menu/dialog trigger, linked to its panel (4.1.2)', async () => {
    const wrapper = mountHarness()
    const trigger = wrapper.findAll('.menu-trigger')[0]!
    expect(trigger.attributes('aria-haspopup')).toBeUndefined()
    const controlsId = trigger.attributes('aria-controls')
    expect(controlsId).toBeTruthy()

    await trigger.trigger('click')
    expect(wrapper.find('.menu-panel').attributes('id')).toBe(controlsId)
    wrapper.unmount()
  })

  it('carries an inline left offset so it can be clamped to the viewport', async () => {
    const wrapper = mountHarness()
    await wrapper.findAll('.menu-trigger')[0]!.trigger('click')
    expect(wrapper.find('.menu-panel').attributes('style')).toContain('left:')
    wrapper.unmount()
  })

  describe('menuShift', () => {
    it('does not move a panel that already fits', () => {
      expect(menuShift(100, 240, 1000)).toBe(0)
    })

    it('nudges a panel left until its right edge clears the gutter', () => {
      // trigger at x=250, 240px panel, 390px viewport → right edge 490, must end at 382.
      const shift = menuShift(250, 240, 390)
      expect(250 + shift + 240).toBe(390 - MENU_GUTTER)
      expect(shift).toBeLessThan(0)
    })

    it('nudges a panel right until its left edge clears the gutter', () => {
      expect(menuShift(-20, 240, 390)).toBe(MENU_GUTTER + 20)
    })

    it('returns 0 when the panel cannot be measured', () => {
      expect(menuShift(120, 0, 390)).toBe(0)
    })
  })
})
