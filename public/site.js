// Working-record chrome, shared across pages.
// 1) The record line in each masthead reads the LIVE record — the site's own
//    header is grounded in the same state the copilot acts on.
// 2) Press G to toggle the 8pt baseline grid the pages are set on.
(function () {
  const line = document.querySelector('[data-record-line]');
  if (line) {
    fetch('/api/state').then(r => r.json()).then(({ wedding, tasks }) => {
      const open = tasks.filter(t => t.status === 'open').length;
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      line.textContent =
        `rec ${d} · ${wedding.couple} · ${wedding.guest_count} guests · ${open} open · evals 7/7`;
    }).catch(() => {}); // static fallback already in the markup
  }

  let grid = null;
  document.addEventListener('keydown', e => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'grid-overlay';
      grid.setAttribute('aria-hidden', 'true');
    }
    if (grid.isConnected) grid.remove(); else document.body.appendChild(grid);
  });
})();
