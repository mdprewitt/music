<script setup lang="ts">
import type { Instrument } from '@/chords/types'
import { INSTRUMENTS, INSTRUMENT_IDS, INSTRUMENT_FAMILIES } from '@/chords/types'
import RadioGroup from './RadioGroup.vue'

const model = defineModel<Instrument>({ required: true })

// One option list per family. Every group shares name="instrument", so the
// browser treats all the radios as a single choice with one tab stop even
// though they sit in separate <fieldset>s. Families with no members are
// dropped.
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
    <RadioGroup
      v-for="group in GROUPS"
      :key="group.id"
      v-model="model"
      name="instrument"
      :label="group.label"
      :options="group.options"
      captioned
    />
  </div>
</template>

<style scoped>
.instrument-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
