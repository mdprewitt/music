# Sheet-View

Sheet-View is a web app that let's people view chordpro and other chord sheets.

File Support:

- chord pro
- chords over words (regular chord sheets)
- Ultimate Guitar sheets

## Usage

From the main screen, drop a file into the "View" area or click "View" to select a file.

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

## Deployment

The app is published to GitHub Pages at <https://mdprewitt.github.io/music/>. Any push to `main`
that touches `sheet-view/**` triggers `.github/workflows/pages.yml`, which runs `bun run build`
with `BASE_PATH` set to the project-page subpath and deploys `sheet-view/dist`. The workflow can
also be run manually from the Actions tab.

