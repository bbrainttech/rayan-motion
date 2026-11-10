# Writing a composition

`comps/<id>/index.html` is a web page. The renderer opens it in Chrome, calls `render(t)` for each frame and takes a screenshot. It loads `engine/engine.css`, then `engine/engine.js`, and as needed `engine/app.js` (app windows), `engine/helpers.js` (window helpers) and `engine/motion.js` (text, charts, frames). Always run it through `render.ts`, never from the file system.

Start from the nearest example: `comps/explainer`, `comps/logo-sting`, `comps/teaser`, `comps/showcase`, `comps/social-kit`, `comps/brand-board`.

## Skeleton

```html
<link rel="stylesheet" href="/engine/engine.css">
<div id="stage">
  <div id="scenes"></div>
  <div id="persist"></div>                              <!-- things that live across scenes -->
</div>
<script src="/engine/engine.js"></script>
<script src="/engine/motion.js"></script>
<script>
const CUTS = [0, 2.8, 6.8, 10.0]                        // make.py rewrites this line
const len = (i) => CUTS[i + 1] - CUTS[i]
const S = []
S.push({ tone: 'primary', dur: len(0), html: () => `...` })
S.push({ tone: 'emerald', enter: 'blur', chapter: 'Create', dur: len(1), html: () => `...` })
build(S, { poster: 1.9 })
start()
</script>
```

## Time

All times are seconds. Inside a scene's markup they count from the scene's start; in script they count from the start of the piece. Nothing may run on its own clock: no `setTimeout`, no `requestAnimationFrame`, no `Math.random()`, no free-running CSS animation. Use `anim`, `track`, `onFrame((t) => ...)` and `seeded(n)`.

## Scenes

| Key | Meaning |
|---|---|
| `dur` | Length in seconds. A whole number of beats |
| `html` | A function returning the scene's markup |
| `theme` | `dark` (default) or `light` |
| `tone` | The scene's colour: `primary`, `emerald`, `indigo`, `teal`, `amber`, `rose`, `cyan`, `violet`, `neutral`. It tints the glow, the eyebrow, gradient headings, highlights and the step index |
| `enter`, `enterDur` | A transition from the scene before: `fade`, `blur`, `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down`, `push-left`, `push-up`, `zoom`, `iris`. 0.7 s by default. Without it the scene cuts |
| `chapter` | A name for the progress rail, when the piece has one: `rail()` below. Neighbouring scenes with the same name share a segment |

`build(S, { poster, fps })` lays the scenes out. `poster` is the time of the poster frame. During a transition the outgoing scene stays visible underneath; start the new scene's own content at or after `enterDur`.

## Sizes

```js
frame('vertical')        // a format from presets.json, before build()
frame(1200, 630)         // or any size
```

`STAGE` holds `w`, `h`, `format`, `tall` and `safe` (`top`, `right`, `bottom`, `left` in pixels). The class `safe` positions an element on the safe area. The stage is a size container, so layouts can use `cqmin`, `cqw`, `cqh` and `@container (aspect-ratio < 1 / 1)` rules, and one composition can serve every format ([formats.md](formats.md)). `--preset` and `--size` on the command line override `frame()`.

## Animating markup: `data-a`

`data-a="kind@start/duration~ease"`. Duration and ease are optional; several specs separate with spaces: `data-a="blur@0.6 outb@3.3"`.

| Entrances | | Exits | |
|---|---|---|---|
| `blur` | The default: fade, de-blur and rise 20 px | `outb` | Blur away |
| `blurd` | The same, dropping from above | `out` | Fade and lift |
| `fade` | Opacity only | `outf` | Fade |
| `rise`, `rises`, `drop` | Fade with a move, no blur | `outs` | Fade and shrink |
| `left`, `right`, `slide` | From the side | | |
| `pop`, `popl` | Scale in with overshoot | | |
| `flip` | Tip forward into place | | |
| `zoom` | A window arriving | | |
| `up`, `down` | Text rising or dropping out of a mask | | |
| `gx`, `gy` | Grow along an axis | | |
| `wipe`, `wiped` | Reveal left to right, or top to bottom | | |
| `draw`, `ring` | Stroke a path; fill a ring to `--to` | | |
| `stamp` | Land with a small rotation | | |
| `bloom` | A glow that swells and fades once | | |
| `slam` | Arrive from 132% scale out of a blur, for hard-hitting words | | |
| `tiltin` | A window rising and tipping flat from a 30° tilt | | |

Eases: `std` (expo out, the default for anything that travels), `over` (overshoot, for things that land with a small bounce), `quint`, `emph` (slow, fast, slow), `spring`, `io`, `in` (exits), `out`, `lin`.

From script: `anim(el, keyframes, start, duration, ease, fill = 'both')` and `track(el, 'opacity', [[t0, '0'], [t1, '1']])`. `KF` holds every keyframe set above. When two animations move the same property of one element, give the later ones `'forwards'` as the fill, or the last one's first frame applies from the start.

## Text

```js
type('Add a task', 0.15)                                    // words blur in, 80 ms apart
type('PLAN LESS.', 0.2, { by: 'chars', gap: 0.075 })        // letter by letter
mark('Ship more.', 1.5)                                     // a highlight sweeps behind the text
eyebrow('tasks')                                            // the ~/tasks label with its icon
```

`type(text, start, { by, kind, gap, dur, ease })` splits into words or characters and animates each with any entrance.

| Class | For |
|---|---|
| `h` | Display headings, semibold. Add `black` for the heaviest weight |
| `grad` | A heading clipped to a gradient from the text colour to the scene's tone. Put the entrance on the same element (`class="h grad" data-a="blur@0.5"`), not on children: a gradient clip does not survive per-letter animation |
| `lead` | A supporting line |
| `eyebrow`, `micro` | The mono path label; the small uppercase label |
| `mono`, `num`, `muted`, `tone` | Mono face, tabular figures, quiet colour, tone colour |

`data-count="0>12480@0.8/1.5" data-fmt="int"` counts a number up (`int`, `k`, `dec`, `pct`, `pct1`, `x`, `usd`, `dur`, `ms`, `kb`; chain segments with `;`). `data-type="0.4/1.2"` types an element's text. `data-scramble="1.1/0.9"` decodes it from random glyphs.

## Surfaces, shapes and backgrounds

| Class | What it is |
|---|---|
| `card` | A raised surface with a hairline ring. Pair with a corner class |
| `inset` | A recessed panel inside a card |
| `sq-lg`, `sq-xl`, `sq-2xl`, `sq-3xl` | Squircle corners for blocks and cards |
| `pill`, `chip`, `btn` | Superellipse pills: a shape, a small label, the main action |
| `live` | A static status dot with a soft ring. Nothing pulses |
| `idx` | A mono index number |
| `glow`, `glow low`, `glow side` | A radial glow in the scene's tone, from the top, the bottom or the side |
| `aurora` | A multi-colour low-alpha backdrop for covers and closing scenes |
| `dots`, `lines` | A dot grid and a line grid. Mask them: `mask-radial`, `mask-fade` |
| `plus` | A plus mark for the corners of a closing card |
| `grain` | A static film-grain overlay. Put it last among the background layers |
| `lifted` | A squircle surface with a deep shadow and a tone glow, for a piece lifted out of a window |
| `keys` | A row of `kbd` keycaps; `keycaps()` builds one |
| `layer`, `abs`, `center`, `safe`, `row`, `between` | Layout helpers |

Give full-frame background layers the class `bg` too: transparent renders hide them.

## The motion library (`motion.js`)

```js
const s = spring({ stiffness: 170, damping: 26 })                 // { dur, ease } from real physics
drawOn(document.querySelector('#mark svg'), 0.3, { dur: 0.9 })    // stroke, then fill, each shape of an inlined SVG
barChart({ vals, w: 420, h: 110, t: 1.0, peak: 6 })               // bars grow in turn
ring({ value: 0.38, size: 130, t: 1.0 })                          // a ring that fills to 38%
lineChart({ vals, w, h, max, id: 'g' })                           // .svg and .pts; draw it with data-a="wipe@…"
confetti(canvas, { at: 9.9 })                                     // seeded, so every render matches
browserFrame(inner, { w, h, url })   phoneFrame(inner, { w, h })
callout('Newest on top', { x, y, side: 'left', t: 1.5 })
keycaps(['New task', 'Type a name', 'Add'], 1.2, { hold: 2 })     // keycaps that pop in turn, then leave
rail()                                                            // a progress rail of the scenes' chapters
captions(LINES)                                                   // burned-in captions, word by word
curve('std')                                                      // an SVG of an easing curve, for design pieces
inline('/brand/logo-on-dark.svg')    logo(46)    token('--primary')
```

`captions(LINES)` takes the voice lines. Put `const LINES = []` in the page and `s.page(LINES=s.lines)` in `make.py` before `s.write()`, so the page always shows the script that is spoken. Use it for feeds that autoplay muted.

Markup added after `build()` needs `parseAnims(element, sceneStart)` to register its `data-a`.

## App windows (`app.js` and `helpers.js`)

A window shows snapshots of the real app ([app-capture.md](app-capture.md)) or device screenshots ([mobile.md](mobile.md)).

```js
document.getElementById('persist').innerHTML =
  screenWindow('a', { x: 150, y: 150, w: 1620, h: 911 }, ['01-tasks', '02-new-hover', '03-form'])

screens(() => {                       // runs once every snapshot has loaded
  const a = win('a')
  show(a, [[T1, '01-tasks'], [hoverNew, '02-new-hover', 0.1], [PRESS + 0.05, '03-form', 0.15]])
  camera(a, [[T1, 640, 360, FULL], [PRESS - 0.2, 752, 285, 1.6, 'std']])
  // pointer, tap, typing, caret, scroll …
})
```

Coordinates inside a window are **page pixels** of the snapshot (1280 by 720 unless a fourth value gives another page size).

| Call | Does |
|---|---|
| `show(w, [[t, key, fade]])` | Which snapshot is visible, with an optional cross-fade |
| `camera(w, [[t, cx, cy, scale, ease]])` | Looks at a page point with a zoom. `FULL = box.w / 1280` shows the whole page. Views clamp to the page |
| `crop(w, x, y, scale)` | A fixed view whose top-left is a page point |
| `box(w, key, selector, scrollY, text)` | An element's place in a snapshot, so positions follow the app |
| `pointer(w, [[t, x, y, ease]], { from, to })` | The cursor's path and when it shows |
| `enters(span, from, to, rect)` | The moment a moving pointer crosses into a target: switch to the hover snapshot then |
| `tap(w, t, x, y)` | A press ring and cursor dip |
| `keystrokes(text, t, per)`, `typing(w, keys, selector, text, times)`, `caret(w, [{ sel, from, to, keysAt }])` | Type into an input over time, with a caret |
| `scroll(w, key, [[t, y]])`, `scrollEl(w, key, selector, [[t, y]])` | Scroll the page or a container |
| `mod(w, key, (doc, q) => …)`, `tween(w, key, selector, props, fromKey, t, dur)` | Adjust a snapshot; animate a property between two snapshots |
| `during(w, from, to)` | Hide the window outside a span |
| `spotlight(w, rect, from, to, { dim })` | Dim everything in the window except one element |
| `depth(el, [[t, blur, brightness]])` | Push an element back: blur it and darken it over time |
| `piece(id, key, rect, { scale, pad })` | A crop of one element from a snapshot as its own small window: `.html` to place it, `.crop()` to frame it once loaded |
| `deviceScreen(key)`, `deviceBox(key, text)` | A device screenshot's element list, and one element's box ([mobile.md](mobile.md)) |

`screens(setup)` returns a promise that settles once `setup` has run. Markup added inside `setup` that holds more windows, such as the windows from `piece()`, needs its own `screens()` call, and `setup` must return that promise so the render waits for it:

```js
screens(() => {
  persist.append(liftEl)                     // liftEl holds lift.html
  const inner = screens(() => lift.crop())
  // the rest of the timeline
  return inner
})
```

When two animations change `filter` on one element, the later one wins outright. To push a window back and then fade it out, keep the blur in `depth()` and leave with `outf`, which only changes opacity.

A believable click: move for 0.6 to 0.8 s, the hover highlight as the cursor enters, a short rest, the tap, the result 0.05 s later. Zoom between 1.4 and 2.4 for a control and its surroundings. Hold the camera still while something changes.

## Before rendering

Look at stills at every cut and one mid-scene moment per scene: `bun render.ts sheet <id> <times>`. Add `--guides` to draw the safe area. Then `bun lint.ts <id>`.
