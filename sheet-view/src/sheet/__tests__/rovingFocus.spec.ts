import { describe, it, expect, vi } from 'vitest'
import { moveRovingFocus, handleRovingArrowKey } from '../rovingFocus'

function cell(): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('tabindex', '-1')
  document.body.appendChild(el)
  return el
}

function keydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true })
}

describe('moveRovingFocus', () => {
  it('shifts tabindex from the old to the new cell and focuses it', () => {
    const a = cell()
    const b = cell()
    a.setAttribute('tabindex', '0')
    const focusSpy = vi.spyOn(b, 'focus')

    moveRovingFocus([a, b], a, 1)

    expect(a.getAttribute('tabindex')).toBe('-1')
    expect(b.getAttribute('tabindex')).toBe('0')
    expect(focusSpy).toHaveBeenCalledOnce()
  })

  it('clamps an out-of-range index to the nearest end', () => {
    const a = cell()
    const b = cell()
    moveRovingFocus([a, b], a, 99)
    expect(b.getAttribute('tabindex')).toBe('0')
    moveRovingFocus([a, b], b, -99)
    expect(a.getAttribute('tabindex')).toBe('0')
  })

  it('does nothing when the target is already the current cell', () => {
    const a = cell()
    a.setAttribute('tabindex', '0')
    const focusSpy = vi.spyOn(a, 'focus')
    moveRovingFocus([a], a, 0)
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('does nothing on an empty list', () => {
    expect(() => moveRovingFocus([], cell(), 0)).not.toThrow()
  })
})

describe('handleRovingArrowKey', () => {
  it('moves right/down and left/up by one, preventing default', () => {
    const [a, b, c] = [cell(), cell(), cell()]
    const cells = [a, b, c]

    for (const key of ['ArrowRight', 'ArrowDown']) {
      const event = keydown(key)
      expect(handleRovingArrowKey(event, cells, a)).toBe(true)
      expect(event.defaultPrevented).toBe(true)
      expect(b.getAttribute('tabindex')).toBe('0')
      b.setAttribute('tabindex', '-1')
      a.setAttribute('tabindex', '0')
    }

    for (const key of ['ArrowLeft', 'ArrowUp']) {
      const event = keydown(key)
      expect(handleRovingArrowKey(event, cells, b)).toBe(true)
      expect(a.getAttribute('tabindex')).toBe('0')
      a.setAttribute('tabindex', '-1')
      b.setAttribute('tabindex', '0')
    }
  })

  it('jumps to the first/last cell on Home/End', () => {
    const [a, b, c] = [cell(), cell(), cell()]
    const cells = [a, b, c]

    handleRovingArrowKey(keydown('End'), cells, a)
    expect(c.getAttribute('tabindex')).toBe('0')

    handleRovingArrowKey(keydown('Home'), cells, c)
    expect(a.getAttribute('tabindex')).toBe('0')
  })

  it('clamps at the boundaries instead of wrapping', () => {
    const [a, b] = [cell(), cell()]
    a.setAttribute('tabindex', '0')
    const cells = [a, b]
    const event = keydown('ArrowLeft')
    handleRovingArrowKey(event, cells, a)
    expect(a.getAttribute('tabindex')).toBe('0')
    expect(b.getAttribute('tabindex')).toBe('-1')
  })

  it('ignores any other key and does not prevent its default', () => {
    const [a, b] = [cell(), cell()]
    const event = keydown('Enter')
    expect(handleRovingArrowKey(event, [a, b], a)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(a.getAttribute('tabindex')).toBe('-1')
  })
})
