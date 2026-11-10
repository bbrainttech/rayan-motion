import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const USAGE = `usage: bun device.ts <command>
  list                               booted iOS simulators and connected Android devices
  shot <comp> <name>                 screenshot and element list into comps/<comp>/screens/
  tree                               the elements on screen, with their boxes in points
  tap <x> <y>                        tap a point (points, as tree prints them)
  text <string>                      type into the focused field
  swipe <x1> <y1> <x2> <y2> [ms]
  key back|home|enter
  open <url>                         open a deep link or web address
  launch <app id>                    bundle id on iOS, package name on Android
  statusbar [clear]                  9:41, full battery, full signal
  appearance light|dark
Pick a device with DEVICE=<id|name|ios|android> when more than one is running.`

type Device = { platform: 'ios' | 'android'; id: string; name: string }
type Element = { text: string; label: string; id: string; type: string; x: number; y: number; w: number; h: number }

const root = join(import.meta.dir, '..')
const [command, ...args] = process.argv.slice(2)
const run = (bin: string, list: string[], binary = false) => spawnSync(bin, list, { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 256 * 1024 * 1024 })
const has = (bin: string) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin]).status === 0

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function devices() {
  const out: Device[] = []
  if (has('xcrun')) {
    const r = run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'])
    if (r.status === 0) {
      for (const list of Object.values(JSON.parse(r.stdout as string).devices) as { state: string; udid: string; name: string }[][]) {
        for (const d of list) if (d.state === 'Booted') out.push({ platform: 'ios', id: d.udid, name: d.name })
      }
    }
  }
  if (has('adb')) {
    for (const line of (run('adb', ['devices', '-l']).stdout as string).split('\n').slice(1)) {
      const m = line.match(/^(\S+)\s+device\b(.*)$/)
      if (m) out.push({ platform: 'android', id: m[1], name: m[2].match(/model:(\S+)/)?.[1] ?? m[1] })
    }
  }
  return out
}

function pick() {
  const all = devices()
  const want = process.env.DEVICE
  const found = want ? all.find((d) => d.id === want || d.name === want || d.platform === want) : all[0]
  if (!found) {
    fail(all.length ? `no running device matches DEVICE=${want}` : 'No device is running. Boot an iOS Simulator (open -a Simulator) or start an Android emulator, open the app, then run this again.')
  }
  return found
}

const adb = (d: Device, list: string[], binary = false) => run('adb', ['-s', d.id, ...list], binary)
const sim = (d: Device, list: string[]) => run('xcrun', ['simctl', ...list.map((a) => (a === '@') ? d.id : a)])

function idb(d: Device, list: string[]) {
  if (!has('idb')) {
    fail('The iOS Simulator has no built-in way to tap or type from a script. Install idb (brew install idb-companion, then pipx install fb-idb) or drive the flow with Maestro, or reach the screen with a deep link: bun device.ts open <url>.')
  }
  return run('idb', [...list, '--udid', d.id])
}

function density(d: Device) {
  const out = adb(d, ['shell', 'wm', 'density']).stdout as string
  const values = [...out.matchAll(/(\d+)/g)].map((m) => Number(m[1]))
  return (values[values.length - 1] ?? 160) / 160
}

function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function androidElements(d: Device, scale: number) {
  adb(d, ['shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml'])
  const xml = adb(d, ['exec-out', 'cat', '/sdcard/window_dump.xml']).stdout as string
  const out: Element[] = []
  for (const [node] of xml.matchAll(/<node [^>]*>/g)) {
    const attr = (name: string) => node.match(new RegExp(` ${name}="([^"]*)"`))?.[1] ?? ''
    const b = attr('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
    if (!b || !(attr('text') || attr('content-desc') || attr('clickable') === 'true')) continue
    const [x1, y1, x2, y2] = b.slice(1).map((v) => Number(v) / scale)
    out.push({ text: attr('text'), label: attr('content-desc'), id: attr('resource-id').split('/').pop() ?? '', type: attr('class').split('.').pop() ?? '', x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) })
  }
  return out
}

function iosElements(d: Device) {
  if (!has('idb')) return null
  const r = run('idb', ['ui', 'describe-all', '--udid', d.id, '--json'])
  if (r.status !== 0) return null
  const items = JSON.parse(r.stdout as string) as { AXLabel?: string; AXValue?: string; AXUniqueId?: string; type?: string; frame: { x: number; y: number; width: number; height: number } }[]
  return items.map((e) => ({ text: e.AXValue ?? '', label: e.AXLabel ?? '', id: e.AXUniqueId ?? '', type: e.type ?? '', x: Math.round(e.frame.x), y: Math.round(e.frame.y), w: Math.round(e.frame.width), h: Math.round(e.frame.height) }))
}

function screen(d: Device) {
  if (d.platform === 'android') {
    const png = adb(d, ['exec-out', 'screencap', '-p'], true).stdout as Buffer
    if (!png.length) fail('adb returned no screenshot')
    const scale = Number(process.env.SCALE ?? density(d))
    return { png, scale, elements: androidElements(d, scale) }
  }
  const file = join(process.env.TMPDIR ?? '/tmp', `device-${d.id}.png`)
  const r = sim(d, ['io', '@', 'screenshot', '--type=png', file])
  if (r.status !== 0) fail(`simctl could not take a screenshot: ${r.stderr}`)
  const png = readFileSync(file)
  const found = iosElements(d)
  const app = found?.find((e) => e.type === 'Application')
  const guess = /iPad|SE/.test(d.name) ? 2 : 3
  const scale = Number(process.env.SCALE ?? (app?.w ? Math.round(pngSize(png).width / app.w) : guess))
  return { png, scale, elements: found ?? [] }
}

function print(elements: Element[]) {
  for (const e of elements) {
    const name = [e.text, e.label].filter(Boolean).join(' / ') || `(${e.id || e.type})`
    console.log(`[${e.x}, ${e.y}, ${e.w}, ${e.h}]  ${e.type}  ${name.slice(0, 80)}`)
  }
}

if (command === 'list') {
  const all = devices()
  if (!all.length) console.log('No device is running.')
  for (const d of all) console.log(`${d.platform}  ${d.name}  ${d.id}`)
  console.log(`tools: xcrun ${has('xcrun') ? 'yes' : 'no'}, adb ${has('adb') ? 'yes' : 'no'}, idb ${has('idb') ? 'yes' : 'no'}, maestro ${has('maestro') ? 'yes' : 'no'}`)
} else if (command === 'shot') {
  const [comp, name] = args
  if (!comp || !name) fail(USAGE)
  const d = pick()
  const { png, scale, elements } = screen(d)
  const dir = join(root, 'comps', comp, 'screens')
  mkdirSync(dir, { recursive: true })
  const { width, height } = pngSize(png)
  writeFileSync(join(dir, `${name}.png`), png)
  writeFileSync(join(dir, `${name}.json`), JSON.stringify({ platform: d.platform, device: d.name, width: Math.round(width / scale), height: Math.round(height / scale), scale, elements }, null, 1))
  console.log(`${name}.png  ${width}×${height} px, ${Math.round(width / scale)}×${Math.round(height / scale)} points at ${scale}x, ${elements.length} elements`)
  if (d.platform === 'ios' && !elements.length) console.log('No element list: install idb to get one. Positions then come from reading the screenshot.')
} else if (command === 'tree') {
  const d = pick()
  const { elements } = screen(d)
  if (!elements.length) console.log('No element list on this device. Read a screenshot instead: bun device.ts shot <comp> <name>.')
  print(elements)
} else if (command === 'tap') {
  const d = pick()
  const [x, y] = args.map(Number)
  if (d.platform === 'android') {
    const s = density(d)
    adb(d, ['shell', 'input', 'tap', String(Math.round(x * s)), String(Math.round(y * s))])
  } else idb(d, ['ui', 'tap', String(x), String(y)])
} else if (command === 'text') {
  const d = pick()
  const value = args.join(' ')
  if (d.platform === 'android') adb(d, ['shell', 'input', 'text', value.replace(/ /g, '%s').replace(/(['"&|;<>()$`\\])/g, '\\$1')])
  else idb(d, ['ui', 'text', value])
} else if (command === 'swipe') {
  const d = pick()
  const [x1, y1, x2, y2, ms = 300] = args.map(Number)
  if (d.platform === 'android') {
    const s = density(d)
    adb(d, ['shell', 'input', 'swipe', ...[x1, y1, x2, y2].map((v) => String(Math.round(v * s))), String(ms)])
  } else idb(d, ['ui', 'swipe', String(x1), String(y1), String(x2), String(y2), '--duration', String(ms / 1000)])
} else if (command === 'key') {
  const d = pick()
  const codes: Record<string, string> = { back: '4', home: '3', enter: '66' }
  if (!codes[args[0]]) fail(USAGE)
  if (d.platform === 'android') adb(d, ['shell', 'input', 'keyevent', codes[args[0]]])
  else if (args[0] === 'home') idb(d, ['ui', 'button', 'HOME'])
  else if (args[0] === 'enter') idb(d, ['ui', 'key', '40'])
  else fail('iOS has no back key. Tap the back button on screen.')
} else if (command === 'open') {
  const d = pick()
  if (d.platform === 'android') adb(d, ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', args[0]])
  else sim(d, ['openurl', '@', args[0]])
} else if (command === 'launch') {
  const d = pick()
  if (d.platform === 'android') adb(d, ['shell', 'monkey', '-p', args[0], '-c', 'android.intent.category.LAUNCHER', '1'])
  else sim(d, ['launch', '@', args[0]])
} else if (command === 'statusbar') {
  const d = pick()
  const clear = args[0] === 'clear'
  if (d.platform === 'ios') {
    sim(d, clear ? ['status_bar', '@', 'clear'] : ['status_bar', '@', 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--cellularMode', 'active', '--cellularBars', '4', '--batteryState', 'charged', '--batteryLevel', '100'])
  } else {
    const demo = (list: string[]) => adb(d, ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', ...list])
    if (clear) demo(['-e', 'command', 'exit'])
    else {
      adb(d, ['shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1'])
      demo(['-e', 'command', 'enter'])
      demo(['-e', 'command', 'clock', '-e', 'hhmm', '0941'])
      demo(['-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false'])
      demo(['-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4'])
      demo(['-e', 'command', 'notifications', '-e', 'visible', 'false'])
    }
  }
  console.log(clear ? 'status bar restored' : 'status bar set to 9:41, full battery, full signal')
} else if (command === 'appearance') {
  const d = pick()
  if (args[0] !== 'light' && args[0] !== 'dark') fail(USAGE)
  if (d.platform === 'ios') sim(d, ['ui', '@', 'appearance', args[0]])
  else adb(d, ['shell', 'cmd', 'uimode', 'night', args[0] === 'dark' ? 'yes' : 'no'])
} else {
  console.log(USAGE)
  if (command) process.exitCode = 1
}
