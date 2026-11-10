const PAGE = { w: 1280, h: 720 }
const CURSOR = `<svg class="cursor" width="18" height="21.6" viewBox="0 0 30 36"><path d="M2 2 L2 28 L9 21.5 L14 32.5 L19 30.5 L14 19.5 L23 19.5 Z" fill="oklch(0.141 0.005 285.823)" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>`
const JS_EASE = {
  lin: (p) => p,
  std: cubic(0.22, 1, 0.36, 1),
  io: cubic(0.42, 0, 0.58, 1),
  tw: cubic(0.4, 0, 0.2, 1),
}

function cubic(x1, y1, x2, y2) {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2
      if (at(x1, x2, m) < x) lo = m
      else hi = m
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

function screenWindow(id, box, keys, page = PAGE) {
  const size = `width:${page.w}px;height:${page.h}px`
  const image = (k) => /\.(png|jpe?g|webp)$/.test(k.split('#')[0])
  const shots = keys.map((k) => image(k)
    ? `<img class="shot" data-key="${k}" src="screens/${k.split('#')[0]}" alt="" style="${size}">`
    : `<iframe class="shot" data-key="${k}" src="screens/${k.split('#')[0]}.html" scrolling="no" tabindex="-1" style="${size}"></iframe>`).join('')
  return `<div class="win" id="${id}" data-pw="${page.w}" data-ph="${page.h}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
    <div class="stage" style="${size}">${shots}<i class="icaret"></i><span class="tap"></span>${CURSOR}</div></div>`
}

const WINDOWS = []

function loaded(frame) {
  if (frame.tagName === 'IMG') return frame.decode().then(() => frame)
  return new Promise((resolve) => {
    const done = () => {
      const doc = frame.contentDocument
      doc.fonts.ready.then(() => resolve(frame))
    }
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.URL !== 'about:blank') done()
    else frame.addEventListener('load', done, { once: true })
  })
}

const SEEN = new Set()

function screens(setup) {
  const frames = [...document.querySelectorAll('.win .shot')].filter((f) => !SEEN.has(f))
  frames.forEach((f) => SEEN.add(f))
  const done = Promise.all(frames.map(loaded)).then(() => {
    for (const f of frames) {
      if (!f.contentDocument) continue
      const freeze = [...f.contentDocument.querySelectorAll('head style')].find((s) => s.textContent.includes('animation:none'))
      if (freeze) freeze.textContent = '*,*::before,*::after{transition:none!important;caret-color:transparent!important}'
    }
    return setup()
  })
  WAIT.push(done)
  return done
}

function win(id) {
  const el = document.getElementById(id)
  const stage = el.querySelector('.stage')
  const shots = Object.fromEntries([...el.querySelectorAll('.shot')].map((f) => [f.dataset.key, f]))
  const w = {
    id, el, stage, shots, box: { w: el.clientWidth, h: el.clientHeight }, page: { w: +el.dataset.pw, h: +el.dataset.ph },
    caret: stage.querySelector('.icaret'), tap: stage.querySelector('.tap'), cursor: stage.querySelector('.cursor'),
    doc: (k) => shots[k].contentDocument,
    q: (k, sel) => shots[k].contentDocument.querySelector(sel),
    all: (sel) => Object.values(shots).flatMap((f) => (f.contentDocument ? [...f.contentDocument.querySelectorAll(sel)] : [])),
    rect: (k, sel) => {
      const r = shots[k].contentDocument.querySelector(sel).getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
    },
    timeline: [],
    since: 0,
    sinceShot: {},
  }
  WINDOWS.push(w)
  return w
}

function hoverChain(el, on) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) e.toggleAttribute('data-x-hover', on)
}

function mod(w, key, fn) {
  fn(w.doc(key), (sel) => w.q(key, sel))
}

function unfocus(doc) {
  for (const el of doc.querySelectorAll('[data-x-focus], [data-x-focus-visible]')) {
    el.removeAttribute('data-x-focus')
    el.removeAttribute('data-x-focus-visible')
  }
}

function press(doc, sel) {
  unfocus(doc)
  const el = doc.querySelector(sel)
  hoverChain(el, true)
  el.setAttribute('data-x-active', '')
  el.setAttribute('data-x-focus', '')
}

function show(w, steps) {
  w.timeline = steps.map(([t, key, fade = 0]) => ({ t, key, fade }))
}

function view(w, cx, cy, s) {
  const W = w.box.w
  const H = w.box.h
  let tx = W / 2 - cx * s
  let ty = H / 2 - cy * s
  tx = Math.min(0, Math.max(W - w.page.w * s, tx))
  ty = Math.min(0, Math.max(H - w.page.h * s, ty))
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s})`
}

function camera(w, keys) {
  const t0 = keys[0][0]
  const t1 = keys[keys.length - 1][0]
  w.stage.style.transform = view(w, keys[0][1], keys[0][2], keys[0][3])
  if (t1 <= t0) return
  const frames = keys.map(([t, cx, cy, s], i) => ({ offset: (t - t0) / (t1 - t0), transform: view(w, cx, cy, s), easing: EASE[keys[i + 1]?.[4] ?? 'std'] }))
  anim(w.stage, frames, t0, t1 - t0, 'lin')
}

function track(el, prop, points, ease = 'lin') {
  const t0 = points[0][0]
  const t1 = points[points.length - 1][0]
  el.style[prop] = points[0][1]
  if (t1 > t0) anim(el, points.map(([t, v]) => ({ offset: (t - t0) / (t1 - t0), [prop]: v })), t0, t1 - t0, ease)
}

function pointer(w, keys, { from, to, hide = [] }) {
  const pos = (x, y) => `translate(${(x - 1.2).toFixed(2)}px, ${(y - 1.2).toFixed(2)}px)`
  const t0 = keys[0][0]
  const t1 = keys[keys.length - 1][0]
  w.cursor.style.transform = pos(keys[0][1], keys[0][2])
  if (t1 > t0) anim(w.cursor, keys.map(([t, x, y], i) => ({ offset: (t - t0) / (t1 - t0), transform: pos(x, y), easing: EASE[keys[i + 1]?.[3] ?? 'std'] })), t0, t1 - t0, 'lin')
  const seen = [[from - 0.001, 0], [from, 0], [from + 0.18, 1]]
  for (const [off, on] of hide) seen.push([off, 1], [off + 0.001, 0], [on, 0], [on + 0.15, 1])
  if (to) seen.push([to, 1], [to + 0.25, 0])
  track(w.cursor, 'opacity', seen.map(([t, v]) => [t, String(v)]))
}

function tween(w, key, sel, props, from, t, dur, ease = 'cubic-bezier(0.4, 0, 0.2, 1)') {
  const el = w.q(key, sel)
  const was = w.q(from, sel)
  const a = was.ownerDocument.defaultView.getComputedStyle(was)
  const b = el.ownerDocument.defaultView.getComputedStyle(el)
  anim(el, [Object.fromEntries(props.map((p) => [p, a[p]])), Object.fromEntries(props.map((p) => [p, b[p]]))], t, dur, ease)
}

function tap(w, t, x, y) {
  anim(w.cursor.querySelector('path'), [{ transform: 'scale(1)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)' }], t - 0.04, 0.2, 'std', 'none')
  const ring = w.tap.cloneNode()
  w.stage.appendChild(ring)
  ring.style.left = `${x - 18}px`
  ring.style.top = `${y - 18}px`
  anim(ring, [{ opacity: 0.8, transform: 'scale(0.3)' }, { opacity: 0, transform: 'scale(1.5)' }], t, 0.5, 'std', 'forwards')
}

function keystrokes(text, t0, per, pauses = {}) {
  const times = []
  let t = t0
  for (let i = 0; i < text.length; i++) {
    times.push(+t.toFixed(3))
    t += per * (0.8 + 0.4 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1)) + (pauses[i] ?? 0)
  }
  return times
}

function typing(w, keys, sel, text, times) {
  BEFORE.push((t) => {
    let n = 0
    while (n < times.length && t >= times[n]) n++
    const v = text.slice(0, n)
    for (const k of keys) {
      const input = w.q(k, sel)
      if (input && input.value !== v) input.value = v
    }
  })
}

function caret(w, spans) {
  const pens = new Map()
  BEFORE.push((t) => {
    const span = spans.find((s) => t >= s.from && t < s.to)
    const key = shotAt(w, t)
    const input = span && key && w.q(key, span.sel)
    if (!input) {
      w.caret.style.opacity = 0
      return
    }
    const doc = input.ownerDocument
    if (!pens.has(doc)) pens.set(doc, doc.createElement('canvas').getContext('2d'))
    const pen = pens.get(doc)
    const cs = doc.defaultView.getComputedStyle(input)
    pen.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const r = input.getBoundingClientRect()
    const x = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) + (span.start ? 0 : pen.measureText(input.value).width)
    const size = Math.round(parseFloat(cs.fontSize) * 1.2)
    w.caret.style.left = `${x.toFixed(2)}px`
    w.caret.style.top = `${(r.top + (r.height - size) / 2).toFixed(2)}px`
    w.caret.style.height = `${size}px`
    w.caret.style.background = cs.color
    const last = Math.max(span.from, ...(span.keysAt ?? []).filter((k) => k <= t))
    const idle = t - last
    w.caret.style.opacity = idle < 0.5 || Math.floor((idle - 0.5) / 0.5) % 2 === 1 ? 1 : 0
  })
}

function shotAt(w, t) {
  let cur = null
  for (const s of w.timeline) if (t >= s.t) cur = s
  return cur?.key
}

BEFORE.push((t) => {
  for (const w of WINDOWS) {
    let cur = -1
    w.timeline.forEach((s, i) => { if (t >= s.t) cur = i })
    const visible = new Map()
    if (cur >= 0) {
      const s = w.timeline[cur]
      const p = s.fade > 0 ? JS_EASE.tw(Math.min(1, (t - s.t) / s.fade)) : 1
      if (p < 1 && cur > 0) visible.set(w.timeline[cur - 1].key, [1, 1])
      visible.set(s.key, [p, 2])
    }
    for (const [key, frame] of Object.entries(w.shots)) {
      const [o, z] = visible.get(key) ?? [0, 0]
      frame.style.opacity = o
      frame.style.zIndex = z
      frame.style.visibility = o > 0 ? 'inherit' : 'hidden'
      if (!frame.contentDocument) continue
      const at = (t - (w.sinceShot[key] ?? w.since)) * 1000
      for (const a of frame.contentDocument.getAnimations()) {
        if (!('animationName' in a) || a.timeline?.constructor.name !== 'DocumentTimeline') continue
        if (a.playState !== 'paused') a.pause()
        a.currentTime = Math.max(0, at)
      }
    }
  }
})
