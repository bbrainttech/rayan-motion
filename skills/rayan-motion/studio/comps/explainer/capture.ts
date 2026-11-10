import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '../../render/chrome.ts'
import { open, snap } from '../../render/snap.ts'

const OUT = join(import.meta.dir, 'screens')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const local = process.env.WEB ? null : serve(join(import.meta.dir, 'app'))
const WEB = process.env.WEB ?? `http://127.0.0.1:${local!.port}`

const { browser, context } = await open()
try {
  rmSync(OUT, { recursive: true, force: true })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  const shot = (name: string) => snap(page, OUT, name)
  const away = () => page.mouse.move(700, 4)

  await page.goto(WEB, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Tasks' }).waitFor()
  await away()
  await wait(300)
  await shot('01-tasks')

  const create = page.getByRole('button', { name: 'New task' })
  await create.hover()
  await wait(300)
  await shot('02-new-hover')

  await create.click()
  await away()
  await wait(300)
  await shot('03-form')

  await page.getByPlaceholder('Task name').fill('Write the launch post')
  const add = page.getByRole('button', { name: 'Add', exact: true })
  await add.hover()
  await wait(300)
  await shot('04-add-hover')

  await add.click()
  await away()
  await wait(300)
  await shot('05-added')
} finally {
  await browser.close()
  local?.stop()
}
