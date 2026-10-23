/* Ayni library 0.1.0: the behaviour of every Ayni control. Plain JavaScript, no build step, evergreen browsers 2024+.
   Load it after ayni.css, together with the icons:
     <script src="ayni-icons.js" defer></script>
     <script src="ayni.js" defer></script>
   When the page has loaded it wires up every control it finds. Ayni.init(root) wires up controls added later
   (each control is wired once). Controls tell the app what happened with DOM events that bubble (ayni:change,
   ayni:action, ayni:press, ...), listed in README.md. Everything else the app uses lives on window.Ayni. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fire = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
/* Each control is wired once, so Ayni.init() can run again on new content */
const wired = new WeakMap();
const once = (key, el) => { let s = wired.get(el); if (!s) wired.set(el, (s = new Set())); if (s.has(key)) return false; s.add(key); return true; };
const each = (root, sel, key, fn) => [...(root.matches?.(sel) ? [root] : []), ...$$(sel, root)].forEach((el) => { if (once(key, el)) fn(el); });
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform);
const isRO = (el) => el?.getAttribute?.('aria-readonly') === 'true';

/* Status bar: Ayni.status(text) writes the last action into the element marked data-ayni-status */
const status = (msg) => { const el = $('[data-ayni-status]'); if (el) el.textContent = msg; };

/* Shared layers, created when the page does not have them yet */
let helpPop, errPop, tip, toasts;
const layer = (id, html) => document.getElementById(id) || (document.body.insertAdjacentHTML('beforeend', html), document.getElementById(id));

/* ---------- Touch ---------- */
/* Browsers can't read the system double-click time, so a fixed 250 ms window is used */
const HOLD_MS = 500, DBL_MS = 250, coarse = matchMedia('(pointer: coarse)');
let touchPreview = false;
const isTouch = () => coarse.matches || touchPreview;
const applyTouch = () => { document.documentElement.classList.toggle('touch', isTouch()); $$('.btn[data-alt]').forEach((b) => b.setTip?.()); };
/* Ayni.setTouchPreview(true) shows the touch layout with a mouse (the gallery's Touch preview switch) */
const setTouchPreview = (on) => { touchPreview = !!on; applyTouch(); };

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

/* RULE: Enter inside a Panel clicks that Panel's default button (the .primary one in its own header or footer).
   Not in a text area (new line), not on another button or item (Enter presses or picks that), and not while a list or
   menu is open (the control handles Enter first and marks it handled). */
const defaultButton = (panel) => $$(':scope > footer .btn.primary, :scope > form > footer .btn.primary, :scope > header .btn.primary, :scope > form > header .btn.primary', panel)[0];
const onEnter = (e) => {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (t.closest('textarea, [contenteditable], button, a[href], summary, [role="button"], [role="tab"], [role^="menuitem"], [role="option"], [role="treeitem"], [role="listbox"], [role="tree"], [role="combobox"][aria-expanded="true"]')) return;
  const panel = t.closest('.panel'), b = panel && defaultButton(panel);
  if (!b || b.getAttribute('aria-disabled') === 'true') return;
  e.preventDefault(); b.click();
};

/* Busy buttons: setBusy(b, 'Saving…') swaps the icon for a spinner; setBusy(b, false) brings the icon and tooltip back */
const setBusy = (b, label) => {
  if (label) { b.dataset.idleTip ??= b.dataset.tip; b.dataset.tip = label; b.setAttribute('aria-busy', 'true'); if (!$('.btn-spin', b)) b.insertAdjacentHTML('beforeend', '<span class="btn-spin" aria-hidden="true"></span>'); }
  else { b.removeAttribute('aria-busy'); $('.btn-spin', b)?.remove(); if (b.dataset.idleTip) b.dataset.tip = b.dataset.idleTip; delete b.dataset.idleTip; }
};

/* ---------- Light / dark mode: follows the system until the user picks one ---------- */
/* Any button with data-theme-toggle switches it; the choice is kept in localStorage ('ayni-theme') */
const darkMq = matchMedia('(prefers-color-scheme: dark)'), themeBtns = [];
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : darkMq.matches; };
const showTheme = () => themeBtns.forEach((b) => { const d = isDark(); b.setAttribute('aria-pressed', d); b.dataset.tip = 'Dark mode: ' + (d ? 'on' : 'off'); });
const setTheme = (t) => {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  showTheme();
  try { if (t) localStorage.setItem('ayni-theme', t); else localStorage.removeItem('ayni-theme'); } catch {}
};
const initThemeToggle = (b) => {
  themeBtns.push(b);
  b.addEventListener('click', () => { const next = isDark() ? 'light' : 'dark'; setTheme(next); fire(b, 'ayni:theme', { theme: next }); });
  showTheme();
};

/* ---------- Dialogs ---------- */
/* Any element with data-open-dialog="id" opens that dialog as modal. A click on the backdrop closes it ('cancel').
   RULE: Esc always closes a dialog; the browser does it for modal ones, this does it for modeless ones ('close'). */
const initDialog = (d) => {
  d.addEventListener('click', (e) => { if (e.target === d && d.matches(':modal')) d.close('cancel'); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !d.matches(':modal')) d.close('close'); });
};

/* ---------- Lists: shared type-ahead and multi-selection ---------- */
/* Shared type-ahead (lists and the drop-down list; the tree is deferred): letters typed within 500 ms build one search ("me" reaches México),
   ignoring accents and case; after a pause a new search starts; repeating one letter cycles through its items */
const fold = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const makeTypeAhead = (textOf = (el) => el.textContent.trim()) => {
  let buf = '', timer;
  return {
    busy: () => buf !== '',
    find(key, items, current) {
      if (key.length !== 1 || (key === ' ' && !buf)) return null;
      clearTimeout(timer); buf += fold(key); timer = setTimeout(() => { buf = ''; }, 500);
      const same = [...buf].every((c) => c === buf[0]), q = same ? buf[0] : buf, cur = items.indexOf(current);
      const from = same ? cur + 1 : Math.max(cur, 0);
      return [...items.slice(from), ...items.slice(0, from)].find((o) => fold(textOf(o)).startsWith(q)) || null;
    },
  };
};
const plainKey = (e) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

/* Shared multi-selection helper (lists now; reusable by the tree when it is picked up again): Shift+click and Shift+arrows select a range from the
   anchor, Ctrl+A (Cmd+A on Mac) selects all, Page Up / Page Down jump one visible page */
const multiSelect = ({ box, items, set, done }) => ({
  range(a, b) { const lo = Math.min(a, b), hi = Math.max(a, b); items().forEach((o, j) => set(o, j >= lo && j <= hi)); done(); },
  all() { items().forEach((o) => set(o, true)); done(); },
  page(from, dir) {
    const its = items(), top = its[from].offsetTop; let i = from;
    while (its[i + dir] && Math.abs(its[i + dir].offsetTop - top) < box.clientHeight - its[from].offsetHeight) i += dir;
    return i === from ? Math.max(0, Math.min(its.length - 1, from + dir)) : i;
  },
  isSelectAll: (e) => e.key.toLowerCase() === 'a' && (isMac ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey,
});

/* List box (class "lb"): fires ayni:change with { selected: [texts] } whenever the selection changes */
const initListbox = (lb) => {
  const multi = lb.getAttribute('aria-multiselectable') === 'true';
  const opts = $$('[role="option"]', lb);
  opts.forEach((o, i) => { o.id = lb.id + '-o' + i; if (!o.hasAttribute('aria-selected')) o.setAttribute('aria-selected', 'false'); });
  let active = Math.max(0, opts.findIndex((o) => o.getAttribute('aria-selected') === 'true')), anchor = active;
  const report = () => fire(lb, 'ayni:change', { selected: opts.filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.textContent.trim()) });
  const setActive = (i) => {
    active = Math.max(0, Math.min(i, opts.length - 1));
    opts.forEach((o, j) => o.classList.toggle('active', j === active && document.activeElement === lb));
    lb.setAttribute('aria-activedescendant', opts[active].id);
    opts[active].scrollIntoView({ block: 'nearest' });
    if (!multi) { opts.forEach((o, j) => o.setAttribute('aria-selected', j === active)); report(); }
  };
  const toggle = (i) => { const o = opts[i]; o.setAttribute('aria-selected', o.getAttribute('aria-selected') !== 'true'); report(); };
  const ta = makeTypeAhead();
  const ms = multiSelect({ box: lb, items: () => opts, set: (o, on) => o.setAttribute('aria-selected', on), done: report });
  lb.addEventListener('focus', () => setActive(active));
  lb.addEventListener('blur', () => opts.forEach((o) => o.classList.remove('active')));
  lb.addEventListener('mousedown', (e) => {
    const i = opts.indexOf(e.target.closest('[role="option"]')); if (i < 0) return;
    e.preventDefault(); lb.focus();
    if (multi && e.shiftKey) ms.range(anchor, i);
    else if (multi) { toggle(i); anchor = i; }
    setActive(i);
  });
  lb.addEventListener('keydown', (e) => {
    if (multi && ms.isSelectAll(e)) { e.preventDefault(); ms.all(); return; }
    const n = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: opts.length - 1,
      PageDown: ms.page(active, 1), PageUp: ms.page(active, -1) }[e.key];
    if (n !== undefined) {
      e.preventDefault(); setActive(n);
      if (multi && e.shiftKey) ms.range(anchor, active); else anchor = active;
      return;
    }
    if (multi && e.key === ' ' && !ta.busy()) { e.preventDefault(); toggle(active); anchor = active; return; }
    if (plainKey(e)) { const hit = ta.find(e.key, opts, opts[active]); if (hit) { e.preventDefault(); setActive(opts.indexOf(hit)); anchor = active; } }
  });
};

/* ---------- Text fields ---------- */
/* Text area with a limit: the count sits inside the field (.ta-wrap > textarea[maxlength] + .ta-count) */
const initCount = (w) => {
  const t = $('textarea', w), c = $('.ta-count', w); if (!t || !c) return;
  const count = () => { c.textContent = `${t.value.length} / ${t.maxLength}`; };
  t.addEventListener('input', count); count();
};
/* RULE: every search field is the standard one (.search-field): its clear button shows once there is text. The first Esc
   clears the field and stops there; a second Esc, with the field already empty, closes the popup or dialog around it. */
const initSearch = (g) => {
  const inp = $('input', g), clr = $('[data-clear]', g);
  const sync = () => { clr.hidden = inp.value === ''; };
  const clear = () => { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); };
  inp.addEventListener('input', sync);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Escape' && inp.value !== '') { e.preventDefault(); e.stopPropagation(); clear(); } });
  clr.addEventListener('click', clear); sync();
};
/* Password: a button with data-reveal inside the field shows and hides the text */
const initReveal = (b) => b.addEventListener('click', () => {
  const show = b.getAttribute('aria-pressed') !== 'true', pw = $('input', b.closest('.input-group'));
  pw.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show);
  const label = show ? 'Hide password' : 'Show password'; b.setAttribute('aria-label', label); b.dataset.tip = label;
  $('use', b).setAttribute('href', show ? '#i-eye-off' : '#i-eye'); if (tipEl === b) showTip(b);
});

/* ---------- Labels: clicking a label focuses its control; a list is focused through its current item ---------- */
const focusCtl = (c) => (c.matches('[tabindex], input, select, textarea, button') ? c : $('[tabindex="0"]', c) || c).focus();

/* RULE: number field (spin button). Arrows step, Page Up/Down step 10 times, Home/End go to min/max. Holding − or +
   repeats, slowly and then faster. − is disabled at the minimum and + at the maximum. A typed value out of range shows the
   usual field error instead of being corrected. Both "," and "." are accepted as the decimal separator. */
const initSpin = (g) => {
  const inp = $('.input', g), [dec, inc] = $$('button[data-step]', g), err = document.getElementById(inp.getAttribute('aria-describedby'));
  const min = +inp.dataset.min, max = +inp.dataset.max, step = +inp.dataset.step, places = (inp.dataset.step.split('.')[1] || '').length;
  let sep = inp.value.includes(',') ? ',' : '.';
  const parse = () => { const t = inp.value.trim().replace(',', '.'); return t === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(t) ? NaN : +t; };
  const show = (v) => String(+v.toFixed(places)).replace('.', sep);
  const check = () => {
    const v = parse(), bad = Number.isNaN(v) || v < min || v > max;
    inp.setAttribute('aria-invalid', bad); err.hidden = !bad; err.textContent = `Between ${show(min)} and ${show(max)}.`;
    if (!bad) inp.setAttribute('aria-valuenow', v);
    inp.setAttribute('aria-valuemin', min); inp.setAttribute('aria-valuemax', max);
    dec.toggleAttribute('aria-disabled', !bad && v <= min); inc.toggleAttribute('aria-disabled', !bad && v >= max);
    if (dec.hasAttribute('aria-disabled')) dec.setAttribute('aria-disabled', 'true');
    if (inc.hasAttribute('aria-disabled')) inc.setAttribute('aria-disabled', 'true');
    return !bad;
  };
  const set = (v) => { inp.value = show(Math.min(max, Math.max(min, Math.round(v / step) * step))); check(); };
  const by = (n) => { const v = parse(); set((Number.isNaN(v) ? min : Math.min(max, Math.max(min, v))) + n * step); };
  inp.addEventListener('input', () => { if (inp.value.includes(',')) sep = ','; else if (inp.value.includes('.')) sep = '.'; check(); });
  inp.addEventListener('keydown', (e) => {
    const n = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (n) { e.preventDefault(); by(n); }
    else if (e.key === 'Home') { e.preventDefault(); set(min); }
    else if (e.key === 'End') { e.preventDefault(); set(max); }
  });
  /* Holding a button repeats: first after 400 ms, every 150 ms, then every 50 ms after 1.5 s */
  [[dec, -1], [inc, 1]].forEach(([b, n]) => {
    let t1, t2, start;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    const tick = () => { if (b.getAttribute('aria-disabled') === 'true') return stop(); by(n); };
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || b.getAttribute('aria-disabled') === 'true') return;
      e.preventDefault(); inp.focus(); tick(); start = performance.now();
      t1 = setTimeout(() => { t2 = setInterval(() => { tick(); if (performance.now() - start > 1500) { clearInterval(t2); t2 = setInterval(tick, 50); } }, 150); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { if (e.detail === 0) by(n); }); // assistive tech activation
  });
  check();
};

/* ---------- Menus and popups: positioning, keyboard, menu bar ---------- */
/* invoker is the button that opened the current popup (any [popovertarget]); ctxPoint is set for pop-up menus */
let invoker = null, ctxPoint = null, ctxName = null, ctxReturn = null, ctxMenu = null;
/* Ayni.place(popup): below its button (above when there is no room), or at the pointer for a pop-up menu, kept on screen */
const place = (menu) => {
  const m = menu.getBoundingClientRect();
  let x, y;
  if (ctxPoint) { x = ctxPoint.x; y = ctxPoint.y; }
  else { const r = invoker.getBoundingClientRect(); x = r.left; y = r.bottom + 4; if (y + m.height > innerHeight) y = r.top - m.height - 4; }
  const edge = innerWidth < 360 ? 4 : 8; // very narrow phones: popups may come closer to the edge
  menu.style.left = Math.max(edge, Math.min(x, innerWidth - m.width - edge)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, innerHeight - m.height - 8)) + 'px';
};
const inBar = (b) => b?.parentElement?.getAttribute('role') === 'menubar';
const barItemsOf = (b) => $$('button', b.parentElement);
const openMenu = (btn) => { invoker = btn; ctxPoint = null; $('#' + btn.getAttribute('popovertarget')).showPopover(); };
/* A menu fires ayni:action with { item, menu, act } when an item is chosen (menu is the menu's name, or the name of
   the thing a pop-up menu was opened on), and ayni:choose with the item when a menuitemradio is picked */
const initMenu = (menu) => {
  const items = () => $$('[role^="menuitem"]:not([aria-disabled="true"])', menu);
  menu.addEventListener('toggle', (e) => {
    const bar = inBar(invoker) ? invoker : null;
    if (bar) bar.setAttribute('aria-expanded', e.newState === 'open');
    if (e.newState === 'open') { place(menu); items()[0].focus(); }
    else if (!menu.dataset.switching) (ctxPoint ? ctxReturn : invoker)?.focus();
  });
  menu.addEventListener('keydown', (e) => {
    const list = items(), i = list.indexOf(document.activeElement);
    const n = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (n !== undefined) { e.preventDefault(); list[(n + list.length) % list.length].focus(); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && inBar(invoker)) {
      e.preventDefault();
      const barItems = barItemsOf(invoker), j = barItems.indexOf(invoker), next = barItems[(j + (e.key === 'ArrowRight' ? 1 : -1) + barItems.length) % barItems.length];
      menu.dataset.switching = '1'; menu.hidePopover(); delete menu.dataset.switching; invoker.setAttribute('aria-expanded', 'false');
      openMenu(next);
    }
  });
  menu.addEventListener('click', (e) => {
    const it = e.target.closest('[role^="menuitem"]'); if (!it) return;
    if (it.getAttribute('role') === 'menuitemradio') {
      $$('[role="menuitemradio"]', menu).forEach((x) => { x.setAttribute('aria-checked', x === it); $('svg', x)?.remove(); });
      it.insertAdjacentHTML('afterbegin', '<svg class="icon"><use href="#i-check"/></svg>');
      fire(menu, 'ayni:choose', it);
    }
    if (it.getAttribute('role') === 'menuitemcheckbox') {
      const on = it.getAttribute('aria-checked') !== 'true'; it.setAttribute('aria-checked', on);
      const ic = $('svg', it); if (on && !ic) it.insertAdjacentHTML('afterbegin', '<svg class="icon"><use href="#i-check"/></svg>'); if (!on && ic) ic.remove();
    }
    fire(menu, 'ayni:action', { item: it, menu: menu === ctxMenu && ctxName ? ctxName : menu.getAttribute('aria-label'), act: it.dataset.act });
    menu.hidePopover();
  });
};
/* Menu bar: arrows move, Down opens, hovering switches while a menu is open; F10 focuses the visible menu bar */
const initMenubar = (bar) => {
  const barItems = $$('button', bar);
  barItems.forEach((b, i) => { b.tabIndex = i ? -1 : 0; });
  bar.addEventListener('keydown', (e) => {
    const i = barItems.indexOf(document.activeElement);
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: barItems.length - 1 }[e.key];
    if (n !== undefined) { e.preventDefault(); barItems.forEach((b) => (b.tabIndex = -1)); const t = barItems[(n + barItems.length) % barItems.length]; t.tabIndex = 0; t.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(barItems[i]); }
  });
  barItems.forEach((b) => b.addEventListener('pointerenter', () => {
    const open = barItems.find((x) => x.getAttribute('aria-expanded') === 'true');
    if (open && open !== b) { const m = $('#' + open.getAttribute('popovertarget')); m.dataset.switching = '1'; m.hidePopover(); delete m.dataset.switching; open.setAttribute('aria-expanded', 'false'); openMenu(b); }
  }));
};
/* Pop-up (context) menu: right-click, Shift+F10 or the Menu key, and a long tap (500 ms hold) on touch.
   RULE: a long tap means "more for this thing": on a button with a dot it runs the second action, on an area,
   list item or tree item it opens that element's pop-up menu. iOS Safari sends no contextmenu, so the hold is
   timed here, with the same ring as the buttons. */
const openCtx = (menu, x, y, name, back) => { ctxPoint = { x, y }; invoker = back; ctxReturn = back; ctxName = name; ctxMenu = menu; menu.showPopover(); };
let swallowUntil = 0, swallowIn = null; // after a long tap, ignore the click / mousedown its release may produce on the held element
const holdRing = (x, y) => {
  const r = document.createElement('div'); r.className = 'hold-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
  r.style.setProperty('--hold-ms', HOLD_MS + 'ms'); document.body.append(r); return r;
};
/* Ayni.contextMenu(area, { menu, target, keyTarget }): target(e) returns { name, back, at? } for the element under the
   event, or null; keyTarget(e) does the same for Shift+F10 and the Menu key (default: target) */
const contextMenu = (root, { menu, target, keyTarget = target }) => {
  let rightDown = false, timer, ring, fired = null, start;
  const stop = () => { clearTimeout(timer); ring?.remove(); ring = null; };
  root.addEventListener('pointerdown', (e) => {
    rightDown = e.button === 2;
    if (e.pointerType === 'mouse' && !isTouch()) return;
    const t = target(e); if (!t || e.button !== 0) return;
    fired = null; start = { x: e.clientX, y: e.clientY }; ring = holdRing(e.clientX, e.clientY);
    timer = setTimeout(() => { ring?.remove(); ring = null; fired = { ...t, ...start }; navigator.vibrate?.(15); }, HOLD_MS);
  });
  root.addEventListener('pointermove', (e) => { if (ring && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) stop(); });
  root.addEventListener('pointercancel', stop);
  /* The menu opens on release, otherwise that release would close it as an outside click */
  root.addEventListener('pointerup', () => {
    stop(); if (!fired) return;
    const f = fired; fired = null; swallowUntil = performance.now() + 600; swallowIn = root;
    setTimeout(() => openCtx(menu, f.x, f.y, f.name, f.back));
  });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') stop(); });
  root.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (ring || fired || e.pointerType === 'touch') return; // touch holds are timed above
    const t = target(e); if (!t) return;
    const { clientX: x, clientY: y } = e;
    if (rightDown) addEventListener('pointerup', () => { rightDown = false; setTimeout(() => openCtx(menu, x, y, t.name, t.back)); }, { once: true });
    else openCtx(menu, x, y, t.name, t.back);
  });
  root.addEventListener('keydown', (e) => {
    if (!((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu')) return;
    const t = keyTarget(e); if (!t) return;
    e.preventDefault(); const r = (t.at || t.back).getBoundingClientRect(); openCtx(menu, r.left + 16, r.top + r.height / 2, t.name, t.back);
  });
};
/* Ayni.toolbar(el): one Tab stop, arrow keys move between tools (roving tabindex). Called by the page, not automatic */
const initToolbar = (bar) => {
  const tools = $$('button', bar);
  tools.forEach((t, i) => (t.tabIndex = i ? -1 : 0));
  bar.addEventListener('keydown', (e) => {
    const i = tools.indexOf(document.activeElement);
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tools.length - 1 }[e.key];
    if (n !== undefined) { e.preventDefault(); tools.forEach((t) => (t.tabIndex = -1)); const t = tools[(n + tools.length) % tools.length]; t.tabIndex = 0; t.focus(); }
  });
};
/* Popup with controls (.panel.popup.controls): placed next to its button, the focus goes to its first control and
   comes back to the button when it closes */
const initControlsPopup = (pop) => pop.addEventListener('toggle', (e) => {
  if (e.newState === 'open') { place(pop); $('input:not([type="hidden"]), select, textarea, [tabindex="0"]', pop)?.focus(); } else invoker?.focus();
});

/* ---------- Calendar (shared by inline calendars and the date popups) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim()); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return iso(d) === s.trim() ? d : null; };
const sameDay = (a, b) => a && b && iso(a) === iso(b);
const fmtLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonShort = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const fmtMonLong = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDT = (d) => `${iso(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseDT = (str) => {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/.exec(str.trim()); if (!m) return null;
  const d = parseIso(m[1]), h = +m[2], mi = +m[3]; if (!d || h > 23 || mi > 59) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
};
/* Ayni.calendar(root, onPick) draws a calendar in root and returns { set(date), focus() }.
   Optional limits come from data-min / data-max (YYYY-MM-DD) on the calendar root.
   The title switches days -> months -> years; picking a month or a year returns to the days. */
const makeCalendar = (root, onPick) => {
  const min = parseIso(root.dataset.min || ''), max = parseIso(root.dataset.max || '');
  let sel = day0(new Date()), cur = day0(new Date()), view = 'days';
  const dayOk = (d) => !(min && d < min) && !(max && d > max);
  const monthOk = (y, m) => !(min && new Date(y, m + 1, 0) < min) && !(max && new Date(y, m, 1) > max);
  const yearOk = (y) => !(min && y < min.getFullYear()) && !(max && y > max.getFullYear());
  const clamp = (d) => (min && d < min ? new Date(min) : max && d > max ? new Date(max) : d);
  const moveMonth = (n) => { const d = cur.getDate(); cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1); cur.setDate(Math.min(d, new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate())); };
  const off = (ok) => (ok ? '' : ' aria-disabled="true"');
  const render = (focus) => {
    const y = cur.getFullYear(), m = cur.getMonth(), today = day0(new Date()), base = y - (y % 12);
    let title, body, prevOk, nextOk, unit;
    if (view === 'days') {
      const first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
      let rows = '';
      for (let w = 0; w < 6; w++) {
        rows += '<tr>';
        for (let d = 0; d < 7; d++) {
          const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
          const cls = [day.getMonth() !== m ? 'out' : '', sameDay(day, today) ? 'today' : ''].join(' ').trim();
          rows += `<td><button type="button" data-d="${iso(day)}" class="${cls}" tabindex="${sameDay(day, cur) ? 0 : -1}" aria-selected="${sameDay(day, sel)}" aria-label="${fmtLong.format(day)}${dayOk(day) ? '' : ', not available'}"${off(dayOk(day))}>${day.getDate()}</button></td>`;
        }
        rows += '</tr>';
      }
      title = fmtMonLong.format(cur); unit = 'month';
      prevOk = monthOk(y, m - 1); nextOk = monthOk(y, m + 1);
      body = `<table role="grid" aria-label="${title}"><thead><tr>${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((x) => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    } else if (view === 'months') {
      title = String(y); unit = 'year';
      prevOk = yearOk(y - 1); nextOk = yearOk(y + 1);
      body = `<div class="cal-grid" role="grid" aria-label="Months of ${y}">${Array.from({ length: 12 }, (_, i) => {
        const cls = y === today.getFullYear() && i === today.getMonth() ? 'today' : '';
        return `<button type="button" data-mo="${i}" class="${cls}" tabindex="${i === m ? 0 : -1}" aria-selected="${y === sel.getFullYear() && i === sel.getMonth()}" aria-label="${fmtMonLong.format(new Date(y, i, 1))}"${off(monthOk(y, i))}>${fmtMonShort.format(new Date(y, i, 1))}</button>`;
      }).join('')}</div>`;
    } else {
      title = `${base} to ${base + 11}`; unit = '12 years';
      prevOk = yearOk(base - 1); nextOk = yearOk(base + 12);
      body = `<div class="cal-grid" role="grid" aria-label="Years ${title}">${Array.from({ length: 12 }, (_, i) => {
        const yy = base + i;
        return `<button type="button" data-yr="${yy}" class="${yy === today.getFullYear() ? 'today' : ''}" tabindex="${yy === y ? 0 : -1}" aria-selected="${yy === sel.getFullYear()}"${off(yearOk(yy))}>${yy}</button>`;
      }).join('')}</div>`;
    }
    const titleEl = view === 'years' ? `<span class="cal-title" aria-live="polite">${title}</span>`
      : `<button type="button" class="cal-title" data-view aria-live="polite" data-tip="${view === 'days' ? 'Choose the month' : 'Choose the year'}">${title}<svg class="icon"><use href="#i-chev-down"/></svg></button>`;
    root.innerHTML = `<div class="cal-head">
      <button type="button" class="btn quiet icon-btn" data-nav="-1" aria-label="Previous ${unit}" data-tip="Previous ${unit}"${off(prevOk)}><svg class="icon" style="transform:rotate(180deg)"><use href="#i-chev-right"/></svg></button>
      ${titleEl}
      <button type="button" class="btn quiet icon-btn" data-nav="1" aria-label="Next ${unit}" data-tip="Next ${unit}"${off(nextOk)}><svg class="icon"><use href="#i-chev-right"/></svg></button></div>
      <div class="cal-body">${body}</div>
      <div class="cal-foot"><button type="button" class="btn quiet" data-today aria-label="Today" data-tip="${dayOk(today) ? 'Today: ' + fmtLong.format(today) : 'Today: not available'}"${off(dayOk(today))}><svg class="icon"><use href="#i-today"/></svg></button></div>`;
    if (focus === 'title') $('.cal-title', root).focus?.();
    else if (focus) $('.cal-body [tabindex="0"]', root).focus();
  };
  const pick = (d) => { sel = cur = d; view = 'days'; render(true); onPick(sel); };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || t.getAttribute('aria-disabled') === 'true') return;
    if (t.dataset.nav) { moveMonth(+t.dataset.nav * (view === 'days' ? 1 : view === 'months' ? 12 : 144)); render(false); }
    else if ('view' in t.dataset) { view = view === 'days' ? 'months' : 'years'; render('title'); }
    else if (t.dataset.mo) { moveMonth(+t.dataset.mo - cur.getMonth()); cur = clamp(cur); view = 'days'; render(true); }
    else if (t.dataset.yr) { moveMonth((+t.dataset.yr - cur.getFullYear()) * 12); cur = clamp(cur); view = 'days'; render(true); }
    else if (t.dataset.d) pick(parseIso(t.dataset.d));
    else if ('today' in t.dataset) pick(day0(new Date()));
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && view !== 'days') { e.preventDefault(); e.stopPropagation(); view = 'days'; render(true); return; }
    if (!e.target.closest('.cal-body button')) return;
    if (view === 'days') {
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (step) cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + step);
      else if (e.key === 'PageUp' || e.key === 'PageDown') moveMonth(e.key === 'PageUp' ? -1 : 1);
      else if (e.key === 'Home') cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - ((cur.getDay() + 6) % 7));
      else if (e.key === 'End') cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 6 - ((cur.getDay() + 6) % 7));
      else return;
    } else {
      const k = view === 'months' ? 1 : 12;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 }[e.key];
      if (!step) return;
      moveMonth(step * k);
    }
    e.preventDefault(); render(true);
  });
  render(false);
  return { set: (d) => { sel = cur = d ? day0(d) : day0(new Date()); view = 'days'; render(false); }, focus: () => $('.cal-body [tabindex="0"]', root).focus() };
};
const errOf = (inp) => document.getElementById(inp.getAttribute('aria-describedby'));
/* Ayni.dateField(input, { popup, onChange }): a YYYY-MM-DD field whose popup holds a .cal; onChange(date) runs on a pick */
const dateField = (inp, { popup, onChange } = {}) => {
  const err = errOf(inp);
  const check = () => { const bad = inp.value !== '' && !parseIso(inp.value); inp.setAttribute('aria-invalid', bad); if (err) err.hidden = !bad; return !bad; };
  inp.addEventListener('blur', check);
  const cal = makeCalendar($('.cal', popup), (d) => { inp.value = iso(d); check(); popup.hidePopover(); onChange?.(d); });
  popup.addEventListener('toggle', (e) => {
    if (e.newState === 'open') { cal.set(parseIso(inp.value)); place(popup); cal.focus(); }
    else invoker?.focus();
  });
  return { check };
};
/* Ayni.dateTimeField(input, { popup, value, onChange }): one value, edited by typing (YYYY-MM-DD HH:MM) or in the
   popup (a .cal plus hour and minute fields in a .time-row), applied live; onChange(date) runs on every change */
const dateTimeField = (inp, { popup, value = new Date(), onChange } = {}) => {
  const err = errOf(inp), [hIn, mIn] = $$('.time-row .input', popup);
  let dt = value;
  const show = () => { inp.value = fmtDT(dt); hIn.value = pad(dt.getHours()); mIn.value = pad(dt.getMinutes()); inp.removeAttribute('aria-invalid'); if (err) err.hidden = true; };
  const cal = makeCalendar($('.cal', popup), (d) => { dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), dt.getHours(), dt.getMinutes()); show(); onChange?.(dt); });
  const set = (d) => { dt = d; show(); cal.set(dt); onChange?.(dt); };
  $$('[data-tstep]', popup).forEach((b) => b.addEventListener('click', () => {
    const [unit, n] = b.dataset.tstep.split(','), y = dt.getFullYear(), mo = dt.getMonth(), da = dt.getDate();
    set(unit === 'h' ? new Date(y, mo, da, dt.getHours() + +n, dt.getMinutes()) : new Date(y, mo, da, dt.getHours(), dt.getMinutes() + +n));
  }));
  [hIn, mIn].forEach((f) => f.addEventListener('change', () => {
    const h = Math.min(23, Math.max(0, Math.round(+hIn.value || 0))), mi = Math.min(59, Math.max(0, Math.round(+mIn.value || 0)));
    set(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), h, mi));
  }));
  inp.addEventListener('blur', () => {
    if (inp.value.trim() === '') return;
    const d = parseDT(inp.value);
    if (d) set(d); else { inp.setAttribute('aria-invalid', 'true'); if (err) err.hidden = false; }
  });
  popup.addEventListener('toggle', (e) => {
    if (e.newState === 'open') { const d = parseDT(inp.value); if (d) dt = d; show(); cal.set(dt); place(popup); cal.focus(); }
    else invoker?.focus();
  });
  show();
  return { set, get: () => dt };
};
/* Alt+Down or F4 in a date field opens its calendar, like the list picker */
const initDateKeys = (g) => {
  const inp = $('.input', g), btn = $('button:not(.err-mark)', g);
  inp.addEventListener('keydown', (ev) => {
    if (!((ev.altKey && ev.key === 'ArrowDown') || ev.key === 'F4')) return;
    ev.preventDefault();
    if (!inp.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
  });
};

/* ---------- Tree view (deferred: kept as it is until the tree is picked up again) ---------- */
/* Fires ayni:select with { item, path } when an item is opened */
const initTree = (tree) => {
  const visibleItems = () => $$('[role="treeitem"]', tree).filter((it) => !it.parentElement.closest('[role="treeitem"][aria-expanded="false"]'));
  const focusItem = (it) => { $$('[role="treeitem"]', tree).forEach((x) => (x.tabIndex = -1)); it.tabIndex = 0; it.focus(); };
  const selectItem = (it) => {
    if (it.getAttribute('aria-disabled') === 'true') return;
    $$('[role="treeitem"][aria-selected="true"]', tree).forEach((x) => x.setAttribute('aria-selected', 'false'));
    it.setAttribute('aria-selected', 'true');
    const path = []; for (let n = it; n; n = n.parentElement.closest('[role="treeitem"]')) path.unshift($(':scope > .ti', n).textContent.trim());
    fire(tree, 'ayni:select', { item: it, path });
  };
  $$('[role="treeitem"]', tree).forEach((it, i) => { it.tabIndex = i ? -1 : 0; it.setAttribute('aria-selected', 'false'); });
  tree.addEventListener('click', (e) => {
    const ti = e.target.closest('.ti'); if (!ti) return;
    const it = ti.parentElement;
    if (it.hasAttribute('aria-expanded') && (e.target.closest('.tw') || it.getAttribute('aria-selected') === 'true')) it.setAttribute('aria-expanded', it.getAttribute('aria-expanded') !== 'true');
    selectItem(it); focusItem(it);
  });
  tree.addEventListener('keydown', (e) => {
    const it = e.target.closest('[role="treeitem"]'); if (!it) return;
    const vis = visibleItems(), i = vis.indexOf(it), open = it.getAttribute('aria-expanded');
    const parent = it.parentElement.closest('[role="treeitem"]');
    switch (e.key) {
      case 'ArrowDown': if (vis[i + 1]) focusItem(vis[i + 1]); break;
      case 'ArrowUp': if (vis[i - 1]) focusItem(vis[i - 1]); break;
      case 'Home': focusItem(vis[0]); break;
      case 'End': focusItem(vis[vis.length - 1]); break;
      case 'ArrowRight': if (open === 'false') it.setAttribute('aria-expanded', 'true'); else if (open === 'true') focusItem($('[role="treeitem"]', it)); break;
      case 'ArrowLeft': if (open === 'true') it.setAttribute('aria-expanded', 'false'); else if (parent) focusItem(parent); break;
      case 'Enter': case ' ': selectItem(it); break;
      default: return;
    }
    e.preventDefault();
  });
};

/* ---------- Tooltips: data-tip on any element ---------- */
let tipTimer, tipEl = null;
const showTip = (el) => {
  tip.textContent = el.dataset.tip; tip.showPopover();
  const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
  let y = r.bottom + 6; if (y + t.height > innerHeight - 8) y = r.top - t.height - 6;
  tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 8)) + 'px';
  tip.style.top = y + 'px';
};
const hideTip = () => { clearTimeout(tipTimer); tipEl = null; if (tip.matches(':popover-open')) tip.hidePopover(); };

/* ---------- Help on touch: every element of the view with its icon, tooltip and a short explanation ---------- */
/* RULE: on touch there are no tooltips. A Help button in the title row opens a dialog that lists every element
   of the current view. Ayni.fillHelp(body, entries) fills it: entries are [group name, element] pairs, in order;
   each element with a visible data-tip is listed once per group. data-help on an element gives its explanation. */
const explain = (el) => {
  const b = el.matches('button, [role="button"]') ? el : $('button', el) || el, out = [];
  if (el.dataset.help) return el.dataset.help;
  if (el.matches('[role="tab"]')) return `Shows the ${el.textContent.trim()} page.`;
  if (el.matches('[data-close]')) return 'Closes this tab. The tab next to it takes its place.';
  if (b.getAttribute('aria-disabled') === 'true') out.push('Not available right now.');
  if (b.classList.contains('primary')) out.push('The default button: Enter also runs it.');
  if (b.classList.contains('danger')) out.push('Danger: it removes or changes something for good.');
  if (b.classList.contains('ok')) out.push('Approves or confirms.');
  if (b.classList.contains('warn')) out.push('Use it when something is wrong.');
  if (b.hasAttribute('aria-pressed')) out.push('Tap to turn it on or off.');
  if (b.dataset.openDialog) out.push('Opens a dialog.');
  else if (b.hasAttribute('popovertarget')) out.push(b.getAttribute('aria-haspopup') === 'menu' ? 'Opens a menu.' : 'Opens a popup.');
  if (b.dataset.alt) out.push(`Hold it to ${b.dataset.alt.charAt(0).toLowerCase() + b.dataset.alt.slice(1)}.`);
  return out.join(' ') || 'Runs this action at once.';
};
const helpIcon = (el) => {
  const b = el.matches('button') ? el : $('button', el) || el, ico = document.createElement('span');
  ico.setAttribute('aria-hidden', 'true');
  if (b.classList.contains('info-tip')) { ico.className = 'info-tip help-ico'; ico.textContent = 'i'; return ico; }
  ico.className = 'btn help-ico ' + [...b.classList].filter((c) => ['primary', 'danger', 'ok', 'warn'].includes(c)).join(' ');
  if (b.dataset.alt) ico.dataset.alt = '';
  if (b.hasAttribute('popovertarget') && !b.dataset.openDialog) ico.setAttribute('aria-haspopup', 'true');
  const svg = $('svg', el); if (svg) ico.append(svg.cloneNode(true));
  return ico;
};
const fillHelp = (body, entries) => {
  const groups = new Map();
  entries.forEach(([name, el]) => {
    const tipText = el.dataset.tip; if (!tipText || !el.getClientRects().length) return;
    if (!groups.has(name)) groups.set(name, new Map());
    const g = groups.get(name); if (!g.has(tipText)) g.set(tipText, el);
  });
  body.replaceChildren();
  groups.forEach((items, name) => {
    const h = document.createElement('h3'); h.className = 'help-group'; h.textContent = name;
    const ul = document.createElement('ul'); ul.className = 'help-list';
    items.forEach((el, tipText) => {
      const li = document.createElement('li'), t = document.createElement('b'), p = document.createElement('p');
      t.textContent = tipText; p.textContent = explain(el);
      li.append(helpIcon(el), t, p); ul.append(li);
    });
    body.append(h, ul);
  });
};

/* ---------- Notifications ---------- */
let lastUndo = null;
/* Ayni.toast(kind, text, { action: { label, icon, run }, persist }): kind is info, ok, warn or err */
const toast = (kind, text, { action, persist = kind === 'err' } = {}) => {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  t.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${{ info: 'info', ok: 'ok', warn: 'warn', err: 'error' }[kind]}"/></svg><p></p>`
    + (action ? '<button class="btn quiet act"><svg class="icon"><use href="#i-' + action.icon + '"/></svg></button>' : '')
    + '<button class="btn quiet icon-btn" aria-label="Dismiss" data-tip="Dismiss"><svg class="icon"><use href="#i-close"/></svg></button>';
  $('p', t).textContent = text;
  /* RULE: an Undo toast keeps the 6 s timeout, says the keyboard shortcut also undoes, and has a close button.
     The shortcut keeps working after the toast is gone, until another undoable action replaces it. */
  if (action?.icon === 'undo') {
    const hint = document.createElement('small'); hint.textContent = `${isMac ? '⌘Z' : 'Ctrl+Z'} also undoes`;
    $('p', t).append(hint); lastUndo = action.run;
  }
  const close = () => { clearTimeout(timer); t.remove(); if (!toasts.children.length && toasts.matches(':popover-open')) toasts.hidePopover(); };
  let timer; const arm = () => { if (!persist) timer = setTimeout(close, 6000); };
  if (action) { const b = $('.act', t); b.setAttribute('aria-label', action.label); b.dataset.tip = action.label; b.onclick = () => { if (lastUndo === action.run) lastUndo = null; action.run(); close(); }; }
  $('[aria-label="Dismiss"]', t).onclick = close;
  t.addEventListener('pointerenter', () => clearTimeout(timer)); t.addEventListener('pointerleave', arm);
  if (!toasts.matches(':popover-open')) toasts.showPopover();
  toasts.append(t); arm();
};

/* ---------- Second action: double-click, long tap (touch/pen), Shift+Enter ---------- */
/* A button with data-alt="what the second action does" fires ayni:press with { second, label } instead of acting on
   its own click: the first action has second false and label = data-tip, the second has second true. */
const initAlt = (b) => {
  const base = b.dataset.tip, alt = b.dataset.alt;
  /* The tooltip names every way to reach the second action on this device */
  b.setTip = () => { b.dataset.tip = `${base} · ${isTouch() ? 'Hold' : 'Double-click or Shift+Enter'}: ${alt}`; };
  b.setTip();
  b.setAttribute('aria-description', `Shift+Enter: ${alt}`);
  b.style.setProperty('--hold-ms', HOLD_MS + 'ms');
  const run = (second) => fire(b, 'ayni:press', { second, label: second ? alt : base });
  let timer, held = false;
  const cancel = () => { clearTimeout(timer); b.classList.remove('holding'); };
  b.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && !isTouch()) return;
    held = false; b.classList.add('holding');
    timer = setTimeout(() => { held = true; b.classList.remove('holding'); navigator.vibrate?.(15); run(true); }, HOLD_MS);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, cancel));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  /* With a mouse, a single click waits DBL_MS to see whether a second click follows; a double-click runs only the
     second action. Taps (touch) and Enter/Space (detail 0) act at once. */
  let clickTimer;
  b.addEventListener('click', (e) => {
    if (held) { held = false; return; }
    if (e.detail === 0 || isTouch()) { run(false); return; }
    clearTimeout(clickTimer);
    if (e.detail === 1) clickTimer = setTimeout(() => run(false), DBL_MS);
  });
  b.addEventListener('dblclick', () => { if (!isTouch()) { clearTimeout(clickTimer); run(true); } });
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); run(true); } });
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
    const q = fold(field.value.trim());
    all.forEach((o) => { o.hidden = !!q && !fold(o.dataset.value).includes(q); });
    empty.hidden = shown().length > 0;
    if (!isOpen()) open(); else place();
    setActive(q ? shown()[0] || null : null);
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
  ctl.innerHTML = `<button type="button" tabindex="-1" data-to="0" aria-label="Collapse ${first} pane" data-tip="Collapse ${first} pane">${tri(rows ? 'up' : 'left')}</button>`
    + `<button type="button" tabindex="-1" data-to="reset" aria-label="Reset sizes" data-tip="Reset sizes (double-click the bar)"><span class="dot"></span></button>`
    + `<button type="button" tabindex="-1" data-to="100" aria-label="Collapse ${last} pane" data-tip="Collapse ${last} pane">${tri(rows ? 'down' : 'right')}</button>`;
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
  const reset = () => { before = def; setSplit(def); tell('reset', null, 'Panes reset'); };
  /* Too short a bar for three targets: only the reset ring shows */
  new ResizeObserver(() => {
    const len = rows ? bar.clientWidth : bar.clientHeight, need = isTouch() ? 3 * 10 + 68 + 16 : 3 * 10 + 16;
    ctl.classList.toggle('short', len < need);
  }).observe(bar);
  ctl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.to === 'reset') reset();
    else { const pane = b.dataset.to === '0' ? first : last; setSplit(+b.dataset.to, true); tell('collapse', pane, `${pane} pane collapsed`.replace(/^./, (c) => c.toUpperCase())); }
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
    if (e.key === 'Enter') { e.preventDefault(); if (v === 0) setSplit(before); else setSplit(0, true); tell(v === 0 ? 'restore' : 'collapse', first, v === 0 ? 'Pane restored' : 'Pane collapsed'); return; }
    const n = (rows ? { ArrowUp: v - 5, ArrowDown: v + 5 } : { ArrowLeft: v - 5, ArrowRight: v + 5 })[e.key] ?? { Home: 15, End: 85 }[e.key];
    if (n !== undefined) { e.preventDefault(); setSplit(v === 0 && n < 15 ? 15 : v === 100 && n > 85 ? 85 : n); }
  });
  setSplit(def);
};

/* ---------- Field errors: Danger border + small red "!" inside the field; the message floats in a popup ----------
   RULE (Frasquito, 2026-10-22): any control whose aria-describedby points at a .error gets this. The .error element
   stays as the (hidden) message source, so code keeps setting aria-invalid, its text and its hidden flag as usual. */
const errMarks = new Map();
let errFor = null, errPinned = false;
const errSrc = (c) => (c.getAttribute('aria-describedby') || '').split(/\s+/).map((id) => document.getElementById(id)).find((e) => e?.classList.contains('error'));
const errGroup = (c) => c.matches('fieldset, [role="listbox"], [role="tree"], [role="radiogroup"]');
const errBad = (c) => c.getAttribute('aria-invalid') === 'true';
const hideErr = () => { errFor = null; errPinned = false; if (errPop.matches(':popover-open')) errPop.hidePopover(); };
const showErr = (c, pin = false) => {
  const src = errSrc(c), m = errMarks.get(c); if (!src || !errBad(c)) return;
  errFor = c; errPinned = pin; errPop.textContent = src.textContent.trim();
  if (!errPop.matches(':popover-open')) errPop.showPopover();
  const box = (errGroup(c) ? m : c.closest('.input-group, .err-wrap') || c).getBoundingClientRect(), p = errPop.getBoundingClientRect();
  let y = box.bottom + 4; if (y + p.height > innerHeight - 8) y = box.top - p.height - 4;
  const x = errGroup(c) ? box.left - 8 : box.right - p.width;
  errPop.style.left = Math.max(8, Math.min(x, innerWidth - p.width - 8)) + 'px'; errPop.style.top = Math.max(8, y) + 'px';
};
const errSync = (c) => {
  const bad = errBad(c); errMarks.get(c).hidden = !bad;
  const focused = c === document.activeElement || (errGroup(c) && c.contains(document.activeElement));
  if (bad && (focused || errFor === c)) showErr(c, errPinned && errFor === c); else if (errFor === c) hideErr();
};
const initError = (c) => {
  const src = errSrc(c); if (!src) return;
  src.dataset.errSrc = '';
  const m = document.createElement('button');
  Object.assign(m, { type: 'button', className: 'err-mark', tabIndex: -1, textContent: '!' }); m.setAttribute('aria-hidden', 'true');
  if (errGroup(c)) {
    const lab = c.matches('fieldset') ? $(':scope > legend', c) : document.getElementById(c.getAttribute('aria-labelledby'));
    if (lab || c.matches('fieldset')) (lab || c).append(m);
    /* A list with no visible label: the "!" sits inside its top-right corner, as inside a text field */
    else { const w = document.createElement('span'); w.className = 'err-wrap err-corner'; c.before(w); w.append(c, m); }
  } else if (c.parentElement.matches('.input-group, .spin')) c.after(m);
  else { const w = document.createElement('span'); w.className = 'err-wrap'; c.before(w); w.append(c, m); }
  errMarks.set(c, m);
  m.addEventListener('pointerdown', (e) => e.preventDefault());
  m.addEventListener('click', () => (errFor === c && errPinned ? hideErr() : showErr(c, true)));
  m.addEventListener('mouseenter', () => { if (errFor !== c) showErr(c); });
  m.addEventListener('mouseleave', () => { const f = c === document.activeElement || c.contains(document.activeElement); if (errFor === c && !errPinned && !f) hideErr(); });
  new MutationObserver(() => errSync(c)).observe(c, { attributes: true, attributeFilter: ['aria-invalid'] });
  new MutationObserver(() => { if (errFor === c) showErr(c, errPinned); }).observe(src, { childList: true, characterData: true, subtree: true });
  errSync(c);
};
/* Ayni.focusFirstError(root): on sending a form with errors, the focus goes to the first wrong field, so its message shows */
const focusFirstError = (root = document) => {
  const c = [...errMarks.keys()].find((k) => root.contains(k) && errBad(k)); if (!c) return false;
  (errGroup(c) ? $('input:not([disabled]), [tabindex="0"], [role="option"]', c) || c : c).focus(); return true;
};

/* ---------- Open menus and popups close when the page scrolls or the window resizes (item 56) ----------
   Scrolling inside the popup itself does not close it. Dialogs and bottom sheets are not affected. A popup that
   wants to handle it itself listens for ayni:dismiss and calls preventDefault(). */
let poppedAt = 0;
const dismissPopups = (src) => {
  if (performance.now() - poppedAt < 300) return;
  $$('.panel.menu:popover-open, .panel.popup:popover-open').forEach((p) => {
    if (p.classList.contains('sheet') || (src && p.contains(src))) return;
    if (p.dispatchEvent(new Event('ayni:dismiss', { bubbles: true, cancelable: true }))) p.hidePopover();
  });
};

/* ---------- Page-wide behaviour, set up once ---------- */
const setup = () => {
  helpPop = layer('ayni-help', '<div class="panel popup help" popover id="ayni-help" role="dialog" aria-label="Help"></div>');
  errPop = layer('ayni-err', '<div class="panel popup err-pop" popover="manual" id="ayni-err" aria-hidden="true"></div>');
  tip = layer('ayni-tip', '<div class="tooltip" popover="manual" role="tooltip" id="ayni-tip"></div>');
  toasts = layer('ayni-toasts', '<div class="toasts" popover="manual" role="region" aria-label="Notifications" id="ayni-toasts"></div>');
  coarse.addEventListener('change', applyTouch);

  /* Disabled buttons (aria-disabled) stay focusable but do nothing: clicks, Enter and Space are stopped here */
  addEventListener('click', (e) => { if (e.target.closest('button[aria-disabled="true"], button[aria-busy="true"]')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('keydown', onEnter);
  /* Read-only check boxes, radios, switches and sliders show their value but cannot change */
  addEventListener('click', (e) => { const l = e.target.closest('label'), i = e.target.matches('input') ? e.target : l?.control; if (isRO(i) && /checkbox|radio/.test(i.type)) e.preventDefault(); }, true);
  addEventListener('keydown', (e) => { if (isRO(e.target) && /radio|range/.test(e.target.type) && /^(Arrow|Page|Home|End)/.test(e.key)) e.preventDefault(); }, true);
  addEventListener('pointerdown', (e) => { if (isRO(e.target) && e.target.type === 'range') e.preventDefault(); }, true);

  /* Two-sided switch (.switch-pair): two radios around one track. A click on the track or Space flips to the other side;
     Left/Up pick the first side and Right/Down the second (no wrapping); clicking a label picks that side (native) */
  const pickSide = (pair, i) => {
    const r = $$(':scope > label > input', pair)[i ?? ($(':scope > label:first-of-type > input', pair).checked ? 1 : 0)];
    if (!r || r.disabled || isRO(r)) return;
    r.focus();
    if (r.checked) return;
    r.checked = true; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  };
  addEventListener('click', (e) => { const t = e.target.closest('.switch-pair > .track'); if (t) pickSide(t.parentElement); });
  addEventListener('keydown', (e) => {
    const pair = e.target.closest?.('.switch-pair'); if (!pair || !e.target.matches('input') || e.altKey || e.ctrlKey || e.metaKey) return;
    const side = { ' ': null, ArrowLeft: 0, ArrowUp: 0, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (side === undefined) return;
    e.preventDefault(); pickSide(pair, side ?? undefined);
  });

  /* Theme: a saved choice wins over the system setting */
  try { const saved = localStorage.getItem('ayni-theme'); if (saved) document.documentElement.dataset.theme = saved; } catch {}
  darkMq.addEventListener('change', showTheme);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-dialog]');
    if (b) $('#' + b.dataset.openDialog).showModal();
  });

  /* Info labels: one shared help popup, filled from the clicked "i" (data-help) */
  helpPop.addEventListener('toggle', (e) => {
    const tipBtn = invoker?.classList.contains('info-tip') ? invoker : null;
    if (e.newState === 'open' && tipBtn) { helpPop.textContent = tipBtn.dataset.help; tipBtn.setAttribute('aria-expanded', 'true'); place(helpPop); }
    else { $$('.info-tip[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false')); }
  });
  addEventListener('click', (e) => { const l = e.target.closest('label[for]'); if (l && !l.control) { const c = document.getElementById(l.htmlFor); if (c) focusCtl(c); } });

  document.addEventListener('click', (e) => { const b = e.target.closest('[popovertarget]'); if (b) { invoker = b; ctxPoint = null; ctxName = null; } }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'F10' || e.shiftKey) return;
    const bar = $$('[role="menubar"]').find((m) => m.getClientRects().length); if (!bar) return;
    e.preventDefault(); $('button', bar).focus();
  });
  ['click', 'mousedown'].forEach((t) => addEventListener(t, (e) => { if (performance.now() < swallowUntil && swallowIn?.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true));

  /* Tooltips: after half a second of hover, at once on keyboard focus; Esc hides them; none on touch */
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-tip]'); if (el === tipEl) return;
    hideTip(); if (e.pointerType === 'touch' || document.documentElement.classList.contains('touch')) return; // touch: the Help dialog replaces tooltips
    if (el) { tipEl = el; tipTimer = setTimeout(() => showTip(el), 500); }
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); hideTip(); if (el && el.matches(':focus-visible')) { tipEl = el; showTip(el); } });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', hideTip);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });

  /* Ctrl+Z (⌘Z) runs the last Undo offered by a notification, also after it has gone */
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'z' || e.shiftKey || e.altKey || !(isMac ? e.metaKey : e.ctrlKey) || !lastUndo) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return; // text fields keep their own undo
    e.preventDefault(); const run = lastUndo; lastUndo = null; run();
    $$('.toast', toasts).forEach((x) => { if ($('.act', x)?.dataset.tip === 'Undo') $('[aria-label="Dismiss"]', x).click(); });
  });

  /* Field errors */
  document.addEventListener('focusin', (e) => {
    const c = [...errMarks.keys()].find((k) => k === e.target || (errGroup(k) && k.contains(e.target)));
    if (c && errBad(c)) showErr(c); else if (errFor && !errPinned) hideErr();
  });
  document.addEventListener('focusout', () => setTimeout(() => {
    if (!errFor || errPinned) return;
    const a = document.activeElement; if (a !== errFor && !(errGroup(errFor) && errFor.contains(a))) hideErr();
  }));
  document.addEventListener('pointerdown', (e) => { if (errPinned && !e.target.closest('.err-mark, #ayni-err')) hideErr(); }, true);
  /* Page scroll or resize: a focused field's message follows the field; a hovered or clicked one closes */
  errPop.addEventListener('ayni:dismiss', (e) => {
    e.preventDefault(); const c = errFor, a = document.activeElement;
    if (c && !errPinned && (a === c || (errGroup(c) && c.contains(a)))) showErr(c); else hideErr();
  });

  document.addEventListener('toggle', (e) => { if (e.newState === 'open') poppedAt = performance.now(); }, true);
  addEventListener('scroll', (e) => dismissPopups(e.target instanceof Element ? e.target : null), true);
  let lastW = innerWidth;
  addEventListener('resize', () => {
    const typing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
    /* On touch, a height-only change while typing is the on-screen keyboard: keep the popup */
    if (innerWidth === lastW && typing && isTouch()) return;
    lastW = innerWidth; dismissPopups(null);
  });
};

/* ---------- Ayni.init(root): wire up every control inside root (the whole page on load) ---------- */
const init = (root = document) => {
  each(root, '[role="tablist"]', 'tabs', initTabs);
  each(root, 'dialog.panel', 'dialog', initDialog);
  /* Rule check: a danger button is never the default (no .primary, no autofocus) */
  each(root, '.btn.danger.primary, .btn.danger[autofocus]', 'danger', (b) => {
    console.warn('Ayni rule: a danger button cannot be the default button', b);
    b.classList.remove('primary'); b.removeAttribute('autofocus');
  });
  each(root, '.btn[popovertarget]:not([aria-haspopup])', 'haspopup', (b) => b.setAttribute('aria-haspopup', 'true'));
  /* Rule check: a button that opens a popup (menu, popover, dialog) has no second action */
  each(root, '.btn[data-alt][popovertarget], .btn[data-alt][data-open-dialog], .btn[data-alt][aria-haspopup]', 'altrule', (b) => {
    console.warn('Ayni rule: a button that opens a popup cannot have a second action', b);
    b.removeAttribute('data-alt');
  });
  each(root, '[data-toggle]', 'toggle', (b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
  each(root, '.lb', 'listbox', initListbox);
  each(root, '.ta-wrap', 'count', initCount);
  each(root, '.search-field', 'search', initSearch);
  each(root, '[data-reveal]', 'reveal', initReveal);
  each(root, '.info-tip', 'infotip', (b) => b.setAttribute('aria-expanded', 'false'));
  each(root, '.spin', 'spin', initSpin);
  each(root, '.panel.menu', 'menu', initMenu);
  each(root, '[role="menubar"]', 'menubar', initMenubar);
  each(root, '.date-field', 'datekeys', initDateKeys);
  each(root, '.panel.popup.controls', 'controls', initControlsPopup);
  each(root, '[role="tree"]', 'tree', initTree);
  each(root, '.btn[data-alt]', 'alt', initAlt);
  applyTouch();
  each(root, '.picker', 'picker', initPicker);
  each(root, '.split', 'split', initSplit);
  each(root, '[aria-describedby]', 'error', initError);
  each(root, '[data-theme-toggle]', 'theme', initThemeToggle);
};

window.Ayni = {
  version: '0.1.0', init, $, $$, status, toast, setBusy, place, contextMenu, fillHelp, focusFirstError,
  isTouch, setTouchPreview, isDark, setTheme, isMac, fold, makeTypeAhead,
  toolbar: (el) => { if (once('toolbar', el)) initToolbar(el); }, calendar: makeCalendar, dateField, dateTimeField,
  dates: { pad, iso, parseIso, formatLong: (d) => fmtLong.format(d), formatDateTime: fmtDT, parseDateTime: parseDT },
};
const start = () => { setup(); init(document); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
