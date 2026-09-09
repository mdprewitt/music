<script setup lang="ts">
import type { Instrument } from '@/chords/types'
import { INSTRUMENTS, INSTRUMENT_IDS, INSTRUMENT_FAMILIES } from '@/chords/types'

// A <select>, not the radiogroup the other selectors use: thirteen tunings is
// too many pill buttons for the header row (same call as KeySelector).
const model = defineModel<Instrument>({ required: true })

// One <optgroup> per family. Options stay in INSTRUMENT_IDS registry order (the
// registry is grouped by family), so the picker never re-sorts. Empty families
// are dropped.
const GROUPS = INSTRUMENT_FAMILIES.map((family) => ({
  ...family,
  options: INSTRUMENT_IDS.filter((id) => INSTRUMENTS[id].family === family.id).map((id) => ({
    value: id,
    label: INSTRUMENTS[id].label,
  })),
})).filter((group) => group.options.length > 0)
</script>

<template>
  <div class="instrument-selector">
    <span class="instrument-label">Instrument</span>
    <select v-model="model" aria-label="Instrument">
      <optgroup v-for="group in GROUPS" :key="group.id" :label="group.label">
        <option v-for="opt in group.options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </optgroup>
    </select>
  </div>
</template>

<style scoped>
.instrument-selector {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.instrument-label {
  font-size: 0.85rem;
  color: var(--sv-lyrics);
}

select {
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}
</style>
