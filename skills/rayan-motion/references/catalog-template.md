# The catalog

`studio/catalog.md` comes with the studio. Keep it current: it is how the next agent learns what exists, where each piece plays, and which pieces a product change has made wrong.

## What goes in it

**Rules.** The project's own decisions, each with the date it was made: the default voice, music style and ending; the sizes each platform gets; words to use or avoid; what never goes on camera. Write a rule down the moment the owner states it.

**Pieces.** One row per piece:

| Column | Holds |
|---|---|
| ID | The folder name under `comps/` |
| What it is | The kind of piece and its subject: "Explainer: add a task" |
| Plays on | Where it is published. This decides the ending and the sizes |
| Sizes | The presets rendered: `landscape`, `vertical`, `square`, `portrait`, or custom sizes |
| Ending | `cta`, `logo`, `result` or `loop` for explainers; a word for the rest |
| Shows | The product screens on camera |
| Status | `planned`, `made`, `live` with its link, or `stale` with the date and what changed |

**What a capture needs.** How each kind of piece gets its screens: which pages a public demo covers, which need a signed-in temporary account, how that account is created and removed, and which ports a capture may use.

## Keeping it true

- Add a piece's row before writing its script.
- When a product change touches a screen listed under Shows, mark every piece that shows it `stale` in the same change.
- When a piece is published, add its link and mark it `live`.
