import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '../../render/chrome.ts'
import { open, snap } from '../../render/snap.ts'

const OUT = join(import.meta.dir, 'screens')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const app = join(import.meta.dir, '..', 'explainer', 'app')
const local = process.env.WEB ? null : serve(app)
const WEB = process.env.WEB ?? `http://127.0.0.1:${local!.port}`

rmSync(OUT, { recursive: true, force: true })
for (const [name, options] of [
  ['01-desktop', {}],
  ['02-phone', { viewport: { width: 390, height: 844 }, scale: 3, mobile: true }],
] as const) {
  const { browser, context } = await open(options)
  try {
    const page = await context.newPage()
    page.on('pageerror', (e) => console.log('pageerror', e.message))
    await page.goto(WEB, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'New task' }).click()
    await page.getByPlaceholder('Task name').fill('Write the launch post')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.mouse.move(600, 4)
    await wait(300)
    await snap(page, OUT, name)
  } finally {
    await browser.close()
  }
}
local?.stop()
