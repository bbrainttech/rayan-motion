# Exports

Render commands run from `studio/render`. Each one takes `--preset <name>` or `--size WxH`, and its output name gains that suffix, such as `teaser-vertical.mp4`.

| Command | Writes | For |
|---|---|---|
| `bun render.ts video <id>` | `build/video-silent.mp4`. The audio build turns it into `<id>.mp4` | Every piece with sound |
| `video <id> --draft` | `build/draft.mp4`, half size at 30 fps | Checking motion quickly |
| `video <id> --from 2 --to 6` | `build/range.mp4` | Re-checking one stretch |
| `video <id> --fps 30` | | A platform that asks for 30 fps |
| `video <id> --blur 4` | | Motion blur: each frame blends four moments. Slower to render, smoother on fast moves |
| `video <id> --scale 2` | | Twice the frame size, such as 3840 × 2160 from a 1080p layout |
| `video <id> --alpha [--webm]` | `<id>-alpha.mov` (ProRes 4444), and `<id>-alpha.webm` (VP9) | Overlays on other footage, or on a web page |
| `gif <id> [--width 720] [--fps 20]` | `<id>.gif` | Docs, READMEs, chats, slides that cannot play video |
| `loop <id> [--width 1280]` | `<id>-loop.mp4` and `<id>-loop.webm`, muted | Website heroes and backgrounds |
| `poster <id>` | `<id>.jpg` | A fallback image or a cover image |
| `still <id> [--at 1.5] [--scale 2] [--format jpg] [--alpha]` | `<id>.png` | One frame as an image |
| `set <id>` | Every size in `comps/<id>/sizes.json`, into `comps/<id>/out/` | Design assets ([design-assets.md](design-assets.md)) |
| `frames <id> <dir>` | Numbered PNGs | An editor that wants an image sequence |

`gif` and `loop` encode from the finished `<id>.mp4`, or the silent render when there is no audio build yet. Render the video first.

## Transparent video

`--alpha` hides every layer with the class `bg` and the progress rail, and keeps the rest. Build an overlay without a background, or give its background layers the class `bg`. The `.mov` carries no sound; give an editor `<id>-audio.wav` beside it. Check a still first: `bun render.ts still <id> --alpha`.

## On a web page

```html
<video autoplay muted loop playsinline poster="/media/hero.jpg">
  <source src="/media/hero-loop.webm" type="video/webm">
  <source src="/media/hero-loop.mp4" type="video/mp4">
</video>
```

Behind text, 960 to 1280 px wide is enough. Motion that covers less of the frame compresses smaller.

## Quality and colour

The final mp4 is a high-quality master: H.264 at CRF 14, BT.709, tagged so players show the colours as rendered. Platforms re-encode what you upload, so a large file is fine there. For your own site, use the `loop` files or re-encode.

## Handing off to an editor

- `<id>-alpha.mov` for overlays, or `frames` for an image sequence.
- The stems in `comps/<id>/build/`: `stem_vo.wav`, `stem_music.wav`, `stem_sfx.wav`, which add up to the mix before loudness and limiting.
- `<id>.vtt` for captions.
