<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue'
import type { Song } from 'chordsheetjs'
import { useSheetStore } from '@/stores/sheet'
import { useThemeStore } from '@/stores/theme'
import { useAnnouncerStore } from '@/stores/announcer'
import { applyTheme } from '@/theme/apply'
import { pageTitle } from '@/sheet/title'
import DropZone from './components/DropZone.vue'
import SheetViewer from './components/SheetViewer.vue'
import AboutDialog from './components/AboutDialog.vue'
import LicenseDialog from './components/LicenseDialog.vue'
import LiveAnnouncer from './components/LiveAnnouncer.vue'
// Same drawing as public/favicon.svg — keep the two in sync.
import ukuleleLogo from '@/assets/ukulele.svg'

const store = useSheetStore()
const theme = useThemeStore()
const announcer = useAnnouncerStore()

// store.parseError is set from two places — store.parse() and the ?view=
// failure handler below — so it's watched here (mounted for the app's whole
// lifetime, before the ref is ever set) rather than in SheetViewer.vue, which
// mounts/unmounts per sheet and would miss whichever change happened first
// (WCAG 4.1.3: a parse failure was previously silent to a screen reader).
watch(
  () => store.parseError,
  (error) => {
    if (error) announcer.announce(error)
  },
)

// Push the active palette onto :root as inline custom properties whenever it
// changes — this is what makes an explicit theme choice outrank the OS setting.
watchEffect(() => applyTheme(theme.colors))

// The tab title names the song being viewed (its {title}, or the filename it
// was loaded from) and falls back to the bare app name otherwise — drop zone,
// parse error, or after "Load another". store.song is markRaw'd so Pinia's
// UnwrapRef loses class fidelity; cast back like SheetViewer.vue does.
watchEffect(() => {
  document.title = pageTitle(store.song as Song | null, store.filename)
})

const aboutDialog = ref<InstanceType<typeof AboutDialog>>()
const licenseDialog = ref<InstanceType<typeof LicenseDialog>>()

// `?view=<chart-url>` on the page URL auto-loads that chart on startup, so a
// chart can be linked to directly. The value should be percent-encoded if it
// carries its own query string; a plain GitHub/Gist link needs no encoding.
onMounted(() => {
  const viewUrl = new URLSearchParams(window.location.search).get('view')
  if (!viewUrl) return
  store.loadFromUrl(viewUrl).catch((err: unknown) => {
    store.parseError = err instanceof Error ? err.message : 'Could not load that URL.'
  })
})

function openAbout() {
  if (aboutDialog.value) aboutDialog.value.isOpen = true
}

function openLicense() {
  if (licenseDialog.value) licenseDialog.value.isOpen = true
}
</script>

<template>
  <div class="app-container">
    <!-- The chart's chords are one roving tab stop each (SheetViewer.vue /
         InlineSheet.vue), not individually tabbable, so a skip link is no
         longer just a nicety — without it every header control still had to
         be tabbed past to reach the chart (WCAG 2.4.1). tabindex="-1" makes
         #main-content a valid programmatic focus target; it isn't otherwise
         tabbable. -->
    <a href="#main-content" class="skip-link">Skip to chart</a>
    <LiveAnnouncer />
    <header>
      <img :src="ukuleleLogo" alt="" class="logo" width="32" height="32" />
      <h1>Sheet-View</h1>
    </header>
    <main id="main-content" tabindex="-1">
      <DropZone v-if="!store.song && !store.parseError" />
      <SheetViewer v-else />
    </main>
    <footer>
      <nav>
        <button @click="openAbout" class="link-btn">About</button>
        <button @click="openLicense" class="link-btn">License</button>
        <a href="https://github.com/mdprewitt/music" target="_blank" rel="noopener noreferrer"
          class="link-btn">GitHub<span class="sr-only"> (opens in a new window)</span></a>
      </nav>
    </footer>
    <AboutDialog ref="aboutDialog" />
    <LicenseDialog ref="licenseDialog" />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.skip-link {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: var(--sv-chord);
  color: var(--sv-on-accent);
  border-radius: 0 0 4px 0;
  /* Off-screen (not display:none — it must stay focusable) until focused,
     with no transition: an instant snap into view carries the same
     information as an animated one, with none of the motion. */
  transform: translateY(-100%);
}

.skip-link:focus {
  transform: translateY(0);
}

main:focus-visible {
  /* A ring around the whole viewer when the skip link lands here is more
     distracting than useful — the ring on whichever chord/control the reader
     lands on next is the one that matters. */
  outline: none;
}

header {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.logo {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  color: var(--sv-chord);
}

main {
  flex: 1;
}

footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--sv-divider);
  text-align: center;
  font-size: 0.9rem;
}

nav {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--sv-chord);
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  /* Always underlined, not just on hover — colour alone doesn't reliably
     distinguish these from surrounding footer text (WCAG 1.4.1). */
  text-decoration: underline;
}

/* App chrome — the skip link, logo/title and About/License/GitHub nav —
   serves a screen, not a printed page. */
@media print {
  .skip-link,
  header,
  footer {
    display: none;
  }
}
</style>
