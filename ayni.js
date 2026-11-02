/* Ayni library 0.1.0: the behaviour of the Ayni controls not yet split into their own family file. Plain JavaScript,
   no build step, evergreen browsers 2024+. Load it after ayni-base.js, ayni-menus.js (its menus, toolbars and
   popup placing) and ayni-lists.js (type-ahead for the list picker):
     <script src="ayni-base.js" defer></script>
     <script src="ayni-menus.js" defer></script>
     <script src="ayni-lists.js" defer></script>
     <script src="ayni.js" defer></script>
   When the page has loaded it wires up every control it finds. Ayni.init(root) wires up controls added later
   (each control is wired once). Controls tell the app what happened with DOM events that bubble (ayni:change,
   ayni:action, ayni:press, ...), listed in README.md. Everything else the app uses lives on window.Ayni. */
(() => {
'use strict';
const { $, $$, isMac, icon, setIcon } = Ayni;
const { fire, wired, once, each, tx, iconName, drawIcons, isRO, layer, isTouch, HOLD_MS, DBL_MS, retip, fold } = Ayni.core;
/* Menus, pop-up menus, toolbars and placing popups come from ayni-menus.js, which loads before this file */
const { initMenu, initToolbar, contextMenu, place } = Ayni.core.menus;
const invoker = () => Ayni.core.menus.invoker();
/* Type-ahead comes from ayni-lists.js, which also loads before this file */
const { makeTypeAhead } = Ayni.core.lists;

/* A cancelable event: false when the page called preventDefault() */
const ask = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, cancelable: true }));

/* Status bar: Ayni.status(text) writes the last action into the element marked data-ayni-status */
const status = (msg) => { const el = $('[data-ayni-status]'); if (el) el.textContent = msg; };

/* Shared layers, created when the page does not have them yet */

/* ---------- Tabs: roving focus, arrows, Home/End, #hash (data-hash on the tablist) ---------- */
const initTabs = (list) => {
  const hash = list.hasAttribute('data-hash');
  let tabs = $$(':scope > [role="tab"]', list);
  const select = (tab, focus = true) => {
    tabs = $$(':scope > [role="tab"]:not([hidden])', list);
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focus) tab.focus();
    if (hash) try { history.replaceState(null, '', '#' + tab.getAttribute('aria-controls')); } catch {}
    fire(list, 'ayni:tabselect', tab);
  };
  /* Closable tabs: the round (x), Delete, or a middle click. The neighbour takes over. */
  const close = (tab) => {
    tabs = $$(':scope > [role="tab"]:not([hidden])', list);
    const i = tabs.indexOf(tab), next = tabs[i + 1] || tabs[i - 1];
    const was = tab.getAttribute('aria-selected') === 'true';
    tab.hidden = true; tab.setAttribute('aria-selected', false); $('#' + tab.getAttribute('aria-controls')).hidden = true;
    /* Focus always goes to the selected tab after a close (item 65) */
    if (was && next) select(next); else { tabs = tabs.filter((t) => t !== tab); $(':scope > [role="tab"][aria-selected="true"]', list)?.focus(); }
    fire(list, 'ayni:tabclose', tab);
  };
  tabs.forEach((t) => {
    t.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { e.stopPropagation(); close(t); } else select(t); });
    t.addEventListener('auxclick', (e) => { if (e.button === 1 && t.hasAttribute('data-closable')) { e.preventDefault(); close(t); } });
  });
  list.addEventListener('keydown', (e) => {
    tabs = $$(':scope > [role="tab"]:not([hidden]):not([aria-disabled="true"])', list);
    const i = tabs.indexOf(document.activeElement);
    if (e.key === 'Delete' && tabs[i]?.hasAttribute('data-closable')) { e.preventDefault(); close(tabs[i]); return; }
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (n !== undefined) { e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length]); }
  });
  /* Many tabs (item 64): the mouse wheel over the tab row scrolls it sideways */
  list.addEventListener('wheel', (e) => {
    if (list.scrollWidth <= list.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    e.preventDefault(); list.scrollLeft += e.deltaY;
  }, { passive: false });
  /* Ctrl+Page Down / Ctrl+Page Up switch to the next / previous tab from anywhere inside this Panel (item 66).
     The innermost tab set around the focus wins; Ctrl+Tab stays with the browser. */
  const scope = list.parentElement; scope.classList.add('tabscope');
  scope.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || (e.key !== 'PageDown' && e.key !== 'PageUp')) return;
    if (e.target.closest('.tabscope') !== scope || e.target.closest('[popover]')) return;
    const live = $$(':scope > [role="tab"]:not([hidden]):not([aria-disabled="true"])', list);
    const i = live.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    e.preventDefault(); e.stopPropagation();
    select(live[(i + (e.key === 'PageDown' ? 1 : -1) + live.length) % live.length]);
  }, true);
  const start = hash && tabs.find((t) => '#' + t.getAttribute('aria-controls') === location.hash);
  select(start || tabs[0], false);
};


/* ---------- List picker: drop-down list (typing off) and combo box (typing on), one component ---------- */
/* RULE: one list picker serves every drop-down list and combo box, on every device. Fires ayni:change on the .picker
   with { value, name, field, input } when the user picks or types a value. */
const initPicker = (root) => {
  const field = $(':scope > .input', root), hidden = $(':scope > input[type="hidden"]', root), pop = $('.picker-pop', root);
  const list = $('[role="listbox"]', pop), empty = $('.picker-empty', pop), all = $$('[role="option"]', list);
  const typing = root.dataset.picker === 'combo', label = $(`label[for="${field.id}"]`), name = label.textContent.trim();
  all.forEach((o, i) => { o.id ||= `${field.id}-o${i}`; o.dataset.value ??= o.textContent.trim(); });
  const shown = () => all.filter((o) => !o.hidden);
  const isOpen = () => pop.matches(':popover-open');
  const activeOpt = () => all.find((o) => o.classList.contains('active'));
  const setActive = (o) => {
    all.forEach((x) => x.classList.toggle('active', x === o));
    if (o) { field.setAttribute('aria-activedescendant', o.id); o.scrollIntoView({ block: 'nearest' }); } else field.removeAttribute('aria-activedescendant');
  };
  const set = (v, announce = true) => {
    hidden.value = v; all.forEach((o) => o.setAttribute('aria-selected', o.dataset.value === v));
    if (typing) field.value = v; else field.textContent = v;
    if (announce) fire(root, 'ayni:change', { value: v, name, field, input: hidden });
  };
  const place = () => {
    const r = field.getBoundingClientRect(), sheet = isTouch() && innerWidth < 600;
    pop.classList.toggle('sheet', sheet);
    if (sheet) { // bottom sheet, kept above the on-screen keyboard; the field scrolls up so the sheet never hides it
      const vv = visualViewport, kb = vv ? Math.max(0, innerHeight - vv.offsetTop - vv.height) : 0;
      Object.assign(pop.style, { top: 'auto', left: '', width: '', bottom: kb + 'px', maxHeight: `min(50dvh, ${Math.max(160, (vv ? vv.height : innerHeight) - 16)}px)` });
      const over = r.bottom + 8 - pop.getBoundingClientRect().top;
      if (over > 0) {
        let q = root.parentElement;
        while (q && !(q.scrollHeight > q.clientHeight && /auto|scroll/.test(getComputedStyle(q).overflowY))) q = q.parentElement;
        (q || document.scrollingElement).scrollTop += over;
      }
      return;
    }
    const below = innerHeight - r.bottom - 12, above = r.top - 12, want = Math.min(280, list.scrollHeight + 10);
    const up = want > below && above > below;
    Object.assign(pop.style, { bottom: '', width: r.width + 'px', left: Math.max(4, Math.min(r.left, innerWidth - r.width - 4)) + 'px', maxHeight: Math.max(120, Math.min(280, up ? above : below)) + 'px' });
    pop.style.top = (up ? r.top - 4 - pop.getBoundingClientRect().height : r.bottom + 4) + 'px';
  };
  const open = () => {
    if (isOpen() || field.getAttribute('aria-readonly') === 'true' || field.getAttribute('aria-disabled') === 'true') return;
    pop.showPopover(); field.setAttribute('aria-expanded', 'true'); place();
    setActive(shown().find((o) => o.getAttribute('aria-selected') === 'true') || shown()[0]);
  };
  const close = () => {
    if (!isOpen()) return;
    pop.hidePopover(); field.setAttribute('aria-expanded', 'false'); setActive(null);
    all.forEach((o) => { o.hidden = false; }); if (empty) empty.hidden = true;
  };
  const pick = (o) => { set(o.dataset.value); close(); field.focus(); };
  root.addEventListener('ayni:dismiss', (e) => { e.preventDefault(); close(); keepTyped(); });
  const keepTyped = () => { if (typing && field.value.trim() !== hidden.value) set(field.value.trim()); };
  /* Type-ahead (typing off), shared helper; works while closed too */
  const ta = makeTypeAhead((o) => o.dataset.value);
  const typeAhead = (ch) => {
    const hit = ta.find(ch, all, isOpen() ? activeOpt() : all.find((o) => o.dataset.value === hidden.value));
    if (hit && !isRO(field)) isOpen() ? setActive(hit) : set(hit.dataset.value);
  };
  root.addEventListener('click', (e) => { if (pop.contains(e.target)) return; if (!isOpen()) open(); else if (!typing) close(); });
  label.addEventListener('click', () => field.focus());
  list.addEventListener('click', (e) => { const o = e.target.closest('[role="option"]'); if (o) pick(o); });
  list.addEventListener('pointermove', (e) => { const o = e.target.closest('[role="option"]'); if (o && e.pointerType === 'mouse') setActive(o); });
  pop.addEventListener('mousedown', (e) => e.preventDefault()); // the focus stays in the field
  document.addEventListener('pointerdown', (e) => { if (isOpen() && !root.contains(e.target)) { close(); keepTyped(); } }, true);
  field.addEventListener('blur', () => setTimeout(() => { if (!root.contains(document.activeElement)) { close(); keepTyped(); } }));
  addEventListener('resize', () => isOpen() && place()); visualViewport?.addEventListener('resize', () => isOpen() && place());
  addEventListener('scroll', (e) => { if (isOpen() && !pop.contains(e.target)) place(); }, true);
  field.addEventListener('keydown', (e) => {
    const opts = shown(), cur = opts.indexOf(activeOpt()), go = (i) => setActive(opts[Math.max(0, Math.min(opts.length - 1, i))]);
    if ((e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) || e.key === 'F4') { e.preventDefault(); isOpen() ? close() : open(); return; }
    switch (e.key) {
      case 'ArrowDown': case 'ArrowUp': e.preventDefault(); if (!isOpen()) open(); else go(cur + (e.key === 'ArrowDown' ? 1 : -1)); return;
      case 'PageDown': case 'PageUp': if (isOpen()) { e.preventDefault(); go(cur + (e.key === 'PageDown' ? 8 : -8)); } return;
      case 'Home': case 'End': if (isOpen() && !typing) { e.preventDefault(); go(e.key === 'Home' ? 0 : opts.length - 1); } return;
      case 'Enter':
        if (isOpen()) { e.preventDefault(); const a = activeOpt(); if (a) pick(a); else { close(); keepTyped(); } }
        else if (!typing) { e.preventDefault(); open(); } else keepTyped();
        return;
      case 'Escape': if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); } return;
      case 'Tab': close(); keepTyped(); return;
      case ' ': if (!typing && !ta.busy()) { e.preventDefault(); const a = activeOpt(); isOpen() ? a && pick(a) : open(); return; }
    }
    if (!typing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); typeAhead(e.key); }
  });
  if (typing) field.addEventListener('input', () => {
    const m = Ayni.matcher(field.value);      // the search rule (4.5): words in any order, "phrase", -word
    all.forEach((o) => { o.hidden = !!m && !m(o.dataset.value); });
    empty.hidden = shown().length > 0;
    if (!isOpen()) open(); else place();
    setActive(m ? shown()[0] || null : null);
  });
  set(hidden.value, false);
};

/* ---------- Splitter (item 69): drag, arrows, Home/End; Enter collapses/restores the first pane; double-click resets ---------- */
/* Fires ayni:split with { action: 'reset' | 'collapse' | 'restore', pane, message } after a user action */
const initSplit = (split) => {
  const bar = $('.splitter', split), rows = split.classList.contains('rows'), def = +(split.dataset.default || 35);
  const [first, last] = rows ? ['top', 'bottom'] : ['left', 'right'];
  const tri = (dir) => `<span class="tri ${dir}"></span>`;
  const ctl = document.createElement('span'); ctl.className = 'split-ctl';
  ctl.innerHTML = `<button type="button" tabindex="-1" data-to="0" aria-label="${tx('split.collapse.' + first)}" data-tip="${tx('split.collapse.' + first)}">${tri(rows ? 'up' : 'left')}</button>`
    + `<button type="button" tabindex="-1" data-to="reset" aria-label="${tx('split.reset')}" data-tip="${tx('split.resetTip')}"><span class="dot"></span></button>`
    + `<button type="button" tabindex="-1" data-to="100" aria-label="${tx('split.collapse.' + last)}" data-tip="${tx('split.collapse.' + last)}">${tri(rows ? 'down' : 'right')}</button>`;
  bar.append(ctl);
  const [toStart, , toEnd] = $$('button', ctl);
  let before = def;
  const setSplit = (v, keep) => {
    v = v <= 0 ? 0 : v >= 100 ? 100 : Math.max(15, Math.min(85, Math.round(v)));
    if (v > 0 && v < 100 && !keep) before = v;
    split.style.setProperty('--split', v + '%');
    split.classList.toggle('collapsed', v === 0); split.classList.toggle('collapsed-end', v === 100);
    bar.setAttribute('aria-valuenow', v);
    toStart.setAttribute('aria-disabled', v === 0); toEnd.setAttribute('aria-disabled', v === 100);
  };
  const tell = (action, pane, message) => fire(split, 'ayni:split', { action, pane, message });
  const reset = () => { before = def; setSplit(def); tell('reset', null, tx('split.wasReset')); };
  /* Too short a bar for three targets: only the reset ring shows */
  new ResizeObserver(() => {
    const len = rows ? bar.clientWidth : bar.clientHeight, need = isTouch() ? 3 * 10 + 68 + 16 : 3 * 10 + 16;
    ctl.classList.toggle('short', len < need);
  }).observe(bar);
  ctl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.to === 'reset') reset();
    else { const pane = b.dataset.to === '0' ? first : last; setSplit(+b.dataset.to, true); tell('collapse', pane, tx('split.collapsed.' + pane)); }
  });
  ctl.addEventListener('dblclick', (e) => e.stopPropagation());
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.split-ctl button')) return;
    e.preventDefault(); bar.setPointerCapture(e.pointerId);
    const move = (ev) => { const r = split.getBoundingClientRect(); setSplit(rows ? ((ev.clientY - r.top) / r.height) * 100 : ((ev.clientX - r.left) / r.width) * 100); };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', () => bar.removeEventListener('pointermove', move), { once: true });
  });
  bar.addEventListener('dblclick', reset);
  bar.addEventListener('keydown', (e) => {
    const v = +bar.getAttribute('aria-valuenow');
    if (e.key === 'Enter') { e.preventDefault(); if (v === 0) setSplit(before); else setSplit(0, true); tell(v === 0 ? 'restore' : 'collapse', first, tx(v === 0 ? 'split.restored' : 'split.collapsed')); return; }
    const n = (rows ? { ArrowUp: v - 5, ArrowDown: v + 5 } : { ArrowLeft: v - 5, ArrowRight: v + 5 })[e.key] ?? { Home: 15, End: 85 }[e.key];
    if (n !== undefined) { e.preventDefault(); setSplit(v === 0 && n < 15 ? 15 : v === 100 && n > 85 ? 85 : n); }
  });
  setSplit(def);
};


/* ---------- Desktop: taskbar and windows ---------- */
/* <div class="desktop" data-edge="bottom"> holds <main class="area"> with the windows and <nav class="taskbar"> with
   the launcher button at the left, <div class="chips"> and <div class="widgets"> (the clock, and any other gadget
   on either side of it) at the right. The user puts the taskbar at the top or the bottom from its pop-up menu
   (right-click, long tap, Shift+F10); the choice is kept in localStorage
   ('ayni-taskbar-edge') and fires ayni:edge { edge } on the desktop. */
const EDGES = ['top', 'bottom'];
/* Desktop mode exists only from 1024 px wide (ayni.css hides .desktop below). Ayni.isDesktop() tells, and
   ayni:desktopmode { on } fires on document when the width crosses 1024 px */
const wideMq = matchMedia('(min-width: 1024px)');
const isDesktop = () => wideMq.matches;
wideMq.addEventListener('change', () => fire(document, 'ayni:desktopmode', { on: wideMq.matches }));
let edgeMenu, edgeDesk, zTop = 10;
const setEdge = (desk, edge, save = true) => {
  if (!EDGES.includes(edge)) return;
  desk.dataset.edge = edge;
  $$('[role="menuitemradio"]', edgeMenu).forEach((x) => {
    const on = x.dataset.edge === edge; x.setAttribute('aria-checked', on); $('.icon', x)?.remove();
    if (on) x.insertAdjacentHTML('afterbegin', icon('check'));
  });
  if (save) { try { localStorage.setItem('ayni-taskbar-edge', edge); } catch {} fire(desk, 'ayni:edge', { edge }); }
};
const initDesktop = (desk) => {
  const bar = $('.taskbar', desk);
  if (!edgeMenu) {
    edgeMenu = layer('ayni-edge', `<div class="panel menu" popover id="ayni-edge" aria-label="${tx('desk.edge')}">${EDGES.map((e) =>
      `<button role="menuitemradio" aria-checked="false" data-edge="${e}">${tx('desk.edge.' + e)}</button>`).join('')}</div>`);
    initMenu(edgeMenu); once('menu', edgeMenu);
    edgeMenu.addEventListener('ayni:choose', (e) => edgeDesk && setEdge(edgeDesk, e.detail.dataset.edge));
  }
  let saved = null; try { saved = localStorage.getItem('ayni-taskbar-edge'); } catch {}
  setEdge(desk, [saved, desk.dataset.edge].find((x) => EDGES.includes(x)) || 'bottom', false);
  const t = () => { edgeDesk = desk; return { name: tx('desk.taskbar'), back: bar }; };
  contextMenu(bar, { menu: edgeMenu, target: (e) => (e.target.closest('button, .widget') ? null : t()), keyTarget: t });
};

/* A window (section.panel.window inside .area): a title row (app icon and name, then the app's toolbar) and the
   content. Ayni adds a chip for it to the taskbar; only the selected window's chip shows the controls (minimise,
   maximise or restore, close), and windows have none of their own. Clicking a window or its chip selects it and
   brings it to the front; clicking the selected chip minimises it. The title row moves the window, any edge or
   corner resizes it (no snapping), and its title row always stays inside the area; double-click on the title row
   maximises or restores. Events: ayni:window { window, state } with state open, select, minimise, maximise,
   restore or close, and ayni:close (cancelable) on the window before it closes. Ayni.windows.select(w), minimise(w),
   maximise(w), restore(w) and close(w) do the same from code. */
const chipOf = new WeakMap();
const winsOf = (desk) => $$('.area > .panel.window', desk);
const winState = (w, state) => fire(w, 'ayni:window', { window: w, state });
const selectWin = (desk, w) => {
  winsOf(desk).forEach((x) => { x.classList.toggle('active', x === w); chipOf.get(x)?.setAttribute('aria-current', x === w); });
  if (!w) return;
  w.classList.remove('min'); chipOf.get(w)?.classList.remove('min'); w.style.zIndex = ++zTop;
  ownedOf(w).forEach((d) => { d.hidden = false; d.style.zIndex = ++zTop; });
  winState(w, 'select');
};
const frontWin = (desk) => winsOf(desk).filter((x) => !x.classList.contains('min')).sort((a, b) => b.style.zIndex - a.style.zIndex)[0] || null;
const minimiseWin = (w) => {
  const desk = w.closest('.desktop'); w.classList.add('min'); chipOf.get(w)?.classList.add('min');
  ownedOf(w).forEach((d) => (d.hidden = true));
  winState(w, 'minimise'); selectWin(desk, frontWin(desk));
};
const maximiseWin = (w, on = !w.classList.contains('max')) => {
  w.classList.toggle('max', on);
  const b = $('[data-win="max"]', chipOf.get(w)), label = tx(on ? 'win.restore' : 'win.maximise');
  if (b) { b.setAttribute('aria-label', label); b.dataset.tip = label; setIcon(b, on ? 'restore' : 'maximise'); retip(b); }
  winState(w, on ? 'maximise' : 'restore');
};
const closeWin = (w) => {
  if (!ask(w, 'ayni:close', { window: w })) return;
  const desk = w.closest('.desktop'); ownedOf(w).forEach((d) => d.close('close')); chipOf.get(w)?.remove(); w.remove();
  winState(w, 'close'); selectWin(desk, frontWin(desk));
};
/* The title row (head) moves el inside area, but not from its buttons or fields; the title row always stays inside */
const dragBy = (el, head, area, can = () => true) => head.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('button, input, select, textarea, a') || !can()) return;
  const r = el.getBoundingClientRect(), a = area.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  head.setPointerCapture(e.pointerId);
  const move = (m) => {
    el.style.left = Math.min(Math.max(m.clientX - dx - a.left, 0), Math.max(0, a.width - r.width)) + 'px';
    el.style.top = Math.min(Math.max(m.clientY - dy - a.top, 0), a.height - head.offsetHeight) + 'px';
  };
  const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); };
  head.addEventListener('pointermove', move); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
});

/* A modeless dialog opened from a window belongs to it: it floats above that window inside the area, moves by its title
   row, has no chip, hides while the window is minimised and closes with it */
const ownedBy = new WeakMap();
const ownedOf = (w) => $$('.area > dialog.panel[open]', w.closest('.desktop') || document).filter((d) => ownedBy.get(d) === w);
const adoptDialog = (d) => {
  /* The owner is the selected window: a modeless dialog is opened from the window the user is working in */
  const w = $('.desktop > .area > .panel.window.active');
  if (!w || !isDesktop() || d.matches(':modal')) return;
  const area = w.parentElement, first = !ownedBy.has(d);
  ownedBy.set(d, w); d.classList.add('owned');
  if (d.parentElement !== area) area.append(d);
  if (first || d.dataset.owner !== w.id) {
    d.style.left = Math.max(0, w.offsetLeft + (w.offsetWidth - d.offsetWidth) / 2) + 'px';
    d.style.top = Math.max(0, w.offsetTop + 48) + 'px';
  }
  d.dataset.owner = w.id || '';
  if (first) { dragBy(d, $('header', d) || d, area); d.addEventListener('pointerdown', () => { const o = ownedBy.get(d); if (o && d.open) selectWin(o.closest('.desktop'), o); }); }
  d.style.zIndex = ++zTop;
};

const initWindow = (w) => {
  const desk = w.closest('.desktop'), area = w.parentElement, head = $(':scope > header', w);
  if (!desk || !head) return;
  const name = $('h2', head)?.textContent.trim() || tx('win.name'), appIcon = $('.app .icon', head);
  const chip = document.createElement('div');
  chip.className = 'chip'; chip.setAttribute('role', 'group'); chip.setAttribute('aria-label', name);
  const ctl = (k, label, ic) => `<button class="btn" data-win="${k}" aria-label="${label}" data-tip="${label}">${icon(ic)}</button>`;
  chip.innerHTML = `<button class="chip-main">${icon(appIcon ? iconName(appIcon) : 'file')}<span></span></button>`
    + `<span class="chip-ctl">${ctl('min', tx('win.minimise'), 'minimise')}${ctl('max', tx('win.maximise'), 'maximise')}${ctl('close', tx('close'), 'close')}</span>`;
  const main = $('.chip-main', chip); $('span:not(.icon)', main).textContent = name; main.dataset.tip = name;
  $('.chips', desk)?.append(chip); chipOf.set(w, chip);
  main.addEventListener('click', () => {
    if (chip.getAttribute('aria-current') === 'true' && !w.classList.contains('min')) minimiseWin(w); else selectWin(desk, w);
  });
  chip.addEventListener('click', (e) => {
    const k = e.target.closest('[data-win]')?.dataset.win;
    if (k === 'min') minimiseWin(w); if (k === 'max') maximiseWin(w); if (k === 'close') closeWin(w);
  });
  /* New windows open in a cascade from the top left of the area */
  if (!w.style.left && !w.style.top) { const n = winsOf(desk).indexOf(w) % 6; w.style.left = 32 + n * 28 + 'px'; w.style.top = 24 + n * 28 + 'px'; }
  w.addEventListener('pointerdown', () => { if (!w.classList.contains('active')) selectWin(desk, w); });
  w.addEventListener('focusin', () => { if (!w.classList.contains('active')) selectWin(desk, w); });
  dragBy(w, head, area, () => !w.classList.contains('max'));
  head.addEventListener('dblclick', (e) => { if (!e.target.closest('button, input, a')) maximiseWin(w); });
  /* Any edge or corner resizes it, down to its CSS minimum and never past the area */
  ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => w.insertAdjacentHTML('beforeend', `<span class="win-grip" data-dir="${d}" aria-hidden="true"></span>`));
  w.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.win-grip'); if (!g || e.button !== 0 || g.parentElement !== w) return;
    e.preventDefault(); g.setPointerCapture(e.pointerId);
    const d = g.dataset.dir, a = area.getBoundingClientRect(), cs = getComputedStyle(w);
    const min = { w: parseFloat(cs.minWidth) || 0, h: parseFloat(cs.minHeight) || 0 };
    const s = { x: e.clientX, y: e.clientY, l: w.offsetLeft, t: w.offsetTop, w: w.offsetWidth, h: w.offsetHeight };
    const move = (m) => {
      const dx = m.clientX - s.x, dy = m.clientY - s.y;
      let { l, t, w: wd, h } = s;
      if (d.includes('e')) wd = Math.min(Math.max(s.w + dx, min.w), a.width - s.l);
      if (d.includes('s')) h = Math.min(Math.max(s.h + dy, min.h), a.height - s.t);
      if (d.includes('w')) { l = Math.min(Math.max(s.l + dx, 0), s.l + s.w - min.w); wd = s.w + s.l - l; }
      if (d.includes('n')) { t = Math.min(Math.max(s.t + dy, 0), s.t + s.h - min.h); h = s.h + s.t - t; }
      Object.assign(w.style, { left: l + 'px', top: t + 'px', width: wd + 'px', height: h + 'px' });
    };
    const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  });
  const tools = $(':scope > [role="toolbar"]', head);
  if (tools) { fitTools(tools); if (once('toolbar', tools)) initToolbar(tools); }
  winState(w, 'open'); selectWin(desk, w);
};

/* A window's toolbar that does not fit: the app's icon and name never shrink; the tools that do not fit move, from the
   end, into a round "more" button at the end of the row, whose menu lists them (icon and tooltip text) and runs them.
   They come back as the window widens */
let fitN = 0;
const fitTools = (bar) => {
  const id = 'ayni-more-' + ++fitN;
  bar.insertAdjacentHTML('beforeend', `<button class="btn more" popovertarget="${id}" aria-haspopup="menu" aria-label="${tx('win.more')}" data-tip="${tx('win.more')}" hidden>${icon('more')}</button>`);
  const more = $(':scope > .more', bar);
  const menu = layer(id, `<div class="panel menu" popover id="${id}" role="menu" aria-label="${tx('win.more')}"></div>`);
  initMenu(menu); once('menu', menu);
  const tools = () => $$(':scope > button:not(.more)', bar);
  /* The row fits when its last visible button ends inside the toolbar */
  const fits = () => { const v = $$(':scope > button:not([hidden])', bar).pop(); return !v || v.getBoundingClientRect().right <= bar.getBoundingClientRect().right + .5; };
  const fit = () => {
    tools().forEach((t) => (t.hidden = false)); more.hidden = true;
    if (fits()) { if (more.tabIndex === 0) { more.tabIndex = -1; if (tools()[0]) tools()[0].tabIndex = 0; } menu.innerHTML = ''; return; }
    more.hidden = false;
    for (const t of tools().reverse()) { if (fits()) break; t.hidden = true; }
    /* The toolbar's one Tab stop must stay on a visible button */
    const all = [...tools(), more];
    if (!all.some((t) => !t.hidden && t.tabIndex === 0)) { all.forEach((t) => (t.tabIndex = -1)); all.find((t) => !t.hidden).tabIndex = 0; }
    menu.innerHTML = tools().filter((t) => t.hidden).map((t) => `<button role="menuitem" data-tool="${tools().indexOf(t)}">${icon(iconName($('.icon', t)) || 'more')}<span></span></button>`).join('');
    $$('[data-tool]', menu).forEach((it) => { const t = tools()[it.dataset.tool]; $('span:not(.icon)', it).textContent = t.dataset.tip || t.getAttribute('aria-label'); it.setAttribute('aria-disabled', t.getAttribute('aria-disabled') || 'false'); });
  };
  menu.addEventListener('click', (e) => { const it = e.target.closest('[data-tool]'); if (it) tools()[it.dataset.tool]?.click(); });
  new ResizeObserver(fit).observe(bar.parentElement);
};

/* Launcher (.panel.popup.launcher): a search field (.search-field) and the apps (.apps > button[data-app]), most used
   first; the counts are kept in localStorage ('ayni-launch'). Typing filters the apps, Down and Up move through
   them, Enter in the field opens the first match. Picking an app closes the popup and fires ayni:launch { app, item } */
const initLauncher = (pop) => {
  const inp = $('.search-field input', pop), list = $('.apps', pop), empty = $('.empty', pop);
  const items = () => $$(':scope > button', list), shown = () => items().filter((b) => !b.hidden);
  items().forEach((b, i) => (b.dataset.pos = i));
  const counts = () => { try { return JSON.parse(localStorage.getItem('ayni-launch')) || {}; } catch { return {}; } };
  const filter = () => {
    const m = Ayni.matcher(inp?.value || '');
    items().forEach((b) => (b.hidden = !!m && !m(b.textContent)));
    if (empty) empty.hidden = shown().length > 0;
  };
  pop.addEventListener('toggle', (e) => {
    if (e.newState !== 'open') { invoker()?.focus(); return; }
    const c = counts();
    items().sort((a, b) => (c[b.dataset.app] || 0) - (c[a.dataset.app] || 0) || a.dataset.pos - b.dataset.pos).forEach((b) => list.append(b));
    if (inp) inp.value = ''; filter(); place(pop); (inp || shown()[0])?.focus();
  });
  inp?.addEventListener('input', filter);
  pop.addEventListener('keydown', (e) => {
    const stops = [inp, ...shown()].filter(Boolean), i = stops.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); stops[(i + (e.key === 'ArrowDown' ? 1 : -1) + stops.length) % stops.length]?.focus(); }
    else if (e.key === 'Enter' && document.activeElement === inp) { e.preventDefault(); shown()[0]?.click(); }
    else if (inp && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== inp) inp.focus();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-app]'); if (!b) return;
    const c = counts(); c[b.dataset.app] = (c[b.dataset.app] || 0) + 1;
    try { localStorage.setItem('ayni-launch', JSON.stringify(c)); } catch {}
    /* Focus goes back to the launcher button first, so the browser does not move it while the popup hides */
    invoker()?.focus(); pop.hidePopover(); fire(pop, 'ayni:launch', { app: b.dataset.app, item: b });
  });
};

/* Clock widget (.widget.clock): the time, the short date below it, the long date in its tooltip */
const initClock = (el) => {
  const tick = () => {
    const d = new Date();
    el.innerHTML = `<span>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><small>${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small>`;
    el.dataset.tip = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  tick(); setInterval(tick, 15000);
};

/* ---------- Ayni.init(root): wire up every control inside root (the whole page on load) ---------- */
const init = (root = document) => {
  each(root, '[role="tablist"]', 'tabs', initTabs);
  each(root, '.picker', 'picker', initPicker);
  each(root, '.split', 'split', initSplit);
  each(root, '.desktop', 'desktop', initDesktop);
  each(root, '.desktop > .area > .panel.window', 'window', initWindow);
  each(root, '.panel.popup.launcher', 'launcher', initLauncher);
  each(root, '.widget.clock', 'clock', initClock);
  each(root, 'dialog.panel', 'owned', (d) => new MutationObserver(() => { if (d.open) adoptDialog(d); else d.hidden = false; }).observe(d, { attributes: true, attributeFilter: ['open'] }));
};

Object.assign(Ayni, {
  status,
  windows: { select: (w) => selectWin(w.closest('.desktop'), w), minimise: minimiseWin, maximise: (w) => maximiseWin(w, true),
    restore: (w) => maximiseWin(w, false), close: closeWin },
  setTaskbarEdge: (desk, edge) => setEdge(desk, edge), isDesktop,
});
Ayni.core.family({ init });
})();
