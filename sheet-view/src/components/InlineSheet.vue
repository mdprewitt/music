<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Song } from 'chordsheetjs'
import { toInlineSheet, type InlineLine } from '@/sheet/inline'
import { handleRovingArrowKey } from '@/sheet/rovingFocus'

const props = defineProps<{
  song: Song
  /** Id of SheetViewer.vue's shared arrow-key hint, for aria-describedby. */
  navHintId?: string
}>()
const emit = defineEmits<{ 'chord-click': [el: HTMLElement, name: string] }>()

const sheet = computed(() => toInlineSheet(props.song))

// Every chord is one roving tab stop, not one each (WCAG 2.4.3) — mirrors
// SheetViewer.vue's html view (markChordCells() + rovingFocus.ts). Chord
// spans default to tabindex="-1" in the template; this promotes the first
// one to "0" whenever the sheet (re)renders, since a fresh set of <span>s
// has no memory of which was last focused. Arrow-key navigation itself is a
// delegated keydown below, reusing the same handleRovingArrowKey().
const root = ref<HTMLElement | null>(null)

function seedRovingTabindex() {
  const cells = root.value?.querySelectorAll<HTMLElement>('.chord.clickable')
  // Explicitly reset every cell, not just promote the first — Vue's patcher
  // skips rewriting an attribute whose *bound template expression* hasn't
  // changed since its own last render, so it won't know to undo a previous
  // roving-focus move that set some other cell's tabindex out of band.
  cells?.forEach((cell, i) => cell.setAttribute('tabindex', i === 0 ? '0' : '-1'))
}

onMounted(seedRovingTabindex)
watch(sheet, async () => {
  await nextTick()
  seedRovingTabindex()
})

// One delegated listener for the whole sheet, not one Enter/Space pair per
// chord span — besides the obvious cost of hundreds of listeners on a long
// chart, a per-span binding can't help but exist on every span it's written
// on, including non-interactive lyric/annotation spans that never actually
// receive focus (so it could never fire from them either way, but there's no
// reason to attach it there at all).
//
// The template's root <div role="group"> carries this @keydown, but it's a
// plain grouping container, not an interactive one — eslint-plugin-vuejs-
// accessibility's no-static-element-interactions doesn't know the handler
// only ever acts on a chord descendant (delegation), so it's disabled for
// this file in eslint.config.ts rather than an inline template comment: a
// comment immediately before an SFC's own single root element makes Vue
// treat the component as multi-root, which breaks @vue/test-utils's
// wrapper.attributes()/classes() — confirmed empirically.
function onKeydown(event: KeyboardEvent) {
  const cell = (event.target as HTMLElement).closest('.chord.clickable') as HTMLElement | null
  if (!cell || !root.value) return
  const cells = Array.from(root.value.querySelectorAll<HTMLElement>('.chord.clickable'))
  if (handleRovingArrowKey(event, cells, cell)) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  const name = cell.dataset.chord
  if (name) emit('chord-click', cell, name)
}

interface Segment {
  cls: string
  text: string
  /** Bare chord name (no brackets) when this segment is a clickable chord. */
  chord?: string
}

/**
 * Flatten a line's tokens to styled text segments. Done here rather than in the
 * template so the `.line` markup can be a single element — with `white-space:
 * pre-wrap`, any whitespace between sibling tags would render as a gap.
 */
function segments(line: InlineLine): Segment[] {
  const out: Segment[] = []
  for (const token of line.tokens) {
    switch (token.kind) {
      case 'pair':
        if (token.chord) out.push({ cls: 'chord', text: `[${token.chord}]`, chord: token.chord })
        out.push({ cls: 'lyrics', text: token.lyrics })
        break
      case 'annotation':
        out.push({ cls: 'annotation', text: `${token.text} ` })
        out.push({ cls: 'lyrics', text: token.lyrics })
        break
      case 'rhythm':
        out.push({ cls: 'rhythm', text: `${token.symbol} ` })
        out.push({ cls: 'lyrics', text: token.lyrics })
        break
      case 'comment':
        out.push({ cls: 'comment', text: token.text })
        break
    }
  }
  return out
}

function activateChord(event: Event, name: string) {
  emit('chord-click', event.currentTarget as HTMLElement, name)
}
</script>

<template>
  <div ref="root" class="inline-sheet" role="group" :aria-describedby="navHintId" @keydown="onKeydown">
    <!-- One level below each, not h1/h2/h3 — App.vue already has the page's
         one h1 ("Sheet-View"), so starting here at h1 would both duplicate
         it and skip a level from this component's own perspective (1.3.1). -->
    <h2 v-if="sheet.title" class="title">{{ sheet.title }}</h2>
    <h3 v-if="sheet.subtitle" class="subtitle">{{ sheet.subtitle }}</h3>

    <section
      v-for="(paragraph, pi) in sheet.paragraphs"
      :key="pi"
      class="paragraph"
      :class="paragraph.type"
    >
      <h4 v-if="paragraph.label" class="label">{{ paragraph.label }}</h4>
      <p
        v-for="(line, li) in paragraph.lines"
        :key="li"
        :class="line.isComment ? 'comment' : 'line'"
      >
        <!-- role/tabindex are conditional on seg.chord, so the static
             analysis can't see this is role="button" for a chord segment —
             it *is* keyboard-reachable, via the delegated onKeydown above
             (Enter/Space activate it, matching the click handler below). -->
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -->
        <span
          v-for="(seg, si) in segments(line)"
          :key="si"
          :class="[seg.cls, { clickable: seg.chord }]"
          :role="seg.chord ? 'button' : undefined"
          :tabindex="seg.chord ? -1 : undefined"
          :aria-expanded="seg.chord ? 'false' : undefined"
          :data-chord="seg.chord"
          @click="seg.chord && activateChord($event, seg.chord)"
          >{{ seg.text }}</span
        >
      </p>
    </section>
  </div>
</template>

<style scoped>
.inline-sheet {
  font-size: 1rem;
  line-height: 1.7;
}

.title {
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
  color: var(--sv-meta);
}

.subtitle {
  font-size: 1.1rem;
  font-weight: normal;
  margin: 0 0 1rem;
  color: var(--sv-comment);
}

.paragraph {
  margin-bottom: 1.5rem;
  /* Both properties: page-break-inside is the older, still-widely-honoured
     name; break-inside is its modern successor. A hint, not a guarantee — a
     paragraph taller than one page still splits. */
  page-break-inside: avoid;
  break-inside: avoid;
}

.label {
  font-size: 0.95rem;
  margin: 0 0 0.25rem;
  color: var(--sv-meta);
}

.line {
  margin: 0;
  /* Keep ChordPro's own spacing but still wrap at spaces; `anywhere` is a
     backstop for a very long unbroken run. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chord {
  color: var(--chord-accent);
  font-weight: bold;
}

.chord.clickable {
  cursor: pointer;
  border-radius: 3px;
}

/* Hover, keyboard focus and "diagram open" are three distinct states and must
   stay visually distinguishable (WCAG 1.4.1) — none of them suppresses the
   shared `:focus-visible` ring from base.css. Hover and open share the same
   background tint but "open" also gets a persistent underline so it doesn't
   read as colour-only once focus moves elsewhere. */
.chord.clickable:hover,
.chord.clickable.chord-open {
  background: var(--sv-surface-hover);
}

.chord.clickable.chord-open {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}

.annotation,
.rhythm {
  color: var(--chord-accent);
}

.annotation {
  font-style: italic;
}

.lyrics {
  color: var(--sv-lyrics);
}

.comment {
  margin: 0;
  color: var(--sv-comment);
  font-style: italic;
}
</style>
