<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeColors, ThemeId } from '@/theme/types'
import { THEME_PRESETS } from '@/theme/presets'

const model = defineModel<ThemeId>({ required: true })

// The custom palette lives in the theme store; pass it in so this component
// stays store-free and easy to mount in isolation.
const props = defineProps<{ customColors: ThemeColors }>()

const OPTIONS = computed<{ id: ThemeId; label: string; colors: ThemeColors }[]>(() => [
  ...Object.values(THEME_PRESETS).map((preset) => ({
    id: preset.id as ThemeId,
    label: preset.label,
    colors: preset.colors,
  })),
  { id: 'custom', label: 'Custom', colors: props.customColors },
])
</script>

<template>
  <div class="theme-selector" role="radiogroup" aria-label="Colour theme">
    <button
      v-for="option in OPTIONS"
      :key="option.id"
      type="button"
      role="radio"
      :aria-checked="model === option.id"
      :class="{ active: model === option.id }"
      @click="model = option.id"
    >
      <span
        class="swatch"
        :style="{ background: option.colors.background, borderColor: option.colors.chord }"
        aria-hidden="true"
      />
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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

.swatch {
  display: inline-block;
  width: 0.85rem;
  height: 0.85rem;
  border: 1px solid;
  border-radius: 3px;
}
</style>
