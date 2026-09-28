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

/** How long a slide stays before autoplay moves on: the graphic's own scene length. */
export const DWELL_MS: number = timeline.sceneSeconds * 1000

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
  // An inlined SVG's <title> becomes a native tooltip over the whole graphic; the page labels the slide itself.
  return svg
    .replace(/<title[^>]*>[^<]*<\/title>/, '')
    .replace(
      /<svg([^>]*?)\swidth="1200"\sheight="700"/,
      '<svg$1 style="width:100%;height:auto;display:block"',
    )
}
