/**
 * The deck, driven the way a person would: a slide is on the page and its
 * entrance is animating, the arrows and keys move between slides, deep links
 * open a given slide, the graphic's own index navigates, and the theme toggle
 * swaps the variant of the current slide.
 */
import './bonds.js'
import { expect, test } from '@molecule/app-e2e-fixtures-default'

const deck = '[data-mol-id="slideshow"]'

/** Whether the current slide's entrance animations exist and are running. */
async function animating(
  page: import('@playwright/test').Page,
): Promise<{ count: number; running: number }> {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-mol-id="slide-stage"]') as HTMLElement
    const all = stage.getAnimations({ subtree: true })
    return { count: all.length, running: all.filter((a) => a.playState === 'running').length }
  })
}

test('the first slide is inlined and animating on load', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-mol-id="slide-stage"] svg')).toBeVisible()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '0')
  const a = await animating(page)
  expect(a.count).toBeGreaterThan(20)
  expect(a.running).toBeGreaterThan(0)
})

test('arrows and keys move between slides and keep the address in step', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-mol-id="slides-next"]').click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
  expect(new URL(page.url()).hash).toBe('#bonds')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '0')
  await page.locator('[data-mol-id="slides-prev"]').click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
  await page.keyboard.press('3')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  await expect(page.locator('[data-mol-id="slides-counter"]')).toHaveText('3 / 5')
})

test('a deep link opens that slide, and each new slide animates in fresh', async ({ page }) => {
  await page.goto('/#outcomes')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
  await page.locator('[data-mol-id="slides-go-4"]').click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '3')
  const a = await animating(page)
  expect(a.running).toBeGreaterThan(0)
})

test('the index inside the graphic navigates too', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-mol-id="slide-stage"] [data-scene="2"]').click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
})

test('the theme toggle swaps the variant and stays on the same slide', async ({ page }) => {
  await page.goto('/#bonds')
  const fillBefore = await page
    .locator('[data-mol-id="slide-stage"] svg > rect')
    .first()
    .getAttribute('fill')
  await page
    .getByRole('button', { name: /theme|dark|light/i })
    .first()
    .click()
  await expect
    .poll(() => page.locator('[data-mol-id="slide-stage"] svg > rect').first().getAttribute('fill'))
    .not.toBe(fillBefore)
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
})

test('the looping SVGs are served for embedding', async ({ page }) => {
  for (const theme of ['dark', 'light']) {
    const res = await page.request.get(`/how-molecule-works-${theme}.svg`)
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('image/svg+xml')
    expect(await res.text()).toContain('How Molecule works')
  }
  await page.goto('/')
  await expect(page.getByRole('link', { name: /looping svg \(dark\)/i })).toBeVisible()
})

test.describe('under a dark OS preference', () => {
  test.use({ colorScheme: 'dark' })

  test('the site and the slide start dark without a saved choice', async ({ page }) => {
    await page.goto('/')
    await expect
      .poll(() =>
        page.locator('[data-mol-id="slide-stage"] svg > rect').first().getAttribute('fill'),
      )
      .toBe('#0e0e0e')
  })
})
