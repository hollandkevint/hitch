---
title: Hitch Dashboard Expansion + Connectors + Agent Toggle - Plan
type: feat
date: 2026-07-08
topic: hitch-dashboard-expansion
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Hitch Dashboard Expansion + Connectors + Agent Toggle - Plan

## Goal Capsule

- **Objective:** Deepen the Hitch demo dashboard for the panel: a phased timeline, a richer record-depth panel, a context-sequenced copilot ask, a fuller planner audit, mockup connectors for the couple's email/invoicing/budget/timeline (the v2 roadmap made tangible), and a UI toggle for the v2 LLM agent. Keep the 7 evals green and the deterministic path the default.
- **Product authority:** Kevin. Full-send authorized: build → verify green → merge to main → deploy to hitch-planning.up.railway.app.
- **Constraints:** Zero new runtime dependencies (`node:http` + `node:sqlite`/`pg`). Deterministic copilot stays default + fallback. Connectors are mockups — no real OAuth/integrations. `d0e55ce` is the rollback point; production promotes only after evals + browser verify are green.

---

## Product Contract

### Summary

Expand the single-page demo so the shared record reads as a living system: the timeline groups by phase, the record-depth panel summarizes budget/guests/vendors/capacity, the copilot sequences its proactive ask through the real task order, the planner audit reads as a full ledger, and a Connectors strip mocks how the couple wires in email, invoicing, budget, and calendar. A visible toggle flips the copilot between deterministic and the v2 live agent, defaulting deterministic.

### Requirements

**Timeline (couple view)**
- R1. The timeline groups open tasks into ordered phases by due date: Overdue, This week, Next 3 weeks, Later. Each phase shows a heading with its count; empty phases are omitted.
- R2. Each task row shows title, vendor (when present), owner (couple/planner), due date, and the existing "Nd late" badge for overdue rows.
- R3. The Done section is preserved below the phased open list.

**Record depth**
- R4. The record-depth panel summarizes: budget (total estimate, committed, variance with over-budget flagged), guests (confirmed/pending/declined counts), vendors (count + highest risk items), and planner capacity (active weddings + bottleneck). Numbers derive from the live `/api/state` payload.

**Sequenced ask**
- R5. The copilot's proactive greeting names the most-overdue open item and offers to act (existing behavior, preserved).
- R6. The hint chips are context-derived: the first chips reference the next real open tasks in due-date order, so the ask sequences through the timeline instead of static examples. A grounded catch-all ("What's left before the wedding?") remains.

**Planner audit**
- R7. The planner-view audit renders as a ledger: each entry shows actor (couple/copilot/planner), the action text, and a formatted timestamp, newest first, visually distinguishing the copilot's approved writes from seed/human entries.

**Connectors (mockups)**
- R8. A Connectors section (couple view) presents mockup cards for Email (Gmail/Outlook), Invoicing (QuickBooks/Rock Paper Coin), Budget, and Calendar/Timeline (Google Calendar). Each card names what it would pull into the record and carries a "Connect" control.
- R9. Activating a connector is a mockup: it shows a "v2 — here's what it would sync" preview state inline. No network calls, no real auth. Clearly labeled as roadmap, not live.

**Agent toggle (v2)**
- R10. The server holds a mutable live-agent mode initialized from the `LIVE_AGENT` env var. `GET /api/agent-mode` returns `{ live, keyPresent }`; `POST /api/agent-mode {live}` sets it, and can only go live when an API key is present.
- R11. The copilot dispatch uses the runtime mode (not the boot-time constant); deterministic remains the default and the fallback on any live-agent failure/timeout.
- R12. A toggle in the copilot panel reflects and controls the mode. With no API key present it is disabled with an explanatory label. Flipping it does not break the deterministic demo.

**Docs + ship**
- R13. `public/prd.html`, the vault PRD, and this repo's PRD narrative reflect the expanded prototype (connectors as tangible v2, agent toggle demoable) without exceeding the 300-word PRD body cap on the canonical body.
- R14. The Presentation Runbook (`💼 Career/Roles/AcuityMD/prd_exercise/AcuityMD-Presentation-Runbook-2026-07-05.md` in the vault) is updated only if the demo walk changes materially (new beats: phased timeline, connectors, live toggle).
- R15. All 7 evals + panel checks pass (`node test.js`) after every server-touching change. Repo is cleaned of stale/dead files. Merge to main, deploy, verify live.

### Key Decisions

- **Connectors are mockups, not integrations.** The brief says "connectors and mockups"; real OAuth hours before the panel is out of scope and demo-risky. Mockup cards make the v2 business-OS + BYO-agent story tangible without a backend surface that can break.
- **Agent toggle is runtime, deterministic-default.** A mutable `liveMode` flag + tiny endpoint makes the v2 swap demoable in the room ("flip it live, same evals pass") without a redeploy, while the deterministic engine stays the default and the fallback so a stage hiccup degrades, never hangs.
- **All dashboard changes are additive UI over the existing `/api/state`.** No schema changes; the data (budget, guests, vendors, planner, audit) already exists — this is presentation depth, which keeps eval risk near zero.

### Scope Boundaries

- No real email/invoicing/calendar integration, no OAuth, no new npm deps.
- No new database tables or columns.
- No change to the write/approval gate or the 7 eval definitions.

## Implementation Units

### U1. Phased timeline (couple view)
- **Files:** Modify `public/app.js` (task-list render), `public/index.html` (timeline structure if needed), `public/style.css` (phase headings).
- **Approach:** In `refresh()`, replace the flat `#task-list` render with a phase-grouped render (Overdue / This week / Next 3 weeks / Later) computed from `daysLate`/due-date math already present. Preserve `data-task-id`, vendor, and overdue badge.
- **Verification:** Browser — timeline shows phase headings with counts; overdue florist deposit sits under Overdue with "6d late".

### U2. Record-depth summary
- **Files:** Modify `public/app.js` (`renderRecordDepth`), `public/style.css`.
- **Approach:** Compute budget totals (estimate/committed/variance), guest RSVP breakdown, vendor risk list, planner capacity from the state payload; render as summary cards.
- **Verification:** Browser — record-depth drawer shows budget totals, guest counts, vendor risk, capacity.

### U3. Context-sequenced hint chips
- **Files:** Modify `public/app.js` (hint rendering), `public/index.html` (hints container).
- **Approach:** Build the first 2–3 hint chips from the real open tasks in due-date order (e.g., "Follow up on 14 unanswered RSVPs"), keep the grounded catch-all and the judgment/handoff examples. Wire dynamic chips to the same ask flow.
- **Verification:** Browser — first chips match the actual next tasks; clicking one asks the copilot and grounds.

### U4. Planner audit ledger
- **Files:** Modify `public/app.js` (`#audit-list` render), `public/style.css`.
- **Approach:** Render audit entries with an actor tag, action text, and formatted time; style copilot-write entries distinctly. Data from `state.audit`.
- **Verification:** Browser — planner view shows the ledger; after an approved writeback, a new copilot entry appears.

### U5. Connectors mockup strip
- **Files:** Modify `public/index.html` (new Connectors section in couple view), `public/app.js` (mock connect interaction), `public/style.css`.
- **Approach:** Static mockup cards (Email, Invoicing, Budget, Calendar) each with name, what-it-syncs line, and a Connect button that toggles an inline "v2 preview" state. No fetch. Label the strip as roadmap.
- **Verification:** Browser — cards render; Connect shows the preview state; no console/network errors.

### U6. Runtime agent toggle (v2)
- **Files:** Modify `server.js` (mutable `liveMode`, `/api/agent-mode` GET+POST, dispatch uses runtime flag), `public/index.html` + `public/app.js` (toggle control), `test.js` (endpoint coverage).
- **Approach:** `let liveMode = LIVE_AGENT;` `GET /api/agent-mode` → `{live, keyPresent}`; `POST` sets `liveMode = !!body.live && !!AGENT_KEY`. Line-657 dispatch reads `liveMode && AGENT_KEY`. UI toggle GETs the state on load, POSTs on change, disables when `!keyPresent`. Add a test asserting default mode, POST-live-without-key stays deterministic, and POST-live-with-key flips.
- **Verification:** `node test.js` green (7 evals + new agent-mode test). Browser — toggle reflects state; deterministic path unchanged when off.

### U7. PRD + docs sync
- **Files:** Modify `public/prd.html`, vault PRD, this plan's related docs as needed.
- **Approach:** Reflect connectors-as-v2 and the demoable toggle in the roadmap/solution language; keep the canonical 300-word body intact (append only to non-body callouts/roadmap surfaces).
- **Verification:** Word count of canonical PRD body unchanged at 300; pages render.

### U8. Runbook update (conditional)
- **Files:** Modify `💼 Career/Roles/AcuityMD/prd_exercise/AcuityMD-Presentation-Runbook-2026-07-05.md` (vault).
- **Approach:** If the walk gains beats (phased timeline, connectors, live toggle), add them to the runbook flow; otherwise leave a note that the walk is unchanged.
- **Verification:** Runbook reflects the actual shipped demo beats.

### U9. Clean up + deploy
- **Files:** repo housekeeping; git.
- **Approach:** Remove any stale/dead files surfaced during the build. Run `node test.js` green. Merge branch to main, push, deploy to Railway, poll live URL, verify all beats.
- **Verification:** Live URL serves the expanded dashboard; evals green; containment sweep clean before push.

## Verification Contract

- `node test.js` → all 7 evals + panel checks pass, after every server-touching unit and before deploy.
- Browser (preview server) verification of each UI unit before merge.
- Live-URL poll after deploy confirms the new content serves.
- Containment sweep (no panelist/company/interview-prep terms) before the public push.

## Definition of Done

- R1–R15 satisfied; evals green; dashboard verified in-browser; deployed live and verified; PRD + runbook synced; repo clean; containment-swept.
