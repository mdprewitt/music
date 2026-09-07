<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import InstrumentSelector from './InstrumentSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import ThemeSelector from './ThemeSelector.vue'
import CustomColorEditor from './CustomColorEditor.vue'

const store = useSheetStore()
const theme = useThemeStore()

function toggle() {
  store.displayPanelOpen = !store.displayPanelOpen
}

// Dismiss on an outside click or Escape — the same idiom SheetViewer uses for
// the chord popover. One `.display-panel` check covers both the trigger (its own
// @click toggles) and the panel's interactive contents.
function onDocumentPointerDown(event: MouseEvent) {
  if (!store.displayPanelOpen) return
  if ((event.target as HTMLElement).closest('.display-panel')) return
  store.displayPanelOpen = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') store.displayPanelOpen = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div class="display-panel">
    <button
      type="button"
      class="panel-trigger"
      :class="{ active: store.displayPanelOpen }"
      :aria-expanded="store.displayPanelOpen"
      aria-haspopup="true"
      @click="toggle"
    >
      Display
    </button>

    <div v-if="store.displayPanelOpen" class="panel" role="group" aria-label="Display settings">
      <section>
        <h3 class="panel-heading">Instrument</h3>
        <InstrumentSelector v-model="store.instrument" />
      </section>

      <section>
        <h3 class="panel-heading">Diagrams</h3>
        <template v-if="store.showDiagrams && store.viewFormat !== 'pdf'">
          <DiagramPositionSelector v-model="store.diagramPosition" />
          <label class="diagram-toggle">
            <input v-model="store.pinDiagrams" type="checkbox" />
            Pin while scrolling
          </label>
        </template>
        <p v-else class="panel-note">
          {{
            store.viewFormat === 'pdf'
              ? 'Diagram placement is handled by the PDF layout.'
              : 'Turn on “Diagrams” to place and pin the chord strip.'
          }}
        </p>
      </section>

      <section>
        <h3 class="panel-heading">Theme</h3>
        <ThemeSelector
          :model-value="theme.themeId"
          :custom-colors="theme.customColors"
          @update:model-value="theme.selectTheme"
        />
        <CustomColorEditor v-if="theme.themeId === 'custom'" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.display-panel {
  position: relative;
  display: flex;
}

.panel-trigger {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

.panel-trigger:hover {
  background: var(--sv-surface-hover);
}

.panel-trigger.active {
  border-color: var(--sv-chord);
  background: var(--sv-chord);
  color: var(--sv-on-accent);
}

.panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 10;
  min-width: 15rem;
  max-width: min(22rem, 90vw);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--sv-background);
  border: 1px solid var(--sv-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--sv-overlay);
}

.panel section {
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
}

.diagram-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--sv-lyrics);
  cursor: pointer;
}

.panel-note {
  font-size: 0.8rem;
  color: var(--sv-comment);
}
</style>
