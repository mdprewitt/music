<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSheetStore, type ViewFormat } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { PAGE_TURNER_PRESETS } from '@/sheet/pageTurner'
import MenuPanel from './MenuPanel.vue'
import KeySelector from './KeySelector.vue'
import InstrumentSelector from './InstrumentSelector.vue'
import ViewSelector from './ViewSelector.vue'
import DiagramPositionSelector from './DiagramPositionSelector.vue'
import FontControls from './FontControls.vue'
import RadioGroup from './RadioGroup.vue'
import ThemeSelector from './ThemeSelector.vue'
import CustomColorEditor from './CustomColorEditor.vue'

// The viewer's controls, grouped by task into three disclosure menus:
//   Song     — what you are playing: key, instrument
//   View     — how the chart looks: format, diagrams, text
//   Settings — set-once prefs: page turner, theme
// Each trigger summarises its current state so the common facts are readable
// without opening anything. Which menu is open is local, not persisted.
const store = useSheetStore()
const theme = useThemeStore()
const openMenu = ref<string | null>(null)

const VIEW_LABELS: Record<ViewFormat, string> = {
  chordpro: 'ChordPro',
  html: 'HTML',
  'html-inline': 'HTML inline',
  pdf: 'PDF',
}

const songSummary = computed(() => `Song: ${store.targetKey ?? store.originalKey ?? 'no key'}`)
const viewSummary = computed(() => `View: ${VIEW_LABELS[store.viewFormat]}`)

const turnerOptions = PAGE_TURNER_PRESETS.map((p) => ({ value: p.id, label: p.label }))
const turnerHint = computed(
  () => PAGE_TURNER_PRESETS.find((p) => p.id === store.pageTurner)?.hint ?? '',
)
</script>

<template>
  <div class="control-menus">
    <MenuPanel v-model="openMenu" id="song" label="Song settings">
      <template #trigger>{{ songSummary }}</template>
      <KeySelector
        v-model="store.targetKey"
        :keys="store.availableKeys"
        :original-key="store.originalKey"
      />
      <InstrumentSelector v-model="store.instrument" />
    </MenuPanel>

    <MenuPanel v-model="openMenu" id="view" label="View settings">
      <template #trigger>{{ viewSummary }}</template>
      <section>
        <h2 class="menu-heading">Format</h2>
        <ViewSelector v-model="store.viewFormat" />
      </section>
      <section>
        <h2 class="menu-heading">Diagrams</h2>
        <label class="check">
          <input v-model="store.showDiagrams" type="checkbox" />
          Diagrams
        </label>
        <template v-if="store.showDiagrams && store.viewFormat !== 'pdf'">
          <DiagramPositionSelector v-model="store.diagramPosition" />
          <label class="check">
            <input v-model="store.pinDiagrams" type="checkbox" />
            Pin while scrolling
          </label>
        </template>
        <p v-else-if="store.viewFormat === 'pdf'" class="menu-note">
          Diagram placement is handled by the PDF layout.
        </p>
      </section>
      <section>
        <h2 class="menu-heading">Text</h2>
        <FontControls v-if="store.viewFormat !== 'pdf'" />
        <p v-else class="menu-note">Text size and font do not apply to the PDF layout.</p>
      </section>
    </MenuPanel>

    <MenuPanel v-model="openMenu" id="settings" label="Settings">
      <template #trigger>Settings</template>
      <section>
        <h2 class="menu-heading">Page turner</h2>
        <template v-if="store.viewFormat !== 'pdf'">
          <RadioGroup
            v-model="store.pageTurner"
            name="page-turner"
            label="Page turner keys"
            :options="turnerOptions"
          />
          <p class="menu-note">{{ turnerHint }}</p>
        </template>
        <p v-else class="menu-note">Page turner keys do not work in the PDF view.</p>
      </section>
      <section>
        <h2 class="menu-heading">Theme</h2>
        <ThemeSelector
          :model-value="theme.themeId"
          :custom-colors="theme.customColors"
          @update:model-value="theme.selectTheme"
        />
        <CustomColorEditor v-if="theme.themeId === 'custom'" />
      </section>
    </MenuPanel>
  </div>
</template>

<style scoped>
.control-menus {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.menu-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sv-meta);
  margin: 0;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--sv-lyrics);
  cursor: pointer;
}

.menu-note {
  font-size: 0.8rem;
  color: var(--sv-comment);
}
</style>
