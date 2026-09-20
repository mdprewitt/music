<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import type { ThemeColors } from '@/theme/types'
import { AA_TEXT, contrastRatio } from '@/theme/contrast'

const theme = useThemeStore()

const SLOTS: readonly { key: keyof ThemeColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'lyrics', label: 'Lyrics' },
  { key: 'chord', label: 'Chords' },
  { key: 'comment', label: 'Comments' },
  { key: 'meta', label: 'Title' },
]

// Contrast against the background for the four text colours — a custom
// palette has no built-in guard against an unreadable pairing the way the
// four presets do (src/theme/__tests__/contrast.spec.ts), so this is the
// user's own feedback loop instead (WCAG 1.4.3). Advisory only: picking a
// low-contrast combination stays entirely the user's call.
const ratios = computed(() => {
  const { background } = theme.customColors
  return Object.fromEntries(
    SLOTS.filter((slot) => slot.key !== 'background').map((slot) => [
      slot.key,
      contrastRatio(theme.customColors[slot.key], background),
    ]),
  ) as Record<Exclude<keyof ThemeColors, 'background'>, number>
})
</script>

<template>
  <div class="custom-color-editor">
    <label v-for="slot in SLOTS" :key="slot.key" class="slot">
      <!-- @change, not v-model: a native colour picker fires `input` continuously
           while dragging, and each one trips a synchronous localStorage write. -->
      <input
        :value="theme.customColors[slot.key]"
        type="color"
        :aria-label="slot.label"
        @change="theme.customColors[slot.key] = ($event.target as HTMLInputElement).value"
      />
      {{ slot.label }}
      <span
        v-if="slot.key !== 'background'"
        class="ratio"
        :class="{ low: ratios[slot.key] < AA_TEXT }"
      >
        <!-- Colour alone never carries the warning (WCAG 1.4.1) — the glyph
             and, for AT, the sr-only text both do too. -->
        <span v-if="ratios[slot.key] < AA_TEXT" aria-hidden="true">⚠ </span>
        {{ ratios[slot.key].toFixed(1) }}:1
        <span v-if="ratios[slot.key] < AA_TEXT" class="sr-only">
          — low contrast against the background; {{ AA_TEXT }}:1 is the minimum for readable text
        </span>
      </span>
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

.ratio {
  font-size: 0.75rem;
  color: var(--sv-comment);
  font-variant-numeric: tabular-nums;
}

.ratio.low {
  color: var(--sv-error);
  font-weight: 600;
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
