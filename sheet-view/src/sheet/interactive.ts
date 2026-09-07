/**
 * Post-process `HtmlTableFormatter` output so its chord cells can take
 * keyboard focus. The formatter emits inert markup rendered via `v-html`, so
 * `tabindex` / `role` cannot be set from a Vue template — we set them on the
 * string once, before it is inserted.
 */

/**
 * Add `tabindex="0"` and `role="button"` to every `td.chord` that holds a
 * chord name. The formatter also emits empty `td.chord` spacer cells; those
 * are left inert.
 */
export function markChordCells(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const cell of doc.querySelectorAll('td.chord')) {
    if (!cell.textContent?.trim()) continue
    cell.setAttribute('tabindex', '0')
    cell.setAttribute('role', 'button')
  }
  return doc.body.innerHTML
}
