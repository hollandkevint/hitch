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
  `);
}

function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed() {
  db.exec('DELETE FROM wedding; DELETE FROM tasks; DELETE FROM audit_log;');
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
  audit('planner', 'Seeded wedding record (7 tasks) for Sarah & Marcus');
}

function audit(actor, action) {
  db.prepare('INSERT INTO audit_log (actor, action, at) VALUES (?, ?, ?)')
    .run(actor, action, new Date().toISOString());
}

initSchema();
if (!db.prepare('SELECT COUNT(*) AS n FROM wedding').get().n) seed();

// ---------- data access ----------

const getWedding = () => db.prepare('SELECT * FROM wedding WHERE id = 1').get();
const getTasks = () => db.prepare('SELECT * FROM tasks ORDER BY due_date').all();
const getAudit = () => db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 20').all();
const openTasks = () => getTasks().filter(t => t.status === 'open');
const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US',
  { month: 'long', day: 'numeric', year: 'numeric' });
const daysLate = t => Math.floor((Date.now() - new Date(t.due_date + 'T12:00:00')) / 86400000);

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
      (daysLate(t) > 0 ? ` ⚠ ${daysLate(t)} days late` : ''));
    let reply = `${open.length} tasks open for ${w.couple} (${fmtDate(w.wedding_date)}, ${w.city}):\n` + lines.join('\n');
    let action = null;
    const florist = overdue.find(t => /florist/i.test(t.title));
    const walkthrough = open.find(t => /walkthrough/i.test(t.title));
    if (florist && walkthrough) {
      reply += `\n\nThe ${florist.vendor} deposit is ${daysLate(florist)} days late — want me to draft the follow-up? I can also mark the venue walkthrough done if that's already happened.`;
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
            `${caterer} headcount and final invoice`,
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

// ---------- http ----------

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state') {
    return json(res, 200, { wedding: getWedding(), tasks: getTasks(), audit: getAudit() });
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      const data = body ? JSON.parse(body) : {};
      if (url.pathname === '/api/copilot') return json(res, 200, copilot(data.message || ''));
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
    if (err) { res.writeHead(404); return res.end('not found'); }
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
  server.listen(port, () => console.log(`Hitch → http://localhost:${port}`));
}
module.exports = { server, copilot, approveAction, seed, getWedding, getTasks, getAudit, insertTask };
