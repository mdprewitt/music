# sheet-view

ChordPro / chord-sheet viewer built with Vue 3 + Pinia + Vite. Accepts ChordPro files via drag-drop or file picker and renders them as HTML.

## Commands

```bash
bun dev          # dev server (http://localhost:5173)
bun test:unit    # vitest (watch mode)
bun run type-check   # vue-tsc — run before committing
bun lint         # oxlint --fix then eslint --fix --cache (sequential)
bun run format   # prettier over src/
bun run build    # type-check + vite build in parallel
```

Run `bun lint` before committing. `bun run build` catches type errors that vitest misses.

## Stack

| Layer | Library |
|---|---|
| Framework | Vue 3.5, Composition API, `<script setup lang="ts">` |
| State | Pinia 4 (composition-API stores: `defineStore('id', () => { ... })`) |
| Build | Vite 8, `@vitejs/plugin-vue` |
| Types | TypeScript 6, `vue-tsc` |
| Tests | Vitest 4, `@vue/test-utils`, jsdom |
| Lint | oxlint (correctness errors) + ESLint flat config + Prettier |
| Chord parsing | `chordsheetjs` — `ChordProParser`, `HtmlTableFormatter` |
| Path alias | `@/` → `src/` |

## Project structure

```
src/
  stores/
    sheet.ts              # Pinia store: rawText, filename, song, parseError,
                          #   sourceFormat, viewFormat, instrument, showDiagrams
                          #   + loadFile/parse/reset
    __tests__/sheet.spec.ts
  chords/                 # chord-diagram feature (no Vue imports except *.vue)
    types.ts              # Instrument, InstrumentSpec, RawChordDefinition, DiagramShape
    diagram.ts            # toDiagramShape() — definition -> renderer-agnostic geometry
    definitions.ts        # resolveDiagramChords(), canonicalChordName(), add: recovery
    detectInstrument.ts   # guess guitar vs ukulele from a Song
    ukulele.ts            # GENERATED ukulele shape dictionary
    pdf.ts                # drawDiagramSheet() — prepend a diagram page to a jsPDF doc
  components/
    DropZone.vue          # drag-drop + file picker; calls store.loadFile()
    SheetViewer.vue       # renders store.song; hosts the view + instrument selectors
    ViewSelector.vue / InstrumentSelector.vue   # radiogroup, v-model on the store
    ChordDiagram.vue      # one SVG diagram from a DiagramShape
    ChordDiagrams.vue     # the strip of diagrams above the chart
    __tests__/
  assets/
    base.css              # CSS variables, reset (do not import directly in components)
    main.css              # #app layout; imports base.css
  App.vue                 # shows DropZone or SheetViewer based on store.song
  main.ts                 # createApp + createPinia + mount
scripts/
  generate-ukulele-chords.mjs   # regenerates src/chords/ukulele.ts (run by hand)
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

## Testing conventions

- Tests live in `src/**/__tests__/*.spec.ts`. Vitest uses jsdom.
- Always call `setActivePinia(createPinia())` in `beforeEach` for store tests.
- Use `@vue/test-utils` `mount` + `flushPromises` for async component interactions.
- Test files are excluded from `tsconfig.app.json` but included in `tsconfig.vitest.json`.

## chordsheetjs notes

- **Parsing**: `new ChordProParser().parse(rawText)` → `Song`
- **Rendering**: use `HtmlTableFormatter` (not `HtmlDivFormatter`). The table structure (`<tr>` for chords, `<tr>` for lyrics, `<td>` per column) gives reliable chord-over-lyric alignment out of the box. `HtmlDivFormatter` requires non-trivial flex CSS to avoid column-height misalignment.
- Style the formatter output via `SheetViewer`'s scoped `:deep()` selectors. Key classes: `.chord-sheet`, `.paragraph`, `table.row`, `td.chord`, `td.lyrics`, `.comment`.
- Future formatters: `ChordProFormatter`, `ChordsOverWordsFormatter` (plain text), `TextFormatter`. PDF via `jspdf` (already installed).

### Chord-diagram gotchas (learned the hard way — see `src/chords/`)

- **HTML diagram rendering is a stub.** Only `PdfFormatter` draws chord diagrams; the measured-HTML path just `console.log`s "stubbed out", and `HtmlTableFormatter` has no `chordDiagrams` config. The on-screen diagrams (`ChordDiagram.vue`) are drawn by us from `DiagramShape` geometry (`src/chords/diagram.ts`).
- **The bundled chord library is guitar-only.** `song.chordDefinitions.withDefaults()` merges ~900 six-string shapes. Never call it for ukulele — it silently injects guitar shapes. Ukulele shapes come from `src/chords/ukulele.ts` (generated by `scripts/generate-ukulele-chords.mjs`).
- **`PdfFormatter` can't be told the neck has 4 strings.** `chordDiagrams.renderingConfig` has no `stringCount` / `fretCount`; the internal builder hard-codes 6/4. So for ukulele PDFs we set `chordDiagrams.enabled: false` and prepend our own page via `drawDiagramSheet` (`src/chords/pdf.ts`) using the raw jsPDF from `formatter.getDocumentWrapper().doc`. Pass `jsPDF` as the 2nd arg to `formatter.format(song, jsPDF)`.
- **`{define}` lines with an `add: string N fret N finger N` clause are dropped without a warning.** `recoverDroppedDefinitions()` in `src/chords/definitions.ts` re-parses them from `rawText` after stripping the `add:` clauses.
- **Chord-name spelling varies wildly** (`maj7`/`M7`, `7-9`/`7b9`, `F#`/`Gb`). `resolveDiagramChords()` layers: sheet define → recovered define → library exact → library by normalised name (`canonicalChordName` for uke, `Chord.normalize()` + enharmonic flip for the guitar lib, which keys sharps only) → `null`.

## Commits

Use **Conventional Commits** with scope `sheet-view/<feature>`:

```
feat(sheet-view/viewer): add plain-text view
fix(sheet-view): handle empty song gracefully
```
