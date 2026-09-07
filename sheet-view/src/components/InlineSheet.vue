<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from 'chordsheetjs'
import { toInlineSheet, type InlineLine } from '@/sheet/inline'

const props = defineProps<{ song: Song }>()

const sheet = computed(() => toInlineSheet(props.song))

/**
 * Flatten a line's tokens to styled text segments. Done here rather than in the
 * template so the `.line` markup can be a single element — with `white-space:
 * pre-wrap`, any whitespace between sibling tags would render as a gap.
 */
function segments(line: InlineLine): { cls: string; text: string }[] {
  const out: { cls: string; text: string }[] = []
  for (const token of line.tokens) {
    switch (token.kind) {
      case 'pair':
        if (token.chord) out.push({ cls: 'chord', text: `[${token.chord}]` })
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
        <span v-for="(seg, si) in segments(line)" :key="si" :class="seg.cls">{{ seg.text }}</span>
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
