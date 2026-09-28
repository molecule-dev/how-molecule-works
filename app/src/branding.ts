/* =============================================================================
 * APP BRANDING — this file is the single source of truth for this app's identity.
 *
 * APP_NAME / APP_DESCRIPTION / BRAND_COLOR below drive the browser-tab <title>,
 * the social + PWA meta tags, the generated logo/icons, and the package.json
 * name + description — all were derived FROM this file at scaffold time. That
 * sync ran once, at scaffold time: after it, a rename edits the values here AND
 * the copies below, which do not re-read this file at runtime:
 *   • app/index.html <title> + og/twitter/apple title  ← APP_NAME
 *     ...description meta + theme-color meta            ← APP_DESCRIPTION / BRAND_COLOR
 *   • root/app/api package.json name + description      ← synced from here + project name
 *   • app/src/locales/<lang>/ui.ts strings              → prefer t('app.name', …)
 *     over a literal product name so a rename here flows through every locale
 * After changing BRAND_COLOR or replacing public/logo.svg, run:
 *   npm run generate-icons   (rebuilds favicon, PWA icons, splash, OG, + HTML meta)
 * ============================================================================= */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'How Molecule works'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = 'https://www.molecule.dev'

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'How molecule.dev builds full-stack apps, in five slides: describe the app, swap providers as bonds, everything a real app needs built in, an app that keeps improving from real use, and what that adds up to. The animated graphic from the molecule README, as a site.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#4070e0'

/** The open-source packages, and the README this graphic sits on top of. */
export const MOLECULE_REPO_URL = 'https://github.com/molecule-dev/molecule'

/**
 * This project's public workspace on molecule.dev (its share link), the same
 * place the deployed badge points. Empty until the share link exists.
 */
export const WORKSPACE_URL = 'https://www.molecule.dev/share/4fac73a7aea7716299d7a4ba90396de6'

/** Where this site's source lives. */
export const SOURCE_URL = 'https://github.com/molecule-dev/how-molecule-works'
