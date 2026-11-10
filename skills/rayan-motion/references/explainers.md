# Explainers

An explainer shows one task in a real product, from the first click to the result, with a voice. Most run 15 to 60 seconds. Copy `comps/explainer` and change it; it builds the whole shape below in 23 seconds.

## Before writing a line

Settle three things with the user:

1. **The task**, in the product's own words: "Add a task", not "Task management". One task per video. If it needs more than 60 seconds, split it into two videos.
2. **Where it plays.** That picks the ending and the size: a landing page, a docs page, an ad, a feed, a channel, a presentation.
3. **Who watches.** A visitor who has never seen the product needs the promise first. A customer who is stuck needs the steps.

## The shape

Four parts. Lengths are bars of the music (`s.bars(...)` in `make.py`), so every cut lands on a beat.

| Part | Bars | Picture | Voice |
|---|---|---|---|
| Hook | 1 to 2 | The promise in a few large words, with a fragment of the real result floating beside them | One line: the outcome |
| Product | 2 to 6 | The task in the real app, click by click, the camera close on each control | One short line per action, spoken as it happens |
| Payoff | 1 to 2 | The result lifted out of the app and held still, the rest pushed back | One line: what changed |
| Close | 1 to 2 | Depends on where it plays: see Endings | Optional |

`comps/explainer` uses `bars(2, 4, 2, 2)` at 104 BPM.

**Hook.** Something moves in the first frame. No logo intro, and no title card that announces the video. The headline is the benefit to the viewer. The fragment beside it comes from the real result (`piece()` crops it from a snapshot), so the promise points at what the viewer is about to see.

**Product.** Film each step the way a person does it: the pointer travels for 0.6 to 0.8 s, the hover state shows as it enters the control, it rests a moment, it presses, and the result appears 0.05 s later. Zoom to between 1.4 and 2.4 on the control and its surroundings, and hold the camera still while something changes. Cut over waiting and navigation the viewer already knows. Never speed footage up.

**Payoff.** Lift the element that changed out of the window with `piece()`, push the window back with `depth()`, and add one short caption. Hold the result for at least 1.5 s. This is the frame people remember, so it is usually the poster too.

**Close.** Pick it by where the video plays.

## Endings

Ask where the video will play, then pick one of these. An ending never points the viewer to another video unless the user asks for that.

| Ending | Plays on | Picture | Music ending |
|---|---|---|---|
| `cta` | Landing pages, ads, launch posts, sales decks | The promise, the address and the main button, pressed once | `button` |
| `logo` | Channel intros and outros, brand reels, presentations | The mark and a one-line tagline | `ring` |
| `result` | Docs, help centres, onboarding, changelogs | The finished screen, the result spotlit, the controls recapped as keycaps | `ring` |
| `loop` | Website heroes, autoplay previews, feeds that repeat | No closing card. The last frame returns to the first | `loop` |

`python3 comps/explainer/make.py <ending>` switches the example between them. It writes the ending into `index.html` too, so picture and sound always agree.

- **`cta`**: the button shows the product's real call to action and the real address. The cursor presses it on the music's final hit, which `s.button(BUTTON)` places.
- **`logo`**: the mark and one line. Nothing else competes with them.
- **`result`**: no pitch. The viewer came to learn the task, so show it finished. The keycaps name the controls in the order they were pressed.
- **`loop`**: these usually play muted, so the picture has to tell the whole story. The last frame must match the first exactly. The length must be a whole chord cycle: `s.write()` prints the nearest clean length when it is not. A voice is optional, and no line may run across the loop point. The example drops to `bars(2, 4, 1, 1)` for this.

## Timing

Define each event once, in beats from a cut, in both files:

```python
PRESS = T1 + 4.5 * s.beat        # make.py
```

```js
const PRESS = T1 + 4.5 * BEAT    // index.html
```

`s.page(BPM=s.bpm, ENDING=ENDING)` writes those values into the page's `const` lines, and `s.write()` rewrites `const CUTS`, so a change to a scene length moves the picture, the music and the voice together.

## The voice

- One line per action, said as the action happens. Name the control by its label on screen: "Press New task."
- Say what the viewer does, not why. Reasons and edge cases belong in the written docs.
- The default voice says about 17 characters a second at speed 1.0. A bar at 104 BPM (2.3 s) fits a line of about 30 characters.
- Use the words the interface uses, spelled its way. Write numbers and symbols as words when the voice might stumble on them.
- A scene does not need a line. A quiet payoff often lands harder.
- The audio build prints each line's start and end and flags `OVERLAP`. Fix every overlap: shorten the line, raise its speed a little, or give the scene another beat.

## The product on camera

- **Real screens only.** Use snapshots of the running app ([app-capture.md](app-capture.md)) or device screenshots ([mobile.md](mobile.md)). Crop them, zoom them, and leave out unrelated chrome. Never redraw a component, invent a state, or show a string the app does not show.
- **Believable data.** People's names, a company, a real-looking domain. No "test", "foo", lorem ipsum, demo banners, debug overlays or seed names that look fake.
- **Shipped features only.** If the task needs a plan, a role or a setting, show it as a chip in the hook or the product scene.
- **No secrets.** No real keys, tokens, emails or customer data, even blurred.

## A series

- Each video stands alone, with its own hook and close.
- Keep the voice, music style, tempo and ending the same across the set so it reads as one series.
- Put links between videos where they are published, such as a docs page or a description. Keep them out of the picture.
- Track the set in `catalog.md` ([catalog-template.md](catalog-template.md)).

## Keeping them true

- When a flow, screen or string that a video shows changes, mark the video `stale` in the catalog in the same change. Re-capture only the screens that differ and re-render.
- If a change only passes through the frame for a moment, ask the owner once before re-rendering a whole set.

## Accessibility

- Every audio build writes `<id>.vtt` captions from the script. Ship them with the video.
- The voice never carries information the picture lacks, and the picture never relies on colour alone.
- When the voice is synthetic, say so wherever the platform asks.
