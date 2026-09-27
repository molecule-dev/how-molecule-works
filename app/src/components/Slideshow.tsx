import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  embedMarkdown,
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

/** Small monochrome glyphs for the arrows; `currentColor` so they follow the button. */
const glyph = {
  prev: (
    <path
      d="M12.5 3.5 6 10l6.5 6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  next: (
    <path
      d="m7.5 3.5 6.5 6.5-6.5 6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  replay: <path d="M10 3a7 7 0 1 1-6.3 4h2.2A5 5 0 1 0 10 5v3L5.5 4.5 10 1z" />,
}

/**
 * One slide, inlined. A memoized leaf keyed by slide + theme by its parent:
 * mounting it inserts the SVG and its entrance animations start; nothing the
 * slideshow does afterwards touches this element, so they are never reset.
 */
const Slide = memo(function Slide({
  markup,
  stageRef,
}: {
  markup: string
  stageRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={stageRef}
      data-mol-id="slide-stage"
      // The graphic sets its own background and corner radius; the stage only sizes it.
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
})

/**
 * The README graphic as a deck: one scene per slide, navigated with the
 * arrows, the index under the slide (the graphic's own), the keyboard, a
 * swipe, or a deep link (`#bonds`). Each slide animates in exactly as it does
 * in the looping SVG, then holds; its ambient loops keep running. The header's
 * theme toggle swaps the dark/light variant of the current slide.
 */
export function Slideshow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { themeName } = useTheme()
  const theme = themeName === 'light' ? 'light' : 'dark'

  const [index, setIndex] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const markup = useMemo(() => prepareSlideSvg(SLIDES[theme][index]), [theme, index])

  const go = useCallback((to: number) => {
    const next = wrapIndex(to)
    setIndex(next)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', hashForSlide(next))
  }, [])

  // Deep links: the hash on load, and the back/forward buttons afterwards.
  useEffect(() => {
    const fromHash = () => {
      const i = slideFromHash(window.location.hash)
      if (i !== null) setIndex(i)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  // The graphic's own scene index becomes the deck's navigation.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const navs = Array.from(stage.querySelectorAll<SVGGElement>('[data-scene]'))
    const onNav = (e: Event) => {
      const el = (e.currentTarget as SVGGElement).dataset.scene
      if (el !== undefined) go(Number(el))
    }
    for (const n of navs) {
      n.style.cursor = 'pointer'
      n.addEventListener('click', onNav)
    }
    return () => {
      for (const n of navs) n.removeEventListener('click', onNav)
    }
  }, [markup, replayKey, go])

  // Keys: arrows, digits, Home/End, R — unless something editable has focus.
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
        case ' ':
          if (e.key === ' ' && tag === 'BUTTON') return
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
        case 'r':
          setReplayKey((k) => k + 1)
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

  const copyEmbed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedMarkdown(window.location.origin))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (_error) {
      // Clipboard access can be denied (insecure context, permissions); the
      // links beside the button still lead to the files, so nothing else to do.
    }
  }, [])

  const arrowBtn = cm.button({ variant: 'outline', color: 'secondary', size: 'sm' })
  const scene = SCENES[index]
  const labels = {
    prev: t('slides.prev', undefined, { defaultValue: 'Previous slide' }),
    next: t('slides.next', undefined, { defaultValue: 'Next slide' }),
    replay: t('slides.replay', undefined, { defaultValue: 'Replay this slide' }),
  }

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
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={t(
          'slides.of',
          { n: index + 1, total: SCENES.length, title: scene.title },
          { defaultValue: 'Slide {{n}} of {{total}}: {{title}}' },
        )}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        <Slide key={`${theme}-${index}-${replayKey}`} markup={markup} stageRef={stageRef} />
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 3 }),
          cm.sp('pt', 4),
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <button
            type="button"
            className={arrowBtn}
            onClick={() => go(index - 1)}
            aria-label={labels.prev}
            title={`${labels.prev} (←)`}
            data-mol-id="slides-prev"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              {glyph.prev}
            </svg>
          </button>
          <button
            type="button"
            className={arrowBtn}
            onClick={() => go(index + 1)}
            aria-label={labels.next}
            title={`${labels.next} (→)`}
            data-mol-id="slides-next"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              {glyph.next}
            </svg>
          </button>
          <button
            type="button"
            className={arrowBtn}
            onClick={() => setReplayKey((k) => k + 1)}
            aria-label={labels.replay}
            title={`${labels.replay} (R)`}
            data-mol-id="slides-replay"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {glyph.replay}
            </svg>
          </button>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted)} data-mol-id="slides-counter">
            {`${index + 1} / ${SCENES.length}`}
          </span>
        </div>

        <div
          className={cm.flex({ align: 'center', wrap: 'wrap', gap: 2 })}
          role="group"
          aria-label={t('slides.index', undefined, { defaultValue: 'Slides' })}
        >
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={cm.button({
                variant: i === index ? 'solid' : 'outline',
                color: i === index ? 'primary' : 'secondary',
                size: 'sm',
              })}
              onClick={() => go(i)}
              aria-current={i === index ? 'true' : undefined}
              title={s.title}
              data-mol-id={`slides-go-${i + 1}`}
            >
              {`${i + 1} ${t(`slides.scene.${s.id}`, undefined, { defaultValue: s.label })}`}
            </button>
          ))}
        </div>
      </div>

      <p
        className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('pt', 2))}
        data-mol-id="slides-hint"
      >
        {t('slides.keys', undefined, {
          defaultValue:
            'Keys: ← → slides · 1–5 jump · R replay · swipe on touch. The index under each slide is clickable too.',
        })}
      </p>

      <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 3 }), cm.sp('pt', 4))}>
        <button
          type="button"
          className={cm.button({ variant: 'outline', color: 'secondary', size: 'sm' })}
          onClick={copyEmbed}
          data-mol-id="slides-copy-embed"
        >
          {copied
            ? t('slides.copied', undefined, { defaultValue: 'Copied' })
            : t('slides.copyEmbed', undefined, { defaultValue: 'Copy README embed' })}
        </button>
        <a
          className={cm.link}
          href="/how-molecule-works-dark.svg"
          download
          data-mol-id="slides-download-dark"
        >
          {t('slides.downloadDark', undefined, { defaultValue: 'Looping SVG (dark)' })}
        </a>
        <a
          className={cm.link}
          href="/how-molecule-works-light.svg"
          download
          data-mol-id="slides-download-light"
        >
          {t('slides.downloadLight', undefined, { defaultValue: 'Looping SVG (light)' })}
        </a>
      </div>
    </section>
  )
}
