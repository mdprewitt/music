<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

defineExpose({ isOpen })
</script>

<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="isOpen = false">
    <div class="dialog">
      <button class="close-btn" aria-label="Close" @click="isOpen = false">×</button>
      <h2>About Sheet-View</h2>
      <div class="content">
        <p>
          Sheet-View is a web app that lets people view chordpro and other chord sheets.
        </p>
        <h3>File Support</h3>
        <ul>
          <li>Chord Pro</li>
          <li>Chords over words (regular chord sheets)</li>
          <li>Ultimate Guitar sheets</li>
        </ul>
        <h3>Features</h3>
        <ul>
          <li>
            Multiple view formats: ChordPro, Plain Text, Chords over Words, HTML, and PDF
          </li>
          <li>Chord diagrams for guitar and ukulele with auto-detection</li>
          <li>Toggle chord diagram position (top, right, or bottom)</li>
          <li>Pin chord diagrams to keep them visible while scrolling</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-background);
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

h2 {
  margin-top: 0;
  color: #42b883;
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

.content {
  color: var(--color-text);
}

@media (prefers-color-scheme: dark) {
  .dialog {
    border-color: #555;
  }

  .close-btn:hover {
    color: #ddd;
  }
}
</style>
