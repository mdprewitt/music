<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import {
  ChordProFormatter,
  ChordsOverWordsFormatter,
  HtmlTableFormatter,
  TextFormatter,
  type Song,
} from 'chordsheetjs'
import { PdfFormatter } from 'chordsheetjs/pdf'
import { jsPDF } from 'jspdf'
import { useSheetStore } from '@/stores/sheet'
import { resolveDiagramChords } from '@/chords/definitions'
import { toDiagramShape } from '@/chords/diagram'
import { drawDiagramSheet, type PdfDoc } from '@/chords/pdf'
import ViewSelector from './ViewSelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import ChordDiagrams from './ChordDiagrams.vue'

const store = useSheetStore()
// store.song is markRaw(Song), but Pinia's UnwrapRef loses class fidelity — cast back to Song
const song = computed(() => (store.song ? (store.song as Song) : null))

const html = computed(() => (song.value ? new HtmlTableFormatter().format(song.value) : ''))

const text = computed(() => {
  if (!song.value) return ''
  switch (store.viewFormat) {
    case 'chordpro':
      return new ChordProFormatter().format(song.value)
    case 'text':
      return new TextFormatter().format(song.value)
    case 'chords-over-words':
      return new ChordsOverWordsFormatter().format(song.value)
    default:
      return ''
  }
})

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
        const shapes = resolveDiagramChords(currentSong, instrument, store.rawText)
          .filter((resolved) => resolved.definition !== null)
          .map((resolved) => toDiagramShape(resolved.definition!))
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
        <DiagramPositionSelector
          v-if="store.showDiagrams && store.viewFormat !== 'pdf'"
          v-model="store.diagramPosition"
        />
        <ViewSelector v-model="store.viewFormat" />
      </div>
      <button @click="store.reset()">Load another</button>
    </header>

    <pre v-if="store.parseError" class="error">{{ store.parseError }}</pre>

    <div v-else-if="store.viewFormat === 'pdf'" class="pdf">
      <pre v-if="pdfError" class="error">{{ pdfError }}</pre>
      <template v-else-if="pdfUrl">
        <iframe :src="pdfUrl" title="PDF preview" class="pdf-frame" />
        <a :href="pdfUrl" :download="pdfFilename" class="download">Download PDF</a>
      </template>
      <p v-else class="loading">Generating PDF…</p>
    </div>

    <div v-else class="sheet-body" :class="`pos-${store.diagramPosition}`">
      <ChordDiagrams
        v-if="song && store.showDiagrams"
        :song="song"
        :instrument="store.instrument"
        :raw-text="store.rawText"
        :position="store.diagramPosition"
      />
      <!-- v-html is safe: content comes from chordsheetjs formatter, not user-injected markup -->
      <div v-if="store.viewFormat === 'html'" class="sheet" v-html="html" />
      <pre v-else class="plain">{{ text }}</pre>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* chord accent — brighter on dark so chord names stay legible.
     Inherits into ChordDiagram.vue too (custom properties pierce scoping). */
  --chord-accent: #42b883;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.filename {
  font-weight: bold;
  color: #333;
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
  color: #333;
  cursor: pointer;
}

button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}

.error {
  color: #c0392b;
  white-space: pre-wrap;
  padding: 1rem;
  background: #fdf0ee;
  border-radius: 4px;
}

.sheet-body {
  display: flex;
  gap: 1rem;
  min-width: 0;
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
}

.pdf {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pdf-frame {
  width: 100%;
  height: 75vh;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.download {
  align-self: flex-start;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #42b883;
  border-radius: 4px;
  background: #42b883;
  color: #fff;
  text-decoration: none;
}

.download:hover {
  background: #33a06f;
}

.loading {
  color: #888;
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

.sheet :deep(td.lyrics) {
  padding-right: 0.25em;
}

.sheet :deep(.comment) {
  color: #888;
  font-style: italic;
}

/* Dark-mode overrides — must follow the base rules above so equal-specificity
   selectors win on source order. */
@media (prefers-color-scheme: dark) {
  .viewer {
    --chord-accent: #5fd39e;
  }

  .filename {
    color: #eee;
  }

  .diagram-toggle {
    color: #ddd;
  }
}
</style>
