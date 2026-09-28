import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { embedMarkdown } from '../animation/slides.js'
import {
  APP_DESCRIPTION,
  MOLECULE_REPO_URL,
  SOURCE_URL,
  WEBSITE_URL,
  WORKSPACE_URL,
} from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'
import { SITE_URL } from '../site.js'

/**
 * About page — `/about/`: what this site is, where its parts live, and how to
 * embed the graphic. Prerendered to `dist/about/index.html`.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title = t('about.thisSite', undefined, { defaultValue: 'About this site' })
  const links: Array<{ id: string; href: string; label: string; note: string }> = [
    {
      id: 'site',
      href: WEBSITE_URL,
      label: 'molecule.dev',
      note: t('about.link.site', undefined, {
        defaultValue: 'the platform this site was built and deployed with',
      }),
    },
    {
      id: 'repo',
      href: MOLECULE_REPO_URL,
      label: 'github.com/molecule-dev/molecule',
      note: t('about.link.repo', undefined, {
        defaultValue: 'the open-source packages, and the README that embeds this graphic',
      }),
    },
    ...(WORKSPACE_URL
      ? [
          {
            id: 'workspace',
            href: WORKSPACE_URL,
            label: t('about.link.workspaceLabel', undefined, {
              defaultValue: 'this project on molecule.dev',
            }),
            note: t('about.link.workspace', undefined, {
              defaultValue: 'the public workspace: files, build and deploy, readable by anyone',
            }),
          },
        ]
      : []),
    ...(SOURCE_URL
      ? [
          {
            id: 'source',
            href: SOURCE_URL,
            label: t('about.link.sourceLabel', undefined, { defaultValue: 'source of this site' }),
            note: t('about.link.source', undefined, {
              defaultValue: 'the generator, the player and the tests',
            }),
          },
        ]
      : []),
  ]

  return (
    <div
      className={cm.sp('py', 12)}
      style={{ maxWidth: 720, margin: '0 auto' }}
      data-mol-id="about-page"
    >
      <PageMeta title={title} description={APP_DESCRIPTION} />
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{title}</h1>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)} data-mol-id="about-description">
        {t('about.description', undefined, {
          defaultValue:
            'The graphic at the top of the molecule README is one animated SVG: CSS keyframes, outlined type, no scripts, so it plays inside GitHub’s image proxy. This site shows its five scenes as slides. They play on their own, pause while you rest the pointer on them, and stop once you navigate; the index row under each slide, the arrow keys and a swipe all move between them; package and category names open the catalog. On a phone each slide is rendered as HTML with the same words and links, since the graphic is too small to read there.',
        })}
      </p>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
        {t('about.sync', undefined, {
          defaultValue:
            'Everything the graphic says lives in one content file that both the SVG generator and the slides read. The site is a molecule.dev static project, built and deployed from its workspace (the badge in the corner points there); every deploy regenerates the SVGs, and the copies in the molecule repository are synced from this site and checked, so the README and the slides cannot drift apart.',
        })}
      </p>
      <ul className={cm.sp('pt', 6)} data-mol-id="about-links">
        {links.map((l) => (
          <li key={l.id} className={cm.sp('py', 1)}>
            <a
              className={cm.link}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              data-mol-id={`about-link-${l.id}`}
            >
              {l.label}
            </a>
            <span className={cm.textMuted}>{` — ${l.note}`}</span>
          </li>
        ))}
      </ul>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('pt', 8))}>
        {t('about.embedTitle', undefined, { defaultValue: 'Embed it' })}
      </h2>
      <p className={cm.cn(cm.sp('pt', 2), cm.textMuted)}>
        {t('about.embed', undefined, {
          defaultValue:
            'The raw SVGs are served from this site in both themes; put this in a README and GitHub picks the theme: ',
        })}
      </p>
      <pre
        className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3))}
        style={{ overflowX: 'auto', padding: 12, borderRadius: 10 }}
        data-mol-id="about-embed"
      >
        {embedMarkdown(SITE_URL)}
      </pre>
      <p className={cm.cn(cm.sp('pt', 3), cm.textMuted)}>
        <a className={cm.link} href="/how-molecule-works-dark.svg" data-mol-id="about-svg-dark">
          {t('about.svgDark', undefined, { defaultValue: 'Looping SVG (dark)' })}
        </a>
        {' · '}
        <a className={cm.link} href="/how-molecule-works-light.svg" data-mol-id="about-svg-light">
          {t('about.svgLight', undefined, { defaultValue: 'Looping SVG (light)' })}
        </a>
      </p>
    </div>
  )
}
