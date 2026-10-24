<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { PAGE_TURNER_PRESETS } from '@/sheet/pageTurner'
import ViewSelector from './ViewSelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import ThemeSelector from './ThemeSelector.vue'
import CustomColorEditor from './CustomColorEditor.vue'
import FontControls from './FontControls.vue'
import RadioGroup from './RadioGroup.vue'

// A modal side drawer for the set-once preferences, on a native <dialog> so the
// browser supplies the focus trap, Esc-to-close and focus-return-to-opener.
// Mounted only while open (v-if in SheetViewer), so `onMounted` is "opened".
const emit = defineEmits<{ close: [] }>()

const store = useSheetStore()
const theme = useThemeStore()

const titleId = useId()
const dialog = ref<HTMLDialogElement | null>(null)

const turnerOptions = PAGE_TURNER_PRESETS.map((p) => ({ value: p.id, label: p.label }))
const turnerHint = computed(
  () => PAGE_TURNER_PRESETS.find((p) => p.id === store.pageTurner)?.hint ?? '',
)

onMounted(async () => {
  await nextTick()
  const el = dialog.value
  if (!el) return
  // jsdom has no showModal(); fall back to the plain `open` attribute there.
  if (typeof el.showModal === 'function') el.showModal()
  else el.setAttribute('open', '')
})

// The template's @click.self is backdrop-dismiss (a click on the <dialog> itself,
// not a descendant, lands on its ::backdrop). The no-static-element-interactions
// rule doesn't know an open native <dialog> is itself interactive, so it's off
// for this file in eslint.config.ts.
</script>

<template>
  <dialog
    ref="dialog"
    class="drawer"
    :aria-labelledby="titleId"
    @close="emit('close')"
    @keydown.esc="emit('close')"
    @click.self="emit('close')"
  >
    <div class="drawer-body">
      <header class="drawer-header">
        <h2 :id="titleId">Settings</h2>
        <button type="button" class="drawer-close" @click="emit('close')">Close</button>
      </header>

      <section>
        <h3 class="drawer-heading">Layout</h3>
        <label class="drawer-check">
          <input v-model="store.performanceMode" type="checkbox" />
          Performance mode (bottom toolbar for tablets)
        </label>
        <p class="drawer-note">
          Moves the controls to a bar at the bottom of the screen with big scroll-down and scroll-up
          buttons at its ends.
        </p>
      </section>

      <section v-if="store.performanceMode">
        <h3 class="drawer-heading">Instrument</h3>
        <InstrumentSelector v-model="store.instrument" />
      </section>

      <section>
        <h3 class="drawer-heading">View</h3>
        <ViewSelector v-model="store.viewFormat" />
      </section>

      <section>
        <h3 class="drawer-heading">Diagrams</h3>
        <template v-if="store.showDiagrams && store.viewFormat !== 'pdf'">
          <DiagramPositionSelector v-model="store.diagramPosition" />
          <label class="drawer-check">
            <input v-model="store.pinDiagrams" type="checkbox" />
            Pin while scrolling
          </label>
        </template>
        <p v-else class="drawer-note">
          {{
            store.viewFormat === 'pdf'
              ? 'Diagram placement is handled by the PDF layout.'
              : 'Turn on “Diagrams” to place and pin the chord strip.'
          }}
        </p>
      </section>

      <section>
        <h3 class="drawer-heading">Text</h3>
        <FontControls v-if="store.viewFormat !== 'pdf'" />
        <p v-else class="drawer-note">Text size and font do not apply to the PDF layout.</p>
      </section>

      <section>
        <h3 class="drawer-heading">Page turner</h3>
        <template v-if="store.viewFormat !== 'pdf'">
          <RadioGroup
            v-model="store.pageTurner"
            name="page-turner"
            label="Page turner keys"
            :options="turnerOptions"
          />
          <p class="drawer-note">{{ turnerHint }}</p>
        </template>
        <p v-else class="drawer-note">Page turner keys do not work in the PDF view.</p>
      </section>

      <section>
        <h3 class="drawer-heading">Theme</h3>
        <ThemeSelector
          :model-value="theme.themeId"
          :custom-colors="theme.customColors"
          @update:model-value="theme.selectTheme"
        />
        <CustomColorEditor v-if="theme.themeId === 'custom'" />
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(24rem, 100vw);
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--sv-border);
  background: var(--sv-background);
  color: var(--sv-lyrics);
  box-shadow: -4px 0 12px var(--sv-overlay);
  overflow-y: auto;
}

.drawer::backdrop {
  background: var(--sv-overlay);
}

/* A phone has no room for a side rail — slide up as a bottom sheet instead. */
@media (max-width: 640px) {
  .drawer {
    inset: auto 0 0 0;
    width: 100vw;
    height: auto;
    max-height: 85dvh;
    border-left: 0;
    border-top: 1px solid var(--sv-border);
    border-radius: 12px 12px 0 0;
  }
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-header h2 {
  font-size: 1.1rem;
  margin: 0;
}

.drawer-close {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

.drawer-close:hover {
  background: var(--sv-surface-hover);
}

section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.drawer-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sv-meta);
  margin: 0;
}

.drawer-check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.drawer-note {
  font-size: 0.8rem;
  color: var(--sv-comment);
}

@media print {
  .drawer {
    display: none;
  }
}
</style>
