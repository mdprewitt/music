<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeColors, ThemeId } from '@/theme/types'
import { THEME_PRESETS } from '@/theme/presets'
import RadioGroup from './RadioGroup.vue'

const model = defineModel<ThemeId>({ required: true })

// The custom palette lives in the theme store; pass it in so this component
// stays store-free and easy to mount in isolation.
const props = defineProps<{ customColors: ThemeColors }>()

const OPTIONS = computed<{ value: ThemeId; label: string; colors: ThemeColors }[]>(() => [
  ...Object.values(THEME_PRESETS).map((preset) => ({
    value: preset.id as ThemeId,
    label: preset.label,
    colors: preset.colors,
  })),
  { value: 'custom', label: 'Custom', colors: props.customColors },
])
</script>

<template>
  <RadioGroup
    v-model="model"
    class="theme-selector"
    name="colour-theme"
    label="Colour theme"
    :options="OPTIONS"
  >
    <template #option="{ option }">
      <span
        class="swatch"
        :style="{ background: option.colors.background, borderColor: option.colors.chord }"
        aria-hidden="true"
      />
      {{ option.label }}
    </template>
  </RadioGroup>
</template>

<style scoped>
.swatch {
  display: inline-block;
  width: 0.85rem;
  height: 0.85rem;
  border: 1px solid;
  border-radius: 3px;
}
</style>
