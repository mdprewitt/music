<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const dialog = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
let lastFocused: HTMLElement | null = null

// Drive the native <dialog>: showModal() gives Escape-to-close, a focus trap,
// the ::backdrop and focus restore for free. jsdom has none of it, so fall back
// to the `open` attribute there and restore focus by hand.
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
    aria-labelledby="about-title"
    @close="isOpen = false"
    @keydown.esc="isOpen = false"
    @click.self="isOpen = false"
  >
    <div class="dialog-body">
      <button class="close-btn" aria-label="Close" @click="isOpen = false">×</button>
      <h2 id="about-title">About Sheet-View</h2>
      <div class="content">
        <p>Sheet-View is a web app that lets people view chordpro and other chord sheets.</p>
        <h3>File Support</h3>
        <ul>
          <li>Chord Pro</li>
        </ul>
        <h3>Features</h3>
        <ul>
          <li>Multiple view formats: ChordPro, HTML, HTML inline, and PDF</li>
          <li>
            Chord diagrams for guitar, ukulele and tenor guitar (CGDA / DGBE) with auto-detection
          </li>
          <li>Toggle chord diagram position (top, right, or bottom)</li>
          <li>Pin chord diagrams to keep them visible while scrolling</li>
        </ul>
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

h3 {
  font-size: 1rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

p {
  line-height: 1.6;
}

ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

li {
  margin: 0.25rem 0;
}
</style>
