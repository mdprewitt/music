<script setup lang="ts">
// One always-mounted, visually-hidden live region for src/stores/announcer.ts.
// Mount exactly once (App.vue) — a second instance would double-announce.
import { useAnnouncerStore } from '@/stores/announcer'

const announcer = useAnnouncerStore()
</script>

<template>
  <div class="sr-only" role="status" aria-live="polite">{{ announcer.message }}</div>
</template>
