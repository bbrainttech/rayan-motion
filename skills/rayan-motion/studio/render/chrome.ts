import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

export const root = join(import.meta.dir, '..')
export const studio = JSON.parse(readFileSync(join(root, 'studio.json'), 'utf8'))

const places = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

export const steady = [
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--font-render-hinting=none',
  '--run-all-compositor-stages-before-draw',
  '--disable-checker-imaging',
  '--disable-new-content-rendering-timeout',
  '--disable-image-animation-resync',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
]

export function chrome() {
  const path = process.env.CHROME || studio.chrome || places.find((p) => existsSync(p))
  if (!path || !existsSync(path)) throw new Error('Chrome not found. Set CHROME to its path, or "chrome" in studio.json.')
  return path
}

const isFile = (file: string) => {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

export function serve(base: string, missing?: (path: string) => void) {
  const top = resolve(base)
  return Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(req, server) {
      if (req.headers.get('host') !== `127.0.0.1:${server.port}`) return new Response(null, { status: 403 })
      let path: string
      try {
        path = decodeURIComponent(new URL(req.url).pathname)
      } catch {
        return new Response(null, { status: 400 })
      }
      if (path === '/favicon.ico') return new Response(null, { status: 204 })
      const file = resolve(top, '.' + (path.endsWith('/') ? path + 'index.html' : path))
      if (!file.startsWith(top + sep)) return new Response(null, { status: 403 })
      if (isFile(file)) return new Response(Bun.file(file))
      missing?.(path)
      return new Response(null, { status: 404 })
    },
  })
}
