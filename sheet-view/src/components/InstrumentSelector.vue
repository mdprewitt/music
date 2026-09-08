<script setup lang="ts">
import type { Instrument } from '@/chords/types'
import { INSTRUMENTS, INSTRUMENT_IDS } from '@/chords/types'
import RadioGroup from './RadioGroup.vue'

const model = defineModel<Instrument>({ required: true })

const OPTIONS: readonly { value: Instrument; label: string }[] = INSTRUMENT_IDS.map((id) => ({
  value: id,
  label: INSTRUMENTS[id].label,
}))
</script>

<template>
  <RadioGroup
    v-model="model"
    class="instrument-selector"
    name="instrument"
    label="Instrument"
    :options="OPTIONS"
  />
</template>
