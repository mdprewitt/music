<script setup lang="ts">
import type { Instrument } from '@/chords/types'
import { INSTRUMENTS, INSTRUMENT_IDS } from '@/chords/types'

const model = defineModel<Instrument>({ required: true })

const OPTIONS = INSTRUMENT_IDS.map((id) => ({ value: id, label: INSTRUMENTS[id].label }))
</script>

<template>
  <div class="instrument-selector" role="radiogroup" aria-label="Instrument">
    <button
      v-for="option in OPTIONS"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :class="{ active: model === option.value }"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.instrument-selector {
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
