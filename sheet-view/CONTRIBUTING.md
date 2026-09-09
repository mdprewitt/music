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

## Chord diagrams

`buildDiagramIndex(song, instrument, rawText)` in `src/chords/shapes.ts` is the
**single entry point** for turning a song's chords into drawable shapes. It wraps
`resolveDiagramChords` + `toDiagramShape` and returns `{ shapes, byName }` — the
ordered strip and a name→shape lookup. It runs the ~900-shape guitar merge, so
memoise it in a `computed`; never call it per event. Use `findShape(index, label)`
(not `byName.get`) when matching a chord label from the rendered chart — it strips
brackets and normalises the spelling.

The click-a-chord popover (`ChordPopover.vue`, driven from `SheetViewer.vue`) reads
from that same index. The `html-inline` view emits `chord-click` from real spans;
the `html` view is `v-html`, so its chord cells are made focusable by
`markChordCells()` (`src/sheet/interactive.ts`) and handled by event delegation.

### Adding an instrument

Everything that varies by instrument is a row in `INSTRUMENTS`
(`src/chords/types.ts`) — the selector, the store's persistence, detection, the
resolver and both diagram renderers read from it. Thirteen tunings were added
this way, with no new `if (instrument === …)` branch. The recipe:

1. **`src/chords/types.ts`** — widen the `Instrument` union and add an
   `INSTRUMENTS` entry: `family` (`'ukulele' | 'guitar' | 'other'` — picker
   grouping only, no effect on resolution), `stringCount`, `tuning` (open-string
   pitch classes, lowest string first, `0 = C`), `diagrams`, and any directive
   `aliases`. Keep the object **grouped by family** — `INSTRUMENT_IDS` is
   rendered in order and `InstrumentSelector.vue` does not re-sort; it emits one
   `<optgroup>` per family straight from that order.
   `diagrams: 'chordsheetjs'` uses the bundled library and is **standard-tuning
   guitar only** — its shapes assume EADGBE, so an alternate six-string tuning
   (DADGAD, Open G, …) must be `diagrams: 'builtin'` even though it has six
   strings.
2. **Generate the shape dictionary** (skip for `'chordsheetjs'`): add a `TARGETS`
   row to `scripts/generate-chord-shapes.mjs` — a `maxFret` window and `maxSpan`,
   a list of reach budgets tried widest-last (the tuning is read from
   `INSTRUMENTS[id]`). A fifths tuning like CGDA needs a bigger `maxSpan` than
   GCEA; without the cap the scorer picks an unplayable stretch over muting a
   string. Six-string necks want a *tighter* span (`[3, 4, 5]`) and often a
   higher `maxFret` (an open tuning parks some chords up the neck). Then
   `bun run generate:chords <id>` (it runs Prettier itself). The search is a
   DFS that prunes any partial voicing `scoreVoicing` would reject anyway
   (a non-chord tone on a sounded string, a span already over budget); it emits
   candidates in the same order as the old exhaustive nested loop, so
   regenerating an existing table is a no-op diff. Read the
   `no playable shape found for: …` line it prints — a handful of genuine gaps
   is fine (`shapeLibraries.spec.ts` allows up to ~60), more means the budgets
   are too tight.
3. **`src/chords/definitions.ts`** — import the generated table and register it
   in `BUILTIN_SHAPES`. `resolveDiagramChords` and the `shapeLibraries.spec.ts`
   sweep pick it up from there.
4. **`src/chords/detectInstrument.ts`** — only if some `{define}` string count
   *unambiguously* implies the new instrument, add a `DEFAULT_BY_STRING_COUNT`
   row. Both four and six strings are now shared by several tunings, so
   `DEFAULT_BY_STRING_COUNT` stays `{ 4: 'ukulele', 6: 'guitar' }` and every
   other instrument relies on a `{meta: instrument …}` directive or the reader's
   pick. Directive `aliases` are matched longest-phrase-first and then by
   substring, so a longer phrase that contains a shorter alias (`celtic guitar`
   vs. `guitar`) resolves correctly.

`ChordDiagram.vue`, `src/chords/pdf.ts`, `src/chords/diagram.ts` and
`src/chords/shapes.ts` take geometry from `DiagramShape.stringCount` and need no
changes for a new string count.

**Known limitation.** `resolveDiagramChords` trusts a chart's own `{define}`
whenever its fret count equals the selected instrument's `stringCount` — it does
not check the tuning. So a standard-tuning guitar `{define}` in a chart is drawn
as-is when the reader has DADGAD (or Open G, …) selected, and a GCEA ukulele
`{define}` is drawn under a DGBE baritone. The built-in tables are always
tuning-correct; only chart-supplied shapes are affected.

## Changing the key

`store.song` is always the pristine parse. The key change is a **derived**
`store.displaySong` computed: `song.changeKey(store.targetKey)` when a different
key is chosen, otherwise `song` itself. Every view in `SheetViewer.vue` reads
through its local `song` computed, which points at `store.displaySong` — so a
component that needs the rendered song must use `store.displaySong`, never
`store.song`, or it will ignore the key change.

- The feature is gated on `store.canChangeKey` (`song.key !== null`).
  `Song#changeKey` throws without a `{key: …}` directive, so `KeySelector.vue`
  renders disabled with a hint in that case, and `displaySong` has a
  belt-and-braces `try/catch` that falls back to the pristine song.
- `store.availableKeys` comes from `keyHelpers.getKeys(originalKey)` — already
  mode-matched (minor targets for a minor song).
- The chosen key is remembered per song, not globally. `src/sheet/key.ts`
  (`songIdentity` / `recallKey` / `rememberKey`) keeps a `sheet-view:songKeys`
  JSON map keyed by `title‖artist` (or the filename). `parse()` restores it
  behind a `restoringKey` flag so the persistence watcher doesn't echo it back —
  the same trick as `autoDetecting` on `instrument`.
- `{define}` blocks are keyed by chord name and are **not** transposed, so a
  user-defined shape for an original-key chord simply falls through to the
  library resolver after a key change. Acceptable; not worth remapping.

## Deployment

The app is published to GitHub Pages at <https://mdprewitt.github.io/music/>. Any push to `main`
that touches `sheet-view/**` triggers `.github/workflows/pages.yml`, which runs `bun run build`
with `BASE_PATH` set to the project-page subpath and deploys `sheet-view/dist`. The workflow can
also be run manually from the Actions tab.

