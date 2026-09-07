<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from 'chordsheetjs'
import type { Instrument } from '@/chords/types'
import { resolveDiagramChords } from '@/chords/definitions'
import { toDiagramShape } from '@/chords/diagram'
import ChordDiagram from './ChordDiagram.vue'

const props = defineProps<{
  song: Song
  instrument: Instrument
  rawText?: string | null
}>()

const shapes = computed(() =>
  resolveDiagramChords(props.song, props.instrument, props.rawText ?? null)
    .filter((resolved) => resolved.definition !== null)
    .map((resolved) => toDiagramShape(resolved.definition!)),
)
</script>

<template>
  <div v-if="shapes.length" class="chord-diagrams" aria-label="Chord diagrams">
    <ChordDiagram v-for="shape in shapes" :key="shape.name" :shape="shape" />
  </div>
</template>

<style scoped>
.chord-diagrams {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #eee;
}
</style>
