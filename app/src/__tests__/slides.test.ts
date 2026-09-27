import { describe, expect, it } from 'vitest'

import {
  embedMarkdown,
  hashForSlide,
  prepareSlideSvg,
  SCENES,
  slideFromHash,
  wrapIndex,
} from '../animation/slides.js'

describe('the deck', () => {
  it('has the generator’s five scenes in order', () => {
    expect(SCENES.map((s) => s.id)).toEqual([
      'describe',
      'bonds',
      'built-in',
      'feedback',
      'outcomes',
    ])
  })

  it('wraps the index around both ends', () => {
    expect(wrapIndex(5)).toBe(0)
    expect(wrapIndex(-1)).toBe(4)
    expect(wrapIndex(2)).toBe(2)
  })

  it('maps deep-link hashes to slides and back', () => {
    expect(slideFromHash('#bonds')).toBe(1)
    expect(slideFromHash('outcomes')).toBe(4)
    expect(slideFromHash('#Built-In')).toBe(2)
    expect(slideFromHash('')).toBeNull()
    expect(slideFromHash('#nope')).toBeNull()
    expect(hashForSlide(3)).toBe('#feedback')
    expect(hashForSlide(5)).toBe('#describe')
  })
})

describe('prepareSlideSvg', () => {
  it('lets the viewBox size the slide instead of fixed pixels', () => {
    const out = prepareSlideSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700"><g/></svg>',
    )
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
    expect(md).toContain('href="https://example.test">Interactive</a>')
    expect(md).toContain('prefers-color-scheme: dark')
  })
})
