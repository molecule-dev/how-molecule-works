import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

const SLIDES = {
  dark: [s1d, s2d, s3d, s4d, s5d],
  light: [s1l, s2l, s3l, s4l, s5l],
}

/** The site's own colours (Landing.css tokens) for the tooltip. */
const TONES = {
  dark: { layer: '#151515', border: '#292929', text: '#e0e0e0' },
  light: { layer: '#f4f4f4', border: '#d0d0d0', text: '#1a1a1a' },
}

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
    const onMove = (e: PointerEvent) => {
      const target = (e.target as Element).closest('[data-info]') as HTMLElement | null
      if (!target) {
        setTip(null)
        return
      }
      const box = frame.getBoundingClientRect()
      const x = Math.min(Math.max(e.clientX - box.left, 0), box.width)
      const y = e.clientY - box.top
      setTip({ text: target.dataset.info ?? '', x, y })
    }
    const onLeave = () => setTip(null)
    stage.addEventListener('click', onClick)
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      stage.removeEventListener('click', onClick)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [html, go, index])

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
      <style>{STAGE_CSS}</style>
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
          position: 'relative',
          touchAction: 'pan-y',
          borderRadius: 16,
          boxShadow: '0 30px 80px -40px rgba(0,0,0,.6)',
        }}
      >
        <Slide key={`${theme}-${index}`} html={html} stageRef={stageRef} enter={enter} />

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
