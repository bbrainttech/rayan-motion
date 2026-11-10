# Studio

The toolkit behind the rayan-motion skill. The skill's `references/` folder has the full guides; this page is the map.

Needs Bun, ffmpeg, uv and Google Chrome. Run `bash setup.sh` once.

| Path | Holds |
|---|---|
| `studio.json` | Brand name, voice, music defaults, length limits, capture settings |
| `presets.json` | Platform sizes and their safe areas |
| `brand/` | Tokens from one colour, fonts, logos |
| `engine/` | The scene engine. `render(t)` draws any moment, so frames never drop |
| `render/` | Render, lint, capture, brand and device scripts |
| `audio/` | Voice, music, sound cues, mix, captions and checks |
| `comps/<id>/` | One piece: `index.html`, `make.py`, its captures and its outputs |
| `catalog.md` | This project's rules and the list of its pieces |
| `models/` | Voice and speech models, downloaded by `setup.sh` |

## One piece, start to finish

```bash
python3 comps/<id>/make.py                 # cuts, voice lines, music and sound cues
bun comps/<id>/capture.ts                  # screens from the running app, when it shows one
cd render
bun render.ts sheet <id> 2 6 10            # stills to look at
bun render.ts video <id> --draft           # a fast draft
bun lint.ts <id>
bun render.ts video <id>                   # the final silent render
bun render.ts poster <id>
cd ..
bash audio/build.sh <id>                   # voice, music, mix, captions and the final mp4
uv run --no-project --python 3.12 --with faster-whisper --with soundfile --with scipy python -I audio/check.py <id>
```

Start with `comps/logo-sting`. It renders in seconds.
