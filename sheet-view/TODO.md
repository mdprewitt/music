# TODOs

- Remove teh PlainText and "chord over Words" options
- Flow chord grid better, right side, use multi columns
- Add live scroll for music
- Improve chord catalog
- Support for other instruments (banjo, tenor guitar, mandolin)
- Load files from github or other url
  - **Done:** DropZone takes a pasted URL, and a `?view=<chart-url>` query param
    on the app URL auto-loads a chart on startup (`App.vue`). `toFetchableUrl()`
    in `src/stores/sheet.ts` rewrites `github.com/.../blob|raw/...` and
    `gist.github.com/...` links to their CORS-enabled raw hosts; everything else
    is fetched as-is. A blocked fetch or an HTML body throws a message telling
    the user to download and drop the file.
  - **No proxy.** The earlier `corsproxy.io` fallback was removed — the service
    now requires an API key (returns 401). More importantly, a proxy does **not**
    help the sites people actually hit: `raw.githubusercontent.com` already sends
    `access-control-allow-origin: *` (no proxy needed), and bot-challenged sites
    like ozbcoz.com return a Cloudflare JS challenge to any non-browser client —
    a Worker gets challenged too. Only a real browser session passes those.
  - **If revisited:** a self-hosted Cloudflare Worker / same-origin function is
    worth it *only* for plain sites that lack CORS headers but serve the file
    directly. Gate the client on `import.meta.env.VITE_FETCH_PROXY` (added to the
    CI build step's `env:` next to `BASE_PATH`) so dev and tests run without it.
    It still can't defeat bot challenges.
- Color customization templates. Provide Standard 4 templates + custom for background, lyrics, chord colors. customization is saved in localStorage
  - **Done:** a theme selector in the viewer header offers 4 presets (Light,
    Dark, Sepia, Stage) plus Custom (5 colour pickers: background, lyrics,
    chords, comments, title). The whole app is coloured by five `--sv-*` CSS
    vars on `:root`; `applyTheme()` (`src/theme/apply.ts`) writes them inline so
    a choice outranks `prefers-color-scheme`. `src/stores/theme.ts` persists
    `sheet-view:theme` + `sheet-view:customColors` and follows the OS scheme on
    first visit. PDF output stays black-on-white.
