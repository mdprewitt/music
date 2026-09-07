<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { applyTheme } from '@/theme/apply'
import DropZone from './components/DropZone.vue'
import SheetViewer from './components/SheetViewer.vue'
import AboutDialog from './components/AboutDialog.vue'
import LicenseDialog from './components/LicenseDialog.vue'

const store = useSheetStore()
const theme = useThemeStore()

// Push the active palette onto :root as inline custom properties whenever it
// changes — this is what makes an explicit theme choice outrank the OS setting.
watchEffect(() => applyTheme(theme.colors))
const aboutDialog = ref<InstanceType<typeof AboutDialog>>()
const licenseDialog = ref<InstanceType<typeof LicenseDialog>>()

// `?view=<chart-url>` on the page URL auto-loads that chart on startup, so a
// chart can be linked to directly. The value should be percent-encoded if it
// carries its own query string; a plain GitHub/Gist link needs no encoding.
onMounted(() => {
  const viewUrl = new URLSearchParams(window.location.search).get('view')
  if (!viewUrl) return
  store.loadFromUrl(viewUrl).catch((err: unknown) => {
    store.parseError = err instanceof Error ? err.message : 'Could not load that URL.'
  })
})

function openAbout() {
  if (aboutDialog.value) aboutDialog.value.isOpen = true
}

function openLicense() {
  if (licenseDialog.value) licenseDialog.value.isOpen = true
}
</script>

<template>
  <div class="app-container">
    <header>
      <h1>Sheet-View</h1>
    </header>
    <main>
      <DropZone v-if="!store.song && !store.parseError" />
      <SheetViewer v-else />
    </main>
    <footer>
      <nav>
        <button @click="openAbout" class="link-btn">About</button>
        <button @click="openLicense" class="link-btn">License</button>
        <a href="https://github.com/mdprewitt/music" target="_blank" rel="noopener noreferrer"
          class="link-btn">GitHub</a>
      </nav>
    </footer>
    <AboutDialog ref="aboutDialog" />
    <LicenseDialog ref="licenseDialog" />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  color: var(--sv-chord);
}

main {
  flex: 1;
}

footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--sv-divider);
  text-align: center;
  font-size: 0.9rem;
}

nav {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--sv-chord);
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}
</style>
