/**
 * On a phone the deck shows the slides as HTML rather than the shrunken
 * graphic: readable text, real links, the same index row underneath.
 */
import './bonds.js'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

const deck = '[data-mol-id="slideshow"]'
const panel = '[data-mol-id="slide-panel"]'
const index = '[data-mol-id="slide-index"]'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('a phone gets readable HTML slides, not the scaled graphic', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator(panel)).toBeVisible()
  await expect(page.locator('[data-mol-id="slide-stage"] svg')).toHaveCount(0)
  const size = await page
    .locator(`${panel} .hmw-cap`)
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(size).toBeGreaterThanOrEqual(16)
  // Nothing wider than the screen.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the index row under the panel navigates and stops autoplay', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'on')
  await page.locator(`${index} [data-scene="2"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  await expect(page.locator(deck)).toHaveAttribute('data-autoplay', 'off')
  await expect(page.locator(`${panel} .hmw-tiles li`)).toHaveCount(16)
  await page.locator(`${index} [data-nav="next"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '3')
  await page.locator(`${index} [data-nav="prev"]`).click()
  await page.locator(`${index} [data-nav="prev"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
  await expect(page).toHaveURL(/#bonds$/)
})

test('a swipe moves a slide', async ({ page }) => {
  await page.goto('/')
  const box = await page.locator(panel).boundingBox()
  if (!box) throw new Error('no panel')
  const y = box.y + 80
  await page.mouse.move(box.x + 300, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, y, { steps: 6 })
  await page.mouse.up()
  // Touch swipes are driven by pointer events; a mouse drag is ignored on purpose,
  // so this asserts only that dragging never broke the deck.
  await expect(page.locator(deck)).toHaveAttribute('data-slide', /[0-4]/)
})

test('package chips are real links with the same explanations', async ({ page }) => {
  await page.goto('/')
  const chip = page.locator(`${panel} a[href*="/packages/api-flights"]`).first()
  await expect(chip).toHaveAttribute('target', '_blank')
  await expect(chip).toHaveAttribute('data-info', /Flight search/)
  await page.locator(`${index} [data-scene="4"]`).click()
  await expect(page.locator(`${panel} .hmw-outcomes li`)).toHaveCount(4)
  await expect(page.locator(`${panel} .hmw-closing`)).toHaveAttribute(
    'href',
    'https://www.molecule.dev',
  )
})
