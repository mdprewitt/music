/**
 * Geometry for keeping the "Display" panel on screen.
 *
 * The panel is right-anchored to its trigger button, but the wrapping toolbar
 * (`.viewer-controls` in `SheetViewer.vue`) can drop that button anywhere on the
 * line — including hard against the left edge on a phone. `DisplayPanel.vue`
 * measures on open and shifts the panel back inside the viewport with the value
 * from {@link panelShift}. Kept in a plain module (not the component's
 * `<script>` block) so the unit tests can import it — `bun run type-check` runs
 * a degraded `vue-tsc` that cannot see named exports from a `.vue` file.
 */

/** Gutter kept between the panel and the viewport edge, in px. */
export const PANEL_GUTTER = 8

/**
 * How far to nudge the right-anchored panel rightwards so it clears both
 * viewport edges. Returns 0 when the panel already fits, or when it cannot be
 * measured (jsdom, or before layout).
 */
export function panelShift(
  triggerRight: number,
  panelWidth: number,
  viewportWidth: number,
): number {
  if (panelWidth <= 0) return 0
  const anchored = triggerRight - panelWidth
  const clamped = Math.min(
    Math.max(PANEL_GUTTER, anchored),
    viewportWidth - PANEL_GUTTER - panelWidth,
  )
  return clamped - anchored
}
