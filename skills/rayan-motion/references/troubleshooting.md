# When something goes wrong

Lessons from making many of these. Find the symptom, apply the fix.

## Setup

| Symptom | Cause and fix |
|---|---|
| `Chrome not found` | Set `CHROME=/path/to/chrome`, or `"chrome"` in `studio.json` |
| `missing /studio.json` or a blank frame | The page was opened from the file system. Use `render.ts`, which serves the studio folder |
| The audio build stalls at the start | `uv` is fetching packages with no network. Run with `UV_OFFLINE=1` once they are cached |
| The speech check cannot find its model | The first run downloads it into `models/whisper`. It needs network once |
| A render is killed or the machine crawls | Too little memory or disk. Close the dev server and other browsers, keep several GB free, and run one heavy job at a time |
| A render leaves a short `video-silent.mp4` | It was interrupted. Delete it and render again |

## Capture

| Symptom | Cause and fix |
|---|---|
| A snapshot looks different from its PNG | A stylesheet, font or image failed to save. Run `verify-snaps.ts`; it prints `missing <url>` |
| Hover or focus styles are missing in the video | Capture the state: hover the element, wait 300 ms, then `snap`. The snapshot stores hover and focus as attributes |
| An element is half-faded in a snapshot | A script-driven animation was mid-flight. Wait longer, or copy the computed value inline before `snap` |
| A menu that was scrolled shows at the top | `scrollTop` is not saved. Set it in the scene with `scrollEl` |
| A dev overlay, cookie banner or chat bubble is on screen | Add its selector to `strip` in `studio.json`, or dismiss it with `open({ init })` |
| The click lands and the page changes before the snapshot | Hold the app's request with `context.route`, snapshot the pending state, then release |
| After a client-side navigation the old page is still in the DOM, hidden | Select visible elements only (`visible()` in scenes) |
| Dates or numbers differ between machines | Set `timezone` and `locale` in `studio.json` |
| A capture left test data behind | Its cleanup did not run. Put cleanup in `finally`, and make the script safe to run again |

## Scenes

| Symptom | Cause and fix |
|---|---|
| `bad spec` | A `data-a` value is malformed. The form is `kind@start/duration~ease` |
| `the pointer path misses` | `enters()` was given a path that never crosses the target. Check both end points are page pixels of the same snapshot |
| `nothing visible matches` | `box()` found no visible element. Check the selector against the snapshot with `boxes.ts`, and the scroll position |
| The camera will not centre on a point | Views are clamped to the page. Near an edge, the point sits off-centre; zoom less or accept it |
| Content below the fold cannot be framed | The camera only sees the 720 px viewport. Scroll the snapshot |
| A page's scroll effects throw `currentTime` errors | Scroll-driven CSS animations. Call `scrollLinked(win, key)` for that snapshot |
| The outgoing shot ghosts during a cross-fade | The camera moved while two snapshots were both visible. Hold the camera until the fade ends |
| Text looks soft at high zoom | It should not: snapshots are live DOM. If it does, that region is an image or canvas in the app |
| A dense table looks slightly different in `pairs` | Resampling at an odd scale. Compare at 2x zoom before deciding it is a real difference |
| `score.json does not match the scenes` | The cuts changed in one place only. Run `make.py` |
| Lint fails `determinism` | Something depends on the clock or on random numbers: use `seeded()`, `onFrame()` and `anim()`. One-pixel differences on moving edges are already tolerated |
| A window flashes bright as it leaves | Two animations change its `filter`. Keep the blur in `depth()` and leave with `outf` |
| A window from `piece()` stays blank | It was added inside `screens()` without its own `screens()` call, or `setup` did not return that call's promise |
| A scene's own animation (spinner, pulse) is frozen wrong | Set `win.since` or `win.sinceShot[key]` to the time that snapshot appears |

## Voice and sound

| Symptom | Cause and fix |
|---|---|
| A product name is mispronounced | Pass the line as phonemes ([audio.md](audio.md)) |
| A plural or possessive sounds wrong | Same: copy the printed phonemes and correct that word |
| The check hears a weak word wrong ("a" for "to") | Stress it in the phonemes (`tˌuː`) rather than rewording |
| The check fails on spelling only | Reword to the common spelling, or add the name to `hotwords`. Compounds flip with context, so re-run after any line changes |
| A homophone fails ("buy" for "by", "it's" for "its") | Rephrase so the word is unambiguous; keep the exact label on screen |
| True peak fails on the mp4 | Lower the cue under the loud syllable, or move it a few frames |
| A loop jumps or clicks at the seam | The length is not a whole chord cycle. Use the length `make.py` printed |
| The music sounds wrong for the piece | Audition the other styles with `bash audio/music.sh`, then change `style` |
| `OVERLAP` on a line | Shorten it or lengthen the scene by whole beats |
| A click sounds late or early | Cues go on the frame the animation lands. Use the same named moment in `make.py` and `index.html` |
| Building the audio muxed an old picture | `build.sh` uses whatever silent render exists. Render, then build |

## Process

- Read output, not exit codes. A pipeline ending in `| tail` hides a failed step.
- Send long logs to a file and read the part you need.
- Before a line says "the top one" or names a number, check the snapshot shows it at the filmed range and filters.
- When two agents work on one machine, give each its own folder and port, and put captures, renders and speech checks behind a simple lock so only one runs at a time.
- On macOS there is no `timeout` command; do not wrap a capture in it.
- Give `ffmpeg` `-nostdin` inside a shell heredoc, or it eats the rest of the script.
