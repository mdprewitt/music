import { nextTick, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * A single shared "polite" status message (WCAG 4.1.3) for events that would
 * otherwise happen silently: a parse/fetch/PDF error or success, a key or
 * instrument change re-rendering the whole chart, a chord's diagram opening.
 * `LiveAnnouncer.vue` renders `message` in one `role="status"` region, mounted
 * once in `App.vue` — inserting text into an *existing* live region is what
 * gets it announced; mounting a fresh one on demand is unreliable.
 */
export const useAnnouncerStore = defineStore('announcer', () => {
  const message = ref('')

  /**
   * Push a status message. Clears first and sets on the next tick so the
   * *same* text announced twice in a row (an unchanged error shown again,
   * say) still triggers a screen reader — announcement fires on a content
   * mutation, not on a Vue re-render that happens to produce identical text.
   */
  async function announce(text: string) {
    message.value = ''
    await nextTick()
    message.value = text
  }

  return { message, announce }
})
