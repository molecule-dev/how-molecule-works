import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'

/**
 * Page + footer — the frame every route renders inside. There is no site
 * header: the artwork carries the title, the logo and the molecule.dev link,
 * and a header would only repeat them.
 */
export function SiteLayout() {
  return (
    <AppShellLayout footer={<Footer />} dataMolId="site-layout">
      <Outlet />
    </AppShellLayout>
  )
}
