<script setup lang="ts">
import { ref } from 'vue'
import { useSheetStore } from '@/stores/sheet'
import DropZone from './components/DropZone.vue'
import SheetViewer from './components/SheetViewer.vue'
import AboutDialog from './components/AboutDialog.vue'
import LicenseDialog from './components/LicenseDialog.vue'

const store = useSheetStore()
const aboutDialog = ref<InstanceType<typeof AboutDialog>>()
const licenseDialog = ref<InstanceType<typeof LicenseDialog>>()

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
  color: #42b883;
}

main {
  flex: 1;
}

footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
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
  color: #42b883;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  footer {
    border-top-color: #555;
  }

  .link-btn {
    color: #5fd39e;
  }
}
</style>
