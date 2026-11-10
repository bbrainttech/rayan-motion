function when(ease, [t0, t1], u) {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if (JS_EASE[ease](m) < u) lo = m
    else hi = m
  }
  return t0 + (t1 - t0) * hi
}

function enters(span, a, b, r) {
  for (let i = 0; i <= 400; i++) {
    const u = i / 400
    const x = a.x + (b.x - a.x) * u
    const y = a.y + (b.y - a.y) * u
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return when('std', span, u)
  }
  throw new Error(`the pointer path misses ${JSON.stringify(r)}`)
}

function visible(doc, sel, text) {
  return [...doc.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0 && (!text || (text instanceof RegExp ? text.test(e.textContent) : e.textContent.trim() === text)))
}

function box(w, key, sel, y = 0, text) {
  const view = w.shots[key].contentWindow
  view.scrollTo({ top: y, behavior: 'instant' })
  const el = visible(w.doc(key), sel, text)
  if (!el) throw new Error(`${key}: nothing visible matches ${sel}${text ? ` with ${text}` : ''}`)
  const r = el.getBoundingClientRect()
  view.scrollTo({ top: 0, behavior: 'instant' })
  return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
}

function crop(w, x, y, s) {
  camera(w, [[0, x + w.box.w / (2 * s), y + w.box.h / (2 * s), s]])
}

function along(points, set) {
  BEFORE.push((t) => {
    let y = points[points.length - 1][1]
    if (t <= points[0][0]) y = points[0][1]
    else for (let i = 1; i < points.length; i++) {
      const [t0, y0] = points[i - 1]
      const [t1, y1] = points[i]
      if (t < t1) {
        y = y0 + (y1 - y0) * JS_EASE.io((t - t0) / (t1 - t0))
        break
      }
    }
    set(y)
  })
}

function scroll(w, key, points) {
  const view = w.shots[key].contentWindow
  along(points, (y) => {
    if (Math.abs(view.scrollY - y) > 0.5) view.scrollTo({ top: y, behavior: 'instant' })
  })
}

function scrollEl(w, key, sel, points) {
  const el = w.doc(key).querySelector(sel)
  along(points, (y) => {
    if (Math.abs(el.scrollTop - y) > 0.5) el.scrollTop = y
  })
}

function scrollLinked(w, key) {
  const view = w.shots[key].contentWindow
  for (const css of w.doc(key).getAnimations()) {
    if (!(css.timeline instanceof view.ScrollTimeline)) continue
    const linked = new view.Animation(new view.KeyframeEffect(css.effect.target, css.effect.getKeyframes(), css.effect.getTiming()), css.timeline)
    linked.rangeStart = css.rangeStart
    linked.rangeEnd = css.rangeEnd
    linked.play()
    css.cancel()
  }
}

function during(w, from, to) {
  BEFORE.push((t) => {
    w.el.style.visibility = t >= from && t < to ? 'visible' : 'hidden'
  })
}

function spotlight(w, rect, from, to, { pad = 10, radius = 14, dim = 0.6 } = {}) {
  const el = document.createElement('i')
  el.className = 'spot'
  el.style.cssText = `left:${rect.x - pad}px;top:${rect.y - pad}px;width:${rect.w + pad * 2}px;height:${rect.h + pad * 2}px;border-radius:${radius}px;box-shadow:0 0 0 4000px oklch(0 0 0 / ${dim}), 0 0 0 2px var(--tone), 0 0 40px 4px color-mix(in oklab, var(--tone) 45%, transparent)`
  w.stage.appendChild(el)
  anim(el, [{ opacity: 0 }, { opacity: 1 }], from, 0.45, 'std')
  anim(el, [{ opacity: 1 }, { opacity: 0 }], to, 0.35, 'quint', 'forwards')
  return el
}

function deviceScreen(key) {
  return JSON.parse(inline(`screens/${key.replace(/\.(png|jpe?g|webp)$/, '')}.json`))
}

function deviceBox(key, text, nth = 0) {
  const hits = deviceScreen(key).elements.filter((e) => (text instanceof RegExp ? text.test(`${e.text} ${e.label}`) : e.text === text || e.label === text || e.id === text))
  const e = hits[nth]
  if (!e) throw new Error(`${key}: no element matches ${text}`)
  return { x: e.x, y: e.y, w: e.w, h: e.h, cx: e.x + e.w / 2, cy: e.y + e.h / 2 }
}
