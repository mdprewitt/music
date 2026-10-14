<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { menuShift } from './menuPanel'

// One header menu: a disclosure button (aria-expanded/aria-controls — no
// aria-haspopup, it expands in place) and an anchored panel. Several share one
// `modelValue` (the id of the open menu, or null), so opening one closes the
// others. Esc returns focus to the trigger; an outside pointerdown just closes.
const props = defineProps<{
  /** This menu's id within the shared group. */
  id: string
  /** Accessible name for the panel (the trigger's own text is its state summary). */
  label: string
}>()

const open = defineModel<string | null>({ required: true })

defineSlots<{
  /** Trigger content — a compact summary of the current state. */
  trigger(): unknown
  default(): unknown
}>()

const panelId = useId()
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
// Positive px: how far to push the panel rightwards to keep it on screen.
const shift = ref(0)
let panelResizeObserver: ResizeObserver | null = null

const isOpen = () => open.value === props.id

async function reposition() {
  await nextTick()
  const t = trigger.value
  const p = panel.value
  if (!t || !p) {
    shift.value = 0
    return
  }
  // The panel is positioned `left: 0` of the wrapper, i.e. at the trigger's left edge.
  shift.value = menuShift(
    t.getBoundingClientRect().left,
    p.offsetWidth,
    document.documentElement.clientWidth,
  )
}

watch(
  () => open.value === props.id,
  (nowOpen) => {
    if (!nowOpen) {
      panelResizeObserver?.disconnect()
      return
    }
    void reposition().then(() => {
      // jsdom lacks ResizeObserver (as it lacks matchMedia) — guard it.
      if (typeof ResizeObserver === 'undefined' || !panel.value) return
      panelResizeObserver ??= new ResizeObserver(() => void reposition())
      panelResizeObserver.observe(panel.value)
    })
  },
  { immediate: true },
)

function toggle() {
  open.value = isOpen() ? null : props.id
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!isOpen()) return
  if ((event.target as HTMLElement).closest(`[data-menu="${props.id}"]`)) return
  open.value = null
}

// Only Escape returns focus to the trigger (ARIA APG disclosure) — an outside
// click sends focus wherever the user clicked.
function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen()) return
  const hadFocus = panel.value?.contains(document.activeElement)
  open.value = null
  if (hadFocus) trigger.value?.focus()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('resize', reposition)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', reposition)
  panelResizeObserver?.disconnect()
})
</script>

<template>
  <div class="menu" :data-menu="id">
    <button
      ref="trigger"
      type="button"
      class="menu-trigger"
      :class="{ active: open === id }"
      :aria-expanded="open === id"
      :aria-controls="panelId"
      @click="toggle"
    >
      <slot name="trigger" />
      <span aria-hidden="true" class="caret">▾</span>
    </button>

    <div
      v-if="open === id"
      :id="panelId"
      ref="panel"
      class="menu-panel"
      role="group"
      :aria-label="label"
      :style="{ left: `${shift}px` }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.menu {
  position: relative;
  display: flex;
}

.menu-trigger {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  background: var(--sv-surface);
  color: var(--sv-lyrics);
  cursor: pointer;
}

.menu-trigger:hover {
  background: var(--sv-surface-hover);
}

.menu-trigger.active,
.menu-trigger.active:hover {
  border-color: var(--sv-chord);
  background: var(--sv-chord);
  color: var(--sv-on-accent);
}

.menu-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: 10;
  min-width: 15rem;
  max-width: min(22rem, 90vw);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--sv-background);
  border: 1px solid var(--sv-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--sv-overlay);
}
</style>
