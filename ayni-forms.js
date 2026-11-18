/* Ayni library 0.4.0, forms family, optional: the pieces a form designer and a long form need beyond the fields. The
   editable list (the options of a question), the repeated block (one card per attendee) and the signature. Plain
   JavaScript, no build step, evergreen browsers 2024+. Load it after ayni-fields.js (the error "!"), ayni-toasts.js
   (Undo), ayni-menus.js (the ⋮ menu) and ayni-dialogs.js (the phone's signing dialog); the signature's buttons use
   eraser, keyboard and pen-line from ayni-icons-more.js:
     <script src="ayni-icons-more.js" defer></script>
     <script src="ayni-fields.js" defer></script>
     <script src="ayni-forms.js" defer></script>
   The look is in ayni-forms.css, which needs ayni-lists.css for the drop marks; the rules are chapter 20 of the
   guidelines. */
(() => {
'use strict';
const { $, $$, icon } = Ayni;
const { fire, once, tx, txf, isRO, isTouch, fold } = Ayni.core;
const ask = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, cancelable: true }));
const PHONE = matchMedia('(max-width: 640px)');
/* The field error "!", wired once per element: Ayni.init() on a card or the page wires every [aria-describedby] it
   finds under the same key, and a second wiring would add a second "!" */
const markErrors = (...els) => els.forEach((x) => { if (once('error', x)) Ayni.core.errors?.init(x); });

let seq = 0;
const off = (el) => el.getAttribute('aria-disabled') === 'true' || isRO(el);
const btn = (cls, ic, tip) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn sm ' + cls; b.tabIndex = -1; b.dataset.tip = tip; b.setAttribute('aria-label', tip);
  b.innerHTML = icon(ic); return b;
};

/* ---------- Editable list: Ayni.editList(element, options) ----------
   RULE (Frasquito, 2026-11-17, guidelines 20.1): a list of short texts the user writes, such as the options of a question.
   - Each row is a text edited in place (4.8): a click, F2 or Enter turns it into a field in the same box.
   - Enter keeps the text and opens the next row, a new one after the last: ten options without touching the mouse.
     Backspace in an empty row removes it and goes back to the one above. Esc puts the old text back (a new row goes).
   - Pasting several lines (from Word or Excel) makes one row each, without their bullets or numbers: into an empty row
     the first line goes in it, a row with text keeps it and the lines come after it.
   - Under the rows, the dashed text button "Add option" (3.9).
   - Remove: a small × at the end of the row, with no question and an Undo notification.
   - Order: with a mouse, by dragging the row, with the lists' line between rows (8.8); from the keyboard, Ctrl+Shift+Up
     and Down, as in the tree (16.5); on touch nothing is dragged (8.8): each row has a small ⋮ with Move up, Move down
     and Remove.
   - A row left empty goes by itself. A row that repeats another (case and accents aside) shows the error "!".
   - Each row has an id that never changes, moved or renamed: the page keeps its data by it.
   - The rows are one Tab stop: Up and Down, Home and End move between them. aria-readonly on the list: no change;
     aria-disabled: faded.
     Ayni.editList(el, { items: [{ id, text }], newId: () => id, addLabel, label, placeholder, onChange(items, change) })
   returns { items, set(items), add(text, at), edit(id), focus(id) }. Each change the user makes calls onChange and fires
   ayni:change on el with { items, action, id }: action is add, edit, remove, move, paste or restore (an Undo). */
const editList = (el, o = {}) => {
  el.classList.add('elist');
  if (!el.getAttribute('role')) el.setAttribute('role', 'group');
  if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) el.setAttribute('aria-label', o.label || tx('elist.name'));
  const newId = o.newId || (() => `el${++seq}-${Date.now().toString(36)}`);
  const rows = document.createElement('ul'); rows.className = 'elist-rows'; rows.setAttribute('role', 'list');
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'btn text dashed sm elist-add';
  add.innerHTML = icon('plus') + `<span>${Ayni.esc(o.addLabel || tx('elist.add'))}</span>`;
  el.replaceChildren(rows, add);
  let items = [], current = null, editing = null, dragged = null;

  const rowOf = (id) => $$(':scope > li', rows).find((r) => r.dataset.id === id) || null;
  const textEl = (r) => $('.elist-text', r);
  /* The text or field with its "!": the .err-wrap the fields family puts round it */
  const withMark = (x) => (x.parentElement?.matches('.err-wrap') ? x.parentElement : x);
  const tell = (action, id) => { const copy = items.map((x) => ({ ...x })); o.onChange?.(copy, { action, id }); fire(el, 'ayni:change', { items: copy, action, id }); };

  /* A repeated text gets the "!" on every row after the first that has it */
  const checkRepeats = () => {
    const seen = new Set();
    items.forEach((it) => {
      const r = rowOf(it.id), key = fold(it.text.trim()), err = $('.error', r), dup = key !== '' && seen.has(key);
      seen.add(key);
      err.textContent = dup ? txf('elist.repeated', { text: it.text.trim() }) : '';
      err.hidden = !dup;
      const t = editing?.id === it.id ? editing.input : textEl(r);
      t.setAttribute('aria-invalid', dup);
    });
  };
  const rowHtml = (it) => {
    const r = document.createElement('li'); r.className = 'elist-row'; r.dataset.id = it.id;
    const t = document.createElement('span');
    t.className = 'inline-text elist-text'; t.tabIndex = -1; t.textContent = it.text;
    const err = document.createElement('span'); err.className = 'error'; err.id = `ayni-el${++seq}-err`; err.hidden = true;
    t.setAttribute('aria-describedby', err.id);
    r.append(t, btn('elist-del', 'close', tx('elist.remove')), btn('elist-more', 'more', tx('elist.more')), err);
    return r;
  };
  /* The rows follow `items`. A row whose id is still there stays the same element, so ending an edit between the press
     and the release of a click on another row (its text, its ×) never loses that click */
  const sync = () => {
    const ro = off(el), had = new Map($$(':scope > li', rows).map((r) => [r.dataset.id, r])), fresh = new Set();
    const want = items.map((it) => {
      let r = had.get(it.id);
      if (r) { had.delete(it.id); const t = textEl(r); if (t && t.textContent !== it.text) t.textContent = it.text; }
      else fresh.add(r = rowHtml(it));
      return r;
    });
    had.forEach((r) => { const t = textEl(r); if (t) Ayni.core.errors?.forget(t); r.remove(); });
    want.forEach((r, i) => { if (rows.children[i] !== r) rows.insertBefore(r, rows.children[i] || null); });
    want.forEach((r) => { const t = textEl(r); if (!t) return; t.classList.toggle('is-editable', !ro); if (fresh.has(r)) markErrors(t); });
    if (!items.some((x) => x.id === current)) current = items[0]?.id ?? null;
    stops(); checkRepeats();
  };
  /* One Tab stop: the current row (a row being edited has its field instead); none while disabled (2.4) */
  const stops = () => {
    const dis = el.getAttribute('aria-disabled') === 'true';
    $$(':scope > li', rows).forEach((r) => { const t = textEl(r); if (t) t.tabIndex = !dis && r.dataset.id === current ? 0 : -1; });
  };
  const focusRow = (id) => { const r = rowOf(id); if (!r) return; current = id; stops(); (editing?.id === id ? editing.input : textEl(r)).focus(); };
  const at = (id) => items.findIndex((x) => x.id === id);

  /* ---- Editing in place ---- */
  const edit = (id, caret = 'end') => {
    if (off(el)) return;
    if (editing) finish(true, false);
    const r = rowOf(id); if (!r) return;
    const t = textEl(r), inp = document.createElement('input');
    inp.className = 'input inline elist-input'; inp.value = items[at(id)].text; inp.autocomplete = 'off';
    if (o.placeholder) inp.placeholder = o.placeholder;
    inp.setAttribute('aria-label', items[at(id)].text || txf('elist.item', { n: at(id) + 1 }));
    inp.setAttribute('aria-describedby', t.getAttribute('aria-describedby'));
    /* The text leaves with its "!", which would stay on show beside the field's own one; it comes back on unedit() */
    const rest = withMark(t);
    rest.replaceWith(inp);
    markErrors(inp);
    editing = { id, input: inp, rest, old: items[at(id)].text, isNew: false };
    current = id;
    inp.focus();
    if (caret === 'all') inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('input', () => { items[at(id)].text = inp.value; checkRepeats(); });
    inp.addEventListener('keydown', keys);
    inp.addEventListener('paste', paste);
    inp.addEventListener('blur', () => setTimeout(() => { if (editing?.input === inp && document.activeElement !== inp) finish(true, false); }));
    checkRepeats();
    return inp;
  };
  /* The field goes and the row's text, with its "!", comes back */
  const unedit = (e) => { Ayni.core.errors?.forget(e.input); withMark(e.input).replaceWith(e.rest); };
  /* Keeps (or puts back) the text; a row left empty goes. refocus: the focus goes back to the row */
  const finish = (keep, refocus = true) => {
    const e = editing; if (!e) return null;
    editing = null;
    const i = at(e.id);
    if (!keep) items[i].text = e.old;
    const text = items[i].text.trim();
    unedit(e);
    const gone = text === '';
    if (gone) items.splice(i, 1); else items[i].text = text;
    const next = gone ? items[Math.max(0, i - 1)]?.id ?? null : e.id;
    current = next;
    sync();
    if (refocus && next) focusRow(next); else if (refocus) add.focus();
    if (gone) { if (!e.isNew) tell('remove', e.id); }
    else if (e.isNew) tell('add', e.id);
    else if (text !== e.old) tell('edit', e.id);
    return gone ? null : e.id;
  };
  const insertAt = (i, text = '') => { const it = { id: String(newId()), text }; items.splice(i, 0, it); return it; };   // ids are strings, as set() makes them
  /* A new row after `i` (-1: first), opened for typing */
  const openNew = (i) => {
    const it = insertAt(i + 1); sync();
    const inp = edit(it.id); if (inp) editing.isNew = true;
  };
  const keys = (e) => {
    e.stopPropagation();   // never the Panel's default button, never a dialog's Esc (4.8)
    const inp = e.target, id = editing?.id;
    if (e.key === 'Enter') {
      e.preventDefault();
      /* Enter on an empty row ends the typing: the row goes and the focus waits on "Add" */
      if (inp.value.trim() === '') { finish(true, false); add.focus(); return; }
      const kept = finish(true, false), j = at(kept);
      if (items[j + 1]) edit(items[j + 1].id); else openNew(j);
    } else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Backspace' && inp.value === '' && !e.repeat) {
      e.preventDefault();
      const i = at(id), prev = items[i - 1];
      finish(true, false);
      if (prev) edit(prev.id); else if (items.length) focusRow(items[0].id); else add.focus();
    }
  };
  /* Lines from Word or Excel: one row each, without their bullets or numbers */
  const paste = (e) => {
    const text = e.clipboardData?.getData('text/plain') || '';
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[•·▪◦\-–—*]|\d+[.)])\s+/, '').trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    /* Into an empty row the first line goes in it; a row with text keeps it, and every line is a new row after it */
    const inp = e.target, id = editing.id, rest = inp.value.slice(0, inp.selectionStart) + inp.value.slice(inp.selectionEnd);
    const own = rest.trim() === '';
    items[at(id)].text = own ? lines[0] : inp.value;
    const e2 = editing, wasNew = e2.isNew;
    editing = null; unedit(e2);
    let i = at(id);
    lines.slice(own ? 1 : 0).forEach((l) => { insertAt(++i, l); });
    items = items.filter((x) => x.text.trim() !== '');
    current = items[Math.min(i, items.length - 1)]?.id ?? null;
    sync();
    tell(wasNew ? 'add' : 'paste', id);
    if (current) focusRow(current);
  };

  /* ---- Remove, with Undo; move ---- */
  const remove = (id) => {
    if (off(el)) return;
    if (editing) finish(true, false);
    const i = at(id); if (i < 0) return;
    const [it] = items.splice(i, 1);
    current = items[Math.min(i, items.length - 1)]?.id ?? null;
    sync();
    if (current) focusRow(current); else add.focus();
    tell('remove', id);
    if (it.text.trim()) Ayni.toast('ok', txf('elist.removed', { text: it.text }), { undo: () => {
      items.splice(Math.min(i, items.length), 0, it); current = it.id; sync(); focusRow(it.id); tell('restore', it.id);
    } });
  };
  const move = (id, to) => {
    if (off(el)) return false;
    const i = at(id); to = Math.max(0, Math.min(items.length - 1, to));
    if (i < 0 || i === to) return false;
    const [it] = items.splice(i, 1); items.splice(to, 0, it);
    current = id; sync(); focusRow(id);
    tell('move', id);
    return true;
  };

  /* ---- Pointer ---- */
  rows.addEventListener('click', (e) => {
    const r = e.target.closest('li'); if (!r || off(el)) return;
    const id = r.dataset.id;
    if (e.target.closest('.elist-del')) remove(id);
    else if (e.target.closest('.elist-more')) {
      if (editing) finish(true, false);   // first: a row left empty goes, and the places below count without it
      const i = at(id), b = e.target.closest('.elist-more');
      if (i < 0) return;
      Ayni.menuAt([
        { label: tx('elist.moveUp'), icon: 'arrow-up', disabled: i === 0, run: () => move(id, i - 1) },
        { label: tx('elist.moveDown'), icon: 'arrow-down', disabled: i === items.length - 1, run: () => move(id, i + 1) },
        { label: tx('elist.remove'), icon: 'close', run: () => remove(id) },
      ], { anchor: b });
    } else if (e.target.closest('.elist-text')) edit(id, 'end');
  });
  add.addEventListener('click', () => { if (!off(el)) openNew(items.length - 1); });

  /* ---- Keys on a row at rest ---- */
  rows.addEventListener('keydown', (e) => {
    const t = e.target.closest('.elist-text'); if (!t) return;
    const id = t.closest('li').dataset.id, i = at(id);
    const ctrl = Ayni.isMac ? e.metaKey : e.ctrlKey;
    if (ctrl && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(id, i + (e.key === 'ArrowUp' ? -1 : 1)); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const go = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: items.length - 1 }[e.key];
    if (go !== undefined) { e.preventDefault(); if (items[go]) focusRow(items[go].id); }
    else if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); edit(id, 'all'); }
    else if (e.key === 'Delete') { e.preventDefault(); remove(id); }
  });
  rows.addEventListener('focusin', (e) => { const r = e.target.closest('li'); if (r && e.target.matches('.elist-text')) { current = r.dataset.id; stops(); } });

  /* ---- Drag: mouse and pen only (8.8); the line between rows marks where it goes ---- */
  rows.addEventListener('pointerdown', (e) => {
    const r = e.target.closest('li'); if (!r) return;
    r.draggable = !off(el) && !editing && e.pointerType !== 'touch' && !isTouch() && !e.target.closest('button');
  });
  const clearMarks = () => $$('.drop-before, .drop-after', rows).forEach((r) => r.classList.remove('drop-before', 'drop-after'));
  rows.addEventListener('dragstart', (e) => {
    const r = e.target.closest?.('li'); if (!r?.draggable) return;
    dragged = r.dataset.id; r.classList.add('dragged');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', items[at(dragged)].text); } catch {}
  });
  const spot = (e) => {
    const r = e.target.closest?.('li'); if (!r || !dragged) return null;
    const box = r.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2;
    return { r, after };
  };
  rows.addEventListener('dragover', (e) => {
    const s = spot(e); if (!s) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    clearMarks(); s.r.classList.add(s.after ? 'drop-after' : 'drop-before');
  });
  rows.addEventListener('dragleave', (e) => { if (!rows.contains(e.relatedTarget)) clearMarks(); });
  rows.addEventListener('drop', (e) => {
    const s = spot(e); if (!s) return;
    e.preventDefault(); clearMarks();
    const from = at(dragged), target = at(s.r.dataset.id);
    let to = target + (s.after ? 1 : 0); if (from < to) to--;
    const id = dragged; dragged = null; move(id, to);
  });
  rows.addEventListener('dragend', () => { clearMarks(); $$('.dragged', rows).forEach((r) => r.classList.remove('dragged')); dragged = null; });

  const set = (list) => { if (editing) { unedit(editing); editing = null; } items = (list || []).map((x) => ({ id: String(x.id), text: String(x.text ?? '') })); sync(); };
  set(o.items);
  return {
    get items() { return items.map((x) => ({ ...x })); },
    set,
    add(text = '', i = items.length) { const it = insertAt(i, text); sync(); return it.id; },
    edit: (id) => edit(id ?? items[0]?.id, 'all'),
    focus: (id) => focusRow(id ?? current ?? items[0]?.id),
  };
};


/* ---------- Repeated block: Ayni.repeat(element, options) ----------
   RULE (Frasquito, 2026-11-17, guidelines 20.2): a group of fields that repeats, "Attendee 1", "Attendee 2".
   - Each repetition is a card with its title and a small round button that removes it (the bin), with no question and
     an Undo notification that puts the card back, with what it held.
   - Under the last card, the dashed text button "Add attendee" (3.9); a new card takes the focus on its first field.
   - At the most, Add is disabled and its tooltip says why; at the least, so is each remove button (3.6).
   - The page may refuse an add or a remove, as in the tree (16.12): ayni:add and ayni:remove are cancelable.
   - The block sits in a group box (fieldset.group with its legend): an error about the number of cards shows on it,
     with the "!" next to the legend (4.7). aria-readonly: no add or remove; aria-disabled: faded.
     Ayni.repeat(el, { min, max, addLabel, itemLabel, title(i, card), build(body, card, data), label })
   returns { cards(), add(data), remove(card), retitle(), focus(card) }. build() fills a new card's body; each card has
   a data-key that is never used again (for ids that must not move when a card before it goes). Events on el, each
   before it happens, cancelable: ayni:add { index, data } (Add) or { index, card, undo: true } (the Undo of a remove,
   the same card comes back as it was) and ayni:remove { card, index }; then ayni:change { count }. */
const repeat = (el, o = {}) => {
  el.classList.add('repeat');
  const min = o.min ?? 0, max = o.max ?? Infinity, itemLabel = o.itemLabel || tx('repeat.item');
  const box = document.createElement('div'); box.className = 'repeat-cards';
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'btn text dashed repeat-add';
  add.innerHTML = icon('plus') + `<span>${Ayni.esc(o.addLabel || tx('repeat.add'))}</span>`;
  el.append(box, add);
  const cards = () => $$(':scope > .repeat-card', box);
  const titleOf = (card, i) => (o.title?.(i, card) || `${itemLabel} ${i + 1}`);
  const state = () => {
    /* Read-only: no Add, no bins. Disabled: they stay, faded and refused (2.4) */
    const n = cards().length, ro = isRO(el), dis = el.getAttribute('aria-disabled') === 'true';
    const fullWhy = n >= max ? txf('repeat.whyMax', { n: max }) : '', lowWhy = n <= min ? txf('repeat.whyMin', { n: min }) : '';
    const addName = o.addLabel || tx('repeat.add');
    add.hidden = ro;
    if (fullWhy) { add.setAttribute('aria-disabled', 'true'); add.dataset.tip = `${addName}: ${fullWhy}`; } else { add.removeAttribute('aria-disabled'); delete add.dataset.tip; }
    if (dis) add.setAttribute('aria-disabled', 'true');
    cards().forEach((c, i) => {
      const t = titleOf(c, i), h = $('.repeat-title', c), del = $('.repeat-del', c), name = txf('repeat.remove', { name: t });
      h.textContent = t; c.setAttribute('aria-label', t); del.hidden = ro;
      del.setAttribute('aria-label', name); del.dataset.tip = lowWhy ? `${name}: ${lowWhy}` : name;
      if (lowWhy || dis) del.setAttribute('aria-disabled', 'true'); else del.removeAttribute('aria-disabled');
    });
  };
  const make = (data) => {
    const card = document.createElement('section'), key = String(++seq);
    card.className = 'repeat-card'; card.dataset.key = key; card.setAttribute('role', 'group');
    const head = document.createElement('div'); head.className = 'repeat-head';
    const h = document.createElement('h3'); h.className = 'repeat-title';
    const del = btn('danger repeat-del', 'trash', tx('repeat.remove')); del.tabIndex = 0;
    head.append(h, del);
    const body = document.createElement('div'); body.className = 'repeat-body fields';
    card.append(head, body);
    o.build?.(body, card, data);
    return card;
  };
  const firstField = (card) => $('.repeat-body input:not([type="hidden"]):not([disabled]), .repeat-body textarea, .repeat-body select, .repeat-body [tabindex="0"], .repeat-body button', card);
  const focus = (card) => (firstField(card) || $('.repeat-del', card))?.focus();
  const addCard = (data, user = true) => {
    if (user && (off(el) || cards().length >= max)) return null;
    const index = cards().length;
    if (user && !ask(el, 'ayni:add', { index, data })) return null;
    const card = make(data); box.append(card);
    Ayni.init(card); state();
    if (user) { fire(el, 'ayni:change', { count: cards().length }); focus(card); }
    return card;
  };
  const removeCard = (card) => {
    const list = cards(), index = list.indexOf(card);
    if (index < 0 || off(el) || list.length <= min) return false;
    if (!ask(el, 'ayni:remove', { card, index })) return false;
    const name = titleOf(card, index), next = list[index + 1] || list[index - 1];
    card.remove(); state();
    if (next) $('.repeat-del', next).focus(); else add.focus();
    fire(el, 'ayni:change', { count: cards().length });
    Ayni.toast('ok', txf('repeat.removed', { name }), { undo: () => {
      const now = cards();
      if (now.length >= max || !ask(el, 'ayni:add', { index: Math.min(index, now.length), card, undo: true })) return;
      box.insertBefore(card, now[index] || null); state(); focus(card);
      fire(el, 'ayni:change', { count: cards().length });
    } });
    return true;
  };
  add.addEventListener('click', () => { if (add.getAttribute('aria-disabled') !== 'true') addCard(); });
  box.addEventListener('click', (e) => {
    const del = e.target.closest('.repeat-del');
    if (del && del.getAttribute('aria-disabled') !== 'true') removeCard(del.closest('.repeat-card'));
  });
  (o.items || []).forEach((d) => addCard(d, false));
  while (cards().length < min) addCard(undefined, false);
  state();
  return {
    cards, retitle: state, focus,
    add: (data) => addCard(data, false),
    remove: (card) => { if (!card) return; card.remove(); state(); },
  };
};

/* ---------- Signature: Ayni.signature(element, options) ----------
   RULE (Frasquito, 2026-11-17, guidelines 20.3): a box with the look of a field, taller, with a base line and "Sign
   here".
   - It is drawn with a finger, a pen or the mouse; while drawing the page does not scroll.
   - On a phone, a tap on the box opens a big dialog to sign with room.
   - Inside the box two round buttons (4.1): Clear (only when there is a signature) and Type my name, which swaps the
     box for a text field (with Draw, to come back). So a signature can be given with the keyboard too.
   - Only the strokes are kept: the points of each line, in a w × h box, with a top number of strokes and points; past
     it the drawing stops, and set() holds a value to the same box and limits. Light, fits in the JSON, prints sharp. It
     is shown by drawing those points, never pasted into the page as markup.
   - The paper is always light and the ink always dark, in the dark scheme too (Frasquito, 2026-11-17): a signature
     looks like a signature on paper.
   - Required and empty: the field error (4.7), the "!" at the box's top right. Read-only: the signature, no buttons.
     Ayni.signature(el, { value, name, label, w, h, maxStrokes, maxPoints, onChange })
   returns { value, set(value), clear(), error(message), focus() }. value is null (nothing), { kind: 'drawn', w, h,
   strokes: [[x, y, x, y…]…] } or { kind: 'typed', name }; `name` fills the typed field. onChange(value) and
   ayni:change { value } on el after each change the user makes. */
const SVGNS = 'http://www.w3.org/2000/svg';
const signature = (el, o = {}) => {
  const W = Math.round(o.w ?? 600), H = Math.round(o.h ?? 200), maxStrokes = o.maxStrokes ?? 200, maxPoints = o.maxPoints ?? 3000;
  const label = o.label || tx('sign.name');
  el.classList.add('sign');
  if (!el.getAttribute('role')) el.setAttribute('role', 'group');
  if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) el.setAttribute('aria-label', label);
  const errId = `ayni-sign${++seq}-err`;
  const pad = document.createElement('div');
  pad.className = 'sign-pad'; pad.tabIndex = 0; pad.setAttribute('role', 'img'); pad.setAttribute('aria-describedby', errId);
  pad.innerHTML = `<svg class="sign-ink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"></svg>`
    + `<span class="sign-line" aria-hidden="true"></span><span class="sign-hint" aria-hidden="true"></span><span class="sign-tools"></span>`;
  $('.sign-hint', pad).textContent = tx('sign.here');
  const clearB = btn('sign-clear', 'eraser', tx('sign.clear')), typeB = btn('sign-type', 'keyboard', tx('sign.type'));
  clearB.tabIndex = 0; typeB.tabIndex = 0;
  $('.sign-tools', pad).append(clearB, typeB);
  const typed = document.createElement('div'); typed.className = 'input-group sign-typed'; typed.hidden = true;
  const inp = document.createElement('input');
  inp.className = 'input'; inp.autocomplete = 'name'; inp.placeholder = tx('sign.typePlaceholder');
  inp.setAttribute('aria-label', tx('sign.typeLabel')); inp.setAttribute('aria-describedby', errId);
  const drawB = btn('sign-draw', 'pen-line', tx('sign.draw')); drawB.tabIndex = 0;
  typed.append(inp, drawB);
  const err = document.createElement('span'); err.className = 'error'; err.id = errId; err.hidden = true;
  el.replaceChildren(pad, typed, err);
  markErrors(pad, inp);
  pad.closest('.err-wrap')?.classList.add('err-corner');

  let strokes = [], mode = 'draw', drawing = null;
  const points = () => strokes.reduce((n, s) => n + s.length / 2, 0);
  const value = () => (mode === 'typed' ? (inp.value.trim() ? { kind: 'typed', name: inp.value.trim() } : null)
    : strokes.length ? { kind: 'drawn', w: W, h: H, strokes: strokes.map((s) => s.slice()) } : null);
  const tell = () => { const v = value(); paint(); o.onChange?.(v); fire(el, 'ayni:change', { value: v }); };
  /* The ink, drawn from numbers only: each stroke a path of M and L, a single point a dot */
  const inkOf = (svg) => {
    svg.replaceChildren(...strokes.map((s) => {
      const p = document.createElementNS(SVGNS, 'path');
      let d = `M${s[0]} ${s[1]}`;
      for (let i = 2; i < s.length; i += 2) d += `L${s[i]} ${s[i + 1]}`;
      if (s.length === 2) d += 'l0.1 0';
      p.setAttribute('d', d); return p;
    }));
  };
  const paint = () => {
    /* Read-only: the signature, no buttons. Disabled: the buttons stay, faded and refused; the box and the typed field
       take no focus (2.4) */
    const ro = isRO(el), dis = el.getAttribute('aria-disabled') === 'true', has = strokes.length > 0;
    inkOf($('.sign-ink', pad));
    pad.classList.toggle('has-ink', has);
    clearB.hidden = !has || ro; typeB.hidden = ro; drawB.hidden = ro;
    [clearB, typeB, drawB].forEach((b) => { if (dis) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
    pad.tabIndex = dis ? -1 : 0;
    pad.hidden = mode === 'typed'; typed.hidden = mode !== 'typed';
    inp.readOnly = ro; inp.disabled = dis;
    pad.setAttribute('aria-label', `${label}: ${tx(has ? 'sign.signed' : 'sign.empty')}`);
    if (!has && !ro && !dis) pad.dataset.tip = tx(PHONE.matches && isTouch() ? 'sign.tapTip' : 'sign.drawTip'); else delete pad.dataset.tip;
  };

  /* ---- Drawing, on any pad: the box, or the phone's dialog ---- */
  const drawOn = (area, done) => {
    const at = (e) => {
      const r = area.getBoundingClientRect();
      return [Math.round(Math.min(W, Math.max(0, ((e.clientX - r.left) / r.width) * W))), Math.round(Math.min(H, Math.max(0, ((e.clientY - r.top) / r.height) * H)))];
    };
    area.addEventListener('pointerdown', (e) => {
      if (off(el) || e.button !== 0 || e.target.closest('button') || (area === pad && PHONE.matches && isTouch())) return;
      if (strokes.length >= maxStrokes || points() >= maxPoints) return;
      e.preventDefault();
      area.setPointerCapture?.(e.pointerId);
      drawing = { area, s: at(e) }; strokes.push(drawing.s); inkOf($('.sign-ink', area)); area.classList.add('has-ink');
    });
    area.addEventListener('pointermove', (e) => {
      if (drawing?.area !== area) return;
      e.preventDefault();
      const [x, y] = at(e), s = drawing.s, lx = s[s.length - 2], ly = s[s.length - 1];
      if (Math.hypot(x - lx, y - ly) < 2 || points() >= maxPoints) return;
      s.push(x, y); inkOf($('.sign-ink', area));
    });
    const end = () => { if (drawing?.area !== area) return; drawing = null; done(); };
    area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
    area.addEventListener('touchmove', (e) => { if (drawing && e.cancelable) e.preventDefault(); }, { passive: false });   // an uncancelable one only warns
  };
  drawOn(pad, tell);

  /* ---- On a phone a tap opens a big dialog to sign with room ---- */
  const bigPad = () => {
    const dl = Ayni.dialog({ title: label, big: true, cls: 'sign-dialog' });
    const area = document.createElement('div'); area.className = 'sign-pad sign-big';
    area.innerHTML = pad.innerHTML;
    $('.sign-tools', area).replaceChildren();
    const clear2 = btn('sign-clear', 'eraser', tx('sign.clear')); clear2.tabIndex = 0;
    $('.sign-tools', area).append(clear2);
    const turn = document.createElement('p'); turn.className = 'hint sign-turn'; turn.textContent = tx('sign.turn');
    dl.body.append(area, turn);
    const sync = () => { inkOf($('.sign-ink', area)); area.classList.toggle('has-ink', strokes.length > 0); clear2.hidden = !strokes.length; };
    clear2.addEventListener('click', () => { strokes = []; sync(); tell(); });
    drawOn(area, () => { sync(); tell(); });
    dl.place([Ayni.dialogButton('close', tx('sign.done'), 'check')]);
    dl.dialog.addEventListener('close', () => pad.focus());
    sync(); dl.show();
  };
  pad.addEventListener('click', (e) => { if (!e.target.closest('button') && PHONE.matches && isTouch() && !off(el)) bigPad(); });
  pad.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === pad && PHONE.matches && isTouch() && !off(el)) { e.preventDefault(); bigPad(); }
  });

  /* ---- The buttons ---- */
  clearB.addEventListener('click', () => { if (off(el)) return; strokes = []; tell(); pad.focus(); });
  typeB.addEventListener('click', () => { if (off(el)) return; mode = 'typed'; if (!inp.value) inp.value = o.name || ''; tell(); inp.focus(); inp.select(); });
  drawB.addEventListener('click', () => { if (off(el)) return; mode = 'draw'; tell(); pad.focus(); });
  inp.addEventListener('input', tell);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

  const set = (v) => {
    if (v?.kind === 'typed') { mode = 'typed'; inp.value = String(v.name ?? ''); strokes = []; }
    else if (v?.kind === 'drawn' && Array.isArray(v.strokes)) {
      /* Numbers only, inside the value's box: anything else is left out, a whole point at a time (a bad x or y must not
         shift the pairs after it). Then the same limits as drawing: maxStrokes strokes and maxPoints points, the rest
         cut off where the drawing would have stopped, so a value the limits refuse never shows as a good signature */
      const vw = v.w > 0 ? v.w : W, vh = v.h > 0 ? v.h : H, fx = W / vw, fy = H / vh;
      const inBox = (x, y) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= vw && y >= 0 && y <= vh;
      let left = maxPoints;
      strokes = [];
      for (const s of v.strokes) {
        if (!Array.isArray(s)) continue;
        if (strokes.length >= maxStrokes || left <= 0) break;
        const out = [];
        for (let i = 0; i + 1 < s.length && out.length / 2 < left; i += 2) {
          if (inBox(s[i], s[i + 1])) out.push(Math.round(s[i] * fx), Math.round(s[i + 1] * fy));
        }
        if (out.length >= 2) { strokes.push(out); left -= out.length / 2; }
      }
      mode = 'draw';
    } else { strokes = []; mode = 'draw'; inp.value = ''; }
    paint();
  };
  set(o.value);
  new MutationObserver(paint).observe(el, { attributes: true, attributeFilter: ['aria-readonly', 'aria-disabled'] });
  return {
    get value() { return value(); }, set,
    clear: () => { strokes = []; inp.value = ''; mode = 'draw'; paint(); },
    error: (msg) => { err.textContent = msg || ''; err.hidden = !msg; [pad, inp].forEach((x) => x.setAttribute('aria-invalid', String(!!msg))); },
    focus: () => (mode === 'typed' ? inp : pad).focus(),
  };
};

Object.assign(Ayni, { editList, repeat, signature });
Ayni.core.family({});
})();
