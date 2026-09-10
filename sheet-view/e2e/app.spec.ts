import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const SAMPLE_CHART = fileURLToPath(new URL('./fixtures/sample.cho', import.meta.url))

test('opens on the drop zone', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Sheet-View', level: 1 })).toBeVisible()
  await expect(page.locator('.drop-zone')).toBeVisible()
  await expect(page.getByText('Drop a ChordPro file here')).toBeVisible()
})

test('renders a picked chart with its header controls', async ({ page }) => {
  await page.goto('/')

  // The file <input> is hidden; set it directly rather than driving the picker.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)

  // DropZone gives way to SheetViewer.
  await expect(page.locator('.drop-zone')).toBeHidden()
  await expect(page.locator('.viewer-header')).toBeVisible()

  // Lyrics from the fixture made it through the parser/formatter. HtmlDivFormatter
  // interleaves each chord with its lyric fragment in DOM order, so assert on a
  // single fragment rather than the whole line.
  await expect(page.locator('.sheet-body')).toContainText('line for the')

  // The instrument picker is a header <select> (moved out of the Display panel).
  const instrument = page.getByLabel('Instrument')
  await expect(instrument).toBeVisible()
  await expect(page.locator('.viewer-header')).toContainText('Key')
})

test('switching instrument redraws the chord diagrams', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
  await expect(page.locator('.viewer-header')).toBeVisible()

  // Diagrams on, then pick a ukulele tuning and confirm the strip re-renders.
  const diagramsToggle = page.getByRole('checkbox', { name: 'Diagrams' })
  if (!(await diagramsToggle.isChecked())) await diagramsToggle.check()

  await expect(page.locator('.chord-diagrams svg').first()).toBeVisible()

  await page.getByLabel('Instrument').selectOption({ label: 'Usual (GCEA)' })
  await expect(page.locator('.chord-diagrams svg').first()).toBeVisible()
})

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the HTML chart wraps instead of overflowing the screen', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
    await expect(page.locator('.viewer-header')).toBeVisible()
    await expect(page.locator('.sheet .row').first()).toBeVisible()

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
})

test('the Display panel no longer carries the instrument picker', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
  await page.getByRole('button', { name: 'Display' }).click()

  const panel = page.locator('.panel')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('Diagrams')
  await expect(panel).toContainText('Theme')
  await expect(panel.locator('select')).toHaveCount(0)
})
