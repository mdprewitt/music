<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from 'chordsheetjs'
import type { DiagramPosition, Instrument } from '@/chords/types'
import { resolveDiagramChords } from '@/chords/definitions'
import { toDiagramShape } from '@/chords/diagram'
import ChordDiagram from './ChordDiagram.vue'

const props = defineProps<{
  song: Song
  instrument: Instrument
  rawText?: string | null
  position?: DiagramPosition
  pinned?: boolean
}>()

const shapes = computed(() =>
  resolveDiagramChords(props.song, props.instrument, props.rawText ?? null)
    .filter((resolved) => resolved.definition !== null)
    .map((resolved) => toDiagramShape(resolved.definition!)),
)
</script>

<template>
  <div
    v-if="shapes.length"
    class="chord-diagrams"
    :class="[`pos-${position ?? 'top'}`, { pinned }]"
    aria-label="Chord diagrams"
  >
    <ChordDiagram v-for="shape in shapes" :key="shape.name" :shape="shape" />
  </div>
</template>

<style scoped>
.chord-diagrams {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

/* The strip stays first in the DOM; `order` moves it visually so the chart
   markup is not duplicated in SheetViewer. Border colour matches .viewer-header. */
.chord-diagrams.pos-top {
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.chord-diagrams.pos-bottom {
  order: 1;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #eee;
}

.chord-diagrams.pos-right {
  order: 1;
  flex: 0 0 auto;
  width: 6.5rem;
  align-content: flex-start;
  padding-left: 1rem;
  border-left: 1px solid #eee;
}

/* Pinned: the strip holds its place (against the window scroll) while the chart
   scrolls past. An opaque background keeps chart text from showing through the
   top/bottom strips; the right strip is beside the chart so it needs none. */
.chord-diagrams.pinned {
  position: sticky;
  z-index: 1;
}

.chord-diagrams.pinned.pos-top {
  top: 0;
  background: var(--color-background);
}

.chord-diagrams.pinned.pos-bottom {
  bottom: 0;
  background: var(--color-background);
}

.chord-diagrams.pinned.pos-right {
  top: 0;
  align-self: flex-start;
}
</style>
