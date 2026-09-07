# sheet-view

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
bun install
```

### Compile and Hot-Reload for Development

```sh
bun dev
```

### Type-Check, Compile and Minify for Production

```sh
bun run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
bun test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
bun lint
```
## Theming

Colours live in one place. `src/assets/base.css` declares five authored custom
properties on `:root` — `--sv-background`, `--sv-lyrics`, `--sv-chord`,
`--sv-comment`, `--sv-meta` — and derives everything else (borders, surfaces,
hovers, overlay, error) from them with `color-mix()`.

- **Components must reference `--sv-*` only.** No hex literals, no
  `rgba(...)`, and no `@media (prefers-color-scheme: ...)` blocks — the "Dark"
  preset covers dark mode.
- At runtime `applyTheme()` (`src/theme/apply.ts`) writes the five vars as inline
  styles on `<html>`, which is what lets an explicit theme choice beat the OS
  `prefers-color-scheme` setting.
- **To add a preset:** widen the `ThemeId` union and `THEME_IDS` in
  `src/theme/types.ts`, then add an `{ id, label, colors }` entry to
  `THEME_PRESETS` in `src/theme/presets.ts`. The selector and the store pick it
  up automatically; no component edits.
- The PDF export is intentionally not themed (`chordsheetjs`' `PdfFormatter` and
  `src/chords/pdf.ts` own their ink colours).

## Deployment

The app is published to GitHub Pages at <https://mdprewitt.github.io/music/>. Any push to `main`
that touches `sheet-view/**` triggers `.github/workflows/pages.yml`, which runs `bun run build`
with `BASE_PATH` set to the project-page subpath and deploys `sheet-view/dist`. The workflow can
also be run manually from the Actions tab.

