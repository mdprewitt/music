/**
 * Post-process `HtmlDivFormatter` output before it is inserted with `v-html`.
 *
 * Three jobs:
 *
 *  1. **Sanitize.** `HtmlDivFormatter` does no HTML escaping — lyric,
 *     annotation, title and comment text is interpolated raw, and
 *     `pangoToHtml` passes any markup it does not recognise straight through.
 *     A chart is entirely attacker-controlled (drag-drop, a pasted URL, or the
 *     `?view=` query param), so the formatter output is untrusted markup and
 *     must be reduced to a known-safe element/attribute set before it reaches
 *     the DOM.
 *  2. **Mark chord cells.** The formatter emits inert markup, so `tabindex` /
 *     `role` cannot be set from a Vue template — we set them on the parsed
 *     document once, before it is serialised back out.
 *  3. **Normalise empty chord cells.** The formatter writes a chord-less column
 *     as `<div class="chord">\n</div>` (a lone whitespace text node). Emptying
 *     it lets the `.chord:empty` CSS rule give it a zero-width line box so the
 *     lyric beneath stays aligned with the rest of its row.
 */

/** Elements the formatter (and pango) legitimately produce. Everything else is dropped. */
const ALLOWED_TAGS = new Set([
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TD',
  'TH',
  'DIV',
  'SPAN',
  'P',
  'A',
  'H1',
  'H2',
  'H3',
  'H4',
  'BR',
  'WBR',
  'B',
  'I',
  'U',
  'S',
  'EM',
  'STRONG',
  'SUB',
  'SUP',
])

/** Attributes allowed on any element. `tabindex`/`role` are ours (added below). */
const GLOBAL_ATTRS = new Set(['class', 'tabindex', 'role'])

/** Extra attributes allowed on specific elements. */
const TAG_ATTRS: Record<string, Set<string>> = {
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan']),
  A: new Set(['href']),
}

function isSafeHref(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v.startsWith('#') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) {
    return true
  }
  return /^(?:https?:|mailto:|tel:)/.test(v)
}

/**
 * Depth-first: remove any element outside {@link ALLOWED_TAGS} (subtree and
 * all), then strip every attribute not explicitly allowed for what remains.
 */
function sanitizeElement(el: Element): void {
  // Snapshot both collections — they are live, and we remove from them here.
  for (const child of Array.from(el.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      child.remove()
      continue
    }
    sanitizeElement(child)
  }
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    const allowed = GLOBAL_ATTRS.has(name) || TAG_ATTRS[el.tagName]?.has(name) === true
    if (!allowed) {
      el.removeAttribute(attr.name)
      continue
    }
    if (el.tagName === 'A' && name === 'href' && !isSafeHref(attr.value)) {
      el.removeAttribute(attr.name)
    }
  }
}

/**
 * Reduce untrusted formatter markup to a safe element/attribute set, then add
 * `tabindex="0"` and `role="button"` to every `.chord` cell that holds a chord
 * name. The formatter also emits chord-less `.chord` spacer cells; those are
 * emptied (so `.chord:empty` styling applies) and left inert.
 */
export function markChordCells(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  sanitizeElement(doc.body)
  for (const cell of doc.querySelectorAll('.chord')) {
    if (!cell.textContent?.trim()) {
      // Drop the lone whitespace text node so the :empty rule matches.
      cell.textContent = ''
      continue
    }
    cell.setAttribute('tabindex', '0')
    cell.setAttribute('role', 'button')
  }
  return doc.body.innerHTML
}
