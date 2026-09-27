import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MOLECULE_REPO_URL } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * The one line of site chrome: copyright, the repo, About (or the way back
 * from it) and the theme toggle. molecule.dev itself is linked from the
 * artwork, so it is not repeated here.
 */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const onAbout = pathname.startsWith('/about')
  const year = new Date().getFullYear()
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
          <a
            className={cm.link}
            href={MOLECULE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-mol-id="footer-repo"
          >
            GitHub
          </a>
          {onAbout ? (
            <Link className={cm.link} to="/" data-mol-id="footer-home">
              {t('footer.slides', undefined, { defaultValue: 'Slides' })}
            </Link>
          ) : (
            <Link className={cm.link} to="/about/" data-mol-id="footer-about">
              {t('footer.aboutSite', undefined, { defaultValue: 'About this site' })}
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </footer>
  )
}
