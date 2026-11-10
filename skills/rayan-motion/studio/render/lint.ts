import { chrome, serve, steady } from './chrome.ts'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

declare const STAGE: { format: string; safe: { top: number; right: number; bottom: number; left: number } }

const [id, ...extra] = process.argv.slice(2)
const option = (name: string) => (extra.includes(`--${name}`) ? extra[extra.indexOf(`--${name}`) + 1] : '')
const query = option('preset') ? `?preset=${option('preset')}` : option('size') ? `?size=${option('size')}` : ''
const root = join(import.meta.dir, '..')
if (!id || !existsSync(join(root, 'comps', id, 'index.html'))) {
  console.error('usage: bun lint.ts <id> [--preset vertical | --size 1200x630]')
  process.exit(1)
}

let failed = 0
let warned = 0
const pass = (name: string, detail: string) => console.log(`PASS  ${name.padEnd(12)} ${detail}`)
const fail = (name: string, detail: string) => (failed++, console.log(`FAIL  ${name.padEnd(12)} ${detail}`))
const warn = (name: string, detail: string) => (warned++, console.log(`WARN  ${name.padEnd(12)} ${detail}`))

const missing: string[] = []
const server = serve(root, (p) => missing.push(p))
const browser = await chromium.launch({ executablePath: chrome(), args: steady })
const errors: string[] = []
const load = async (viewport: { width: number; height: number }) => {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`http://127.0.0.1:${server.port}/comps/${id}/index.html${query}`)
  const stage: { width: number; height: number } = await page.evaluate(() => {
    const s = document.getElementById('stage')!
    return { width: s.offsetWidth, height: s.offsetHeight }
  })
  return { page, stage }
}
let { page, stage } = await load({ width: 1920, height: 1080 })
if (stage.width !== 1920 || stage.height !== 1080) {
  await page.close()
  errors.length = 0
  missing.length = 0
  ;({ page, stage } = await load(stage))
}
const duration: number = await page.evaluate(() => (window as any).ready)
const scenes: { start: number; end: number; label: string; enter: number }[] = await page.evaluate('SCENES.map((s) => ({ start: s.start, end: s.end, label: s.chapter, enter: s.enterDur }))')

errors.length ? fail('errors', errors.slice(0, 4).join(' | ')) : pass('errors', 'the page ran clean')
missing.length ? fail('files', `missing ${[...new Set(missing)].slice(0, 6).join(', ')}`) : pass('files', 'every file loaded')

const fonts: string[] = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family))
fonts.length ? fail('fonts', `failed to load: ${fonts.join(', ')}`) : pass('fonts', 'loaded')

const shot = async (t: number) => {
  await page.evaluate((t) => (window as any).render(t), t)
  return (await page.screenshot({ type: 'png' })).toString('base64')
}
const scratch = await browser.newPage()
const unlike = (a: string, b: string): Promise<number> =>
  scratch.evaluate(async ([a, b]) => {
    if (a === b) return 0
    const pixels = async (s: string) => {
      const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(s), (c) => c.charCodeAt(0))], { type: 'image/png' }))
      const g = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d')!
      g.drawImage(bmp, 0, 0)
      return g.getImageData(0, 0, bmp.width, bmp.height)
    }
    const [A, B] = await Promise.all([pixels(a), pixels(b)])
    const { width: w, height: h } = A
    const near = (p: Uint8ClampedArray, q: Uint8ClampedArray, x: number, y: number) => {
      const i = (y * w + x) * 4
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          const j = (yy * w + xx) * 4
          if (Math.abs(p[i] - q[j]) <= 24 && Math.abs(p[i + 1] - q[j + 1]) <= 24 && Math.abs(p[i + 2] - q[j + 2]) <= 24 && Math.abs(p[i + 3] - q[j + 3]) <= 24) return true
        }
      }
      return false
    }
    let bad = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2] && A.data[i + 3] === B.data[i + 3]) continue
        if (!near(A.data, B.data, x, y) || !near(B.data, A.data, x, y)) bad++
      }
    }
    return bad
  }, [a, b] as const)
const probes = duration > 0 ? [duration * 0.21, duration * 0.53, duration * 0.87] : [0]
const drift: string[] = []
for (const t of probes) {
  const first = await shot(t)
  await shot((t + duration * 0.4) % Math.max(duration, 0.001))
  const bad = await unlike(first, await shot(t))
  if (bad > 40) drift.push(`${t.toFixed(2)} s (${bad} pixels)`)
}
await scratch.close()
drift.length ? fail('determinism', `frames at ${drift.join(', ')} differ between two renders: something depends on the clock or on random numbers`) : pass('determinism', `${probes.length} frames render the same twice`)

const still = duration <= 0.01
type Finding = { kind: string; text: string }
const seen = new Set<string>()
for (const [i, s] of scenes.entries()) {
  const t = still ? 0 : Math.min(s.end - 0.05, s.start + Math.max(s.enter + 0.1, (s.end - s.start) * 0.7))
  await page.evaluate((t) => (window as any).render(t), t)
  const found: { findings: Finding[]; words: number } = await page.evaluate((still) => {
    const stage = document.getElementById('stage')!
    const frame = stage.getBoundingClientRect()
    const pen = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string) => {
      pen.clearRect(0, 0, 1, 1)
      pen.fillStyle = '#000'
      pen.fillStyle = css
      pen.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data
      return [r / 255, g / 255, b / 255, a / 255]
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const over = (top: number[], under: number[]) => top.slice(0, 3).map((c, k) => c * top[3] + under[k] * (1 - top[3]))
    const findings: { kind: string; text: string }[] = []
    const blocks = new Set<HTMLElement>()
    const S = STAGE
    const safe = { left: frame.left + S.safe.left, top: frame.top + S.safe.top, right: frame.right - S.safe.right, bottom: frame.bottom - S.safe.bottom }
    const roots = [...stage.querySelectorAll('.scene.on, #persist')]
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (el.closest('.win, svg, [data-lint-skip]')) continue
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(' ').trim()
        if (!own) continue
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
        let alpha = 1
        for (let e: HTMLElement | null = el; e && e !== stage; e = e.parentElement) alpha *= parseFloat(getComputedStyle(e).opacity)
        if (alpha < 0.5) continue
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        let block: HTMLElement = el
        while (block.parentElement && block !== root && /^inline/.test(getComputedStyle(block).display)) block = block.parentElement
        blocks.add(block)
        const label = (block.innerText || own).replace(/\s+/g, ' ').trim().slice(0, 40)
        if (!el.closest('[data-bleed]')) {
          if (r.left < frame.left - 1 || r.top < frame.top - 1 || r.right > frame.right + 1 || r.bottom > frame.bottom + 1) findings.push({ kind: 'cut off', text: label })
          else if (r.left < safe.left - 1 || r.top < safe.top - 1 || r.right > safe.right + 1 || r.bottom > safe.bottom + 1) findings.push({ kind: 'safe area', text: `${label} (outside the ${S.format} safe area)` })
        }
        const cs = getComputedStyle(el)
        const px = parseFloat(cs.fontSize)
        if (!still && px < 14 * (Math.min(frame.width, frame.height) / 1080)) findings.push({ kind: 'small text', text: `${label} (${px.toFixed(0)} px)` })
        let bg: number[] | null = null
        let unknown = false
        for (let e: HTMLElement | null = el; e; e = e.parentElement) {
          const b = getComputedStyle(e)
          if (b.backgroundImage !== 'none') { unknown = true; break }
          const c = rgba(b.backgroundColor)
          if (c[3] > 0.95) { bg = c; break }
          if (e === stage) break
        }
        if (!bg || unknown) continue
        const paint = rgba(cs.color)
        if (paint[3] < 0.1) continue
        const ink = over(paint, bg)
        const [hi, lo] = [lum(ink), lum(bg)].sort((a, b) => b - a)
        const ratio = (hi + 0.05) / (lo + 0.05)
        const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700)
        if (ratio < (large ? 3 : 4.5)) findings.push({ kind: 'contrast', text: `${label} (${ratio.toFixed(1)}:1)` })
      }
    }
    const outer = [...blocks].filter((b) => ![...blocks].some((o) => o !== b && o.contains(b)))
    const words = outer.reduce((n, b) => n + b.innerText.trim().split(/\s+/).filter(Boolean).length, 0)
    return { findings, words }
  }, still)
  const name = s.label || `scene ${i + 1}`
  for (const f of found.findings) {
    const key = `${f.kind}:${f.text}`
    if (seen.has(key)) continue
    seen.add(key)
    warn(f.kind, `${name}: ${f.text}`)
  }
  const seconds = s.end - s.start
  if (!still && found.words > seconds * 4 + 4) warn('reading time', `${name}: ${found.words} words on screen in ${seconds.toFixed(1)} s`)
}
if (!warned) pass('design', 'no text is cut off, outside the safe area, too small, low in contrast or too dense')

await browser.close()
server.stop()
console.log(failed ? `${failed} failed, ${warned} warnings` : warned ? `passed with ${warned} warnings: look at each one` : 'all clear')
process.exit(failed ? 1 : 0)
