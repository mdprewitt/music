<script setup lang="ts">
import type { DiagramPosition } from '@/chords/types'
import { DIAGRAM_POSITIONS } from '@/chords/types'

const model = defineModel<DiagramPosition>({ required: true })
</script>

<template>
  <div class="position-selector" role="radiogroup" aria-label="Chord diagram position">
    <button
      v-for="option in DIAGRAM_POSITIONS"
      :key="option.id"
      type="button"
      role="radio"
      :aria-checked="model === option.id"
      :class="{ active: model === option.id }"
      @click="model = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.position-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

button {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

button:hover {
  background: var(--sv-surface-hover);
}

button.active {
  border-color: var(--sv-chord);
  background: var(--sv-chord);
  color: var(--sv-on-accent);
}
</style>
