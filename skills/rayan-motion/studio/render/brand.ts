import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const USAGE = `usage: bun brand.ts <command>
  tokens <colour> [--accent <colour>]                 write brand/tokens.css and brand/tokens.json from one brand colour
  contrast <text colour> <background colour>          the WCAG contrast ratio and what it passes
  show                                                the current palette`

type RGB = [number, number, number]
type LCH = { l: number; c: number; h: number }

const root = join(import.meta.dir, '..')
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LIGHT = [0.97, 0.94, 0.86, 0.78, 0.7, 0.64, 0.56, 0.48, 0.42, 0.32, 0.24]
const CHROMA = [0.016, 0.028, 0.07, 0.116, 0.18, 0.2, 0.24, 0.22, 0.18, 0.14, 0.09].map((c) => c / 0.24)
function parse(input: string): RGB {
  const hex = input.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`"${input}" is not a hex colour like #5b3df5`)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as RGB
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

function toLch(rgb: RGB): LCH {
  const [r, g, b] = rgb.map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 }
}

function toLinearRgb({ l, c, h }: LCH): RGB {
  const a = c * Math.cos(h * Math.PI / 180)
  const b = c * Math.sin(h * Math.PI / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_]
}

function fit(colour: LCH): LCH {
  const inside = (c: number) => toLinearRgb({ ...colour, c }).every((v) => v >= -0.0005 && v <= 1.0005)
  if (inside(colour.c)) return colour
  let lo = 0
  let hi = colour.c
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inside(mid)) lo = mid
    else hi = mid
  }
  return { ...colour, c: lo }
}

const toRgb = (colour: LCH) => toLinearRgb(fit(colour)).map((v) => Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v)))))) as RGB
const toHex = (rgb: RGB) => '#' + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
const css = (colour: LCH) => {
  const f = fit(colour)
  return `oklch(${+f.l.toFixed(4)} ${+f.c.toFixed(4)} ${+f.h.toFixed(1)})`
}
const luminance = (rgb: RGB) => {
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const verdict = (ratio: number) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA for large text only' : 'fails')

const argv = process.argv.slice(2)
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? undefined : argv.splice(i, 2)[1]
}
const accentArg = flag('accent')
const [command, ...args] = argv
const WHITE: RGB = [1, 1, 1]
const DARK: RGB = [0.035, 0.035, 0.043]

try {
  if (command === 'contrast') {
    const ratio = contrast(parse(args[0]), parse(args[1]))
    console.log(`${ratio.toFixed(2)}:1  ${verdict(ratio)}`)
  } else if (command === 'tokens') {
    const brandRgb = parse(args[0])
    const base = toLch(brandRgb)
    const scale = STEPS.map((step, i) => {
      const colour = fit({ l: LIGHT[i], c: base.c * CHROMA[i], h: base.h })
      const rgb = toRgb(colour)
      return { step, css: css(colour), hex: toHex(rgb), onWhite: +contrast(rgb, WHITE).toFixed(2), onDark: +contrast(rgb, DARK).toFixed(2) }
    })
    const at = (step: number) => scale.find((s) => s.step === step)!
    const exact = { css: toHex(brandRgb), hex: toHex(brandRgb) }
    const light = contrast(brandRgb, WHITE) >= 4.5 ? exact : scale.find((s) => s.step >= 500 && s.onWhite >= 4.5) ?? at(950)
    const dark = contrast(brandRgb, DARK) >= 4.5 ? exact : [...scale].reverse().find((s) => s.step <= 500 && s.onDark >= 4.5) ?? at(200)
    const accent = accentArg ? toLch(parse(accentArg)) : fit({ l: 0.666, c: 0.179, h: (base.h + 160) % 360 })
    const lines = [
      ':root {',
      `  --brand: ${toHex(brandRgb)};`,
      `  --brand-hue: ${+base.h.toFixed(1)};`,
      ...scale.map((s) => `  --brand-${s.step}: ${s.css};`),
      `  --primary: ${light.css};`,
      `  --primary-foreground: ${at(50).css};`,
      `  --chart-1: ${at(300).css};`,
      `  --chart-2: ${at(500).css};`,
      `  --chart-3: ${at(600).css};`,
      `  --chart-4: ${at(500).css};`,
      `  --chart-5: ${at(800).css};`,
      `  --chart-contrast: ${css(accent)};`,
      '}',
      '.dark {',
      `  --primary: ${dark.css};`,
      '}',
      '',
    ]
    writeFileSync(join(root, 'brand', 'tokens.css'), lines.join('\n'))
    writeFileSync(join(root, 'brand', 'tokens.json'), JSON.stringify({
      brand: toHex(brandRgb), hue: +base.h.toFixed(1), chroma: +base.c.toFixed(4), lightness: +base.l.toFixed(4),
      primary: light.hex, primaryOnDark: dark.hex, accent: toHex(toRgb(accent)), scale,
    }, null, 1))
    console.log(`brand ${toHex(brandRgb)}  hue ${base.h.toFixed(1)}  chroma ${base.c.toFixed(3)}`)
    for (const s of scale) console.log(`  ${String(s.step).padStart(3)}  ${s.hex}  on white ${s.onWhite.toFixed(2)}  on dark ${s.onDark.toFixed(2)}`)
    console.log(`primary on light ${light.hex}, primary on dark ${dark.hex}, chart accent ${toHex(toRgb(accent))}`)
    console.log('wrote brand/tokens.css and brand/tokens.json')
  } else if (command === 'show') {
    const file = join(root, 'brand', 'tokens.json')
    if (!existsSync(file)) throw new Error('no brand/tokens.json yet: run bun brand.ts tokens <colour>')
    const t = JSON.parse(readFileSync(file, 'utf8'))
    console.log(`brand ${t.brand}  primary on light ${t.primary}  on dark ${t.primaryOnDark}  chart accent ${t.accent}`)
    for (const s of t.scale) console.log(`  ${String(s.step).padStart(3)}  ${s.hex}  on white ${s.onWhite}`)
  } else {
    console.log(USAGE)
    if (command) process.exitCode = 1
  }
} catch (e) {
  console.error((e as Error).message)
  process.exitCode = 1
}
