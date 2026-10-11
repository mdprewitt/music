/**
 * Page-turner support. Bluetooth page turners (AirTurn, PageFlip, Donner,
 * iRig BlueTurn, CINCO, presentation clickers…) pair as HID keyboards and send
 * one of a few standard key pairs depending on their mode, so "support" is
 * choosing which `KeyboardEvent.key` values mean next / previous page.
 */

export const PAGE_TURNER_PRESETS = [
  { id: 'off', label: 'Off', hint: 'Keys are not used to turn pages.', next: [], prev: [] },
  {
    id: 'arrows-vertical',
    label: '↑ / ↓ arrows',
    hint: 'Down arrow = next page, up arrow = previous. AirTurn and PageFlip default mode.',
    next: ['ArrowDown'],
    prev: ['ArrowUp'],
  },
  {
    id: 'arrows-horizontal',
    label: '← / → arrows',
    hint: 'Right arrow = next page, left arrow = previous. Donner, iRig BlueTurn, CINCO.',
    next: ['ArrowRight'],
    prev: ['ArrowLeft'],
  },
  {
    id: 'page-keys',
    label: 'Page Up / Down',
    hint: 'Page Down = next page, Page Up = previous. AirTurn PGUP/PGDN mode, presentation clickers.',
    next: ['PageDown'],
    prev: ['PageUp'],
  },
  {
    id: 'space-enter',
    label: 'Space / Enter',
    hint: 'Space or Enter = next page, Backspace = previous. One-pedal and keyboard-style modes.',
    next: [' ', 'Enter'],
    prev: ['Backspace'],
  },
] as const

export type PageTurnerId = (typeof PAGE_TURNER_PRESETS)[number]['id']

export const DEFAULT_PAGE_TURNER: PageTurnerId = 'off'

export function isPageTurnerId(value: unknown): value is PageTurnerId {
  return PAGE_TURNER_PRESETS.some((preset) => preset.id === value)
}

/** Fraction of a screen to scroll per turn — the rest stays visible as overlap. */
const TURN_FRACTION = 0.85

const FORM_FIELDS = new Set(['INPUT', 'SELECT', 'TEXTAREA'])

function isFormField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  return FORM_FIELDS.has(el.tagName) || el.isContentEditable === true
}

/** Elements that already own Space/Enter (activating them must not also turn the page). */
function isActivatable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return false
  return el.closest('button, a[href], summary, [role="button"]') !== null
}

/**
 * Which way (if any) this key event should turn the page: 1 = forward,
 * -1 = back, `null` = not ours. Leaves alone anything another handler already
 * claimed (`defaultPrevented` — e.g. the chord cells' arrow-key navigation),
 * modified keys, and keys typed into form fields.
 */
export function pageTurnDirection(event: KeyboardEvent, id: PageTurnerId): 1 | -1 | null {
  if (id === 'off' || event.defaultPrevented) return null
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  if (isFormField(event.target)) return null
  const preset = PAGE_TURNER_PRESETS.find((p) => p.id === id)
  if (!preset) return null
  const forward = (preset.next as readonly string[]).includes(event.key)
  const back = (preset.prev as readonly string[]).includes(event.key)
  if (!forward && !back) return null
  if ((event.key === ' ' || event.key === 'Enter') && isActivatable(event.target)) return null
  return forward ? 1 : -1
}

/** Pixels to scroll for one turn, given the viewport and any pinned overlay covering it. */
export function pageTurnDistance(viewportHeight: number, obstructed = 0): number {
  return Math.max(viewportHeight - obstructed, 0) * TURN_FRACTION
}
