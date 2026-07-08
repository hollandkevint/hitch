---
title: Hitch PRD Three-Part Framing + Nav Sync + Review Fixes - Plan
type: feat
date: 2026-07-08
topic: hitch-prd-3part-nav-sync
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Hitch PRD Three-Part Framing + Nav Sync + Review Fixes - Plan

## Goal Capsule

- **Objective:** Add the three-part opinionated-planner framing to the PRD (the ChatGPT-differentiator: deep memory + opinionated lanes + workflow ontology) while keeping the canonical body under 300 words; standardize the site nav so every page shows the same complete rail (top and mobile-bottom in sync); and apply the actionable findings from the code/adversarial/doc/design review.
- **Product authority:** Kevin. Full-send to live; `87c76d4` is the rollback point; production promotes only after evals (including the key-present path) + browser verify are green.
- **Constraints:** No new deps. PRD body stays ≤300 words (trim to genuinely under). No change to the write gate; evals must stay green and now also green with a key present.

## Product Contract

### Requirements

**Nav sync**
- R1. Every page's rail shows the canonical set: PRD · Overview · Demo · Process · Architecture · Questions · Governance · Roadmap. Overview (preread) and Governance, currently orphaned, are added; each page marks its own item active; the demo page keeps the Reset-demo control.

**PRD three-part framing**
- R2. The PRD gains the three-part system as the differentiator vs generalized AI: (1) opinionated onboarding interview capturing budget/wishes/dislikes and helping trade-offs, stored as durable memory; (2) sequencing held in the record; (3) closeout + invoicing. Framed as roadmap/differentiator, not body bloat.
- R3. The canonical ≤300-word PRD body is trimmed to genuinely under 300 (~296) so every surface's "under 300" claim is true; the stale `d0e55ce` SHA is dropped from the vault PRD.

**Review fixes**
- R4. Toggle eval branches on observed key state so `OPENROUTER_API_KEY=... node test.js` passes and the live-activation half is covered (adversarial P-MEDIUM-1).
- R5. Eval 7's injection guard covers the new render fields (vendor/planner/budget) and the esc-count floor is raised to match (adversarial P-MEDIUM-2).
- R6. `liveMode` boots as `LIVE_AGENT && !!AGENT_KEY`; a `null` POST body returns a clean 400/deterministic, not a 500 (adversarial LOW-3/4).
- R7. `#connector-grid` and `initAgentToggle` label deref are guarded; dead `.agent-toggle` CSS + `is-live` no-op removed (code P3s).
- R8. DESIGN.md violations fixed: audit write-rows use a forest-wash tint (no side-stripe); the wedding-day Gantt bar uses a forest weave (terracotta means consequence only).
- R9. Doc drift fixed: `test.js` "5-point eval set" → "7-eval set"; runbook demo walk adds the proactive-greeting + Gantt/budget/record-depth beats and moves the couple-view widget sentence out of the planner beat; the Google Doc sync is re-flagged (runbook stops promising it matches until synced).

### Key Decisions

- **Three-part framing lives in the differentiator/roadmap, not the 300-word body.** The body already scopes onboarding-depth and invoicing as v2; the three-part system names *why* that beats ChatGPT (memory + opinionated lanes + ontology). Keeps the body under limit.
- **Nav includes Overview + Governance, drops Assumptions from the rail.** Per Kevin's named set; Assumptions stays reachable from the PRD page's proof-links, so no page is orphaned.
- **Toggle test branches on key state rather than asserting keyless.** The prior test contradicted its own documented live-gate command; branching covers both keyed and keyless without a false red.

### Scope Boundaries
- No live build of the three-part system (onboarding interview / sequencing engine / invoicing) — that is roadmap/PRD framing this pass, not code.
- No auth layer on the toggle (single-user demo); the keyed-public-deploy abuse exposure is recorded as a residual, mitigated by turning the key off after the panel.

## Implementation Units

### U1. Canonical nav rail across all pages
- **Files:** all `public/*.html`. Script-replace the `panel-rail` block with the 8-item canonical set; per-page active; reset button on index only.
- **Verification:** Browser — nav consistent on index + a content page; Overview/Governance present and reachable.

### U2. PRD three-part framing + trim + SHA
- **Files:** `public/prd.html`, vault PRD. Add the three-part differentiator (roadmap/callout); trim body under 300; drop `d0e55ce`.
- **Verification:** `wc -w` body < 300 and byte-identical across vault + site; pages render.

### U3. Review code + test fixes
- **Files:** `public/app.js`, `server.js`, `public/style.css`, `test.js`.
- **Verification:** `node test.js` green AND `OPENROUTER_API_KEY=fake node test.js` green; browser check design fixes.

### U4. Doc fixes + ship
- **Files:** `test.js` comment, vault runbook, HOT.md; git.
- **Verification:** merge to main, deploy, reset seed, verify live; containment sweep before push.

## Verification Contract
- `node test.js` green; `OPENROUTER_API_KEY=fake node test.js` green (the fix's discriminating check).
- Browser verify: nav sync, forest-wash audit rows, forest wedding bar.
- Live-URL poll + reset seed after deploy; containment sweep.

## Definition of Done
- R1–R9 satisfied; both eval configs green; verified in-browser and live; prod reset clean; docs synced; repo clean; containment-swept.
