<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, useId } from 'vue'
import { ChordProFormatter, HtmlDivFormatter, type Song } from 'chordsheetjs'
import { PdfFormatter } from 'chordsheetjs/pdf'
import { jsPDF } from 'jspdf'
import { useSheetStore } from '@/stores/sheet'
import { useAnnouncerStore } from '@/stores/announcer'
import { buildDiagramIndex, findShape } from '@/chords/shapes'
import { describeShape } from '@/chords/diagram'
import { INSTRUMENTS } from '@/chords/types'
import { drawDiagramSheet, type PdfDoc } from '@/chords/pdf'
import { markChordCells } from '@/sheet/interactive'
import { handleRovingArrowKey } from '@/sheet/rovingFocus'
import ViewSelector from './ViewSelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import KeySelector from './KeySelector.vue'
import DisplayPanel from './DisplayPanel.vue'
import ChordDiagrams from './ChordDiagrams.vue'
import InlineSheet from './InlineSheet.vue'
import ChordPopover, { type AnchorRect } from './ChordPopover.vue'

const store = useSheetStore()
const announcer = useAnnouncerStore()
// store.displaySong is store.song, or a re-keyed copy when a target key is set.
// It is markRaw(Song), but Pinia's UnwrapRef loses class fidelity — cast back.
const song = computed(() => (store.displaySong ? (store.displaySong as Song) : null))

// Names the arrow-key convention (WCAG 2.4.3) for both HTML views' roving tab
// stop — see the .sr-only <p> in the template.
const chordNavHintId = useId()

// The formatter output is untrusted markup (HtmlDivFormatter does not escape
// chart text). markChordCells sanitizes it to a safe element/attribute set
// before it is inserted via v-html, and adds tabindex/role to the chord cells
// so they can be focused and activated from the keyboard.
//
// HtmlDivFormatter (not HtmlTableFormatter): each line is a `.row` of
// self-contained `.column` (chord-over-lyric) units, so `flex-wrap` lets a long
// line fold on a narrow screen with every chord still above its own word. The
// table formatter emits one un-wrappable `<table>` per line and overflows.
const html = computed(() =>
  song.value ? markChordCells(new HtmlDivFormatter().format(song.value)) : '',
)

// One resolution pass per (song, instrument) — feeds both the click-to-peek
// popover here and (via the same helper) the always-on diagram strip.
// `song.value` is the re-keyed display song, but `rawText` is the pristine
// source: its `{define}` blocks are keyed by the original chord names, so after
// a key change a user-defined shape falls through to the library resolver like
// any other chord. Fine — the common case has no `{define}`s.
const diagramIndex = computed(() =>
  song.value ? buildDiagramIndex(song.value, store.instrument, store.rawText) : null,
)

const text = computed(() =>
  song.value && store.viewFormat === 'chordpro' ? new ChordProFormatter().format(song.value) : '',
)

const pdfUrl = ref<string | null>(null)
const pdfError = ref<string | null>(null)
// Guards the async PDF build: `pdfRunId` invalidates an earlier run when a
// newer one starts (rapid instrument/key/view toggles), `disposed` stops a run
// that resolves after the component has unmounted. Either way the stale run
// must not revoke the live URL or install its own blob.
let pdfRunId = 0
let disposed = false

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
    const runId = ++pdfRunId
    announcer.announce('Generating PDF…')
    try {
      // chordsheetjs' own diagram renderer hard-codes a six-string neck, so we
      // only let it draw for instruments whose shapes come from its bundled
      // library (guitar) — it reserves layout space and paginates them. For
      // everything else we suppress its diagrams and prepend our own page below.
      const drawsOwn = INSTRUMENTS[instrument].diagrams === 'builtin'
      const drawOwnDiagrams = showDiagrams && drawsOwn
      const formatter = new PdfFormatter({
        layout: { chordDiagrams: { enabled: showDiagrams && !drawsOwn } },
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
      // A newer run superseded this one, or we unmounted while it ran.
      if (runId !== pdfRunId || disposed) return
      revokePdfUrl()
      pdfUrl.value = URL.createObjectURL(blob)
      pdfError.value = null
      announcer.announce('PDF ready')
    } catch (err) {
      if (runId !== pdfRunId || disposed) return
      revokePdfUrl()
      pdfError.value = err instanceof Error ? err.message : String(err)
      announcer.announce(pdfError.value)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  disposed = true
  revokePdfUrl()
})

// Announce header changes that silently re-render the whole chart (WCAG
// 4.1.3). Safe to watch from here rather than a persistent ancestor: this
// component only (re)mounts once store.parse() has already applied any
// autodetected instrument / restored key for this sheet, so each watcher's
// baseline already reflects that value and only fires for a genuine change
// the reader makes afterwards (an instrument/key picked, or the "back to
// original key" ↺ button, which also sets targetKey to null).
watch(
  () => store.instrument,
  (value) => announcer.announce(`Instrument: ${INSTRUMENTS[value].label}`),
)
watch(
  () => store.targetKey,
  (value) => {
    const key = value ?? store.originalKey
    if (key) announcer.announce(`Key: ${key}${value === null ? ' (original)' : ''}`)
  },
)

// --- Keep a focused chord from landing under the pinned diagram strip -------

// Only pos-top/pos-bottom overlay the chart when pinned (position: sticky);
// pos-right sits beside it. Measured (not a fixed guess) because the strip's
// height varies with instrument/shape count and how many diagrams wrap.
const diagramsRef = ref<InstanceType<typeof ChordDiagrams> | null>(null)
const pinnedStripSize = ref(0)
let stripResizeObserver: ResizeObserver | null = null

watch(
  diagramsRef,
  (instance) => {
    stripResizeObserver?.disconnect()
    stripResizeObserver = null
    const el = instance?.el
    // jsdom lacks ResizeObserver (as it lacks matchMedia) — guard it, same
    // idiom as DisplayPanel.vue's own measure-and-clamp ResizeObserver.
    if (!el || typeof ResizeObserver === 'undefined') {
      pinnedStripSize.value = 0
      return
    }
    // getBoundingClientRect() (border-box), not entries[0].contentRect
    // (content-box only) — the strip's own padding/border are still part of
    // what visually overlaps the chart underneath it once pinned.
    stripResizeObserver = new ResizeObserver(() => {
      pinnedStripSize.value = el.getBoundingClientRect().height
    })
    stripResizeObserver.observe(el)
  },
  { immediate: true },
)

const pinnedGapStyle = computed(() => {
  const pinnedOverlay = store.pinDiagrams && store.diagramPosition !== 'right'
  return pinnedOverlay ? { '--pinned-strip-size': `${pinnedStripSize.value}px` } : {}
})

onBeforeUnmount(() => stripResizeObserver?.disconnect())

// --- Click a chord → show its diagram in a popover above it -------------------

const sheetBody = ref<HTMLElement | null>(null)
const activeChord = ref<{
  name: string
  shape: ReturnType<typeof findShape>
  anchor: AnchorRect
  el: HTMLElement
} | null>(null)

const containerWidth = computed(() => sheetBody.value?.clientWidth ?? 0)

// One popover can ever be open at a time, so one stable id — set as the
// ChordPopover's `id` and pointed at by the open chord's `aria-controls` —
// is enough (WCAG 4.1.2: the popover was previously unreachable from the
// triggering chord's accessibility-tree state).
const popoverId = useId()

function closePopover() {
  const el = activeChord.value?.el
  el?.classList.remove('chord-open')
  el?.setAttribute('aria-expanded', 'false')
  el?.removeAttribute('aria-controls')
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
  el.setAttribute('aria-expanded', 'true')
  el.setAttribute('aria-controls', popoverId)
  activeChord.value = { name, shape, anchor, el }
  // The popover itself (role="group") isn't focused and isn't announced on
  // its own, so this is what actually gets the fingering to a screen-reader
  // user (WCAG 4.1.3) — same text ChordDiagram.vue puts in its aria-label.
  announcer.announce(
    shape ? `${name} chord diagram. ${describeShape(shape)}` : `${name}: no diagram for this instrument.`,
  )
}

// The HTML div view is v-html, so its chord cells get a delegated handler:
// Enter/Space opens the diagram popover, the arrow keys/Home/End move the
// roving tab stop `markChordCells()` seeds (WCAG 2.4.3).
function onSheetActivate(event: MouseEvent | KeyboardEvent) {
  const cell = (event.target as HTMLElement).closest('.chord[role="button"]') as HTMLElement | null
  if (!cell) return
  if (event instanceof KeyboardEvent) {
    const container = cell.closest('.sheet')
    if (container) {
      const cells = Array.from(container.querySelectorAll<HTMLElement>('.chord[role="button"]'))
      if (handleRovingArrowKey(event, cells, cell)) return
    }
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
  }
  openFor(cell, cell.textContent ?? '')
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!activeChord.value) return
  const t = event.target as HTMLElement
  // The chord's own handler manages toggling; the popover is interactive.
  // `.chord` covers both the div view's cells and InlineSheet's clickable spans.
  if (t.closest('.chord-popover') || t.closest('.chord')) return
  closePopover()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePopover()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  // The anchor is a snapshot of getBoundingClientRect at click time; any reflow
  // strands it, so drop the popover rather than let it float over other lyrics.
  window.addEventListener('resize', closePopover)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', closePopover)
})

// Anything that re-lays out the chart under the popover invalidates its anchor:
// a new song/view/instrument, and toggling or repositioning the diagram strip.
watch(
  [
    song,
    () => store.viewFormat,
    () => store.instrument,
    () => store.showDiagrams,
    () => store.diagramPosition,
  ],
  closePopover,
)
</script>

<template>
  <div class="viewer">
    <header class="viewer-header">
      <span class="filename">{{ store.filename }}</span>
      <div class="viewer-controls">
        <ViewSelector v-model="store.viewFormat" />
        <InstrumentSelector v-model="store.instrument" />
        <KeySelector
          v-model="store.targetKey"
          :keys="store.availableKeys"
          :original-key="store.originalKey"
        />
        <label class="diagram-toggle">
          <input v-model="store.showDiagrams" type="checkbox" />
          Diagrams
        </label>
        <DisplayPanel />
      </div>
      <button @click="store.reset()">Load another</button>
    </header>

    <pre v-if="store.parseError" class="error" role="alert">{{ store.parseError }}</pre>

    <div v-else-if="store.viewFormat === 'pdf'" class="pdf" :aria-busy="!pdfError && !pdfUrl">
      <pre v-if="pdfError" class="error" role="alert">{{ pdfError }}</pre>
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
      :style="pinnedGapStyle"
    >
      <ChordDiagrams
        v-if="song && store.showDiagrams"
        ref="diagramsRef"
        :shapes="diagramIndex?.shapes ?? []"
        :position="store.diagramPosition"
        :pinned="store.pinDiagrams"
      />
      <!-- Every chord is one roving tab stop (WCAG 2.4.3) — chordNavHintId
           names the arrow-key convention for whoever tabs onto it. -->
      <p v-if="song" :id="chordNavHintId" class="sr-only">
        Use the arrow keys to move between chords. Press Enter or Space to view a chord's
        diagram.
      </p>
      <!-- v-html input is sanitized by markChordCells (formatter output is untrusted
           chart text). Chord cells inside it are focusable and handled by delegation. -->
      <div
        v-if="store.viewFormat === 'html'"
        class="sheet"
        role="group"
        :aria-describedby="chordNavHintId"
        @click="onSheetActivate"
        @keydown="onSheetActivate"
        v-html="html"
      />
      <InlineSheet
        v-else-if="song && store.viewFormat === 'html-inline'"
        :song="song"
        :nav-hint-id="chordNavHintId"
        @chord-click="openFor"
      />
      <pre v-else class="plain">{{ text }}</pre>

      <ChordPopover
        v-if="activeChord"
        :id="popoverId"
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

/* HtmlDivFormatter: `.row` = one chart line, a flex track of `.column`
   (chord-over-lyric) units. `flex-wrap` folds a line too wide for the viewport
   while each chord stays glued to its own word. */
.sheet :deep(.row) {
  display: flex;
  flex-wrap: wrap;
  /* flex-start, not flex-end: a column whose lyric wraps internally hangs down
     without dragging its neighbours off the line. */
  align-items: flex-start;
}

.sheet :deep(.row) > * {
  flex: 0 1 auto;
  min-width: 0;
}

.sheet :deep(.column) {
  display: flex;
  flex-direction: column;
}

.sheet :deep(.chord) {
  color: var(--chord-accent);
  font-weight: bold;
  padding-right: 0.25em;
  white-space: nowrap;
}

/* The formatter emits chord-less columns as an empty `.chord` div. Without a
   line box of its own the lyric below it rides up out of line with its row. */
.sheet :deep(.chord:empty)::after {
  content: '\200b';
}

.sheet :deep(.chord[tabindex]) {
  cursor: pointer;
  border-radius: 3px;
  /* --pinned-strip-size (set on .sheet-body by SheetViewer.vue, measured off
     the actual ChordDiagrams strip) keeps a focused chord from landing under
     the pinned (position: sticky) strip when it's at the top or bottom
     (WCAG 2.4.11). :deep() also reaches InlineSheet.vue's chord spans, which
     share this same block. */
  scroll-margin-block: var(--pinned-strip-size, 0px);
}

/* Hover, keyboard focus and "diagram open" are three distinct states and must
   stay visually distinguishable (WCAG 1.4.1) — none of them suppresses the
   shared `:focus-visible` ring from base.css. Hover and open share the same
   background tint but "open" also gets a persistent underline so it doesn't
   read as colour-only once focus moves elsewhere. */
.sheet :deep(.chord[tabindex]:hover),
.sheet :deep(.chord.chord-open) {
  background: var(--sv-surface-hover);
}

.sheet :deep(.chord.chord-open) {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}

.sheet :deep(.annotation) {
  color: var(--chord-accent);
  font-style: italic;
  padding-right: 0.25em;
  white-space: nowrap;
}

.sheet :deep(.lyrics) {
  color: var(--sv-lyrics);
  padding-right: 0.25em;
  /* Keep the chart's own spacing but let a long chord-less chunk wrap;
     `anywhere` is the backstop for one unbroken run — as in InlineSheet.vue. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sheet :deep(.comment) {
  color: var(--sv-comment);
  font-style: italic;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
