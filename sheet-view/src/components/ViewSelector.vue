<script setup lang="ts">
import type { ViewFormat } from '@/stores/sheet'

const model = defineModel<ViewFormat>({ required: true })

const VIEWS: readonly { value: ViewFormat; label: string }[] = [
  { value: 'chordpro', label: 'ChordPro' },
  { value: 'text', label: 'Plain Text' },
  { value: 'chords-over-words', label: 'Chords over Words' },
  { value: 'html', label: 'HTML' },
  { value: 'pdf', label: 'PDF' },
]
</script>

<template>
  <div class="view-selector" role="radiogroup" aria-label="View format">
    <button
      v-for="view in VIEWS"
      :key="view.value"
      type="button"
      role="radio"
      :aria-checked="model === view.value"
      :class="{ active: model === view.value }"
      @click="model = view.value"
    >
      {{ view.label }}
    </button>
  </div>
</template>

<style scoped>
.view-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

button {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}

button.active {
  border-color: #42b883;
  background: #42b883;
  color: #fff;
}
</style>
