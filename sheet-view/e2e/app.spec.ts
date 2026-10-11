import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const SAMPLE_CHART = fileURLToPath(new URL('./fixtures/sample.cho', import.meta.url))

test('opens on the drop zone', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Sheet-View', level: 1 })).toBeVisible()
  await expect(page.locator('.drop-zone')).toBeVisible()
  await expect(page.getByText('Drop a ChordPro file here')).toBeVisible()
  await expect(page).toHaveTitle('Sheet-View')
})

test('renders a picked chart with its header controls', async ({ page }) => {
  await page.goto('/')

  // The file <input> is hidden; set it directly rather than driving the picker.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)

  // DropZone gives way to SheetViewer.
  await expect(page.locator('.drop-zone')).toBeHidden()
  await expect(page.locator('.viewer-header')).toBeVisible()

  // Tab title picks up the chart's {title: E2E Sample Song} directive.
  await expect(page).toHaveTitle('E2E Sample Song - Sheet-View')

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

  test('the Display panel stays on screen when its trigger wraps near the left edge', async ({
    page,
  }) => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
    await page.getByRole('button', { name: 'Display' }).click()

    const box = await page.locator('.panel').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  })

  test('the "Right" diagram strip stacks below the chart instead of overflowing the screen', async ({
    page,
  }) => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
    await page.getByRole('button', { name: 'Display' }).click()
    await page.locator('.position-selector .option', { hasText: 'Right' }).click()
    await expect(page.locator('.chord-diagrams')).toHaveClass(/pos-right/)

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
})

test.describe('songbook page', () => {
  test('the header link opens the song index, which filters and links back', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Songbook' }).first().click()
    await expect(page).toHaveURL(/\/songbook\.html$/)
    await expect(page.getByRole('heading', { name: 'Song Book' })).toBeVisible()

    // A known chart is listed, its viewer link round-trips through ?view=.
    const pinballRow = page.locator('tr', { hasText: 'Pinball Wizard' })
    await expect(pinballRow).toBeVisible()
    const viewerHref = await pinballRow
      .getByRole('link', { name: 'Pinball Wizard' })
      .getAttribute('href')
    expect(viewerHref).toMatch(/\?view=https:\/\/github\.com\/.+pinball-wizard-the-who\.cho$/)

    // Filtering narrows the table and updates the visible count.
    await page.getByLabel('Filter').fill('pinball')
    await expect(pinballRow).toBeVisible()
    await expect(page.locator('tr[data-search]:visible')).toHaveCount(1)
    await expect(page.locator('#count')).toHaveText('1 of 31 songs')

    // Escape clears the filter and restores every row.
    await page.getByLabel('Filter').press('Escape')
    await expect(page.locator('tr[data-search]:visible')).toHaveCount(31)

    // The back link returns to the drop zone.
    await page.getByRole('link', { name: /Sheet-View/ }).click()
    await expect(page.locator('.drop-zone')).toBeVisible()
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

test('the Display panel text size buttons resize the chart', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
  const chart = page.locator('.chord-sheet')
  const sizeOf = () => chart.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const before = await sizeOf()

  await page.getByRole('button', { name: 'Display' }).click()
  await page.getByRole('button', { name: 'Larger text' }).click()
  expect(await sizeOf()).toBeGreaterThan(before)

  await page.getByRole('button', { name: 'Reset' }).click()
  expect(await sizeOf()).toBe(before)
})

test('a page turner preset scrolls the chart by a screen', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 300 })
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
  // Make the page taller than the viewport so there is something to scroll.
  await page.evaluate(() => {
    document.body.style.minHeight = '3000px'
  })
  await page.getByRole('button', { name: 'Display' }).click()
  await page.locator('.option', { hasText: 'Page Up / Down' }).click()
  await page.getByRole('button', { name: 'Display' }).click()

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.keyboard.press('PageDown')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  await page.keyboard.press('PageUp')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})
