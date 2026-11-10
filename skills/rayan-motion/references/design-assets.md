# Design assets

Stills built with the same engine: social cards, Open Graph images, banners, announcement cards, store screenshots, slides and posters. A still is a composition with one scene of `dur: 0`.

`comps/social-kit` is the example. One layout reflows for 1200 × 630, 1080 × 1080, 1080 × 1920 and 1500 × 500.

## Making a set

1. Copy `comps/social-kit` to `comps/<id>`.
2. List the sizes in `comps/<id>/sizes.json`:

   ```json
   [
     { "name": "og", "size": [1200, 630] },
     { "name": "og-retina", "size": [1200, 630], "scale": 2 },
     { "name": "story", "preset": "vertical" },
     { "name": "x-header", "size": [1500, 500], "format": "jpg" }
   ]
   ```

   Each item has a `name`, a `size` or a `preset`, and optionally `scale`, `format` (`png` or `jpg`) and `at`, a time for pieces that also move.
3. Write one layout: type and spacing in `cqmin`, container queries for tall and wide frames, and padding from the safe area, `padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left)`, so text stays clear of what each platform covers ([formats.md](formats.md)).
4. `bun render.ts set <id>` writes `comps/<id>/out/<name>.png` for each size.
5. Open every file. Then lint each size: `bun lint.ts <id> --size 1500x500`.

## Common sizes

| Use | Size |
|---|---|
| Open Graph link preview | 1200 × 630 |
| Square post | 1080 × 1080 |
| Portrait post (4:5) | 1080 × 1350 |
| Story or vertical post | 1080 × 1920 |
| X header | 1500 × 500 |
| LinkedIn company banner | 1128 × 191 |

Platforms change these from time to time. Check the current guidance when an exact size matters.

## Design rules for stills

- **One message, one focal point.** A headline of eight words at most, one supporting line, the logo.
- **Readable small.** A feed shows a card at about 500 px wide. Render the smallest size and read it at that width.
- **Contrast.** Text passes WCAG AA against what is behind it; lint checks it.
- **Real screens.** A product image uses a real snapshot or a `piece()` crop of one, never a mock-up.
- **Margins.** Keep text out of the corners that platforms cover: a profile picture on a header, the buttons on a story.
- **PNG for flat colour and type, JPG** for photographic backgrounds or a platform with a file-size limit. `scale: 2` for a sharp image on high-density screens.

## Moving versions

Give the layers `data-a` entrances and the scene a duration, and the same file renders as a short video with `bun render.ts video <id>` and as the finished still with `set`, using `at` to pick the moment.

## Store screenshots

Device screenshots ([mobile.md](mobile.md)) in a `phoneFrame` with a headline above, rendered with `set` at the store's sizes. The screen inside the frame must be the real app.
