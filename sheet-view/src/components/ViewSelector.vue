<script setup lang="ts">
import type { ViewFormat } from '@/stores/sheet'
import RadioGroup from './RadioGroup.vue'

const model = defineModel<ViewFormat>({ required: true })

const VIEWS: readonly { value: ViewFormat; label: string }[] = [
  { value: 'chordpro', label: 'ChordPro' },
  { value: 'html', label: 'HTML' },
  { value: 'html-inline', label: 'HTML inline' },
  { value: 'pdf', label: 'PDF' },
]
</script>

<template>
  <RadioGroup
    v-model="model"
    class="view-selector"
    name="view-format"
    label="View format"
    :options="VIEWS"
  />
</template>
