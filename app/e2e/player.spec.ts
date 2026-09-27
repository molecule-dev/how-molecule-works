/**
 * The player, driven the way a person would: the graphic is on the page and
 * animating, the transport pauses and resumes it, scene buttons and keys jump
 * around the loop, and the theme toggle swaps the variant without losing the
 * spot. Positions are read off the Web Animations API, the same source the
 * player's clock uses.
 */
import './bonds.js'
import { expect, test } from '@molecule/app-e2e-fixtures-default'

/** The loop position in seconds, read from the first animation in the stage. */
async function position(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-mol-id="player-stage"]') as HTMLElement
    const a = stage.getAnimations({ subtree: true })[0]
    return ((a?.currentTime as number) ?? 0) / 1000
  })
}

test('the graphic is inlined and animating on load', async ({ page }) => {
  await page.goto('/')
  const stage = page.locator('[data-mol-id="player-stage"] svg')
  await expect(stage).toBeVisible()
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-playing', 'true')
  const t1 = await position(page)
  await page.waitForTimeout(400)
  const t2 = await position(page)
  expect(t2).toBeGreaterThan(t1)
})

test('pause stops the clock and play resumes it', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /pause/i })
  await toggle.click()
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-playing', 'false')
  const t1 = await position(page)
  await page.waitForTimeout(300)
  expect(await position(page)).toBeCloseTo(t1, 2)
  await page.getByRole('button', { name: /^play$/i }).click()
  await page.waitForTimeout(300)
  expect(await position(page)).toBeGreaterThan(t1)
})

test('scene buttons and arrow keys jump between scenes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /pause/i }).click()
  await page.locator('[data-mol-id="player-scene-3"]').click()
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '2')
  expect(await position(page)).toBeGreaterThanOrEqual(12)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '3')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '1')
  await page.keyboard.press('5')
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '4')
})

test('the scrubber seeks', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /pause/i }).click()
  await page.locator('[data-mol-id="player-scrubber"]').fill('20')
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '3')
  expect(await position(page)).toBeCloseTo(20, 0)
})

test('the theme toggle swaps the variant and keeps the position', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /pause/i }).click()
  await page.locator('[data-mol-id="player-scene-4"]').click()
  const before = await position(page)
  const fillBefore = await page
    .locator('[data-mol-id="player-stage"] svg > rect')
    .first()
    .getAttribute('fill')
  const toggle = page.getByRole('button', { name: /theme|dark|light/i }).first()
  await toggle.click()
  await expect
    .poll(() =>
      page.locator('[data-mol-id="player-stage"] svg > rect').first().getAttribute('fill'),
    )
    .not.toBe(fillBefore)
  expect(await position(page)).toBeCloseTo(before, 0)
  await expect(page.locator('[data-mol-id="player"]')).toHaveAttribute('data-scene', '3')
})

test('the raw SVGs are served for embedding', async ({ page }) => {
  for (const theme of ['dark', 'light']) {
    const res = await page.request.get(`/how-molecule-works-${theme}.svg`)
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('image/svg+xml')
    expect(await res.text()).toContain('How Molecule works')
  }
  await page.goto('/')
  await expect(page.getByRole('link', { name: /svg \(dark\)/i })).toBeVisible()
})
