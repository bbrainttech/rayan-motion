# Motion graphics

Pieces with no app walkthrough: logo stings, launch teasers, kinetic type, data stories, announcements, lower thirds, loops. Read [motion-principles.md](motion-principles.md) first, then build on [engine.md](engine.md).

## How to work

1. **Brief in one line.** What it says, where it plays, how long, with or without sound, which sizes.
2. **Storyboard in words.** List the scenes with their lengths in beats and what lands in each. Show the user before building when the piece is more than a few seconds.
3. **Copy the nearest example**: `comps/logo-sting`, `comps/teaser` or `comps/showcase`.
4. **Block it with stills.** Get every scene's resting frame right before tuning motion: `bun render.ts sheet <id> <times>`.
5. **Tune motion on a draft.** `bun render.ts video <id> --draft` renders half size at 30 fps in a fraction of the time. Watch it.
6. **Sound.** `make.py` with a music style, an ending and a few cues ([audio.md](audio.md)). Audition the styles with `bash audio/music.sh` before choosing.
7. **Lint, final render, checks, exports** ([checks.md](checks.md), [export.md](export.md)).

## Recipes

### Logo sting, 3 to 6 seconds

`comps/logo-sting`. Shape: approach, hit, hold.

- Draw the mark on with `drawOn`, 0.9 s.
- The hit: the mark settles from 94% scale with a small overshoot, a glow blooms behind it once, and `s.lift(HIT)` lands a riser into a deep hit with a `ding` on top.
- The tagline blurs in letter by letter 0.35 s later. Hold at least 1.5 s.
- Music `air` with a `ring` ending: a drone that opens up into the hit and rings out under the hold.
- Export also with `--alpha` so it can sit on any footage.

Replace `brand/logo-on-dark.svg` and `brand/logo.svg` with the real logo first. A mark built from a few clean paths draws best; outline text to paths, or let it fade in.

### Launch teaser, 10 to 20 seconds

`comps/teaser`. Shape: claim, proof, proof, call to action.

- **Claim**: an eyebrow, a one-line wordmark in the heaviest weight whose letters blur in 75 ms apart, then a second line that takes the highlight.
- **Proof**: three cards with numbers that count up and a small chart, in their own tone, entering with a `blur` transition.
- **Proof**: one drawn chart with a single labelled point, entering with a push.
- **Call to action**: a closing card on a dot grid with plus-mark corners and a glow from below: a status chip, a gradient heading, the address. Confetti only if the news deserves it.
- The teaser lays itself out for landscape, vertical and square from one file ([formats.md](formats.md)).
- Music `pulse` with a `button` ending, energy at 3 from the first proof, and `s.lift(T3)` into the call to action.

### Kinetic typography

Words are the picture. One idea per scene, six words at most.

- Mix scales hard: a 170 px line against a 20 px label.
- Keep `blur` as the entrance; vary by unit (letters, words, whole lines), not by effect.
- Cut on the beat, and let one word land per beat when a line is the hook.
- Use `mark()` or a gradient (`grad`) on the one word or line that matters.

### Data story

One number per scene. Count it up (`data-count`), then show what it means (a bar, a ring, a line) and hold. Label everything; say the unit and the period. Never animate a chart axis to exaggerate.

### Lower third and overlays

A single scene with no background layers, rendered with `--alpha`:

```js
S.push({ dur: 4.8, html: () => `
  <div class="abs card sq-xl" style="left: 96px; bottom: 120px; padding: 24px 34px" data-a="blur@0.2 outb@4.3">
    <div class="h" style="font-size: 42px">${type('Maya Chen', 0.35)}</div>
    <div class="micro" data-a="fade@0.7" style="margin-top: 10px">Head of Product</div>
  </div>` })
```

### Seamless loop

For a hero background or a sticker. Make the last frame equal the first: animate out to the starting state in the final beat, or drive the motion from `onFrame` with a function that repeats over the piece's length. Score it with `ending='loop'` and a length of whole chord cycles, so the sound loops too. Export with `render.ts loop` or `gif`.

### Announcement card with motion

A still design ([design-assets.md](design-assets.md)) plus two seconds of entrance makes a post that moves. Build the still first, then add `data-a` to its layers.

## Making it feel designed

- Set margins once (150 px at 1080p works) and keep every scene on them.
- Give each scene a tone and one background recipe: a `glow` with masked `dots`, or an `aurora` for covers and endings.
- Reuse one entrance per element type for the whole piece.
- Let the music's bars set the cuts, then place two or three sound cues per scene on the frames things land.
