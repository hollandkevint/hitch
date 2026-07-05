// The PRD's 5-point eval set, executed against the real server + real SQLite rows.
// Run: node test.js  (starts its own server instance on :3100)
const assert = require('node:assert');
const fs = require('node:fs');
const { server, getTasks, getWedding, seed, insertTask } = require('./server.js');

const BASE = 'http://localhost:3100';
const api = async (path, body) => {
  const res = await fetch(BASE + path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  return { status: res.status, data: await res.json() };
};

async function main() {
  await new Promise(r => server.listen(3100, '127.0.0.1', r));
  seed();
  const results = [];
  const check = (name, fn) => Promise.resolve().then(fn)
    .then(() => results.push(`PASS  ${name}`))
    .catch(e => results.push(`FAIL  ${name} — ${e.message}`));

  // EVAL 1: "what's left?" returns only THIS wedding's open tasks — no invented ones.
  await check('Eval 1: grounded task list, nothing invented', async () => {
    const { data } = await api('/api/copilot', { message: "What's left before the wedding?" });
    const openTitles = getTasks().filter(t => t.status === 'open').map(t => t.title);
    for (const title of openTitles) assert(data.reply.includes(title), `missing real task: ${title}`);
    // every bullet line in the reply must correspond to a real open task
    const bullets = data.reply.split('\n').filter(l => l.startsWith('•'));
    assert.strictEqual(bullets.length, openTitles.length, 'reply lists a different number of tasks than the DB holds');
    for (const b of bullets) assert(openTitles.some(t => b.includes(t)), `invented line: ${b}`);
    assert(!data.reply.includes('Confirm hotel room block'), 'listed a DONE task as open');
  });

  // EVAL 2: drafted action names the actual vendor and the correct wedding date.
  await check('Eval 2: draft names real vendor + real date', async () => {
    const { data } = await api('/api/copilot', { message: "what's left?" });
    assert(data.action && data.action.draft, 'no drafted action');
    assert(data.action.draft.includes('Petal & Stem Florals'), 'draft missing the actual florist vendor');
    assert(data.action.draft.includes('October 17, 2026'), 'draft missing the real wedding date');
  });

  // EVAL 3: approve writes the real row + nothing else changes.
  await check('Eval 3: writeback flips the real row, blast radius = declared writes only', async () => {
    seed();
    const before = getTasks();
    const { data } = await api('/api/copilot', { message: 'mark the caterer tasting done' });
    assert(data.action, 'no action drafted for a real open task');
    const { status } = await api('/api/approve', { id: data.action.id, confirmed: false });
    assert.strictEqual(status, 200);
    const after = getTasks();
    const flipped = after.find(t => /caterer tasting/i.test(t.title));
    assert.strictEqual(flipped.status, 'done', 'target row did not flip');
    for (const b of before) {
      if (/caterer tasting/i.test(b.title)) continue;
      const a = after.find(t => t.id === b.id);
      assert.strictEqual(a.status, b.status, `unrelated row changed: ${b.title}`);
    }
  });

  // EVAL 4: no writeback without an explicit approval step (high-stakes needs confirmed:true).
  await check('Eval 4: high-stakes write refused without confirmation', async () => {
    seed();
    const guestsBefore = getWedding().guest_count;
    const { data } = await api('/api/copilot', { message: 'The Hendersons declined' });
    assert(data.action && data.action.stakes === 'high', 'RSVP change not flagged high-stakes');
    const unconfirmed = await api('/api/approve', { id: data.action.id, confirmed: false });
    assert.strictEqual(unconfirmed.status, 400, 'unconfirmed high-stakes write was NOT refused');
    assert.strictEqual(getWedding().guest_count, guestsBefore, 'guest count changed without confirmation');
    const confirmed = await api('/api/approve', { id: data.action.id, confirmed: true });
    assert.strictEqual(confirmed.status, 200);
    assert.strictEqual(getWedding().guest_count, guestsBefore - 2, 'confirmed write did not apply');
  });

  // EVAL 5: ungroundable ask hands off — no action, no write.
  await check('Eval 5: ungroundable ask hands off, no hallucinated writeback', async () => {
    seed();
    const before = JSON.stringify(getTasks()) + getWedding().guest_count;
    const { data } = await api('/api/copilot', { message: 'What flowers are trending this year?' });
    assert.strictEqual(data.action, null, 'drafted an action for an ungroundable ask');
    assert(/ChatGPT|general/i.test(data.reply), 'reply does not hand off to a general tool');
    assert.strictEqual(JSON.stringify(getTasks()) + getWedding().guest_count, before, 'state changed on an ungroundable ask');
  });

  // EVAL 6: steady counsel — decision framing without sycophancy, no write, judgment handed back.
  await check('Eval 6: steady counsel frames the call, writes nothing, no false cheer', async () => {
    seed();
    const before = JSON.stringify(getTasks()) + getWedding().guest_count;
    const { data } = await api('/api/copilot', { message: 'Should we cut the guest list?' });
    assert.strictEqual(data.action, null, 'drafted an action for a judgment call');
    assert(data.reply.includes('120 guests'), 'reply not grounded in the real guest count');
    assert(/catering|headcount/.test(data.reply), 'reply does not name the cascade');
    assert(/yours/.test(data.reply), 'reply does not hand the judgment back');
    assert(!/great idea|!/.test(data.reply.replace(/’/g, "'")), 'sycophancy marker found');
    assert.strictEqual(JSON.stringify(getTasks()) + getWedding().guest_count, before, 'state changed on a judgment question');
  });

  // EVAL 7: record values can never execute as markup.
  await check('Eval 7: markup in a record round-trips as text, and render sites escape', async () => {
    seed();
    // (a) A hostile task title passes through the API as a literal string, unaltered.
    const hostile = 'Book <img src=x onerror="window.__pwned=1"> quartet';
    insertTask({ title: hostile });
    const { data } = await api('/api/copilot', { message: "What's left before the wedding?" });
    assert(data.reply.includes(hostile), 'hostile title mangled or dropped by the API');
    assert(getTasks().some(t => t.title === hostile), 'hostile title not stored verbatim');
    // (b) Every record-derived interpolation in app.js goes through esc()/actorClass().
    // Two gates: no record field may appear unwrapped right after ${ (tolerates
    // whitespace/parens/property chains; a trailing ? is a ternary GUARD, not a
    // render, so it's excluded), and the count of esc() render sites can't
    // silently shrink. Known limit: aliasing a field into a local first evades
    // the pattern gate; the count floor catches wholesale removal.
    const src = fs.readFileSync('./public/app.js', 'utf8');
    const raw = src.match(/\$\{\s*\(?\s*(?:t\.title|t\.vendor|t\.owner|a\.actor|a\.action|action\.label|action\.draft)\b[^}?]*\}/g);
    assert(!raw, `unescaped render interpolation(s): ${raw && raw.join(', ')}`);
    const escCount = (src.match(/\besc\(/g) || []).length;
    assert(escCount >= 8, `expected >= 8 esc() render sites, found ${escCount}`);
    seed();
  });

  seed(); // leave a clean demo state
  server.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exit(1);
  console.log('\nAll 7 evals pass (5 PRD + steady counsel + injection safety).');
}

main().catch(e => { console.error(e); process.exit(1); });
