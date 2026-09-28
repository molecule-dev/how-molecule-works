import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MOLECULE_REPO_URL, SOURCE_URL, WORKSPACE_URL } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * The one line of site chrome: copyright, the packages on GitHub, this site's
 * source and its public molecule.dev workspace, and the theme toggle.
 * molecule.dev itself is linked from the artwork, so it is not repeated here.
 */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const links = [
    { id: 'repo', href: MOLECULE_REPO_URL, label: 'GitHub' },
    {
      id: 'source',
      href: SOURCE_URL,
      label: t('footer.source', undefined, { defaultValue: 'Source' }),
    },
    {
      id: 'workspace',
      href: WORKSPACE_URL,
      label: t('footer.workspace', undefined, { defaultValue: 'Workspace' }),
    },
  ].filter((l) => l.href)
  return (
    <footer className={cm.footerBar} data-mol-id="site-footer">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 4 }),
          cm.textSize('sm'),
        )}
      >
        <span className={cm.textMuted}>
          {t('footer.copyright', { year }, { defaultValue: '© {{year}} Molecule Dev, Inc.' })}
        </span>
        <nav
          className={cm.flex({ align: 'center', wrap: 'wrap', gap: 4 })}
          aria-label={t('footer.nav', undefined, { defaultValue: 'Links' })}
        >
          {links.map((l) => (
            <a
              key={l.id}
              className={cm.link}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              data-mol-id={`footer-${l.id}`}
            >
              {l.label}
            </a>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </footer>
  )
}
