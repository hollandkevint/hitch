---
name: Hitch
description: Your wedding, without a hitch. A governed agent that acts on the record.
colors:
  ivory: "#faf7f2"
  paper: "#fffdf9"
  ink: "#26302b"
  muted: "#706d65"
  line: "#e9e2d6"
  forest: "#2b4a3e"
  forest-soft: "#e8efe9"
  forest-deep: "#233d33"
  terracotta: "#b4532a"
  terracotta-soft: "#f7e9e1"
  on-forest: "#fdfcf9"
  bot-surface: "#f4f0e7"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  aside:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "26px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.sm}"
    padding: "9px 20px"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.sm}"
    padding: "9px 20px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 20px"
  button-danger:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.sm}"
    padding: "9px 18px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  surface:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "26px 28px"
  action-card:
    backgroundColor: "{colors.forest-soft}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  badge:
    backgroundColor: "{colors.forest-soft}"
    textColor: "{colors.forest}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  overdue-pill:
    backgroundColor: "{colors.terracotta-soft}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: Hitch

## 1. Overview

**Creative North Star: "The Letterpress Desk"**

Hitch is editorial wedding stationery operated like software. Imagine a letterpress studio that also ships a real tool: warm cotton paper stock, forest-green ink pressed into it, and a single terracotta stamp reserved for the one thing on the page that needs care. The surface is calm and unhurried because the person using it is not. A couple opens this at 10pm, overwhelmed, and the interface has to read as steady counsel, not another app shouting for attention. Nothing sparkles. Nothing celebrates. The product holds the couple's real, shared record and acts on it with permission, so the design's whole job is to make that record legible and make every action honest about what it touches.

The system rejects two failure modes at once. It is never generic SaaS AI (no purple gradients, no sparkle emoji, no "Ask me anything!"), and it is never bridal saccharine (no blush pink, no script fonts, no confetti, no hearts). It sits deliberately between craft and restraint: serif where a human authored something, clean sans where the machine is speaking, and color used so sparingly that when terracotta appears you already know something has a consequence.

Density is medium and quiet. Two columns on desktop, one on mobile, generous but not airy. Depth is mostly tonal, not shadowed. The agent lives inside the planning surface, never in a bolted-on chat tab.

**Key Characteristics:**
- Warm, tinted neutrals only. No pure black, no pure white, ever.
- Two typographic voices: Georgia serif for authored and record content, system sans for machine chrome.
- Forest is the single working accent. Terracotta means consequence, never decoration.
- Flat at rest. The only real lift is the confirm dialog, the moment the agent is about to change shared reality.
- Calm over cheerful. The interface never performs enthusiasm.

## 2. Colors: The Pressed-Ink Palette

A warm paper ground, one forest ink, one terracotta stamp. Restrained by doctrine: tinted neutrals carry the surface and forest carries meaning at under 10% coverage.

### Primary
- **Pressed Forest** (`#2b4a3e`): The single working accent. Actions, agent identity, active states, the approve button, the user's own chat bubble. This is the ink the whole product is printed in.
- **Deep Forest** (`#233d33`): The pressed-harder shade. Primary-button hover and pressed states only.
- **Forest Wash** (`#e8efe9`): The agent's surfaces. Action-card grounds, badges, soft tints that say "Hitch is speaking here" without shouting.

### Secondary
- **Consequence Terracotta** (`#b4532a`): Risk semantics only. Overdue markers, high-stakes labels, the confirm-gate top rule and its danger button. It is the one color that means "this changes something," so it never appears as decoration.
- **Terracotta Wash** (`#f7e9e1`): The risk tint. Overdue-pill grounds and the confirm dialog's warmer register.

### Neutral
- **Cotton Ivory** (`#faf7f2`): The page ground. Warm, chroma-tinted toward forest, the paper stock everything is printed on.
- **Bright Paper** (`#fffdf9`): Card and surface fill, one step brighter than the ground so panels lift tonally without a shadow.
- **Bot Paper** (`#f4f0e7`): The agent's chat-bubble ground, a hair warmer than the surface so the agent's voice reads as distinct from the couple's.
- **Forest Ink Text** (`#26302b`): Body and heading text. A forest-tinted near-black, never `#000`.
- **Ash Muted** (`#706d65`): Secondary text, vendor names, timestamps, hint copy.
- **Deckle Line** (`#e9e2d6`): Hairlines, borders, dividers. The edge of the paper.
- **Warm White** (`#fdfcf9`): Text and icons on forest and terracotta fills. The closest this system comes to white, and only ever on a colored ground.

### Named Rules
**The One Ink Rule.** Forest is the only working accent, and it covers under 10% of any screen. Its restraint is what makes an active state, an agent surface, or an approve button read instantly. Do not spread it.

**The Terracotta-Is-Consequence Rule.** Terracotta is forbidden as decoration. It appears only where something is overdue, high-stakes, or about to be written to shared state. If terracotta is on the screen, the user should be able to point at the thing that has a consequence.

## 3. Typography

**Display / Record Font:** Fraunces (webfont, `display=swap`), falling back to Georgia, "Times New Roman", serif
**UI / Chrome Font:** system sans (-apple-system, "Segoe UI", Helvetica, Arial)
**Label Font:** the same system sans, tracked and uppercased

**Character:** Two voices, held apart on purpose. Georgia is the authored voice, warm and letterpress-adjacent, and it carries anything a human wrote or that lives in the record: headings, the drafted vendor email, vendor names in italic. The system sans is the machine's voice, plain and quiet, and it carries the chrome: buttons, labels, metadata, timestamps. Display headings load Fraunces over the network with `display=swap` and a metric-close Georgia fallback, so offline or pre-swap renders stay legible in the same voice; body and chrome type remain zero-network system faces.

### Hierarchy
- **Display** (Georgia 600, 1.5rem, line-height 1, tracking 0.02em): The product name and the couple's masthead. One per screen.
- **Title** (Georgia 600, 1.15rem): Section headings ("Your timeline", "Ask Hitch") and action-card headings.
- **Body** (system sans 400, 0.94rem, line-height 1.5): Timeline rows, chat messages, dialog copy. Cap long-form reading at 65 to 75ch.
- **Aside** (Georgia 400 italic, 0.8rem): Vendor names and record asides. The italic serif is the tell that this value came from the record, not the machine.
- **Label** (system sans 600, 0.72rem, tracking 0.12em, uppercase): Section sub-labels ("DONE"), badges, small chrome. Hierarchy comes from case and tracking, not color.

### Named Rules
**The Two-Voice Rule.** Georgia serif is for authored and record content; system sans is for machine chrome. Never swap them. A button is never serif. A drafted email is never sans. The reader should be able to tell who is speaking, the human record or the machine, from the typeface alone.

## 4. Elevation

This system is flat by doctrine and lifts tonally, not with shadow. Panels separate from the ground because Bright Paper (`#fffdf9`) sits one warm step above Cotton Ivory (`#faf7f2`), not because they float. There is exactly one true shadow in the product, and it is load-bearing: the confirm dialog.

### Shadow Vocabulary
- **Resting hairline** (`box-shadow: 0 1px 2px rgba(58, 50, 38, 0.04)`): The barely-there seat under section panels. Warm-tinted, almost subliminal. It grounds a card without lifting it.
- **Consequence lift** (`box-shadow: 0 12px 40px rgba(38, 48, 43, 0.25)`): The confirm dialog only. A real, deep, forest-tinted shadow that puts the dialog unmistakably above everything, paired with a scrim (`rgba(38, 48, 43, 0.42)`) over the page.

### Named Rules
**The Flat-Until-Consequence Rule.** Surfaces are flat at rest, seated on a hairline (section panels may carry a second, longer-throw hairline for paper depth, but nothing at rest reads as floating). The single moment that earns a real, unmistakable shadow is the confirm gate, because the one time the interface should feel like it is rising above everything else is the moment the agent is about to change shared reality. Reserve the lift for that.

## 5. Components

### Buttons
- **Shape:** Gently rounded (8px; the ask input and its send button step to 10px to match the field).
- **Primary:** Pressed Forest ground, Warm White text, no border, `9px 20px` padding. Approve, Ask, and the active view-toggle segment. Hover presses to Deep Forest (`#233d33`).
- **Secondary / Ghost:** Bright Paper ground, Forest Ink text, Deckle Line border, same padding. Edit, Cancel, the inactive toggle segment.
- **Danger:** Consequence Terracotta ground, Warm White text, no border, `9px 18px`. The confirm dialog's commit button only.
- **View toggle:** A segmented pair, first child rounded left, last child rounded right with its left border removed so the two read as one control. Active segment is Pressed Forest.

### Inputs / Fields
- **Style:** Bright Paper ground, Deckle Line border, 10px radius, `11px 14px` padding.
- **Focus:** A 2px Forest Wash outline plus a Pressed Forest border. Quiet, warm, never a bright glow.

### Cards / Containers
- **Section surface:** Bright Paper ground, Deckle Line border, 14px radius, resting hairline shadow, `26px 28px` padding. Never nested.
- **Action card:** Forest Wash ground with a soft forest-tinted border (`#cddbd2`), 12px radius. Signals the agent proposing an action. Holds a serif heading, a drafted-content well in Bright Paper, and a footprint line.

### Chat messages
- **Couple bubble:** Pressed Forest ground, Warm White text, tail on the bottom-right.
- **Agent bubble:** Bot Paper ground, Forest Ink text, tail on the bottom-left. The warmer ground marks the agent's voice as its own.

### Badges & Pills
- **Badge:** Forest Wash ground, Pressed Forest text, pill radius, tracked uppercase label. The read-only planner badge drops to Ash Muted on a cooler neutral.
- **Overdue pill:** Terracotta Wash ground, Consequence Terracotta text, pill radius. Never bare red.

### Signature: The Confirm Gate
The one moment the whole product is built around. A Bright Paper dialog with a **4px full-width Consequence Terracotta rule across the top** (a top rule, never a side stripe), lifted on the consequence shadow over a forest scrim. A serif heading in terracotta, the named cascade as a bulleted list (each item a small terracotta dot, the real downstream effects: "guest count 120 to 118", "caterer headcount", "your seating plan"), a plain-sans reversibility line, then Cancel and the terracotta commit button. This is where governance becomes visible: the gate names what it will change before it changes it.

### Signature: The Footprint Line
Under every agent action, a muted line states what it writes, whether it is reversible, and which records ground it. The agent never acts without showing its hand.

## 6. Do's and Don'ts

### Do:
- **Do** keep forest under 10% of any screen (The One Ink Rule). Its rarity is what makes it mean "action."
- **Do** reserve terracotta strictly for consequence: overdue, high-stakes, writes to shared state.
- **Do** hold the two type voices apart: Georgia for record and authored content, system sans for chrome (The Two-Voice Rule).
- **Do** keep surfaces flat on a hairline, and spend the one real shadow on the confirm gate (The Flat-Until-Consequence Rule).
- **Do** show the footprint (writes, reversible, grounded-in) under every agent action.
- **Do** name the full cascade in the confirm gate before any high-stakes write.
- **Do** tint every neutral toward the brand hue; keep the paper warm.

### Don't:
- **Don't** use generic SaaS AI cues: no purple, no gradients as decoration on elements, no sparkle emoji, no "Ask me anything!" (One sanctioned exception: the page ground may carry forest-tinted radial washes at or below 5% alpha for paper depth. Never terracotta — atmosphere is not consequence.)
- **Don't** go bridal saccharine: no blush pink, no script fonts, no confetti, no hearts.
- **Don't** render the agent as a full-screen chat tab. Hitch lives inside the planning surface or it is not the product.
- **Don't** let the agent perform enthusiasm: no exclamation marks, no false cheer, no validation theater.
- **Don't** put emoji in agent speech (sparse typographic symbols like the overdue mark are the only exception).
- **Don't** use `#000` or `#fff`. Every neutral is tinted; the lightest ink-on-color is Warm White (`#fdfcf9`).
- **Don't** use a side-stripe accent border. The confirm gate's terracotta rule is a full-width top rule, on purpose.
- **Don't** use terracotta as decoration. If it is on screen, something has a consequence.
