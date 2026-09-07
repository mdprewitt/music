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
- Plain Text
- Chords over words
- HTML (default)
- PDF (inline preview with a download button)

Chord diagrams are displayed at the top of the chart. Switch chord display by choosing the instrument
(guitar, ukulele), or hide them with the "Chord diagrams" toggle. The instrument is guessed from the
file (an `{instrument}` directive, or the string count of its own chord definitions) and remembered
once you pick one.

Chord diagrams position can be toggled from top to right-side to bottom and can be pinned so they stay in one position while the music can scroll.

