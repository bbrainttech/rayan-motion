# Brand

Everything a piece takes from the brand lives in `studio/studio.json` and `studio/brand/`. Set it once per project, and every composition reads it.

## Ask for

- The product name, written exactly as the brand writes it.
- The brand colour as a hex value.
- The logo as SVG, in a version for light backgrounds and one for dark.
- The fonts, as files, with a license that allows use in video.
- The voice and the music the user wants: play them auditions ([audio.md](audio.md)).
- Words to use and words to avoid.

When the product has a website or a design system, read its tokens and match them: colour, type, radius and corner shape. A piece should look like it came from the same team.

## Colour

From `studio/render`:

```bash
bun brand.ts tokens "#2b7fff"                      # writes brand/tokens.css and brand/tokens.json
bun brand.ts tokens "#2b7fff" --accent "#d97800"   # a chosen accent instead of the computed one
bun brand.ts show                                  # prints the current palette
bun brand.ts contrast "#ffffff" "#2b7fff"          # the WCAG ratio and what it passes
```

`tokens` builds an eleven-step scale in OKLCH, from 50 to 950, on the brand's hue. It picks a primary that passes 4.5:1 on white and another that passes on the dark background, chart colours from the scale, and an accent that contrasts with the hue. Compositions use them through `--primary`, `--brand-50` to `--brand-950` and `--chart-1` to `--chart-5`. The scene tones (`emerald`, `amber` and the rest) stay fixed, so status colours keep their meaning.

## Type

`brand/brand.css` declares the fonts:

```css
@font-face { font-family: Gabarito; src: url(fonts/Gabarito-Variable.woff2) format('woff2'); font-weight: 400 900; }

:root {
  --font-display: Gabarito, system-ui, sans-serif;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
```

Put the brand's font files and their license in `brand/fonts/`, then change the `@font-face` rules and the three variables. List every face a piece uses under `fonts` in `studio.json`, such as `"700 16px Gabarito"`, so a render waits for each one to load. Lint fails when a font does not load.

## Logo

`brand/logo.svg` is for light backgrounds and `brand/logo-on-dark.svg` for dark ones. `logo(height)` places the image. `inline('/brand/logo-on-dark.svg')` puts the SVG into the page, so `drawOn()` can stroke its paths. A mark made of a few clean paths draws best; convert text in it to outlines.

## Shape

Surfaces use squircle corners where Chrome supports `corner-shape: squircle`, pill-shaped controls and hairline rings. The radius comes from `--radius`. Set it in `brand/brand.css` to match the brand, and every card, pill and keycap follows.

## `studio.json`

| Key | Meaning |
|---|---|
| `brand` | The product name; pages read it as `BRAND` |
| `hotwords` | Names the transcript check should expect to hear |
| `voice`, `lang`, `speed` | The default voice |
| `music` | The default `style`, `ending` and `seed` |
| `length` | The length range, in seconds, that a piece with a voice must fit |
| `fps` | The frame rate |
| `timezone`, `locale` | Used during capture, so dates and numbers come out the same on any machine |
| `fonts` | Font faces to load before rendering |
| `strip` | Selectors removed from captured snapshots: development overlays, toasts, badges |
| `chrome` | The path to Chrome, when it is not found on its own |

## The brand board

`comps/brand-board` lays out the palette, the tones, the type, the shapes, the easing curves and the logo on dark and light, on one 1920 × 1080 board. `bun render.ts still brand-board` writes `comps/brand-board/brand-board.png`. Show it to the user and agree on the brand before making pieces.
