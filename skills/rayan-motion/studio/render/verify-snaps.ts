import { chrome, serve } from './chrome.ts'
import { chromium } from 'playwright-core'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , id, out] = process.argv
const root = join(import.meta.dir, '..')
const [vw, vh] = (process.env.VIEWPORT ?? '1280x720').split('x').map(Number)
const viewport = { width: vw, height: vh }
const dir = join(root, 'comps', id, 'screens')
const server = serve(root)
const browser = await chromium.launch({ executablePath: chrome(), args: ['--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
page.on('response', (r) => r.status() >= 400 && console.error('missing', r.url()))
for (const f of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  await page.goto(`http://127.0.0.1:${server.port}/comps/${id}/screens/${f}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(out, f.replace('.html', '.png')) })
}
await browser.close()
server.stop()
