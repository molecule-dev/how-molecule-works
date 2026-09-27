import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, MOLECULE_REPO_URL, WEBSITE_URL } from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'
import { Slideshow } from '../components/Slideshow.js'

/** The front page: the animated graphic with its controls. Prerendered to `dist/index.html`. */
export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.sp('py', 8)} data-mol-id="home-page">
      <PageMeta title="" description={APP_DESCRIPTION} />
      <header className={cm.cn(cm.textCenter, cm.sp('pb', 6))}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('home.title', undefined, { defaultValue: 'How Molecule works' })}
        </h1>
        <p
          className={cm.cn(cm.sp('pt', 3), cm.textMuted)}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          {t('home.lead', undefined, {
            defaultValue:
              'Five slides: describe an app, watch it compose from open-source packages, swap a provider, see what ships built in, and how the app keeps improving. Step through at your own pace.',
          })}
        </p>
      </header>

      <Slideshow />

      <section
        className={cm.cn(cm.textCenter, cm.sp('pt', 10), cm.textMuted)}
        data-mol-id="home-links"
      >
        <p>
          {t('home.sameAsReadme', undefined, {
            defaultValue:
              'This is the same graphic the molecule README embeds — one source, generated on every build of this site.',
          }) + ' '}
          <a
            className={cm.link}
            href={MOLECULE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-mol-id="home-repo"
          >
            {t('home.repoLink', undefined, { defaultValue: 'molecule on GitHub' })}
          </a>
          {' · '}
          <a
            className={cm.link}
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-mol-id="home-site"
          >
            molecule.dev
          </a>
        </p>
      </section>
    </div>
  )
}
