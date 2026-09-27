/**
 * Pure helpers behind the animation player — everything that can be tested
 * without a DOM. The player component (`components/AnimationPlayer.tsx`) owns
 * the browser side: the Web Animations API handles, the frame loop, keys.
 */

import timeline from './timeline.json'

/** One scene of the loop, as the generator wrote it. */
export interface Scene {
  id: string
  label: string
  title: string
}

/** Loop length, scene length and the scene list — the generator's numbers. */
export const TIMELINE: { loopSeconds: number; sceneSeconds: number; scenes: Scene[] } = timeline

/** The playback speeds offered, slowest first; 1 is the graphic's own pace. */
export const SPEEDS = [0.5, 1, 1.5, 2] as const

/**
 * Wrap any elapsed time onto the loop.
 *
 * @param seconds - Elapsed seconds, possibly beyond one loop or negative.
 * @returns The equivalent position inside `[0, loopSeconds)`.
 */
export function loopTime(seconds: number): number {
  const loop = TIMELINE.loopSeconds
  const t = seconds % loop
  return t < 0 ? t + loop : t
}

/**
 * Which scene is on screen at a loop position.
 *
 * @param seconds - Position inside the loop.
 * @returns A zero-based scene index, clamped to the scene list.
 */
export function sceneIndexAt(seconds: number): number {
  const i = Math.floor(loopTime(seconds) / TIMELINE.sceneSeconds)
  return Math.min(Math.max(i, 0), TIMELINE.scenes.length - 1)
}

/**
 * Where a scene starts, nudged past the boundary so a seek lands inside it
 * rather than on the previous scene's last frame.
 *
 * @param index - Zero-based scene index (wraps around the scene list).
 * @returns The seek target in seconds.
 */
export function sceneStart(index: number): number {
  const n = TIMELINE.scenes.length
  const i = ((index % n) + n) % n
  return i * TIMELINE.sceneSeconds + 0.02
}

/**
 * A clock label for the scrubber: `m:ss / m:ss`.
 *
 * @param seconds - Position inside the loop.
 * @returns For example `0:07 / 0:30`.
 */
export function formatClock(seconds: number): string {
  const mmss = (s: number): string => {
    const whole = Math.floor(s)
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
  }
  return `${mmss(loopTime(seconds))} / ${mmss(TIMELINE.loopSeconds)}`
}

/**
 * The SVG as the player inlines it. The file is written for an `<img>` on
 * GitHub, so two of its rules have to go when it lives in a page the player
 * controls: the hover-to-pause rule (the controls own play state) and the
 * reduced-motion block (which hides four scenes and stops the clock — the
 * player honours reduced motion by starting paused instead). The fixed
 * width/height give way to the viewBox so the graphic scales with its column.
 *
 * @param svg - The generated SVG source.
 * @returns Markup to inject as HTML.
 */
export function prepareInlineSvg(svg: string): string {
  return svg
    .replace(/\s*svg:hover \*\{animation-play-state:paused !important\}/, '')
    .replace(/\s*@media \(prefers-reduced-motion: reduce\)\{[^}]*\}[^}]*\}\s*\}/, '')
    .replace(
      /<svg([^>]*?)\swidth="1200"\sheight="700"/,
      '<svg$1 style="width:100%;height:auto;display:block"',
    )
}

/**
 * The README markdown that embeds the graphic and links back here — what the
 * "copy embed" button puts on the clipboard.
 *
 * @param origin - This site's origin (`https://…`), no trailing slash.
 * @returns A `<picture>` block GitHub renders theme-aware, plus the link.
 */
export function embedMarkdown(origin: string): string {
  const alt = 'How Molecule works'
  return [
    `<p align="center">`,
    `  <a href="${origin}"><picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${origin}/how-molecule-works-dark.svg">`,
    `    <img src="${origin}/how-molecule-works-light.svg" alt="${alt}" width="100%">`,
    `  </picture></a>`,
    `</p>`,
    `<p align="center"><a href="${origin}">Interactive version</a></p>`,
  ].join('\n')
}
