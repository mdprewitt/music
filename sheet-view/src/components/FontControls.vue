<script setup lang="ts">
import { computed } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useAnnouncerStore } from '@/stores/announcer'
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  SHEET_FONTS,
  stepFontScale,
  type SheetFontId,
} from '@/sheet/typography'
import RadioGroup from './RadioGroup.vue'

const store = useSheetStore()
const announcer = useAnnouncerStore()

const percent = computed(() => `${Math.round(store.fontScale * 100)}%`)
const atMin = computed(() => store.fontScale <= (FONT_SCALES[0] ?? DEFAULT_FONT_SCALE))
const atMax = computed(
  () => store.fontScale >= (FONT_SCALES[FONT_SCALES.length - 1] ?? DEFAULT_FONT_SCALE),
)

function setScale(value: number) {
  store.fontScale = value
  void announcer.announce(`Text size ${Math.round(value * 100)}%`)
}

const fontOptions = SHEET_FONTS.map((font) => ({
  value: font.id as SheetFontId,
  label: font.label,
  stack: font.stack,
}))
</script>

<template>
  <div class="font-controls">
    <div class="size-row">
      <button type="button" :disabled="atMin" @click="setScale(stepFontScale(store.fontScale, -1))">
        <span aria-hidden="true">A−</span>
        <span class="sr-only">Smaller text</span>
      </button>
      <output class="size-readout" aria-label="Text size">{{ percent }}</output>
      <button type="button" :disabled="atMax" @click="setScale(stepFontScale(store.fontScale, 1))">
        <span aria-hidden="true">A+</span>
        <span class="sr-only">Larger text</span>
      </button>
      <button
        type="button"
        :disabled="store.fontScale === DEFAULT_FONT_SCALE"
        @click="setScale(DEFAULT_FONT_SCALE)"
      >
        Reset
      </button>
    </div>
    <RadioGroup v-model="store.sheetFont" name="sheet-font" label="Chart font" :options="fontOptions">
      <template #option="{ option }">
        <span :style="{ fontFamily: option.stack }">{{ option.label }}</span>
      </template>
    </RadioGroup>
  </div>
</template>

<style scoped>
.font-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.size-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.size-row button {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

.size-row button:hover:not(:disabled) {
  background: var(--sv-surface-hover);
}

.size-row button:disabled {
  opacity: 0.5;
  cursor: default;
}

.size-readout {
  min-width: 3.2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--sv-lyrics);
}
</style>
