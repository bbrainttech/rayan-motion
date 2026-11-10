import { chrome, serve, steady, studio } from './chrome.ts'
import { chromium, type Page } from 'playwright-core'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const USAGE = `usage: bun render.ts <mode> <id> [...]   every mode also takes --preset <name> or --size WxH
  video <id> [--draft] [--alpha [--webm]] [--blur 4] [--fps 30] [--scale 0.5] [--from 2 --to 6]
  still <id> [--at 1.5] [--scale 2] [--format png|jpg] [--alpha] [--guides] [--out file]
  set <id>                      every size in comps/<id>/sizes.json, into comps/<id>/out/
  frames <id> <dir> [--fps 30] [--from 2 --to 6] [--alpha]
  stills <id> <dir> <t ...>     a PNG of each moment
  sheet <id> <t ...> [--guides] contact sheets in comps/<id>/stills/
  pairs <id> <dir> <t ...>      each app window above its real screenshot
  poster <id>                   comps/<id>/<id>.jpg at the poster time
  gif <id> [--width 720] [--fps 20] [--from 2 --to 6]
  loop <id> [--width 1280]      muted, web-ready <id>-loop.mp4 and .webm`

const VALUED = new Set(['scale', 'fps', 'blur', 'from', 'to', 'size', 'preset', 'format', 'out', 'width', 'at'])
const flags: Record<string, string | true> = {}
const args: string[] = []
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) args.push(a)
  else if (VALUED.has(a.slice(2))) flags[a.slice(2)] = argv[++i]
  else flags[a.slice(2)] = true
}
const [mode, id, ...rest] = args
const num = (key: string, fallback: number) => (flags[key] === undefined ? fallback : Number(flags[key]))
const variant = (flags.preset ?? flags.size) as string | undefined
const suffix = variant ? `-${variant}` : ''

const root = join(import.meta.dir, '..')
const comp = join(root, 'comps', id ?? '')
if (!mode || !id || !existsSync(join(comp, 'index.html'))) {
  console.error(id ? `no comps/${id}/index.html\n${USAGE}` : USAGE)
  process.exit(1)
}

function ffmpeg(list: string[]) {
  const run = spawnSync('ffmpeg', ['-nostdin', '-y', '-v', 'error', ...list], { stdio: 'inherit' })
  if (run.status !== 0) {
    console.error('ffmpeg failed')
    process.exit(1)
  }
}

function source() {
  const found = [join(comp, `${id}${suffix}.mp4`), join(comp, 'build', `video-silent${suffix}.mp4`), join(comp, 'build', `draft${suffix}.mp4`)].find((f) => existsSync(f))
  if (!found) {
    console.error(`render comps/${id} first: bun render.ts video ${id}${variant ? ` --preset ${variant}` : ''}`)
    process.exit(1)
  }
  return found
}

function range() {
  return [...(flags.from ? ['-ss', String(flags.from)] : []), ...(flags.to ? ['-to', String(flags.to)] : [])]
}

function report(path: string) {
  console.log(`${path}  ${(statSync(path).size / 1024).toFixed(0)} KB`)
}

if (mode === 'gif') {
  const out = join(comp, `${id}${suffix}.gif`)
  const chain = `fps=${num('fps', 20)},scale=${num('width', 720)}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
  ffmpeg([...range(), '-i', source(), '-filter_complex', chain, '-loop', '0', out])
  report(out)
  process.exit(0)
}

if (mode === 'loop') {
  const scale = `scale=${num('width', 1280)}:-2:flags=lanczos`
  const mp4 = join(comp, `${id}${suffix}-loop.mp4`)
  ffmpeg([...range(), '-i', source(), '-an', '-vf', `${scale},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', mp4])
  report(mp4)
  const encoders = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout
  if (encoders.includes('libvpx-vp9')) {
    const webm = join(comp, `${id}${suffix}-loop.webm`)
    ffmpeg([...range(), '-i', source(), '-an', '-vf', scale, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', webm])
    report(webm)
  } else console.log('this ffmpeg has no libvpx-vp9, so no .webm was written')
  process.exit(0)
}

const server = serve(root, (p) => console.error('missing', p))

const browser = await chromium.launch({
  executablePath: chrome(),
  args: steady,
})
let problems = 0

type View = { size?: string; preset?: string; alpha?: boolean; scale?: number }

async function open({ size = flags.size as string | undefined, preset = flags.preset as string | undefined, alpha = false, scale = 1 }: View = {}) {
  const query = [preset ? `preset=${preset}` : size ? `size=${size}` : '', alpha ? 'alpha=1' : '', flags.guides ? 'guides=1' : ''].filter(Boolean).join('&')
  const address = `http://127.0.0.1:${server.port}/comps/${id}/index.html${query ? `?${query}` : ''}`
  const load = async (viewport: { width: number; height: number }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale })
    const page = await context.newPage()
    page.on('pageerror', (e) => (problems++, console.error('pageerror', e.message)))
    page.on('console', (m) => m.type() === 'error' && (problems++, console.error('console', m.text())))
    await page.goto(address)
    const stage: { width: number; height: number } = await page.evaluate(() => {
      const s = document.getElementById('stage')!
      return { width: s.offsetWidth, height: s.offsetHeight }
    })
    return { page, stage }
  }
  let { page, stage } = await load({ width: 1920, height: 1080 })
  if (stage.width !== 1920 || stage.height !== 1080) {
    await page.context().close()
    ;({ page, stage } = await load(stage))
  }
  const duration: number = await page.evaluate(() => (window as any).ready)
  const info: { cuts: number[]; poster: number; fps: number } = await page.evaluate(() => ({ cuts: (window as any).CUTS, poster: (window as any).POSTER, fps: (window as any).FPS }))
  return { page, stage, duration, ...info }
}

async function shoot(page: Page, t: number, path?: string, type: 'png' | 'jpeg' = 'png', alpha = false) {
  await page.evaluate((t) => (window as any).render(t), t)
  return page.screenshot({ path, type, omitBackground: alpha, ...(type === 'jpeg' ? { quality: 92 } : {}) })
}

const alpha = flags.alpha === true
const scale = num('scale', flags.draft ? 0.5 : 1)

if (mode === 'set') {
  const list: { name: string; size?: [number, number]; preset?: string; scale?: number; format?: 'png' | 'jpg'; at?: number }[] = JSON.parse(readFileSync(join(comp, 'sizes.json'), 'utf8'))
  mkdirSync(join(comp, 'out'), { recursive: true })
  for (const item of list) {
    const view = await open({ size: item.size?.join('x'), preset: item.preset, scale: item.scale ?? 1 })
    const out = join(comp, 'out', `${item.name}.${item.format ?? 'png'}`)
    await shoot(view.page, item.at ?? view.poster, out, item.format === 'jpg' ? 'jpeg' : 'png')
    console.log(`${view.stage.width}×${view.stage.height}${item.scale && item.scale !== 1 ? ` @${item.scale}x` : ''}`)
    report(out)
    await view.page.context().close()
  }
} else if (mode === 'still') {
  const view = await open({ alpha, scale })
  const format = flags.format === 'jpg' ? 'jpg' : 'png'
  const out = (flags.out as string) ?? join(comp, `${id}${suffix}.${format}`)
  await shoot(view.page, num('at', view.poster), out, format === 'jpg' ? 'jpeg' : 'png', alpha)
  console.log(`${view.stage.width}×${view.stage.height}${scale !== 1 ? ` @${scale}x` : ''}`)
  report(out)
} else {
  const view = await open({ alpha, scale })
  const { page, stage, duration, cuts } = view
  console.log('frame', `${stage.width}×${stage.height}`, 'duration', duration, 'cuts', cuts.join(' '))

  const score = join(comp, 'score.json')
  if (existsSync(score)) {
    const s = JSON.parse(readFileSync(score, 'utf8'))
    const same = Math.abs(s.duration - duration) < 1e-3 && s.cuts.length === cuts.length && s.cuts.every((c: number, i: number) => Math.abs(c - cuts[i]) < 1e-3)
    if (!same) console.error(`score.json does not match the scenes: duration ${s.duration}, cuts ${s.cuts.join(' ')}. Run make.py.`)
  }

  if (mode === 'stills') {
    const [out, ...times] = rest
    mkdirSync(out, { recursive: true })
    for (const t of times.map(Number)) await shoot(page, t, join(out, `t_${t.toFixed(2)}.png`))
  } else if (mode === 'sheet') {
    const out = join(comp, `stills${suffix}`)
    rmSync(out, { recursive: true, force: true })
    mkdirSync(out, { recursive: true })
    const times = rest.map(Number)
    for (const [i, t] of times.entries()) await shoot(page, t, join(out, `s_${String(i).padStart(2, '0')}.png`))
    const tall = stage.height > stage.width
    ffmpeg(['-framerate', '1', '-i', join(out, 's_%02d.png'), '-vf', `scale=${tall ? 480 : 960}:-2,tile=${tall ? '4x1' : '2x2'}`, join(out, 'sheet-%d.png')])
    console.log(times.map((t, i) => `s_${String(i).padStart(2, '0')} ${t}`).join('\n'))
  } else if (mode === 'pairs') {
    const [out, ...times] = rest
    mkdirSync(out, { recursive: true })
    for (const t of times.map(Number)) {
      const still = join(out, `t_${t.toFixed(2)}.png`)
      await shoot(page, t, still)
      const wins: { id: string; key: string; size: number[]; box: number[]; page: number[] }[] = await page.evaluate(`typeof WINDOWS === 'undefined' ? [] : WINDOWS.flatMap((w) => {
        const r = w.el.getBoundingClientRect()
        const key = shotAt(w, ${t})
        if (!key || !w.el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || r.width < 1) return []
        const m = new DOMMatrix(getComputedStyle(w.stage).transform)
        return [{ id: w.id, key: key.split('#')[0].replace(/\\.(png|jpe?g|webp)$/, ''), size: [w.page.w, w.page.h], box: [r.left, r.top, r.width, r.height].map(Math.round), page: [-m.e / m.a, -m.f / m.d, w.box.w / m.a, w.box.h / m.d] }]
      })`)
      for (const w of wins) {
        const [x, y, bw, bh] = w.box
        const [px, py, pw, ph] = w.page
        const [sw, sh] = w.size
        const cw = Math.min(bw, stage.width - x)
        const ch = Math.min(bh, stage.height - y)
        const pair = join(out, `t_${t.toFixed(2)}-${w.id}-${w.key}.png`)
        ffmpeg(['-i', still, '-i', join(comp, 'screens', `${w.key}.png`), '-filter_complex', `[0]crop=${cw}:${ch}:${x}:${y}[a];[1]crop=iw*${(pw / sw).toFixed(5)}:ih*${(ph / sh).toFixed(5)}:iw*${(px / sw).toFixed(5)}:ih*${(py / sh).toFixed(5)},scale=${cw}:${ch}:flags=lanczos[b];[a][b]vstack`, pair])
        console.log('pair', pair)
      }
    }
  } else if (mode === 'poster') {
    await shoot(page, view.poster, join(comp, `${id}${suffix}.jpg`), 'jpeg')
    console.log('poster at', view.poster)
  } else if (mode === 'frames' || mode === 'video') {
    const fps = num('fps', flags.draft ? 30 : view.fps ?? studio.fps ?? 60)
    const blur = Math.max(1, Math.round(num('blur', 1)))
    const from = num('from', 0)
    const to = Math.min(duration, num('to', duration))
    const total = Math.round((to - from) * fps) * blur
    const partial = from > 0 || to < duration
    mkdirSync(join(comp, 'build'), { recursive: true })

    if (mode === 'frames') {
      const [out] = rest
      if (!out) throw new Error('frames needs a folder')
      mkdirSync(out, { recursive: true })
      for (let f = 0; f < total; f++) await shoot(page, from + f / fps, join(out, `f_${String(f).padStart(5, '0')}.png`), 'png', alpha)
      console.log(`${total} frames in ${out} at ${fps} fps`)
    } else {
      const out = alpha ? join(comp, `${id}${suffix}-alpha.mov`) : join(comp, 'build', `${partial ? 'range' : flags.draft ? 'draft' : 'video-silent'}${suffix}.mp4`)
      const filters = [...(blur > 1 ? [`tmix=frames=${blur}`, `fps=${fps}`] : [])]
      const codec = alpha
        ? ['-vf', [...filters, 'format=yuva444p10le'].join(','), '-c:v', 'prores_ks', '-profile:v', '4444', '-vendor', 'apl0']
        : ['-vf', [...filters, 'pad=ceil(iw/2)*2:ceil(ih/2)*2', 'scale=out_color_matrix=bt709:out_range=tv', 'format=yuv420p'].join(','),
            '-c:v', 'libx264', '-preset', flags.draft ? 'veryfast' : 'slow', '-crf', flags.draft ? '20' : '14', '-tune', 'animation',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart']
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps * blur), '-c:v', 'png', '-i', '-', ...codec, out], { stdio: ['pipe', 'inherit', 'inherit'] })
      const started = Date.now()
      for (let f = 0; f < total; f++) {
        const buf = await shoot(page, from + f / (fps * blur), undefined, 'png', alpha)
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        if (f % (240 * blur) === 0) console.log(`frame ${f / blur}/${total / blur} ${((Date.now() - started) / 1000).toFixed(0)}s`)
      }
      ff.stdin.end()
      const code: number = await new Promise((r) => ff.on('close', r))
      if (code !== 0) throw new Error('ffmpeg failed')
      console.log(`${fps} fps${blur > 1 ? `, motion blur ×${blur}` : ''}${scale !== 1 ? `, scale ${scale}` : ''}`)
      report(out)
      if (alpha && flags.webm) {
        const webm = join(comp, `${id}${suffix}-alpha.webm`)
        ffmpeg(['-i', out, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', '-row-mt', '1', webm])
        report(webm)
      }
    }
  } else {
    console.error(`unknown mode ${mode}\n${USAGE}`)
    problems++
  }
}

await browser.close()
server.stop()
if (problems) {
  console.error(`${problems} page error${problems === 1 ? '' : 's'}: fix them before trusting this output`)
  process.exitCode = 1
}
