<script setup lang="ts" generic="O extends { value: string; label: string }">
/**
 * A single-choice control backed by real `<input type="radio">` elements in a
 * `<fieldset>`, so arrow-key navigation, one tab stop per group, and the
 * checked-state semantics come from the platform rather than hand-rolled ARIA.
 * The visible pill styling is kept; the radios are visually hidden but focusable.
 */
withDefaults(
  defineProps<{
    /** Accessible name for the group — the legend text. */
    label: string
    /** `name` shared by the group's radios (must be unique on the page). */
    name: string
    options: readonly O[]
    /**
     * Show the legend as a small visible caption instead of hiding it for
     * screen readers only. Used when several groups share one control and each
     * needs a heading (the instrument picker's families).
     */
    captioned?: boolean
  }>(),
  { captioned: false },
)

const model = defineModel<O['value']>({ required: true })

defineSlots<{
  /** Override an option's rendered content (default is `option.label`). */
  option?: (props: { option: O }) => unknown
}>()
</script>

<template>
  <fieldset class="radio-group">
    <legend :class="captioned ? 'caption' : 'sr-only'">{{ label }}</legend>
    <label
      v-for="opt in options"
      :key="opt.value"
      class="option"
      :class="{ active: model === opt.value }"
    >
      <input
        class="sr-only"
        type="radio"
        :name="name"
        :value="opt.value"
        :checked="model === opt.value"
        @change="model = opt.value"
      />
      <slot name="option" :option="opt">{{ opt.label }}</slot>
    </label>
  </fieldset>
</template>

<style scoped>
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  border: 0;
  /* fieldset defaults to min-width: min-content, which blocks flex shrink/wrap */
  min-inline-size: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* A visible group heading. `float` takes the legend out of the flex flow so the
   pills wrap beneath it rather than beside it. */
.caption {
  float: left;
  width: 100%;
  margin-bottom: 0.25rem;
  padding: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sv-meta);
}

.option {
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

.option:hover {
  background: var(--sv-surface-hover);
}

.option.active {
  border-color: var(--sv-chord);
  background: var(--sv-chord);
  color: var(--sv-on-accent);
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--sv-chord);
  outline-offset: 2px;
}
</style>
