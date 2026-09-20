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

/**
 * Attributes allowed on any element, straight from the untrusted formatter
 * output. `tabindex`/`role`/`aria-expanded` are ours — `markChordCells()`
 * sets them itself, on the parsed document, *after* `sanitizeElement()` runs
 * below, so they never need to survive this allowlist. Keeping them off it
 * closes what would otherwise be a hole: a chart could ship its own
 * `role="alert"` or a `tabindex` moving a chord out of the roving tab
 * order, and this filter would have waved it through as one of "ours".
 */
const GLOBAL_ATTRS = new Set(['class'])

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
 * Reduce untrusted formatter markup to a safe element/attribute set, then mark
 * every `.chord` cell that holds a chord name as a `role="button"`. Only the
 * *first* one gets `tabindex="0"` — the rest get `-1` (a roving tab stop, per
 * the ARIA APG composite-widget pattern: WCAG 2.4.3 — every chord in a long
 * chart being its own tab stop, with no way to skip past them, was previously
 * unnavigable). SheetViewer.vue's delegated keydown handler
 * (`handleRovingArrowKey`, `src/sheet/rovingFocus.ts`) moves the `0` with the
 * arrow keys, Home and End. The formatter also emits chord-less `.chord`
 * spacer cells; those are emptied (so `.chord:empty` styling applies) and
 * left inert.
 */
export function markChordCells(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  sanitizeElement(doc.body)
  let isFirst = true
  for (const cell of doc.querySelectorAll('.chord')) {
    if (!cell.textContent?.trim()) {
      // Drop the lone whitespace text node so the :empty rule matches.
      cell.textContent = ''
      continue
    }
    cell.setAttribute('tabindex', isFirst ? '0' : '-1')
    isFirst = false
    cell.setAttribute('role', 'button')
    // Reflects whether this chord's diagram popover is open; SheetViewer.vue
    // flips it (and sets/clears aria-controls) imperatively in openFor()/
    // closePopover(), the same way it toggles the .chord-open class — these
    // attributes are added after sanitizeElement() runs, so they are ours,
    // not untrusted chart markup, and don't need a GLOBAL_ATTRS allowance.
    cell.setAttribute('aria-expanded', 'false')
  }
  return doc.body.innerHTML
}
