import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  APP_DESCRIPTION,
  MOLECULE_REPO_URL,
  SOURCE_URL,
  WEBSITE_URL,
  WORKSPACE_URL,
} from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'

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
            'The graphic at the top of the molecule README is a single animated SVG: CSS keyframes, outlined type, no scripts, so it plays inside GitHub’s image proxy. This site inlines the same file and drives its animations, which is how the controls work. The site itself is a molecule.dev static project: scaffolded with mlcl, built in a molecule.dev sandbox, deployed from there, with the badge in the corner pointing at its public workspace.',
        })}
      </p>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
        {t('about.sync', undefined, {
          defaultValue:
            'Every build of this site regenerates the SVG, and the README copies are checked against the deployed files, so the two can never drift apart.',
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
            'The raw SVGs are served from this site in both themes; the “Copy README embed” button on the front page puts a theme-aware <picture> block on your clipboard.',
        })}
      </p>
    </div>
  )
}
