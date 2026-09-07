<script setup lang="ts">
import { computed } from 'vue'

// A <select>, not the radiogroup the other selectors use: 12–15 target keys is
// too many buttons for the header row.
const model = defineModel<string | null>({ required: true })

const props = defineProps<{
  /** Transpose targets for this song; empty when the key can't be changed. */
  keys: readonly string[]
  /** The sheet's own key, or `null` when it has no `{key: …}` directive. */
  originalKey: string | null
}>()

const HINT = 'Add a {key: C} directive to this sheet to change its key.'

const current = computed(() => model.value ?? props.originalKey ?? '')
const transposed = computed(() => model.value !== null && model.value !== props.originalKey)

function onChange(event: Event) {
  const chosen = (event.target as HTMLSelectElement).value
  model.value = chosen === props.originalKey ? null : chosen
}
</script>

<template>
  <div class="key-selector">
    <span class="key-label">Key</span>
    <select
      :value="current"
      :disabled="originalKey === null"
      :title="originalKey === null ? HINT : undefined"
      aria-label="Key"
      @change="onChange"
    >
      <option v-if="originalKey === null" value="">—</option>
      <option v-for="key in keys" :key="key" :value="key">
        {{ key === originalKey ? `${key} (original)` : key }}
      </option>
    </select>
    <button
      v-if="transposed"
      type="button"
      class="key-reset"
      :title="`Back to ${originalKey}`"
      @click="model = null"
    >
      ↺
    </button>
  </div>
</template>

<style scoped>
.key-selector {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.key-label {
  font-size: 0.85rem;
  color: var(--sv-lyrics);
}

select {
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.key-reset {
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  line-height: 1;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

.key-reset:hover {
  background: var(--sv-surface-hover);
}
</style>
