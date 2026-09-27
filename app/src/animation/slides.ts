/**
 * Pure helpers behind the slideshow — what can be tested without a DOM. The
 * component (`components/Slideshow.tsx`) owns the browser side: the inlined
 * slide, keys, swipe, the URL hash.
 */

import timeline from './timeline.json'

/** One scene of the graphic, as the generator wrote it. */
export interface Scene {
  id: string
  label: string
  title: string
}

/** The scene list — the generator's order, ids and titles. */
export const SCENES: Scene[] = timeline.scenes

/** Wrap a slide index onto the deck. */
export function wrapIndex(index: number): number {
  const n = SCENES.length
  return ((index % n) + n) % n
}

/**
 * The slide a URL hash names, or `null` when it names none. Deep links use
 * the scene ids: `#bonds`, `#outcomes`.
 *
 * @param hash - `location.hash`, with or without the leading `#`.
 * @returns A zero-based slide index, or null.
 */
export function slideFromHash(hash: string): number | null {
  const id = hash.replace(/^#/, '').trim().toLowerCase()
  if (!id) return null
  const i = SCENES.findIndex((s) => s.id === id)
  return i >= 0 ? i : null
}

/**
 * The hash for a slide, so the address bar always names what is on screen.
 *
 * @param index - Zero-based slide index.
 * @returns `#<scene id>`.
 */
export function hashForSlide(index: number): string {
  return `#${SCENES[wrapIndex(index)].id}`
}

/**
 * The SVG as the slideshow inlines it: sized by its viewBox rather than fixed
 * pixels, so the slide fills its column and scales with it.
 *
 * @param svg - A generated slide.
 * @returns Markup to inject as HTML.
 */
export function prepareSlideSvg(svg: string): string {
  return svg.replace(
    /<svg([^>]*?)\swidth="1200"\sheight="700"/,
    '<svg$1 style="width:100%;height:auto;display:block"',
  )
}

/**
 * The README markdown that embeds the looping graphic and links back here —
 * what the "copy embed" button puts on the clipboard.
 *
 * @param origin - This site's origin (`https://…`), no trailing slash.
 * @returns A `<picture>` block GitHub renders theme-aware, plus the link.
 */
export function embedMarkdown(origin: string): string {
  const alt = 'How Molecule works'
  return [
    `<div align="center">`,
    `  <a href="${origin}"><picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${origin}/how-molecule-works-dark.svg">`,
    `    <img src="${origin}/how-molecule-works-light.svg" alt="${alt}" width="100%">`,
    `  </picture></a>`,
    `</div>`,
    `<div align="right"><small><sup><a href="${origin}">Interactive</a></sup></small></div>`,
  ].join('\n')
}
