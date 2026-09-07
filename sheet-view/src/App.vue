<script setup lang="ts">
import { useSheetStore } from '@/stores/sheet'
import DropZone from './components/DropZone.vue'
import SheetViewer from './components/SheetViewer.vue'

const store = useSheetStore()
</script>

<template>
  <header>
    <h1>Sheet-View</h1>
  </header>
  <main>
    <DropZone v-if="!store.song && !store.parseError" />
    <SheetViewer v-else />
  </main>
</template>

<style scoped>
header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  color: #42b883;
}
</style>
