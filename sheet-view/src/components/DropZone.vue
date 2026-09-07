<script setup lang="ts">
import { ref } from 'vue'
import { useSheetStore } from '@/stores/sheet'

const store = useSheetStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const loadError = ref<string | null>(null)
const url = ref('')
const fetching = ref(false)

const ACCEPTED_EXT = ['.cho', '.chopro', '.chordpro', '.pro', '.txt']

function hasAcceptedExt(name: string): boolean {
  return ACCEPTED_EXT.some((ext) => name.toLowerCase().endsWith(ext))
}

async function handleFile(file: File | undefined) {
  if (!file) return
  if (!file.type.startsWith('text/') && !hasAcceptedExt(file.name)) {
    loadError.value = 'Please drop a text or ChordPro file.'
    return
  }
  loadError.value = null
  await store.loadFile(file)
}

async function fetchUrl() {
  const trimmed = url.value.trim()
  if (!trimmed || fetching.value) return
  loadError.value = null
  fetching.value = true
  try {
    await store.loadFromUrl(trimmed)
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Could not load that URL.'
  } finally {
    fetching.value = false
  }
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
    <p class="description">
      Sheet View is an app you can use to view chord tabs files like ChordPro or text. The
      viewer lets you select positions of the chord diagrams and whether you want them to stay
      put as you scroll through the music.
    </p>
    <p class="instruction">Drop a ChordPro file here, or</p>
    <button @click="fileInput?.click()">View</button>
    <input
      ref="fileInput"
      type="file"
      accept=".cho,.chopro,.chordpro,.pro,.txt,text/plain"
      hidden
      @change="onPick"
    />
    <p class="instruction">or paste a link to a chart</p>
    <form class="url-form" @submit.prevent="fetchUrl">
      <input
        v-model="url"
        type="url"
        inputmode="url"
        placeholder="https://github.com/user/repo/blob/main/song.chopro"
        aria-label="Chart URL"
      />
      <button type="submit" :disabled="fetching || !url.trim()">
        {{ fetching ? 'Fetching…' : 'Fetch' }}
      </button>
    </form>
    <p v-if="loadError" class="error">{{ loadError }}</p>
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
  border: 2px dashed var(--sv-border);
  border-radius: 8px;
  padding: 2rem;
  transition: border-color 0.2s;
}

.drop-zone.dragging {
  border-color: var(--sv-chord);
  background: color-mix(in srgb, var(--sv-chord) 8%, transparent);
}

.description {
  max-width: 400px;
  text-align: center;
  color: var(--sv-comment);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.instruction {
  color: var(--sv-comment);
  margin: 0;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  border: 1px solid var(--sv-chord);
  border-radius: 4px;
  background: var(--sv-chord);
  color: var(--sv-on-accent);
  cursor: pointer;
}

button:hover {
  opacity: 0.85;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.url-form {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 420px;
}

.url-form input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
}

.url-form button {
  white-space: nowrap;
}

.error {
  color: var(--sv-error);
  margin: 0;
}
</style>
