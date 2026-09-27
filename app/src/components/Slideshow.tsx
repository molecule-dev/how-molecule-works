import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
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

/** The site's own colours (Landing.css tokens) for the parts around the artwork. */
const TONES = {
  dark: { layer: '#151515', border: '#292929', text: '#e0e0e0', muted: '#bebebe', link: '#7ea5ff' },
  light: {
    layer: '#f4f4f4',
    border: '#d0d0d0',
    text: '#1a1a1a',
    muted: '#505050',
    link: '#2451c9',
  },
}

/**
 * Hover affordances for the artwork: anything with info brightens and shows a
 * tooltip; anything that opens a page or navigates gets a pointer and a glow.
 * Applied to the inlined SVG through a class on the stage.
 */
const STAGE_CSS = `
.hmw-stage [data-info],.hmw-stage [data-href],.hmw-stage [data-scene]{transition:filter .18s ease,opacity .18s ease}
.hmw-stage [data-info]:hover,.hmw-stage [data-scene]:hover{filter:brightness(1.16) drop-shadow(0 0 7px rgba(126,165,255,.45))}
.hmw-stage [data-scene]:hover{opacity:1 !important}
.hmw-stage [data-href],.hmw-stage [data-scene]{cursor:pointer}
.hmw-stage [data-info]:not([data-href]):not([data-scene]){cursor:help}
@keyframes hmw-in-next{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes hmw-in-prev{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.hmw-enter-next{animation:hmw-in-next .42s cubic-bezier(.2,.8,.2,1) both}
.hmw-enter-prev{animation:hmw-in-prev .42s cubic-bezier(.2,.8,.2,1) both}
.hmw-edge{position:absolute;top:0;bottom:0;width:12%;display:flex;align-items:center;opacity:0;transition:opacity .2s ease;cursor:pointer;border:0;background:transparent;padding:0}
.hmw-edge:hover,.hmw-edge:focus-visible{opacity:1}
.hmw-edge span{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;backdrop-filter:blur(6px);transition:transform .2s ease}
.hmw-edge:hover span{transform:scale(1.08)}
@media (prefers-reduced-motion: reduce){.hmw-enter-next,.hmw-enter-prev{animation:none}}
`

/**
 * One slide, inlined. A memoized leaf keyed by slide + theme by its parent:
 * mounting it inserts the SVG and its entrance animations start; nothing the
 * slideshow does afterwards touches this element.
 */
const Slide = memo(function Slide({
  markup,
  stageRef,
  enter,
}: {
  markup: string
  stageRef: React.RefObject<HTMLDivElement | null>
  enter: 'next' | 'prev'
}) {
  return (
    <div
      ref={stageRef}
      className={`hmw-stage hmw-enter-${enter}`}
      data-mol-id="slide-stage"
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
})

/**
 * The README graphic as the page: one scene per slide, navigated through the
 * graphic's own index, the edges of the stage, the keyboard, a swipe, or a
 * deep link (`#bonds`). Hovering the artwork shows what things are; package
 * chips and links open their pages.
 */
export function Slideshow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { themeName } = useTheme()
  const theme = themeName === 'light' ? 'light' : 'dark'
  const tone = TONES[theme]

  const [index, setIndex] = useState(0)
  const [enter, setEnter] = useState<'next' | 'prev'>('next')
  const [tip, setTip] = useState<{
    text: string
    href: string | null
    x: number
    y: number
  } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const markup = useMemo(() => prepareSlideSvg(SLIDES[theme][index]), [theme, index])

  const go = useCallback(
    (to: number) => {
      const next = wrapIndex(to)
      setEnter(next === wrapIndex(index - 1) ? 'prev' : 'next')
      setIndex(next)
      setTip(null)
      if (typeof window !== 'undefined') window.history.replaceState(null, '', hashForSlide(next))
    },
    [index],
  )

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

  // The artwork's own hooks: the scene index navigates, links open, info shows a tooltip.
  useEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return
    const onClick = (e: Event) => {
      const target = (e.target as Element).closest('[data-scene],[data-href]')
      if (!target) return
      const scene = (target as HTMLElement).dataset.scene
      const href = (target as HTMLElement).dataset.href
      if (scene !== undefined) go(Number(scene))
      else if (href) window.open(href, '_blank', 'noopener,noreferrer')
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
      setTip({ text: target.dataset.info ?? '', href: target.dataset.href ?? null, x, y })
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
  }, [markup, go])

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
  const edgeStyle: React.CSSProperties = {
    background: tone.layer,
    border: `1px solid ${tone.border}`,
    color: tone.text,
    boxShadow: '0 6px 24px -10px rgba(0,0,0,.5)',
  }
  const tipMaxW = 300
  const tipLeft = tip
    ? Math.min(Math.max(tip.x + 14, 8), (frameRef.current?.clientWidth ?? 1200) - tipMaxW - 8)
    : 0

  return (
    <section
      data-mol-id="slideshow"
      data-slide={index}
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
        style={{
          position: 'relative',
          touchAction: 'pan-y',
          borderRadius: 16,
          boxShadow: '0 30px 80px -40px rgba(0,0,0,.6)',
        }}
      >
        <Slide key={`${theme}-${index}`} markup={markup} stageRef={stageRef} enter={enter} />

        <button
          type="button"
          className="hmw-edge"
          style={{ left: 0, justifyContent: 'flex-start', paddingLeft: 14 }}
          onClick={() => go(index - 1)}
          aria-label={t('slides.prev', undefined, { defaultValue: 'Previous slide' })}
          data-mol-id="slides-prev"
        >
          <span style={edgeStyle}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M12.5 3.5 6 10l6.5 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        <button
          type="button"
          className="hmw-edge"
          style={{ right: 0, justifyContent: 'flex-end', paddingRight: 14 }}
          onClick={() => go(index + 1)}
          aria-label={t('slides.next', undefined, { defaultValue: 'Next slide' })}
          data-mol-id="slides-next"
        >
          <span style={edgeStyle}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="m7.5 3.5 6.5 6.5-6.5 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

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
            {tip.href ? (
              <div style={{ color: tone.link, fontSize: 12, marginTop: 6 }}>
                {`${t('slides.opens', undefined, { defaultValue: 'Click to open' })} ${tip.href
                  .replace(/^https?:\/\/(www\.)?/, '')
                  .replace(/\/$/, '')} ↗`}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
