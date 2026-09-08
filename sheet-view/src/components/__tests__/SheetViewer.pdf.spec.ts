import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { PdfFormatter } from 'chordsheetjs/pdf'
import { drawDiagramSheet } from '@/chords/pdf'
import SheetViewer from '../SheetViewer.vue'
import { useSheetStore } from '@/stores/sheet'

// chordsheetjs' own diagram renderer hard-codes a six-string neck, so SheetViewer
// only lets it draw for `diagrams: 'chordsheetjs'` instruments (guitar) and
// prepends its own page for the `builtin` ones (ukulele, tenor). Both decisions
// are keyed off INSTRUMENTS[instrument].diagrams — this pins that wiring.
type FakeFormatter = {
  format: () => void
  getDocumentWrapper: () => { doc: object; pageSize: { width: number; height: number } }
  generatePDF: () => Promise<Blob>
}

vi.mock('chordsheetjs/pdf', () => ({
  // a plain function, not an arrow — the component calls `new PdfFormatter(...)`
  PdfFormatter: vi.fn<() => FakeFormatter>(function () {
    return {
      format: vi.fn<() => void>(),
      getDocumentWrapper: () => ({ doc: {}, pageSize: { width: 600, height: 800 } }),
      generatePDF: vi.fn<() => Promise<Blob>>(async () => new Blob(['%PDF-1.4'])),
    }
  }),
}))
vi.mock('@/chords/pdf', () => ({ drawDiagramSheet: vi.fn<() => void>() }))

const SAMPLE = '{title: Test}\n{artist: Artist}\n\n[C]Hello [G]world'

async function mountPdf(instrument: 'guitar' | 'ukulele') {
  const store = useSheetStore()
  await store.loadFile(new File([SAMPLE], 'song.cho', { type: 'text/plain' }))
  store.instrument = instrument
  store.viewFormat = 'pdf'
  const wrapper = mount(SheetViewer)
  await flushPromises()
  return { store, wrapper }
}

function lastFormatterConfig() {
  const call = vi.mocked(PdfFormatter).mock.calls[0]
  return call?.[0] as { layout: { chordDiagrams: { enabled: boolean } } }
}

describe('SheetViewer — PDF diagram routing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(PdfFormatter).mockClear()
    vi.mocked(drawDiagramSheet).mockClear()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn<() => string>(() => 'blob:pdf-preview'),
      revokeObjectURL: vi.fn<() => void>(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lets chordsheetjs draw the diagrams for guitar and prepends no page of its own', async () => {
    const { wrapper } = await mountPdf('guitar')
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(lastFormatterConfig().layout.chordDiagrams.enabled).toBe(true)
    expect(drawDiagramSheet).not.toHaveBeenCalled()
  })

  it('suppresses chordsheetjs diagrams for ukulele and prepends its own page', async () => {
    const { wrapper } = await mountPdf('ukulele')
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(lastFormatterConfig().layout.chordDiagrams.enabled).toBe(false)
    expect(drawDiagramSheet).toHaveBeenCalledTimes(1)
  })
})
