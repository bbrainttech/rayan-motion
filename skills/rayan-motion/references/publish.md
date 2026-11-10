# Publishing

A finished piece's folder holds:

| File | What it is |
|---|---|
| `<id>.mp4` | The video, H.264 with AAC, ready to upload |
| `<id>-<preset>.mp4` | Each other size rendered with `--preset`, such as `<id>-vertical.mp4` |
| `<id>.vtt` | Captions, made from the script and timed to the real voice |
| `<id>.jpg` | The poster: one frame of the video |
| `<id>-audio.wav` | The final mix, 48 kHz |

[export.md](export.md) covers the other outputs: transparent video, GIFs, web loops and stills.

## Poster

`build(S, { poster })` in `index.html` sets the poster's time, and `bun render.ts poster <id>` writes it. Choose a frame at rest that says what the piece is: usually the payoff, or the headline once it has landed. Use it as the video's fallback image on a web page, and upload it where a platform asks for a cover image.

## Captions

Every audio build writes `<id>.vtt`. Upload it with the video rather than relying on automatic captions; it is the script, so it is exact. For feeds that autoplay muted, burn the captions into the picture as well with `captions(LINES)` ([engine.md](engine.md)).

## `post.md`

Write one per piece, with the copy ready to paste:

- **Title**: what the viewer gets, in plain words.
- **Description**: two or three plain sentences on what the piece shows, any plan or role it needs, and a link to the product or its written guide.
- **Tags**: a few.
- **The platform's settings**, in the order its upload form asks for them, so publishing is a checklist: audience, language, captions file, cover image, visibility, and the synthetic-voice or altered-content disclosure where the platform has one.

## Per platform

- **A web page**: host the mp4 next to a poster. A hero or background loop goes in a muted, looping, inline `<video>` with the `render.ts loop` files ([export.md](export.md)).
- **Vertical feeds** (TikTok, Reels, Shorts, Stories) show a 16:9 video small. Render a vertical version instead ([formats.md](formats.md)).
- **Square and 4:5 feeds** (Instagram, LinkedIn, X) play muted first, so the picture and burned-in captions have to carry the piece.
- **Presentations**: the landscape mp4 with sound, or the GIF where a deck cannot play video.

## After publishing

Put the link in the piece's catalog row and mark it `live`. When a `stale` piece is re-rendered, replace the published file as well.
