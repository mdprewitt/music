<script setup lang="ts">
import { ref } from 'vue'
import { useSheetStore } from '@/stores/sheet'

const store = useSheetStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const dropError = ref<string | null>(null)

const ACCEPTED_EXT = ['.cho', '.chopro', '.chordpro', '.pro', '.txt']

function hasAcceptedExt(name: string): boolean {
  return ACCEPTED_EXT.some((ext) => name.toLowerCase().endsWith(ext))
}

async function handleFile(file: File | undefined) {
  if (!file) return
  if (!file.type.startsWith('text/') && !hasAcceptedExt(file.name)) {
    dropError.value = 'Please drop a text or ChordPro file.'
    return
  }
  dropError.value = null
  await store.loadFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  handleFile(e.dataTransfer?.files?.[0])
}

function onPick(e: Event) {
  handleFile((e.target as HTMLInputElement).files?.[0])
}
</script>

<template>
  <div
    class="drop-zone"
    :class="{ dragging: isDragging }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <p class="instruction">Drop a ChordPro file here, or</p>
    <button @click="fileInput?.click()">View</button>
    <input
      ref="fileInput"
      type="file"
      accept=".cho,.chopro,.chordpro,.pro,.txt,text/plain"
      hidden
      @change="onPick"
    />
    <p v-if="dropError" class="error">{{ dropError }}</p>
  </div>
</template>

<style scoped>
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 16rem;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  transition: border-color 0.2s;
}

.drop-zone.dragging {
  border-color: #42b883;
  background: rgba(66, 184, 131, 0.05);
}

.instruction {
  color: #666;
  margin: 0;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  border: 1px solid #42b883;
  border-radius: 4px;
  background: #42b883;
  color: #fff;
  cursor: pointer;
}

button:hover {
  background: #33a06f;
}

.error {
  color: #c0392b;
  margin: 0;
}
</style>
