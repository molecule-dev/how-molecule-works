/**
 * The deck, driven the way a person would: it plays by itself until you take
 * over; the graphic's own index row (segments and chevrons), the keys and deep
 * links navigate; hovering explains packages; package chips open their pages;
 * the theme follows the OS and the toggle swaps the variant.
 */
import './bonds.js'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

const deck = '[data-mol-id="slideshow"]'
const stage = '[data-mol-id="slide-stage"]'

test('the first slide is inlined and animating on load', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator(`${stage} svg`)).toBeVisible()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '0')
  const a = await page.evaluate(() => {
    const el = document.querySelector('[data-mol-id="slide-stage"]') as HTMLElement
    const all = el.getAnimations({ subtree: true })
    return { count: all.length, running: all.filter((x) => x.playState === 'running').length }
  })
  expect(a.count).toBeGreaterThan(20)
  expect(a.running).toBeGreaterThan(0)
})

test('the deck plays by itself and stops once you navigate', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'on')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1', { timeout: 9000 })
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'off')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  await page.waitForTimeout(6500)
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
})

test('resting the pointer on the stage pauses autoplay', async ({ page }) => {
  await page.goto('/')
  await page.locator(stage).hover({ position: { x: 600, y: 80 } })
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'paused')
  await page.mouse.move(640, 1000)
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'on')
})

test('hovering the artwork never restarts it, and its links survive the hover', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator(`${stage} svg`)).toBeVisible()
  await page.waitForTimeout(1500)
  const clock = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-mol-id="slide-stage"]') as HTMLElement
      return Math.max(...el.getAnimations({ subtree: true }).map((a) => Number(a.currentTime) || 0))
    })
  const before = await clock()
  await page.locator(stage).hover({ position: { x: 600, y: 300 } })
  await page.waitForTimeout(500)
  await page.mouse.move(640, 320)
  await page.waitForTimeout(500)
  // A reinserted SVG would start its clocks over; a live one keeps counting.
  expect(await clock()).toBeGreaterThan(before)
  await expect(page.locator(`${stage} a[href*="/packages/"]`).first()).toBeAttached()
  await expect(page.locator(`${stage} g[data-href]`)).toHaveCount(0)
})

test('the index row inside the graphic navigates: segments and chevrons', async ({ page }) => {
  await page.goto('/')
  await page.locator(`${stage} [data-scene="2"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  expect(new URL(page.url()).hash).toBe('#built-in')
  await page.locator(`${stage} [data-nav="next"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '3')
  await page.locator(`${stage} [data-nav="prev"]`).click()
  await page.locator(`${stage} [data-nav="prev"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
  await page.keyboard.press('2')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
})

test('a deep link opens that slide', async ({ page }) => {
  await page.goto('/#outcomes')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
})

test('hovering a package chip explains it, and clicking opens its page', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.waitForTimeout(3800) // let the package chips land
  const chip = page.locator(`${stage} [data-href*="/packages/api-flights"]`).first()
  await chip.hover()
  const tip = page.locator('[data-mol-id="slides-tooltip"]')
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('api-flights')
  const [popup] = await Promise.all([context.waitForEvent('page'), chip.click()])
  await popup.waitForURL(/packages\/api-flights/)
  expect(popup.url()).toContain('molecule.dev/packages/api-flights')
  await popup.close()
})

test('clicking the prompt opens molecule.dev with that prompt prefilled', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.waitForTimeout(1200)
  const card = page.locator(`${stage} [data-href^="https://www.molecule.dev/#prompt="]`).first()
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    card.click({ position: { x: 40, y: 40 } }),
  ])
  await popup.waitForURL(/#prompt=/)
  expect(decodeURIComponent(new URL(popup.url()).hash)).toContain('AI travel agent')
  await popup.close()
})

test('plain links show no tooltip', async ({ page }) => {
  await page.goto('/')
  await page.locator(`${stage} [data-href="https://www.molecule.dev"]`).last().hover()
  await page.waitForTimeout(250)
  await expect(page.locator('[data-mol-id="slides-tooltip"]')).toHaveCount(0)
})

test('the theme toggle swaps the variant and stays on the same slide', async ({ page }) => {
  await page.goto('/#bonds')
  const fillBefore = await page.locator(`${stage} svg > rect`).first().getAttribute('fill')
  await page
    .getByRole('button', { name: /theme|dark|light/i })
    .first()
    .click()
  await expect
    .poll(() => page.locator(`${stage} svg > rect`).first().getAttribute('fill'))
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
})

test.describe('under a dark OS preference', () => {
  test.use({ colorScheme: 'dark' })

  test('the site and the slide start dark without a saved choice', async ({ page }) => {
    await page.goto('/')
    await expect
      .poll(() => page.locator(`${stage} svg > rect`).first().getAttribute('fill'))
      .toBe('#0e0e0e')
  })
})
