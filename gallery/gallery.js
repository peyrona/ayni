/* Ayni Components gallery: the demo wiring of this page only (outputs, status messages, sample data).
   Every control's behaviour comes from the library (../cua.js); nothing here is needed by a real app. */
const { $, $$, status } = CUA;
const say = (id, msg) => { $('#' + id).textContent = msg; };

/* Mode label (desktop mode is >= 1024px) */
const mq = matchMedia('(min-width: 1024px)');
const mode = () => { $('#mode').textContent = mq.matches ? 'desktop mode · ≥1024px' : 'compact mode · <1024px'; };
mq.addEventListener('change', mode); mode();

/* ---------- Tabs ---------- */
const showTab = (t) => { $('#sb-tab').textContent = t.textContent.trim(); };
$('#tabs').addEventListener('cua:tabselect', (e) => showTab(e.detail));
showTab($('#tabs > [aria-selected="true"]'));
$$('.tabs-local').forEach((l) => {
  const reopen = l.closest('.spec')?.querySelector('#tabs-reopen');
  l.addEventListener('cua:tabclose', (e) => { status('Closed tab ' + e.detail.textContent.trim()); if (reopen) { reopen.removeAttribute('aria-disabled'); reopen.dataset.tip = 'Reopen closed tabs'; } });
  reopen?.addEventListener('click', () => { $$('[role="tab"][hidden]', l).forEach((t) => { t.hidden = false; }); reopen.setAttribute('aria-disabled', 'true'); reopen.dataset.tip = 'Reopen closed tabs: no tab is closed'; status('Tabs reopened'); });
});

/* Demo: Save is busy for 1.5 s; every third save fails and shows the usual error notification */
let saves = 0;
$('#save-demo').addEventListener('click', (e) => {
  const b = e.currentTarget; CUA.setBusy(b, 'Saving…'); status('Saving notes.txt…');
  setTimeout(() => {
    CUA.setBusy(b, false);
    if (++saves % 3 === 0) { status('Could not save notes.txt'); CUA.toast('err', 'Could not save notes.txt. Check your connection and try again.'); }
    else status('Saved notes.txt');
  }, 1500);
});

/* Light / dark mode */
document.addEventListener('cua:theme', (e) => status(e.detail.theme === 'dark' ? 'Dark mode on' : 'Dark mode off'));

/* ---------- Dialogs ---------- */
$$('dialog.panel').forEach((d) => d.addEventListener('close', () => {
  if (d.id === 'dlg-form') return; // reports its own result
  const m = `${$('h2', d).textContent} → ${d.returnValue || 'closed'}`; say('dlg-out', m); status(m);
}));
/* Live settings: each change applies at once */
$('#set-compact').addEventListener('change', (e) => { $('.gallery').classList.toggle('compact', e.target.checked); status('Compact spacing ' + (e.target.checked ? 'on' : 'off')); });
$('#set-status').addEventListener('change', (e) => { $('.gallery > .statusbar').hidden = !e.target.checked; });
/* Rename: applied when the dialog closes (Close button or Esc) */
let fileName = 'notes.txt';
const nameIn = $('#df-name'), nameErr = $('#df-err');
const nameOk = () => { const v = nameIn.value.trim(); return v !== '' && !/[\\/]/.test(v); };
nameIn.addEventListener('input', () => { const ok = nameOk(); nameIn.setAttribute('aria-invalid', !ok); nameErr.hidden = ok; });
$('#dlg-form').addEventListener('close', () => {
  const v = nameIn.value.trim(); let m;
  if (!nameOk()) m = `Name not changed: "${v}" is not a valid name`;
  else if (v === fileName) m = 'Name not changed';
  else { m = `Renamed ${fileName} to ${v}`; fileName = v; }
  nameIn.value = fileName; nameIn.removeAttribute('aria-invalid'); nameErr.hidden = true;
  say('dlg-out', m); status(m);
});
$('#open-modeless').onclick = () => { const d = $('#dlg-find'); d.open ? d.close() : d.show(); $('#dfi-q').focus(); };
$('#find-all').onclick = () => status(`Listed all matches for "${$('#dfi-q').value}"`);
$('#find-next').onclick = () => { const m = `Find next: "${$('#dfi-q').value}"`; say('dlg-out', m); status(m); };

/* ---------- Buttons ---------- */
const all = $('#chk-all'), subs = $$('.chk-sub');
const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
all.onchange = () => { subs.forEach((s) => (s.checked = all.checked)); syncAll(); };
subs.forEach((s) => (s.onchange = syncAll)); syncAll();
/* Second action: show which action ran */
document.addEventListener('cua:press', (e) => { say('alt-out', e.detail.label); status(e.detail.label); });

/* ---------- Lists ---------- */
const reportList = (lb) => {
  const sel = $$('[role="option"][aria-selected="true"]', lb).map((o) => o.textContent.trim());
  say(lb.id + '-out', 'Selected: ' + (sel.join(', ') || 'none'));
  if (lb.getAttribute('aria-multiselectable') === 'true') $('#sb-sel').textContent = sel.length ? `${sel.length} file${sel.length > 1 ? 's' : ''} selected` : 'No selection';
};
$$('.lb').forEach((lb) => { lb.addEventListener('cua:change', () => reportList(lb)); reportList(lb); });
/* List picker: what the form would send */
document.addEventListener('cua:change', (e) => {
  if (!e.target.matches('.picker')) return;
  const { value: v, name, field, input } = e.detail;
  status(`${name}: ${v || '(empty)'}`); $('#' + field.id + '-out') && say(field.id + '-out', `Submits ${input.name}=${v}`);
});
/* Tree: the path of the opened item */
$('#tree').addEventListener('cua:select', (e) => { const p = e.detail.path.join(' / '); say('tree-out', p); status('Opened ' + p); });

/* ---------- Texts ---------- */
const email = $('#tf-email'), emailErr = $('#tf-email-err');
const checkEmail = () => { const bad = !email.checkValidity() || !/@.+\./.test(email.value); email.setAttribute('aria-invalid', bad); emailErr.hidden = !bad; };
email.addEventListener('blur', checkEmail); email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true') checkEmail(); }); checkEmail();
const fruits = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Fig', 'Grape', 'Lemon', 'Mango', 'Orange', 'Pear', 'Plum'];
const groups = { citrus: ['Lemon', 'Orange'], orchard: ['Apple', 'Apricot', 'Fig', 'Pear', 'Plum'], tropical: ['Banana', 'Mango'], berries: ['Cherry', 'Grape'] };
let fruitGroup = 'all';
const sf = $('#sf'), filter = () => {
  const q = sf.value.trim().toLowerCase();
  const r = fruits.filter((f) => f.toLowerCase().includes(q) && (fruitGroup === 'all' || groups[fruitGroup].includes(f)));
  say('sf-out', r.length ? r.join(' · ') : 'No matches. Try another word or filter.');
};
$('#m-filter').addEventListener('cua:choose', (e) => {
  fruitGroup = e.detail.dataset.f; const b = $('#sf-filter');
  b.dataset.tip = 'Filter: ' + e.detail.dataset.act.toLowerCase(); b.classList.toggle('is-active', fruitGroup !== 'all'); filter();
});
sf.addEventListener('input', filter);
$('#sf-go').onclick = () => { filter(); sf.focus(); status(`Searched for "${sf.value}"`); };
filter();
let timer;
$('#pg-start').onclick = () => {
  const pg = $('#pg'); clearInterval(timer); pg.value = 0;
  timer = setInterval(() => { pg.value = Math.min(100, pg.value + 5); say('pg-txt', pg.value + '%' + (pg.value === 100 ? ' · Done' : '')); if (pg.value >= 100) clearInterval(timer); }, 120);
};

/* ---------- Menus ---------- */
document.addEventListener('cua:action', (e) => { const m = `${e.detail.menu} → ${e.detail.act}`; say('menu-out', m); status(m); });
/* Pop-up menus on the demo area, the files list and the folder tree */
const ctxMenu = $('#m-ctx'), ctx = $('#ctx-area');
CUA.contextMenu(ctx, { menu: ctxMenu, target: () => ({ name: 'Area', back: ctx }) });
const files = $('#lb-multi');
const fileOf = (o) => o && { name: o.textContent.trim(), back: files, at: o };
CUA.contextMenu(files, { menu: ctxMenu, target: (e) => fileOf(e.target.closest('[role="option"]')),
  keyTarget: () => fileOf($('#' + files.getAttribute('aria-activedescendant')) || $('[role="option"]', files)) });
const folders = $('#tree');
const folderOf = (it) => it && { name: $(':scope > .ti', it).textContent.trim(), back: it, at: $(':scope > .ti', it) };
CUA.contextMenu(folders, { menu: ctxMenu, target: (e) => e.target.closest('.ti') && folderOf(e.target.closest('[role="treeitem"]')),
  keyTarget: (e) => folderOf(e.target.closest('[role="treeitem"]')) });
/* Toolbar: one Tab stop; the style buttons change the sample text */
CUA.toolbar($('#toolbar'));
$$('#toolbar [data-fmt]').forEach((b) => b.addEventListener('click', () => {
  const doc = $('#doc').style, on = b.getAttribute('aria-pressed') === 'true';
  ({ bold: () => (doc.fontWeight = on ? '600' : ''), italic: () => (doc.fontStyle = on ? 'italic' : ''), underline: () => (doc.textDecoration = on ? 'underline' : '') })[b.dataset.fmt]();
}));
/* Popup with controls: every change applies at once */
$('#pp-ctrl').addEventListener('input', (e) => {
  const t = e.target; let m;
  if (t.id === 'pp-zoom') { $('#pp-zoom-out').textContent = t.value + ' px'; m = 'Icon size ' + t.value + ' px'; }
  else if (t.id === 'pp-name') m = t.value ? `Filter: "${t.value}"` : 'Filter cleared';
  else if (t.type === 'radio') m = 'Sort by ' + t.value.toLowerCase();
  else m = `${t.closest('label').textContent.trim()}: ${t.checked ? 'on' : 'off'}`;
  say('pp-out', m); status(m);
});

/* ---------- Feedback ---------- */
const toastDemo = {
  info: () => CUA.toast('info', 'A new version of the price list is available.'),
  ok: () => CUA.toast('ok', 'contract.pdf moved to the bin.', { action: { label: 'Undo', icon: 'undo', run: () => status('Restored contract.pdf') } }),
  warn: () => CUA.toast('warn', 'Storage is 90% full. Delete old files to free space.'),
  err: () => CUA.toast('err', 'Could not save notes.txt. Check your connection and try again.', { action: { label: 'Retry', icon: 'refresh', run: () => CUA.toast('ok', 'notes.txt saved.') } }),
};
$$('[data-toast]').forEach((b) => b.addEventListener('click', () => { toastDemo[b.dataset.toast](); status(b.getAttribute('aria-label')); }));
$('#sb-busy').onclick = () => { status('Saving ana-morales.json…'); setTimeout(() => status('Saved ana-morales.json'), 1500); };

/* ---------- Layout ---------- */
document.addEventListener('cua:split', (e) => status(e.detail.message));

/* ---------- Icons ---------- */
$('#icon-grid').innerHTML = $$('symbol').map((s) => `<div class="icon-cell"><svg class="icon" aria-hidden="true"><use href="#${s.id}"/></svg>${s.id.slice(2)}</div>`).join('');
$$('[name="isize"]').forEach((r) => r.addEventListener('change', () => $('#icon-grid').style.setProperty('--size', r.value)));

/* ---------- Pickers ---------- */
const vol = $('#sl-vol'); vol.addEventListener('input', () => { $('#sl-vol-out').textContent = vol.value + '%'; });
const q = $('#sl-q'), qNames = ['Draft', 'Low', 'Medium', 'High', 'Best'];
q.addEventListener('input', () => q.setAttribute('aria-valuetext', qNames[q.value - 1]));
const { iso, formatLong, formatDateTime } = CUA.dates;
/* The inline calendar only allows the next 60 days */
{ const t = new Date(), c = $('#cal-inline'); c.dataset.min = iso(t); c.dataset.max = iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 60)); }
CUA.calendar($('#cal-inline'), (d) => { say('cal-out', 'Picked ' + formatLong(d)); status('Date: ' + iso(d)); });
$('#date-f').value = iso(new Date());
CUA.dateField($('#date-f'), { popup: $('#cal-pop'), onChange: (d) => status('Delivery date: ' + iso(d)) });
/* The appointment starts at the next full hour */
{ const n = new Date();
  CUA.dateTimeField($('#dt-f'), { popup: $('#dt-pop'), value: new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours() + 1, 0),
    onChange: (d) => status('Appointment: ' + formatDateTime(d)) }); }

/* ---------- Help on touch: the Window controls, then each specimen of the current tab ---------- */
$('#help-btn').addEventListener('click', () => {
  const page = $('.gallery > [role="tabpanel"]:not([hidden])'), tabName = $('#tabs [aria-selected="true"]').textContent.trim();
  $('#dh-t').textContent = 'Help: ' + tabName;
  CUA.fillHelp($('#dh-body'), [
    ...$$('.gallery > header [data-tip], #tabs [data-tip]').map((el) => ['Window', el]),
    ...$$('[data-tip]', page).map((el) => [$('h3', el.closest('.spec') || page)?.textContent || tabName, el]),
  ]);
}, true);

/* ---------- Touch preview: lets a mouse try the touch layout; on a real touch device it shows on and locked ---------- */
const coarse = matchMedia('(pointer: coarse)'), sim = $('#sim-touch');
const syncSim = () => { if (coarse.matches) sim.checked = true; sim.disabled = coarse.matches; CUA.setTouchPreview(sim.checked); };
coarse.addEventListener('change', syncSim); sim.addEventListener('change', () => CUA.setTouchPreview(sim.checked)); syncSim();
