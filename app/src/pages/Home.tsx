import { APP_DESCRIPTION } from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'
import { Slideshow } from '../components/Slideshow.js'

/** The front page is the deck. Prerendered to `dist/index.html`. */
export function Home() {
  return (
    <div style={{ padding: '24px 0' }} data-mol-id="home-page">
      <PageMeta title="" description={APP_DESCRIPTION} />
      <Slideshow />
    </div>
  )
}
