import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'

/**
 * Page + footer — the frame every route renders inside. There is no site
 * header: the artwork carries the title, the logo and the molecule.dev link,
 * and a header would only repeat them. Full width: the deck sizes itself to
 * the viewport (Slideshow.tsx), and the shell's padding is the side gutter.
 */
export function SiteLayout() {
  return (
    <AppShellLayout footer={<Footer />} maxWidth="full" dataMolId="site-layout">
      <Outlet />
    </AppShellLayout>
  )
}
