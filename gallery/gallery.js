/* Ayni Components gallery: the demo wiring of this page only (outputs, status messages, sample data).
   Every control's behaviour comes from the library (../ayni.js); nothing here is needed by a real app.
   A module, so it can wait for Ayni to start (its texts must be in first). */
await Ayni.ready;
const { $, $$, status } = Ayni;
const say = (id, msg) => { $('#' + id).textContent = msg; };

/* Mode label (desktop mode is >= 1024px) */
const mq = matchMedia('(min-width: 1024px)');
const mode = () => { $('#mode').textContent = mq.matches ? 'desktop mode · ≥1024px' : 'compact mode · <1024px'; };
mq.addEventListener('change', mode); mode();

/* ---------- Tabs ---------- */
const showTab = (t) => { $('#sb-tab').textContent = t.textContent.trim(); };
$('#tabs').addEventListener('ayni:tabselect', (e) => showTab(e.detail));
showTab($('#tabs > [aria-selected="true"]'));
$$('.tabs-local').forEach((l) => {
  const reopen = l.closest('.spec')?.querySelector('#tabs-reopen');
  l.addEventListener('ayni:tabclose', (e) => { status('Closed tab ' + e.detail.textContent.trim()); if (reopen) { reopen.removeAttribute('aria-disabled'); reopen.dataset.tip = 'Reopen closed tabs'; } });
  reopen?.addEventListener('click', () => { $$('[role="tab"][hidden]', l).forEach((t) => { t.hidden = false; }); reopen.setAttribute('aria-disabled', 'true'); reopen.dataset.tip = 'Reopen closed tabs: no tab is closed'; status('Tabs reopened'); });
});

/* Demo: Save is busy for 1.5 s; every third save fails and shows the usual error notification */
let saves = 0;
$('#save-demo').addEventListener('click', (e) => {
  const b = e.currentTarget; Ayni.setBusy(b, 'Saving…'); status('Saving notes.txt…');
  setTimeout(() => {
    Ayni.setBusy(b, false);
    if (++saves % 3 === 0) { status('Could not save notes.txt'); Ayni.toast('err', 'Could not save notes.txt. Check your connection and try again.'); }
    else status('Saved notes.txt');
  }, 1500);
});

/* Switches next to their radio / check box equivalents: both always hold the same value */
const mirror = (a, b) => [[a, b], [b, a]].forEach(([from, to]) => from.addEventListener('change', () => {
  if (from.type === 'checkbox') to.checked = from.checked;
  else $(`input[value="${$('input:checked', from).value}"]`, to).checked = true;
  status(from.type === 'checkbox' ? 'Visible ' + (from.checked ? 'on' : 'off') : 'Theme: ' + $('input:checked', from).parentElement.textContent.trim());
}));
mirror($('#sw-theme'), $('#rb-theme'));
mirror($('#sw-visible'), $('#cb-visible'));

/* Light / dark mode */
document.addEventListener('ayni:theme', (e) => status(e.detail.theme === 'dark' ? 'Dark mode on' : 'Dark mode off'));

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
$('#find-all').onclick = () => status('Cleared the list of files found');
/* Built in code */
$('#code-confirm').onclick = async () => {
  const yes = await Ayni.confirm({ title: 'Delete report.pdf?', body: 'The file goes to the bin.\nYou can restore it for 30 days.', confirm: 'Delete', danger: true });
  const m = yes ? 'Deleted report.pdf' : 'Kept report.pdf'; say('dlg-out', m); status(m);
};
$('#code-ask').onclick = async () => {
  const name = await Ayni.ask({ title: 'New folder', label: 'Name', value: 'New folder', okTip: 'Create',
    check: (v) => (/[\\/]/.test(v) ? (status('A name cannot contain / or \\'), false) : v) });
  const m = name ? `Created folder ${name}` : 'No folder created'; say('dlg-out', m); status(m);
};
$('#code-alert').onclick = () => Ayni.alert({ title: 'Upload complete', body: '3 files were uploaded to Invoices.' });
$('#find-next').onclick = () => { const m = `Searched for "${$('#dfi-q').value}" in ${$('#dfi-in').value}`; say('dlg-out', m); status(m); };

/* ---------- Buttons ---------- */
const all = $('#chk-all'), subs = $$('.chk-sub');
const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
all.onchange = () => { subs.forEach((s) => (s.checked = all.checked)); syncAll(); };
subs.forEach((s) => (s.onchange = syncAll)); syncAll();
/* Second action: show which action ran */
document.addEventListener('ayni:press', (e) => { say('alt-out', e.detail.label); status(e.detail.label); });

/* ---------- Lists ---------- */
const reportList = (lb) => {
  const sel = $$('[role="option"][aria-selected="true"]', lb).map((o) => o.textContent.trim());
  say(lb.id + '-out', 'Selected: ' + (sel.join(', ') || 'none'));
  if (lb.id === 'lb-multi') $('#sb-sel').textContent = sel.length ? `${sel.length} file${sel.length > 1 ? 's' : ''} selected` : 'No selection';
};
$$('.lb').forEach((lb) => { lb.addEventListener('ayni:change', () => reportList(lb)); reportList(lb); });
/* List picker: what the form would send */
document.addEventListener('ayni:change', (e) => {
  if (!e.target.matches('.picker')) return;
  const { value: v, name, field, input } = e.detail;
  status(`${name}: ${v || '(empty)'}`); $('#' + field.id + '-out') && say(field.id + '-out', `Submits ${input.name}=${v}`);
});
/* Trees: every change is reported; the editable ones ask before each change, and the page could refuse it */
const nm = (it) => it.querySelector(':scope > .ti > .tn').textContent;
const names = (its) => (its.length === 1 ? nm(its[0]) : `${its.length} items`);
const watchTree = (el) => {
  const tell = (m) => { say(el.id + '-out', m); status(m); };
  el.addEventListener('ayni:select', (e) => tell(e.detail.items.length > 1 ? `Selected ${e.detail.items.length} items` : 'Selected ' + e.detail.path.join(' / ')));
  el.addEventListener('ayni:open', (e) => tell('Opened ' + e.detail.path.join(' / ')));
  el.addEventListener('ayni:move', (e) => tell(`Moved ${names(e.detail.items)} into ${e.detail.parent ? nm(e.detail.parent) : 'the top level'}`));
  el.addEventListener('ayni:insert', (e) => tell(e.detail.undo ? `Restored ${names(e.detail.items)}` : e.detail.copy ? `Pasted a copy of ${names(e.detail.from)}` : `Created ${e.detail.name}`));
  el.addEventListener('ayni:delete', (e) => tell(`Deleted ${names(e.detail.items)}`));
  el.addEventListener('ayni:rename', (e) => tell(`Renamed ${e.detail.from} to ${e.detail.to}`));
  el.addEventListener('ayni:hide', (e) => tell(`${e.detail.hidden ? 'Hid' : 'Showed'} ${names(e.detail.items)}`));
};
['#tree', '#tree-ed', '#tree-ol'].forEach((id) => watchTree($(id)));
/* The editable tree is built from data; Archive loads its children the first time it opens */
const projectTree = Ayni.tree($('#tree-ed'), { root: { name: 'My files', icon: 'home' }, items: [
  { name: 'Documents', open: true, children: [
    { name: 'Invoices', children: [{ name: '2026-09.pdf', leaf: true }, { name: '2026-10.pdf', leaf: true }] },
    { name: 'Contracts', lock: true, children: [{ name: 'rental.pdf', leaf: true }] },
    { name: 'notes.txt', leaf: true },
    { name: 'old-notes.txt', leaf: true, hidden: true },
  ] },
  { name: 'Pictures', children: [{ name: 'beach.jpg', leaf: true }, { name: 'giralda.jpg', leaf: true }] },
  { name: 'Archive', id: 'archive', lazy: true },
  { name: '.settings', hidden: true, children: [{ name: 'theme.json', leaf: true }] },
  { name: 'todo.txt', leaf: true },
] });
$('#tree-ed').addEventListener('ayni:load', (e) => setTimeout(() => e.detail.done([
  { name: '2024', children: [{ name: 'taxes-2024.pdf', leaf: true }] },
  { name: '2025', children: [{ name: 'taxes-2025.pdf', leaf: true }] },
]), 900));
/* ---------- Item list beside a folder tree: Ayni.list, a navigation tree, drag and drop, Move to… ---------- */
const ilFolders = { id: 'home', name: 'My files', icon: 'home', children: [
  { id: 'docs', name: 'Documents', children: [{ id: 'inv', name: 'Invoices' }, { id: 'con', name: 'Contracts' }] },
  { id: 'pics', name: 'Pictures' }, { id: 'music', name: 'Music' }] };
let ilFiles = [['notes.txt', '2 KB', 'home'], ['todo.txt', '1 KB', 'home'], ['budget-2026.xlsx', '48 KB', 'home'], ['plan-2027.pdf', '310 KB', 'home'],
  ['receipt-0912.pdf', '96 KB', 'home'], ['summary.txt', '3 KB', 'home'], ['report-q3.docx', '120 KB', 'docs'], ['letter.docx', '22 KB', 'docs'],
  ['2026-09.pdf', '80 KB', 'inv'], ['2026-10.pdf', '82 KB', 'inv'], ['rental.pdf', '400 KB', 'con'], ['beach.jpg', '2.1 MB', 'pics'],
  ['giralda.jpg', '1.8 MB', 'pics'], ['song.mp3', '4.4 MB', 'music']].map(([name, size, at], i) => ({ id: 'f' + i, name, size, at }));
let ilHere = 'home', ilN = ilFiles.length;
const ilOpen = { home: true }, ilFlat = {};
(function walk(n) { ilFlat[n.id] = n; n.children?.forEach(walk); })(ilFolders);
const ilFile = (id) => ilFiles.find((f) => f.id === id);
const ilWhat = (ids) => (ids.length === 1 ? ilFile(ids[0]).name : ids.length + ' files');
const ilSay = (m) => { say('il-out', m); status(m); };
const ilCounted = (n) => ({ ...n, count: ilFiles.filter((f) => f.at === n.id).length || null, children: n.children?.map(ilCounted) });
const ilRowsEl = $('#il-rows');
const ilDraw = () => {
  $('#il-title').textContent = ilFlat[ilHere].name;
  const mine = ilFiles.filter((f) => f.at === ilHere);
  ilRowsEl.innerHTML = mine.map((f) => `<div class="il-row" data-id="${f.id}" data-name="${f.name}">${Ayni.icon('file')}<span>${f.name}</span><span class="sz">${f.size}</span></div>`).join('')
    || '<p class="state-msg">No files</p>';
  ilTree.build();
};
const ilMove = (ids, to) => {
  const from = ids.map((id) => [ilFile(id), ilFile(id).at]);
  from.forEach(([f]) => (f.at = to)); ilDraw();
  Ayni.toast('ok', `Moved ${ilWhat(ids)} to ${ilFlat[to].name}`, { undo: () => { from.forEach(([f, at]) => (f.at = at)); ilDraw(); } });
  ilSay(`Moved ${ilWhat(ids)} to ${ilFlat[to].name}`);
};
const ilNewFile = () => {
  const f = { id: 'f' + ilN, name: `new-${++ilN}.txt`, size: '0 KB', at: ilHere }; ilFiles.push(f); ilDraw();
  ilList.set([f.id]); ilList.focus(f.id); ilSay('Created ' + f.name);
};
const ilTree = Ayni.tree($('#il-tree'), { nav: true, items: () => [ilCounted(ilFolders)], sheet: $('#il-pane'),
  isOpen: (id) => !!ilOpen[id], setOpen: (id, v) => { ilOpen[id] = v; },
  current: () => ilHere, go: (id) => { ilHere = id; ilDraw(); ilSay('Opened the folder ' + ilFlat[id].name); },
  menu: (id, x, y) => Ayni.menuAt([{ id: 'open', label: 'Open', icon: 'folder', run: () => { ilHere = id; ilDraw(); } }], { x, y }),
  drop: { can: (ids, id) => (ids.every((x) => ilFile(x)?.at === id) ? { zone: 'inside', ok: false } : 'inside'),
    drop: (ids, id, zone, e, ok) => (ok ? ilMove(ids, id) : Ayni.toast('info', `${ilWhat(ids)}: already in ${ilFlat[id].name}`)) } });
const ilOne = (ids) => ids.length === 1;
const ilList = Ayni.list(ilRowsEl, { bar: '#il-bar', row: '.il-row', tree: ilTree,
  actions: [
    { id: 'open', label: 'Open', icon: 'eye', key: 'Enter', when: ilOne, run: (ids) => ilSay('Opened ' + ilFile(ids[0]).name) },
    { id: 'rename', label: 'Rename', icon: 'edit', key: 'F2', rank: 5, group: 1, when: ilOne, why: () => 'Pick only one file to rename',
      run: async (ids) => { const f = ilFile(ids[0]), v = await Ayni.ask({ title: 'Rename ' + f.name, value: f.name }); if (v) { f.name = v.trim(); ilDraw(); ilSay('Renamed to ' + f.name); } } },
    { id: 'move', label: 'Move to…', icon: 'folder', rank: 3, group: 1,
      run: async (ids) => { const to = await Ayni.pickNode({ title: `Move ${ilWhat(ids)} to`, items: () => [ilFolders], current: ilHere, disabled: (id) => id === ilHere,
        note: (lit) => (lit ? 'Into ' + ilFlat[lit].name : 'Pick a folder') }); if (to) ilMove(ids, to); } },
    { id: 'delete', label: 'Delete', icon: 'trash', key: 'Del', rank: 2, group: 2, danger: true,
      run: (ids) => { const gone = ilFiles.filter((f) => ids.includes(f.id)); ilFiles = ilFiles.filter((f) => !ids.includes(f.id)); ilDraw();
        Ayni.toast('ok', 'Deleted ' + (gone.length === 1 ? gone[0].name : gone.length + ' files'), { undo: () => { ilFiles = ilFiles.concat(gone); ilDraw(); } }); } },
  ],
  area: [{ id: 'new', label: 'New file', icon: 'plus', key: 'Alt+N', run: ilNewFile }],
  open: (id) => ilSay('Opened ' + ilFile(id).name),
  drag: { text: (ids) => ids.map((id) => ilFile(id).name).join('\n') },
  onSelect: (ids) => status(ids.length ? `Picked ${ilWhat(ids)}` : 'Nothing picked') });
$('#il-new').addEventListener('click', ilNewFile);
$('#il-treebtn').addEventListener('click', () => ilTree.openSheet());
$('#il-help').addEventListener('click', () => ilSay('Help: see the text above the demo'));
ilDraw();
Ayni.fitBar('#il-head');

/* Pick list with an Everybody switch above it */
const people = $('#pl-people'), plAll = $('#pl-all');
plAll.addEventListener('change', () => {
  people.setAttribute('aria-disabled', plAll.checked); people.tabIndex = plAll.checked ? -1 : 0;
  say('pl-people-out', plAll.checked ? 'Shared with everybody, also people who join later' : 'Shared with the people picked');
});

const showHidden = $('#tree-ed-hidden');
showHidden.addEventListener('change', () => projectTree.showHidden(showHidden.checked));
$('#tree-ed').addEventListener('ayni:showhidden', (e) => { showHidden.checked = e.detail.on; status('Hidden items ' + (e.detail.on ? 'shown' : 'hidden')); });

/* ---------- Texts ---------- */
const email = $('#tf-email'), emailErr = $('#tf-email-err');
const checkEmail = () => { const bad = !email.checkValidity() || !/@.+\./.test(email.value); email.setAttribute('aria-invalid', bad); emailErr.hidden = !bad; };
email.addEventListener('blur', checkEmail); email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true') checkEmail(); }); checkEmail();
const fruits = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Fig', 'Grape', 'Lemon', 'Mango', 'Orange', 'Pear', 'Plum'];
const groups = { citrus: ['Lemon', 'Orange'], orchard: ['Apple', 'Apricot', 'Fig', 'Pear', 'Plum'], tropical: ['Banana', 'Mango'], berries: ['Cherry', 'Grape'] };
let fruitGroup = 'all';
const sf = $('#sf'), sfApi = Ayni.searchField(sf.parentElement);
const filter = () => {
  const m = Ayni.matcher(sf.value), all = fruits.filter((f) => fruitGroup === 'all' || groups[fruitGroup].includes(f));
  const r = all.filter((f) => !m || m(f));
  sfApi.count(m ? `${r.length} / ${all.length}` : '');
  say('sf-out', r.length ? r.join(' · ') : 'No matches. Try another word or filter.');
};
$('#m-filter').addEventListener('ayni:choose', (e) => {
  fruitGroup = e.detail.dataset.f;
  sfApi.filtered(fruitGroup !== 'all' && e.detail.dataset.act.toLowerCase()); filter();
});
sf.parentElement.addEventListener('ayni:search', filter);
filter();

/* Folded search in a title row: the count is shown / all */
const mails = ['Invoice March – Telefónica', 'Train tickets to Málaga', 'Re: dinner on Friday', 'Your parcel is on its way',
  'Photos from the trip', 'Invoice April – Iberdrola', 'Meeting moved to Monday', 'Newsletter: autumn recipes'];
const foldApi = Ayni.searchField($('#fold-q').parentElement);
const showMails = (m) => {
  const r = mails.filter((t) => !m || m(t));
  $('#fold-list').replaceChildren(...r.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  foldApi.count(m ? `${r.length} / ${mails.length}` : '');
};
$('#fold-q').parentElement.addEventListener('ayni:search', (e) => showMails(e.detail.test));
Ayni.fitBar('#fold-head');
showMails(null);

/* Hits in place: nothing hides, the hits are marked and the current one ringed */
const lines = ['Shall we take the train on Friday?', 'Yes! The 9:15 train is cheapest.', 'I booked two seats.',
  'Great. Bring the tickets, please.', 'The train was late, sorry!', 'No problem, see you at the station.'];
$('#step-list').replaceChildren(...lines.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
let hits = [], at = -1;
const markHits = () => {
  const lis = $$('#step-list li');
  lis.forEach((li, i) => { li.classList.toggle('hit', hits.includes(i)); li.classList.toggle('current', hits[at] === i); });
  if (at >= 0) lis[hits[at]].scrollIntoView({ block: 'nearest' });
  stepApi.count($('#step-q').value ? (hits.length ? `${at + 1} / ${hits.length}` : '0') : '');
  stepApi.canStep(hits.length > 0);
};
const stepApi = Ayni.searchField($('#step-f'), {
  step: (d) => { if (hits.length) { at = (at + d + hits.length) % hits.length; markHits(); } },
});
$('#step-f').addEventListener('ayni:search', (e) => {
  const m = e.detail.test;
  hits = m ? lines.map((t, i) => (m(t) ? i : -1)).filter((i) => i >= 0) : [];
  at = hits.length ? 0 : -1; markHits();
});

/* Search on Enter: the words go to the "server" only on Enter or Go */
const words = { casa: 'house, home', gato: 'cat', perro: 'dog', libro: 'book', mesa: 'table' };
$('#dict-q').parentElement.addEventListener('ayni:search', (e) => {
  const t = e.detail.text.trim(), w = Ayni.fold(t);
  say('dict-out', !w ? '' : words[w] ? `${t}: ${words[w]}` : `"${t}" is not in this little dictionary`);
  if (w) status(`Looked up "${t}"`);
});

/* Find bar: the page finds, marks and replaces; Ayni draws the bar and keeps its keys */
let letter = 'Dear Ana, thank you for the photos of the trip. The photos from the beach are lovely, and the one of the old harbour is my favourite. Could you send me the Photos folder link again? The last link no longer works. Love, Marta';
const doc = $('#fb-doc');
let found = [], cur = -1, fq = '', mc = false;
const look = () => {
  found = [];
  if (!fq) return;
  const hay = mc ? letter : letter.toLowerCase(), n = mc ? fq : fq.toLowerCase();
  for (let i = hay.indexOf(n); i >= 0; i = hay.indexOf(n, i + n.length)) found.push(i);
};
const paintDoc = () => {
  doc.replaceChildren();
  let from = 0;
  found.forEach((i, n) => {
    const mk = document.createElement('mark');
    mk.textContent = letter.slice(i, i + fq.length); if (n === cur) mk.className = 'current';
    doc.append(letter.slice(from, i), mk); from = i + fq.length;
  });
  doc.append(letter.slice(from));
  $('mark.current', doc)?.scrollIntoView({ block: 'nearest' });
  fb.count(cur + 1, found.length);
};
const fb = Ayni.findBar($('#fb-bar'), {
  find: (text, { matchCase }) => { fq = text; mc = matchCase; look(); cur = found.length ? 0 : -1; paintDoc(); },
  step: (d) => { if (found.length) { cur = (cur + d + found.length) % found.length; paintDoc(); } },
  replace: (text, all) => {
    if (!found.length) return;
    const keep = Math.max(cur, 0), n = all ? found.length : 1;
    (all ? [...found].reverse() : [found[keep]]).forEach((i) => { letter = letter.slice(0, i) + text + letter.slice(i + fq.length); });
    look(); cur = found.length ? Math.min(keep, found.length - 1) : -1; paintDoc();
    status(`Replaced ${n} ${n === 1 ? 'match' : 'matches'}`);
  },
  selected: () => (doc.contains(getSelection().anchorNode) ? getSelection().toString() : ''),
  onClose: () => { fq = ''; found = []; cur = -1; paintDoc(); doc.focus(); },
});
$('#fb-open').onclick = () => fb.open(false);
paintDoc();
let timer;
$('#pg-start').onclick = () => {
  const pg = $('#pg'); clearInterval(timer); pg.value = 0;
  timer = setInterval(() => { pg.value = Math.min(100, pg.value + 5); say('pg-txt', pg.value + '%' + (pg.value === 100 ? ' · Done' : '')); if (pg.value >= 100) clearInterval(timer); }, 120);
};

/* ---------- Menus ---------- */
document.addEventListener('ayni:action', (e) => { const m = `${e.detail.menu} → ${e.detail.act}`; say('menu-out', m); status(m); });
/* Pop-up menus on the demo area, the files list and the folder tree */
const ctxMenu = $('#m-ctx'), ctx = $('#ctx-area');
Ayni.contextMenu(ctx, { menu: ctxMenu, target: () => ({ name: 'Area', back: ctx }) });
const files = $('#lb-multi');
const fileOf = (o) => o && { name: o.textContent.trim(), back: files, at: o };
Ayni.contextMenu(files, { menu: ctxMenu, target: (e) => fileOf(e.target.closest('[role="option"]')),
  keyTarget: () => fileOf($('#' + files.getAttribute('aria-activedescendant')) || $('[role="option"]', files)) });
const folders = $('#tree');
const folderOf = (it) => it && { name: $(':scope > .ti', it).textContent.trim(), back: it, at: $(':scope > .ti', it) };
Ayni.contextMenu(folders, { menu: ctxMenu, target: (e) => e.target.closest('.ti') && folderOf(e.target.closest('[role="treeitem"]')),
  keyTarget: (e) => folderOf(e.target.closest('[role="treeitem"]')) });
/* Toolbar: one Tab stop (every [role="toolbar"] is wired by Ayni); the style buttons change the sample text */
$$('#toolbar [data-fmt]').forEach((b) => b.addEventListener('click', () => {
  const doc = $('#doc').style, on = b.getAttribute('aria-pressed') === 'true';
  ({ bold: () => (doc.fontWeight = on ? '600' : ''), italic: () => (doc.fontStyle = on ? 'italic' : ''), underline: () => (doc.textDecoration = on ? 'underline' : '') })[b.dataset.fmt]();
}));
/* A menu built in code; its items run after it has closed */
$('#menu-code').addEventListener('click', (e) => Ayni.menuAt([
  { caption: 'Message' },
  { id: 'reply', label: 'Reply', icon: 'undo', key: 'R', run: () => say('menu-out', 'Code menu → Reply') },
  { id: 'copy', label: 'Copy link', icon: 'copy', key: 'Ctrl+C', run: () => say('menu-out', 'Code menu → Copy link') },
  { id: 'star', label: 'Starred', checked: codeStar, run: () => { codeStar = !codeStar; say('menu-out', 'Code menu → Starred ' + (codeStar ? 'on' : 'off')); } },
  { id: 'move', label: 'Move to', icon: 'folder', sub: () => ['Work', 'Family', 'Trips'].map((f) => ({ id: f, label: f, run: () => say('menu-out', 'Code menu → Move to ' + f) })) },
  { id: 'paste', label: 'Paste', icon: 'paste', disabled: true, why: 'Paste: nothing copied yet' },
  { sep: true },
  { id: 'delete', label: 'Delete', icon: 'trash', key: 'Del', danger: true, run: () => say('menu-out', 'Code menu → Delete') },
], { anchor: e.currentTarget, keyboard: e.detail === 0 }));
let codeStar = false;
/* A title row that fits: the app's own item comes after the tools that left */
Ayni.fitBar('#fit-head', { more: () => [{ id: 'about', label: 'About the inbox', icon: 'info', run: () => say('menu-out', 'Title row → About') }] });
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
  info: () => Ayni.toast('info', 'A new version of the price list is available.'),
  ok: () => Ayni.toast('ok', 'contract.pdf moved to the bin.', { undo: () => status('Restored contract.pdf') }),
  warn: () => Ayni.toast('warn', 'Storage is 90% full. Delete old files to free space.'),
  err: () => Ayni.toast('err', 'Could not save notes.txt. Check your connection and try again.', { action: { label: 'Retry', icon: 'refresh', run: () => Ayni.toast('ok', 'notes.txt saved.') } }),
};
/* Progress: an upload that counts up, with Stop */
toastDemo.progress = () => {
  let pct = 0, timer;
  const job = Ayni.progress('Uploading photo.jpg 0%', { pct: 0, onStop: () => { clearInterval(timer); job.end(); Ayni.toast('info', 'Upload stopped.'); } });
  timer = setInterval(() => {
    pct += 10; job.set(`Uploading photo.jpg ${pct}%`, pct);
    if (pct >= 100) { clearInterval(timer); job.end(); Ayni.toast('ok', 'photo.jpg uploaded.'); }
  }, 400);
};
$$('[data-toast]').forEach((b) => b.addEventListener('click', () => { toastDemo[b.dataset.toast](); status(b.getAttribute('aria-label')); }));
$('#sb-busy').onclick = () => { status('Saving ana-morales.json…'); setTimeout(() => status('Saved ana-morales.json'), 1500); };

/* ---------- Layout ---------- */
document.addEventListener('ayni:split', (e) => status(e.detail.message));

/* ---------- Icons ---------- */
/* The icons the controls use, with where each one appears */
const iconUse = {
  'arrow-down': 'Tree menu', 'arrow-up': 'Tree menu', calendar: 'Date field', check: 'Menus', 'chev-down': 'Calendar',
  'chev-right': 'Tree, calendar', close: 'Notifications, search, tabs', copy: 'Tree menu', cut: 'Tree menu', edit: 'Tree menu',
  error: 'Notifications', eye: 'Password, tree', 'eye-off': 'Password, tree', file: 'Tree', filter: 'Search field', folder: 'Tree',
  help: 'Help button, Help menu', info: 'Notifications', minus: 'Number field', ok: 'Notifications', paste: 'Tree menu', play: 'Help card, tour',
  plus: 'Number field, tree', search: 'Search field', today: 'Calendar', trash: 'Tree menu', undo: 'Undo notification', warn: 'Notifications',
};
$('#icon-grid').innerHTML = Ayni.icons.names.map((n) => `<div class="icon-cell">${Ayni.icon(n)}<b>${n}</b><small>${iconUse[n]}</small></div>`).join('');
$$('[name="isize"]').forEach((r) => r.addEventListener('change', () => $('#icon-grid').style.setProperty('--size', r.value)));
/* Lucide for the whole gallery: the controls' icons from Ayni's map, plus the gallery's own icons mapped here */
const demoLucide = {
  'align-c': 'text-align-center', 'align-l': 'text-align-start', bell: 'bell', bold: 'bold', button: 'rectangle-horizontal',
  italic: 'italic', home: 'house', layout: 'layout-panel-left', list: 'list', menu: 'menu', moon: 'moon', more: 'ellipsis',
  new: 'file-plus', open: 'folder-open', print: 'printer', redo: 'redo-2', refresh: 'refresh-cw', save: 'save',
  settings: 'settings', share: 'share-2', sliders: 'sliders-horizontal', star: 'star', table: 'table', text: 'type',
  tree: 'list-tree', underline: 'underline', upload: 'upload', user: 'user', window: 'app-window',
};
$$('[name="iset"]').forEach((r) => r.addEventListener('change', () => {
  const lucide = r.value === 'lucide';
  Ayni.icons.use(lucide ? { ...Ayni.icons.lucide, map: { ...Ayni.icons.lucide.map, ...demoLucide } } : null)
    .then(() => status('Icon set: ' + (lucide ? 'Lucide' : 'Ayni')))
    .catch(() => { Ayni.toast('err', 'Could not load the Lucide icons. Check your connection and try again.'); $('[name="iset"][value="ayni"]').checked = true; Ayni.icons.use(null); });
}));

/* ---------- Pickers ---------- */
const vol = $('#sl-vol'); vol.addEventListener('input', () => { $('#sl-vol-out').textContent = vol.value + '%'; });
const q = $('#sl-q'), qNames = ['Draft', 'Low', 'Medium', 'High', 'Best'];
q.addEventListener('input', () => q.setAttribute('aria-valuetext', qNames[q.value - 1]));
const { iso, formatLong, formatDateTime } = Ayni.dates;
/* The inline calendar only allows the next 60 days */
{ const t = new Date(), c = $('#cal-inline'); c.dataset.min = iso(t); c.dataset.max = iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 60)); }
Ayni.calendar($('#cal-inline'), (d) => { say('cal-out', 'Picked ' + formatLong(d)); status('Date: ' + iso(d)); });
$('#date-f').value = iso(new Date());
Ayni.dateField($('#date-f'), { popup: $('#cal-pop'), onChange: (d) => status('Delivery date: ' + iso(d)) });
/* The appointment starts at the next full hour */
{ const n = new Date();
  Ayni.dateTimeField($('#dt-f'), { popup: $('#dt-pop'), value: new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours() + 1, 0),
    onChange: (d) => status('Appointment: ' + formatDateTime(d)) }); }

/* ---------- Help: the page's card (the ? at the top), and the Help tab's demos ---------- */
Ayni.help({
  title: 'Ayni Components',
  lead: 'Every control of the Ayni library, family by family. Each tab is one family; each box shows one control with its rules.',
  rows: [
    { sel: '#tabs', icon: 'layout', name: 'Families', text: 'One tab per family of controls. Left and Right switch tabs.' },
    { sel: '#theme-btn', text: 'Switches between light and dark colours.' },
    { sel: '#sim-touch', icon: 'sliders', name: 'Touch preview', text: 'Shows the touch layout with a mouse: bigger targets, no tooltips.' },
    { sel: '#help-btn', text: 'Opens this card.' },
  ],
  tip: 'The Help tab shows the card, the tour and the first-visit marks of a small view.',
  tour: ['rows'],
});

/* The Photos view's own card: rows from its buttons, a group, a gesture with no button, a row inside its menu */
const hdSay = (m) => { say('hd-out', m); status(m); };
const photosCard = {
  title: 'Photos',
  lead: ['Your photos, newest first.', 'A small view to show the Help card and the tour.'],
  rows: [
    { sel: '#hd-add', text: 'Adds photos from this device.' },
    { sel: '#hd-show', text: 'Plays the photos one after another. Press it again to stop.', tour: { tap: true } },
    { sel: '#hd-more', text: 'Export and Empty the album.' },
    { sel: '#hd-export', name: 'More → Export all', text: 'Saves every photo in one file.', tour: { open: '#hd-more' } },
    { section: 'In the list' },
    { icon: 'check', name: 'Pick photos', text: 'Click a photo to pick it; Ctrl+click picks more. On touch, hold a photo.', tour: { sel: '#hd-list li:not(.state-msg)', ghost: '#hd-list' } },
  ],
  tip: 'Tip: drag photos from your computer onto the list.',
  tour: ['rows'],
};
$('#hd-help').addEventListener('click', () => Ayni.help.show(photosCard));
$('#hd-tour').addEventListener('click', () => Ayni.tour(photosCard.tour, photosCard));
$('#hd-add').addEventListener('click', () => hdSay('Add photos'));
$('#hd-show').addEventListener('click', () => hdSay('Slide show ' + ($('#hd-show').getAttribute('aria-pressed') === 'true' ? 'on' : 'off')));
$('#hd-menu').addEventListener('ayni:action', (e) => hdSay('More → ' + e.detail.item.textContent.trim()));
$('#hd-coach').addEventListener('click', () => Ayni.coach([
  { sel: '#hd-add', text: 'Add your first photos here.' },
  { sel: '#hd-help', text: 'The question mark opens the help; from there a guided tour shows each button.' },
], { key: 'ayni-gallery-coach', force: true }));
/* A Help menu: the page's own entries, then the card and the tour as Ayni gives them */
$('#hm-menu').addEventListener('beforetoggle', (e) => {
  if (e.newState !== 'open') return;
  const said = (m) => () => { say('hm-out', m); status(m); };
  Ayni.fillMenu($('#hm-menu'), [
    { id: 'stats', label: 'Statistics', icon: 'list', run: said('Help → Statistics') },
    { id: 'keys', label: 'Keyboard shortcuts', icon: 'text', run: said('Help → Keyboard shortcuts') },
    { sep: true },
    ...Ayni.help.items(),
  ]);
});

/* ---------- Touch preview: lets a mouse try the touch layout; on a real touch device it shows on and locked ---------- */
const coarse = matchMedia('(pointer: coarse)'), sim = $('#sim-touch');
const syncSim = () => { if (coarse.matches) sim.checked = true; sim.disabled = coarse.matches; Ayni.setTouchPreview(sim.checked); };
coarse.addEventListener('change', syncSim); sim.addEventListener('change', () => Ayni.setTouchPreview(sim.checked)); syncSim();
