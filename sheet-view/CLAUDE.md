# sheet-view

ChordPro / chord-sheet viewer built with Vue 3 + Pinia + Vite. Accepts ChordPro files via drag-drop or file picker and renders them as HTML.

## Commands

```bash
bun dev          # dev server (http://localhost:5173)
bun test:unit    # vitest (watch mode)
bun test:e2e     # playwright — builds, previews on :4173, drives Chromium
bun run type-check   # vue-tsc — run before committing
bun lint         # oxlint --fix then eslint --fix --cache (sequential)
bun run format   # prettier over src/
bun run build    # type-check + vite build in parallel
```

The `Makefile` wraps these (`make help` lists them): `make dev`, `make build`, `make test`
(one-shot unit), `make test-watch`, `make test-e2e` (+ `make test-e2e-ui`), `make lint`,
`make type-check`, `make check` (type-check + lint + unit test), `make clean`.

Playwright runs fine under Bun here. `bunx playwright install chromium` fetches the browser
(cached in `~/.cache/ms-playwright`, not the repo). The e2e config self-serves via
`bun run build && bun run preview`, reusing an already-running server when one is up.

Run `bun lint` before committing. `bun run build` catches type errors that vitest misses.

`vue-tsc` runs under Bun here (no Node on the box), and Bun's `require()` bypasses the
`fs.readFileSync` hook Volar uses to patch `tsc`, so `vue-tsc` silently degrades to plain `tsc`
— it does **not** type-check `.vue` internals and would flag every `*.vue` import from a `.ts`
file as TS2307. `env.d.ts` carries a `declare module '*.vue'` shim to keep `bun run type-check`
green; real `.vue` checking only happens with a Node runtime.

## Stack

| Layer | Library |
|---|---|
| Framework | Vue 3.5, Composition API, `<script setup lang="ts">` |
| State | Pinia 4 (composition-API stores: `defineStore('id', () => { ... })`) |
| Build | Vite 8, `@vitejs/plugin-vue` |
| Types | TypeScript 6, `vue-tsc` |
| Tests | Vitest 4, `@vue/test-utils`, jsdom |
| Lint | oxlint (correctness errors) + ESLint flat config + Prettier |
| Chord parsing | `chordsheetjs` — `ChordProParser`, `HtmlDivFormatter` |
| Path alias | `@/` → `src/` |

## Project structure

```
src/
  stores/
    sheet.ts              # Pinia store: rawText, filename, song, parseError,
                          #   sourceFormat, viewFormat, instrument, diagramPosition,
                          #   pinDiagrams, displayPanelOpen, showDiagrams, targetKey
                          #   + originalKey/availableKeys/canChangeKey/displaySong (computed)
                          #   + loadFile/loadFromUrl/parse/reset
                          #   viewFormat, instrument, diagramPosition, pinDiagrams and
                          #   displayPanelOpen persist (sheet-view:*) and survive reset();
                          #   showDiagrams + targetKey reset per sheet. targetKey is
                          #   remembered per song in sheet-view:songKeys (see sheet/key.ts)
                          #   and restored in parse(); displaySong = song.changeKey(targetKey)
                          #   feeds every view, song stays pristine.
                          #   loadFromUrl: no proxy. toFetchableUrl() rewrites
                          #   github.com blob/raw + gist URLs to their CORS-enabled
                          #   raw hosts; other URLs are fetched as-is and fail on
                          #   CORS. Bot-challenged sites (Cloudflare) can't be
                          #   fetched at all — a proxy wouldn't help.
    theme.ts              # Pinia store: themeId, customColors, colors (computed),
                          #   selectTheme/resetCustom. Persists sheet-view:theme +
                          #   sheet-view:customColors. OS scheme honoured once.
    storage.ts            # readStored()/writeStored() — localStorage helpers
                          #   shared by sheet.ts and theme.ts (swallow exceptions)
    __tests__/sheet.spec.ts
    __tests__/theme.spec.ts
  theme/                  # colour-theming feature (no Vue imports)
    types.ts              # ThemeId, ThemeColors, ThemePreset, isThemeId/isThemeColors
    presets.ts            # THEME_PRESETS — the 4 standard palettes (light/dark/sepia/stage)
    apply.ts              # applyTheme() — write the 5 --sv-* vars inline on :root
  sheet/                  # chart-rendering helpers (no Vue imports)
    inline.ts             # toInlineSheet() — Song -> flat token model for the
                          #   "HTML inline" view (bracketed chords in the lyric flow)
    interactive.ts        # markChordCells() — sanitize HtmlDivFormatter output to a
                          #   safe element/attribute allowlist (it's untrusted chart
                          #   text inserted via v-html), add tabindex/role to its
                          #   chord cells, and empty the chord-less `.chord` spacer
                          #   divs so `.chord:empty` styling applies (no template —
                          #   it's a string)
    key.ts                # songIdentity()/recallKey()/rememberKey() — per-song key
                          #   memory (sheet-view:songKeys — JSON array of [id, key]
                          #   pairs, newest last; legacy {id:key} object migrated on
                          #   read; id = title‖artist or filename). The transpose
                          #   itself is Song#changeKey.
  chords/                 # chord-diagram feature (no Vue imports except *.vue)
    types.ts              # Instrument union + INSTRUMENTS registry (family/stringCount/tuning/
                          #   diagrams/aliases — every per-instrument fact), InstrumentSpec,
                          #   INSTRUMENT_FAMILIES (picker grouping only), RawChordDefinition,
                          #   DiagramShape. Adding an instrument = a row here. 13 tunings; the
                          #   registry is ordered by family so INSTRUMENT_IDS is pre-grouped.
    diagram.ts            # toDiagramShape() — definition -> renderer-agnostic geometry
    definitions.ts        # resolveDiagramChords(), canonicalChordName(), add: recovery,
                          #   BUILTIN_SHAPES (instrument -> our generated shape table)
    shapes.ts             # buildDiagramIndex()/findShape() — the single entry point for
                          #   chord -> DiagramShape: {shapes[] for the strip, byName lookup}
    detectInstrument.ts   # guess the instrument from a Song ({meta: instrument …} alias
                          #   match, else define string-count via DEFAULT_BY_STRING_COUNT)
    ukulele.ts / tenor.ts / tenorChicago.ts / formby.ts / bflat.ts / celtic.ts /
    openD.ts / openG.ts / guitalele.ts / mandolin.ts / banjo.ts / banjoC.ts
                          #   GENERATED shape dictionaries, one per diagrams:'builtin'
                          #   instrument; keyed by canonical chord name. The six-string
                          #   alternate tunings (Celtic/Open D/Open G/Guitalele) are 'builtin'
                          #   too — chordsheetjs' bundled library is standard-tuning-only.
    pdf.ts                # drawDiagramSheet() — prepend a diagram page to a jsPDF doc
  components/
    DropZone.vue          # drag-drop + file picker + paste-a-URL; calls store.loadFile() / store.loadFromUrl()
    SheetViewer.vue       # renders store.song; header = filename + ViewSelector +
                          #   InstrumentSelector + KeySelector + Diagrams toggle +
                          #   DisplayPanel + "Load another" (the sole direct-child
                          #   <button> of .viewer-header — a spec depends on that);
                          #   owns the click-a-chord -> ChordPopover interaction (both HTML views)
    DisplayPanel.vue      # "Display" disclosure button + anchored panel holding the set-once
                          #   prefs (Diagrams position+pin / Theme+CustomColorEditor), each
                          #   captioned; open state = store.displayPanelOpen; dismiss on
                          #   Esc / outside pointerdown (same idiom as SheetViewer's popover)
    ViewSelector.vue / DiagramPositionSelector.vue   # radiogroup, v-model on the store
    InstrumentSelector.vue # header <select> (thirteen tunings, one <optgroup> per family from
                          #   INSTRUMENT_FAMILIES), v-model on store.instrument
    KeySelector.vue       # header <select> of transpose targets, v-model on store.targetKey;
                          #   disabled with a hint when store.originalKey is null (no {key})
    ThemeSelector.vue     # radiogroup of 4 presets + Custom; :model-value/@update -> theme.selectTheme
    CustomColorEditor.vue # 5 <input type=color> bound to theme.customColors; shown when themeId==='custom'
    ChordDiagram.vue      # one SVG diagram from a DiagramShape
    ChordDiagrams.vue     # the strip of diagrams above the chart
    ChordPopover.vue      # anchored popover — one diagram shown above a clicked chord
    InlineSheet.vue       # renders toInlineSheet() output — the "HTML inline" view
    __tests__/
  assets/
    base.css              # --sv-* theme palette + derived tokens, reset (do not import directly in components)
    main.css              # #app layout; imports base.css
  App.vue                 # shows DropZone or SheetViewer based on store.song;
                          #   on mount, a `?view=<chart-url>` query param calls
                          #   store.loadFromUrl() (errors → store.parseError)
  main.ts                 # createApp + createPinia + mount
scripts/
  generate-chord-shapes.mjs   # `bun run generate:chords <id>` (id ∈ TARGETS: ukulele,
                              #   tenor, tenor-chicago, formby, bflat, celtic, open-d,
                              #   open-g, guitalele, mandolin, banjo, banjo-c). Regenerates
                              #   one src/chords/*.ts table, Prettier-formatted (run by
                              #   hand; bun, not node — it imports types.ts for the tuning;
                              #   exits non-zero on a missing/empty result). `voicings()` is
                              #   a pruned DFS — needed to keep the six-string necks
                              #   tractable — that still emits candidates in the old
                              #   exhaustive order, so regenerating the pre-existing tables
                              #   is a no-op diff.
e2e/
  app.spec.ts                 # Playwright smoke suite — drop zone, picking a chart, the
                              #   header instrument <select> redrawing diagrams, the Display
                              #   panel's contents. Runs against `vite preview` of a real build.
  fixtures/sample.cho         # tiny self-contained ChordPro chart the specs upload
  tsconfig.json               # composite project (types: node + @playwright/test),
                              #   referenced from the root tsconfig
playwright.config.ts          # testDir e2e/, chromium only, webServer = build + preview :4173
```

## Coding conventions

- **No semicolons**, single quotes, 100-col line width (Prettier enforced).
- All components use `<script setup lang="ts">`. No Options API.
- Import Vue APIs explicitly: `import { ref, computed } from 'vue'`.
- Use `@/` alias for all `src/` imports — no relative `../../` paths across feature boundaries.
- `noUncheckedIndexedAccess` is enabled — always guard array/object lookups.

## State store conventions

- Use Composition-API style stores (`defineStore('id', () => { })`) — not Options API stores.
- Wrap `chordsheetjs` class instances in `markRaw()` before storing in a ref. Pinia's deep reactivity mangles class instances and causes type errors (TypeScript sees `UnwrapRef<Song>` ≠ `Song`). When accessing `store.song` in a component for a library method call, cast with `store.song as Song`.
- `sourceFormat` and `viewFormat` are union-typed strings. To add a new parser/formatter: widen the union, add a `case` to `store.parse()` / a branch in `SheetViewer`, and add a `<ViewSelector>` component that `v-model`s on `store.viewFormat`.
- New stores share `readStored`/`writeStored` from `@/stores/storage` — don't re-implement the try/catch. `theme.ts` and `sheet.ts` both use them; the `flush: 'sync'` persistence-watcher idiom is the same in both.

## Theming

- The whole app is coloured by **five** authored CSS custom properties on `:root` — `--sv-background`, `--sv-lyrics`, `--sv-chord`, `--sv-comment`, `--sv-meta` (see `ThemeColors`). Every other colour (`--sv-border`, `--sv-surface`, `--sv-surface-hover`, `--sv-divider`, `--sv-on-accent`, `--sv-error*`, `--sv-overlay`) is **derived** from those five with `color-mix()` in `base.css`. Components reference `--sv-*` only — **no hex literals, no `@media (prefers-color-scheme: …)` blocks** (the old per-component dark blocks were all removed; the "Dark" preset replaces them).
- `applyTheme(colors)` (`src/theme/apply.ts`) writes the five vars as **inline** styles on `document.documentElement`, which outranks any stylesheet rule including a `prefers-color-scheme` media query. `App.vue` calls it in a `watchEffect` on `theme.colors`.
- OS scheme is honoured **once**: `theme.ts` seeds `themeId` from `matchMedia('(prefers-color-scheme: dark)')` only when nothing is stored. Guard `matchMedia` — jsdom lacks it.
- To add a preset: widen the `ThemeId` union and `THEME_IDS` array in `src/theme/types.ts`, then add the matching entry (id + label + five colours) to `THEME_PRESETS` in `src/theme/presets.ts`. The selector and store enumerate `THEME_PRESETS` — no component changes.
- The PDF view is **not** themed — `PdfFormatter` / `src/chords/pdf.ts` carry their own ink constants. Stays black-on-white.

## Testing conventions

- Tests live in `src/**/__tests__/*.spec.ts`. Vitest uses jsdom.
- Always call `setActivePinia(createPinia())` in `beforeEach` for store tests.
- Use `@vue/test-utils` `mount` + `flushPromises` for async component interactions.
- Test files are excluded from `tsconfig.app.json` but included in `tsconfig.vitest.json`.
- jsdom ships no working `Storage` — store tests that touch persistence call `installMemoryStorage()` from `@/__tests__/memoryStorage` in `beforeEach` and `vi.unstubAllGlobals()` in `afterEach`. jsdom also lacks `matchMedia`.
- **End-to-end** specs live in `e2e/*.spec.ts` and run under Playwright (`bun test:e2e` / `make test-e2e`), not Vitest — keep the two apart. Use them for what jsdom can't do: real layout, `<select>`/pointer events, SVG rendering, the `?view=` query-param path. Drive chart loading via `page.locator('input[type="file"]').setInputFiles(...)` with `e2e/fixtures/sample.cho`; prefer role/label selectors (`getByRole`, `getByLabel`) over CSS. First run needs `bunx playwright install chromium`.

## chordsheetjs notes

- **Parsing**: `new ChordProParser().parse(rawText)` → `Song`
- **Rendering**: use `HtmlDivFormatter` (not `HtmlTableFormatter`). Each line is a `.row` of self-contained `.column` (chord `<div>` above lyric `<div>`) units, so `flex-wrap: wrap` on `.row` folds a line too wide for the viewport onto the next line with every chord still above its own word — the mobile-wrapping requirement. `HtmlTableFormatter` emits one un-wrappable `<table>` per line and simply overflows a narrow screen. The one gotcha the table formatter didn't have: a chord-less column renders as `<div class="chord">\n</div>`, whose stray text node throws the lyric below it out of vertical alignment — `markChordCells()` empties those divs and `.sheet :deep(.chord:empty)::after { content: '\200b' }` gives them a zero-width line box. Consequence: chord text now sits inline with the lyric fragments in DOM order (visually above via flex-column), so text selection / `toContainText` over a line interleaves chords.
- Style the formatter output via `SheetViewer`'s scoped `:deep()` selectors. Key classes: `.chord-sheet`, `.paragraph`, `.row`, `.column`, `.chord`, `.lyrics`, `.annotation`, `.comment`.
- **The "HTML inline" view is ours, not a library formatter.** chordsheetjs has no inline-chord HTML output, so `src/sheet/inline.ts` walks the `Song` AST (`song.bodyParagraphs` → `line.items`, branching on `instanceof ChordLyricsPair` / `Tag` / `SoftLineBreak`, chord text via `templateHelpers.renderChord`) into a flat token model that `InlineSheet.vue` renders as real nodes. Its own scoped styles — it does **not** share the `.sheet :deep()` rules.
- Future formatters: `ChordProFormatter`, `ChordsOverWordsFormatter` (plain text), `TextFormatter`. PDF via `jspdf` (already installed).
- **Changing the key = `Song#changeKey(target)`.** Returns a **new** Song (original untouched), rewrites the `{key}` tag and every chord. **Throws** ("original key is unknown") when the sheet has no `{key: …}` directive — `song.key` is `null`, which is the feature gate (`store.canChangeKey`). It does **not** touch `{define}` tags, so a user-defined shape for an original-key chord won't match after a transpose and falls through to the library resolver. `keyHelpers.getKeys(key)` gives the target list (mode-matched). The store's `displaySong` computed applies it once and feeds every view + the diagram index; `store.song` stays pristine so the transform is idempotent.

### Chord-diagram gotchas (learned the hard way — see `src/chords/`)

- **HTML diagram rendering is a stub.** Only `PdfFormatter` draws chord diagrams; the measured-HTML path just `console.log`s "stubbed out", and the HTML formatters have no `chordDiagrams` config. The on-screen diagrams (`ChordDiagram.vue`) are drawn by us from `DiagramShape` geometry (`src/chords/diagram.ts`).
- **The bundled chord library is guitar-only.** `song.chordDefinitions.withDefaults()` merges ~900 six-string shapes. Never call it for a non-guitar instrument — it silently injects guitar shapes. Every other instrument has its own generated table registered in `BUILTIN_SHAPES` (`src/chords/definitions.ts`): `ukulele.ts`, `tenor.ts` (CGDA), `tenorChicago.ts` (DGBE), all built by `scripts/generate-chord-shapes.mjs <id>`. `resolveDiagramChords` picks the bundled library *only* when `BUILTIN_SHAPES[instrument]` is undefined.
- **`PdfFormatter` can't be told the neck has ≠6 strings.** `chordDiagrams.renderingConfig` has no `stringCount` / `fretCount`; the internal builder hard-codes 6/4. So for any `diagrams: 'builtin'` instrument (`INSTRUMENTS` in `types.ts`) we set `chordDiagrams.enabled: false` and prepend our own page via `drawDiagramSheet` (`src/chords/pdf.ts`) using the raw jsPDF from `formatter.getDocumentWrapper().doc`. Pass `jsPDF` as the 2nd arg to `formatter.format(song, jsPDF)`. `SheetViewer.vue` keys both decisions off `INSTRUMENTS[instrument].diagrams`, never an id literal.
- **`{define}` lines with an `add: string N fret N finger N` clause are dropped without a warning.** `recoverDroppedDefinitions()` in `src/chords/definitions.ts` re-parses them from `rawText` after stripping the `add:` clauses.
- **Chord-name spelling varies wildly** (`maj7`/`M7`, `7-9`/`7b9`, `F#`/`Gb`). `resolveDiagramChords()` layers: sheet define → recovered define → library exact → library by normalised name (`canonicalChordName` for the `BUILTIN_SHAPES` tables, which are canonically keyed; `Chord.normalize()` + enharmonic flip for the guitar lib, which keys sharps only) → `null`.
- **Resolve once, look up many.** `buildDiagramIndex(song, instrument, rawText)` in `src/chords/shapes.ts` runs `resolveDiagramChords` + `toDiagramShape` a single time (the guitar merge is ~900 shapes) and returns `{ shapes[], byName }` — `shapes[]` sorted into musical alphabetical order by `compareChordNames` (root A–G → accidental → suffix), so the on-screen strip and the prepended PDF diagram page share one order; `resolveDiagramChords` itself stays first-appearance. `ChordDiagrams.vue`, `SheetViewer.vue`'s PDF path, and the click-to-peek popover all go through it; memoise it in a `computed` keyed on (song, instrument). `findShape(index, label)` strips brackets and falls back to `canonicalChordName` — the *displayed* chord name (from `templateHelpers.renderChord` / the formatter) diverges from `song.getChords()` under transpose/capo, so never match by string equality.
- **Click-a-chord popover.** `SheetViewer.vue` opens `ChordPopover.vue` above a clicked chord in both HTML views. The `html-inline` view emits `chord-click` from real `<span>` nodes; the `html` view is `v-html`, so chord cells are reached by a delegated `@click`/`@keydown` on the `.sheet` wrapper (`event.target.closest('.chord')`) and made focusable by `markChordCells()` (`src/sheet/interactive.ts`) before insertion. The popover works even when the diagram strip (`store.showDiagrams`) is off; an unresolvable chord still opens it with a "no diagram" note.

## Commits

Use **Conventional Commits** with scope `sheet-view/<feature>`:

```
feat(sheet-view/viewer): add plain-text view
fix(sheet-view): handle empty song gracefully
```
## Freshness

Keep CLAUDE.md, CONTRIBUTING.md and README.md up to date with the newest information as each new feature is added.
- CLAUDE.md - agent instructions
- REAMDE.md - end user info / documenation
- CONTRIBUTING.md - developer info / documentation
