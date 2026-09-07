<script setup lang="ts">
import type { ViewFormat } from '@/stores/sheet'

const model = defineModel<ViewFormat>({ required: true })

const VIEWS: readonly { value: ViewFormat; label: string }[] = [
  { value: 'chordpro', label: 'ChordPro' },
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
