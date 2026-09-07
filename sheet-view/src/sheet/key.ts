/**
 * Per-song key memory for the "change the key" feature.
 *
 * chordsheetjs does the transposition (`Song#changeKey`); this module only
 * decides *which* key a freshly loaded sheet should open in — the one the reader
 * last left it in. A song is identified by its `{title}` + `{artist}` directives
 * (falling back to the filename), so the same chart loaded from a file one day
 * and a URL the next still recalls its key.
 *
 * The map lives in `localStorage` under one JSON key, read/written through the
 * shared `readStored`/`writeStored` helpers (no re-implemented try/catch).
 */
import type { Song } from 'chordsheetjs'
import { readStored, writeStored } from '@/stores/storage'

const SONG_KEYS_STORAGE_KEY = 'sheet-view:songKeys'
/** Cap the map so it cannot grow without bound; oldest entries are evicted. */
const MAX_REMEMBERED = 100

type KeyMap = Record<string, string>

function parseKeyMap(raw: string): KeyMap | null {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const out: KeyMap = {}
  for (const [id, key] of Object.entries(parsed)) {
    if (typeof key === 'string') out[id] = key
  }
  return out
}

/** A metadata value can be a string, an array of strings, or absent. */
function metaText(value: string | string[] | null | undefined): string {
  return (Array.isArray(value) ? value.join(' ') : (value ?? '')).trim()
}

/**
 * A stable identity for a song: `title‖artist`, lowercased; the filename when
 * there is no title; `null` when there is nothing to key on.
 */
export function songIdentity(song: Song | null, filename: string | null): string | null {
  const composed = [metaText(song?.title), metaText(song?.artist)].filter(Boolean).join('‖')
  if (composed) return composed.toLowerCase()
  const name = filename?.trim().toLowerCase()
  return name || null
}

/** The key this song was last read in, or `null` if none is remembered. */
export function recallKey(id: string | null): string | null {
  if (!id) return null
  return readStored(SONG_KEYS_STORAGE_KEY, parseKeyMap)?.[id] ?? null
}

/**
 * Remember (or, with `key === null`, forget) the key for a song. Re-inserting an
 * existing id moves it to the newest position so eviction drops the least
 * recently chosen.
 */
export function rememberKey(id: string | null, key: string | null): void {
  if (!id) return
  const map = readStored(SONG_KEYS_STORAGE_KEY, parseKeyMap) ?? {}
  delete map[id]
  if (key !== null) map[id] = key
  const ids = Object.keys(map)
  for (const stale of ids.slice(0, Math.max(0, ids.length - MAX_REMEMBERED))) {
    delete map[stale]
  }
  writeStored(SONG_KEYS_STORAGE_KEY, JSON.stringify(map))
}
