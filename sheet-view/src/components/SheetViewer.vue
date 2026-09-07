<script setup lang="ts">
import { computed } from 'vue'
import { HtmlTableFormatter, type Song } from 'chordsheetjs'
import { useSheetStore } from '@/stores/sheet'

const store = useSheetStore()
// store.song is markRaw(Song), but Pinia's UnwrapRef loses class fidelity — cast back to Song
const html = computed(() => (store.song ? new HtmlTableFormatter().format(store.song as Song) : ''))
</script>

<template>
  <div class="viewer">
    <header class="viewer-header">
      <span class="filename">{{ store.filename }}</span>
      <button @click="store.reset()">Load another</button>
    </header>
    <pre v-if="store.parseError" class="error">{{ store.parseError }}</pre>
    <!-- v-html is safe: content comes from chordsheetjs formatter, not user-injected markup -->
    <div v-else class="sheet" v-html="html" />
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.filename {
  font-weight: bold;
  color: #333;
}

button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}

.error {
  color: #c0392b;
  white-space: pre-wrap;
  padding: 1rem;
  background: #fdf0ee;
  border-radius: 4px;
}

.sheet :deep(.chord-sheet) {
  font-family: monospace;
  font-size: 1rem;
}

.sheet :deep(.paragraph) {
  margin-bottom: 1.5rem;
}

.sheet :deep(table.row) {
  border-collapse: collapse;
}

.sheet :deep(td) {
  padding: 0;
  vertical-align: bottom;
  white-space: pre;
}

.sheet :deep(td.chord) {
  color: #42b883;
  font-weight: bold;
  padding-right: 0.25em;
}

.sheet :deep(td.lyrics) {
  padding-right: 0.25em;
}

.sheet :deep(.comment) {
  color: #888;
  font-style: italic;
}
</style>
