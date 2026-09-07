<script lang="ts">
/** Chord anchor geometry, in coordinates relative to the popover's container. */
export interface AnchorRect {
  top: number
  bottom: number
  centerX: number
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { DiagramShape } from '@/chords/types'
import ChordDiagram from './ChordDiagram.vue'

const props = defineProps<{
  name: string
  shape: DiagramShape | null
  anchor: AnchorRect
  /** Width of the positioning container, so the popover can stay inside it. */
  containerWidth: number
}>()

const GAP = 8

const root = ref<HTMLElement | null>(null)
const placement = ref<'above' | 'below'>('above')
const size = ref<{ width: number; height: number }>({ width: 0, height: 0 })

async function measure() {
  await nextTick()
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  size.value = { width: rect.width, height: rect.height }
  placement.value = props.anchor.top - rect.height - GAP < 0 ? 'below' : 'above'
}

watch(() => props.anchor, measure, { immediate: true })

const left = computed(() => {
  const half = size.value.width / 2
  if (props.containerWidth <= size.value.width || half === 0) return props.anchor.centerX
  return Math.min(Math.max(props.anchor.centerX, half), props.containerWidth - half)
})

const style = computed(() => {
  const top = placement.value === 'above' ? props.anchor.top : props.anchor.bottom
  const shift = placement.value === 'above' ? `calc(-100% - ${GAP}px)` : `${GAP}px`
  return {
    left: `${left.value}px`,
    top: `${top}px`,
    transform: `translate(-50%, ${shift})`,
    // Keep the caret pointing at the chord even after the box is clamped.
    '--caret-x': `${props.anchor.centerX - left.value}px`,
  }
})
</script>

<template>
  <div
    ref="root"
    class="chord-popover"
    :class="`place-${placement}`"
    :style="style"
    role="dialog"
    :aria-label="`${name} chord diagram`"
  >
    <ChordDiagram v-if="shape" :shape="shape" />
    <div v-else class="no-diagram">
      <span class="nd-name">{{ name }}</span>
      <span class="nd-text">No diagram for this instrument.</span>
    </div>
  </div>
</template>

<style scoped>
.chord-popover {
  position: absolute;
  z-index: 2;
  padding: 0.5rem 0.6rem;
  background: var(--sv-surface);
  border: 1px solid var(--sv-border);
  border-radius: 6px;
  box-shadow: 0 4px 16px var(--sv-overlay);
  /* A bigger diagram than the strip — ChordDiagram scales off font-size. */
  font-size: 1.35rem;
  /* Popover may be teleported/detached from .viewer in theory; keep the accent. */
  --chord-accent: var(--sv-chord);
}

/* Caret: a small square rotated 45°, sitting on the edge facing the chord. */
.chord-popover::after {
  content: '';
  position: absolute;
  left: calc(50% + var(--caret-x, 0px));
  width: 10px;
  height: 10px;
  background: var(--sv-surface);
  border: 1px solid var(--sv-border);
  transform: translateX(-50%) rotate(45deg);
}

.chord-popover.place-above::after {
  bottom: -6px;
  border-top: none;
  border-left: none;
}

.chord-popover.place-below::after {
  top: -6px;
  border-bottom: none;
  border-right: none;
}

.no-diagram {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  max-width: 12rem;
}

.nd-name {
  font-weight: bold;
  color: var(--sv-chord);
}

.nd-text {
  color: var(--sv-comment);
}
</style>
