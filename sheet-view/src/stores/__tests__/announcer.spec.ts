import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnnouncerStore } from '../announcer'

describe('useAnnouncerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets the message', async () => {
    const store = useAnnouncerStore()
    await store.announce('Key: C')
    expect(store.message).toBe('Key: C')
  })

  it('clears the message before the next tick, then sets the new text', async () => {
    const store = useAnnouncerStore()
    await store.announce('First')
    expect(store.message).toBe('First')

    const pending = store.announce('First')
    // Cleared synchronously (before the microtask that sets the new text) so
    // a screen reader sees a real content change even when the text repeats —
    // announcement fires on mutation, not on Vue re-rendering identical text.
    expect(store.message).toBe('')
    await pending
    expect(store.message).toBe('First')
  })
})
