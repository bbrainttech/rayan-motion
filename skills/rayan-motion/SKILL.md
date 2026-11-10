---
name: rayan-motion
description: A motion and design studio that runs on your machine. Makes explainer videos from the real running app (web, or a mobile app through the iOS Simulator or Android emulator), motion graphics, logo stings, launch teasers, product showcases with device frames, and still design assets such as social cards, banners and brand boards, in any platform size (landscape, vertical, square, portrait or custom). Includes synthetic voice with selectable voices, generated music and sound effects, captions, brand tokens from one colour, design lint, and exports to MP4, transparent video, GIF, web loops and PNG. Use when asked for a product video, tutorial, feature walkthrough, promo, teaser, motion design, animation of a logo or type, a showcase or hero video, social or Open Graph images, a brand kit, or to re-render any of these after the product changed. Needs a shell with Bun, Chrome, ffmpeg and uv.
---

# rayan-motion

A studio for moving and still design work, built on one idea: **every frame is a function of time, drawn by a real browser.** A composition is a web page. The renderer asks it for frame after frame and encodes them, so nothing drops, text stays sharp at any zoom, and a change is one re-render away. Product screens are captured from the real running app, never redrawn.

The toolkit is `studio/`, next to this file. Copy it into the project once and work inside the copy.

Work at the level of a design engineer: decide what the piece says before animating, follow [references/motion-principles.md](references/motion-principles.md), look at your own stills, and report what you verified.

## What it makes

| Job | Start from | Read |
|---|---|---|
| Explainer: how to do one task in a product, with voice | `comps/explainer` | [explainers.md](references/explainers.md), [app-capture.md](references/app-capture.md) |
| The same for a mobile app | `comps/explainer` with device screens | [mobile.md](references/mobile.md) |
| Logo sting, launch teaser, kinetic type, data story, overlay, loop | `comps/logo-sting`, `comps/teaser` | [motion-graphics.md](references/motion-graphics.md) |
| Product showcase with browser and phone frames | `comps/showcase` | [showcases.md](references/showcases.md) |
| Stills: social cards, Open Graph images, banners, store shots | `comps/social-kit` | [design-assets.md](references/design-assets.md) |
| Brand kit: palette from one colour, type, logo, brand board | `comps/brand-board` | [brand.md](references/brand.md) |
| The same piece for several platforms | any | [formats.md](references/formats.md) |

Every job also uses [engine.md](references/engine.md) (how to write a composition), [audio.md](references/audio.md) when it has sound, [checks.md](references/checks.md) before it is done, and [export.md](references/export.md) for the files.

## Before the first piece

1. **Copy the studio** from this skill into the project, for example to `media/studio/`. Ask where if there is no obvious place. Suggest ignoring renders in version control; the studio ships a `.gitignore` for it.
2. **Run `bash setup.sh`** in the copy. It checks for Bun, ffmpeg, uv and Chrome, installs one dependency and downloads the voice model (about 340 MB).
3. **Prove the toolchain** with a bundled example before touching the real work:

   ```bash
   python3 comps/logo-sting/make.py
   (cd render && bun render.ts video logo-sting && bun lint.ts logo-sting)
   bash audio/build.sh logo-sting
   uv run --no-project --python 3.12 --with faster-whisper --with soundfile --with scipy python -I audio/check.py logo-sting
   ```

   Every line should print `PASS` or `SKIP`. If one fails here, fix the machine first: [troubleshooting.md](references/troubleshooting.md).
4. **Brand it.** Ask the user for the product name, brand colour, logo and fonts, then follow [brand.md](references/brand.md). One command turns a brand colour into the whole palette.
5. **Ask what you cannot guess**: where the piece will play, which sizes, voice or no voice and which voice, and for product pieces, how to reach a running copy of the app. Where it plays decides how it ends: a call to action, the logo, the finished result or a seamless loop ([explainers.md](references/explainers.md)).

## The loop for any piece

1. **Brief in one line**: what it says, for whom, where it plays, how it ends, how long, which sizes.
2. **Outline the scenes** with their lengths in beats. For anything longer than a few seconds, show the outline to the user before building.
3. **Capture** product screens if the piece shows the product.
4. **Compose** `comps/<id>/index.html` on a copy of the nearest example.
5. **Block with stills.** `bun render.ts sheet <id> <times>` and look at them. Get every resting frame right before tuning motion.
6. **Draft.** `bun render.ts video <id> --draft` is fast. Watch the motion.
7. **Sound**: `comps/<id>/make.py` holds the cuts, the voice lines, the music style and ending, and the sound cues. Play the user music and voice auditions before choosing ([audio.md](references/audio.md)).
8. **Lint**: `bun lint.ts <id>`. Fix failures; read every warning.
9. **Final render, audio build, checks.**
10. **Export** the formats asked for, and report what passed.

## Rules that do not bend

- **The real product.** Product screens come from snapshots or device screenshots of the running app. Crop and zoom freely. Never redraw a component, invent a state, or show a string the app does not show. If the app looks wrong on camera, film it as it is and tell the user.
- **Deterministic frames.** No `Math.random()`, no clock, no free-running CSS animation in a composition. Use `seeded()`, `onFrame()` and `anim()`. `lint.ts` renders frames twice and fails the piece if they differ.
- **True claims.** Numbers, charts and quotes in a piece are real or supplied by the user.
- **Cuts land on the beat.** Set scene lengths with `s.bars()` or `s.beats()` in `make.py`; it refuses a scene that is not whole beats. `s.seconds()` leaves the grid for pieces where the music need not follow the cuts.
- **The ending fits the use.** A piece ends the way its platform needs: a call to action, the logo, the result or a loop. Never end on a pointer to another piece unless the user asks for one.
- **Look before you claim.** Never call a piece finished from scripts exiting cleanly. Read the contact sheet, the lint and the checks, and say plainly what failed or was skipped.
- **Clean up.** A capture that creates accounts or data removes them in a `finally` block. Never put a real secret or real customer data on camera.

## Commands

From the studio folder. Render commands run from `render/`. Every render mode takes `--preset <name>` or `--size WxH`.

| Command | What it does |
|---|---|
| `bun render.ts sheet <id> 1.5 6 10` | Contact sheets of those moments, in `comps/<id>/stills/` |
| `bun render.ts video <id> [--draft]` | The silent video. `--draft` is half size at 30 fps |
| `bun render.ts still <id>` / `set <id>` | One still, or every size in `sizes.json` |
| `bun render.ts pairs <id> <dir> 6 12` | Each app window above its real screenshot |
| `bun render.ts poster <id>` | `comps/<id>/<id>.jpg` |
| `bun render.ts video <id> --alpha` | Transparent ProRes 4444, plus `--webm` |
| `bun render.ts gif <id>` / `loop <id>` | A GIF, or small muted web loops |
| `bun lint.ts <id>` | Errors, determinism, cut-off text, safe area, contrast, density |
| `python3 comps/<id>/make.py` | Writes `score.json` and `lines.json`, updates `CUTS` and the page's constants. The explainer takes an ending: `make.py result` |
| `bash audio/music.sh [style]` | Auditions of the music styles in `auditions/` |
| `bash audio/build.sh <id>` | Voice, music, effects, captions, loudness, final `.mp4` |
| `uv run ... audio/check.py <id> [format]` | Size, frame rate, length, loudness, true peak, transcript |
| `bash audio/voices.sh list` / `audition` | The voices, and sample clips to choose from |
| `bun brand.ts tokens "#2b7fff"` | The palette and tokens from one brand colour |
| `bun device.ts list` / `shot` / `tap` | See and drive an iOS Simulator or Android emulator |
| `bun comps/<id>/capture.ts` | Walk a web app and save its screens (from the studio folder) |

## Working well

- **One heavy job at a time.** Captures, renders and the speech check each start Chrome or a model. On a small machine, never overlap them, and check free disk before a final render.
- **Iterate on stills and drafts.** A still takes a second, a draft seconds, a final render minutes.
- **Change timing in one place.** Move a cut in `make.py`, run it, and picture, music and voice follow.
- **Copy the newest finished piece** when starting another for the same product. Its helpers already fit.
- **When the product changes**, mark the pieces that show the changed screen `stale` in `catalog.md`, and re-capture only what differs.

## Where this runs

Any agent with a shell: Claude Code, Codex, and Claude with a computer or code environment that has Bun, Chrome, ffmpeg and uv. In a chat with no shell, the skill still helps plan the piece, write the composition and the scripts, and review stills the user renders; say clearly that rendering needs a machine.

## Reference files

| File | Read it when |
|---|---|
| [motion-principles.md](references/motion-principles.md) | Before designing anything that moves |
| [engine.md](references/engine.md) | Writing a composition: scenes, motion, type, charts, windows, cameras |
| [explainers.md](references/explainers.md) | Planning and scripting explainers, choosing their ending, keeping a series true |
| [app-capture.md](references/app-capture.md) | Capturing a web app |
| [mobile.md](references/mobile.md) | The product is a mobile app |
| [motion-graphics.md](references/motion-graphics.md) | Stings, teasers, kinetic type, data stories, overlays, loops |
| [showcases.md](references/showcases.md) | Device frames, 3D, callouts, hero loops |
| [design-assets.md](references/design-assets.md) | Stills in many sizes |
| [brand.md](references/brand.md) | Name, colour, fonts, logo, voice, every setting |
| [formats.md](references/formats.md) | Platform sizes and safe areas |
| [audio.md](references/audio.md) | The score API, music styles, energy and endings, sound cues, voices, pronunciation |
| [export.md](references/export.md) | Output files and flags |
| [checks.md](references/checks.md) | Verifying a piece |
| [publish.md](references/publish.md) | Poster, captions, post copy |
| [catalog-template.md](references/catalog-template.md) | Tracking many pieces |
| [troubleshooting.md](references/troubleshooting.md) | Something looks or sounds wrong |
