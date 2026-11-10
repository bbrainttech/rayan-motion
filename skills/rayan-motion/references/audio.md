# Voice, music and sound

`bash audio/build.sh <id>` does all of it. It speaks the lines, generates the music and the sound cues, mixes them, sets loudness to -14 LUFS under a true-peak ceiling, writes captions, and muxes the result with the silent render into `<id>.mp4`.

The build reads `lines.json` and `score.json`, which `comps/<id>/make.py` writes. Edit `make.py`, never the JSON.

## `make.py`

```python
import sys
from pathlib import Path

here = Path(__file__).parent
sys.path.insert(0, str(here.parent.parent / 'audio'))
from scorekit import Score

s = Score(here, style='glass', ending='ring')
T0, T1, T2, T3, END = s.bars(2, 4, 2, 2)     # scene lengths in bars; returns the cuts
PRESS = T1 + 4.5 * s.beat                    # events in beats from a cut

s.line(0, 'Capture a task before it slips away.')
s.line(1, 'Press New task.', after=0.45)
s.arc(0, 2, 3, 1)                            # music energy, one level per scene
s.on_cuts('swipe')                           # a swipe into every cut
s.cue('tap', PRESS)
s.page(BPM=s.bpm)                            # values the page reads
s.write()
```

`s.write()` checks the timing and writes both JSON files. It also rewrites `const CUTS = [...]` in `index.html`, plus a `const NAME = ...` line for every value given to `page()`, so the picture and the sound use the same numbers. It stops with a message when something does not fit: a scene that is not a whole number of beats, a line outside the video, an unknown sound or option.

### `Score` options

Each one falls back to `studio.json`, then to the default shown.

| Option | Default | Meaning |
|---|---|---|
| `style` | `glass` | Music style (below), or `none` |
| `ending` | `ring` | How the music ends (below) |
| `bpm`, `key`, `minor` | the style's own | Tempo and key. Scene lengths must be whole beats at the new tempo |
| `seed` | `11` | Changes the details: grains, ghost notes, which bells ring. The harmony stays the same |
| `music_db` | `0` | Music level against its default, in dB |
| `track`, `repeat` | | A licensed audio file to use as the music, looped when `repeat` is true |
| `voice`, `lang`, `speed` | `af_bella`, `en-us`, `1.0` | The voice for every line |
| `voice_from` | | Reuse the spoken voice of another piece with identical lines |
| `lead` | `0.3` | Seconds into its scene before a line starts |
| `length` | `[20, 60]` with a voice, otherwise any | The length range the checks accept |
| `size`, `fps` | `[1920, 1080]`, `60` | What the picture check expects |
| `loudness` | `True` | `False` sets the peak instead of loudness, for sparse pieces such as a silent overlay |

### Methods

| Call | Does |
|---|---|
| `bars(*n)`, `beats(*n)`, `seconds(*n)` | Set the scene lengths and return the cuts: each scene's start, then the end. Bars may be fractions that make whole beats, such as `1.5`. `seconds` leaves the beat grid, so the music no longer changes on the cuts |
| `beat`, `bar` | One beat and one bar in seconds at this tempo |
| `line(scene, text, after=, at=, speed=, voice=, lang=, ipa=, file=, pan=)` | A voice line in a scene |
| `energy(at, level)`, `arc(*levels)` | Music energy from a time on, or one level per scene |
| `cue(name, at, gain=, pan=, **options)` | One sound at a time |
| `on_cuts(name='swipe', before=0.3)` | The same sound just before every cut. Swipes alternate up and down |
| `lift(at, d=)` | A riser that ends on `at`, then a deep hit on it |
| `button(at)` | Where a `button` ending lands |
| `page(**values)` | Values written into `index.html` as `const NAME = value` |
| `write()` | Writes everything |

## Music

Generated on your machine, so there is nothing to license. Hear every style first:

```bash
bash audio/music.sh                       # all four, energy rising 0 → 3 over eight bars
ENDING=button bash audio/music.sh pulse   # one style with one ending
```

The clips land in `auditions/music-<style>-<ending>.wav`.

| Style | Tempo and key | Sound | Fits |
|---|---|---|---|
| `glass` | 104, A♭ major | FM bells in a 3-3-2 rhythm, airy pads, a felt kick and a shaker in half time | Explainers, walkthroughs, calm launches |
| `pulse` | 124, F minor | A rolling sixteenth-note saw bass, claps on two and four, chord stabs, snare-roll builds and a pumping mix | Teasers, trailers, ads, fast social cuts |
| `lofi` | 82, E♭ major | Swung electric piano chords, a plucked upright bass, dusty drums, tape wobble and vinyl crackle | Showcases, product tours, relaxed reels |
| `air` | 66, E major | A slowly beating drone, wide shimmer pads and high sparkles, no drums | Logo stings, brand films, ambient loops, under a long voice |
| `none` | | No music | Voice and effects only, or music added in an editor later |

Chords move to the nearest voicing of the next one, so changes sound smooth at any length.

### Energy

Energy runs from 0 to 3 and changes on the nearest bar line.

| Level | Adds |
|---|---|
| 0 | The bed: pads, a drone or a single strum |
| 1 | Melody and bass |
| 2 | The beat |
| 3 | The top layer: counter-melodies, stabs, open hats, a heartbeat |

Rising to 2 or more brings a build in the bar before: a swell, or a snare roll in `pulse`. Without `arc()` or `energy()`, a piece plays at 1 under its first scene and 2 after; a loop or a one-scene piece stays at 2. Shape it with the story: low under a hook, high under the payoff, lower again under a calm close.

### Endings

| Ending | What the music does | Use it for |
|---|---|---|
| `ring` | The rhythm stops on a bar line and the home chord rings out over the last seconds | Most pieces: explainers, logos, a result |
| `button` | Everything lands on one hit, then silence. `s.button(t)` places the hit; by default it falls on the last cut, or 1.5 s before the end | A call to action, a teaser, a logo slam |
| `loop` | The tail wraps into the start, so the file repeats without a seam | Hero videos, backgrounds, feeds that repeat |
| `fade` | Fades out over the last bars | Long pieces, or a final frame that holds still |

For a loop, make the length a whole chord cycle: four chords of one bar each for most styles, two bars each for `air`. `s.write()` prints the nearest clean length when it is off.

### Music you supply

`Score(here, track='music/song.wav', repeat=True)`. The file is level-matched like generated music and ducks under the voice the same way. The `ending` still applies, so `fade` and `loop` work on it. Use only music you have a license for.

## Sound cues

Every sound is generated, and the pitched ones play in the music's key. Gains are set to sit under the voice; pass `gain=` to change one. Place a sound on the frame its animation lands, not the frame it starts. Two or three cues a scene is plenty.

| Sound | For | Options |
|---|---|---|
| `tap` | A press on a button or card | `tone`, a pitch multiplier |
| `latch` | A toggle or checkbox locking into place | |
| `pop` | Something small appearing: a chip, a badge, a dot | `deg`, `octave`, `note` |
| `snap` | A word or number landing | |
| `keys` | Typing on a mechanical keyboard | `dur`, `n` keystrokes |
| `count` | A counter ticking up, slowing as it lands | `dur`, `n` ticks |
| `swipe` | A scene or panel change | `d`, `dir` (`up` or `down`) |
| `air` | A soft move: a card drifting, a camera pan | `d` |
| `slide` | A sheet or card sliding in and settling | `d` |
| `glitch` | Scrambled text, a burst of data | `d` |
| `ding` | A success | `deg`, `octave`, `note` |
| `shimmer` | A reveal: five quick notes in key | `octave` |
| `rise` | Tension that ends on its cue time. Use `lift()` | `d` |
| `drop` | A deep hit for the biggest moment. Use `lift()` | `d` |

`deg` is a degree of the scale, 1 to 7. `note` is a MIDI note number and ignores the key. `rise` and `drop` play with the music, so they duck under the voice with it.

## Voices

The default voice is `af_bella`, an American English voice. Change it for every piece in `studio.json` (`voice`, `lang`, `speed`), for one piece with `Score(voice=...)`, or for one line with `s.line(..., voice=...)`.

```bash
bash audio/voices.sh list                                       # every voice, by language
bash audio/voices.sh audition                                   # samples of a few strong voices
bash audio/voices.sh audition "Your line here." am_michael bf_emma
bash audio/voices.sh audition "Your line here." "af_bella:0.6+af_nova:0.4"   # a blend
```

Samples land in `auditions/`. Play them to the user and let them choose. A blend like the last one works anywhere a voice name does.

A recorded human voice works too: `s.line(1, 'Press New task.', file='vo/02.wav')`. The clip is placed and processed like the synthetic voice, and `text` still feeds the captions and the transcript check.

## Writing lines

- The default voice says about 17 characters a second at speed 1.0. Speeds from 0.95 to 1.1 sound natural; faster reads as rushed.
- A line has to end before the next one starts. The build prints every line's start and end and flags `OVERLAP`.
- Use the words on screen, spelled the way the interface spells them.

## Pronunciation

The build prints each line's phonemes:

```
01  1.05s  af_bella  Press New task.  /pɹˈɛs nˈuː tˈæsk./
```

Read them. When a word comes out wrong, usually a product name, pass the whole line's phonemes with `ipa=`. Copy the printed phonemes and change only the wrong word:

```python
s.line(1, 'Open Acmely in the sidebar.', ipa='ˈOpən ˈækmli ɪn ðə sˈIdbɑɹ.')
```

Stressing a weak word (`tˌuː` for "to") also fixes a word the transcript check mishears. The caption still shows the plain text.

## The mix

- The voice is cleaned, levelled and lightly compressed. The music and the reverb duck under it and come back up between lines.
- Each style has its own room, and sounds send to it by type.
- The final mix is set to -14 LUFS integrated with a true-peak limiter, so it survives AAC encoding under -1.5 dBTP.
- `comps/<id>/build/` keeps the stems for a manual remix: `stem_vo.wav`, `stem_music.wav`, `stem_sfx.wav`. `voice.json` holds each line's real start and end.

## When the mix misbehaves

- **True peak over -1.5 dBTP** in the mp4: a cue is probably landing on a loud syllable. Lower that cue's `gain` or move it a few frames.
- **Music too loud or too quiet** under the voice: `music_db=-2` or `music_db=2`.
- **A line overlaps the next**: shorten it, raise its speed to 1.05, or give the scene another beat.
- **A loop clicks or jumps** at the seam: the length is not a whole chord cycle. Use the length `s.write()` printed.
- **A second version with the same lines**, such as a vertical cut built as its own composition: `Score(..., voice_from='<id>')` reuses that piece's voice instead of speaking it again. A vertical render of the same composition needs nothing extra: [formats.md](formats.md).
- **The build stalls fetching Python packages** while offline: run it with `UV_OFFLINE=1`.
