import type React from 'react'

import content from '../animation/content.json'
import { withBase } from '../site.js'

/**
 * The five slides as HTML, for screens too narrow to read the 1200px graphic.
 * Same words, same parts, same colours — `content.json` is written by the
 * generator that draws the SVG, so nothing here can say something the graphic
 * does not. Links are real links; anything with `data-info` explains itself on
 * hover the same way the SVG's chips do.
 */

const ACC = ['var(--hmw-acc1)', 'var(--hmw-acc2)', 'var(--hmw-acc3)', 'var(--hmw-acc4)']
const acc = (i: number) => ACC[i % ACC.length]
const step = (i: number) => ({ ['--i' as string]: i })

/** One scene's sentence, with its link phrases as links. */
function Caption({ index }: { index: number }) {
  const scene = content.scenes[index]
  const parts: React.ReactNode[] = []
  let rest = scene.title
  for (const link of scene.links) {
    const at = rest.indexOf(link.phrase)
    if (at < 0) continue
    parts.push(rest.slice(0, at))
    parts.push(
      <a key={link.phrase} href={link.href} target="_blank" rel="noopener noreferrer">
        {link.phrase}
      </a>,
    )
    rest = rest.slice(at + link.phrase.length)
  }
  parts.push(rest)
  return (
    <p className="hmw-cap" data-step style={step(0)}>
      {parts}
    </p>
  )
}

function Chip({
  href,
  info,
  color,
  mono,
  plain,
  children,
  step: i,
}: {
  href?: string
  info?: string
  color?: string
  mono?: boolean
  plain?: boolean
  children: React.ReactNode
  step?: number
}) {
  const cls = `hmw-chip${mono ? ' hmw-mono' : ''}${plain ? ' hmw-chip--plain' : ''}`
  const style = {
    ...(color ? { ['--c' as string]: color } : {}),
    ...(i !== undefined ? step(i) : {}),
  }
  const inner = (
    <>
      {plain ? null : <i aria-hidden="true" />}
      {children}
    </>
  )
  return href ? (
    <a
      className={cls}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-info={info}
      data-step={i !== undefined ? '' : undefined}
      style={style}
    >
      {inner}
    </a>
  ) : (
    <span
      className={cls}
      data-info={info}
      data-step={i !== undefined ? '' : undefined}
      style={style}
    >
      {inner}
    </span>
  )
}

function Describe() {
  const c = content
  return (
    <>
      <Caption index={0} />
      <a
        className="hmw-prompt"
        href={c.prompt.href}
        target="_blank"
        rel="noopener noreferrer"
        data-step
        style={step(1)}
      >
        <span className="hmw-lbl hmw-lbl--faint">You</span>
        <span className="hmw-prompt-text">{c.prompt.text}</span>
      </a>
      <div className="hmw-row" data-step style={step(2)}>
        {c.badges.map((b, i) => (
          <Chip key={b.label} href={b.href} color={acc(i === 0 ? 1 : 0)} mono={b.mono}>
            {b.label}
          </Chip>
        ))}
      </div>
      <p className="hmw-note" data-step style={step(3)}>
        {c.howNote}
      </p>
      <p className="hmw-lbl" data-step style={step(4)}>
        <a href={c.catalog.href} target="_blank" rel="noopener noreferrer">
          {c.catalog.label}
        </a>
      </p>
      <div className="hmw-row">
        {c.nodes.map((n, i) => (
          <Chip
            key={n.name}
            href={n.href}
            info={`@molecule/${n.name} — ${n.info}`}
            color={acc(i)}
            mono
            step={5 + i}
          >
            {n.name}
          </Chip>
        ))}
      </div>
      <p className="hmw-done" data-step style={step(14)}>
        <i aria-hidden="true" />
        {c.done}
      </p>
    </>
  )
}

function Bonds() {
  const c = content
  return (
    <>
      <Caption index={1} />
      <div className="hmw-core" data-step style={step(1)}>
        <span className="hmw-lbl">core interface</span>
        <a
          className="hmw-mono hmw-core-name"
          href={c.core.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {c.core.name}
        </a>
        <span className="hmw-sub">{c.core.methods}</span>
      </div>
      <span className="hmw-bond-link" aria-hidden="true" />
      <p className="hmw-lbl" data-step style={step(2)}>
        bond (provider)
      </p>
      <div className="hmw-slot" data-step style={step(2)}>
        {c.dbBonds.map((b, i) => (
          <span
            key={b.id}
            className={`hmw-slot-item hmw-cyc${i === 0 ? ' hmw-cyc--first' : ''}`}
            style={{ ['--k' as string]: i, ['--c' as string]: acc(i) }}
          >
            <Chip href={b.href} info={b.info} mono>
              {b.name}
            </Chip>
            <em>{b.label}</em>
          </span>
        ))}
      </div>
      <div className="hmw-code" data-step style={step(3)}>
        <div className="hmw-code-bar">
          <span />
          <span />
          <span />
          api/src/bonds.ts
        </div>
        <pre>
          <span className="hmw-dim">{'// the one wiring file'}</span>
          {'\n'}
          {'import { pool, store } from'}
          {'\n'}
          <span className="hmw-add">
            {"  '@molecule/api-database-"}
            <span className="hmw-cyc-word">
              {c.dbBonds.map((b, i) => (
                <span
                  key={b.id}
                  className={`hmw-cyc${i === 0 ? ' hmw-cyc--first' : ''}`}
                  style={{ ['--k' as string]: i }}
                >
                  {b.id}
                  {"'"}
                </span>
              ))}
            </span>
          </span>
          {'\n'}
          {'setPool(pool); setStore(store)'}
        </pre>
      </div>
      <p className="hmw-lbl" data-step style={step(4)}>
        <a href={c.catalog.href} target="_blank" rel="noopener noreferrer">
          {c.categoriesLabel}
        </a>
      </p>
      <div className="hmw-row">
        {c.categories.map((k, i) => (
          <Chip key={k.name} href={k.href} mono plain step={5 + i}>
            {k.name}
          </Chip>
        ))}
      </div>
      <p className="hmw-note" data-step style={step(17)}>
        {c.frameworksNote}
      </p>
    </>
  )
}

function BuiltIn() {
  const c = content
  return (
    <>
      <Caption index={2} />
      <ul className="hmw-tiles">
        {c.tiles.map((t, i) => (
          <li
            key={t.label}
            data-info={t.info}
            data-step
            style={{ ...step(1 + i), ['--c' as string]: acc(i) }}
          >
            <i aria-hidden="true" />
            {t.href ? (
              <a href={t.href} target="_blank" rel="noopener noreferrer">
                {t.label}
              </a>
            ) : (
              <span>{t.label}</span>
            )}
            <span className="hmw-check" aria-hidden="true">
              <svg viewBox="0 0 10 10">
                <path
                  d="M2 5.2 4 7.2 8 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </li>
        ))}
      </ul>
      <p className="hmw-note" data-step style={step(18)}>
        {c.tilesNote}
      </p>
    </>
  )
}

const ARROWS = [
  { left: '50%', top: '0%', deg: 0 },
  { left: '100%', top: '50%', deg: 90 },
  { left: '50%', top: '100%', deg: 180 },
  { left: '0%', top: '50%', deg: 270 },
]

function Feedback() {
  const c = content
  return (
    <>
      <Caption index={3} />
      <div className="hmw-loop" data-step style={step(1)}>
        <div className="hmw-loop-face">
          <span className="hmw-loop-ring" />
          {ARROWS.map((a) => (
            <span
              key={a.deg}
              className="hmw-loop-arrow"
              style={{ left: a.left, top: a.top, ['--deg' as string]: `${a.deg}deg` }}
              aria-hidden="true"
            >
              <svg viewBox="-6 -6 12 12">
                <path
                  d="M-4 -5 L4 0 L-4 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ))}
          <span className="hmw-loop-orbit" aria-hidden="true">
            <span className="hmw-loop-dot" />
          </span>
          <span className="hmw-loop-center">
            {c.loopCenter[0]}
            <br />
            {c.loopCenter[1]}
          </span>
        </div>
        <div className="hmw-row hmw-row--center">
          {c.loopSteps.map((label, i) => (
            <Chip key={label} color={acc(i)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <p className="hmw-lbl" data-step style={step(2)}>
        {c.signalsLabel}
      </p>
      <ul className="hmw-signals">
        {c.signals.map((sg, i) => (
          <li key={sg.kind} data-step style={{ ...step(3 + i), ['--c' as string]: acc(i) }}>
            <span className="hmw-lbl hmw-lbl--c">{sg.kind}</span>
            <span>{sg.text}</span>
          </li>
        ))}
      </ul>
      <svg
        className="hmw-arrow-down"
        viewBox="0 0 14 22"
        aria-hidden="true"
        data-step
        style={step(6)}
      >
        <path
          d="M7 1v18M2 14l5 6 5-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <a
        className="hmw-ai"
        href={c.ai.href}
        target="_blank"
        rel="noopener noreferrer"
        data-step
        style={step(7)}
      >
        <span className="hmw-lbl">{c.ai.label}</span>
        <strong>{c.ai.headline}</strong>
        <span className="hmw-sub">{c.ai.sub}</span>
      </a>
      <p className="hmw-done" data-step style={step(8)}>
        <i aria-hidden="true" />
        {c.loopResult}
      </p>
      <p className="hmw-note" data-step style={step(9)}>
        {c.loopNote}
      </p>
    </>
  )
}

function Outcomes() {
  const c = content
  return (
    <>
      <Caption index={4} />
      <ul className="hmw-outcomes">
        {c.outcomes.map((o, i) => (
          <li key={o.num} data-step style={step(1 + i)}>
            <span className="hmw-num">{o.num}</span>
            <strong>{o.title}</strong>
            <span>{o.body}</span>
          </li>
        ))}
      </ul>
      <p className="hmw-lbl" data-step style={step(5)}>
        {c.platformsLabel}
      </p>
      <ul className="hmw-plats">
        {c.platforms.map((p, i) => (
          <li key={p.name} data-step style={{ ...step(6 + i), ['--c' as string]: acc(i) }}>
            <i aria-hidden="true" />
            <strong>{p.name}</strong>
            <span>{p.sub}</span>
          </li>
        ))}
      </ul>
      <a
        className="hmw-closing"
        href={c.closing.href}
        target="_blank"
        rel="noopener noreferrer"
        data-step
        style={step(9)}
      >
        <strong>{c.closing.strong}</strong>
        <span>{c.closing.sub}</span>
        <span className="hmw-site">{c.closing.site}</span>
      </a>
    </>
  )
}

const PANELS = [Describe, Bonds, BuiltIn, Feedback, Outcomes]

/** One slide as HTML: the graphic's header, then that scene's content. */
export function SlidePanel({ index }: { index: number }) {
  const Panel = PANELS[index]
  return (
    <div className="hmw-panel" data-mol-id="slide-panel">
      <header className="hmw-ph">
        <a href={content.closing.href} target="_blank" rel="noopener noreferrer">
          <img src={withBase('logo.svg')} alt="" width={22} height={22} />
          How Molecule works
        </a>
        <a
          className="hmw-ph-site"
          href={content.closing.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          molecule.dev
        </a>
      </header>
      <Panel />
    </div>
  )
}

/** Styles for the panels; colours come from the `--hmw-*` tokens the deck sets per theme. */
export const PANEL_CSS = `
.hmw-panel{padding:18px 18px 16px;border:1px solid var(--hmw-border);border-radius:16px;background:var(--hmw-bg);color:var(--hmw-text);font-size:14px;line-height:1.5;text-align:left}
.hmw-panel a{color:inherit;text-decoration:none}
.hmw-ph{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;margin:0 0 14px}
.hmw-ph a{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--hmw-strong)}
.hmw-ph a:first-child{white-space:nowrap}
@media (max-width:359px){.hmw-panel{padding:16px 14px 14px}.hmw-ph a{font-size:14px}.hmw-ph a:first-child{gap:6px}.hmw-cap{font-size:16px}}
.hmw-ph .hmw-ph-site{font-size:13px;font-weight:600;color:var(--hmw-link)}
.hmw-cap{margin:0 0 16px;font-size:17px;font-weight:600;line-height:1.35;color:var(--hmw-strong)}
.hmw-cap a{color:var(--hmw-link);text-decoration:underline;text-underline-offset:3px}
.hmw-lbl{margin:16px 0 8px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--hmw-link)}
.hmw-lbl a{color:inherit;border-bottom:1px solid transparent}
.hmw-lbl a:hover{border-bottom-color:currentColor}
.hmw-lbl--faint{margin:0;color:var(--hmw-gray)}
.hmw-lbl--c{margin:0;color:var(--c)}
.hmw-note{margin:14px 0 0;font-size:13.5px;color:var(--hmw-gray)}
.hmw-sub{font-size:12.5px;color:var(--hmw-gray)}
.hmw-mono{font-family:ui-monospace,'JetBrains Mono',SFMono-Regular,Menlo,monospace}
.hmw-row{display:flex;flex-wrap:wrap;gap:8px}
.hmw-row--center{justify-content:center;margin-top:16px}
.hmw-chip{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:6px 11px;border:1px solid var(--hmw-border);border-radius:100px;background:var(--hmw-layer);font-size:12.5px;font-weight:500;color:var(--hmw-strong);transition:border-color .18s ease,box-shadow .18s ease}
.hmw-chip > i{flex:none;width:6px;height:6px;border-radius:50%;background:var(--c,var(--hmw-link))}
.hmw-chip--plain{color:var(--hmw-text)}
a.hmw-chip:hover,a.hmw-chip:focus-visible{border-color:var(--hmw-link);box-shadow:0 0 0 3px color-mix(in srgb,var(--hmw-link) 20%,transparent);outline:none}
.hmw-prompt{display:grid;gap:6px;padding:14px 16px;border-radius:10px;background:var(--hmw-layer);box-shadow:0 0 0 2px var(--hmw-primary)}
.hmw-prompt-text{font-size:15.5px;font-weight:500;color:var(--hmw-strong)}
.hmw-prompt + .hmw-row{margin-top:14px}
.hmw-done{display:inline-flex;align-items:center;gap:8px;margin:14px 0 0;padding:6px 12px;border:1px solid var(--hmw-border);border-radius:100px;background:var(--hmw-layer);font-size:12.5px;color:var(--hmw-text)}
.hmw-done > i{flex:none;width:6px;height:6px;border-radius:50%;background:var(--hmw-green)}
.hmw-core{display:grid;gap:5px;padding:14px 16px;border:1.5px solid var(--hmw-primary);border-radius:12px;background:var(--hmw-layer)}
.hmw-core .hmw-lbl{margin:0}
.hmw-core-name{font-size:15px;color:var(--hmw-strong)}
.hmw-bond-link{display:block;width:36px;height:18px;margin:0 auto;border:1.5px dashed var(--hmw-primary);border-top:none}
.hmw-slot{position:relative;height:56px;margin:0 0 14px;border:1px dashed var(--hmw-border);border-radius:12px}
.hmw-slot-item{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 14px 0 10px}
.hmw-slot-item .hmw-chip{border-color:var(--c);min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.hmw-slot-item em{flex:none;font-style:normal;font-size:12.5px;font-weight:600;color:var(--c)}
@media (max-width:419px){.hmw-slot-item em{display:none}}
@keyframes hmw-cyc{0%{opacity:0;visibility:hidden;transform:translateX(12px)}6%{opacity:1;visibility:visible;transform:none}21%{opacity:1;visibility:visible;transform:none}25%{opacity:0;visibility:hidden;transform:translateX(-8px)}100%{opacity:0;visibility:hidden;transform:translateX(-8px)}}
.hmw-cyc{animation:hmw-cyc 4.8s linear infinite;animation-delay:calc(var(--k,0) * 1.2s - 4.8s)}
.hmw-cyc-word{display:inline-grid;vertical-align:baseline}
.hmw-cyc-word .hmw-cyc{grid-area:1/1}
.hmw-code{overflow:hidden;border:1px solid #232733;border-radius:12px;background:#0d1017}
.hmw-code-bar{display:flex;align-items:center;gap:7px;padding:10px 14px;border-bottom:1px solid #1b1f29;font-family:ui-monospace,'JetBrains Mono',SFMono-Regular,Menlo,monospace;font-size:11.5px;color:#8b929f}
.hmw-code-bar > span{width:9px;height:9px;border-radius:50%;background:#2b303b}
.hmw-code-bar > span:nth-child(3){margin-right:6px}
.hmw-code pre{margin:0;padding:14px 16px;overflow-x:auto;font-family:ui-monospace,'JetBrains Mono',SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.9;color:#c8cdd6}
.hmw-code .hmw-dim{color:#868d9b}
.hmw-code .hmw-add{color:#5bb98c}
.hmw-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}
@media (max-width:359px){.hmw-tiles{grid-template-columns:1fr}}
.hmw-tiles > li{display:flex;align-items:center;gap:9px;min-height:44px;padding:10px 12px;border:1px solid var(--hmw-border);border-radius:12px;background:var(--hmw-layer);font-size:13.5px;font-weight:500;color:var(--hmw-strong)}
.hmw-tiles > li > i{flex:none;width:6px;height:6px;border-radius:50%;background:var(--c)}
.hmw-tiles > li > span:first-of-type,.hmw-tiles > li > a{flex:1 1 auto;min-width:0}
.hmw-tiles > li > a::after{content:'';position:absolute;inset:0}
.hmw-tiles > li{position:relative}
.hmw-tiles > li:has(> a):hover{border-color:var(--hmw-link)}
.hmw-check{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--hmw-green);color:var(--hmw-green);background:color-mix(in srgb,var(--hmw-green) 16%,transparent)}
.hmw-check svg{width:10px;height:10px}
.hmw-loop{margin:4px 0 0}
.hmw-loop-face{position:relative;width:200px;aspect-ratio:1/1;margin:14px auto 0}
.hmw-loop-ring{position:absolute;inset:0;border:2px solid var(--hmw-border);border-radius:50%}
.hmw-loop-arrow{position:absolute;width:12px;height:12px;color:var(--hmw-gray);transform:translate(-50%,-50%) rotate(var(--deg,0deg))}
.hmw-loop-arrow svg{display:block;width:12px;height:12px;overflow:visible}
.hmw-loop-center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;font-size:12.5px;font-weight:700;line-height:1.5;color:var(--hmw-gray)}
.hmw-loop-orbit{position:absolute;inset:0;animation:hmw-spin 3s linear infinite}
.hmw-loop-dot{position:absolute;left:50%;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--hmw-link);box-shadow:0 0 0 5px color-mix(in srgb,var(--hmw-link) 25%,transparent)}
@keyframes hmw-spin{to{transform:rotate(360deg)}}
.hmw-signals{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.hmw-signals > li{position:relative;display:grid;gap:2px;padding:10px 14px 10px 26px;border:1px solid var(--hmw-border);border-radius:12px;background:var(--hmw-layer);font-size:13.5px}
.hmw-signals > li::before{content:'';position:absolute;left:12px;top:12px;bottom:12px;width:4px;border-radius:2px;background:var(--c)}
.hmw-arrow-down{display:block;width:14px;height:22px;margin:10px auto;color:var(--hmw-gray)}
.hmw-ai{display:grid;gap:5px;padding:14px 16px;border:1.5px solid var(--hmw-primary);border-radius:12px;background:var(--hmw-layer)}
.hmw-ai .hmw-lbl{margin:0}
.hmw-ai strong{font-size:13.5px;font-weight:600;color:var(--hmw-strong)}
.hmw-outcomes,.hmw-plats{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.hmw-outcomes > li{display:grid;gap:4px;padding:16px 18px;border:1px solid var(--hmw-border);border-radius:14px;background:var(--hmw-layer)}
.hmw-outcomes strong{font-size:17px;font-weight:600;color:var(--hmw-strong)}
.hmw-outcomes > li > span:last-child{font-size:13.5px;color:var(--hmw-gray)}
.hmw-num{font-size:12.5px;font-weight:700;letter-spacing:.1em;color:var(--hmw-link)}
.hmw-plats > li{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;padding:10px 14px;border:1px solid var(--hmw-border);border-radius:12px;background:var(--hmw-layer)}
.hmw-plats > li > i{grid-row:span 2;width:7px;height:7px;border-radius:50%;background:var(--c)}
.hmw-plats strong{font-size:13.5px;font-weight:600;color:var(--hmw-strong)}
.hmw-plats > li > span{font-size:12.5px;color:var(--hmw-gray)}
.hmw-closing{display:grid;gap:3px;margin-top:18px;padding-top:14px;border-top:1px solid var(--hmw-border)}
.hmw-closing strong{font-size:14.5px;font-weight:600;color:var(--hmw-strong)}
.hmw-closing span{font-size:13px;color:var(--hmw-gray)}
.hmw-closing .hmw-site{font-weight:700;color:var(--hmw-link)}
.hmw-panel [data-step]{animation:hmw-step .45s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 70ms + 80ms)}
@keyframes hmw-step{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.hmw-panel [data-step],.hmw-loop-orbit{animation:none}.hmw-cyc{animation:none;opacity:0;visibility:hidden}.hmw-cyc--first{opacity:1;visibility:visible;transform:none}}
`
