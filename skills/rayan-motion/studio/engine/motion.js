const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function token(name) {
  return getComputedStyle(document.getElementById('stage')).getPropertyValue(name).trim()
}

function spring({ stiffness = 170, damping = 26, mass = 1, velocity = 0 } = {}) {
  const dt = 1 / 240
  const samples = [0]
  let x = 0
  let v = velocity
  let t = 0
  let rest = 0
  while (t < 6) {
    v += ((-stiffness * (x - 1) - damping * v) / mass) * dt
    x += v * dt
    t += dt
    samples.push(x)
    rest = Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01 ? rest + dt : 0
    if (rest > 0.05) break
  }
  const dur = Math.max(0.2, t)
  const n = Math.min(64, Math.max(16, Math.round(dur * 40)))
  const pts = Array.from({ length: n + 1 }, (_, i) => +samples[Math.round((i / n) * (samples.length - 1))].toFixed(4))
  pts[n] = 1
  return { dur: +dur.toFixed(3), ease: `linear(${pts.join(', ')})` }
}

function type(text, t, { by = 'words', kind = 'blur', gap, dur, ease, cls = '' } = {}) {
  const step = gap ?? (by === 'chars' ? 0.035 : 0.08)
  const masked = kind === 'up' || kind === 'down'
  let i = 0
  const unit = (u) => {
    const spec = `${kind}@${(t + i++ * step).toFixed(3)}${dur ? '/' + dur : ''}${ease ? '~' + ease : ''}`
    const inner = `<span class="wi ${cls}" data-a="${spec}">${esc(u)}</span>`
    return masked ? `<span class="wm">${inner}</span>` : inner
  }
  const words = text.split(' ')
  if (by === 'chars') return words.map((w) => `<span style="display: inline-block; white-space: nowrap">${[...w].map(unit).join('')}</span>`).join(' ')
  return words.map(unit).join(' ')
}

function mark(text, t, { dur = 0.5, color } = {}) {
  return `<span class="mark"><i ${color ? `style="background: ${color}"` : ''} data-a="gx@${t.toFixed(3)}/${dur}~emph"></i><span>${esc(text)}</span></span>`
}

function drawOn(root, t, { dur = 0.9, gap = 0.12, fill = 0.4, width = 2 } = {}) {
  const shapes = [...root.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon')]
  shapes.forEach((el, i) => {
    const cs = getComputedStyle(el)
    const stroked = cs.stroke !== 'none'
    const filled = cs.fill !== 'none'
    const opacity = cs.fillOpacity
    el.setAttribute('pathLength', '1')
    el.style.strokeDasharray = '1'
    if (!stroked) {
      el.style.stroke = cs.fill
      el.style.strokeWidth = `${width}px`
      el.style.vectorEffect = 'non-scaling-stroke'
    }
    const s = t + i * gap
    anim(el, KF.draw, s, dur, 'io')
    if (filled) anim(el, [{ fillOpacity: 0 }, { fillOpacity: opacity }], s + dur * 0.6, fill, 'std')
    if (!stroked) anim(el, [{ strokeOpacity: 1 }, { strokeOpacity: 0 }], s + dur * 0.6 + fill, 0.25, 'lin', 'forwards')
  })
  const after = t + Math.max(0, shapes.length - 1) * gap + dur * 0.6
  root.querySelectorAll('text').forEach((el, i) => anim(el, KF.fade, after + i * gap, fill, 'std'))
  return after + fill
}

function barChart({ vals, w, h, max = Math.max(...vals), t = 0, gap = 0.08, pad = 0.4, color = 'var(--chart-2)', peak, peakColor = 'var(--chart-contrast)' }) {
  const n = vals.length
  const bw = w / (n + (n - 1) * pad)
  const bars = vals.map((v, i) => {
    const bh = Math.max(1, (v / max) * h)
    return `<rect class="bar" x="${(i * bw * (1 + pad)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(8, bw / 3).toFixed(1)}" fill="${i === peak ? peakColor : color}" data-a="gy@${(t + i * gap).toFixed(3)}/0.6"/>`
  })
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars.join('')}</svg>`
}

function ring({ value, size = 160, stroke = 14, t = 0, dur = 1.2, color = 'var(--chart-2)', track = 'var(--border)' }) {
  const r = (size - stroke) / 2
  const c = size / 2
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg)">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" pathLength="1" stroke-dasharray="1" style="--to: ${(1 - value).toFixed(4)}" data-a="ring@${t.toFixed(3)}/${dur}"/>
  </svg>`
}

function confetti(canvas, { at, seed = 7, count = 110, x = 0.5, y = 0.62, power = 1, colors = ['--primary', '--emerald', '--amber', '--rose', '--foreground'] } = {}) {
  const ctx = canvas.getContext('2d')
  const paints = colors.map((c) => (c.startsWith('--') ? token(c) : c))
  const rnd = seeded(seed)
  const parts = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (rnd() - 0.5) * 2
    const speed = (700 + rnd() * 1100) * power
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 8 + rnd() * 12, h: 5 + rnd() * 8, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 14, paint: paints[Math.floor(rnd() * paints.length)], drag: 1.1 + rnd() * 0.8 }
  })
  onFrame((t) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const s = t - at
    if (s < 0 || s > 3.2) return
    for (const p of parts) {
      const k = (1 - Math.exp(-p.drag * s)) / p.drag
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, s - 1.4) / 1.4)
      ctx.translate(x * canvas.width + p.vx * k, y * canvas.height + p.vy * k + 520 * s * s)
      ctx.rotate(p.rot + p.spin * s)
      ctx.fillStyle = p.paint
      ctx.beginPath()
      ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 3)
      ctx.fill()
      ctx.restore()
    }
  })
}

function browserFrame(inner, { w, h, url = '', id = '' }) {
  return `<div class="browser"${id ? ` id="${id}"` : ''} style="width: ${w}px">
    <div class="browser-bar"><i></i><i></i><i></i><span>${esc(url)}</span></div>
    <div class="browser-body" style="height: ${h}px">${inner}</div>
  </div>`
}

function phoneFrame(inner, { w, h, id = '' }) {
  return `<div class="phone"${id ? ` id="${id}"` : ''} style="width: ${w + 24}px">
    <div class="phone-screen" style="width: ${w}px; height: ${h}px">${inner}</div>
  </div>`
}

function callout(text, { x, y, side = 'right', t = 0, len = 120 }) {
  return `<div class="callout ${side}" style="left: ${x}px; top: ${y}px">
    <i class="callout-dot" data-a="pop@${t.toFixed(3)}"></i>
    <i class="callout-line" style="width: ${len}px" data-a="gx@${(t + 0.1).toFixed(3)}/0.4"></i>
    <span class="callout-label" data-a="blur@${(t + 0.26).toFixed(3)}/0.5">${esc(text)}</span>
  </div>`
}

function curve(ease, size = 120) {
  const m = (EASE[ease] || ease).match(/cubic-bezier\(([^)]+)\)/)
  if (!m) return ''
  const [x1, y1, x2, y2] = m[1].split(',').map(Number)
  const p = (x, y) => `${(x * size).toFixed(1)},${(size - y * size).toFixed(1)}`
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow: visible"><rect width="${size}" height="${size}" rx="14" fill="none" stroke="var(--border)"/><path d="M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}" fill="none" stroke="var(--primary)" stroke-width="3"/></svg>`
}

function rail(names = SCENES.map((s) => s.chapter)) {
  const parts = []
  SCENES.forEach((s, i) => {
    const name = names[i]
    if (!name) return
    const last = parts[parts.length - 1]
    if (last && last.name === name) last.end = s.end
    else parts.push({ name, start: s.start, end: s.end })
  })
  const el = document.createElement('div')
  el.className = 'rail'
  el.innerHTML = parts.map((p) => `<div class="rail-seg" style="--grow: ${(p.end - p.start).toFixed(3)}"><span class="rail-bar"><i></i></span><span class="rail-name">${esc(p.name)}</span></div>`).join('')
  document.getElementById('stage').appendChild(el)
  const segs = [...el.children]
  onFrame((t) => {
    parts.forEach((p, i) => {
      const u = Math.max(0, Math.min(1, (t - p.start) / (p.end - p.start)))
      segs[i].firstElementChild.firstElementChild.style.transform = `scaleX(${u.toFixed(4)})`
      segs[i].classList.toggle('now', t >= p.start && t < p.end)
    })
  })
  return el
}

function depth(el, keys) {
  track(el, 'filter', keys.map(([t, blur, light = 1]) => [t, `blur(${blur}px) brightness(${light})`]), 'cubic-bezier(0.16, 1, 0.3, 1)')
}

function piece(id, key, rect, { scale = 1, pad = 0, page = PAGE } = {}) {
  const w = (rect.w + pad * 2) * scale
  const h = (rect.h + pad * 2) * scale
  return { html: screenWindow(id, { x: 0, y: 0, w, h }, [key], page), w, h, crop: () => { const p = win(id); show(p, [[0, key]]); crop(p, rect.x - pad, rect.y - pad, scale); return p } }
}

function keycaps(keys, t, { hold = 1.5 } = {}) {
  return `<div class="keys">${keys.map((k, i) => `<kbd data-a="pop@${(t + i * 0.09).toFixed(3)} outb@${(t + hold + i * 0.04).toFixed(3)}">${esc(k)}</kbd>`).join('')}</div>`
}

function captions(lines, { end = DURATION, pace = 16.5, tail = 0.35 } = {}) {
  const box = document.createElement('div')
  box.id = 'captions'
  box.className = 'safe'
  lines.forEach((line, i) => {
    const words = line.text.split(' ')
    const spoken = line.text.length / (pace * (line.speed ?? 1))
    const until = Math.min(i + 1 < lines.length ? lines[i + 1].at - 0.12 : end - 0.2, line.at + spoken + tail + 0.6)
    const el = document.createElement('p')
    el.className = 'caption'
    el.innerHTML = words.map((w, k) => `<span class="wi" data-a="blur@${(line.at - 0.05 + (k / words.length) * spoken * 0.82).toFixed(3)}/0.4">${esc(w)}</span>`).join(' ')
    box.appendChild(el)
    anim(el, KF.outb, until, 0.25, 'in', 'forwards')
    onFrame((t) => { el.style.visibility = t >= line.at - 0.1 && t < until + 0.25 ? 'visible' : 'hidden' })
  })
  document.getElementById('stage').appendChild(box)
  parseAnims(box, 0)
  return box
}
