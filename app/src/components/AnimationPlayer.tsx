import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import darkSvg from '../animation/how-molecule-works-dark.svg?raw'
import lightSvg from '../animation/how-molecule-works-light.svg?raw'
import {
  embedMarkdown,
  formatClock,
  loopTime,
  prepareInlineSvg,
  sceneIndexAt,
  sceneStart,
  SPEEDS,
  TIMELINE,
} from '../animation/player.js'

/** Small monochrome glyphs for the transport buttons; `currentColor` so they follow the button. */
const glyph = {
  play: <path d="M5 3.5v13l11-6.5z" />,
  pause: <path d="M5 3h4v14H5zM11 3h4v14h-4z" />,
  prev: <path d="M4 3h2v14H4zM17 3.5v13L7 10z" />,
  next: <path d="M14 3h2v14h-2zM3 3.5v13L13 10z" />,
  restart: <path d="M10 3a7 7 0 1 1-6.3 4h2.2A5 5 0 1 0 10 5v3L5.5 4.5 10 1z" />,
  fullscreen: <path d="M3 3h5v2H5v3H3zm9 0h5v5h-2V5h-3zM3 12h2v3h3v2H3zm12 0h2v5h-5v-2h3z" />,
}

/**
 * The README graphic, inlined and driven through the Web Animations API:
 * play/pause, scene jumps, a scrubber, speed and fullscreen, with the keyboard
 * and the graphic's own scene index as extra ways in. The theme toggle in the
 * header swaps the dark/light variant without losing the position.
 */
export function AnimationPlayer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { themeName } = useTheme()
  const isLight = themeName === 'light'
  const markup = useMemo(() => prepareInlineSvg(isLight ? lightSvg : darkSvg), [isLight])

  const stageRef = useRef<HTMLDivElement>(null)
  const animsRef = useRef<Animation[]>([])
  const wantPlayingRef = useRef(true)
  const [playing, setPlaying] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const [copied, setCopied] = useState(false)
  const scene = sceneIndexAt(seconds)

  /** The current loop position, read off the first animation. */
  const readTime = useCallback((): number => {
    const a = animsRef.current[0]
    const ms = typeof a?.currentTime === 'number' ? a.currentTime : 0
    return loopTime(ms / 1000)
  }, [])

  const seek = useCallback((toSeconds: number) => {
    const ms = loopTime(toSeconds) * 1000
    for (const a of animsRef.current) a.currentTime = ms
    setSeconds(loopTime(toSeconds))
  }, [])

  const applyPlayState = useCallback((play: boolean) => {
    wantPlayingRef.current = play
    for (const a of animsRef.current) {
      if (play) a.play()
      else a.pause()
    }
    setPlaying(play)
  }, [])

  const applySpeed = useCallback((rate: number) => {
    for (const a of animsRef.current) a.playbackRate = rate
    setSpeed(rate)
  }, [])

  // (Re)collect the animations whenever the inlined markup changes, carrying
  // the position, play state and speed across a theme swap.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const previous = readTime()
    animsRef.current = stage.getAnimations({ subtree: true })
    const ms = previous * 1000
    for (const a of animsRef.current) {
      a.currentTime = ms
      a.playbackRate = speed
      if (wantPlayingRef.current) a.play()
      else a.pause()
    }
    // Hand the graphic's own scene index to the player.
    const navs = Array.from(stage.querySelectorAll<SVGGElement>('[data-scene]'))
    const onNav = (e: Event) => {
      const el = (e.currentTarget as SVGGElement).dataset.scene
      if (el !== undefined) seek(sceneStart(Number(el)))
    }
    for (const n of navs) {
      n.style.cursor = 'pointer'
      n.addEventListener('click', onNav)
    }
    return () => {
      for (const n of navs) n.removeEventListener('click', onNav)
    }
    // `speed` is applied through applySpeed; here it only seeds a fresh set of animations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, readTime, seek])

  // Reduced motion: start paused on the outcomes scene rather than looping.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    seek(sceneStart(TIMELINE.scenes.length - 1))
    applyPlayState(false)
  }, [applyPlayState, seek])

  // The clock: ten readings a second while playing.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = -1
    const tick = () => {
      const now = readTime()
      const bucket = Math.floor(now * 10)
      if (bucket !== last) {
        last = bucket
        setSeconds(now)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, readTime])

  // Keyboard: space, arrows, digits, home, F — unless something editable has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable)
        return
      if (e.key === ' ' && tag === 'BUTTON') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          applyPlayState(!wantPlayingRef.current)
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(sceneStart(sceneIndexAt(readTime()) + 1))
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(sceneStart(sceneIndexAt(readTime()) - 1))
          break
        case 'Home':
          e.preventDefault()
          seek(0)
          break
        case 'f':
          stageRef.current?.requestFullscreen?.()
          break
        default:
          if (/^[1-9]$/.test(e.key) && Number(e.key) <= TIMELINE.scenes.length) {
            e.preventDefault()
            seek(sceneStart(Number(e.key) - 1))
          }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [applyPlayState, readTime, seek])

  const copyEmbed = useCallback(async () => {
    const origin = window.location.origin
    try {
      await navigator.clipboard.writeText(embedMarkdown(origin))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (_error) {
      // Clipboard access can be denied (insecure context, permissions); the
      // snippet is also shown on the page, so there is nothing else to do here.
    }
  }, [])

  const btn = (active = false) =>
    cm.button({
      variant: active ? 'solid' : 'outline',
      color: active ? 'primary' : 'secondary',
      size: 'sm',
    })
  const iconBtn = cm.button({ variant: 'outline', color: 'secondary', size: 'sm' })
  const labels = {
    play: t('player.play', undefined, { defaultValue: 'Play' }),
    pause: t('player.pause', undefined, { defaultValue: 'Pause' }),
    prev: t('player.prev', undefined, { defaultValue: 'Previous scene' }),
    next: t('player.next', undefined, { defaultValue: 'Next scene' }),
    restart: t('player.restart', undefined, { defaultValue: 'Restart' }),
    fullscreen: t('player.fullscreen', undefined, { defaultValue: 'Fullscreen' }),
  }

  return (
    <section
      data-mol-id="player"
      aria-label={t('player.label', undefined, { defaultValue: 'How Molecule works, animated' })}
    >
      <div
        ref={stageRef}
        data-mol-id="player-stage"
        data-playing={playing ? 'true' : 'false'}
        data-scene={scene}
        // The graphic sets its own background and corner radius; the stage only sizes it.
        style={{ maxWidth: 1200, margin: '0 auto', lineHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 3 }),
          cm.sp('pt', 4),
        )}
        style={{ maxWidth: 1200, margin: '0 auto' }}
      >
        <div
          className={cm.flex({ align: 'center', gap: 2 })}
          role="group"
          aria-label={t('player.transport', undefined, { defaultValue: 'Playback' })}
        >
          <button
            type="button"
            className={cm.button({ variant: 'solid', color: 'primary', size: 'sm' })}
            onClick={() => applyPlayState(!playing)}
            aria-pressed={playing}
            aria-label={playing ? labels.pause : labels.play}
            title={`${playing ? labels.pause : labels.play} (space)`}
            data-mol-id="player-toggle"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {playing ? glyph.pause : glyph.play}
            </svg>
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => seek(sceneStart(scene - 1))}
            aria-label={labels.prev}
            title={`${labels.prev} (←)`}
            data-mol-id="player-prev"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {glyph.prev}
            </svg>
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => seek(sceneStart(scene + 1))}
            aria-label={labels.next}
            title={`${labels.next} (→)`}
            data-mol-id="player-next"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {glyph.next}
            </svg>
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => seek(0)}
            aria-label={labels.restart}
            title={`${labels.restart} (home)`}
            data-mol-id="player-restart"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {glyph.restart}
            </svg>
          </button>
          <span
            className={cm.cn(cm.textSize('sm'), cm.textMuted)}
            style={{ fontVariantNumeric: 'tabular-nums', minWidth: '7ch' }}
            data-mol-id="player-clock"
            aria-live="off"
          >
            {formatClock(seconds)}
          </span>
        </div>

        <div
          className={cm.flex({ align: 'center', wrap: 'wrap', gap: 2 })}
          role="group"
          aria-label={t('player.scenes', undefined, { defaultValue: 'Scenes' })}
        >
          {TIMELINE.scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={btn(i === scene)}
              onClick={() => seek(sceneStart(i))}
              aria-current={i === scene ? 'step' : undefined}
              title={`${s.title} (${i + 1})`}
              data-mol-id={`player-scene-${i + 1}`}
            >
              <span aria-hidden="true">{i + 1}</span>
              <span className={cm.srOnly}>
                {t('player.sceneNumber', { n: i + 1 }, { defaultValue: 'Scene {{n}}: ' })}
              </span>{' '}
              {t(`player.scene.${s.id}`, undefined, { defaultValue: s.label })}
            </button>
          ))}
        </div>

        <div
          className={cm.flex({ align: 'center', gap: 2 })}
          role="group"
          aria-label={t('player.speed', undefined, { defaultValue: 'Speed' })}
        >
          {SPEEDS.map((rate) => (
            <button
              key={rate}
              type="button"
              className={btn(rate === speed)}
              onClick={() => applySpeed(rate)}
              aria-pressed={rate === speed}
              data-mol-id={`player-speed-${rate}`}
            >
              {rate}×
            </button>
          ))}
          <button
            type="button"
            className={iconBtn}
            onClick={() => stageRef.current?.requestFullscreen?.()}
            aria-label={labels.fullscreen}
            title={`${labels.fullscreen} (f)`}
            data-mol-id="player-fullscreen"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {glyph.fullscreen}
            </svg>
          </button>
        </div>
      </div>

      <div className={cm.sp('pt', 3)} style={{ maxWidth: 1200, margin: '0 auto' }}>
        <label className={cm.srOnly} htmlFor="player-scrubber">
          {t('player.scrubber', undefined, { defaultValue: 'Position in the loop' })}
        </label>
        <input
          id="player-scrubber"
          type="range"
          min={0}
          max={TIMELINE.loopSeconds}
          step={0.05}
          value={seconds}
          onChange={(e) => seek(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--mol-color-primary, #4070e0)' }}
          data-mol-id="player-scrubber"
        />
        <p
          className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('pt', 1))}
          data-mol-id="player-hint"
        >
          {t(
            'player.currentScene',
            { n: scene + 1, title: TIMELINE.scenes[scene].title },
            { defaultValue: 'Scene {{n}} of 5 — {{title}}' },
          )}
          {' · '}
          {t('player.keys', undefined, {
            defaultValue: 'Keys: space play/pause · ← → scenes · 1–5 jump · F fullscreen',
          })}
        </p>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 3 }), cm.sp('pt', 4))}
        style={{ maxWidth: 1200, margin: '0 auto' }}
      >
        <button
          type="button"
          className={cm.button({ variant: 'outline', color: 'secondary', size: 'sm' })}
          onClick={copyEmbed}
          data-mol-id="player-copy-embed"
        >
          {copied
            ? t('player.copied', undefined, { defaultValue: 'Copied' })
            : t('player.copyEmbed', undefined, { defaultValue: 'Copy README embed' })}
        </button>
        <a
          className={cm.link}
          href="/how-molecule-works-dark.svg"
          download
          data-mol-id="player-download-dark"
        >
          {t('player.downloadDark', undefined, { defaultValue: 'SVG (dark)' })}
        </a>
        <a
          className={cm.link}
          href="/how-molecule-works-light.svg"
          download
          data-mol-id="player-download-light"
        >
          {t('player.downloadLight', undefined, { defaultValue: 'SVG (light)' })}
        </a>
      </div>
    </section>
  )
}
