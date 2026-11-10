# rayan-motion

An agent skill that turns a coding agent into a motion and design studio. It films your real app, moves a camera and a pointer over it, adds a voice, music and sound, and renders the video on your machine. It also makes logo animations, launch teasers, product showcases, social images and a brand kit from one colour.

Everything runs locally. There is no video editor, no screen recorder and no paid service, and nothing leaves your machine.

## What it makes

- **Explainers**: one task in your product, click by click, with a voice. The ending depends on where the video plays: a call to action for a landing page, the finished result for docs, a seamless loop for a hero.
- **Mobile explainers**: the same, filmed from the iOS Simulator or an Android emulator.
- **Motion graphics**: logo stings, launch teasers, kinetic type, animated numbers and charts, overlays with a transparent background.
- **Product showcases**: your screens in browser and phone frames, with depth, callouts and hero loops.
- **Design assets**: social cards, Open Graph images, banners and store shots in every size you need.
- **Brand kits**: a full palette and tokens from one colour, type, logo tiles and a brand board.

Each piece can render in any platform size: landscape, vertical, square, 4:5 portrait or a custom size, each with its own safe area.

## How it works

1. A composition is a web page, and every frame is a function of time. The renderer asks Chrome for one frame after another and encodes them, so no frame drops, text stays sharp at any zoom, and a change is one re-render away.
2. Product screens come from the running app as DOM snapshots or device screenshots. They are never redrawn.
3. The voice is spoken locally with Kokoro. Music is generated for each piece in one of four styles, and its chords, builds and ending follow the cuts. The sound effects play in the music's key.
4. Checks lint every piece for cut-off text, safe areas, contrast and frames that differ between renders, then measure loudness and true peak and transcribe the final audio against the script.

## Install

With the [skills CLI](https://skills.sh), which asks which of your agents to install it for:

```bash
npx skills add bbrainttech/rayan-motion
```

Add `-g` to install it for your user instead of the current project.

Or copy the folder yourself:

| Agent | Put `skills/rayan-motion/` in |
|---|---|
| Claude Code | `~/.claude/skills/` for every project, or `.claude/skills/` in one project |
| Codex | `~/.codex/skills/`, or point to `skills/rayan-motion/SKILL.md` from your `AGENTS.md` |
| Claude apps | Zip the folder and upload it under Skills in Claude's settings |

Rendering needs a shell with the tools below. Claude Code and Codex on your machine have one. In a Claude chat without a shell, the skill still plans pieces, writes compositions and reviews stills you render, and it says when a step needs a machine.

Then ask your agent something like:

- "Make a 25-second explainer of adding a task in our app, for the landing page."
- "Turn our logo into a 4-second sting with a transparent background."
- "Make Open Graph and X cards for the launch post in our brand colours."

## What you need

- [Bun](https://bun.sh), [ffmpeg](https://ffmpeg.org), [uv](https://docs.astral.sh/uv/) and Google Chrome
- About 1 GB of disk for the voice and speech models, plus a few GB free while rendering
- For product pieces, a running copy of your app: local, staging or a public demo. For mobile, Xcode's Simulator or the Android emulator

`studio/setup.sh` checks all of it and downloads the voice model.

## What is inside

```
skills/rayan-motion/
  SKILL.md        the workflow your agent follows
  references/     motion principles, the engine, explainers, capture, mobile, audio,
                  formats, brand, design assets, export, checks, troubleshooting
  studio/         the toolkit, copied into your project once
    studio.json   brand name, voice, music, length limits
    presets.json  platform sizes and safe areas
    brand/        tokens from one colour, fonts, logos
    engine/       the time-driven scene engine: windows, camera, pointer, typing, charts
    render/       render, lint, capture, brand tokens, simulator control
    audio/        voice, music, sound, mix, captions, checks
    comps/        six examples: explainer, teaser, logo sting, showcase, social kit, brand board
```

## Make it yours

Set the brand name, voice and music in `studio/studio.json`, then turn your brand colour into a palette with `bun brand.ts tokens "#2b7fff"` in `studio/render`. The [brand guide](skills/rayan-motion/references/brand.md) covers fonts, logos and every setting.

## Credits

Voice by [Kokoro](https://github.com/hexgrad/kokoro) through [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). Speech check by [faster-whisper](https://github.com/SYSTRAN/faster-whisper). Browser control by [Playwright](https://playwright.dev). Each has its own license. The models download on first use and are not part of this repository.

## License

MIT. See [LICENSE](LICENSE).
