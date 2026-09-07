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

The viewer header stays to a single row: the filename, a view selector, a **Diagrams** on/off
toggle, a **Display** button (see below), and **Load another**. A view selector lets the user
switch between:
- ChordPro
- HTML — chords stacked above the words, exact alignment
- HTML inline — chords bracketed in the lyric flow, wraps to the window width
- PDF (inline preview with a download button)

The first sheet opens in the HTML view; after that the viewer remembers the last view you chose
and reopens each sheet in it.

**Display** opens a small panel with the set-once preferences, grouped and labelled:
- **Instrument** — guitar or ukulele. Guessed from the file (an `{instrument}` directive, or the
  string count of its own chord definitions) and remembered once you pick one.
- **Diagrams** — where the chord strip sits (top, right, bottom) and whether it stays pinned in
  place while the music scrolls. Shown only while diagrams are on and outside the PDF view.
- **Theme** — the colour templates and custom pickers described below.

The panel is anchored under its button, so opening it never pushes the chart down, and it closes
on <kbd>Esc</kbd> or a click outside. Whether it was left open is remembered too.

Chord diagrams are displayed at the top of the chart by default; hide them with the header's
**Diagrams** toggle.

In the HTML and HTML-inline views you can also **click any chord** to pop its diagram up right above
that chord — a quick look at one shape without scanning the whole strip. It works even with the
"Chord diagrams" toggle off; press Esc, click elsewhere, or click the chord again to dismiss.

## Colour themes

The theme selector lives in the **Display** panel and offers four standard colour
templates — **Light**, **Dark**, **Sepia** (warm, paper-like) and **Stage**
(near-black with high-contrast amber chords, for low-light use) — plus **Custom**.
Choosing Custom reveals five colour pickers (background, lyrics, chords, comments,
title); they start from whatever theme was showing, so you can nudge one colour
rather than build a palette from scratch. "Reset to Light" restores the defaults.

The theme colours everything: the page, the chord sheet, the chord diagrams and
the controls. Your choice — preset or custom colours — is remembered in the
browser and restored on the next visit. On a first visit with nothing saved, the
app follows your operating system's light/dark setting.

The **PDF** view is always rendered black-on-white regardless of the theme.

