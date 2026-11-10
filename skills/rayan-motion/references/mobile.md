# Mobile apps

When the product is a native app, film it from the iOS Simulator or an Android emulator. The screens are real device screenshots, shown in a phone frame or full-frame, with taps drawn over them. The same rules as the web apply: never redraw a screen, never invent a state.

## Connect to the device

1. **Boot a device with the app on it.** iOS: `open -a Simulator`, then install the user's development build. Android: start an emulator from Android Studio or with `emulator -avd <name>`, then install the build. Ask the user which device and build to use when it is not obvious.
2. **Find it.** `bun device.ts list` prints the running simulators and devices, and which tools are installed: `xcrun`, `adb`, `idb`, `maestro`. With more than one running, choose with `DEVICE=<id, name, ios or android>` in front of every command.
3. **Clean it.** `bun device.ts statusbar` sets 9:41, full battery and full signal. `bun device.ts appearance dark` or `light` picks the theme. Clear notifications and pick believable data, as for any capture.

## See the screen

You cannot see the device directly, so read it before every action:

- `bun device.ts tree` prints every element on screen with its box in points, its type and its text or label.
- `bun device.ts shot <comp> <name>` saves the screenshot and the element list. Open the PNG and look at it.

After each tap, take a shot and confirm the screen changed the way you expected before going on. A tap that misses fails silently.

## Drive it

| Command | Does |
|---|---|
| `tap <x> <y>` | Taps a point, in points as `tree` prints them |
| `text "Write the launch post"` | Types into the focused field |
| `swipe <x1> <y1> <x2> <y2> [ms]` | Swipes or scrolls |
| `key back`, `key home`, `key enter` | Presses a system key |
| `open <url>` | Opens a deep link or a web address |
| `launch <app id>` | Starts the app: the bundle id on iOS, the package name on Android |

Android needs only `adb`. The iOS Simulator cannot tap or type from a script without `idb` (`brew install idb-companion`, then `pipx install fb-idb`). Without it, reach each screen with a deep link, drive the flow with Maestro, or ask the user to tap through while you take the shots.

## Capture

`bun device.ts shot <comp> <name>` writes `comps/<comp>/screens/<name>.png` at full resolution and `<name>.json` with the screen size in points, the scale and every element's box. Number the shots in flow order: `01-home`, `02-new`, `03-typed`, `04-added`.

Capture every state a scene shows: the screen before the tap, any pressed state, and the screen after. Keep the keyboard up while typing happens, and capture the field empty, part-typed and full.

## Compose

A device screen goes in a window like a web snapshot, with the image name as the key and the screen size in points as the page size:

```js
const P = deviceScreen('01-home.png')                 // { width, height, scale, elements }
const MOBILE = { w: P.width, h: P.height }
const PHONE = { w: 360, h: Math.round(360 * P.height / P.width) }
persist.innerHTML = phoneFrame(screenWindow('m', { x: 0, y: 0, w: PHONE.w, h: PHONE.h }, ['01-home.png', '02-new.png', '04-added.png'], MOBILE), PHONE)

screens(() => {
  const m = win('m')
  const create = deviceBox('01-home.png', 'New task')  // matches text, label or id
  const fit = PHONE.w / MOBILE.w
  show(m, [[T1, '01-home.png'], [TAP + 0.05, '02-new.png', 0.12]])
  tap(m, TAP, create.cx, create.cy)
  camera(m, [[T1, MOBILE.w / 2, MOBILE.h / 2, fit], [TAP - 0.4, create.cx, create.cy, fit * 1.5, 'std']])
})
```

- A phone has no pointer. Call `tap()` on its own: it draws the touch ring without a cursor.
- A finger moves faster than a mouse. Show the ring, then the new screen 0.05 to 0.1 s later.
- Screenshots are at 2x or 3x, so zooming up to that factor stays sharp.
- Positions come from `deviceBox()`, so a re-capture that moves a button moves the tap with it.
- For a vertical piece, the phone screen can fill the frame: size the window to the stage and skip `phoneFrame`.

## Store previews

App Store and Play previews must show the app itself, and each store sets its own sizes and lengths. Check the store's current rules before rendering, and render with `--size` at the size they ask for.
