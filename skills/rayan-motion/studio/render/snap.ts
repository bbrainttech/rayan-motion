import { chrome, studio } from './chrome.ts'
import { chromium, type Page } from 'playwright-core'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const root = join(import.meta.dir, '..')
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex').slice(0, 16)
const fonts = join(root, 'brand', 'fonts')
const shared = new Map((existsSync(fonts) ? readdirSync(fonts) : []).map((f) => [sha(readFileSync(join(fonts, f))), `/brand/fonts/${f}`]))
const fetched = new Map<string, string>()

async function asset(url: string, dir: string, from: 'css' | 'html') {
  if (!/^https?:\/\//.test(url)) return url
  let path = fetched.get(url)
  if (!path) {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
    const h = sha(bytes)
    path = shared.get(h)
    if (!path) {
      const ext = extname(new URL(url).pathname) || '.bin'
      writeFileSync(join(dir, 'assets', h + ext), bytes)
      path = `assets/${h}${ext}`
    }
    fetched.set(url, path)
  }
  return path.startsWith('/') ? path : from === 'css' ? `../${path}` : path
}

async function urls(text: string, base: string, dir: string, from: 'css' | 'html') {
  let out = ''
  let last = 0
  for (const m of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g)) {
    const u = m[1] ?? m[2] ?? m[3]
    if (u.startsWith('data:') || u.startsWith('#')) continue
    out += text.slice(last, m.index) + `url("${await asset(new URL(u, base).href, dir, from)}")`
    last = m.index + m[0].length
  }
  return out + text.slice(last)
}

function serialize(strip: string[]) {
  const live = [...document.documentElement.querySelectorAll('*')]
  const hovered = new Set(document.querySelectorAll(':hover'))
  const visible = new Set(document.querySelectorAll(':focus-visible'))
  const clone = document.documentElement.cloneNode(true) as HTMLElement
  const copy = [...clone.querySelectorAll('*')]
  const images: string[] = []
  live.forEach((el, i) => {
    const c = copy[i] as HTMLElement
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') c.toggleAttribute('checked', el.checked)
      else c.setAttribute('value', el.value)
    } else if (el instanceof HTMLTextAreaElement) c.textContent = el.value
    else if (el instanceof HTMLSelectElement) [...(c as HTMLSelectElement).options].forEach((o, k) => o.toggleAttribute('selected', k === el.selectedIndex))
    else if (el instanceof HTMLImageElement) {
      c.removeAttribute('srcset')
      c.removeAttribute('sizes')
      c.removeAttribute('loading')
      c.setAttribute('src', el.currentSrc || el.src)
      images.push(el.currentSrc || el.src)
    } else if (el instanceof HTMLCanvasElement) {
      const img = document.createElement('img')
      img.src = el.toDataURL()
      img.setAttribute('style', el.getAttribute('style') ?? '')
      img.className = el.className
      img.width = el.clientWidth
      img.height = el.clientHeight
      c.replaceWith(img)
    }
    if (hovered.has(el)) c.setAttribute('data-x-hover', '')
    if (el === document.activeElement && el !== document.body) c.setAttribute('data-x-focus', '')
    if (visible.has(el)) c.setAttribute('data-x-focus-visible', '')
    if (el.matches(':popover-open')) c.setAttribute('data-x-popover-open', '')
    if (el.matches(':modal')) {
      c.removeAttribute('open')
      c.setAttribute('data-x-modal', '')
    }
  })
  clone.querySelectorAll(['noscript, link, style, template, source', ...strip].join(', ')).forEach((n) => n.remove())
  const inert = (n: ParentNode) => {
    n.querySelectorAll('script, iframe, object, embed, base').forEach((e) => e.remove())
    n.querySelectorAll('*').forEach((e) => [...e.attributes].forEach(({ name }) => name.startsWith('on') && name in e && e.removeAttribute(name)))
  }
  inert(clone)
  live.forEach((el, i) => {
    if (!el.shadowRoot) return
    const t = document.createElement('template')
    t.setAttribute('shadowrootmode', 'open')
    t.innerHTML = el.shadowRoot.innerHTML
    inert(t.content)
    copy[i].prepend(t)
  })
  clone.querySelector('head')!.innerHTML = ''
  const sheets = [...document.styleSheets].map((s) => (s.href ? { href: s.href } : { text: (s.ownerNode as HTMLElement).textContent ?? '' }))
  return { html: clone.outerHTML, sheets, images, url: location.href }
}

type Options = { theme?: 'light' | 'dark'; timezone?: string; locale?: string; init?: () => void; viewport?: { width: number; height: number }; scale?: number; mobile?: boolean }

export async function open({ theme = 'light', timezone = studio.timezone ?? 'UTC', locale = studio.locale ?? 'en-US', init, viewport = { width: 1280, height: 720 }, scale = 2, mobile = false }: Options = {}) {
  const browser = await chromium.launch({
    executablePath: chrome(),
    args: ['--force-color-profile=srgb'],
  })
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: theme, timezoneId: timezone, locale, ...(mobile ? { isMobile: true, hasTouch: true } : {}) })
  if (init) await context.addInitScript(init)
  return { browser, context }
}

export async function snap(page: Page, dir: string, name: string) {
  for (const d of ['css', 'assets']) mkdirSync(join(dir, d), { recursive: true })
  await page.screenshot({ path: join(dir, `${name}.png`) })
  const { html, sheets, url } = await page.evaluate(serialize, studio.strip ?? [])
  const links: string[] = []
  for (const s of sheets) {
    const raw = 'href' in s ? await (await fetch(s.href!)).text() : s.text!
    if (raw.includes("font-family:'__nextjs-")) continue
    const css = await urls(raw, 'href' in s ? s.href! : url, dir, 'css')
    const file = `css/${sha(css)}.css`
    writeFileSync(join(dir, file), css)
    links.push(`<link rel="stylesheet" href="${file}">`)
  }
  let body = await urls(html, url, dir, 'html')
  for (const [all, src] of body.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/g)) {
    if (src.startsWith('data:')) continue
    body = body.replace(all, all.replace(`src="${src}"`, `src="${await asset(new URL(src.replaceAll('&amp;', '&'), url).href, dir, 'html')}"`))
  }
  const head = `<head><meta charset="utf-8">${links.join('')}<style>*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style><script src="/engine/states.js"></script></head>`
  writeFileSync(join(dir, `${name}.html`), '<!DOCTYPE html>\n' + body.replace(/<head><\/head>/, head))
  console.log('snap', name)
}
