<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from 'chordsheetjs'
import { toInlineSheet, type InlineLine } from '@/sheet/inline'

const props = defineProps<{ song: Song }>()
const emit = defineEmits<{ 'chord-click': [el: HTMLElement, name: string] }>()

const sheet = computed(() => toInlineSheet(props.song))

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
  <div class="inline-sheet">
    <h1 v-if="sheet.title" class="title">{{ sheet.title }}</h1>
    <h2 v-if="sheet.subtitle" class="subtitle">{{ sheet.subtitle }}</h2>

    <section
      v-for="(paragraph, pi) in sheet.paragraphs"
      :key="pi"
      class="paragraph"
      :class="paragraph.type"
    >
      <h3 v-if="paragraph.label" class="label">{{ paragraph.label }}</h3>
      <p
        v-for="(line, li) in paragraph.lines"
        :key="li"
        :class="line.isComment ? 'comment' : 'line'"
      >
        <span
          v-for="(seg, si) in segments(line)"
          :key="si"
          :class="[seg.cls, { clickable: seg.chord }]"
          :role="seg.chord ? 'button' : undefined"
          :tabindex="seg.chord ? 0 : undefined"
          @click="seg.chord && activateChord($event, seg.chord)"
          @keydown.enter.prevent="seg.chord && activateChord($event, seg.chord)"
          @keydown.space.prevent="seg.chord && activateChord($event, seg.chord)"
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

.chord.clickable:hover,
.chord.clickable:focus-visible,
.chord.clickable.chord-open {
  background: var(--sv-surface-hover);
  outline: none;
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
