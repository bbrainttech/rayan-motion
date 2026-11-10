# Checks before a piece is done

A piece is done when the picture matches the app, lint passes, the sound passes its measurements, and you have looked at the evidence yourself. Scripts exiting cleanly is not the evidence.

## 1. Picture against the real app

```bash
cd render
bun render.ts pairs <id> /tmp/pairs 6.2 8 11.5 15
```

For each time, every visible window is cropped from the rendered frame and stacked above the same region of the real screenshot. Open each image and compare top with bottom: text, spacing, colours, icons, states. They should be the same picture. Differences that come only from resampling look like faint noise; anything with a shape is real. Fix it in the capture or the scene.

Pick times that cover every snapshot the video shows at least once.

## 2. Contact sheet

```bash
bun render.ts sheet <id> 1.7 6.2 8 11.5 13.2 15 16.5 18.5
```

Four stills per sheet in `comps/<id>/stills/`. Read them in order as a viewer would:

- Does each step show what its voice line says, at the time the line is spoken?
- Is the pointer on its target at every tap?
- Is anything clipped by the crop, or hidden behind a caption?
- Does anything show that only a developer would see?
- Does the hook show the result it promises, and does the close suit where the piece plays?
- For a loop, does the last frame match the first?

## 3. Lint

```bash
bun lint.ts <id>                      # add --preset vertical to lint another size
```

| Check | Fails when |
|---|---|
| `errors` | The page threw or logged an error |
| `files` | A file the page asked for is missing |
| `fonts` | A font failed to load |
| `determinism` | A frame rendered twice comes out different. Edges that move by one pixel are tolerated; a real difference means something reads the clock or `Math.random()` |
| `design` | Text is cut off, outside the safe area, too small, low in contrast or too dense |

Fix every failure and read every warning.

## 4. Render and build

```bash
df -h .                               # a render wants a few GB free
bun render.ts video <id>              # warns when score.json and the scenes disagree
bun render.ts poster <id>
cd .. && bash audio/build.sh <id>
```

Re-render after any scene change. `build.sh` muxes whatever `build/video-silent.mp4` exists, even an old one.

## 5. Measurements

```bash
uv run --no-project --python 3.12 --with faster-whisper --with soundfile --with scipy python -I audio/check.py <id>
```

| Check | Passes when |
|---|---|
| `picture` | The mp4 is the frame size and frame rate set for the studio |
| `length` | Inside the studio's limits and equal to the scenes' total |
| `loudness` | -14 LUFS integrated, within 0.5 |
| `true peak` | At or under -1.5 dBTP |
| `transcript` | A speech-to-text pass over the final audio matches the script word for word |

The transcript check is strict on purpose: it catches a mispronounced product name, a clipped last word and a line buried under an effect. When it fails, it prints the script words against the heard words.

- A real mispronunciation: fix it with phonemes ([audio.md](audio.md)).
- A spelling difference only ("signup" against "sign up", "real time" against "realtime"): prefer rewording the line to the spelling the listener would write, or the spelling the interface uses. Add coined names to `hotwords` in `studio.json`.
- A word heard wrong only when music sits under it: lower the cue there, or move it.
- A transcript pass does not carry over. After retiming or re-voicing, run it again.

## 6. Watch it

Play the mp4 once start to finish with sound. Scripts do not notice a camera that moves too much, a pointer that wanders, or a voice line that arrives before its picture.

## Reporting

Say what you made and what you checked: length, which checks passed, anything that failed with its output, any place the app looked wrong on camera, and what cleanup ran. If a check was skipped, say so.
