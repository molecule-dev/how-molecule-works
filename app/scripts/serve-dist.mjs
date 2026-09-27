#!/usr/bin/env node
/**
 * Serve the built site (`dist/`) as plain files, the way the production front
 * does — no compression, no rewriting. For the e2e specs on a machine:
 *
 *   npm run build && node scripts/serve-dist.mjs 4173 &
 *   APP_BASE=http://localhost:4173 npm run test:e2e
 *
 * (`vite preview` is not used for this: Vite 8's preview compresses replies
 * and, for a browser offering `gzip, deflate, br, zstd`, sends a body Chrome
 * rejects with ERR_CONTENT_DECODING_FAILED.)
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

const port = Number(process.argv[2] ?? 4173)
const root = new URL('../dist/', import.meta.url).pathname
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let file = normalize(join(root, decodeURIComponent(url.pathname)))
  if (!file.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    const notFound = join(root, '404.html')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    if (existsSync(notFound)) createReadStream(notFound).pipe(res)
    else res.end('Not found')
    return
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  process.stdout.write(`serving ${root} at http://localhost:${port}\n`)
})
