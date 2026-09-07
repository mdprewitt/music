<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { ChordProFormatter, HtmlTableFormatter, type Song } from 'chordsheetjs'
import { PdfFormatter } from 'chordsheetjs/pdf'
import { jsPDF } from 'jspdf'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { buildDiagramIndex, findShape } from '@/chords/shapes'
import { drawDiagramSheet, type PdfDoc } from '@/chords/pdf'
import { markChordCells } from '@/sheet/interactive'
import ViewSelector from './ViewSelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import ThemeSelector from './ThemeSelector.vue'
import CustomColorEditor from './CustomColorEditor.vue'
import ChordDiagrams from './ChordDiagrams.vue'
import InlineSheet from './InlineSheet.vue'
import ChordPopover, { type AnchorRect } from './ChordPopover.vue'

const store = useSheetStore()
const theme = useThemeStore()
// store.song is markRaw(Song), but Pinia's UnwrapRef loses class fidelity — cast back to Song
const song = computed(() => (store.song ? (store.song as Song) : null))

// The formatter output is inserted via v-html; markChordCells adds tabindex/role
// to its chord cells so they can be focused and activated from the keyboard.
const html = computed(() =>
  song.value ? markChordCells(new HtmlTableFormatter().format(song.value)) : '',
)

// One resolution pass per (song, instrument) — feeds both the click-to-peek
// popover here and (via the same helper) the always-on diagram strip.
const diagramIndex = computed(() =>
  song.value ? buildDiagramIndex(song.value, store.instrument, store.rawText) : null,
)

const text = computed(() =>
  song.value && store.viewFormat === 'chordpro' ? new ChordProFormatter().format(song.value) : '',
)

const pdfUrl = ref<string | null>(null)
const pdfError = ref<string | null>(null)

const pdfFilename = computed(() => (store.filename ?? 'sheet').replace(/\.[^./]*$/, '') + '.pdf')

function revokePdfUrl() {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }
}

watch(
  [song, () => store.viewFormat, () => store.instrument, () => store.showDiagrams],
  async ([currentSong, view, instrument, showDiagrams]) => {
    if (view !== 'pdf' || !currentSong) {
      revokePdfUrl()
      pdfError.value = null
      return
    }
    try {
      // For guitar we let chordsheetjs draw its own (six-string) diagrams — it
      // reserves layout space and paginates them correctly. For ukulele it has
      // no way to know the neck has four strings, so we suppress its diagrams
      // and prepend our own page below.
      const drawOwnDiagrams = showDiagrams && instrument === 'ukulele'
      const formatter = new PdfFormatter({
        layout: { chordDiagrams: { enabled: showDiagrams && instrument === 'guitar' } },
      } as unknown as ConstructorParameters<typeof PdfFormatter>[0])
      // chordsheetjs/pdf ships its own nominal copies of the AST classes and (a bug in its
      // .d.ts) types generatePDF as returning node's buffer Blob — cast across both seams.
      formatter.format(
        currentSong as unknown as Parameters<typeof formatter.format>[0],
        jsPDF as unknown as Parameters<typeof formatter.format>[1],
      )
      if (drawOwnDiagrams) {
        const wrapper = formatter.getDocumentWrapper()
        const shapes = diagramIndex.value?.shapes ?? []
        drawDiagramSheet(wrapper.doc as unknown as PdfDoc, wrapper.pageSize, shapes)
      }
      const blob = (await formatter.generatePDF()) as unknown as Blob
      revokePdfUrl()
      pdfUrl.value = URL.createObjectURL(blob)
      pdfError.value = null
    } catch (err) {
      revokePdfUrl()
      pdfError.value = err instanceof Error ? err.message : String(err)
    }
  },
  { immediate: true },
)

onBeforeUnmount(revokePdfUrl)

// --- Click a chord → show its diagram in a popover above it -------------------

const sheetBody = ref<HTMLElement | null>(null)
const activeChord = ref<{
  name: string
  shape: ReturnType<typeof findShape>
  anchor: AnchorRect
  el: HTMLElement
} | null>(null)

const containerWidth = computed(() => sheetBody.value?.clientWidth ?? 0)

function closePopover() {
  activeChord.value?.el.classList.remove('chord-open')
  activeChord.value = null
}

/** Open (or, on the already-open chord, toggle shut) the diagram popover. */
function openFor(el: HTMLElement, rawName: string) {
  const name = rawName.trim().replace(/^\[|\]$/g, '')
  if (!name) return
  if (activeChord.value?.el === el) {
    closePopover()
    return
  }
  closePopover()
  const container = sheetBody.value
  if (!container) return
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const anchor: AnchorRect = {
    top: r.top - c.top,
    bottom: r.bottom - c.top,
    centerX: r.left - c.left + r.width / 2,
  }
  const shape = diagramIndex.value ? findShape(diagramIndex.value, name) : null
  el.classList.add('chord-open')
  activeChord.value = { name, shape, anchor, el }
}

// The HTML table view is v-html, so its chord cells get a delegated handler.
function onSheetActivate(event: MouseEvent | KeyboardEvent) {
  if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return
  const cell = (event.target as HTMLElement).closest('td.chord') as HTMLElement | null
  if (!cell) return
  if (event instanceof KeyboardEvent) event.preventDefault()
  openFor(cell, cell.textContent ?? '')
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!activeChord.value) return
  const t = event.target as HTMLElement
  // The chord's own handler manages toggling; the popover is interactive.
  if (t.closest('.chord-popover') || t.closest('td.chord') || t.closest('.chord.clickable')) return
  closePopover()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePopover()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})

// A new song, view or instrument invalidates the anchored element / shape.
watch([song, () => store.viewFormat, () => store.instrument], closePopover)
</script>

<template>
  <div class="viewer">
    <header class="viewer-header">
      <span class="filename">{{ store.filename }}</span>
      <div class="viewer-controls">
        <label class="diagram-toggle">
          <input v-model="store.showDiagrams" type="checkbox" />
          Chord diagrams
        </label>
        <InstrumentSelector v-model="store.instrument" />
        <template v-if="store.showDiagrams && store.viewFormat !== 'pdf'">
          <DiagramPositionSelector v-model="store.diagramPosition" />
          <label class="diagram-toggle">
            <input v-model="store.pinDiagrams" type="checkbox" />
            Pin
          </label>
        </template>
        <ViewSelector v-model="store.viewFormat" />
        <ThemeSelector
          :model-value="theme.themeId"
          :custom-colors="theme.customColors"
          @update:model-value="theme.selectTheme"
        />
      </div>
      <button @click="store.reset()">Load another</button>
    </header>

    <CustomColorEditor v-if="theme.themeId === 'custom'" />

    <pre v-if="store.parseError" class="error">{{ store.parseError }}</pre>

    <div v-else-if="store.viewFormat === 'pdf'" class="pdf">
      <pre v-if="pdfError" class="error">{{ pdfError }}</pre>
      <template v-else-if="pdfUrl">
        <iframe :src="pdfUrl" title="PDF preview" class="pdf-frame" />
        <a :href="pdfUrl" :download="pdfFilename" class="download">Download PDF</a>
      </template>
      <p v-else class="loading">Generating PDF…</p>
    </div>

    <div
      v-else
      ref="sheetBody"
      class="sheet-body"
      :class="[`pos-${store.diagramPosition}`, { pinned: store.pinDiagrams }]"
    >
      <ChordDiagrams
        v-if="song && store.showDiagrams"
        :song="song"
        :instrument="store.instrument"
        :raw-text="store.rawText"
        :position="store.diagramPosition"
        :pinned="store.pinDiagrams"
      />
      <!-- v-html is safe: content comes from chordsheetjs formatter, not user-injected markup.
           Chord cells inside it are focusable (markChordCells) and handled by delegation. -->
      <div
        v-if="store.viewFormat === 'html'"
        class="sheet"
        @click="onSheetActivate"
        @keydown="onSheetActivate"
        v-html="html"
      />
      <InlineSheet
        v-else-if="song && store.viewFormat === 'html-inline'"
        :song="song"
        @chord-click="openFor"
      />
      <pre v-else class="plain">{{ text }}</pre>

      <ChordPopover
        v-if="activeChord"
        :name="activeChord.name"
        :shape="activeChord.shape"
        :anchor="activeChord.anchor"
        :container-width="containerWidth"
      />
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* Chord accent — sourced from the active theme. Inherits into
     ChordDiagram.vue too (custom properties pierce scoping). */
  --chord-accent: var(--sv-chord);
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--sv-divider);
}

.filename {
  font-weight: bold;
  color: var(--sv-meta);
}

.viewer-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.diagram-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--sv-lyrics);
  cursor: pointer;
}

button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

button:hover {
  background: var(--sv-surface-hover);
}

.error {
  color: var(--sv-error);
  white-space: pre-wrap;
  padding: 1rem;
  background: var(--sv-error-bg);
  border-radius: 4px;
}

.sheet-body {
  display: flex;
  gap: 1rem;
  min-width: 0;
  /* Positioning context for the click-to-peek chord popover. */
  position: relative;
}

.sheet-body.pos-top,
.sheet-body.pos-bottom {
  flex-direction: column;
}

.sheet-body.pos-right {
  flex-direction: row;
  align-items: flex-start;
}

.sheet-body > .sheet,
.sheet-body > .inline-sheet,
.sheet-body > .plain {
  flex: 1 1 auto;
  min-width: 0;
}

.plain {
  font-family: monospace;
  font-size: 1rem;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
  /* The ChordPro view emits undifferentiated text, so one colour applies. */
  color: var(--sv-lyrics);
}

.pdf {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pdf-frame {
  width: 100%;
  height: 75vh;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
}

.download {
  align-self: flex-start;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  border: 1px solid var(--sv-chord);
  border-radius: 4px;
  background: var(--sv-chord);
  color: var(--sv-on-accent);
  text-decoration: none;
}

.download:hover {
  opacity: 0.85;
}

.loading {
  color: var(--sv-comment);
  font-style: italic;
}

.sheet :deep(.chord-sheet) {
  font-family: monospace;
  font-size: 1rem;
}

.sheet :deep(.paragraph) {
  margin-bottom: 1.5rem;
}

.sheet :deep(table.row) {
  border-collapse: collapse;
}

.sheet :deep(td) {
  padding: 0;
  vertical-align: bottom;
  white-space: pre;
}

.sheet :deep(td.chord) {
  color: var(--chord-accent);
  font-weight: bold;
  padding-right: 0.25em;
}

.sheet :deep(td.chord[tabindex]) {
  cursor: pointer;
  border-radius: 3px;
}

.sheet :deep(td.chord[tabindex]:hover),
.sheet :deep(td.chord[tabindex]:focus-visible),
.sheet :deep(td.chord.chord-open) {
  background: var(--sv-surface-hover);
  outline: none;
}

.sheet :deep(td.lyrics) {
  color: var(--sv-lyrics);
  padding-right: 0.25em;
}

.sheet :deep(.comment) {
  color: var(--sv-comment);
  font-style: italic;
}
</style>
