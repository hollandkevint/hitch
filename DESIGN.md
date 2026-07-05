# Wedding Copilot — DESIGN.md

Direction: **editorial stationery meets serious tool**. A wedding suite designed by a letterpress studio, operated like software. Never SaaS-generic, never bridal-saccharine.

## Color (OKLCH-minded; hex tokens for zero-build CSS)

Strategy: **restrained** in the app (tinted neutrals + forest as the single working accent, terracotta reserved for risk); **committed** on the pre-read page (forest carries the header/spine of the document).

- `--ivory  #faf7f2` — page ground (warm, chroma-tinted toward brand, never #fff)
- `--paper  #fffdf9` — card/surface
- `--ink    #26302b` — text (forest-tinted near-black, never #000)
- `--muted  #7d7a72` — secondary text
- `--line   #e9e2d6` — hairlines
- `--forest #2b4a3e` — brand accent: actions, agent identity, active states
- `--forest-soft #e8efe9` — agent surfaces, tints
- `--terracotta #b4532a` — overdue, high-stakes, confirm gates ONLY (risk semantics, never decoration)
- `--terracotta-soft #f7e9e1` — risk tint

## Typography

- Display/serif voice: **Georgia** (zero network dependency; italic for vendors and asides). Pre-read page may use Fraunces if network is acceptable, Georgia fallback.
- UI/sans voice: system stack (-apple-system, Segoe UI, Helvetica).
- Scale ratio ≥1.25; hierarchy by size + weight, not color alone. Body 65-75ch max on the pre-read.

## Components

- **Action card**: forest-soft ground, serif heading, drafted-content well in paper with hairline, footprint line (writes · reversible · grounded-in) under the buttons in muted small caps.
- **Confirm gate**: paper dialog, terracotta top rule (4px full-width top border, not a side stripe), names the cascade in body text, danger button terracotta.
- **Overdue pill**: terracotta-soft ground, terracotta text, never bare red.
- **Audit entry**: actor in weight, action in regular, time muted below.

## Bans (project-specific, on top of impeccable's absolute bans)

- No blush pink, no script fonts, no confetti, no hearts.
- No purple, no gradients anywhere.
- No emoji in agent speech (UI hint text may use typographic symbols like ⚠ sparingly).
- The copilot never renders as a full-screen chat page.

## Motion

Minimal: row state changes may fade/settle (150-200ms ease-out); no bounces, no confetti bursts on approve.
