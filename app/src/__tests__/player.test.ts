import { describe, expect, it } from 'vitest'

import {
  embedMarkdown,
  formatClock,
  loopTime,
  prepareInlineSvg,
  sceneIndexAt,
  sceneStart,
  TIMELINE,
} from '../animation/player.js'

describe('timeline math', () => {
  it('reads the generator’s timing: five six-second scenes in a thirty-second loop', () => {
    expect(TIMELINE.loopSeconds).toBe(30)
    expect(TIMELINE.sceneSeconds).toBe(6)
    expect(TIMELINE.scenes).toHaveLength(5)
  })

  it('wraps elapsed time onto the loop, including negative offsets', () => {
    expect(loopTime(0)).toBe(0)
    expect(loopTime(31)).toBe(1)
    expect(loopTime(90)).toBe(0)
    expect(loopTime(-1)).toBe(29)
  })

  it('maps a position to its scene and clamps the last frame', () => {
    expect(sceneIndexAt(0)).toBe(0)
    expect(sceneIndexAt(5.99)).toBe(0)
    expect(sceneIndexAt(6)).toBe(1)
    expect(sceneIndexAt(29.99)).toBe(4)
    expect(sceneIndexAt(36)).toBe(1)
  })

  it('seeks just inside a scene, wrapping around the list', () => {
    expect(sceneStart(0)).toBeCloseTo(0.02)
    expect(sceneStart(4)).toBeCloseTo(24.02)
    expect(sceneStart(5)).toBeCloseTo(0.02)
    expect(sceneStart(-1)).toBeCloseTo(24.02)
    expect(sceneIndexAt(sceneStart(3))).toBe(3)
  })

  it('formats the clock as m:ss over the loop length', () => {
    expect(formatClock(0)).toBe('0:00 / 0:30')
    expect(formatClock(7.9)).toBe('0:07 / 0:30')
    expect(formatClock(31)).toBe('0:01 / 0:30')
  })
})

describe('prepareInlineSvg', () => {
  const sample = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700" role="img">
<style>
  @keyframes k1{0%{opacity:0}100%{opacity:1}}
  svg:hover *{animation-play-state:paused !important}
  @media (prefers-reduced-motion: reduce){ *{animation:none !important} #scene-1,#scene-2,#scene-3,#scene-4{display:none} }
</style>
<g id="scene-1"/></svg>`

  it('drops the hover-pause rule so the controls own play state', () => {
    expect(prepareInlineSvg(sample)).not.toContain('svg:hover')
  })

  it('drops the reduced-motion block that would hide four scenes', () => {
    expect(prepareInlineSvg(sample)).not.toContain('prefers-reduced-motion')
    expect(prepareInlineSvg(sample)).toContain('@keyframes k1')
  })

  it('lets the viewBox size the graphic instead of fixed pixels', () => {
    const out = prepareInlineSvg(sample)
    expect(out).not.toMatch(/width="1200" height="700"/)
    expect(out).toContain('style="width:100%;height:auto;display:block"')
    expect(out).toContain('viewBox="0 0 1200 700"')
  })
})

describe('embedMarkdown', () => {
  it('points both themes and the link at the given origin', () => {
    const md = embedMarkdown('https://example.test')
    expect(md).toContain('srcset="https://example.test/how-molecule-works-dark.svg"')
    expect(md).toContain('src="https://example.test/how-molecule-works-light.svg"')
    expect(md).toContain('href="https://example.test"')
    expect(md).toContain('prefers-color-scheme: dark')
  })
})
