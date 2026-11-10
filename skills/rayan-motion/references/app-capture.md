# Capturing the real app

`comps/<id>/capture.ts` drives the running app with Playwright and saves each state the video shows. One call, `snap(page, dir, name)`, writes two files into `screens/`:

- `<name>.png`, a 2x screenshot. This is the truth the scenes are checked against.
- `<name>.html`, the page's DOM with its stylesheets, images and fonts saved beside it, scripts removed and animations frozen. The scenes load this in an iframe, so text stays sharp at any zoom and the engine can move things inside it.

The viewport is always 1280 by 720.

## Skeleton

```ts
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { open, snap } from '../../render/snap.ts'

const WEB = process.env.WEB ?? 'http://localhost:3000'
const OUT = join(import.meta.dir, 'screens')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const { browser, context } = await open()
try {
  rmSync(OUT, { recursive: true, force: true })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  const shot = (name: string) => snap(page, OUT, name)
  const away = () => page.mouse.move(700, 4)

  await page.goto(WEB + '/tasks', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Tasks' }).waitFor()
  await away()
  await wait(1000)
  await shot('01-tasks')

  const create = page.getByRole('button', { name: 'New task' })
  await create.hover()
  await wait(300)
  await shot('02-new-hover')
  // ...
} finally {
  await browser.close()
}
```

`open({ theme, timezone, locale, init })` launches Chrome. `init` is a function run in every page before its scripts, for dismissing a prompt the app would otherwise show: `init: () => localStorage.setItem('tour-seen', '1')`.

## What to capture

Take a snapshot for every state the viewer will see, in order, with numbered names:

- the resting page;
- **the hover** on each control before it is pressed (hover and focus are saved as attributes, so the snapshot keeps them);
- the state right after a press: an open menu, a dialog, a loading state if the app shows one long enough to see;
- the result;
- the same page scrolled, when the video scrolls and something sticky changes.

Move the mouse away (`away()`) before a snapshot that should show no hover. Wait for charts and transitions to finish; a snapshot freezes whatever is on screen.

Text typed on camera is typed by the engine, not the capture: snapshot the empty focused field, then the state after the full text is entered.

Log positions as you go (`console.log(await el.boundingBox())`, `scrollY`). They save a round trip when placing cameras.

## Data on camera

- **A public demo or seeded workspace** is the fastest source: no sign-in, no cleanup. Check that it shows the same thing customers see. If a demo hides or disables the control the video is about, capture from a real account instead.
- **A temporary account** on a local or staging stack: create it at the top of the script, and delete everything it made in the `finally` block, including when the capture throws. Use believable names. Stop if the temporary identity already exists, rather than filming someone else's leftovers.
- Never capture from production with real customer data on screen. Never put a real secret on camera; if the flow shows an API key or token, it must be one the script created and revokes.
- Remove workshop-only strings before the snapshot: demo notices, test-mode badges, dev toolbars. Add recurring ones to `strip` in `studio.json`. When a demo swaps a real string for a demo one, change the text node to what customers see and say so in your report.

## Pages that fight back

- **Navigation that finishes too fast to film.** To show a pending state, hold the app's data request with `context.route(...)`, snapshot, then release it.
- **Animations.** Snapshots freeze CSS animations and transitions. If a library animates with the Web Animations API, copy the computed value inline before `snap` (for example each element's computed `opacity`), or wait until it settles.
- **Canvas** becomes an image. **Open popovers and modal dialogs** are reopened when the snapshot loads. **Shadow DOM** is kept.
- **Scrolled containers** are not: `scrollTop` is lost. Set it again in the scene with `scrollEl(...)`.
- **Lazy content.** Scroll it into view and wait before the snapshot.
- **Iframes and video elements** are dropped. Film around them.

## Check the snapshots

```bash
cd render
bun verify-snaps.ts <id> /tmp/snaps     # renders every .html to a PNG
```

Compare a few against their real PNGs. A snapshot that differs from its screenshot will differ in the video too; fix it now. Missing fonts and images print as `missing <url>`.

Then find positions for the scenes:

```bash
bun boxes.ts <id> '03-form|#name' '05-added|#list li'
```
