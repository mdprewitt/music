import { describe, it, expect } from 'vitest'
import {
  PAGE_TURNER_PRESETS,
  isPageTurnerId,
  pageTurnDirection,
  pageTurnDistance,
} from '../pageTurner'

function key(k: string, init: KeyboardEventInit = {}, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('pageTurnDirection', () => {
  it('maps every preset next/prev key', () => {
    for (const preset of PAGE_TURNER_PRESETS) {
      for (const k of preset.next) expect(pageTurnDirection(key(k), preset.id)).toBe(1)
      for (const k of preset.prev) expect(pageTurnDirection(key(k), preset.id)).toBe(-1)
    }
  })

  it('does nothing when off', () => {
    expect(pageTurnDirection(key('ArrowDown'), 'off')).toBeNull()
    expect(pageTurnDirection(key('PageDown'), 'off')).toBeNull()
  })

  it('ignores keys that belong to a different preset', () => {
    expect(pageTurnDirection(key('PageDown'), 'arrows-vertical')).toBeNull()
    expect(pageTurnDirection(key('ArrowRight'), 'arrows-vertical')).toBeNull()
  })

  it('ignores modified keys', () => {
    expect(pageTurnDirection(key('ArrowDown', { ctrlKey: true }), 'arrows-vertical')).toBeNull()
    expect(pageTurnDirection(key('ArrowDown', { metaKey: true }), 'arrows-vertical')).toBeNull()
    expect(pageTurnDirection(key('ArrowDown', { altKey: true }), 'arrows-vertical')).toBeNull()
  })

  it('ignores events another handler already claimed', () => {
    const event = key('ArrowDown')
    event.preventDefault()
    expect(pageTurnDirection(event, 'arrows-vertical')).toBeNull()
  })

  it('ignores typing in form fields', () => {
    for (const tag of ['input', 'select', 'textarea']) {
      const el = document.createElement(tag)
      expect(pageTurnDirection(key('ArrowDown', {}, el), 'arrows-vertical')).toBeNull()
    }
  })

  it('does not steal Space/Enter from a focused button or link', () => {
    const button = document.createElement('button')
    expect(pageTurnDirection(key(' ', {}, button), 'space-enter')).toBeNull()
    expect(pageTurnDirection(key('Enter', {}, button), 'space-enter')).toBeNull()
    expect(pageTurnDirection(key(' ', {}, document.body), 'space-enter')).toBe(1)
  })
})

describe('pageTurnDistance', () => {
  it('is most of a screen, leaving overlap', () => {
    expect(pageTurnDistance(1000)).toBe(850)
  })

  it('subtracts a pinned overlay', () => {
    expect(pageTurnDistance(1000, 200)).toBe(680)
  })

  it('never goes negative', () => {
    expect(pageTurnDistance(100, 500)).toBe(0)
  })
})

describe('isPageTurnerId', () => {
  it('accepts presets only', () => {
    expect(isPageTurnerId('page-keys')).toBe(true)
    expect(isPageTurnerId('nope')).toBe(false)
  })
})
