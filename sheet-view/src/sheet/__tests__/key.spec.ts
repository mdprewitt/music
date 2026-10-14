import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { recallKey, rememberKey, songIdentity } from '../key'
import { installMemoryStorage } from '@/__tests__/memoryStorage'

const STORAGE_KEY = 'sheet-view:songKeys'

describe('per-song key memory', () => {
  beforeEach(() => installMemoryStorage())
  afterEach(() => vi.unstubAllGlobals())

  it('remembers and recalls a key by id', () => {
    rememberKey('song-a', 'E')
    expect(recallKey('song-a')).toBe('E')
    expect(recallKey('song-b')).toBeNull()
  })

  it('forgets a key when passed null', () => {
    rememberKey('song-a', 'E')
    rememberKey('song-a', null)
    expect(recallKey('song-a')).toBeNull()
  })

  it('is a no-op for a null id', () => {
    rememberKey(null, 'E')
    expect(recallKey(null)).toBeNull()
  })

  it('keeps an integer-like id promotable in the LRU', () => {
    rememberKey('1984', 'C')
    for (let i = 0; i < 100; i += 1) rememberKey(`s${i}`, 'G') // pushes '1984' out
    expect(recallKey('1984')).toBeNull()

    rememberKey('1984', 'D') // re-touched — now the newest entry
    for (let i = 0; i < 50; i += 1) rememberKey(`t${i}`, 'G') // still within the cap
    expect(recallKey('1984')).toBe('D')
  })

  it('evicts the least-recently-set entries past the cap', () => {
    for (let i = 0; i < 105; i += 1) rememberKey(`song-${i}`, 'E')
    expect(recallKey('song-0')).toBeNull()
    expect(recallKey('song-4')).toBeNull()
    expect(recallKey('song-5')).toBe('E')
    expect(recallKey('song-104')).toBe('E')
  })

  it('migrates a legacy { id: key } object map on read', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'old-song': 'A', '1984': 'B' }))
    expect(recallKey('old-song')).toBe('A')
    expect(recallKey('1984')).toBe('B')
    // a subsequent write rewrites it as an array, carrying the legacy entries
    rememberKey('new-song', 'C')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
    expect(Array.isArray(stored)).toBe(true)
    expect(stored).toEqual(expect.arrayContaining([['old-song', 'A'], ['1984', 'B'], ['new-song', 'C']]))
    expect(stored).toHaveLength(3)
  })
})

describe('songIdentity', () => {
  it('keys on title‖artist, lowercased', () => {
    expect(
      songIdentity({ title: 'Wild Horses', artist: 'The Rolling Stones' } as never, null),
    ).toBe('wild horses‖the rolling stones')
  })

  it('falls back to the filename when there is no title', () => {
    expect(songIdentity({ title: '', artist: '' } as never, 'Song-A.cho')).toBe('song-a.cho')
  })

  it('is null when there is nothing to key on', () => {
    expect(songIdentity(null, null)).toBeNull()
    expect(songIdentity({ title: '', artist: '' } as never, '  ')).toBeNull()
  })
})
