# Sheet-View

Sheet-View is a web app that let's people view chordpro and other chord sheets.

File Support:

- chord pro
- chords over words (regular chord sheets)
- Ultimate Guitar sheets

## Usage

From the main screen, drop a file into the "View" area, click "View" to select a file, or paste
the URL of a chart and click "Fetch".

GitHub and Gist links are handled specially: a `github.com/.../blob/...` page URL (the one you
copy from the browser address bar) is rewritten to its `raw.githubusercontent.com` equivalent
automatically, so it just works. Any other URL is fetched directly and only succeeds if that
site allows cross-origin requests (many do not). When a fetch is blocked, or the URL returns a
web page instead of a chart file, download the file and drop it in instead.

You can also link straight to a chart with a `?view=` query parameter, which loads it on
startup — e.g. `https://mdprewitt.github.io/music/?view=https://github.com/mdprewitt/music/blob/main/chpro/deacon-blues.cho`.
Percent-encode the chart URL if it has its own query string; a plain GitHub/Gist link needs no
encoding.

The viewer opens each sheet in the HTML view by default. A view selector in the viewer header
lets the user switch between:
- ChordPro
- HTML (default) — chords stacked above the words, exact alignment
- HTML inline — chords bracketed in the lyric flow, wraps to the window width
- PDF (inline preview with a download button)

Chord diagrams are displayed at the top of the chart. Switch chord display by choosing the instrument
(guitar, ukulele), or hide them with the "Chord diagrams" toggle. The instrument is guessed from the
file (an `{instrument}` directive, or the string count of its own chord definitions) and remembered
once you pick one.

Chord diagrams position can be toggled from top to right-side to bottom and can be pinned so they stay in one position while the music can scroll.

In the HTML and HTML-inline views you can also **click any chord** to pop its diagram up right above
that chord — a quick look at one shape without scanning the whole strip. It works even with the
"Chord diagrams" toggle off; press Esc, click elsewhere, or click the chord again to dismiss.

## Colour themes

A theme selector in the viewer header offers four standard colour templates —
**Light**, **Dark**, **Sepia** (warm, paper-like) and **Stage** (near-black with
high-contrast amber chords, for low-light use) — plus **Custom**. Choosing Custom
reveals five colour pickers (background, lyrics, chords, comments, title); they
start from whatever theme was showing, so you can nudge one colour rather than
build a palette from scratch. "Reset to Light" restores the defaults.

The theme colours everything: the page, the chord sheet, the chord diagrams and
the controls. Your choice — preset or custom colours — is remembered in the
browser and restored on the next visit. On a first visit with nothing saved, the
app follows your operating system's light/dark setting.

The **PDF** view is always rendered black-on-white regardless of the theme.

