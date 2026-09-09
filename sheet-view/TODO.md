# TODOs

- Add live scroll for music
- Improve chord catalog

- Support for other instruments
  - **Done:** 13 tunings, grouped in the picker (ukulele / guitar / other):
    ukulele GCEA, baritone/Chicago-tenor DGBE, D 'Formby' ADF#B, B-flat FBbDG,
    standard guitar EADGBE, Celtic DADGAD, Open D DADF#AD, Open G DGDGBD,
    guitalele ADGCEA, mandolin GDAE, tenor guitar CGDA, banjo DGBD, banjo C CGBD.
  - Adding another is still a data entry in `INSTRUMENTS` + a generated
    dictionary — see the "Adding an instrument" recipe in `CONTRIBUTING.md`.
  - Baritone ukulele reuses the id `tenor-chicago` (same DGBE tuning). Open G is
    DGDGBD (the earlier note said `DBDGBD` — a typo).
  - `banjo` (DGBD) has 4 unvoiced dense chords (C7b9, Db13, Bbm9, Bmaj9) — only
    three distinct open pitch classes, so a few 5-note shapes don't fit the
    window. Hand-fix in `banjo.ts` if a chart needs one.

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
- **Done:** Sort the chords in the chord diagrams.
