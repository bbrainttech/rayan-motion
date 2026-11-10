# Formats

Every piece can render at any size. Named sizes live in `studio/presets.json`:

| Preset | Size | Safe area (top, right, bottom, left) | For |
|---|---|---|---|
| `landscape` | 1920 × 1080 | 5% on every side | YouTube, websites, docs, presentations |
| `vertical` | 1080 × 1920 | 14%, 7%, 20%, 7% | TikTok, Reels, Shorts, Stories |
| `square` | 1080 × 1080 | 7% on every side | Instagram, LinkedIn and X feeds |
| `portrait` | 1080 × 1350 | 7% on every side | Instagram and Facebook feeds (4:5) |

The vertical safe area is deepest at the bottom, where platforms put their captions and buttons. Add a preset for any platform you render to often:

```json
"og": { "size": [1200, 630], "safe": [0.08, 0.06, 0.08, 0.06], "use": "Open Graph link previews" }
```

## Choosing the size

- In the page: `frame('vertical')` or `frame(1200, 630)` before `build()`.
- On the command line: `--preset vertical` or `--size 1200x630` on any render command and on `lint.ts`. It overrides `frame()`.

## One composition for every size

The stage is a size container, so one layout can serve every format:

- Size type and spacing in `cqmin`, `cqw` and `cqh`, so they scale with the frame.
- Rearrange with container queries: `@container (aspect-ratio < 1 / 1) { ... }` for tall frames, `(aspect-ratio > 2 / 1)` for banners.
- In script, `STAGE` holds `w`, `h`, `format`, `tall` and `safe` (in pixels). Branch positions and camera moves on it.
- The class `safe` places an element on the safe area. For padding, `--safe-top`, `--safe-right`, `--safe-bottom` and `--safe-left` hold the same insets.

`comps/teaser` and `comps/social-kit` both work this way.

## Rendering several sizes

```bash
cd render
bun render.ts sheet teaser 1 4 8 --preset vertical --guides   # stills with the safe area drawn
bun lint.ts teaser --preset vertical
bun render.ts video teaser                                     # build/video-silent.mp4
bun render.ts video teaser --preset vertical                   # build/video-silent-vertical.mp4
bun render.ts video teaser --preset square
cd ..
bash audio/build.sh teaser            # muxes every silent render: teaser.mp4, teaser-vertical.mp4, teaser-square.mp4
uv run --no-project --python 3.12 --with faster-whisper --with soundfile --with scipy python -I audio/check.py teaser vertical
```

The sound is built once and shared, so every size has the same timing. Run the check once for each size.

## What changes between sizes

- **Vertical**: stack things that sat side by side. Keep the subject in the middle of the frame and the bottom fifth clear. Type can be larger, since the frame is narrow and the phone is close.
- **Square and portrait**: centre the composition. Lines that fit a wide frame need to break sooner.
- **Banners**: one line of type and the logo. Profile pictures often cover a corner, so keep it empty.
- **Product windows**: a 16:9 app is small in a vertical frame. Zoom the camera to the part that matters, or film a phone-sized view of the app ([showcases.md](showcases.md)).
- **Captions**: a muted feed needs captions in the picture. Keep them inside the safe area ([engine.md](engine.md)).

Platform limits on length and file size change often. Check the platform's current guidance before rendering for it.
