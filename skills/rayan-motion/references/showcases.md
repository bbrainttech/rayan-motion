# Product showcases

Pieces that show a product off rather than teach a task: a landing-page hero, a feature reel, a launch video, store previews. The screens are still real, captured the same way as for an explainer ([app-capture.md](app-capture.md), or [mobile.md](mobile.md) for a native app).

`comps/showcase` is the example: a browser frame arrives tilted, straightens while two callouts point at the interface, then makes room for the same product on a phone.

## The pattern

1. **Capture the best state.** Realistic data, the feature in use, nothing empty, nothing half-loaded. Capture a phone-sized view too if the product is responsive:

   ```ts
   const { browser, context } = await open({ viewport: { width: 390, height: 844 }, scale: 3, mobile: true })
   ```

2. **Frame it.** `browserFrame` and `phoneFrame` wrap a `screenWindow`. Put frames in `#persist` so they live across scenes.
3. **Move the frame, not the content.** One or two 3D moves: arrive tilted (`perspective(1800px) rotateY(-12deg) rotateX(5deg)`) with a blur-in, settle flat for the detail, shift aside for the next thing. Use `std` for these, and `'forwards'` as the fill on every move after the first.
4. **Point.** `callout()` labels at real elements, found with `box()` so they follow the interface. Two per scene at most, 0.5 s apart.
5. **Say one thing per scene** in a short headline beside the frame.
6. **End on the product and the logo**, held. The example scores the reel with `lofi` and a `fade` ending, which still sounds finished if a platform cuts it short.

## Useful moves

- **Zoom into a detail**: `camera()` on the window inside the frame, as in an explainer.
- **Scroll the page** inside the frame with `scroll()` to reveal length.
- **Before and after**: two snapshots in one window with a `show()` cross-fade.
- **A stack of screens**: three frames offset in depth (`translateZ` under one `perspective` parent), each sliding forward in turn.
- **Parallax**: move the background layer at a third of the frame's speed.

## Where it will play

| Destination | Make |
|---|---|
| Landing-page hero | 6 to 12 s, no sound, loopable. Export with `render.ts loop` for small `.mp4` and `.webm` files, and use the poster as the fallback image |
| Social post | 10 to 20 s, readable muted, square or portrait cut ([design-assets.md](design-assets.md) for sizes) |
| Launch film | 30 to 60 s with music and optional voice |
| App Store or Play preview | Portrait, 15 to 30 s, device captures only. Check the store's current rules for size and length before rendering |

For a hero loop, keep the file small: 960 to 1280 px wide is enough behind text, and motion that covers less of the frame compresses better.
