/**
 * Per-song key memory for the "change the key" feature.
 *
 * chordsheetjs does the transposition (`Song#changeKey`); this module only
 * decides *which* key a freshly loaded sheet should open in — the one the reader
 * last left it in. A song is identified by its `{title}` + `{artist}` directives
 * (falling back to the filename), so the same chart loaded from a file one day
 * and a URL the next still recalls its key.
 *
 * The list lives in `localStorage` under one JSON key as an array of
 * `[songId, key]` pairs (newest last), read/written through the shared
 * `readStored`/`writeStored` helpers (no re-implemented try/catch). A legacy
 * `{ id: key }` object is migrated on read.
 */
import type { Song } from 'chordsheetjs'
import { readStored, writeStored } from '@/stores/storage'

const SONG_KEYS_STORAGE_KEY = 'sheet-view:songKeys'
/** Cap the list so it cannot grow without bound; oldest entries are evicted. */
const MAX_REMEMBERED = 100

/** `[songId, key]`, newest last. An explicit array — not an object — because
 *  object key order puts integer-like ids (`"1984"`) first regardless of
 *  insertion, which would make them un-promotable and evicted first. */
type KeyEntry = [id: string, key: string]

function parseKeyEntries(raw: string): KeyEntry[] | null {
  const parsed: unknown = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (entry): entry is KeyEntry =>
        Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string',
    )
  }
  // Legacy `{ id: key }` object — migrate on read; the next write stores an array.
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed).filter(
      (entry): entry is KeyEntry => typeof entry[1] === 'string',
    )
  }
  return null
}

/** A metadata value can be a string, an array of strings, or absent. */
export function metaText(value: string | string[] | null | undefined): string {
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
  const entries = readStored(SONG_KEYS_STORAGE_KEY, parseKeyEntries) ?? []
  return entries.find(([entryId]) => entryId === id)?.[1] ?? null
}

/**
 * Remember (or, with `key === null`, forget) the key for a song. Re-inserting an
 * existing id moves it to the newest position so eviction drops the least
 * recently chosen.
 */
export function rememberKey(id: string | null, key: string | null): void {
  if (!id) return
  const entries = (readStored(SONG_KEYS_STORAGE_KEY, parseKeyEntries) ?? []).filter(
    ([entryId]) => entryId !== id,
  )
  if (key !== null) entries.push([id, key])
  writeStored(SONG_KEYS_STORAGE_KEY, JSON.stringify(entries.slice(-MAX_REMEMBERED)))
}
