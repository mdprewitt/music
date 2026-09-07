import { vi } from 'vitest'

/**
 * jsdom in this project ships without a working `Storage`, so tests that
 * exercise preference persistence install this minimal in-memory one. Pair
 * with `vi.unstubAllGlobals()` in `afterEach`.
 */
export function installMemoryStorage(): void {
  const map = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  })
}
