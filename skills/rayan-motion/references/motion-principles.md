# Motion principles

The judgment a motion designer brings, written down. Read this before designing any piece. The engine renders whatever you ask for; these rules are what make it look intended.

## Decide before you animate

1. **What is the one thing this piece says?** Write it in a sentence. Every scene serves it or goes.
2. **Who watches, where, with sound?** A feed plays muted: the picture must carry the message alone. A docs page viewer wants the steps. A launch film can lean on music.
3. **What does the viewer look at each second?** One focal point at a time. If two things move, one is supporting and moves less.

## The house style

The default look and feel. A project can change the brand colour, fonts and logo ([brand.md](brand.md)); keep the rest unless the user asks.

- **Dark, neutral, one accent.** Near-black zinc ground, white text, one brand blue. Each scene may own a tone that tints its glow, eyebrow and heading gradient.
- **Blur-in is the signature entrance**: opacity 0 to 1, blur 10 px to 0, a 20 px rise. Reach for it first.
- **Soft shapes.** Squircle cards, pill controls, hairline borders. No hard corners, no heavy shadows on dark.
- **Nothing pulses.** A live state is a static dot with a soft ring of its own colour.
- **Display type does the talking**: semibold headings, one gradient word or line, a mono `~/path` eyebrow above.

## Timing

| What moves | Duration |
|---|---|
| Hover, highlight, tap, small UI | 0.2 to 0.3 s |
| An element entering | 0.4 to 0.75 s |
| A hero moment: the first headline, the product arriving | 1.0 to 1.3 s |
| A scene transition | 0.6 to 0.8 s |
| A drawn line or chart | 0.9 to 1.6 s |

- **Stagger** siblings 75 to 85 ms apart. Letters in a headline, about 75 ms; long lines, down to 35 ms so the whole line lands inside a second.
- Exits take about a third of the entrance and never bounce.
- **Hold.** After something lands, leave it still long enough to read: `words / 3 + 0.5` seconds for text, at least 0.8 s for a number.
- **Land on the beat.** Scene lengths are whole beats; put the important arrival on a beat and its sound on the frame it lands.
- Things play once. Nothing loops while the viewer reads.

## Easing

| Ease | Curve | Use it for |
|---|---|---|
| `std` | Expo out, `cubic-bezier(0.16, 1, 0.3, 1)` | Anything that travels: entrances, camera, panels, transitions |
| `over` | Overshoot, `cubic-bezier(0.34, 1.56, 0.64, 1)` | Entrances that land with a small bounce: a card, a device, a badge |
| `quint` | Quint out, `cubic-bezier(0.22, 1, 0.36, 1)` | Fades and small hover-like changes |
| `spring`, `spring({...})` | Physics | Playful, physical moves. Never text the viewer must read mid-flight |
| `in` | Accelerating | Exits |
| `io` | Even | Scrolls, drawing a stroke |
| `lin` | Linear | Colour and progress only |

Overshoot is seasoning: one or two elements per scene.

## Choreography

- **Lead with what matters.** Eyebrow, then headline, then supporting line, then the picture.
- **Move things from where they come from.** A panel that belongs to a button grows from the button.
- **Keep continuity.** An element that appears in two scenes stays on screen and moves; put it in `#persist`.
- **One property family at a time.** Opacity, blur and position together read as one gesture. Add rotation, scale and colour and it is noise.
- **Camera moves are expensive.** One per second at most, never while the viewer is reading.
- **Exits clear the stage** for what comes next.

## Type on screen

At 1920 by 1080, in a player that is often a third of the screen:

| Role | Size |
|---|---|
| Headline | 88 to 170 px, display face, semibold (heaviest weight for a one-line wordmark) |
| Secondary heading | 56 to 76 px |
| Lead and body | 28 to 36 px, never under 24 |
| Eyebrow, micro labels | 18 to 24 px, mono, never carrying the message |

- Two families and a mono: display for headings, sans for running text.
- Six words or fewer per headline line, two lines at most.
- One gradient line per scene, running from the text colour into the scene's tone.
- Numbers that change use tabular figures (`num`).
- Contrast of at least 4.5:1 for anything meant to be read, 3:1 for large display type. `lint.ts` checks it.

## Colour

- Neutrals carry the frame. The brand colour marks actions and the one thing that matters.
- A tone per scene (emerald, indigo, teal, amber, rose, cyan, violet) gives a long piece rhythm. Use each for one idea; do not reuse a tone for a different meaning.
- Emerald, amber and red also mean working, warning and down. When they carry status, put a text label beside them.
- Glows stay low: 20 to 26% of the tone at the centre, fading to nothing.

## Layout and safe areas

- Keep text and logos inside the format's safe area (`safe`, and `--guides` to see it). Vertical formats lose the top 14% and bottom 20% to the platform's own interface.
- Design each aspect ratio. Do not centre-crop a wide frame into a tall one.
- Leave space. One clear element in a mostly empty frame reads faster than a full one.
- Background layers fade at their edges (`mask-radial`, `mask-fade`) so nothing ends on a hard line.

## Structure

- A piece has a shape: open, build, turn, land. A five-second logo sting still has an approach, a hit and a hold.
- Vary scene lengths. Three equal scenes feel like a slideshow.
- The last frame holds at least a second with the logo or the call to action. It is the frame people screenshot.
- For a loop, the last frame equals the first.

## Accessibility

- No flashing: never more than three large light-to-dark changes in a second.
- Captions for anything spoken.
- Never rely on colour alone.
- Offer the poster wherever the piece is embedded, for people who turn motion off.

## Taste checks

Look at the contact sheet and ask:

- Could any frame be mistaken for a mistake? Then it will be.
- Is anything moving that does not need to?
- Do all scenes share margins, type and motion?
- Cover the logo. Would you still know whose it is?
