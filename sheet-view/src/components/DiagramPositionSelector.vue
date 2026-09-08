<script setup lang="ts">
import type { DiagramPosition } from '@/chords/types'
import { DIAGRAM_POSITIONS } from '@/chords/types'
import RadioGroup from './RadioGroup.vue'

const model = defineModel<DiagramPosition>({ required: true })

const OPTIONS: readonly { value: DiagramPosition; label: string }[] = DIAGRAM_POSITIONS.map((p) => ({
  value: p.id,
  label: p.label,
}))
</script>

<template>
  <RadioGroup
    v-model="model"
    class="position-selector"
    name="diagram-position"
    label="Chord diagram position"
    :options="OPTIONS"
  />
</template>
