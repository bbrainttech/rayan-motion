import { chrome, serve } from './chrome.ts'
import { chromium } from 'playwright-core'
import { join } from 'node:path'

const [, , id, ...pairs] = process.argv
const root = join(import.meta.dir, '..')
const [vw, vh] = (process.env.VIEWPORT ?? '1280x720').split('x').map(Number)
const viewport = { width: vw, height: vh }
const server = serve(root)
const browser = await chromium.launch({ executablePath: chrome() })
const page = await browser.newPage({ viewport })
for (const pair of pairs) {
  const [shot, sel] = pair.split('|')
  await page.goto(`http://127.0.0.1:${server.port}/comps/${id}/screens/${shot}.html`)
  const boxes = await page.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.textContent ?? '').trim().slice(0, 40)}"` }), sel)
  console.log(shot, sel, '\n  ' + boxes.join('\n  '))
}
await browser.close()
server.stop()
