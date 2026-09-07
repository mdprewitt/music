<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

defineExpose({ isOpen })
</script>

<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="isOpen = false">
    <div class="dialog">
      <button class="close-btn" aria-label="Close" @click="isOpen = false">×</button>
      <h2>License</h2>
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
        <p style="font-size: 0.9rem; margin-top: 2rem; color: #666">
          THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE AND NONINFRINGEMENT.
        </p>
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

p {
  line-height: 1.6;
  color: var(--color-text);
}

a {
  color: #42b883;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  .dialog {
    border-color: #555;
  }

  .close-btn:hover {
    color: #ddd;
  }

  a {
    color: #5fd39e;
  }

  p {
    color: #ddd;
  }
}
</style>
