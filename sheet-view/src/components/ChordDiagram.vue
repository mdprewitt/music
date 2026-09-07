<script setup lang="ts">
import { computed } from 'vue'
import type { DiagramShape } from '@/chords/types'

const props = defineProps<{ shape: DiagramShape }>()

// All numbers are SVG user units; the whole diagram is scaled via font-size on
// the host element (width/height are in `em`).
const WIDTH = 84
const PAD_LEFT = 14
const PAD_RIGHT = 14
const PAD_TOP = 26
const PAD_BOTTOM = 16
const ROW_HEIGHT = 15
const DOT_RADIUS = 4.6
const INDICATOR_Y = PAD_TOP - 9

const columns = computed(() => Math.max(props.shape.stringCount, 1))
const rows = computed(() => Math.max(props.shape.fretCount, 1))
const neckWidth = WIDTH - PAD_LEFT - PAD_RIGHT
const neckHeight = computed(() => rows.value * ROW_HEIGHT)
const height = computed(() => PAD_TOP + neckHeight.value + PAD_BOTTOM)
const viewBox = computed(() => `0 0 ${WIDTH} ${height.value}`)

function stringX(index: number): number {
  if (columns.value === 1) return PAD_LEFT + neckWidth / 2
  return PAD_LEFT + (index * neckWidth) / (columns.value - 1)
}
function fretLineY(row: number): number {
  return PAD_TOP + row * ROW_HEIGHT
}
function markerY(absoluteFret: number): number {
  return PAD_TOP + (absoluteFret - props.shape.baseFret + 0.5) * ROW_HEIGHT
}

const stringXs = computed(() => Array.from({ length: columns.value }, (_, i) => stringX(i)))
const fretYs = computed(() => Array.from({ length: rows.value + 1 }, (_, r) => fretLineY(r)))
const showNut = computed(() => props.shape.baseFret === 1)

const dots = computed(() =>
  props.shape.markers.map((marker) => ({
    x: stringX(marker.string - 1),
    y: markerY(marker.fret),
    finger: marker.finger > 0 ? String(marker.finger) : '',
  })),
)
const barres = computed(() =>
  props.shape.barres.map((barre) => ({
    x: stringX(barre.from - 1) - DOT_RADIUS,
    y: markerY(barre.fret) - DOT_RADIUS,
    width: stringX(barre.to - 1) - stringX(barre.from - 1) + DOT_RADIUS * 2,
    height: DOT_RADIUS * 2,
  })),
)
const openXs = computed(() => props.shape.openStrings.map((s) => stringX(s - 1)))
const muteXs = computed(() => props.shape.mutedStrings.map((s) => stringX(s - 1)))
const baseFretLabel = computed(() =>
  props.shape.baseFret > 1
    ? { x: PAD_LEFT - 5, y: markerY(props.shape.baseFret), text: `${props.shape.baseFret}fr` }
    : null,
)
</script>

<template>
  <svg
    class="chord-diagram"
    :viewBox="viewBox"
    role="img"
    :aria-label="`${shape.name} chord diagram`"
  >
    <text class="cd-title" :x="WIDTH / 2" :y="12">{{ shape.name }}</text>

    <g class="cd-indicators">
      <circle v-for="(x, i) in openXs" :key="`o${i}`" :cx="x" :cy="INDICATOR_Y" r="3" fill="none" />
      <g v-for="(x, i) in muteXs" :key="`m${i}`">
        <line :x1="x - 3" :y1="INDICATOR_Y - 3" :x2="x + 3" :y2="INDICATOR_Y + 3" />
        <line :x1="x - 3" :y1="INDICATOR_Y + 3" :x2="x + 3" :y2="INDICATOR_Y - 3" />
      </g>
    </g>

    <line
      v-if="showNut"
      class="cd-nut"
      :x1="stringXs[0]"
      :y1="PAD_TOP"
      :x2="stringXs[stringXs.length - 1]"
      :y2="PAD_TOP"
    />
    <text v-if="baseFretLabel" class="cd-basefret" :x="baseFretLabel.x" :y="baseFretLabel.y">
      {{ baseFretLabel.text }}
    </text>

    <g class="cd-grid">
      <line
        v-for="(y, i) in fretYs"
        :key="`f${i}`"
        :x1="stringXs[0]"
        :y1="y"
        :x2="stringXs[stringXs.length - 1]"
        :y2="y"
      />
      <line
        v-for="(x, i) in stringXs"
        :key="`s${i}`"
        :x1="x"
        :y1="PAD_TOP"
        :x2="x"
        :y2="PAD_TOP + neckHeight"
      />
    </g>

    <rect
      v-for="(barre, i) in barres"
      :key="`b${i}`"
      class="cd-barre"
      :x="barre.x"
      :y="barre.y"
      :width="barre.width"
      :height="barre.height"
      :rx="DOT_RADIUS"
    />

    <g v-for="(dot, i) in dots" :key="`d${i}`">
      <circle class="cd-dot" :cx="dot.x" :cy="dot.y" :r="DOT_RADIUS" />
      <text v-if="dot.finger" class="cd-finger" :x="dot.x" :y="dot.y">{{ dot.finger }}</text>
    </g>
  </svg>
</template>

<style scoped>
.chord-diagram {
  width: 5em;
  height: auto;
  overflow: visible;
  --cd-ink: #333;
  --cd-grid: #999;
  --cd-muted-ink: #666;
  --cd-indicator: #555;
  --cd-accent: var(--chord-accent, #42b883);
}

@media (prefers-color-scheme: dark) {
  .chord-diagram {
    --cd-ink: #dcdcdc;
    --cd-grid: #777;
    --cd-muted-ink: #aaa;
    --cd-indicator: #bbb;
  }
}

.cd-title {
  text-anchor: middle;
  font-size: 11px;
  font-weight: bold;
  fill: var(--cd-ink);
}

.cd-indicators line,
.cd-indicators circle {
  stroke: var(--cd-indicator);
  stroke-width: 1.2;
}

.cd-nut {
  stroke: var(--cd-ink);
  stroke-width: 3.5;
  stroke-linecap: round;
}

.cd-grid line {
  stroke: var(--cd-grid);
  stroke-width: 1;
}

.cd-basefret {
  text-anchor: end;
  dominant-baseline: middle;
  font-size: 8px;
  fill: var(--cd-muted-ink);
}

.cd-dot {
  fill: var(--cd-accent);
}

.cd-barre {
  fill: var(--cd-accent);
}

.cd-finger {
  text-anchor: middle;
  dominant-baseline: central;
  font-size: 6px;
  fill: #fff;
}
</style>
