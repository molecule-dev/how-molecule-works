#!/usr/bin/env node
/**
 * Builds the animated "How Molecule works" graphic — the same file the
 * molecule README embeds and this site plays with controls:
 *
 *   src/animation/how-molecule-works-{dark,light}.svg   (bundled, inlined by the player)
 *   public/how-molecule-works-{dark,light}.svg          (served raw, for embeds + the README)
 *   src/animation/slides/slide-{1..5}-{dark,light}.svg       (one scene per file, for the slideshow)
 *   src/animation/timeline.json                          (loop + scene timing the site reads)
 *
 * A SLIDE is a scene on its own: its entrance animations play once and hold
 * (`animation-fill-mode: forwards`), its ambient loops keep running (the
 * provider cycle, the orbiting dot, the cursor blink), and the scene index at
 * the bottom is static with the current slide lit. The site swaps slides as
 * the visitor navigates, so each one animates in fresh.
 *
 * Design: the tokens of www.molecule.dev's landing page — Arimo type, the
 * dark/light palettes, card radii, code-block colors and accent set. Every
 * piece of Arimo text is outlined into glyph paths with fontkit, because
 * GitHub's image proxy serves README images under `default-src 'none'`: no
 * font may load there, not even an embedded one. Monospace runs stay live
 * `<text>` with the site's own mono stack.
 *
 * Output is a single self-contained SVG: CSS keyframe animation only, no
 * scripts, no external resources. GitHub's proxy allows inline `<style>`, so
 * it plays inside the README's `<img>`. Hovering pauses it when the SVG is
 * opened directly; the player on this site strips that rule and drives the
 * animations itself (play, pause, seek, speed). The footer scene index carries
 * `data-scene` so the player can make it clickable; inside an `<img>` that is
 * inert.
 *
 * One 30-second loop, five scenes of six seconds:
 *   1. Describe → compose      2. Bonds (swap providers, not code)
 *   3. Built in by default     4. Your app learns from its users
 *   5. Why it pays off
 *
 * Fonts come from public/fonts (the Arimo files @molecule/app-fonts-arimo
 * ships); MOL_ARIMO_DIR overrides the directory.
 *
 *   npm run animation      (also runs before every build)
 */

import console from 'node:console'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_SRC = join(HERE, '..', 'src', 'animation')
const OUT_PUBLIC = join(HERE, '..', 'public')
const FONT_DIR = process.env.MOL_ARIMO_DIR ?? join(HERE, '..', 'public', 'fonts')
const FONT_FILE = join(FONT_DIR, 'Arimo-VariableFont_wght.ttf')
if (!existsSync(FONT_FILE)) {
  console.error(
    `Arimo not found at ${FONT_FILE} — set MOL_ARIMO_DIR to a directory holding Arimo-VariableFont_wght.ttf`,
  )
  process.exit(1)
}
const ARIMO = fontkit.openSync(FONT_FILE)
const UPM = ARIMO.unitsPerEm
const faces = new Map()
/** The Arimo face for a weight (the variable font covers 400–700). */
const face = (weight) => {
  if (!faces.has(weight)) faces.set(weight, ARIMO.getVariation({ wght: weight }))
  return faces.get(weight)
}

// ---------------------------------------------------------------- timeline
const LOOP = 30 // seconds
const SCENE = 6

// ------------------------------------------------------------------ themes
// Straight from Landing.css `.landing.dark` / `.landing.light`, plus the code
// block, which the site keeps dark in both themes.
const CODE = {
  bg: '#0d1017',
  border: '#232733',
  bar: '#1b1f29',
  dot: '#2b303b',
  file: '#8b929f',
  text: '#c8cdd6',
  dim: '#868d9b',
  add: '#5bb98c',
  del: '#e0696a',
}
const THEMES = {
  dark: {
    bg: '#0e0e0e',
    layer: '#151515',
    input: '#090909',
    border: '#292929',
    text: '#e0e0e0',
    gray: '#bebebe',
    strong: '#ffffff',
    primary: '#4070e0',
    link: '#7ea5ff',
    accents: ['#7ea5ff', '#e4a6b9', '#edc7a7', '#acc4fd'],
    gradient: ['#edc7a7', '#e4a6b9', '#7ea5ff', '#acc4fd', '#7ea5ff', '#e4a6b9', '#edc7a7'],
    green: '#5bb98c',
    faint: '#7a7a7a',
  },
  light: {
    bg: '#eaeaea',
    layer: '#f4f4f4',
    input: '#f4f4f4',
    border: '#d0d0d0',
    text: '#1a1a1a',
    gray: '#505050',
    strong: '#000000',
    primary: '#3060c0',
    link: '#2451c9',
    accents: ['#185eff', '#cc587b', '#dc9152', '#487dfb'],
    gradient: ['#dc9152', '#cc587b', '#185eff', '#487dfb', '#185eff', '#cc587b', '#dc9152'],
    green: '#1e7a00',
    faint: '#6a6a6a',
  },
}
const MONO = `ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, monospace`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escA = (s) => esc(s).replace(/"/g, '&quot;')
const PKG = (name) => `https://www.molecule.dev/packages/${name}`
/**
 * Hover info and links, as data attributes the site reads: `data-info` shows
 * a tooltip, `data-href` makes the element open a page. Inside an `<img>`
 * (the README) they are inert.
 */
const hov = ({ info, href } = {}) =>
  (info ? ` data-info="${escA(info)}"` : '') + (href ? ` data-href="${escA(href)}"` : '')

/** Builds one theme's SVG. */
function build(theme, slide = null) {
  const C = THEMES[theme]
  const keyframes = []
  let idCounter = 0
  // Loop mode: one 30 s timeline. Slide mode: this scene alone, on a 6 s timeline that holds.
  const SLIDE = slide !== null
  const base = SLIDE ? slide * SCENE : 0
  const total = SLIDE ? SCENE : LOOP
  const pct = (sec) => +(((sec - base) / total) * 100).toFixed(3)
  const ITER = SLIDE ? '1 forwards' : 'infinite'
  // Glyph outlines, defined once per (weight, glyph) and reused with <use>.
  const glyphDefs = new Map()

  // ------------------------------------------------------------- outlined text
  /**
   * Arimo text as reusable glyph outlines. Returns the markup and its width in
   * px, so layout is exact rather than estimated.
   */
  function txt(
    x,
    y,
    s,
    { size = 14, weight = 400, color = C.text, anchor = 'start', tracking = 0, cls } = {},
  ) {
    const f = face(weight)
    const run = f.layout(s)
    const scale = size / UPM
    const track = tracking * UPM // em → font units
    let pen = 0
    const uses = []
    run.glyphs.forEach((g, i) => {
      const key = `g${weight}-${g.id}`
      if (!glyphDefs.has(key)) glyphDefs.set(key, `<path id="${key}" d="${g.path.toSVG()}"/>`)
      const pos = run.positions[i]
      if (g.path.commands.length)
        uses.push(
          `<use href="#${key}" x="${(pen + pos.xOffset).toFixed(0)}"${cls ? ` class="${cls}${i}"` : ''}/>`,
        )
      pen += pos.xAdvance + track
    })
    const w = pen * scale
    const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
    const svg = `<g transform="translate(${left.toFixed(1)} ${y}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" fill="${color}">${uses.join('')}</g>`
    return { svg, w, left }
  }
  /** Width of an Arimo string in px. */
  const tw = (s, size, weight = 400, tracking = 0) => txt(0, 0, s, { size, weight, tracking }).w
  /** Live monospace text with the site's mono stack (system-resolved, like the site). */
  function mono(x, y, s, { size = 14, color = CODE.text, anchor = 'start' } = {}) {
    return {
      svg: `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${color}" text-anchor="${anchor}" xml:space="preserve">${esc(s)}</text>`,
      w: s.length * size * 0.62,
    }
  }
  const mw = (s, size) => s.length * size * 0.62
  /** Wrap Arimo text to a max width, exactly measured. */
  function wrap(s, maxW, size, weight = 400) {
    const out = []
    let cur = ''
    for (const word of s.split(' ')) {
      const next = cur ? `${cur} ${word}` : word
      if (tw(next, size, weight) > maxW && cur) {
        out.push(cur)
        cur = word
      } else cur = next
    }
    if (cur) out.push(cur)
    return out
  }
  /** The site's `.m-eyebrow`: 13px, 600, uppercase, 0.14em tracking. */
  const eyebrow = (x, y, s, { color = C.link, anchor = 'start' } = {}) =>
    txt(x, y, s.toUpperCase(), { size: 13, weight: 600, tracking: 0.14, color, anchor }).svg

  // -------------------------------------------------------------- animation
  /** Keyframes that show an element from `start` to `end` seconds. Returns the name. */
  function show(
    start,
    end,
    { fadeIn = 0.45, fadeOut = 0.4, from = 'translateY(10px)', hold = false } = {},
  ) {
    const name = `k${++idCounter}`
    const s0 = pct(start)
    const s1 = pct(start + fadeIn)
    const e0 = pct(Math.max(start + fadeIn, end - fadeOut))
    const e1 = pct(end)
    const hidden = `opacity:0;visibility:hidden;transform:${from}`
    const shown = `opacity:1;visibility:visible;transform:none`
    const frames = [`0%{${hidden}}`]
    if (s0 > 0) frames.push(`${s0}%{${hidden}}`)
    frames.push(`${s1}%{${shown}}`, `${e0}%{${shown}}`)
    if (hold || SLIDE) frames.push(`100%{${shown}}`)
    else frames.push(`${e1}%{${hidden}}`, `100%{${hidden}}`)
    keyframes.push(`@keyframes ${name}{${frames.join('')}}`)
    return name
  }
  /** A line that draws itself (stroke-dashoffset) inside its window. */
  function draw(start, end, len, { dur = 0.6, fadeOut = 0.3 } = {}) {
    const name = `d${++idCounter}`
    const s0 = pct(start)
    const tail = SLIDE
      ? `100%{opacity:1;stroke-dashoffset:0}`
      : `${pct(end - fadeOut)}%{opacity:1;stroke-dashoffset:0}${pct(end)}%{opacity:0;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:${len}}`
    keyframes.push(
      `@keyframes ${name}{0%{opacity:1;stroke-dashoffset:${len}}${s0 > 0 ? `${s0}%{opacity:1;stroke-dashoffset:${len}}` : ''}${pct(start + dur)}%{opacity:1;stroke-dashoffset:0}${tail}}`,
    )
    return { name, len }
  }
  const A = (name) => `style="animation:${name} ${total}s linear ${ITER}"`
  const AT = (name) =>
    `style="transform-box:fill-box;transform-origin:center;animation:${name} ${total}s linear ${ITER}"`

  // ------------------------------------------------------------- primitives
  /** A rounded label chip (8px radius like the site's prompt form); returns its geometry. */
  function chip(
    x,
    y,
    label,
    {
      fill = C.layer,
      stroke = C.border,
      color = C.strong,
      size = 13,
      weight = 500,
      dot,
      isMono = false,
      anchor = 'start',
      info,
      href,
    } = {},
  ) {
    const padX = 14
    const dotW = dot ? 16 : 0
    const labelW = isMono ? mw(label, size) : tw(label, size, weight)
    const w = Math.round(labelW + padX * 2 + dotW)
    const h = 32
    const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
    const ty = y + h / 2 + size * 0.36
    const label$ = isMono
      ? mono(left + padX + dotW, ty, label, { size, color }).svg
      : txt(left + padX + dotW, ty, label, { size, weight, color }).svg
    return {
      w,
      h,
      left,
      svg: `${info || href ? `<g${hov({ info, href })}>` : ''}<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}"/>${dot ? `<circle cx="${left + padX + 4}" cy="${y + h / 2}" r="4" fill="${dot}"/>` : ''}${label$}${info || href ? '</g>' : ''}`,
    }
  }
  /** A card in the site's `.m-cap` / `.m-step` style. */
  const card = (x, y, w, h, { rx = 14, stroke = C.border, fill = C.layer, sw = 1 } = {}) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  /** The site's `.m-code` block: dark in both themes, title bar with three dots and a file name. */
  function codeBlock(x, y, w, h, file, lines, { lineH = 28, size = 14 } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${CODE.bg}" stroke="${CODE.border}"/><line x1="${x}" y1="${y + 40}" x2="${x + w}" y2="${y + 40}" stroke="${CODE.bar}"/>`
    for (let i = 0; i < 3; i++)
      s += `<circle cx="${x + 22 + i * 19}" cy="${y + 20}" r="5.5" fill="${CODE.dot}"/>`
    s += mono(x + 84, y + 24.5, file, { size: 12.5, color: CODE.file }).svg
    lines.forEach((l, i) => {
      if (!l) return
      const [t, color = CODE.text] = Array.isArray(l) ? l : [l]
      s += mono(x + 22, y + 40 + 22 + i * lineH + size * 0.36, t, { size, color }).svg
    })
    return s
  }
  /** Scene caption: one sentence, in the site's heading weight, wrapped to the card. */
  function caption(i, sentence) {
    const s = i * SCENE
    const k = show(s, s + SCENE, { from: 'translateY(6px)' })
    const lines = wrap(sentence, 1080, 24, 600)
    return `<g ${A(k)}>${lines.map((l, li) => txt(60, 122 + li * 31, l, { size: 24, weight: 600, tracking: -0.01, color: C.strong }).svg).join('')}</g>`
  }
  const accent = (i) => C.accents[i % C.accents.length]

  // ------------------------------------------------------------------ header
  const logo = `<g transform="translate(58 40) scale(1.25)"><g transform="matrix(.86229 0 0 .86229 .81594 2.2034)" stroke="${C.primary}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4737"><g><line x1="20.959" x2="24.924" y1="18.579" y2="25.446"/><line x1="20.959" x2="24.924" y1="13.422" y2="6.555"/><line x1="16.494" x2="8.563" y1="16" y2="16"/></g><g fill="none"><circle cx="19.47" cy="16" r="2.976"/><circle cx="5.587" cy="16" r="2.977"/><circle cx="26.412" cy="28.023" r="2.976"/><circle cx="26.412" cy="3.977" r="2.976"/></g></g></g>`
  const hit = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`
  const wmW = tw('molecule.dev', 15, 500)
  const header = `<g${hov({ href: 'https://www.molecule.dev' })}>${hit(52, 30, tw('How Molecule works', 22, 700) + 70, 48)}${logo}${txt(112, 68, 'How Molecule works', { size: 22, weight: 700, color: C.strong }).svg}</g><g${hov({ href: 'https://www.molecule.dev' })}>${hit(1140 - wmW - 8, 50, wmW + 16, 26)}${txt(1140, 68, 'molecule.dev', { size: 15, weight: 500, color: C.link, anchor: 'end' }).svg}</g>`

  // Scene index along the bottom: five segments, the live one lit.
  const SCENES = ['Describe', 'Bonds', 'Built in', 'Feedback loop', 'Outcomes']
  let footer = ''
  if (SLIDE) keyframes.push('@keyframes hmwp{from{transform:scaleX(0)}to{transform:scaleX(1)}}')
  {
    const segW = 184
    const y = 662
    if (SLIDE) {
      const chev = (x, d, nav) =>
        `<g data-nav="${nav}"><rect x="${x - 12}" y="${y - 14}" width="36" height="44" fill="transparent"/><path d="${d}" fill="none" stroke="${C.gray}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`
      footer +=
        chev(60, `M${72} ${y - 2} l-7 7 l7 7`, 'prev') +
        chev(1116, `M${1128} ${y - 2} l7 7 l-7 7`, 'next')
    }
    SCENES.forEach((label, i) => {
      const x = 100 + i * (segW + 20)
      if (SLIDE) {
        const on = i === slide
        footer += `<g data-scene="${i}" style="opacity:${on ? 1 : 0.35}"><rect x="${x - 4}" y="${y - 12}" width="${segW + 8}" height="44" fill="transparent"/><rect x="${x}" y="${y}" width="${segW}" height="3" rx="1.5" fill="${C.border}"/>${on ? `<rect class="hmw-progress" x="${x}" y="${y}" width="${segW}" height="3" rx="1.5" fill="${C.link}" style="transform-box:fill-box;transform-origin:left center;animation:hmwp ${SCENE}s linear forwards"/>` : ''}${txt(x, y + 24, `${i + 1}  ${label}`, { size: 12, weight: 600, tracking: 0.1, color: C.gray }).svg}</g>`
        return
      }
      const kf = `s${++idCounter}`
      const s0 = pct(i * SCENE)
      keyframes.push(
        `@keyframes ${kf}{0%{opacity:0.35}${s0 > 0 ? `${s0}%{opacity:0.35}` : ''}${pct(i * SCENE + 0.3)}%{opacity:1}${pct((i + 1) * SCENE - 0.3)}%{opacity:1}${pct((i + 1) * SCENE)}%{opacity:0.35}100%{opacity:0.35}}`,
      )
      const pf = `p${++idCounter}`
      keyframes.push(
        `@keyframes ${pf}{0%{transform:scaleX(0)}${s0 > 0 ? `${s0}%{transform:scaleX(0)}` : ''}${pct((i + 1) * SCENE)}%{transform:scaleX(1)}100%{transform:scaleX(${i === SCENES.length - 1 ? 1 : 0})}}`,
      )
      footer += `<g ${A(kf)} data-scene="${i}"><rect x="${x - 4}" y="${y - 12}" width="${segW + 8}" height="44" fill="transparent"/><rect x="${x}" y="${y}" width="${segW}" height="3" rx="1.5" fill="${C.border}"/><rect x="${x}" y="${y}" width="${segW}" height="3" rx="1.5" fill="${C.link}" style="transform-box:fill-box;transform-origin:left center;animation:${pf} ${LOOP}s linear infinite"/>${txt(x, y + 24, `${i + 1}  ${label}`, { size: 12, weight: 600, tracking: 0.1, color: C.gray }).svg}</g>`
    })
  }

  // ============================================================= SCENE 1
  let scene1 = caption(
    0,
    'Describe the app you want, and Synthase, the agent in the molecule.dev IDE, assembles a real TypeScript project from the open-source @molecule catalog.',
  )
  {
    const s = 0
    const LINES = [
      'An AI travel agent that books',
      'flights by voice, rebooks when',
      'they’re delayed, and splits the bill.',
    ]
    const prompt = LINES.join(' ')
    const px = 60
    const py = 210
    const pw = 400
    const ph = 140
    const promptK = show(s + 0.2, s + SCENE, { from: 'translateY(12px)' })
    // The landing prompt form: input background, 8px radius, a 2px gradient ring.
    // Clicking the prompt opens molecule.dev with this prompt prefilled and selected.
    scene1 += `<g ${A(promptK)}${hov({ href: `https://www.molecule.dev/#prompt=${encodeURIComponent(prompt)}` })}><rect x="${px - 2}" y="${py - 2}" width="${pw + 4}" height="${ph + 4}" rx="10" fill="url(#ring)"/><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="8" fill="${C.input}"/>${eyebrow(px + 20, py + 30, 'You', { color: C.faint })}`
    // Typing: each glyph fades in at its own time; the cursor steps along with it.
    LINES.forEach((line, li) => {
      scene1 += txt(px + 20, py + 62 + li * 24, line, {
        size: 16,
        weight: 500,
        color: C.strong,
        cls: `c${li + 1}-`,
      }).svg
    })
    const typeStart = s + 0.7
    const perChar = 2.2 / prompt.length
    let ci = 0
    const cursor = []
    for (const [line, cls, y0] of LINES.map((line, li) => [
      line,
      `c${li + 1}-`,
      py + 48 + li * 24,
    ])) {
      const run = face(500).layout(line)
      let pen = 0
      run.glyphs.forEach((g, i) => {
        const at = typeStart + ci * perChar
        keyframes.push(
          SLIDE
            ? `.${cls}${i}{animation:${cls}${i} ${total}s linear 1 forwards}@keyframes ${cls}${i}{0%,${pct(at)}%{opacity:0}${pct(at + 0.02)}%,100%{opacity:1}}`
            : `.${cls}${i}{animation:${cls}${i} ${LOOP}s linear infinite}@keyframes ${cls}${i}{0%,${pct(at)}%{opacity:0}${pct(at + 0.02)}%,${pct(s + SCENE - 0.4)}%{opacity:1}${pct(s + SCENE)}%,100%{opacity:0}}`,
        )
        pen += run.positions[i].xAdvance
        cursor.push([at + 0.02, (pen * 16) / UPM, y0 - (py + 48)])
        ci++
      })
    }
    const cur = `cur${++idCounter}`
    let cf = `0%{transform:translate(0px,0px)}`
    cursor.forEach(([at, x, dy]) => {
      cf += `${pct(at)}%{transform:translate(${x.toFixed(1)}px,${dy}px)}`
    })
    const [, lastX, lastY] = cursor.at(-1)
    cf += `${pct(s + SCENE)}%{transform:translate(${lastX.toFixed(1)}px,${lastY}px)}100%{transform:translate(${lastX.toFixed(1)}px,${lastY}px)}`
    keyframes.push(`@keyframes ${cur}{${cf}}`)
    const typedEnd = typeStart + prompt.length * perChar
    const blink = `bl${++idCounter}`
    if (!SLIDE)
      keyframes.push(
        `@keyframes ${blink}{0%,${pct(s + 0.6)}%{opacity:0}${pct(s + 0.61)}%,${pct(typedEnd)}%{opacity:1}${pct(typedEnd + 0.4)}%{opacity:0}${pct(typedEnd + 0.8)}%{opacity:1}${pct(typedEnd + 1.2)}%{opacity:0}${pct(typedEnd + 1.6)}%,${pct(s + SCENE - 0.4)}%{opacity:1}${pct(s + SCENE)}%,100%{opacity:0}}`,
      )
    if (SLIDE) {
      keyframes.push(`@keyframes ${blink}{0%,50%{opacity:0}51%,100%{opacity:1}}`)
      scene1 += `<g ${A(show(s + 0.6, s + SCENE, { fadeIn: 0.01, from: 'none' }))}><g style="animation:${blink} 1s steps(1,end) ${(typedEnd - base).toFixed(2)}s infinite"><rect x="${px + 21}" y="${py + 48}" width="2" height="18" fill="${C.link}" style="animation:${cur} ${total}s steps(1,end) 1 forwards"/></g></g></g>`
    } else {
      scene1 += `<g style="animation:${blink} ${LOOP}s steps(1,end) infinite"><rect x="${px + 21}" y="${py + 48}" width="2" height="18" fill="${C.link}" style="animation:${cur} ${LOOP}s steps(1,end) infinite"/></g></g>`
    }

    // Synthase / mlcl badges under the prompt.
    const badgeK = show(s + 2.8, s + SCENE)
    const b1 = chip(px, 376, 'Synthase  ·  the agent in the molecule.dev IDE', {
      href: 'https://www.molecule.dev',
      dot: accent(1),
      size: 13,
    })
    const b2 = chip(px, 418, 'npx mlcl create  ·  the CLI / MCP server', {
      href: 'https://github.com/molecule-dev/molecule#the-molecule-cli-mlcl-and-mcp-server',
      dot: accent(0),
      size: 13,
      isMono: true,
    })
    scene1 += `<g ${A(badgeK)}>${b1.svg}${b2.svg}`
    wrap(
      'Either one reads the packages’ generated docs, picks the right ones, and wires them — the same rules as hand-written code.',
      400,
      14,
    ).forEach((l, i) => {
      scene1 += txt(px, 486 + i * 22, l, { size: 14, color: C.gray }).svg
    })
    scene1 += `</g>`

    // Catalog column.
    const catX = 520
    const catK = show(s + 0.4, s + SCENE, { from: 'translateX(-8px)' })
    let cat = `<g ${A(catK)}${hov({ href: 'https://www.molecule.dev/packages' })}>${hit(catX - 4, 198, tw('@MOLECULE/*  ·  THE CATALOG', 13, 600, 0.14) + 8, 24)}${eyebrow(catX, 214, '@molecule/*  ·  the catalog')}`
    for (let i = 0; i < 11; i++)
      cat += `<rect x="${catX}" y="${234 + i * 30}" width="${90 + ((i * 37) % 60)}" height="16" rx="5" fill="${C.layer}" stroke="${C.border}"/>`
    scene1 += cat + `</g>`

    // Molecule graph: center + ring of package nodes flying in from the catalog.
    const cx = 930
    const cy = 420
    const r = 165
    const NODE_INFO = {
      'api-ai':
        'One AI interface with tools and streaming; Anthropic, OpenAI, DeepSeek, Google and more as bonds.',
      'api-flights': 'Flight search, booking and status behind one interface; providers as bonds.',
      'api-ai-speech': 'Speech to text and text to speech, so the agent can listen and talk back.',
      'api-payments': 'Checkout, subscriptions and split bills; Stripe and others as bonds.',
      'api-sms': 'Texts and rebooking alerts through Twilio and others.',
      'app-react':
        'The React binding: hooks for auth, i18n, theme and routing over framework-agnostic cores.',
      'app-analytics': 'Track once against the interface; wire Mixpanel, PostHog or your own.',
      'app-react-native': 'The same app on iOS and Android, with native device bonds.',
    }
    const nodes = [
      'api-ai',
      'api-flights',
      'api-ai-speech',
      'api-payments',
      'api-sms',
      'app-react',
      'app-analytics',
      'app-react-native',
    ]
    const centerK = show(s + 2.9, s + SCENE, { from: 'scale(0.6)', fadeIn: 0.5 })
    scene1 += `<g ${AT(centerK)}><circle cx="${cx}" cy="${cy}" r="40" fill="${C.layer}" stroke="${C.primary}" stroke-width="2"/>${txt(cx, cy - 2, 'your', { size: 14, weight: 700, color: C.strong, anchor: 'middle' }).svg}${txt(cx, cy + 15, 'app', { size: 14, weight: 700, color: C.strong, anchor: 'middle' }).svg}</g>`
    nodes.forEach((label, i) => {
      const color = accent(i)
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length
      const nx = cx + Math.cos(ang) * r
      const ny = cy + Math.sin(ang) * r
      const t0 = s + 3.1 + i * 0.28
      const c = chip(nx, ny - 16, label, {
        dot: color,
        anchor: 'middle',
        isMono: true,
        size: 12.5,
        info: `@molecule/${label} — ${NODE_INFO[label]}`,
        href: PKG(label),
      })
      const fromX = catX + 40 - c.left - c.w / 2
      const fromY = 242 + i * 30 - ny
      const k = show(t0, s + SCENE, {
        from: `translate(${fromX.toFixed(0)}px, ${fromY.toFixed(0)}px) scale(0.7)`,
        fadeIn: 0.5,
      })
      const len = Math.hypot(nx - cx, ny - cy)
      const ux = (cx - nx) / len
      const uy = (cy - ny) / len
      const lx1 = nx + ux * (c.w / 2 - 6)
      const ly1 = ny + uy * 16
      const lx2 = cx - ux * 40
      const ly2 = cy - uy * 40
      const d = draw(t0 + 0.45, s + SCENE, Math.hypot(lx2 - lx1, ly2 - ly1), { dur: 0.35 })
      scene1 += `<line x1="${lx1.toFixed(1)}" y1="${ly1.toFixed(1)}" x2="${lx2.toFixed(1)}" y2="${ly2.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-opacity="0.8" stroke-dasharray="${d.len.toFixed(1)}" ${A(d.name)}/>`
      scene1 += `<g ${AT(k)}>${c.svg}</g>`
    })
    const doneK = show(s + 5.3, s + SCENE, { fadeIn: 0.3 })
    scene1 += `<g ${A(doneK)}>${chip(cx, cy + r + 46, 'Express API  +  React app  ·  compiles, tests pass, live preview', { dot: C.green, anchor: 'middle', size: 12.5 }).svg}</g>`
  }

  // ============================================================= SCENE 2
  let scene2 = caption(
    1,
    'Every capability sits behind a core interface with swappable provider bonds, so changing the database means changing one import, never the application code.',
  )
  {
    const s = SCENE
    const cx0 = 60
    const cy0 = 205
    const codeK = show(s + 0.2, s + SCENE, { from: 'translateY(12px)' })
    scene2 += `<g ${A(codeK)}${hov({ href: PKG('api-database') })}>${codeBlock(
      cx0,
      cy0,
      560,
      214,
      'api/src/handlers/users.ts',
      [
        ['// application code', CODE.dim],
        `import { findMany } from '@molecule/api-database'`,
        '',
        `const users = await findMany('users', {`,
        `  where: { plan: 'pro' },`,
        `})`,
      ],
    )}`
    const unchanged = chip(cx0 + 560 - 14, cy0 - 16, 'unchanged', {
      dot: C.green,
      size: 12,
      weight: 700,
      color: C.green,
      stroke: C.green,
      anchor: 'end',
    })
    scene2 += `${unchanged.svg}</g>`

    // bonds.ts with the provider import swapping.
    const bondsK = show(s + 0.6, s + SCENE, { from: 'translateY(12px)' })
    const by = 438
    scene2 += `<g ${A(bondsK)}>${codeBlock(cx0, by, 560, 168, 'api/src/bonds.ts', [['// the one wiring file', CODE.dim], `import { pool, store } from`, '', `setPool(pool); setStore(store)`])}</g>`

    // Right: the core interface, the bond slot, provider chips snapping in.
    const providers = [
      ['postgresql', 'PostgreSQL'],
      ['mysql', 'MySQL'],
      ['sqlite', 'SQLite'],
      ['d1', 'Cloudflare D1'],
    ]
    const sx = 700
    const sy = 205
    const coreK = show(s + 0.4, s + SCENE, { from: 'translateY(12px)' })
    scene2 += `<g ${A(coreK)}${hov({ href: PKG('api-database') })}>${card(sx, sy, 440, 92, { stroke: C.primary, sw: 1.5 })}${eyebrow(sx + 24, sy + 34, 'core interface')}${mono(sx + 24, sy + 64, '@molecule/api-database', { size: 16, color: C.strong }).svg}${txt(sx + 416, sy + 64, 'findMany · create · update …', { size: 12.5, color: C.gray, anchor: 'end' }).svg}
    <path d="M${sx + 200} ${sy + 92} v22 h40 v-22" fill="none" stroke="${C.primary}" stroke-width="1.5" stroke-dasharray="4 4"/>
    ${eyebrow(sx + 24, sy + 130, 'bond (provider)')}
    <rect x="${sx}" y="${sy + 142}" width="440" height="62" rx="14" fill="none" stroke="${C.border}" stroke-dasharray="6 5"/></g>`
    const slot = 1.2
    providers.forEach(([id, label], i) => {
      const color = accent(i)
      const t0 = s + 1.0 + i * slot
      const t1 = i === providers.length - 1 ? s + SCENE : t0 + slot
      let k
      if (SLIDE) {
        // An ambient cycle: 4 slots of 1.2 s, forever, starting after the first second.
        const period = providers.length * slot
        const q = (sec) => +((sec / period) * 100).toFixed(3)
        const hidden = 'opacity:0;visibility:hidden;transform:translateX(48px)'
        const shown = 'opacity:1;visibility:visible;transform:none'
        k = `cy${++idCounter}`
        const a = i * slot
        const frames =
          i === 0
            ? `0%{${shown}}${q(slot - 0.25)}%{${shown}}${q(slot)}%{${hidden}}${q(period - 0.3)}%{${hidden}}100%{${shown}}`
            : `0%{${hidden}}${q(a)}%{${hidden}}${q(a + 0.35)}%{${shown}}${q(a + slot - 0.25)}%{${shown}}${q(a + slot)}%{${hidden}}100%{${hidden}}`
        keyframes.push(`@keyframes ${k}{${frames}}`)
        keyframes.push(
          `.${k}{animation:${k} ${period}s linear ${(s + 1 - base).toFixed(2)}s infinite backwards}`,
        )
      } else {
        k = show(t0, t1, { from: 'translateX(48px)', fadeIn: 0.35, fadeOut: 0.25 })
      }
      const c = chip(sx + 24, sy + 157, `@molecule/api-database-${id}`, {
        dot: color,
        isMono: true,
        size: 13,
        stroke: color,
        info: `The ${label} bond. Change this one import and the application code above stays exactly as it is.`,
        href: PKG(`api-database-${id}`),
      })
      scene2 += `<g ${SLIDE ? `class="${k}"` : A(k)}>${c.svg}${txt(sx + 416, sy + 178, label, { size: 13, weight: 600, color, anchor: 'end' }).svg}${mono(cx0 + 22, by + 62 + 2 * 28 + 5, `  '@molecule/api-database-${id}'`, { size: 14, color: CODE.add }).svg}</g>`
    })

    const catsK = show(s + 1.6, s + SCENE, { from: 'translateY(10px)' })
    const cats = [
      'auth',
      'payments',
      'emails',
      'ai',
      'analytics',
      'realtime',
      'uploads',
      'search',
      'queue',
      'sms',
      'i18n',
      'logger',
    ]
    let row = `<g ${A(catsK)}>${eyebrow(sx, sy + 250, 'The same pattern for every category')}`
    let xx = sx
    let yy = sy + 266
    cats.forEach((c) => {
      if (xx + mw(c, 12.5) + 28 > sx + 440) {
        xx = sx
        yy += 40
      }
      const ch = chip(xx, yy, c, {
        size: 12.5,
        isMono: true,
        color: C.gray,
      })
      row += ch.svg
      xx += ch.w + 8
    })
    wrap(
      'Frameworks swap the same way: React, Vue, Svelte, Solid, Angular, React Native — one interface layer, native idioms underneath.',
      440,
      14,
    ).forEach((l, i) => {
      row += txt(sx, yy + 62 + i * 22, l, { size: 14, color: C.gray }).svg
    })
    scene2 += row + `</g>`
  }

  // ============================================================= SCENE 3
  let scene3 = caption(
    2,
    'Auth, payments, i18n, analytics, monitoring, tests and CI ship wired on day one, so the integrations every real app needs are never rebuilt from scratch.',
  )
  {
    const s = 2 * SCENE
    // The site's capability list: 12px radius cards, 8px accent dot cycling four colors.
    const tiles = [
      'Auth & OAuth',
      'Payments & billing',
      'Database & migrations',
      'i18n · dozens of languages',
      'Analytics & telemetry',
      'Logging & monitoring',
      'Error tracking',
      'Realtime',
      'Uploads & media',
      'Push notifications',
      'Search',
      'Feature flags',
      'Tests: unit, E2E',
      'CI/CD & deploys',
      'Accessibility (a11y)',
      'AGENTS.md for AI agents',
    ]
    const TILE_INFO = [
      'Sessions, passwords, two-factor and OAuth sign-in — @molecule/api-auth and app-auth.',
      'Checkout, subscriptions and invoices — @molecule/api-payments, with Stripe as a bond.',
      'A typed data store with migrations; PostgreSQL, MySQL, SQLite or D1 behind one interface.',
      'Every UI string goes through t(); companion locale packages ship dozens of languages.',
      'One tracking interface on both ends; Mixpanel, PostHog or your own provider.',
      'Structured logging, health checks and uptime probes.',
      'Exceptions captured with context on API and app; the tracker is a swappable bond.',
      'Live updates over WebSockets or server-sent events behind one interface.',
      'File uploads to S3-compatible storage or disk, with image handling.',
      'Web push and mobile push through one bond.',
      'Full-text search; Meilisearch and others as bonds.',
      'Flags and gradual rollouts, evaluated on both ends.',
      'Unit, integration and Playwright end-to-end tests are scaffolded with the app.',
      'GitHub or GitLab workflows, and one-click deploys from molecule.dev.',
      'Semantic components, focus handling and contrast built into the UI kit.',
      'Every project ships an AGENTS.md that teaches any coding agent its conventions.',
    ]
    const cols = 4
    const tw0 = 258
    const th = 74
    tiles.forEach((label, i) => {
      const x = 60 + (i % cols) * (tw0 + 16)
      const y = 200 + Math.floor(i / cols) * (th + 14)
      const t0 = s + 0.3 + i * 0.16
      const k = show(t0, s + SCENE, { from: 'translateY(8px) scale(0.96)', fadeIn: 0.35 })
      const checkK = show(t0 + 0.35, s + SCENE, { from: 'scale(0.4)', fadeIn: 0.25 })
      scene3 += `<g ${AT(k)}${hov({ info: TILE_INFO[i] })}>${card(x, y, tw0, th, { rx: 12 })}<circle cx="${x + 20}" cy="${y + th / 2}" r="4" fill="${accent(i)}"/>${txt(x + 36, y + th / 2 + 5.5, label, { size: 15.5, weight: 500, color: C.strong }).svg}<g ${AT(checkK)}><circle cx="${x + tw0 - 24}" cy="${y + th / 2}" r="10" fill="${C.green}" fill-opacity="0.16" stroke="${C.green}"/><path d="M${x + tw0 - 29} ${y + th / 2} l3.5 3.5 l6.5 -7" fill="none" stroke="${C.green}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g>`
    })
    const noteK = show(s + 3.4, s + SCENE)
    scene3 += `<g ${A(noteK)}>${txt(60, 588, 'Every README is generated from the package’s source JSDoc, so an agent wires it right the first time and the docs cannot drift from the code.', { size: 14, color: C.gray }).svg}</g>`
  }

  // ============================================================= SCENE 4
  // The app's own loop: built-in telemetry → the AI → a better release → measure.
  let scene4 = caption(
    3,
    'Every app ships with analytics, error tracking and feedback built in, and the AI uses what real users do to improve it, ship the change and measure again.',
  )
  {
    const s = 3 * SCENE
    const lcx = 300
    const lcy = 420
    const lr = 118
    const steps = [
      'people use the app',
      'analytics · errors · feedback',
      'the AI reads the signals',
      'improves · ships · measures',
    ]
    const ringK = show(s + 0.2, s + SCENE, { from: 'scale(0.9)', fadeIn: 0.5 })
    scene4 += `<g ${AT(ringK)}><circle cx="${lcx}" cy="${lcy}" r="${lr}" fill="none" stroke="${C.border}" stroke-width="2"/>`
    for (let i = 0; i < 4; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 2
      const ax = lcx + Math.cos(ang) * lr
      const ay = lcy + Math.sin(ang) * lr
      const rot = ((ang + Math.PI / 2) * 180) / Math.PI
      scene4 += `<path d="M-6 -5 L4 0 L-6 5" fill="none" stroke="${C.gray}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${rot.toFixed(1)})"/>`
    }
    steps.forEach((label, i) => {
      const color = accent(i)
      const ang = (-3 * Math.PI) / 4 + (i * Math.PI) / 2
      const nx = lcx + Math.cos(ang) * lr
      const ny = lcy + Math.sin(ang) * lr
      const c0 = chip(nx, ny - 16, label, {
        dot: color,
        anchor: 'middle',
        size: 13,
        weight: 600,
        stroke: color,
      })
      const outward = Math.cos(ang) > 0 ? c0.w / 2 - 30 : -(c0.w / 2 - 56)
      scene4 += chip(nx + outward, ny - 16, label, {
        dot: color,
        anchor: 'middle',
        size: 13,
        weight: 600,
        stroke: color,
      }).svg
    })
    scene4 += `${txt(lcx, lcy - 4, 'every release', { size: 13, weight: 700, anchor: 'middle', color: C.gray }).svg}${txt(lcx, lcy + 16, 'a little better', { size: 13, weight: 700, anchor: 'middle', color: C.gray }).svg}</g>`
    const spin = `r${++idCounter}`
    if (SLIDE)
      keyframes.push(`@keyframes ${spin}{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`)
    else
      keyframes.push(
        `@keyframes ${spin}{0%{opacity:0;transform:rotate(0deg)}${pct(s + 0.6)}%{opacity:0;transform:rotate(0deg)}${pct(s + 0.9)}%{opacity:1}${pct(s + SCENE - 0.3)}%{opacity:1;transform:rotate(720deg)}${pct(s + SCENE)}%{opacity:0;transform:rotate(720deg)}100%{opacity:0;transform:rotate(720deg)}}`,
      )
    scene4 += SLIDE ? `<g ${A(show(s + 0.6, s + SCENE, { fadeIn: 0.3, from: 'none' }))}>` : ''
    scene4 += `<g style="transform-box:view-box;transform-origin:${lcx}px ${lcy}px;animation:${spin} ${SLIDE ? '3s' : `${LOOP}s`} linear infinite"><circle cx="${lcx}" cy="${lcy - lr}" r="7" fill="${C.link}"/><circle cx="${lcx}" cy="${lcy - lr}" r="13" fill="${C.link}" fill-opacity="0.25"/></g>`
    if (SLIDE) scene4 += '</g>'

    // Right: signals arriving from the running app, and what the AI does with them.
    const ox = 620
    const oy = 200
    const signals = [
      ['analytics', 'Sign-ups stall on the second step of onboarding'],
      ['error tracking', 'Invoice export throws for 14 users this week'],
      ['feedback', '“Can I get this as CSV?” — asked nine times'],
    ]
    scene4 += `<g ${A(show(s + 1.2, s + SCENE))}>${eyebrow(ox, oy - 14, 'from the running app')}</g>`
    signals.forEach(([kind, text], i) => {
      const y = oy + i * 68
      const k = show(s + 1.4 + i * 0.5, s + SCENE, { from: 'translateX(14px)' })
      scene4 += `<g ${A(k)}>${card(ox, y, 520, 54, { rx: 12 })}<rect x="${ox}" y="${y + 12}" width="4" height="30" rx="2" fill="${accent(i)}"/>${eyebrow(ox + 24, y + 22, kind, { color: accent(i) })}${txt(ox + 24, y + 42, text, { size: 13.5, color: C.text }).svg}</g>`
    })
    // The AI's response, then the measured result.
    const ay = oy + 3 * 68 + 12
    const aiK = show(s + 3.2, s + SCENE, { from: 'translateY(10px)' })
    scene4 += `<g ${A(aiK)}${hov({ href: 'https://www.molecule.dev' })}><path d="M${ox + 260} ${ay - 12} v10 M${ox + 255} ${ay - 7} l5 6 l5 -6" fill="none" stroke="${C.gray}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${card(ox, ay + 4, 520, 96, { rx: 12, stroke: C.primary, sw: 1.5 })}${eyebrow(ox + 24, ay + 30, 'the AI, in your workspace')}${txt(ox + 24, ay + 54, 'Shortens onboarding to one step · fixes the export · adds CSV', { size: 13.5, color: C.strong, weight: 600 }).svg}${txt(ox + 24, ay + 76, 'Type-checked, tested and deployed — you approve, or let it run.', { size: 13, color: C.gray }).svg}</g>`
    const resK = show(s + 4.4, s + SCENE, { from: 'translateY(8px)' })
    scene4 += `<g ${A(resK)}>${chip(ox, ay + 120, 'next release: sign-ups up, export errors gone — measured, not guessed', { dot: C.green, size: 12.5 }).svg}${txt(ox, ay + 172, 'Swap Mixpanel for PostHog or Sentry for another tracker: the instrumentation stays.', { size: 13, color: C.gray }).svg}</g>`
  }

  // ============================================================= SCENE 5
  let scene5 = caption(
    4,
    'The result is a faster, cheaper, higher-quality full-stack app for web, mobile and API that stays easy to maintain and scale, because every provider is swappable.',
  )
  {
    const s = 4 * SCENE
    const cards = [
      [
        '01',
        'Faster',
        'Start from a working, tested app: flagship templates, a growing catalog, a live preview.',
      ],
      [
        '02',
        'Cheaper',
        'Nothing is regenerated. Strict interfaces and generated docs let an agent wire a package in one pass.',
      ],
      [
        '03',
        'Higher quality',
        'Type-checked, linted and tested before handoff. Tests ship with the project, not as an afterthought.',
      ],
      [
        '04',
        'Easier to maintain\n& scale',
        'Change a bond, not the app. Same architecture for a side project and an enterprise.',
      ],
    ]
    const CARD_INFO = [
      [
        'Templates: blog, CRM, store, helpdesk… 150 complete apps to start from.',
        'https://www.molecule.dev/templates',
      ],
      [
        'Packages do not burn tokens: the AI wires them, it never rewrites them.',
        'https://www.molecule.dev/packages',
      ],
      [
        'Type-check, lint and tests run before handoff, and the tests ship with your project.',
        null,
      ],
      [
        'One bond swap moves a provider or a framework; the application code stays put.',
        'https://github.com/molecule-dev/molecule#the-bond-system',
      ],
    ]
    const cw = 258
    const chh = 200
    cards.forEach(([num, title, body], i) => {
      const x = 60 + i * (cw + 16)
      const y = 200
      const k = show(s + 0.3 + i * 0.35, s + SCENE, {
        from: 'translateY(14px)',
        fadeIn: 0.45,
        fadeOut: 0.3,
      })
      // `.m-step`: 16px radius, step number in primary with 0.1em tracking, 19px/600 title.
      scene5 += `<g ${A(k)}${hov({ href: CARD_INFO[i][1] ?? undefined })}>${card(x, y, cw, chh, { rx: 16 })}${txt(x + 24, y + 38, num, { size: 14, weight: 700, tracking: 0.1, color: C.primary }).svg}`
      const titleLines = title.split('\n')
      titleLines.forEach((t, ti) => {
        scene5 += txt(x + 24, y + 72 + ti * 24, t, { size: 19, weight: 600, color: C.strong }).svg
      })
      const bodyY = y + 104 + (titleLines.length - 1) * 24
      wrap(body, cw - 48, 14.5).forEach((l, li) => {
        scene5 += txt(x + 24, bodyY + li * 22, l, { size: 14.5, color: C.gray }).svg
      })
      scene5 += `</g>`
    })
    const platK = show(s + 2.2, s + SCENE, { fadeOut: 0.3 })
    const py = 444
    scene5 += `<g ${A(platK)}>${eyebrow(60, py, 'Cross-platform from one codebase')}`
    const plats = [
      [
        'Web',
        'React · Vue · Svelte · Solid · Angular',
        'Five framework bindings over the same interfaces; the styling layer is a swappable ClassMap.',
      ],
      [
        'Mobile',
        'React Native + native device bonds',
        'Camera, biometrics, push, geolocation and more as native bonds.',
      ],
      [
        'API',
        'Express, any database, any host',
        'A conventional Express API you can run on any host, with the platform or without it.',
      ],
    ]
    plats.forEach(([t, sub, info], i) => {
      const x = 60 + i * 366
      scene5 += `<g>${card(x, py + 14, 350, 62, { rx: 12 })}<circle cx="${x + 20}" cy="${py + 45}" r="4" fill="${accent(i)}"/>${txt(x + 36, py + 40, t, { size: 14.5, weight: 600, color: C.strong }).svg}${txt(x + 36, py + 61, sub, { size: 13.5, color: C.gray }).svg}</g>`
    })
    scene5 += `</g>`
    const closeK = show(s + 3.2, s + SCENE, { fadeOut: 0.3 })
    scene5 += `<g ${A(closeK)}${hov({ href: 'https://www.molecule.dev' })}>${hit(56, 542, 1090, 64)}${txt(60, 560, 'Plain TypeScript you own. Export the code, the database and your keys at any time.', { size: 15.5, weight: 600, color: C.strong }).svg}${txt(60, 585, 'Apache-2.0 packages on npm  ·  no lock-in  ·  works with any AI agent, editor or CI.', { size: 14, color: C.gray }).svg}${txt(1140, 585, 'www.molecule.dev', { size: 14, weight: 700, color: C.link, anchor: 'end' }).svg}</g>`
  }

  // ================================================================= emit
  const stops = C.gradient
    .map((c, i) => `<stop offset="${(i / (C.gradient.length - 1)).toFixed(3)}" stop-color="${c}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700" role="img" aria-labelledby="${SLIDE ? 'd' : 't d'}">${SLIDE ? '' : '<title id="t">How Molecule works</title>'}
<desc id="d">Describe the app you want, and Synthase, the agent in the molecule.dev IDE, assembles a real TypeScript project from the open-source @molecule catalog. Every capability sits behind a core interface with swappable provider bonds, so changing the database means changing one import, never the application code. Auth, payments, i18n, analytics, monitoring, tests and CI ship wired on day one, so the integrations every real app needs are never rebuilt from scratch. Every app ships with analytics, error tracking and feedback built in, and the AI uses what real users do to improve it, ship the change and measure again. The result is a faster, cheaper, higher-quality full-stack app for web, mobile and API that stays easy to maintain and scale, because every provider is swappable.</desc>
<defs>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
  ${[...glyphDefs.values()].join('\n  ')}
</defs>
<style>
  ${keyframes.join('\n  ')}
${SLIDE ? '  @media (prefers-reduced-motion: reduce){ *{animation-duration:0.001s !important;animation-delay:0s !important;animation-iteration-count:1 !important} }' : '  svg:hover *{animation-play-state:paused !important}\n  @media (prefers-reduced-motion: reduce){ *{animation:none !important} #scene-1,#scene-2,#scene-3,#scene-4{display:none} }'}
</style>
<rect width="1200" height="700" rx="16" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="1199" height="699" rx="16" fill="none" stroke="${C.border}"/>
${header}
${footer}
${
  SLIDE
    ? `<g id="scene-${slide + 1}">${[scene1, scene2, scene3, scene4, scene5][slide]}</g>`
    : `<g id="scene-1">${scene1}</g>
<g id="scene-2">${scene2}</g>
<g id="scene-3">${scene3}</g>
<g id="scene-4">${scene4}</g>
<g id="scene-5">${scene5}</g>`
}
</svg>
`
}

mkdirSync(OUT_SRC, { recursive: true })
mkdirSync(OUT_PUBLIC, { recursive: true })
for (const theme of ['dark', 'light']) {
  const svg = build(theme)
  for (const dir of [OUT_SRC, OUT_PUBLIC])
    writeFileSync(join(dir, `how-molecule-works-${theme}.svg`), svg)
  console.log(
    `wrote how-molecule-works-${theme}.svg (${(svg.length / 1024).toFixed(0)} KB) → src/animation + public`,
  )
}
mkdirSync(join(OUT_SRC, 'slides'), { recursive: true })
for (const theme of ['dark', 'light']) {
  for (let i = 0; i < 5; i++) {
    const svg = build(theme, i)
    writeFileSync(join(OUT_SRC, 'slides', `slide-${i + 1}-${theme}.svg`), svg)
  }
  console.log(`wrote 5 ${theme} slides → src/animation/slides`)
}
writeFileSync(
  join(OUT_SRC, 'timeline.json'),
  JSON.stringify(
    {
      loopSeconds: LOOP,
      sceneSeconds: SCENE,
      scenes: [
        {
          id: 'describe',
          label: 'Describe',
          title:
            'Describe the app you want, and Synthase, the agent in the molecule.dev IDE, assembles a real TypeScript project from the open-source @molecule catalog.',
        },
        {
          id: 'bonds',
          label: 'Bonds',
          title:
            'Every capability sits behind a core interface with swappable provider bonds, so changing the database means changing one import, never the application code.',
        },
        {
          id: 'built-in',
          label: 'Built in',
          title:
            'Auth, payments, i18n, analytics, monitoring, tests and CI ship wired on day one, so the integrations every real app needs are never rebuilt from scratch.',
        },
        {
          id: 'feedback',
          label: 'Feedback loop',
          title:
            'Every app ships with analytics, error tracking and feedback built in, and the AI uses what real users do to improve it, ship the change and measure again.',
        },
        {
          id: 'outcomes',
          label: 'Outcomes',
          title:
            'The result is a faster, cheaper, higher-quality full-stack app for web, mobile and API that stays easy to maintain and scale, because every provider is swappable.',
        },
      ],
    },
    null,
    2,
  ) + '\n',
)
