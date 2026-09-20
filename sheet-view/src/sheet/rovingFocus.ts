/**
 * Shared "roving tabindex" arrow-key navigation (ARIA APG composite-widget
 * pattern) for a group of same-role elements that act as a single tab stop —
 * used by both chart views for their chord cells: SheetViewer.vue's
 * `v-html`-injected divs (`.sheet .chord[role="button"]`, seeded by
 * `markChordCells()`) and InlineSheet.vue's real `<span>` elements
 * (`.chord.clickable`). Fixes WCAG 2.4.3: every chord being its own tab stop,
 * with no way to skip past them in a long chart, was previously unnavigable.
 */

const ARROW_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

/**
 * Move the roving tab stop from `from` to `cells[index]` (clamped to the
 * array bounds) and focus it. A no-op when the target is `from` itself or the
 * list is empty.
 */
export function moveRovingFocus(cells: readonly HTMLElement[], from: HTMLElement, index: number): void {
  if (cells.length === 0) return
  const target = cells[Math.max(0, Math.min(index, cells.length - 1))]
  if (!target || target === from) return
  from.setAttribute('tabindex', '-1')
  target.setAttribute('tabindex', '0')
  target.focus()
}

/**
 * Handle an ArrowLeft/Right/Up/Down/Home/End keydown for a roving-tabindex
 * group: `cells` in reading order, `from` the element the key event
 * originated on. Returns `true` when the key was one of those (the event's
 * default is already prevented) so the caller can stop there; `false` for any
 * other key, in which case nothing happens.
 */
export function handleRovingArrowKey(
  event: KeyboardEvent,
  cells: readonly HTMLElement[],
  from: HTMLElement,
): boolean {
  const step = ARROW_STEP[event.key]
  const isHome = event.key === 'Home'
  const isEnd = event.key === 'End'
  if (step === undefined && !isHome && !isEnd) return false
  event.preventDefault()
  // step is only undefined when isHome or isEnd is true (checked above), in
  // which case this branch of the ternary is never taken — the `?? 0` is
  // just to satisfy noUncheckedIndexedAccess, not a real fallback.
  const index = isHome ? 0 : isEnd ? cells.length - 1 : cells.indexOf(from) + (step ?? 0)
  moveRovingFocus(cells, from, index)
  return true
}
