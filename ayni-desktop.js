/* Ayni library 0.2.0, desktop family: the taskbar, windows and their modeless dialogs, the applications launcher and
   the clock widget. Plain JavaScript, no build step, evergreen browsers 2024+. Load it after ayni-menus.js:
     <script src="ayni-menus.js" defer></script>
     <script src="ayni-desktop.js" defer></script>
   The look is in ayni-desktop.css; the rules are chapter 17 of the guidelines. An app with its own window engine
   (windows that hold whole pages, 17.4) loads ayni-desktop.css and not this file. */
(() => {
'use strict';
const { $, $$, icon, setIcon } = Ayni;
const { fire, once, each, tx, iconName, layer, retip } = Ayni.core;
/* Menus, pop-up menus, toolbars and placing popups come from ayni-menus.js */
const { initMenu, contextMenu, place } = Ayni.core.menus;
const invoker = () => Ayni.core.menus.invoker();

/* A cancelable event: false when the page called preventDefault() */
const ask = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, cancelable: true }));

/* ---------- Taskbar ---------- */
/* <div class="desktop" data-edge="bottom"> holds <main class="area"> with the windows and <nav class="taskbar"> with
   the launcher button at the start, <div class="chips"> and <div class="widgets"> (the clock, and any other gadget
   on either side of it) at the end. The user puts the taskbar on any edge from its pop-up menu (right-click, long
   tap, Shift+F10); the choice is kept in localStorage ('ayni-taskbar-edge') and fires ayni:edge { edge } on the
   desktop. */
const EDGES = ['bottom', 'top', 'left', 'right'];
/* By default desktop mode starts at 1024 px wide (ayni-desktop.css hides .desktop below); data-mode="app" on .desktop
   means the app has its own rule and nothing hides it. Ayni.isDesktop() tells, and ayni:desktopmode { on } fires on
   document when the width crosses 1024 px */
const wideMq = matchMedia('(min-width: 1024px)');
const isDesktop = () => wideMq.matches || !!$('.desktop[data-mode="app"]');
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
  /* The wheel moves a row of chips along the bar; a column scrolls by itself */
  $('.chips', desk)?.addEventListener('wheel', (e) => {
    const c = e.currentTarget;
    if (['left', 'right'].includes(desk.dataset.edge) || c.scrollWidth <= c.clientWidth || !e.deltaY) return;
    e.preventDefault(); c.scrollLeft += e.deltaY;
  }, { passive: false });
};

/* A window (section.panel.window inside .area): a title row (app icon and name, then the app's toolbar) and the
   content. Ayni adds a chip for it to the taskbar; only the selected window's chip shows the name and the controls
   (minimise, maximise or restore, close; an app adds its own to Ayni.windows.chip(w)), and windows have none of their
   own. Ayni.windows.title(w, text) names what the window shows. Clicking a window or its chip selects it and
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
  chipOf.get(w)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
  /* Told while it is still in the page: an event from a removed element never reaches the desktop or the document */
  const desk = w.closest('.desktop'); ownedOf(w).forEach((d) => d.close('close')); winState(w, 'close'); chipOf.get(w)?.remove(); w.remove();
  selectWin(desk, frontWin(desk));
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
  const name = $('h2', head)?.textContent.trim() || tx('win.name'), appIcon = $('.win-app .icon', head);
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
  /* Tools that do not fit leave by rank into More (9.9); a tool with no rank has its place in the row, last out first */
  const tools = $(':scope > [role="toolbar"]', head);
  if (tools) { [...tools.children].forEach((x, i) => { if (!x.dataset.rank) x.dataset.rank = i + 1; }); Ayni.fitBar(head); }
  winState(w, 'open'); selectWin(desk, w);
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

const init = (root = document) => {
  each(root, '.desktop', 'desktop', initDesktop);
  each(root, '.desktop > .area > .panel.window', 'window', initWindow);
  each(root, '.panel.popup.launcher', 'launcher', initLauncher);
  each(root, '.widget.clock', 'clock', initClock);
  each(root, 'dialog.panel', 'owned', (d) => new MutationObserver(() => { if (d.open) adoptDialog(d); else d.hidden = false; }).observe(d, { attributes: true, attributeFilter: ['open'] }));
};

Object.assign(Ayni, {
  windows: { select: (w) => selectWin(w.closest('.desktop'), w), minimise: minimiseWin, maximise: (w) => maximiseWin(w, true),
    restore: (w) => maximiseWin(w, false), close: closeWin, chip: (w) => chipOf.get(w) || null,
    title: (w, text) => {
      const h = $(':scope > header h2', w), chip = chipOf.get(w), main = chip && $('.chip-main', chip);
      if (h) h.textContent = text;
      if (main) { $('span:not(.icon)', main).textContent = text; main.dataset.tip = text; chip.setAttribute('aria-label', text); retip(main); }
    } },
  setTaskbarEdge: (desk, edge) => setEdge(desk, edge), isDesktop,
});
Ayni.core.family({ init });
})();
