// Wedding Copilot — demo server. Zero deps: node:http + node:sqlite (Node 22+).
// Run: node server.js  → http://localhost:3000
// The thesis made real: the copilot reads THIS wedding's rows and writes back to them.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'wedding.db');
const db = new DatabaseSync(DB_PATH);

// ---------- schema + seed ----------

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wedding (
      id INTEGER PRIMARY KEY, couple TEXT, wedding_date TEXT, city TEXT, guest_count INTEGER
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, due_date TEXT NOT NULL,
      owner TEXT NOT NULL,            -- couple | planner
      vendor TEXT,                    -- nullable
      status TEXT NOT NULL DEFAULT 'open',  -- open | done
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,            -- couple | copilot | planner
      action TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      market TEXT NOT NULL,
      active_weddings INTEGER NOT NULL,
      pays_for_hitch TEXT NOT NULL,
      capacity_bottleneck TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      next_action TEXT NOT NULL,
      contract_amount INTEGER NOT NULL,
      risk TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      rsvp_status TEXT NOT NULL,
      table_preference TEXT NOT NULL,
      constraint_notes TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS budget_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      estimate INTEGER NOT NULL,
      committed INTEGER NOT NULL,
      variance INTEGER NOT NULL,
      dependency TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assumptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      assumption TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      risk_if_wrong TEXT NOT NULL,
      first_signal TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      idea TEXT NOT NULL,
      v1_decision TEXT NOT NULL,
      trigger_to_revisit TEXT NOT NULL
    );
  `);
}

function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed() {
  db.exec(`
    DELETE FROM wedding;
    DELETE FROM tasks;
    DELETE FROM audit_log;
    DELETE FROM planner_profile;
    DELETE FROM vendors;
    DELETE FROM guests;
    DELETE FROM budget_items;
    DELETE FROM assumptions;
    DELETE FROM ideas;
  `);
  db.prepare('INSERT INTO wedding (id, couple, wedding_date, city, guest_count) VALUES (1, ?, ?, ?, ?)')
    .run('Sarah & Marcus', '2026-10-17', 'Charleston', 120);
  const ins = db.prepare(
    'INSERT INTO tasks (title, due_date, owner, vendor, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  // ponytail: due dates computed relative to today so "6 days late" stays true whenever the demo runs
  ins.run('Pay florist deposit', daysFromToday(-6), 'couple', 'Petal & Stem Florals', 'open', now);
  ins.run('Confirm venue walkthrough', daysFromToday(-1), 'couple', 'The Cedar Room', 'open', now);
  ins.run('Follow up on 14 unanswered RSVPs', daysFromToday(3), 'couple', null, 'open', now);
  ins.run('Book caterer tasting', daysFromToday(9), 'couple', 'Lowcountry Catering Co.', 'open', now);
  ins.run('Send planner the final song list', daysFromToday(14), 'couple', 'Charleston Sound DJ', 'open', now);
  ins.run('Order welcome bags', daysFromToday(21), 'planner', null, 'open', now);
  ins.run('Confirm hotel room block', daysFromToday(-20), 'planner', 'The Restoration Hotel', 'done', now);
  seedSyntheticContext();
  audit('planner', 'Seeded wedding record (7 tasks) for Sarah & Marcus');
}

function seedSyntheticContext() {
  db.prepare(`
    INSERT INTO planner_profile
      (id, name, company, market, active_weddings, pays_for_hitch, capacity_bottleneck)
      VALUES (1, ?, ?, ?, ?, ?, ?)
  `).run(
    'Amelia Hart',
    'Harbor & Ivory Events',
    'Charleston',
    14,
    'planner',
    'Client and vendor coordination across too many channels'
  );

  const vendor = db.prepare(`
    INSERT INTO vendors (category, name, status, next_action, contract_amount, risk)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  [
    ['Venue', 'The Cedar Room', 'walkthrough pending', 'Confirm walkthrough and floor-plan lock', 18200, 'medium'],
    ['Florist', 'Petal & Stem Florals', 'deposit overdue', 'Draft deposit follow-up', 7400, 'high'],
    ['Caterer', 'Lowcountry Catering Co.', 'tasting open', 'Book tasting and confirm headcount policy', 21600, 'high'],
    ['DJ', 'Charleston Sound DJ', 'song list needed', 'Send final song list', 2800, 'low'],
    ['Hotel block', 'The Restoration Hotel', 'confirmed', 'Monitor pickup threshold', 0, 'low'],
    ['Rentals', 'King Street Rentals', 'quote pending', 'Compare chair upgrade quote', 6200, 'medium'],
    ['Photographer', 'Lena Brooks Photography', 'timeline draft needed', 'Share ceremony timing', 5300, 'medium'],
  ].forEach(row => vendor.run(...row));

  const guest = db.prepare(`
    INSERT INTO guests (party_name, relationship, party_size, rsvp_status, table_preference, constraint_notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  [
    ['Henderson party', 'college friends', 2, 'pending', 'near dance floor', 'A decline would move caterer headcount and table 4 balance'],
    ['Rivera family', 'bride family', 5, 'confirmed', 'family table', 'Two vegetarian meals'],
    ['Marcus work group', 'groom colleagues', 8, 'pending', 'grouped together', 'Three unanswered RSVPs'],
    ['Aunt Elaine', 'bride family', 1, 'confirmed', 'away from speakers', 'Mobility support'],
    ['Patel party', 'neighbors', 4, 'pending', 'no preference', 'Child meal count unknown'],
    ['College table', 'friends', 10, 'confirmed', 'near bar', 'High energy table'],
  ].forEach(row => guest.run(...row));

  const budget = db.prepare(`
    INSERT INTO budget_items (category, estimate, committed, variance, dependency)
    VALUES (?, ?, ?, ?, ?)
  `);
  [
    ['Catering', 21000, 21600, 600, 'Final headcount and tasting selection'],
    ['Florals', 6800, 7400, 600, 'Deposit must clear before centerpiece hold'],
    ['Venue', 18000, 18200, 200, 'Walkthrough locks floor plan'],
    ['Rentals', 5500, 6200, 700, 'Chair upgrade and linen color decision'],
    ['Music', 3000, 2800, -200, 'Final song list'],
    ['Hotel block', 0, 0, 0, 'Pickup threshold only'],
    ['Welcome bags', 2400, 0, -2400, 'Guest count and hotel pickup'],
  ].forEach(row => budget.run(...row));

  const assumption = db.prepare(`
    INSERT INTO assumptions (key, assumption, why_it_matters, risk_if_wrong, first_signal)
    VALUES (?, ?, ?, ?, ?)
  `);
  [
    ['planner-as-buyer', 'The planner pays and administers; the couple creates the usage wedge.', 'Positioning, permissions, and packaging need to sell planner capacity while feeling useful to couples.', 'If couple-paid, onboarding and pricing move toward consumer wedding planning instead of planner workflow.', 'Planner asks for multi-wedding controls, client-seat permissions, or business reporting.'],
    ['weekly-engagement', 'To-do and timeline work creates weekly return behavior before the wedding.', 'The v1 wedge must address usage drop, not just create a flashy planning moment.', 'If engagement is concentrated near wedding week, seating or guest workflows may outrank timeline.', 'Weekly active planning sessions do not improve after launch.'],
    ['approval-tolerance', 'Users will approve grounded writes when the footprint is explicit.', 'Writeback is the moat; too much friction collapses the value, too little control erodes trust.', 'If approvals feel like work, users stay in read-only advice mode.', 'Approval rate misses target or users repeatedly edit before approving.'],
    ['record-freshness', 'The shared wedding record is current enough to ground action.', 'A data product is only as good as its source-of-truth contract.', 'If planners maintain truth elsewhere, Hitch becomes another stale dashboard.', 'Planner corrections rise or vendors contradict the record.'],
    ['role-policy', 'Planner, couple, and vendor-adjacent data need different visibility before v2 autonomy.', 'B2B2C trust depends on actor-aware permissions, not one blended chat context.', 'The agent exposes private planner notes or lets the wrong actor approve a write.', 'Panel asks for per-actor auth before deeper agents.'],
    ['reversal-trust', 'Reversed or edited writebacks measure trust erosion.', 'Trust needs a counter-metric that can kill autonomy.', 'If reversals are invisible, the agent can degrade quietly.', 'Writebacks reversed exceeds 15% after two iterations.'],
  ].forEach(row => assumption.run(...row));

  const idea = db.prepare(`
    INSERT INTO ideas (key, idea, v1_decision, trigger_to_revisit)
    VALUES (?, ?, ?, ?)
  `);
  [
    ['generic-inspiration', 'Generic inspiration and trend advice', 'Ceded to ChatGPT/Pinterest in v1.', 'Revisit only if record-aware inspiration becomes differentiated.'],
    ['seating-copilot', 'Seating copilot', 'Deferred because it is episodic, not weekly.', 'Revisit when timeline loop lifts engagement and guest data is reliable.'],
    ['guest-list-copilot', 'Guest and RSVP copilot', 'Deferred behind to-do/timeline writeback.', 'Revisit when planner needs headcount automation and per-actor auth is ready.'],
    ['vendor-agent', 'Vendor follow-up automation beyond drafted messages', 'Deferred until role policy, approval audit, and vendor identity are stronger.', 'Revisit when planner trust and vendor communication logs are reliable.'],
    ['planner-white-label', 'White-label planner packaging', 'Deferred to v2 offering.', 'Revisit when planner-side retention and audit trust are proven.'],
    ['registry-thank-you', 'Registry gaps and thank-you follow-up', 'Roadmap after wedding-day planning.', 'Revisit when the record extends past the event into household setup.'],
  ].forEach(row => idea.run(...row));
}

function audit(actor, action) {
  db.prepare('INSERT INTO audit_log (actor, action, at) VALUES (?, ?, ?)')
    .run(actor, action, new Date().toISOString());
}

initSchema();
if (
  !db.prepare('SELECT COUNT(*) AS n FROM wedding').get().n ||
  !db.prepare('SELECT COUNT(*) AS n FROM planner_profile').get().n
) seed();

// ---------- data access ----------

const getWedding = () => db.prepare('SELECT * FROM wedding WHERE id = 1').get();
const getTasks = () => db.prepare('SELECT * FROM tasks ORDER BY due_date').all();
const getAudit = () => db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 20').all();
const getPlanner = () => db.prepare('SELECT * FROM planner_profile WHERE id = 1').get();
const getVendors = () => db.prepare('SELECT * FROM vendors ORDER BY id').all();
const getGuests = () => db.prepare('SELECT * FROM guests ORDER BY id').all();
const getBudget = () => db.prepare('SELECT * FROM budget_items ORDER BY id').all();
const getAssumptions = () => db.prepare('SELECT * FROM assumptions ORDER BY id').all();
const getIdeas = () => db.prepare('SELECT * FROM ideas ORDER BY id').all();
const getPanelState = () => ({
  wedding: getWedding(),
  tasks: getTasks(),
  audit: getAudit(),
  planner: getPlanner(),
  vendors: getVendors(),
  guests: getGuests(),
  budget: getBudget(),
  assumptions: getAssumptions(),
  ideas: getIdeas(),
});
const openTasks = () => getTasks().filter(t => t.status === 'open');
const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US',
  { month: 'long', day: 'numeric', year: 'numeric' });
// Calendar-day difference, timezone-independent: the server (UTC on Railway) and
// the browser (local) must show the same number of days late side by side.
const daysLate = t => {
  const [y, mo, d] = t.due_date.split('-').map(Number);
  const n = new Date();
  return Math.round((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(y, mo - 1, d)) / 86400000);
};
const lateLabel = n => n === 1 ? '1 day late' : `${n} days late`;

// Pending actions the copilot has drafted, keyed by id. Approval is the ONLY write path. (eval 4)
const pendingActions = new Map();
let nextActionId = 1;

function draftAction(kind, label, stakes, draft, writes, extra = {}) {
  const id = nextActionId++;
  // `cascade` (array of strings) + `reversible` (bool) drive the confirm-gate copy for
  // high-stakes writes. The gate NAMING the downstream effects is the product's judgment beat.
  const action = { id, kind, label, stakes, draft, writes, ...extra };
  pendingActions.set(id, action);
  return action;
}

// ---------- the copilot rule engine (grounded: every reply is built from live rows) ----------

function copilot(message) {
  const m = message.toLowerCase();
  const w = getWedding();
  const open = openTasks();

  // Intent: "what's left?" — the hero path
  if (/what'?s left|whats left|remaining|what do we|what's next|to.?do|status/.test(m)) {
    const overdue = open.filter(t => daysLate(t) > 0);
    const lines = open.map(t =>
      `• ${t.title}${t.vendor ? ` (${t.vendor})` : ''} — due ${fmtDate(t.due_date)}` +
      (daysLate(t) > 0 ? ` ⚠ ${lateLabel(daysLate(t))}` : ''));
    let reply = `${open.length} tasks open for ${w.couple} (${fmtDate(w.wedding_date)}, ${w.city}):\n` + lines.join('\n');
    let action = null;
    const florist = overdue.find(t => /florist/i.test(t.title));
    const walkthrough = open.find(t => /walkthrough/i.test(t.title));
    if (florist && walkthrough) {
      reply += `\n\nThe ${florist.vendor} deposit is ${lateLabel(daysLate(florist))} — want me to draft the follow-up? I can also mark the venue walkthrough done if that's already happened.`;
      action = draftAction(
        'followup+complete',
        `Draft follow-up to ${florist.vendor} + mark "${walkthrough.title}" done`,
        'low',
        `To: ${florist.vendor}\n\nHi — following up on the deposit for the ${w.couple} wedding on ${fmtDate(w.wedding_date)} in ${w.city}. We'd love to lock in the arrangements this week. Could you confirm the amount due and the payment link?\n\nThanks!\n${w.couple.split(' & ')[0]}`,
        [
          { type: 'complete_task', taskId: walkthrough.id, title: walkthrough.title },
          { type: 'log_only', note: `Drafted deposit follow-up to ${florist.vendor}` },
        ]);
    }
    return { reply, action };
  }

  // Intent: "mark the caterer booked" / "mark X done"
  const mark = m.match(/mark (?:the )?(.+?) (?:as )?(done|booked|complete|completed)/);
  if (mark) {
    const needle = mark[1];
    const task = open.find(t =>
      t.title.toLowerCase().includes(needle) || (t.vendor || '').toLowerCase().includes(needle));
    if (task) {
      return {
        reply: `Found it in your list: "${task.title}"${task.vendor ? ` (${task.vendor})` : ''}, due ${fmtDate(task.due_date)}. Mark it done?`,
        action: draftAction('complete', `Mark "${task.title}" done`, 'low', null,
          [{ type: 'complete_task', taskId: task.id, title: task.title }]),
      };
    }
    return { reply: `I don't see "${needle}" in ${w.couple}'s open tasks, so I won't touch the record. Here's what IS open: ${open.map(t => t.title).join('; ')}.`, action: null };
  }

  // Intent: high-stakes multi-party write — RSVP decline changes the caterer headcount.
  // Deliberately narrow: only decline-shaped language drafts this write. Mentioning a
  // guest, a table, or the count is not a decline.
  if (/declin|rsvp.*\b(no|out|regret)/.test(m)) {
    const caterer = getTasks().find(t => /cater/i.test(t.vendor || ''))?.vendor || 'your caterer';
    return {
      reply: `That changes your guest count from ${w.guest_count} to ${w.guest_count - 2}, which changes the headcount ${caterer} bills against. I can record it, but this one needs your explicit confirmation.`,
      action: draftAction('rsvp_decline', `Record decline (−2 guests) and update caterer headcount`, 'high', null,
        [{ type: 'update_guest_count', delta: -2 }],
        {
          cascade: [
            `Guest count ${w.guest_count} → ${w.guest_count - 2}`,
            `${caterer} headcount and final balance`,
            `Your seating plan (2 seats to reassign)`,
          ],
          reversible: true,
        }),
    };
  }

  // Steady counsel — decision-realistic, non-sycophantic. The agent frames the call,
  // shows the cascade from the record, and hands judgment back. No write, no false cheer.
  if (/cut the guest|cut guests|smaller wedding|afford|budget|overwhelm|stress|too much|worth it|should we/.test(m)) {
    const overdueCount = open.filter(t => daysLate(t) > 0).length;
    const dueThisWeek = open.filter(t => daysLate(t) > -7).length;
    const weeksOut = Math.max(0, Math.round((new Date(w.wedding_date) - Date.now()) / (7 * 86400000)));
    if (/overwhelm|stress|too much/.test(m)) {
      return {
        reply: `Planning fatigue at ${weeksOut} weeks out is normal — this is the stretch most couples find hardest. Here's the actual size of it: ${open.length} tasks open, ${dueThisWeek} due this week, ${overdueCount} late. That's an evening, not a mountain. Want me to draft the overdue one so it's off your plate tonight?`,
        action: null,
      };
    }
    return {
      reply: `Here's what the record can tell you: you're at ${w.guest_count} guests, ${weeksOut} weeks out, with ${open.length} tasks open. Cutting guests moves your catering headcount, seating, and welcome bags; it doesn't move the florist or the DJ. What it can't tell you is who matters — that call is yours and ${w.couple.includes('&') ? 'your partner’s' : 'yours alone'}, and I won't pretend otherwise. If you add per-head costs to the record, I'll model the actual savings before you decide.`,
      action: null,
    };
  }

  // Grounded lookup — answer simple record questions directly from the rows. No action.
  if (/how many (guests|people)|guest count|guest total/.test(m)) {
    const rsvp = open.find(t => /rsvp/i.test(t.title));
    return {
      reply: `${w.guest_count} guests on the list for ${fmtDate(w.wedding_date)}.` +
        (rsvp ? ` One caveat from the record: "${rsvp.title}" is still open, so that number can move.` : ''),
      action: null,
    };
  }

  // Partial task mentions ("pay florist", "the rsvps") ground on the record
  // instead of refusing — the refusal below is only for things the record
  // genuinely doesn't hold. Exact-token match, length ≥ 4, read-only: this
  // branch never drafts an action, so it cannot widen the write surface.
  const STOP = new Set(['what', 'whats', 'this', 'that', 'with', 'left', 'done', 'mark',
    'wedding', 'week', 'weeks', 'guest', 'guests', 'should', 'record', 'open', 'late',
    'have', 'need', 'want', 'about', 'when', 'will', 'your', 'from', 'list']);
  const tokenize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(x => x.length >= 4 && !STOP.has(x));
  const asked = new Set(tokenize(m));
  if (asked.size) {
    const mentioned = getTasks().filter(t =>
      tokenize(`${t.title} ${t.vendor || ''}`).some(tok => asked.has(tok)));
    if (mentioned.length === 1) {
      const t = mentioned[0];
      const where = t.status === 'done'
        ? `already marked done in the record`
        : `open — due ${fmtDate(t.due_date)}${daysLate(t) > 0 ? `, ${lateLabel(daysLate(t))}` : ''}`;
      return {
        reply: `That's in the record: "${t.title}"${t.vendor ? ` (${t.vendor})` : ''} is ${where}.` +
          (t.status === 'open' ? ` Say "mark the ${t.title.toLowerCase()} done" once it's handled, or ask what's left for the full picture.` : ''),
        action: null,
      };
    }
    if (mentioned.length > 1) {
      return {
        reply: `The record has ${mentioned.length} entries that could be it:\n` +
          mentioned.map(t => `• ${t.title}${t.vendor ? ` (${t.vendor})` : ''} — ${t.status}`).join('\n') +
          `\nTell me which one, or say "mark the <task> done".`,
        action: null,
      };
    }
  }

  // Ungroundable — hand off, never invent, never write (eval 5)
  return {
    reply: `That one isn't in ${w.couple}'s wedding record yet, and I only act on what's actually in your plan. For general inspiration, a tool like ChatGPT or Pinterest will do better. Ask me anything the record can answer: what's left, what's late, how many guests — or tell me to mark something done.`,
    action: null,
  };
}

// The only write path. High-stakes actions require confirmed:true. (evals 3, 4)
function approveAction(id, confirmed) {
  const action = pendingActions.get(id);
  if (!action) return { error: 'Unknown or expired action', status: 404 };
  if (action.stakes === 'high' && !confirmed) {
    return { error: 'High-stakes action requires explicit confirmation', status: 400 };
  }
  const now = new Date().toISOString();
  for (const wr of action.writes) {
    if (wr.type === 'complete_task') {
      db.prepare("UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ?").run(now, wr.taskId);
      audit('hitch', `Marked "${wr.title}" done (approved by couple)`);
    } else if (wr.type === 'update_guest_count') {
      db.prepare('UPDATE wedding SET guest_count = guest_count + ? WHERE id = 1').run(wr.delta);
      audit('hitch', `Updated guest count by ${wr.delta} (RSVP decline, confirmed by couple)`);
    } else if (wr.type === 'log_only') {
      audit('hitch', wr.note);
    }
  }
  pendingActions.delete(id);
  return { ok: true };
}

function agentPreview(scenario = 'hendersons_declined') {
  const state = getPanelState();
  const hendersons = state.guests.find(g => /Henderson/i.test(g.party_name));
  const caterer = state.vendors.find(v => v.category === 'Caterer');
  const rentals = state.vendors.find(v => v.category === 'Rentals');
  const cateringBudget = state.budget.find(b => b.category === 'Catering');

  const previews = {
    hendersons_declined: {
      scenario: 'hendersons_declined',
      title: 'Hendersons decline after seating work has started',
      reads: [
        `wedding.guest_count = ${state.wedding.guest_count}`,
        `guests.${hendersons?.party_name || 'Henderson party'} = ${hendersons?.party_size || 2} guests, ${hendersons?.rsvp_status || 'declined'}`,
        `vendors.${caterer?.name || 'caterer'} risk = ${caterer?.risk || 'high'}`,
        `budget.Catering committed = $${cateringBudget?.committed || 21600}`,
      ],
      agent_steps: [
        'Detect the RSVP decline as a cross-party change, not a simple task completion.',
        'Trace the cascade: guest count, caterer headcount, contract exposure, and seating balance.',
        'Classify by write policy: high value, reversible, but shared-state blast radius across planner and vendor.',
        'Stop at human approval; do not write from the preview.',
      ],
      proposed_tools: [
        { name: 'update_guest_count', args: { delta: -2 }, policy: 'gated' },
        { name: 'flag_seating_rebalance', args: { table: 'table 4' }, policy: 'gated' },
        { name: 'draft_caterer_note', args: { vendor: caterer?.name || 'Lowcountry Catering Co.' }, policy: 'human-send' },
      ],
      write_policy: 'gated: value is high and the change touches planner, vendor, and seating records.',
      approval_needed: true,
      would_write: false,
      business_impact: 'Planner capacity improves because Hitch finds the cascade before Amelia has to reconcile three channels manually.',
    },
    seating_rebalance: {
      scenario: 'seating_rebalance',
      title: 'Late RSVP forces a seating and rentals check',
      reads: [
        'guests: table preference and constraint notes',
        `vendors.${rentals?.name || 'rentals'} next_action = ${rentals?.next_action || 'compare quote'}`,
        'budget.Rentals variance = chair upgrade exposure',
        'tasks: venue walkthrough still open',
      ],
      agent_steps: [
        'Group affected parties by table preference and constraint notes.',
        'Identify which seating movement is reversible inside the record.',
        'Hold vendor-facing messages for planner approval.',
      ],
      proposed_tools: [
        { name: 'propose_table_move', args: { party: 'Henderson party', from: 'table 4' }, policy: 'gated' },
        { name: 'log_seating_risk', args: { note: 'table 4 balance changed' }, policy: 'flows' },
      ],
      write_policy: 'mixed: internal notes can flow; table moves get approval; vendor sends are refused.',
      approval_needed: true,
      would_write: false,
      business_impact: 'The planner sees a narrow seating exception instead of manually auditing the whole chart.',
    },
    planner_capacity: {
      scenario: 'planner_capacity',
      title: 'Planner asks what needs attention across the client record',
      reads: [
        `planner.active_weddings = ${state.planner?.active_weddings || 14}`,
        'tasks: overdue and due-this-week work',
        'vendors: high-risk open actions',
        'assumptions: planner-as-buyer and reversal-trust',
      ],
      agent_steps: [
        'Rank work by client-visible risk and vendor dependency.',
        'Separate what Hitch can draft from what Amelia must decide.',
        'Suggest the next two approvals, not a generic dashboard.',
      ],
      proposed_tools: [
        { name: 'prioritize_vendor_queue', args: { limit: 2 }, policy: 'read-only' },
        { name: 'draft_client_update', args: { audience: 'couple' }, policy: 'human-send' },
      ],
      write_policy: 'read-first: planner console prioritizes, drafts, and stops before external sends.',
      approval_needed: true,
      would_write: false,
      business_impact: 'This is the v2 paid surface: capacity without headcount, grounded in the same shared record.',
    },
  };

  return { preview: true, ...(previews[scenario] || previews.hendersons_declined) };
}

// ---------- http ----------

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state') {
    return json(res, 200, getPanelState());
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      const data = body ? JSON.parse(body) : {};
      if (url.pathname === '/api/copilot') return json(res, 200, copilot(data.message || ''));
      if (url.pathname === '/api/agent-preview') return json(res, 200, agentPreview(data.scenario));
      if (url.pathname === '/api/approve') {
        const r = approveAction(data.id, !!data.confirmed);
        return json(res, r.status || 200, r);
      }
      if (url.pathname === '/api/reset') { seed(); return json(res, 200, { ok: true }); }
      json(res, 404, { error: 'not found' });
    });
    return;
  }
  // static
  const file = url.pathname === '/' ? '/index.html' : url.pathname;
  const fp = path.join(__dirname, 'public', path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(fp, (err, buf) => {
    if (err) {
      // unknown URLs get the same honesty the copilot gives ungroundable asks
      return fs.readFile(path.join(__dirname, 'public', '404.html'), (e2, page) => {
        res.writeHead(404, e2 ? {} : { 'Content-Type': 'text/html' });
        res.end(e2 ? 'not found' : page);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' });
    res.end(buf);
  });
});

// Test seam: seed one extra task without handing out the raw db handle —
// the approval path stays the only write path the app itself exposes.
function insertTask({ title, due_date = '2026-09-01', owner = 'couple', status = 'open' }) {
  db.prepare('INSERT INTO tasks (title, due_date, owner, status, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(title, due_date, owner, status, new Date().toISOString());
}

if (require.main === module) {
  // ponytail: bind the host-assigned PORT on all interfaces (0.0.0.0) so Railway/Render
  // can route to it; loopback-only bind fails the platform healthcheck. Local still works.
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Hitch Planning → http://localhost:${port}`));
}
module.exports = { server, copilot, approveAction, seed, getWedding, getTasks, getAudit, insertTask };
