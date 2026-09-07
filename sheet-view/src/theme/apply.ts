import { THEME_COLOR_KEYS, type ThemeColors } from './types'

/** `ThemeColors` key → the CSS custom property it feeds. */
const CSS_VAR: Record<keyof ThemeColors, string> = {
  background: '--sv-background',
  lyrics: '--sv-lyrics',
  chord: '--sv-chord',
  comment: '--sv-comment',
  meta: '--sv-meta',
}

/**
 * Write the five authored theme colours as inline custom properties on `el`
 * (`:root` by default). Inline properties outrank every stylesheet rule,
 * including the `@media (prefers-color-scheme: dark)` fallbacks in `base.css`,
 * so this is what makes an explicit theme choice win over the OS setting.
 */
export function applyTheme(colors: ThemeColors, el: HTMLElement = document.documentElement): void {
  for (const key of THEME_COLOR_KEYS) {
    el.style.setProperty(CSS_VAR[key], colors[key])
  }
}
