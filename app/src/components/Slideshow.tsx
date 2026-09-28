import type React from 'react'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  DWELL_MS,
  hashForSlide,
  prepareSlideSvg,
  SCENES,
  slideFromHash,
  wrapIndex,
} from '../animation/slides.js'
import s1d from '../animation/slides/slide-1-dark.svg?raw'
import s1l from '../animation/slides/slide-1-light.svg?raw'
import s2d from '../animation/slides/slide-2-dark.svg?raw'
import s2l from '../animation/slides/slide-2-light.svg?raw'
import s3d from '../animation/slides/slide-3-dark.svg?raw'
import s3l from '../animation/slides/slide-3-light.svg?raw'
import s4d from '../animation/slides/slide-4-dark.svg?raw'
import s4l from '../animation/slides/slide-4-light.svg?raw'
import s5d from '../animation/slides/slide-5-dark.svg?raw'
import s5l from '../animation/slides/slide-5-light.svg?raw'
import { PANEL_CSS, SlidePanel } from './SlidePanels.js'

const SLIDES = {
  dark: [s1d, s2d, s3d, s4d, s5d],
  light: [s1l, s2l, s3l, s4l, s5l],
}

/**
 * The site's own colours (Landing.css tokens), set as `--hmw-*` variables on the
 * deck so the HTML panels and the tooltip match the graphic in either theme.
 */
const TONES = {
  dark: {
    bg: '#0e0e0e',
    layer: '#151515',
    border: '#292929',
    text: '#e0e0e0',
    gray: '#bebebe',
    strong: '#ffffff',
    primary: '#4070e0',
    link: '#7ea5ff',
    green: '#5bb98c',
    acc: ['#7ea5ff', '#e4a6b9', '#edc7a7', '#acc4fd'],
  },
  light: {
    bg: '#eaeaea',
    layer: '#f4f4f4',
    border: '#d0d0d0',
    text: '#1a1a1a',
    gray: '#555555',
    strong: '#000000',
    primary: '#3060c0',
    link: '#2451c9',
    green: '#1e7a00',
    acc: ['#185eff', '#cc587b', '#dc9152', '#487dfb'],
  },
}

/** Below this width the 1200px graphic is too small to read; the deck shows HTML panels instead. */
const NARROW = '(max-width: 859px)'

/**
 * Hover affordances for the artwork: what has info brightens and shows a
 * tooltip; what opens a page or navigates (links, the index row's segments
 * and chevrons) gets a pointer and a glow. The index fill follows autoplay:
 * paused with the pointer, full once the visitor has taken over.
 */
const STAGE_CSS = `
.hmw-stage [data-info],.hmw-stage [data-href],.hmw-stage [data-scene],.hmw-stage [data-nav]{transition:filter .18s ease,opacity .18s ease}
.hmw-stage [data-info]:hover,.hmw-stage [data-href]:hover,.hmw-stage [data-scene]:hover,.hmw-stage [data-nav]:hover{filter:brightness(1.16) drop-shadow(0 0 7px rgba(126,165,255,.45))}
.hmw-stage [data-scene]:hover{opacity:1 !important}
.hmw-stage [data-href],.hmw-stage [data-scene],.hmw-stage [data-nav]{cursor:pointer}
.hmw-stage [data-info]:not([data-href]):not([data-scene]){cursor:help}
.hmw-paused .hmw-progress{animation-play-state:paused !important}
.hmw-stopped .hmw-progress{animation:none !important;transform:none !important}
@keyframes hmw-in-next{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes hmw-in-prev{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.hmw-enter-next{animation:hmw-in-next .42s cubic-bezier(.2,.8,.2,1) both}
.hmw-enter-prev{animation:hmw-in-prev .42s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion: reduce){.hmw-enter-next,.hmw-enter-prev{animation:none}}
.hmw-index{display:flex;align-items:center;gap:6px;margin-top:12px}
.hmw-index button{appearance:none;border:0;background:none;padding:0;margin:0;color:var(--hmw-gray);font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hmw-index [data-nav]{flex:none;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%}
.hmw-index [data-nav] svg{width:14px;height:14px}
.hmw-index [data-nav]:hover,.hmw-index [data-nav]:focus-visible{color:var(--hmw-strong);outline:none}
.hmw-index [data-scene]{flex:1 1 0;min-width:0;display:grid;gap:8px;padding:10px 0;opacity:.45;transition:opacity .18s ease}
.hmw-index [data-scene].is-on,.hmw-index [data-scene]:hover{opacity:1}
.hmw-index .hmw-bar{display:block;height:3px;border-radius:1.5px;background:var(--hmw-border);overflow:hidden}
.hmw-index .hmw-progress{display:block;height:100%;background:var(--hmw-link);transform-origin:left center;animation:hmw-fill var(--hmw-dwell,6s) linear forwards}
@keyframes hmw-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.hmw-index .hmw-lab{font-size:11px;font-weight:600;letter-spacing:.1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`

/**
 * One slide, inlined. A memoized leaf keyed by slide + theme by its parent:
 * mounting it inserts the SVG and its entrance animations start; nothing the
 * deck does afterwards touches this element. React re-applies
 * `dangerouslySetInnerHTML` whenever it is handed a NEW object, which would
 * reinsert the SVG (restarting every animation and dropping the links the
 * deck made real), so the object itself is memoized by the parent and no
 * other prop changes while a slide is up.
 */
const Slide = memo(function Slide({
  html,
  stageRef,
  enter,
}: {
  html: { __html: string }
  stageRef: React.RefObject<HTMLDivElement | null>
  enter: 'next' | 'prev'
}) {
  return (
    <div
      ref={stageRef}
      className={`hmw-stage hmw-enter-${enter}`}
      data-mol-id="slide-stage"
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={html}
    />
  )
})

/**
 * The README graphic as the page. It plays by itself on the graphic's own
 * rhythm until the visitor takes over: the index row under each slide (its
 * segments and chevrons), the keys, a swipe or a deep link (`#bonds`) all
 * navigate, and any of them stops autoplay. Resting the pointer on the stage
 * pauses it. Hovering a package or capability explains it; anything that
 * opens a page says so with a pointer.
 */
export function Slideshow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { themeName } = useTheme()
  const theme = themeName === 'light' ? 'light' : 'dark'
  const tone = TONES[theme]

  const [index, setIndex] = useState(0)
  const [enter, setEnter] = useState<'next' | 'prev'>('next')
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  // Server-rendered as the graphic; a phone switches to the panels before first paint.
  const [narrow, setNarrow] = useState(false)
  const remainingRef = useRef(DWELL_MS)
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const html = useMemo(() => ({ __html: prepareSlideSvg(SLIDES[theme][index]) }), [theme, index])

  const go = useCallback(
    (to: number, byVisitor = true) => {
      if (byVisitor) setAuto(false)
      const next = wrapIndex(to)
      setEnter(next === wrapIndex(index - 1) ? 'prev' : 'next')
      setIndex(next)
      setTip(null)
      remainingRef.current = DWELL_MS
      if (typeof window !== 'undefined') window.history.replaceState(null, '', hashForSlide(next))
    },
    [index],
  )

  // Reduced motion: no autoplay.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false)
  }, [])

  useLayoutEffect(() => {
    const mq = window.matchMedia(NARROW)
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Autoplay: advance after the dwell; a pause keeps the remaining time.
  useEffect(() => {
    if (!auto || paused) return
    const started = Date.now()
    let fired = false
    const timer = setTimeout(() => {
      fired = true
      go(index + 1, false)
    }, remainingRef.current)
    return () => {
      clearTimeout(timer)
      // A pause keeps what is left of the dwell; a fired timer starts the next slide's dwell afresh.
      remainingRef.current = fired
        ? DWELL_MS
        : Math.max(200, remainingRef.current - (Date.now() - started))
    }
  }, [auto, paused, index, go])

  // A hidden tab pauses it too.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Deep links on load, and the back/forward buttons afterwards.
  useEffect(() => {
    const fromHash = () => {
      const i = slideFromHash(window.location.hash)
      if (i !== null) setIndex(i)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  // The artwork's own hooks: the index row navigates, links open, info shows a tooltip.
  useEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return
    for (const g of Array.from(stage.querySelectorAll<SVGElement>('g[data-href]'))) {
      const a = document.createElementNS('http://www.w3.org/2000/svg', 'a')
      for (const at of Array.from(g.attributes)) a.setAttribute(at.name, at.value)
      a.setAttribute('href', g.dataset.href ?? '')
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
      while (g.firstChild) a.appendChild(g.firstChild)
      g.replaceWith(a)
    }
    const onClick = (e: Event) => {
      const target = (e.target as Element).closest('[data-scene],[data-nav]')
      if (!target) return
      const { scene, nav } = (target as HTMLElement).dataset
      if (nav) go(index + (nav === 'next' ? 1 : -1))
      else if (scene !== undefined) go(Number(scene))
    }
    // The pointer's last position, so a chip that CHANGES under a still
    // pointer (the bond slot cycles four of them) still updates the tooltip.
    let lastX = -1
    let lastY = -1
    const place = (clientX: number, clientY: number, hovered: Element | null) => {
      const target = hovered?.closest('[data-info]') as HTMLElement | null
      if (!target) {
        setTip(null)
        return
      }
      const box = frame.getBoundingClientRect()
      const x = Math.min(Math.max(clientX - box.left, 0), box.width)
      const y = clientY - box.top
      const text = target.dataset.info ?? ''
      setTip((t) => (t && t.text === text && t.x === x && t.y === y ? t : { text, x, y }))
    }
    const onMove = (e: PointerEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      place(e.clientX, e.clientY, e.target as Element)
    }
    const onLeave = () => {
      lastX = -1
      setTip(null)
    }
    const recheck = window.setInterval(() => {
      if (lastX < 0) return
      place(lastX, lastY, document.elementFromPoint(lastX, lastY))
    }, 250)
    // On the frame, not the stage: the HTML index row sits outside the stage.
    frame.addEventListener('click', onClick)
    frame.addEventListener('pointermove', onMove)
    frame.addEventListener('pointerleave', onLeave)
    return () => {
      window.clearInterval(recheck)
      frame.removeEventListener('click', onClick)
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', onLeave)
    }
  }, [html, go, index, narrow])

  // Keys: arrows, digits, Home/End — unless something editable has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable)
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          go(index + 1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          go(index - 1)
          break
        case 'Home':
          e.preventDefault()
          go(0)
          break
        case 'End':
          e.preventDefault()
          go(SCENES.length - 1)
          break
        default:
          if (/^[1-9]$/.test(e.key) && Number(e.key) <= SCENES.length) {
            e.preventDefault()
            go(Number(e.key) - 1)
          }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, index])

  // Swipe on touch screens.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    touchStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || e.pointerType === 'mouse') return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1))
  }

  const scene = SCENES[index]
  const tipMaxW = 300
  const tipLeft = tip
    ? Math.min(Math.max(tip.x + 14, 8), (frameRef.current?.clientWidth ?? 1200) - tipMaxW - 8)
    : 0

  return (
    <section
      data-mol-id="slideshow"
      data-slide={index}
      data-autoplay={auto ? (paused ? 'paused' : 'on') : 'off'}
      aria-roledescription="carousel"
      aria-label={t('slides.label', undefined, {
        defaultValue: 'How Molecule works, in five slides',
      })}
      style={{ maxWidth: 1200, margin: '0 auto' }}
    >
      <style>{STAGE_CSS + PANEL_CSS}</style>
      <div
        ref={frameRef}
        role="group"
        aria-roledescription="slide"
        aria-label={t(
          'slides.of',
          { n: index + 1, total: SCENES.length, title: scene.title },
          { defaultValue: 'Slide {{n}} of {{total}}: {{title}}' },
        )}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover)').matches) setPaused(true)
        }}
        onMouseLeave={() => setPaused(false)}
        className={!auto ? 'hmw-stopped' : paused ? 'hmw-paused' : undefined}
        style={{
          ['--hmw-bg' as string]: tone.bg,
          ['--hmw-layer' as string]: tone.layer,
          ['--hmw-border' as string]: tone.border,
          ['--hmw-text' as string]: tone.text,
          ['--hmw-gray' as string]: tone.gray,
          ['--hmw-strong' as string]: tone.strong,
          ['--hmw-primary' as string]: tone.primary,
          ['--hmw-link' as string]: tone.link,
          ['--hmw-green' as string]: tone.green,
          ['--hmw-acc1' as string]: tone.acc[0],
          ['--hmw-acc2' as string]: tone.acc[1],
          ['--hmw-acc3' as string]: tone.acc[2],
          ['--hmw-acc4' as string]: tone.acc[3],
          ['--hmw-dwell' as string]: `${DWELL_MS}ms`,
          position: 'relative',
          touchAction: 'pan-y',
          borderRadius: 16,
          boxShadow: '0 30px 80px -40px rgba(0,0,0,.6)',
        }}
      >
        {narrow ? (
          <div
            key={`panel-${index}`}
            ref={stageRef}
            className={`hmw-stage hmw-enter-${enter}`}
            data-mol-id="slide-stage"
          >
            <SlidePanel index={index} />
          </div>
        ) : (
          <Slide key={`${theme}-${index}`} html={html} stageRef={stageRef} enter={enter} />
        )}
        {narrow ? (
          <div className="hmw-index" data-mol-id="slide-index">
            <button
              type="button"
              data-nav="prev"
              aria-label={t('slides.prev', undefined, { defaultValue: 'Previous slide' })}
            >
              <svg viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M9 2 4 7l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {SCENES.map((sc, i) => (
              <button
                type="button"
                key={sc.id}
                data-scene={i}
                className={i === index ? 'is-on' : undefined}
                aria-current={i === index ? 'true' : undefined}
                aria-label={`${i + 1} ${sc.label}`}
              >
                <span className="hmw-bar">
                  {i === index ? <span className="hmw-progress" /> : null}
                </span>
                <span className="hmw-lab">
                  {i + 1}
                  {i === index ? `  ${sc.label}` : ''}
                </span>
              </button>
            ))}
            <button
              type="button"
              data-nav="next"
              aria-label={t('slides.next', undefined, { defaultValue: 'Next slide' })}
            >
              <svg viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="m5 2 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ) : null}

        {tip ? (
          <div
            role="tooltip"
            data-mol-id="slides-tooltip"
            className={cm.textSize('sm')}
            style={{
              position: 'absolute',
              left: tipLeft,
              top: tip.y + 18,
              maxWidth: tipMaxW,
              padding: '10px 12px',
              borderRadius: 10,
              background: tone.layer,
              border: `1px solid ${tone.border}`,
              color: tone.text,
              boxShadow: '0 12px 32px -12px rgba(0,0,0,.55)',
              pointerEvents: 'none',
              lineHeight: 1.45,
              zIndex: 2,
            }}
          >
            {tip.text}
          </div>
        ) : null}
      </div>
    </section>
  )
}
