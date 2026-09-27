import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MOLECULE_REPO_URL, WEBSITE_URL } from '../branding.js'

/** Site footer: where the parts live, and the About link. */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-mol-id="footer-site"
          >
            molecule.dev
          </a>
          <a
            className={cm.link}
            href={MOLECULE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-mol-id="footer-repo"
          >
            GitHub
          </a>
          <Link className={cm.link} to="/about/" data-mol-id="footer-about">
            {t('footer.about', undefined, { defaultValue: 'About this site' })}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
