/**
 * localStorage helpers shared by the Pinia stores. Both swallow exceptions so
 * that private-mode / disabled-storage browsers degrade to "the choice just
 * won't persist" rather than throwing.
 */

/** Read a persisted preference, running `parse` on the raw string (absent → null). */
export function readStored<T>(key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : parse(raw)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode, disabled) — the choice just won't persist
  }
}
