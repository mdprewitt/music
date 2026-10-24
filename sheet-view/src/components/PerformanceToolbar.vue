<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useAnnouncerStore } from '@/stores/announcer'
import { DEFAULT_FONT_SCALE, FONT_SCALES, stepFontScale } from '@/sheet/typography'

// Performance mode's bottom bar, built for a tablet on a music stand: a big
// "scroll down" button at the far left and "scroll up" at the far right, with
// the controls you reach for mid-song (key, text size, diagrams, settings) in
// between. It stays put — a bar that hid on scroll would vanish under the
// very button that scrolls.
const emit = defineEmits<{
  /** Scroll about a screen: 1 = down the page, -1 = up. */
  turn: [direction: 1 | -1]
  'open-settings': []
}>()

const store = useSheetStore()
const announcer = useAnnouncerStore()

const root = ref<HTMLElement | null>(null)
defineExpose({ el: root })

// --- Key stepper ------------------------------------------------------------
const currentKey = computed(() => store.targetKey ?? store.originalKey)
const keyIndex = computed(() =>
  currentKey.value ? store.availableKeys.indexOf(currentKey.value) : -1,
)
const transposed = computed(() => store.targetKey !== null && store.targetKey !== store.originalKey)
const canStepKey = computed(() => store.originalKey !== null && keyIndex.value >= 0)

function stepKey(delta: 1 | -1) {
  const next = store.availableKeys[keyIndex.value + delta]
  if (next === undefined) return
  // The original key is stored as "no transpose" (null), like KeySelector.vue.
  store.targetKey = next === store.originalKey ? null : next
}

// --- Text size ----------------------------------------------------------------
const percent = computed(() => `${Math.round(store.fontScale * 100)}%`)
const atMin = computed(() => store.fontScale <= (FONT_SCALES[0] ?? DEFAULT_FONT_SCALE))
const atMax = computed(
  () => store.fontScale >= (FONT_SCALES[FONT_SCALES.length - 1] ?? DEFAULT_FONT_SCALE),
)
// Window scrolling doesn't move the PDF iframe, and text size doesn't apply to it.
const inPdf = computed(() => store.viewFormat === 'pdf')

function stepScale(direction: 1 | -1) {
  store.fontScale = stepFontScale(store.fontScale, direction)
  announcer.announce(`Text size ${Math.round(store.fontScale * 100)}%`)
}
</script>

<template>
  <div ref="root" class="perf-toolbar" role="toolbar" aria-label="Performance controls">
    <div class="bar">
      <button v-if="!inPdf" type="button" class="scroll-btn" @click="emit('turn', 1)">
        <span aria-hidden="true">▼</span><span class="sr-only">Scroll down</span>
      </button>

      <div class="middle">
        <div class="group" role="group" aria-label="Key">
          <button type="button" :disabled="!canStepKey || keyIndex <= 0" @click="stepKey(-1)">
            <span aria-hidden="true">♭</span><span class="sr-only">Key down</span>
          </button>
          <output class="readout" aria-label="Current key">
            <template v-if="store.originalKey !== null">{{ currentKey }}</template>
            <template v-else>No key</template>
          </output>
          <button
            type="button"
            :disabled="!canStepKey || keyIndex >= store.availableKeys.length - 1"
            @click="stepKey(1)"
          >
            <span aria-hidden="true">♯</span><span class="sr-only">Key up</span>
          </button>
          <button
            v-if="transposed"
            type="button"
            :aria-label="`Back to ${store.originalKey}`"
            @click="store.targetKey = null"
          >
            ↺
          </button>
        </div>

        <div v-if="!inPdf" class="group" role="group" aria-label="Text size">
          <button type="button" :disabled="atMin" @click="stepScale(-1)">
            <span aria-hidden="true">A−</span><span class="sr-only">Smaller text</span>
          </button>
          <output class="readout" aria-label="Text size">{{ percent }}</output>
          <button type="button" :disabled="atMax" @click="stepScale(1)">
            <span aria-hidden="true">A+</span><span class="sr-only">Larger text</span>
          </button>
        </div>

        <label class="toggle" :class="{ active: store.showDiagrams }">
          <input v-model="store.showDiagrams" type="checkbox" />
          Diagrams
        </label>

        <button type="button" aria-haspopup="dialog" @click="emit('open-settings')">
          <span aria-hidden="true">⚙</span> Settings
        </button>
      </div>

      <button v-if="!inPdf" type="button" class="scroll-btn" @click="emit('turn', -1)">
        <span aria-hidden="true">▲</span><span class="sr-only">Scroll up</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.perf-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: var(--sv-background);
  border-top: 1px solid var(--sv-border);
  box-shadow: 0 -2px 8px var(--sv-overlay);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bar {
  max-width: 900px;
  margin: 0 auto;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.75rem;
}

.middle {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 1rem;
}

.group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Thumb targets. */
button,
.toggle {
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0.3rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--sv-border);
  border-radius: 6px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: var(--sv-surface-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

/* The two page buttons are the point of the mode: tall, wide, at the extremes. */
.scroll-btn {
  flex: 0 0 auto;
  min-width: 4rem;
  font-size: 1.5rem;
  border-color: var(--sv-chord);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
}

.toggle.active {
  border-color: var(--sv-chord);
}

.readout {
  min-width: 3.2rem;
  text-align: center;
  font-weight: 600;
  color: var(--sv-lyrics);
}

@media print {
  .perf-toolbar {
    display: none;
  }
}
</style>
