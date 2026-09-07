<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import type { ThemeColors } from '@/theme/types'

const theme = useThemeStore()

const SLOTS: readonly { key: keyof ThemeColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'lyrics', label: 'Lyrics' },
  { key: 'chord', label: 'Chords' },
  { key: 'comment', label: 'Comments' },
  { key: 'meta', label: 'Title' },
]
</script>

<template>
  <div class="custom-color-editor">
    <label v-for="slot in SLOTS" :key="slot.key" class="slot">
      <input v-model="theme.customColors[slot.key]" type="color" :aria-label="slot.label" />
      {{ slot.label }}
    </label>
    <button type="button" @click="theme.resetCustom()">Reset to Light</button>
  </div>
</template>

<style scoped>
.custom-color-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.5rem 0;
}

.slot {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--sv-lyrics);
  cursor: pointer;
}

input[type='color'] {
  width: 2rem;
  height: 1.6rem;
  padding: 0;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
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
</style>
