---
title: Hitch Plan View + Budget Widget + Planner Console - Plan
type: feat
date: 2026-07-08
topic: hitch-plan-view-planner-console
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Hitch Plan View + Budget Widget + Planner Console - Plan

## Goal Capsule

- **Objective:** From live-demo review: make the agent toggle a real Demo⇄Agent switch, add a Gantt/plan-preview and a budget summary widget to the couple's app, and build out the underbuilt planner view into a buyer's console (capacity, attention queue, vendor oversight, budget exposure, audit ledger).
- **Product authority:** Kevin. Full-send to live (established posture); `3f9eafb` is the rollback point; production promotes only after evals + browser verify are green.
- **Constraints:** Zero new deps, all additive UI over the existing `/api/state`. No schema change, no change to the write gate or the 7 evals.

## Product Contract

### Requirements

**Agent toggle**
- R1. Replace the checkbox with a slider toggle switch flanked by "Demo" (deterministic) and "Agent" (live) labels; the active pole is emphasized. Keyless state disables it with a note. Underlying `#agent-live` input + `/api/agent-mode` logic unchanged.

**Couple plan preview + budget**
- R2. A plan-preview chart (Gantt/timeline) shows the couple's open tasks positioned from today to the wedding date, colored by phase, with the wedding day as the end marker. Reads as "what's due soon vs. how far out the day is."
- R3. A budget summary widget shows total committed vs. estimated with a progress bar and the top categories with per-category bars; over-estimate categories flagged. Derived from live budget data.
- R4. Both live in the couple view, full-width beneath the timeline/copilot row.

**Planner console**
- R5. The planner view leads with a capacity header: planner name, company, active weddings, bottleneck, plus this wedding's open/overdue counts.
- R6. An attention queue lists what needs the planner now: overdue tasks and high-risk vendors, prioritized.
- R7. Vendor oversight lists each vendor with risk, next action, and contract amount.
- R8. Budget exposure summarizes committed vs. estimate from the planner lens.
- R9. All-tasks (read-only) and the audit ledger are preserved.

### Key Decisions

- **Plan preview is a milestone Gantt, not a calendar.** All tasks cluster in July while the wedding is October, so a today→wedding timeline conveys the plan shape; a month calendar would pile everything in one column.
- **Everything reuses `/api/state`.** No new endpoints or schema — widgets are presentation over existing planner/vendor/budget/guest data, keeping eval risk at zero.
- **Planner view = the buyer's console.** The build-out makes the v2 paid-surface story concrete: capacity, cross-record risk, oversight — the reason a planner pays.

### Scope Boundaries
- No real integrations, no new deps, no schema/gate/eval changes.
- Gantt is milestone-position only (tasks have a due date, not a span).

## Implementation Units

### U1. Demo⇄Agent slider switch
- **Files:** `public/index.html` (toggle markup), `public/app.js` (`initAgentToggle` paint), `public/style.css` (switch + poles).
- **Verification:** Browser — switch renders, poles label Demo/Agent, disabled+noted when keyless; deterministic path unchanged.

### U2. Plan-preview Gantt (couple)
- **Files:** `public/index.html` (section), `public/app.js` (`renderPlanChart`), `public/style.css`.
- **Verification:** Browser — task bars positioned by due date, phase-colored, wedding end marker; no console errors.

### U3. Budget summary widget (couple)
- **Files:** `public/index.html` (section), `public/app.js` (`renderBudget`), `public/style.css`.
- **Verification:** Browser — total bar + category bars from live budget; over-estimate flagged.

### U4. Planner console build-out
- **Files:** `public/index.html` (planner-view restructure), `public/app.js` (`renderPlannerConsole` + reuse budget), `public/style.css`.
- **Verification:** Browser — capacity header, attention queue, vendor oversight, budget exposure, all-tasks + audit all render; view toggle still works.

### U5. Verify + docs + ship
- **Files:** docs (PRD/runbook light), git.
- **Verification:** `node test.js` 7/7 green; browser verify all units; merge to main, deploy, reset prod seed, verify live; containment sweep before push.

## Verification Contract
- `node test.js` green after any server touch (none expected) and before deploy.
- Browser verification of each UI unit.
- Live-URL poll + reset-to-clean-seed after deploy.

## Definition of Done
- R1–R9 satisfied; evals green; verified in-browser and live; prod reset clean; docs synced; repo clean; containment-swept.
