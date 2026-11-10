function inline(url) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, false)
  xhr.send()
  if (xhr.status >= 400) throw new Error(`cannot read ${url}`)
  return xhr.responseText
}

const STUDIO = JSON.parse(inline('/studio.json'))
const FORMATS = JSON.parse(inline('/presets.json'))
const BRAND = STUDIO.brand
const QUERY = new URLSearchParams(location.search)
const STAGE = { w: 1920, h: 1080, format: 'landscape', safe: { top: 54, right: 96, bottom: 54, left: 96 }, tall: false, locked: false }
let FPS = STUDIO.fps ?? 60

function frame(w, h) {
  if (STAGE.locked) return STAGE
  let name = typeof w === 'string' ? w : Object.keys(FORMATS).find((k) => FORMATS[k].size[0] === w && FORMATS[k].size[1] === h)
  if (typeof w === 'string' && !FORMATS[w]) throw new Error(`no format named ${w} in presets.json`)
  if (name) [w, h] = FORMATS[name].size
  const [top, right, bottom, left] = (name && FORMATS[name].safe) || [0.05, 0.05, 0.05, 0.05]
  Object.assign(STAGE, { w, h, format: name ?? `${w}x${h}`, tall: h > w, safe: { top: Math.round(h * top), right: Math.round(w * right), bottom: Math.round(h * bottom), left: Math.round(w * left) } })
  const css = document.documentElement.style
  css.setProperty('--w', `${w}px`)
  css.setProperty('--h', `${h}px`)
  for (const side of ['top', 'right', 'bottom', 'left']) css.setProperty(`--safe-${side}`, `${STAGE.safe[side]}px`)
  return STAGE
}
frame('landscape')
if (QUERY.get('preset') || QUERY.get('size')) {
  if (QUERY.get('preset')) frame(QUERY.get('preset'))
  else frame(...QUERY.get('size').split('x').map(Number))
  STAGE.locked = true
}
if (QUERY.has('alpha')) document.documentElement.dataset.alpha = ''

const EASE = {
  std: 'cubic-bezier(0.16, 1, 0.3, 1)',
  quint: 'cubic-bezier(0.22, 1, 0.36, 1)',
  over: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  emph: 'cubic-bezier(0.85, 0, 0.15, 1)',
  spring: 'linear(0, 0.059, 0.194, 0.359, 0.524, 0.672, 0.793, 0.886, 0.952, 0.996, 1.022, 1.035, 1.038, 1.036, 1.031, 1.025, 1.019, 1.013, 1.008, 1.005, 1.002, 1, 0.999, 0.999, 1)',
  io: 'cubic-bezier(0.42, 0, 0.58, 1)',
  in: 'cubic-bezier(0.55, 0, 1, 0.45)',
  out: 'cubic-bezier(0, 0.55, 0.45, 1)',
  lin: 'linear',
}
const KF = {
  up: [{ transform: 'translateY(110%)' }, { transform: 'none' }],
  down: [{ transform: 'translateY(-110%)' }, { transform: 'none' }],
  rise: [{ opacity: 0, transform: 'translateY(32px)' }, { opacity: 1, transform: 'none' }],
  rises: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
  drop: [{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }],
  slide: [{ opacity: 0, transform: 'translateX(64px)' }, { opacity: 1, transform: 'none' }],
  left: [{ opacity: 0, transform: 'translateX(-64px)' }, { opacity: 1, transform: 'none' }],
  right: [{ opacity: 0, transform: 'translateX(64px)' }, { opacity: 1, transform: 'none' }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  blur: [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
  blurd: [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(-20px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
  bloom: [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none', offset: 0.35 }, { opacity: 0, transform: 'scale(1.15)' }],
  pop: [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }],
  popl: [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'none' }],
  flip: [{ opacity: 0, transform: 'perspective(900px) rotateX(-80deg)' }, { opacity: 1, transform: 'perspective(900px) rotateX(0deg)' }],
  zoom: [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(60px) scale(0.97)' }, { opacity: 1, filter: 'blur(0px)', offset: 0.4 }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
  gx: [{ transform: 'scaleX(0)' }, { transform: 'none' }],
  gy: [{ transform: 'scaleY(0)' }, { transform: 'none' }],
  wipe: [{ clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)' }],
  wiped: [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  draw: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
  ring: [{ strokeDashoffset: 1 }, { strokeDashoffset: 'var(--to, 0)' }],
  stamp: [{ opacity: 0, transform: 'rotate(-4deg) scale(1.7)' }, { opacity: 1, transform: 'rotate(-4deg) scale(1)' }],
  slam: [{ opacity: 0, filter: 'blur(14px)', transform: 'scale(1.32)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
  tiltin: [{ opacity: 0, transform: 'perspective(1800px) translateY(140px) rotateX(30deg) scale(0.9)' }, { opacity: 1, offset: 0.35 }, { opacity: 1, transform: 'perspective(1800px) translateY(0) rotateX(0deg) scale(1)' }],
  out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }],
  outf: [{ opacity: 1 }, { opacity: 0 }],
  outs: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }],
  outb: [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(14px)' }],
  dim: [{ opacity: 0 }, { opacity: 1 }],
  on: [{ opacity: 0 }, { opacity: 1 }],
}
const DEF = {
  up: [0.62, 'std'], down: [0.62, 'std'], rise: [0.6, 'std'], rises: [0.45, 'std'], drop: [0.5, 'std'], slide: [0.55, 'spring'],
  left: [0.55, 'std'], right: [0.55, 'std'], fade: [0.35, 'quint'], blur: [0.6, 'std'], blurd: [0.6, 'std'], bloom: [1.3, 'quint'],
  pop: [0.5, 'over'], popl: [0.55, 'over'], flip: [0.6, 'over'], zoom: [0.9, 'std'], gx: [0.7, 'std'], gy: [0.6, 'std'],
  wipe: [0.9, 'std'], wiped: [0.6, 'std'], draw: [1, 'io'], ring: [1.1, 'std'], stamp: [0.45, 'over'], slam: [0.42, 'std'], tiltin: [1.3, 'std'], out: [0.22, 'in'],
  outf: [0.2, 'lin'], outs: [0.24, 'in'], outb: [0.3, 'in'], dim: [0.3, 'std'], on: [0.001, 'lin'],
}
const TRANS = {
  fade: { in: [{ opacity: 0 }, { opacity: 1 }] },
  blur: { in: [{ opacity: 0, filter: 'blur(18px)', transform: 'scale(1.04)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }], out: [{ filter: 'blur(0px)' }, { filter: 'blur(14px)' }] },
  'wipe-left': { in: [{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }] },
  'wipe-right': { in: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
  'wipe-up': { in: [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
  'wipe-down': { in: [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
  'push-left': { in: [{ transform: 'translateX(100%)' }, { transform: 'none' }], out: [{ transform: 'none' }, { transform: 'translateX(-100%)' }] },
  'push-up': { in: [{ transform: 'translateY(100%)' }, { transform: 'none' }], out: [{ transform: 'none' }, { transform: 'translateY(-100%)' }] },
  zoom: { in: [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'none' }], out: [{ transform: 'none' }, { transform: 'scale(0.94)' }] },
  iris: { in: [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }] },
}
const EXIT = new Set(['out', 'outf', 'outs', 'outb'])
const LOOP = new Set()
const ALL = []
const COUNTERS = []
const TYPERS = []
const SCRAMBLES = []
const BEFORE = []
const WAIT = []
let SCENES = []
let DURATION = 0

function anim(el, kf, start, dur, ease, fill = 'both', iterations = 1) {
  const a = el.animate(kf, { delay: start * 1000, duration: dur * 1000, easing: EASE[ease] || ease, fill, iterations })
  a.pause()
  ALL.push(a)
  return a
}

function onFrame(fn) {
  BEFORE.push(fn)
}

function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function parseAnims(root, t0) {
  root.querySelectorAll('[data-a]').forEach((el) => {
    el.dataset.a.trim().split(/\s+/).forEach((spec) => {
      const m = spec.match(/^([a-z]+)@([\d.]+)(?:\/([\d.]+))?(?:~(\w+))?$/)
      if (!m || !KF[m[1]]) throw new Error('bad spec ' + spec)
      const [, kind, s, d, e] = m
      const [dd, de] = DEF[kind]
      const fill = EXIT.has(kind) || LOOP.has(kind) ? 'forwards' : 'both'
      anim(el, KF[kind], t0 + +s, d ? +d : dd, e || de, fill, LOOP.has(kind) ? Infinity : 1)
    })
  })
  root.querySelectorAll('[data-count]').forEach((el) => {
    const fmt = el.dataset.fmt || 'int'
    const segs = el.dataset.count.split(';').map((s) => {
      const m = s.trim().match(/^([\d.]+)>([\d.]+)@([\d.]+)\/([\d.]+)$/)
      if (!m) throw new Error('bad count ' + s)
      return { from: +m[1], to: +m[2], start: t0 + +m[3], dur: +m[4] }
    })
    COUNTERS.push({ el, fmt, segs })
  })
  root.querySelectorAll('[data-type]').forEach((el) => {
    const [s, d] = el.dataset.type.split('/').map(Number)
    TYPERS.push({ el, text: el.textContent, start: t0 + s, dur: d })
    el.textContent = ''
  })
  root.querySelectorAll('[data-scramble]').forEach((el) => {
    const [s, d] = el.dataset.scramble.split('/').map(Number)
    SCRAMBLES.push({ el, text: el.textContent, start: t0 + s, dur: d })
  })
}

const ease = (p) => 1 - Math.pow(1 - p, 4)
const FMT = {
  int: (v) => Math.round(v).toLocaleString('en-US'),
  k: (v) => (v / 1000).toFixed(1) + 'k',
  dec: (v) => v.toFixed(1),
  pct: (v) => Math.round(v) + '%',
  pct1: (v) => v.toFixed(1) + '%',
  x: (v) => v.toFixed(1) + '×',
  usd: (v) => '$' + Math.round(v).toLocaleString('en-US'),
  dur: (v) => { const s = Math.round(v); return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's' },
  ms: (v) => Math.round(v) + ' ms',
  kb: (v) => Math.round(v) + ' KB',
}

function counterValue(c, t) {
  let v = c.segs[0].from
  for (const s of c.segs) {
    if (t < s.start) break
    const p = Math.min(1, (t - s.start) / s.dur)
    v = s.from + (s.to - s.from) * ease(p)
  }
  return v
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/+=<>'
function scrambled(text, p, tick) {
  const shown = Math.round(text.length * p)
  let out = ''
  for (let i = 0; i < text.length; i++) {
    if (i < shown || text[i] === ' ') out += text[i]
    else out += GLYPHS[Math.floor(seeded(i * 7919 + tick * 104729)() * GLYPHS.length)]
  }
  return out
}

function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}
function points(vals, w, h, max, min = 0) {
  return vals.map((v, i) => [(i / (vals.length - 1)) * w, h - ((v - min) / (max - min)) * h])
}
function lineChart({ vals, cmp, w, h, max, min = 0, id, stroke = 'var(--chart-1)', width = 3 }) {
  const p = points(vals, w, h, max, min)
  const line = smooth(p)
  const area = line + `L${w},${h}L0,${h}Z`
  const c = cmp ? smooth(points(cmp, w, h, max, min)) : ''
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="0" x2="${w}" y1="${(h * f).toFixed(1)}" y2="${(h * f).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`).join('')
  return {
    pts: p,
    svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${stroke}" stop-opacity="0.2"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <g data-wipe>
        ${c ? `<path d="${c}" fill="none" stroke="var(--compare)" stroke-width="2" stroke-dasharray="6 7"/>` : ''}
        <path d="${area}" fill="url(#${id})"/>
        <path d="${line}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>
      </g>
    </svg>`,
  }
}

const logo = (height, file = 'logo-on-dark.svg') => `<img src="/brand/${file}" alt="" style="display: block; height: ${height}px">`
const arrow = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const terminal = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 4 4-4 4M12 16h7"/></svg>`
const eyebrow = (path) => `<span class="eyebrow">${terminal}<code>~/${path}</code></span>`
const index = (n) => String(n).padStart(2, '0')

function build(S, options = 0) {
  const { poster = 0, fps } = typeof options === 'number' ? { poster: options } : options
  if (fps) FPS = fps
  let t0 = 0
  const root = document.getElementById('scenes')
  S.forEach((s, i) => {
    const sec = document.createElement('section')
    s.theme ??= 'dark'
    sec.className = 'scene' + (s.theme === 'light' ? '' : ' dark')
    if (s.tone) sec.dataset.tone = s.tone
    sec.innerHTML = s.html()
    root.appendChild(sec)
    s.el = sec
    s.start = t0
    s.end = t0 + s.dur
    s.enterDur = s.enter && i > 0 ? s.enterDur ?? 0.7 : 0
    parseAnims(sec, t0)
    if (s.enterDur) {
      const tr = TRANS[s.enter]
      if (!tr) throw new Error('unknown transition ' + s.enter)
      anim(sec, tr.in, t0, s.enterDur, s.enterEase ?? 'std')
      if (tr.out) anim(S[i - 1].el, tr.out, t0, s.enterDur, s.enterEase ?? 'std')
    }
    t0 = s.end
  })
  SCENES = S
  DURATION = t0
  window.DURATION = DURATION
  window.CUTS = S.map((s) => +s.start.toFixed(3))
  window.POSTER = poster
  window.FPS = FPS
  return DURATION
}

const stage = document.getElementById('stage')

function render(t) {
  for (const f of BEFORE) f(t)
  const S = SCENES
  const idx = Math.max(0, S.findIndex((s) => t >= s.start && t < s.end))
  const i = t >= DURATION ? S.length - 1 : idx
  const entering = S[i].enterDur > 0 && t < S[i].start + S[i].enterDur
  S.forEach((s, k) => s.el.classList.toggle('on', k === i || (entering && k === i - 1)))
  const ms = t * 1000
  for (const a of ALL) a.currentTime = ms
  for (const c of COUNTERS) {
    const s = FMT[c.fmt](counterValue(c, t))
    if (c.el.textContent !== s) c.el.textContent = s
  }
  for (const ty of TYPERS) {
    const p = Math.max(0, Math.min(1, (t - ty.start) / ty.dur))
    const s = ty.text.slice(0, Math.round(ty.text.length * p))
    if (ty.el.textContent !== s) ty.el.textContent = s
  }
  for (const sc of SCRAMBLES) {
    const p = Math.max(0, Math.min(1, (t - sc.start) / sc.dur))
    const s = p >= 1 ? sc.text : scrambled(sc.text, p, Math.floor(t * 24))
    if (sc.el.textContent !== s) sc.el.textContent = s
  }
  const sc = S[i]
  stage.classList.toggle('dark', sc.theme !== 'light')
  if (sc.tone) stage.dataset.tone = sc.tone
  else delete stage.dataset.tone
}

function start(fonts = []) {
  window.render = render
  if (QUERY.has('guides')) {
    const g = document.createElement('div')
    g.id = 'guides'
    g.dataset.label = `${STAGE.format} safe area`
    stage.appendChild(g)
  }
  window.ready = Promise.all([
    ...[...(STUDIO.fonts ?? []), ...fonts].map((f) => document.fonts.load(f)),
    ...[...document.images].map((img) => img.decode().catch(() => {})),
    ...WAIT,
  ]).then(() => document.fonts.ready).then(() => {
    render(0)
    return DURATION
  })
}
