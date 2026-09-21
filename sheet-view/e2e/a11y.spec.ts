import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fileURLToPath } from 'node:url'

/**
 * A real-browser accessibility sweep with axe-core, on top of the targeted
 * unit/e2e assertions elsewhere (aria-expanded toggling, focus return, roving
 * tabindex, contrast ratios, …). Those pin down specific fixes; this catches
 * anything else axe's ruleset knows about, on the actual rendered page.
 */

const SAMPLE_CHART = fileURLToPath(new URL('./fixtures/sample.cho', import.meta.url))
const THEMES = ['Light', 'Dark', 'Sepia', 'Stage'] as const

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

async function loadSample(page: Page) {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CHART)
  await expect(page.locator('.viewer-header')).toBeVisible()
}

test.describe('accessibility (axe-core)', () => {
  test('the drop zone has no violations', async ({ page }) => {
    await page.goto('/')
    await expectNoViolations(page)
  })

  test('the HTML view has no violations', async ({ page }) => {
    await loadSample(page)
    await expect(page.locator('.sheet .row').first()).toBeVisible()
    await expectNoViolations(page)
  })

  test('the HTML inline view has no violations', async ({ page }) => {
    await loadSample(page)
    await page.locator('.option', { hasText: 'HTML inline' }).click()
    await expect(page.locator('.inline-sheet')).toBeVisible()
    await expectNoViolations(page)
  })

  test('the ChordPro (plain text) view has no violations', async ({ page }) => {
    await loadSample(page)
    await page.locator('.option', { hasText: 'ChordPro' }).click()
    await expect(page.locator('pre.plain')).toBeVisible()
    await expectNoViolations(page)
  })

  test('the open Display panel has no violations', async ({ page }) => {
    await loadSample(page)
    await page.getByRole('button', { name: 'Display' }).click()
    await expect(page.locator('.panel')).toBeVisible()
    await expectNoViolations(page)
  })

  test('an open chord popover has no violations', async ({ page }) => {
    await loadSample(page)
    await page.locator('.sheet .chord[role="button"]').first().click()
    await expect(page.locator('.chord-popover')).toBeVisible()
    await expectNoViolations(page)
  })

  for (const themeLabel of THEMES) {
    test(`the ${themeLabel} theme has no violations`, async ({ page }) => {
      await loadSample(page)
      await page.getByRole('button', { name: 'Display' }).click()
      await page.locator('.theme-selector .option', { hasText: themeLabel }).click()
      await page.keyboard.press('Escape')
      // base.css's body colour transition is 500ms; let it settle so axe's
      // contrast check reads the theme's final colours, not a mid-fade one.
      await page.waitForTimeout(600)
      await expectNoViolations(page)
    })
  }
})

test.describe('narrow viewport (320px)', () => {
  test.use({ viewport: { width: 320, height: 700 } })

  test('the "Right" diagram strip does not overflow at 320px', async ({ page }) => {
    await loadSample(page)
    await page.getByRole('button', { name: 'Display' }).click()
    await page.locator('.position-selector .option', { hasText: 'Right' }).click()
    await expect(page.locator('.chord-diagrams')).toHaveClass(/pos-right/)
    await page.keyboard.press('Escape')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
})
