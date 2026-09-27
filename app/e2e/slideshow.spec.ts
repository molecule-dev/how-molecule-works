/**
 * The deck, driven the way a person would: a slide is on the page and its
 * entrance is animating; the graphic's own index, the stage edges, the keys
 * and deep links move between slides; hovering shows info; package chips open
 * their pages; the theme follows the OS and the toggle swaps the variant.
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

test('the index inside the graphic, the stage edges and the keys all navigate', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator(`${stage} [data-scene="2"]`).click()
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '2')
  expect(new URL(page.url()).hash).toBe('#built-in')
  await page.locator('[data-mol-id="slides-next"]').click({ force: true })
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '3')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '0')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
  await page.keyboard.press('2')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '1')
})

test('a deep link opens that slide', async ({ page }) => {
  await page.goto('/#outcomes')
  await expect(page.locator(deck)).toHaveAttribute('data-slide', '4')
})

test('hovering the artwork explains it, and package chips open their pages', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.waitForTimeout(3800) // let the package chips land
  const chip = page.locator(`${stage} [data-href*="/packages/api-database"]`).first()
  await chip.hover()
  const tip = page.locator('[data-mol-id="slides-tooltip"]')
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('api-database')
  await expect(tip).toContainText('open')
  const [popup] = await Promise.all([context.waitForEvent('page'), chip.click()])
  expect(popup.url()).toContain('molecule.dev/packages/api-database')
  await popup.close()
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
  await page.goto('/about/')
  await expect(page.locator('[data-mol-id="about-embed"]')).toContainText(
    'how-molecule-works-dark.svg',
  )
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
