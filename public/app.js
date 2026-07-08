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
  return Math.floor((Date.now() - new Date(iso + 'T12:00:00')) / 86400000);
}

async function refresh() {
  const { wedding, tasks, audit, planner, vendors, guests, budget } = await api('/api/state');
  const weeksOut = Math.max(0, Math.round((new Date(wedding.wedding_date) - Date.now()) / (7 * 86400000)));
  $('#wedding-meta').textContent =
    `${wedding.couple} · ${new Date(wedding.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${wedding.city} · ${wedding.guest_count} guests · ${weeksOut} weeks out`;

  const open = tasks.filter(t => t.status === 'open');
  const done = tasks.filter(t => t.status === 'done');

  $('#task-list').innerHTML = open.map(t => `
    <li data-task-id="${t.id}">
      <span>${esc(t.title)}${t.vendor ? `<span class="vendor">${esc(t.vendor)}</span>` : ''}</span>
      <span class="due">${fmtDue(t.due_date)}
        ${daysLate(t.due_date) > 0 ? `<span class="overdue-badge">⚠ ${daysLate(t.due_date)}d late</span>` : ''}
      </span>
    </li>`).join('');
  $('#done-list').innerHTML = done.map(t => `<li>${esc(t.title)}</li>`).join('');

  $('#planner-task-list').innerHTML = tasks.map(t => `
    <li>
      <span>${t.status === 'done' ? '✓ ' : ''}${esc(t.title)}${t.vendor ? `<span class="vendor">${esc(t.vendor)} · owner: ${esc(t.owner)}</span>` : `<span class="vendor">owner: ${esc(t.owner)}</span>`}</span>
      <span class="due">${fmtDue(t.due_date)}</span>
    </li>`).join('');
  $('#audit-list').innerHTML = audit.map(a => `
    <li><span class="actor ${actorClass(a.actor)}">${esc(a.actor)}</span> ${esc(a.action)}
      <time>${new Date(a.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
    </li>`).join('');
  renderRecordDepth({ planner, vendors, guests, budget });
}

function money(n) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function renderRecordDepth({ planner, vendors, guests, budget }) {
  const slot = $('#record-depth-grid');
  if (!slot || !planner) return;
  const highRisk = vendors.filter(v => v.risk === 'high').map(v => `${v.name}: ${v.next_action}`);
  const pendingGuests = guests.filter(g => g.rsvp_status === 'pending');
  const overCommitted = budget.filter(b => Number(b.variance) > 0)
    .reduce((sum, b) => sum + Number(b.variance), 0);
  slot.innerHTML = `
    <article>
      <h3>Planner</h3>
      <p><strong>${esc(planner.name)}</strong>, ${esc(planner.company)}</p>
      <p>${esc(planner.active_weddings)} active weddings · bottleneck: ${esc(planner.capacity_bottleneck)}</p>
    </article>
    <article>
      <h3>Vendor risk</h3>
      <p>${highRisk.length ? highRisk.map(esc).join('<br>') : 'No high-risk vendors.'}</p>
    </article>
    <article>
      <h3>Guest state</h3>
      <p>${esc(pendingGuests.length)} of ${esc(guests.length)} parties pending · Henderson decline would cascade to caterer headcount and table 4.</p>
    </article>
    <article>
      <h3>Budget dependency</h3>
      <p>${money(overCommitted)} committed over estimate · catering and rentals depend on headcount/seating.</p>
    </article>`;
}

function addMsg(kind, text) {
  const div = document.createElement('div');
  div.className = `msg ${kind}`;
  div.textContent = text;
  $('#chat').appendChild(div);
  div.scrollIntoView({ block: 'nearest' });
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
    if (pre) { pre.contentEditable = 'true'; pre.focus(); }
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
  intro.textContent = 'This changes shared records your planner and vendors work from:';
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
  const r = await api('/api/approve', { id: action.id, confirmed });
  if (r.error) { addMsg('bot', `⚠ ${r.error}`); return; }
  renderAction(null);
  addMsg('bot', '✓ Done — your timeline is updated and the change is on the record.');
  await refresh(); // the writeback made visible: rows flip, planner audit trail gains an entry
  stampRecord(confirmed ? 'high' : 'routine');
}

// The writeback moment, made physical: a rubber stamp lands on the timeline.
// Terracotta only for the confirmed high-stakes commit (consequence rule).
function stampRecord(kind) {
  const host = document.querySelector('#couple-view section.timeline');
  if (!host) return;
  host.querySelectorAll('.stamp').forEach(n => n.remove());
  const s = document.createElement('div');
  s.className = 'stamp' + (kind === 'high' ? ' stamp-high' : '');
  s.textContent = kind === 'high' ? 'Confirmed · recorded' : 'Recorded';
  host.appendChild(s);
  setTimeout(() => s.remove(), 2600);
}

// wire-up
$('#ask-form').onsubmit = async e => {
  e.preventDefault();
  const input = $('#ask-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  addMsg('user', q);
  const { reply, action } = await api('/api/copilot', { message: q });
  addMsg('bot', reply);
  renderAction(action);
};

document.querySelectorAll('.hint').forEach(a => a.onclick = e => {
  e.preventDefault();
  $('#ask-input').value = a.textContent;
  $('#ask-form').requestSubmit();
});

$('#btn-couple').onclick = () => setView('couple');
$('#btn-planner').onclick = () => setView('planner');
function setView(v) {
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

refresh();
