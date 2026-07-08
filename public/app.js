// Wedding Copilot UI — vanilla JS, all state lives on the server (that's the point).

const $ = sel => document.querySelector(sel);
let pendingHighStakes = null; // action awaiting the confirm dialog

// Every record-derived string passes through esc() before hitting innerHTML —
// a record value can never execute as markup.
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ACTORS = new Set(['hitch', 'couple', 'planner']);
const actorClass = a => (ACTORS.has(a) ? a : 'unknown');

async function api(path, body) {
  const res = await fetch(path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  return res.json();
}

function fmtDue(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function daysLate(iso) {
  // calendar-day difference, matching the server's math exactly — the badge and
  // the copilot's reply are visible side by side and must agree
  const [y, mo, d] = iso.split('-').map(Number);
  const n = new Date();
  return Math.round((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(y, mo - 1, d)) / 86400000);
}

async function refresh() {
  const { wedding, tasks, audit, planner, vendors, guests, budget } = await api('/api/state');
  const weeksOut = Math.max(0, Math.round((new Date(wedding.wedding_date) - Date.now()) / (7 * 86400000)));
  $('#wedding-meta').textContent =
    `${wedding.couple} · ${new Date(wedding.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${wedding.city} · ${wedding.guest_count} guests · ${weeksOut} weeks out`;
  // triplicate form chrome: the record's own file number (initials + wedding MMDD)
  const initials = wedding.couple.split(/\s*&\s*/).map(n => n[0]).join('');
  $('#record-no').textContent =
    `record № ${initials}-${wedding.wedding_date.slice(5).replace('-', '')} · ${wedding.city}`;

  const open = tasks.filter(t => t.status === 'open');
  const done = tasks.filter(t => t.status === 'done');

  $('#task-list').innerHTML = timelineHtml(open);
  $('#done-list').innerHTML = done.map(t => `<li><span>${esc(t.title)}</span></li>`).join('');
  renderHints(open);

  $('#planner-task-list').innerHTML = tasks.map(t => `
    <li>
      <span>${t.status === 'done' ? '✓ ' : ''}${esc(t.title)}${t.vendor ? `<span class="vendor">${esc(t.vendor)} · owner: ${esc(t.owner)}</span>` : `<span class="vendor">owner: ${esc(t.owner)}</span>`}</span>
      <span class="due">${fmtDue(t.due_date)}</span>
    </li>`).join('');
  $('#audit-list').innerHTML = audit.map(a => `
    <li class="${a.actor === 'hitch' ? 'write' : ''}"><span class="actor ${actorClass(a.actor)}">${esc(a.actor)}</span> ${esc(a.action)}
      <time>${new Date(a.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
    </li>`).join('');
  renderRecordDepth({ planner, vendors, guests, budget });

  // first load only: Hitch opens grounded in the record, not with an empty pane.
  // After 9pm it acknowledges the hour first — most couples plan after work,
  // and steady counsel starts by noticing that.
  if (!window.__greeted) {
    window.__greeted = true;
    const hour = new Date().getHours();
    const late = hour >= 21 || hour < 5;
    // Planner-first: Hitch initiates. It surfaces the most-overdue open item and
    // offers to act, instead of waiting to be asked "what's left?".
    const overdue = open
      .filter(t => daysLate(t.due_date) > 0)
      .sort((a, b) => daysLate(b.due_date) - daysLate(a.due_date));
    const top = overdue[0];
    // addMsg writes via textContent (injection-safe by construction), so pass raw
    // strings here — esc() would double-escape "&" in a vendor name.
    const lead = top
      ? `${top.vendor ? top.vendor + ' — ' : ''}${top.title} is ${daysLate(top.due_date)} days past due. Want me to draft the follow-up? I can also mark anything you've already handled.`
      : `Nothing's overdue right now — want me to line up what's next before it slips?`;
    addMsg('bot', late
      ? `Planning after hours — that's most couples, honestly. You're ${weeksOut} weeks out with ${open.length} open. ${lead}`
      : `You're ${weeksOut} weeks out with ${open.length} items open. ${lead}`);
  }
}

function money(n) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// U1: the flat list becomes a phased sequence. Buckets by calendar-day distance so the
// most-overdue work reads first and the timeline tells the planner where attention goes next.
function timelineHtml(open) {
  const row = t => `
    <li data-task-id="${t.id}">
      <span>${esc(t.title)}${t.vendor ? `<span class="vendor">${esc(t.vendor)}</span>` : ''}${t.owner === 'planner' ? '<span class="owner-tag">planner</span>' : ''}</span>
      <span class="leader" aria-hidden="true"></span>
      <span class="due">${fmtDue(t.due_date)}${daysLate(t.due_date) > 0 ? `<span class="overdue-badge">⚠ ${daysLate(t.due_date)}d late</span>` : ''}</span>
    </li>`;
  const phases = [
    { label: 'Overdue', match: d => d > 0 },
    { label: 'This week', match: d => d <= 0 && d >= -7 },
    { label: 'Next 3 weeks', match: d => d < -7 && d >= -21 },
    { label: 'Later', match: d => d < -21 },
  ];
  const byDue = [...open].sort((a, b) => daysLate(b.due_date) - daysLate(a.due_date));
  return phases.map(p => {
    const items = byDue.filter(t => p.match(daysLate(t.due_date)));
    if (!items.length) return '';
    return `<li class="phase" aria-hidden="true">${p.label}<span class="phase-count">${items.length}</span></li>` + items.map(row).join('');
  }).join('');
}

// U3: the ask sequences off the real record. The first chip chases the most-overdue item,
// the second the next one due — so clicking down the chips walks the timeline in order.
function renderHints(open) {
  const host = $('#hints');
  if (!host) return;
  const byDue = [...open].sort((a, b) => daysLate(b.due_date) - daysLate(a.due_date));
  const chips = ["What's left before the wedding?"];
  if (byDue[0]) chips.push(`Mark ${byDue[0].title} done`);
  chips.push('The Hendersons declined', 'Should we cut the guest list?', 'What flowers are trending?');
  host.innerHTML = 'Try: ' + chips.map(c => `<button type="button" class="hint">${esc(c)}</button>`).join(' · ');
}

function renderRecordDepth({ planner, vendors, guests, budget }) {
  const slot = $('#record-depth-grid');
  if (!slot || !planner) return;
  const highRisk = vendors.filter(v => v.risk === 'high');
  const rsvp = { confirmed: 0, pending: 0, declined: 0 };
  guests.forEach(g => { rsvp[g.rsvp_status] = (rsvp[g.rsvp_status] || 0) + 1; });
  const totalEst = budget.reduce((s, b) => s + Number(b.estimate), 0);
  const totalCom = budget.reduce((s, b) => s + Number(b.committed), 0);
  const variance = budget.reduce((s, b) => s + Number(b.variance), 0);
  slot.innerHTML = `
    <article>
      <h3>Planner capacity</h3>
      <p><strong>${esc(planner.active_weddings)}</strong> active weddings</p>
      <p>${esc(planner.name)}, ${esc(planner.company)} · bottleneck: ${esc(planner.capacity_bottleneck)}</p>
    </article>
    <article>
      <h3>Budget</h3>
      <p><strong>${money(totalCom)}</strong> committed of ${money(totalEst)} est.</p>
      <p class="${variance > 0 ? 'over' : ''}">${variance > 0 ? money(variance) + ' over estimate' : 'within estimate'} · catering + rentals track headcount.</p>
    </article>
    <article>
      <h3>Guests</h3>
      <p><strong>${rsvp.confirmed}</strong> confirmed · ${rsvp.pending} pending · ${rsvp.declined} declined</p>
      <p>${guests.length} parties on the record · a decline cascades to caterer headcount.</p>
    </article>
    <article>
      <h3>Vendor risk</h3>
      <p>${highRisk.length ? highRisk.map(v => `${esc(v.name)} — ${esc(v.next_action)}`).join('<br>') : 'No high-risk vendors.'}</p>
    </article>`;
}

function addMsg(kind, text) {
  const div = document.createElement('div');
  div.className = `msg ${kind}`;
  div.textContent = text;
  $('#chat').appendChild(div);
  div.scrollIntoView({ block: 'nearest' });
  return div;
}

function renderAction(action) {
  const slot = $('#action-slot');
  if (!action) { slot.innerHTML = ''; return; }
  slot.innerHTML = `
    <div class="action-card" data-action-id="${action.id}">
      <h4>${esc(action.label)}</h4>
      ${action.stakes === 'high' ? '<p class="stakes-high">High-stakes change — confirmation required before anything is written.</p>' : ''}
      ${action.draft ? `<pre id="draft-text">${esc(action.draft)}</pre>` : ''}
      <div class="action-buttons">
        <button class="approve" id="btn-approve">Approve</button>
        <button class="edit" id="btn-edit">Edit</button>
      </div>
    </div>`;
  $('#btn-approve').onclick = () => approve(action);
  $('#btn-edit').onclick = () => {
    const pre = $('#draft-text');
    if (!pre) return;
    pre.contentEditable = 'true';
    pre.focus();
    // honest seam: edits aren't captured by the v0 write path, so say so
    // rather than silently discarding them on approve.
    if (!$('#edit-note')) {
      const note = document.createElement('p');
      note.id = 'edit-note';
      note.className = 'edit-note';
      note.textContent = 'Editing here is display-only in this prototype — approval records the draft as proposed. Capturing edits (and auditing them) is the v1 write path.';
      pre.after(note);
    }
  };
}

async function approve(action) {
  if (action.stakes === 'high') {
    // The confirm-gate names the real downstream cascade from the action payload.
    // Built with textContent (not innerHTML) so record values can never inject markup.
    pendingHighStakes = action;
    renderCascade(action);
    $('#confirm-overlay').hidden = false;
    $('#confirm-cancel').focus();
    return;
  }
  await executeApprove(action, false);
}

function closeConfirm(next) {
  $('#confirm-overlay').hidden = true;
  pendingHighStakes = null;
  // Return focus to where the user was before the dialog took it. The confirm
  // path passes an explicit target because approving destroys the action card.
  (next || $('#btn-approve') || $('#ask-input')).focus();
}

// Modal mechanics: Escape cancels; Tab cycles between the two buttons.
// Document-level with a visibility guard, so the trap holds even after a
// backdrop click moves focus out of the dialog subtree.
document.addEventListener('keydown', e => {
  if ($('#confirm-overlay').hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeConfirm(); return; }
  if (e.key === 'Tab') {
    e.preventDefault();
    (document.activeElement === $('#confirm-cancel') ? $('#confirm-yes') : $('#confirm-cancel')).focus();
  }
});

function renderCascade(action) {
  const slot = $('#confirm-text');
  slot.textContent = '';
  const intro = document.createElement('p');
  intro.className = 'cascade-intro';
  intro.textContent = 'Committing this changes:';
  slot.appendChild(intro);

  const list = document.createElement('ul');
  list.className = 'cascade-list';
  (action.cascade || [action.label]).forEach(line => {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  });
  slot.appendChild(list);

  const rev = document.createElement('p');
  rev.className = 'cascade-reversible';
  rev.textContent = action.reversible ? 'Reversible: yes — recording an offsetting change restores it.'
                                      : 'Reversible: no. This cannot be undone.';
  slot.appendChild(rev);
}

async function executeApprove(action, confirmed) {
  let r;
  try {
    r = await api('/api/approve', { id: action.id, confirmed });
  } catch {
    addMsg('bot', '⚠ Couldn\'t reach the record — nothing was written. Try the approval again.');
    return;
  }
  if (r.error) { addMsg('bot', `⚠ ${r.error}`); return; }
  renderAction(null);
  // the high-stakes close names what just happened; the routine close stays light
  addMsg('bot', confirmed
    ? 'Recorded. The cascade you confirmed is in the audit trail — your planner sees the same record you do.'
    : '✓ Done — your timeline is updated and the change is on the record.');
  await refresh(); // the writeback made visible: rows flip, planner audit trail gains an entry
  stampRecord(confirmed ? 'high' : 'routine');
  suggestNext(); // sequence the ask: name the next item due so the copilot walks the timeline
}

// U3: after acting, point at the next item in due order — the ask follows the record forward.
async function suggestNext() {
  try {
    const { tasks } = await api('/api/state');
    const next = (tasks || []).filter(t => t.status === 'open')
      .sort((a, b) => daysLate(b.due_date) - daysLate(a.due_date))[0];
    if (next) addMsg('bot', `Next up: ${next.title}${next.vendor ? ' (' + next.vendor + ')' : ''}, due ${fmtDue(next.due_date)}. Want me to take it?`);
  } catch { /* the timeline already refreshed; the nudge is a bonus, not load-bearing */ }
}

// The writeback moment, made physical: a rubber stamp lands on the timeline.
// Terracotta only for the confirmed high-stakes commit (consequence rule).
function stampRecord(kind) {
  const host = document.querySelector('#couple-view section.timeline');
  if (!host) return;
  host.querySelectorAll('.stamp').forEach(n => n.remove());
  const s = document.createElement('div');
  s.className = 'stamp' + (kind === 'high' ? ' stamp-high' : '');
  // a real rubber stamp never lands at the same angle twice
  const baseRot = kind === 'high' ? 3 : -5;
  s.style.setProperty('--rot', (baseRot + (Math.random() * 3.2 - 1.6)).toFixed(1) + 'deg');
  s.textContent = kind === 'high' ? 'Confirmed · recorded' : 'Recorded';
  host.appendChild(s);
  // routine stamps fade with their animation; the confirmed high-stakes stamp
  // stays pressed until the next interaction clears it (clearStamps below)
  if (kind !== 'high') setTimeout(() => s.remove(), 2300);
}
function clearStamps() {
  document.querySelectorAll('.stamp').forEach(n => n.remove());
}

// U5: mockup connectors — the v2 "connect your world" story made tangible. No network, no auth;
// clicking shows what the source would sync so the panel sees the shape, not a real integration.
const CONNECTORS = [
  { id: 'email', name: 'Email', via: 'Gmail · Outlook', syncs: 'Pull vendor threads and RSVP replies straight into the timeline.', preview: 'Would watch 3 vendor threads and file replies as record updates — each one still approved before it writes.' },
  { id: 'invoicing', name: 'Invoicing', via: 'QuickBooks · Rock Paper Coin', syncs: 'Track every vendor deposit and balance due against the budget.', preview: 'Would surface the Petal & Stem deposit and 4 upcoming balances as dated tasks on the timeline.' },
  { id: 'budget', name: 'Budget', via: 'Google Sheets', syncs: 'Keep line items and variance live instead of a stale export.', preview: 'Would two-way 6 budget lines so committed-vs-estimate stays current as vendors are paid.' },
  { id: 'calendar', name: 'Timeline', via: 'Google Calendar', syncs: 'Put the wedding timeline on everyone’s calendar, both directions.', preview: 'Would publish 6 milestones and read back reschedules from the couple’s calendar.' },
];
function renderConnectors() {
  const grid = $('#connector-grid');
  if (!grid) return;
  grid.innerHTML = CONNECTORS.map(c => `
    <article class="connector" data-id="${esc(c.id)}">
      <h3>${esc(c.name)} <span class="via">${esc(c.via)}</span></h3>
      <p>${esc(c.syncs)}</p>
      <button type="button" class="connect">Connect</button>
      <p class="connector-preview" hidden></p>
    </article>`).join('');
}
$('#connector-grid').addEventListener('click', e => {
  const btn = e.target.closest('.connect');
  if (!btn) return;
  const card = btn.closest('.connector');
  const c = CONNECTORS.find(x => x.id === card.dataset.id);
  const prev = card.querySelector('.connector-preview');
  if (prev.hidden) { prev.textContent = c.preview; prev.hidden = false; btn.textContent = 'Preview · v2'; card.classList.add('previewing'); }
  else { prev.hidden = true; btn.textContent = 'Connect'; card.classList.remove('previewing'); }
});

// U6: reflect + control the live-agent mode. Keyless → disabled with an honest label, so the
// toggle can advertise the v2 swap without ever stranding the demo on a call that can't happen.
async function initAgentToggle() {
  const box = $('#agent-live'), wrap = $('#agent-toggle'), label = $('#agent-mode-label');
  if (!box || !wrap) return;
  const paint = ({ live, keyPresent }) => {
    box.checked = !!live;
    box.disabled = !keyPresent;
    wrap.classList.toggle('disabled', !keyPresent);
    label.textContent = keyPresent ? (live ? 'Live agent · v2' : 'Deterministic') : 'Live needs API key';
  };
  try { paint(await api('/api/agent-mode')); } catch { paint({ live: false, keyPresent: false }); }
  box.onchange = async () => {
    try { paint(await api('/api/agent-mode', { live: box.checked })); }
    catch { paint({ live: false, keyPresent: false }); }
  };
}

// wire-up
$('#ask-form').onsubmit = async e => {
  e.preventDefault();
  const input = $('#ask-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  clearStamps();
  addMsg('user', q);
  const pending = addMsg('bot', 'Checking the record…');
  try {
    const { reply, action } = await api('/api/copilot', { message: q });
    pending.remove();
    addMsg('bot', reply);
    renderAction(action);
  } catch {
    pending.textContent = '⚠ Couldn\'t reach the record — ask that again.';
  }
};

// Delegated: renderHints() rebuilds the chips on every refresh, so bind the container once.
$('#hints').addEventListener('click', e => {
  const btn = e.target.closest('.hint');
  if (!btn) return;
  e.preventDefault();
  $('#ask-input').value = btn.textContent;
  $('#ask-form').requestSubmit();
});

$('#btn-couple').onclick = () => setView('couple');
$('#btn-planner').onclick = () => setView('planner');
function setView(v) {
  clearStamps();
  $('#couple-view').hidden = v !== 'couple';
  $('#planner-view').hidden = v !== 'planner';
  for (const [btn, active] of [[$('#btn-couple'), v === 'couple'], [$('#btn-planner'), v === 'planner']]) {
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1; // roving tabindex: one tab stop, arrows move within
  }
  refresh();
}
document.querySelector('.view-toggle').addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const next = document.activeElement === $('#btn-couple') ? 'planner' : 'couple';
  setView(next);
  $(`#btn-${next}`).focus();
});

$('#confirm-cancel').onclick = closeConfirm;
$('#confirm-yes').onclick = async () => {
  const action = pendingHighStakes;
  closeConfirm($('#ask-input')); // executeApprove removes the action card, so #btn-approve won't survive
  if (action) await executeApprove(action, true);
};

// presenter control: restore the clean seed and start the session over
const resetBtn = $('#reset-demo');
if (resetBtn) resetBtn.onclick = async () => {
  resetBtn.disabled = true;
  resetBtn.textContent = 'Resetting…';
  try { await api('/api/reset', {}); } catch { /* reload shows real state either way */ }
  location.reload();
};

// for the reader who opens DevTools: the interesting parts, mapped
console.log(
  '%cHitch%c — the record acts.\n' +
  'The gate is server-enforced: POST /api/approve on a high-stakes action refuses without {confirmed:true} (try it).\n' +
  'The v2 agent trace is POST /api/agent-preview — read-only, always would_write:false.\n' +
  'Seven evals + three panel checks: node test.js. The write-path split is in /architecture.html.',
  'font-family:Georgia,serif;font-size:14px;font-weight:600;color:#2b4a3e;',
  'color:#26302b;'
);

renderConnectors();
initAgentToggle();
refresh();
