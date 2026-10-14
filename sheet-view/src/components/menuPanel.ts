/**
 * Geometry for keeping a header menu panel on screen.
 *
 * Each panel is left-anchored under its trigger button, but the wrapping header
 * can drop that button anywhere on the line — including against the right edge
 * on a phone. `MenuPanel.vue` measures on open and shifts the panel back inside
 * the viewport with the value from {@link menuShift}. Kept in a plain module
 * (not the component's `<script>` block) so the unit tests can import it —
 * `bun run type-check` runs a degraded `vue-tsc` that cannot see named exports
 * from a `.vue` file.
 */

/** Gutter kept between the panel and the viewport edge, in px. */
export const MENU_GUTTER = 8

/**
 * How far to nudge the left-anchored panel (positive = rightwards) so it clears
 * both viewport edges. Returns 0 when it already fits, or when it cannot be
 * measured (jsdom, or before layout).
 */
export function menuShift(triggerLeft: number, panelWidth: number, viewportWidth: number): number {
  if (panelWidth <= 0) return 0
  const clamped = Math.min(
    Math.max(MENU_GUTTER, triggerLeft),
    viewportWidth - MENU_GUTTER - panelWidth,
  )
  return clamped - triggerLeft
}
