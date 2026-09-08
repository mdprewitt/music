<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const dialog = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
let lastFocused: HTMLElement | null = null

// See AboutDialog.vue — native <dialog>.showModal() with a jsdom fallback.
watch(isOpen, async (open) => {
  await nextTick()
  const el = dialog.value
  if (!el) return
  if (open) {
    lastFocused = document.activeElement as HTMLElement | null
    if (typeof el.showModal === 'function') el.showModal()
    else el.setAttribute('open', '')
  } else {
    if (typeof el.close === 'function' && el.open) el.close()
    else el.removeAttribute('open')
    lastFocused?.focus?.()
    lastFocused = null
  }
})

defineExpose({ isOpen })
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="license-title"
    @close="isOpen = false"
    @keydown.esc="isOpen = false"
    @click.self="isOpen = false"
  >
    <div class="dialog-body">
      <button class="close-btn" aria-label="Close" @click="isOpen = false">×</button>
      <h2 id="license-title">License</h2>
      <div class="content">
        <p>
          Sheet-View is free software licensed under the
          <strong>GNU Affero General Public License v3 (AGPL-3.0)</strong>.
        </p>
        <p>
          This means you are free to use, modify, and distribute this software, with the
          requirement that any modifications you make and any network services you run using
          this software must make their source code available to users.
        </p>
        <p>
          For the complete license text, see
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank"
            >https://www.gnu.org/licenses/agpl-3.0.html</a
          >
        </p>
        <p class="disclaimer">
          THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE AND NONINFRINGEMENT.
        </p>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  margin: auto;
  max-width: 500px;
  padding: 0;
  border: 0;
  background: transparent;
}

.dialog::backdrop {
  background: var(--sv-overlay);
}

.dialog-body {
  position: relative;
  max-height: 80vh;
  overflow-y: auto;
  padding: 2rem;
  border: 1px solid var(--sv-border);
  border-radius: 8px;
  background: var(--sv-background);
  color: var(--sv-lyrics);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--sv-comment);
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--sv-lyrics);
}

h2 {
  margin-top: 0;
  color: var(--sv-chord);
}

p {
  line-height: 1.6;
}

.disclaimer {
  font-size: 0.9rem;
  margin-top: 2rem;
  color: var(--sv-comment);
}

a {
  color: var(--sv-chord);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
