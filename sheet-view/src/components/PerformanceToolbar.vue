<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { useAnnouncerStore } from '@/stores/announcer'
import { PAGE_TURNER_PRESETS } from '@/sheet/pageTurner'
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  SHEET_FONTS,
  stepFontScale,
  type SheetFontId,
} from '@/sheet/typography'
import ViewSelector from './ViewSelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import ThemeSelector from './ThemeSelector.vue'
import CustomColorEditor from './CustomColorEditor.vue'
import RadioGroup from './RadioGroup.vue'

// A bottom bar for playing: the controls you reach for mid-song (key, text
// size, diagrams) sit under the thumb; the rest live in the "More" panel that
// opens upward. It slides away while you scroll down and returns on scroll up
// or when focus is inside it (never hides under prefers-reduced-motion).
const store = useSheetStore()
const theme = useThemeStore()
const announcer = useAnnouncerStore()

const root = ref<HTMLElement | null>(null)
defineExpose({ el: root })

const panelId = useId()
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

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
const inPdf = computed(() => store.viewFormat === 'pdf')

function stepScale(direction: 1 | -1) {
  store.fontScale = stepFontScale(store.fontScale, direction)
  announcer.announce(`Text size ${Math.round(store.fontScale * 100)}%`)
}

const fontOptions = SHEET_FONTS.map((font) => ({
  value: font.id as SheetFontId,
  label: font.label,
  stack: font.stack,
}))
const turnerOptions = PAGE_TURNER_PRESETS.map((p) => ({ value: p.id, label: p.label }))
const turnerHint = computed(
  () => PAGE_TURNER_PRESETS.find((p) => p.id === store.pageTurner)?.hint ?? '',
)

// --- "More" panel (same disclosure idiom as the old Display panel) -------------
function toggle() {
  store.displayPanelOpen = !store.displayPanelOpen
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!store.displayPanelOpen) return
  if ((event.target as HTMLElement).closest('.perf-toolbar')) return
  store.displayPanelOpen = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !store.displayPanelOpen) return
  const hadFocus = panel.value?.contains(document.activeElement)
  store.displayPanelOpen = false
  if (hadFocus) trigger.value?.focus()
}

// --- Auto-hide on scroll down ---------------------------------------------------
const scrolledAway = ref(false)
const focusWithin = ref(false)
let lastY = 0
const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hidden = computed(() => scrolledAway.value && !focusWithin.value && !store.displayPanelOpen)

function onScroll() {
  const y = window.scrollY
  if (Math.abs(y - lastY) < 8) return
  scrolledAway.value = !reducedMotion() && y > lastY && y > 80
  lastY = y
}

onMounted(() => {
  lastY = window.scrollY
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    ref="root"
    class="perf-toolbar"
    :class="{ hidden }"
    role="toolbar"
    aria-label="Performance controls"
    @focusin="focusWithin = true"
    @focusout="focusWithin = false"
  >
    <div
      v-if="store.displayPanelOpen"
      :id="panelId"
      ref="panel"
      class="more-panel"
      role="group"
      aria-label="More settings"
    >
      <section>
        <h2 class="panel-heading">View</h2>
        <ViewSelector v-model="store.viewFormat" />
      </section>
      <section>
        <InstrumentSelector v-model="store.instrument" />
      </section>
      <section>
        <h2 class="panel-heading">Diagrams</h2>
        <template v-if="store.showDiagrams && !inPdf">
          <DiagramPositionSelector v-model="store.diagramPosition" />
          <label class="check">
            <input v-model="store.pinDiagrams" type="checkbox" />
            Pin while scrolling
          </label>
        </template>
        <p v-else class="panel-note">
          {{
            inPdf
              ? 'Diagram placement is handled by the PDF layout.'
              : 'Turn on “Diagrams” to place and pin the chord strip.'
          }}
        </p>
      </section>
      <section>
        <h2 class="panel-heading">Font</h2>
        <RadioGroup
          v-if="!inPdf"
          v-model="store.sheetFont"
          name="sheet-font"
          label="Chart font"
          :options="fontOptions"
        >
          <template #option="{ option }">
            <span :style="{ fontFamily: option.stack }">{{ option.label }}</span>
          </template>
        </RadioGroup>
        <p v-else class="panel-note">Text size and font do not apply to the PDF layout.</p>
      </section>
      <section>
        <h2 class="panel-heading">Page turner</h2>
        <template v-if="!inPdf">
          <RadioGroup
            v-model="store.pageTurner"
            name="page-turner"
            label="Page turner keys"
            :options="turnerOptions"
          />
          <p class="panel-note">{{ turnerHint }}</p>
        </template>
        <p v-else class="panel-note">Page turner keys do not work in the PDF view.</p>
      </section>
      <section>
        <h2 class="panel-heading">Theme</h2>
        <ThemeSelector
          :model-value="theme.themeId"
          :custom-colors="theme.customColors"
          @update:model-value="theme.selectTheme"
        />
        <CustomColorEditor v-if="theme.themeId === 'custom'" />
      </section>
    </div>

    <div class="bar">
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

      <label class="check toggle" :class="{ active: store.showDiagrams }">
        <input v-model="store.showDiagrams" type="checkbox" />
        Diagrams
      </label>

      <button
        ref="trigger"
        type="button"
        class="more-trigger"
        :class="{ active: store.displayPanelOpen }"
        :aria-expanded="store.displayPanelOpen"
        :aria-controls="panelId"
        @click="toggle"
      >
        More <span aria-hidden="true">⋯</span>
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

@media (prefers-reduced-motion: no-preference) {
  .perf-toolbar {
    transition: transform 0.2s ease;
  }
}

.perf-toolbar.hidden {
  transform: translateY(100%);
}

.bar {
  max-width: 900px;
  margin: 0 auto;
  padding: 0.5rem 0.75rem;
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

/* Bigger than the old header's 0.3rem pills — these are thumb targets. */
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

.more-trigger.active,
.toggle.active {
  border-color: var(--sv-chord);
}

.more-trigger.active,
.more-trigger.active:hover:not(:disabled) {
  background: var(--sv-chord);
  color: var(--sv-on-accent);
}

.readout {
  min-width: 3.2rem;
  text-align: center;
  font-weight: 600;
  color: var(--sv-lyrics);
}

.check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: var(--sv-lyrics);
}

.toggle {
  font-size: 0.9rem;
}

.more-panel {
  max-width: 900px;
  margin: 0 auto;
  max-height: min(60vh, 28rem);
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-bottom: 1px solid var(--sv-divider);
}

.more-panel section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.panel-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sv-meta);
  margin: 0;
}

.panel-note {
  font-size: 0.8rem;
  color: var(--sv-comment);
}

@media print {
  .perf-toolbar {
    display: none;
  }
}
</style>
