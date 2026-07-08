# Hitch · a Hitch Planning prototype

*Your wedding, without a hitch.*

Hitch is a reference implementation of **governed agent writeback**: an assistant that is grounded in a real system-of-record, drafts the next action from live rows, and writes back only through an approval gate the server enforces. The thesis it demonstrates: **the harness is the product, and the model is swappable.** Most agent failures are harness-layer failures, so the layer worth engineering is the one that decides what the agent may read, what it may write, and what proof gates the write.

One `server.js` (node:http), one vanilla-JS page, one eval file. Storage sits behind a small adapter: Postgres when `DATABASE_URL` is set (Railway), zero-dependency `node:sqlite` otherwise.

## Run

```
node server.js        # Node 22+. -> http://localhost:3000
node test.js          # 7 binary evals against the live API + real rows (SQLite locally; set DATABASE_URL to run them against Postgres)
```

Reset demo state anytime: `curl -X POST localhost:3000/api/reset`, or delete `wedding.db` and restart.

## What it demonstrates

1. **Grounded reads.** "What's left before the wedding?" returns the real open rows from the `tasks` table, with computed days-late on the overdue florist deposit. Nothing invented (Eval 1 enforces this).
2. **Drafts from rows, not canned text.** The drafted vendor email names the actual florist and the actual wedding date, interpolated from the record (Eval 2).
3. **Approval-only writeback.** Approve flips the real row, the timeline re-renders, and an audit entry lands. Blast radius is the declared writes only (Eval 3).
4. **A server-enforced confirm gate.** "The Hendersons declined" changes shared vendor-facing state, so it is high-stakes: the UI shows the named downstream cascade (guest count, caterer invoice, seating), and the server refuses the write without `confirmed: true`. The gate is policy, not a UI courtesy (Eval 4).
5. **Deliberate handoff.** "What flowers are trending?" cannot be grounded in the record, so Hitch hands off to a general tool and writes nothing (Eval 5).
6. **Steady counsel, no sycophancy.** "Should we cut the guest list?" gets the decision framed from real numbers, the cascade named, and the judgment handed back. No false cheer, no write (Eval 6).
7. **Injection safety.** A hostile string in a record round-trips the API as literal text, and a source gate asserts every record-derived render site escapes (Eval 7). Rendered-DOM behavior is verified in a browser pass.

## Architecture

- `wedding` / `tasks` / `audit_log` tables in the database. The writeback flips a real row, not component memory.
- The assistant is a deterministic server-side rule engine over live SELECTs; every reply string is interpolated from rows. In production this becomes an LLM with atomic read/update tools, and the **approval-only write path plus the eval gate stay exactly where they are.** That governed layer is model-agnostic by construction.
- Write policy = value x reversibility. Low-stakes task completion applies after one approval; anything touching shared vendor-facing state requires the confirm gate. Enforced server-side.
- The evals in `test.js` are the acceptance harness: binary, fast, and run against the real API and real rows. Swap the rule engine for a model and the same evals still decide whether the system is safe to ship.

## Design lineage

- **[ThinkHaven Method Kit](https://github.com/hollandkevint/thinkhaven-method-kit)**: the anti-sycophancy stance (Eval 6) and the assumption-mapper-as-write-gate pattern (the confirm dialog names concrete downstream effects before any write).
- **DPOS, "decisions not dashboards"**: the assistant's job is to advance a decision against the record, not to summarize it.

## Provenance

Built July 2026 as a working prototype, then hardened for release. Deliberately a minimal Node app rather than a hosted builder stack: every layer stays inspectable, local runs need no install (node:sqlite), and production runs on managed Postgres behind the same adapter.

## License

MIT.
