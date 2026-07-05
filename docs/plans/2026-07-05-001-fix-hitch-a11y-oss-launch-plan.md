---
title: "fix: Hitch a11y hardening + open-source launch readiness"
date: 2026-07-05
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
origin: "Fable brief J1 (vault: 🛠️ Operations/Fable-Briefs-Concurrent-Batch-2026-07-02.md)"
---

# fix: Hitch a11y hardening + open-source launch readiness

**Target repo:** wedding-copilot (this repo). No git remote is configured — shipping is local-only (commits, no push/PR).

---

## Summary

Hitch is a strong governed-agent-writeback demo but not release-ready: the UI has unescaped `innerHTML` interpolation, several accessibility P1s, and the README is written for the original demo walk, not a public audience. This plan escapes the rendering paths, fixes the P1 a11y defects, and rewrites the README as a governed-agent-writeback reference implementation tied to the ThinkHaven Method Kit and the DPOS thesis — with all 6 evals green as the acceptance gate throughout.

---

## Problem Frame

- `public/app.js` interpolates DB-derived strings (`t.title`, `t.vendor`, `t.owner`, `a.actor`, `a.action`, `action.label`, `action.draft`) directly into `innerHTML` at 6 sites. Data is currently server-seeded, but the pattern is injectable the moment any user-derived string reaches those fields, and it fails any security review of a public repo.
- Confirmed a11y defects (from direct inspection; brief said to rediscover, findings were not on disk):
  1. `setView()` toggles the `.active` class but never updates `aria-selected` — screen readers report the wrong active tab permanently after first switch.
  2. Confirm dialog (`role="alertdialog"`) lacks `aria-modal="true"`, has no Escape-to-close, no focus trap, and focus is dropped (not returned to the invoking control) on close.
  3. `renderCascade()` appends `<p>` and `<ul>` inside `<p id="confirm-text">` — invalid nesting; browsers silently restructure it.
  4. `#chat` has no `aria-live` region — bot replies are invisible to screen readers in a chat product.
  5. `#ask-input` has no accessible name (placeholder only).
  6. Hint links are `href="#"` anchors acting as buttons.
- `README.md` documents the demo walk and exercise provenance; a public reader needs positioning (what this proves, why the harness matters), and the repo has no LICENSE.

## Requirements

- **R1** — All dynamic rendering in `public/app.js` is injection-safe: DB/action strings can never execute as markup.
- **R2** — The a11y P1s above are fixed: correct tab state, modal dialog semantics (aria-modal, Escape, focus trap, focus return), valid dialog markup, live-region chat, labeled input.
- **R3** — README positions Hitch as a governed-agent-writeback reference implementation, linking the ThinkHaven Method Kit (github.com/hollandkevint/thinkhaven-method-kit) and the DPOS "decisions, not dashboards" thesis; readable by a stranger with no exercise context.
- **R4** — Repo is public-flip-ready: LICENSE present, `wedding.db` not tracked, no AI attribution anywhere.
- **R5** — All 6 evals in `test.js` pass after every unit (acceptance gate).
- **R6** — The steady-counsel behavior and confirm-gate cascade are preserved exactly (load-bearing product decisions).

## Key Technical Decisions

- **Escape at render, keep template literals.** Add a small `esc()` HTML-escape helper and wrap every interpolated value at the 6 `innerHTML` sites, plus whitelist `a.actor` before using it as a CSS class token. Rationale: smallest diff that closes the hole; converting all rendering to DOM-building (the `renderCascade` pattern) would be a larger rewrite for the same guarantee. Zero-dependency constraint holds — no sanitizer library.
- **Minimal modal mechanics, no dialog library and no `<dialog>` rewrite.** Add `aria-modal="true"`, an Escape handler, a two-button Tab cycle, and focus return to the Approve button. `<dialog>`/`showModal()` would give trap semantics free but changes markup/CSS and risks the demo's visual state machine days before it's shown; keep the existing overlay.
- **Fix `#confirm-text` by changing the element to `<div>`**, keeping `renderCascade()`'s textContent-based building unchanged (R6: cascade rendering untouched in substance).
- **README rewrite, not append.** Lead with the thesis (the harness is the product; approval-only write path + eval gate are model-agnostic), then run/demo instructions, then architecture. Keep the honest provenance/deviation note — it models the disclosure standard the repo argues for. MIT LICENSE, Kevin Holland as holder.
- **Evals as regression gate, plus one new discriminating check.** `test.js` is API-level and cannot see DOM escaping, so add Eval 7: a temporary seeded task title containing `<img src=x onerror=...>` must round-trip the API intact (string, not markup) AND a static source check asserts no unescaped interpolation pattern remains at the render sites. Kept honest: DOM behavior itself is verified by the served-app screenshot pass, not by node tests.

## Assumptions

(Inferred scope bets — pipeline mode skipped the interactive scoping confirmation.)

- MIT is the license default; it only takes legal effect when Kevin flips the repo public, which stays his call (brief checkpoint).
- "Open a PR" from the brief is unsatisfiable — no remote exists. Local commits + a ready launch narrative are the deliverable; pushing/PR happens after Kevin creates the remote.
- `wedding.db` handling: if tracked, untrack and gitignore it (it regenerates on first run); if already ignored, no-op.
- Keyboard arrow-key tab navigation is P2 polish, included only because it is ~6 lines alongside the aria-selected fix.

---

## Implementation Units

### U1. Injection-safe rendering in app.js

**Goal:** No DB/action-derived string can execute as markup (R1).
**Requirements:** R1, R5, R6.
**Dependencies:** none.
**Files:** `public/app.js`, `test.js`.
**Approach:** Add `esc()` (`&<>"'` → entities). Wrap `t.title`, `t.vendor`, `t.owner`, `a.action`, `action.label`, `action.draft` at all 6 `innerHTML` sites. Replace `class="actor ${a.actor}"` with a whitelist lookup (`hitch|planner|couple`, else `unknown`). Leave `renderCascade()` and `addMsg()` untouched (already textContent).
**Test scenarios:**
- Covers R1. Eval 7 (new, in `test.js`): seed a task titled `Book <img src=x onerror="window.__pwned=1"> quartet`, call `/api/copilot` "what's left?", assert the reply and `getTasks()` return the raw string unchanged; then reseed clean. Plus a source assertion that `app.js` contains `esc(` at each render site (fails if a future edit drops the escaping).
- Happy path: all 6 existing evals still pass (rendering change must not alter reply/draft strings).
**Verification:** `node test.js` → 7 pass; served app renders the injection title as literal text in a screenshot.

### U2. A11y P1 fixes

**Goal:** The six confirmed defects fixed (R2).
**Requirements:** R2, R5, R6.
**Dependencies:** none (parallel-safe with U1; both touch `app.js` — land U1 first to avoid churn).
**Files:** `public/index.html`, `public/app.js`, `public/style.css` (only if the `p→div` swap needs a margin rule).
**Approach:** (a) `setView()` sets `aria-selected` true/false alongside `.active`; add ArrowLeft/ArrowRight handling on the tablist; add `aria-controls` + `role="tabpanel"` ids. (b) Dialog: `aria-modal="true"`; keydown handler for Escape (cancel) and Tab/Shift-Tab cycling between Cancel and Yes; on close (any path) return focus to `#btn-approve` if present, else `#ask-input`. (c) `#confirm-text` `p` → `div`. (d) `#chat` gets `aria-live="polite"` `role="log"`. (e) `#ask-input` gets `aria-label="Ask Hitch"`. (f) Hint anchors → `<button type="button" class="hint">` with CSS keeping the link look.
**Test scenarios:** Test expectation: none in `test.js` — DOM-only changes, unverifiable from the node API suite. Verified by the browser pass below (this is the brief's visual verification loop).
**Verification:** Served app: tab switch shows `aria-selected` flipping (inspect); confirm dialog opens on "The Hendersons declined" → Approve, Escape closes it, focus returns; screenshots of couple view, planner view, action card, confirm dialog before/after. All 7 evals still green.

### U3. README launch narrative + LICENSE + public-flip hygiene

**Goal:** A stranger reading the repo understands what it proves and can run it (R3, R4).
**Requirements:** R3, R4.
**Dependencies:** U1, U2 (README describes the hardened state).
**Files:** `README.md`, `LICENSE`, `.gitignore`, possibly `git rm --cached wedding.db`.
**Approach:** Rewrite README: (1) one-paragraph thesis — grounded reads, approval-only writeback, server-enforced confirm-gate, eval harness; the harness is the product and the model is swappable; (2) run + demo walk (keep, trimmed of exercise staging); (3) architecture section (keep, drop exercise-audience references); (4) design lineage — ThinkHaven Method Kit link (anti-sycophancy / assumption-mapper as write-gate) and DPOS "decisions, not dashboards"; (5) provenance/deviation note kept, reworded for a public reader. MIT LICENSE (Kevin Holland, 2026). Untrack `wedding.db` if tracked; ensure `.gitignore` covers it. Sweep for AI attribution (none expected; verify).
**Test scenarios:** Test expectation: none — docs/packaging. Smoke: fresh checkout simulation (`git stash` not needed; delete `wedding.db`, `node server.js`, confirm it reseeds and serves).
**Verification:** README renders clean; `git ls-files` shows no `wedding.db`; `grep -ri "co-authored-by\|generated with claude" .` (excluding `.git`) → zero hits.

### U4. Full verification pass + before/after evidence

**Goal:** The brief's evidence bundle exists (R5 + brief's "evidence required").
**Requirements:** R5, R2.
**Dependencies:** U1-U3.
**Files:** none new (screenshots to scratchpad; summary in the run report, not committed docs).
**Approach:** `node test.js` (7 green); serve the app; screenshot every changed screen (couple view, planner view, action card, confirm dialog); re-check each of the six a11y defects and record before → after status.
**Test scenarios:** Test expectation: none — verification unit.
**Verification:** Evidence bundle: eval output, screenshots, per-defect before/after list.

---

## Scope Boundaries

**In scope:** the four units above.

**Deferred to Follow-Up Work:**
- Push + PR + public visibility flip — blocked on Kevin creating a remote and approving the launch narrative (brief's human checkpoints).
- Transactional multi-statement writes in `server.js` (known honest hardening gap, documented in the pre-read; behavior change out of J1's scope).
- Full WCAG audit beyond the P1s (contrast measurement, reduced-motion) — P2.
- `<dialog>` element migration.

**Outside this product's identity:** replacing the rule engine with a live LLM (the README explains why it's deliberately deterministic for the demo).

## Open Questions

- License choice: MIT assumed; Kevin confirms before the public flip (no code impact either way).

## Verification Contract

- Gate after every unit: `node test.js` — all evals pass (6 existing + Eval 7 from U1 onward).
- Final gate: served-app browser pass with screenshots; a11y defect list shows all six resolved; zero AI-attribution hits; `wedding.db` untracked.

## Definition of Done

R1-R6 satisfied with the evidence bundle from U4; changes committed locally in atomic commits (no push — no remote); launch narrative ready for Kevin's approval checkpoint.
