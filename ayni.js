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

/* ---------- Icons ---------- */
/* An icon is <span class="icon" data-icon="name"></span>; Ayni draws it from the icon set in use. The built-in set
   (ayni-icons.js) has the icons the controls need, as symbols with id "i-<name>"; an app adds its own the same way.
   Ayni.icons.use(set) plugs in another set and maps Ayni's names to the set's names:
     { map: { close: 'x', ... },          Ayni name → the set's name; a name left out uses the symbol "i-<name>"
       sprite: '<svg>…</svg>' or a URL,   symbols added to the page (a URL is fetched, so not from file://)
       id: 'icon-{name}',                 symbol id in the sprite (default '{name}')
       stroke: true,                      the set draws with lines, like Ayni's own (default: filled shapes)
       render: (name) => html }           instead of a sprite: any markup, e.g. an icon font's <i class="…">
   Ayni.icons.use(null) goes back to the built-in set. Old markup, <svg class="icon"><use href="#i-save"/></svg>,
   still works but always shows the built-in icon. */
const ICONS = Object.freeze(['arrow-down', 'arrow-up', 'calendar', 'check', 'chev-down', 'chev-right', 'close', 'copy', 'cut',
  'apps', 'edit', 'error', 'eye', 'eye-off', 'file', 'filter', 'folder', 'help', 'info', 'maximise', 'minimise', 'minus', 'more', 'ok',
  'paste', 'plus', 'restore', 'search', 'today', 'trash', 'undo', 'warn']);
let iconSet = null;
const noIcon = new Set();
const iconSvg = (id, stroke) => `<svg${stroke ? ' class="st"' : ''}><use href="#${id}"/></svg>`;
const iconInner = (name) => {
  const ext = iconSet?.map[name];
  if (ext) return iconSet.render ? iconSet.render(ext, name) : iconSvg(iconSet.id.replace('{name}', ext), iconSet.stroke);
  if (document.getElementById('i-' + name)) return iconSvg('i-' + name, true);
  if (!noIcon.has(name)) { noIcon.add(name); console.warn(`Ayni icons: no icon named "${name}"`); }
  return '';
};
/* Ayni.icon(name) returns the markup of one icon; extra classes go after "icon" */
const icon = (name, cls = '') => `<span class="icon${cls && ' ' + cls}" data-icon="${name}" aria-hidden="true">${iconInner(name)}</span>`;
const drawIcon = (el) => { el.setAttribute('aria-hidden', 'true'); el.innerHTML = iconInner(el.dataset.icon); };
/* Name of an icon element, also for the old <svg class="icon"><use href="#i-name"/></svg> */
const iconName = (el) => el.dataset.icon || $('use', el)?.getAttribute('href').replace('#i-', '');
/* Ayni.setIcon(el, name) changes the icon of el, or of the first icon inside el (a button, a menu item...) */
const setIcon = (el, name) => {
  let ic = el.matches('.icon') ? el : $('.icon:not(.tw)', el);
  if (!ic) return;
  if (ic.tagName.toLowerCase() === 'svg') { const s = document.createElement('span'); s.className = ic.getAttribute('class'); ic.replaceWith(s); ic = s; }
  ic.dataset.icon = name; drawIcon(ic);
};
const drawIcons = (root, all) => [...(root.matches?.('.icon[data-icon]') ? [root] : []), ...$$('.icon[data-icon]', root)]
  .forEach((el) => { if (all || !el.firstElementChild) drawIcon(el); });
const useIcons = async (set) => {
  document.getElementById('ayni-iconset')?.remove();
  iconSet = null; noIcon.clear();
  if (set) {
    let sprite = set.sprite;
    if (sprite && !sprite.trimStart().startsWith('<')) {
      const r = await fetch(sprite); if (!r.ok) throw new Error(`Ayni icons: could not load ${sprite} (${r.status})`);
      sprite = await r.text();
    }
    if (sprite) document.body.insertAdjacentHTML('afterbegin', `<div id="ayni-iconset" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${sprite}</div>`);
    iconSet = { map: {}, id: '{name}', ...set };
    const missing = ICONS.filter((n) => !iconSet.map[n]);
    if (missing.length) console.warn(`Ayni icons: the set has no icon for ${missing.join(', ')}; Ayni's own is used`);
  }
  drawIcons(document, true);
};

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
/* Shared type-ahead (lists, the drop-down list and the tree): letters typed within 500 ms build one search ("me" reaches México),
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

/* Shared multi-selection helper (lists and the tree): Shift+click and Shift+arrows select a range from the
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
/* Optional count for a text area with a limit (opt-in per field): the count sits on the field's bottom border (.ta-wrap > textarea[maxlength] + .ta-count) */
const initCount = (w) => {
  const t = $('textarea', w), c = $('.ta-count', w); if (!t || !c) return;
  const count = () => { c.textContent = `${t.value.length} / ${t.maxLength}`; };
  t.addEventListener('input', count); count();
};
/* Optional auto-grow (opt-in per field, textarea[data-autogrow]): the field grows with its text, from its normal minimum
   height up to --autogrow-max, then scrolls. It has no resize grip, since the height follows the text. */
const initGrow = (t) => {
  const fit = () => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + t.offsetHeight - t.clientHeight}px`; };
  t.addEventListener('input', fit); fit();
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
  setIcon(b, show ? 'eye-off' : 'eye'); if (tipEl === b) showTip(b);
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
      $$('[role="menuitemradio"]', menu).forEach((x) => { x.setAttribute('aria-checked', x === it); $('.icon', x)?.remove(); });
      it.insertAdjacentHTML('afterbegin', icon('check'));
      fire(menu, 'ayni:choose', it);
    }
    if (it.getAttribute('role') === 'menuitemcheckbox') {
      const on = it.getAttribute('aria-checked') !== 'true'; it.setAttribute('aria-checked', on);
      const ic = $('.icon', it); if (on && !ic) it.insertAdjacentHTML('afterbegin', icon('check')); if (!on && ic) ic.remove();
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
let swallowUntil = 0, swallowIn = []; // after a long tap, ignore the click / mousedown its release may produce on the held element, or on the menu that opened under the finger
const holdRing = (x, y) => {
  const r = document.createElement('div'); r.className = 'hold-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
  r.style.setProperty('--hold-ms', HOLD_MS + 'ms'); document.body.append(r); return r;
};
/* Ayni.contextMenu(area, { menu, target, keyTarget, onDrag }): target(e) returns { name, back, at? } for the element under
   the event, or null; keyTarget(e) does the same for Shift+F10 and the Menu key (default: target). With onDrag(t, e),
   moving the finger once the ring is full drags instead of opening the menu (the tree uses it) */
const contextMenu = (root, { menu, target, keyTarget = target, onDrag }) => {
  let rightDown = false, timer, ring, fired = null, start;
  const stop = () => { clearTimeout(timer); ring?.remove(); ring = null; };
  root.addEventListener('pointerdown', (e) => {
    rightDown = e.button === 2;
    if (e.pointerType === 'mouse' && !isTouch()) return;
    const t = target(e); if (!t || e.button !== 0) return;
    fired = null; start = { x: e.clientX, y: e.clientY }; ring = holdRing(e.clientX, e.clientY);
    timer = setTimeout(() => { ring?.remove(); ring = null; fired = { ...t, ...start }; navigator.vibrate?.(15); }, HOLD_MS);
  });
  root.addEventListener('pointermove', (e) => {
    const far = Math.hypot(e.clientX - start?.x, e.clientY - start?.y) > 10;
    if (ring && far) stop();
    else if (fired && onDrag && far) { const f = fired; fired = null; onDrag(f, e); }
  });
  /* While the ring is full the page must not scroll, so that the finger can still drag */
  if (onDrag) root.addEventListener('touchmove', (e) => { if (fired) e.preventDefault(); }, { passive: false });
  root.addEventListener('pointercancel', stop);
  /* The menu opens on release, otherwise that release would close it as an outside click */
  root.addEventListener('pointerup', () => {
    stop(); if (!fired) return;
    const f = fired; fired = null; swallowUntil = performance.now() + 600; swallowIn = [root, menu];
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
  $$('button', bar).forEach((t, i) => (t.tabIndex = i ? -1 : 0));
  bar.addEventListener('keydown', (e) => {
    const tools = $$('button', bar).filter((t) => !t.hidden), i = tools.indexOf(document.activeElement);
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
      : `<button type="button" class="cal-title" data-view aria-live="polite" data-tip="${view === 'days' ? 'Choose the month' : 'Choose the year'}">${title}${icon('chev-down')}</button>`;
    root.innerHTML = `<div class="cal-head">
      <button type="button" class="btn quiet icon-btn" data-nav="-1" aria-label="Previous ${unit}" data-tip="Previous ${unit}"${off(prevOk)}>${icon('chev-right', 'flip')}</button>
      ${titleEl}
      <button type="button" class="btn quiet icon-btn" data-nav="1" aria-label="Next ${unit}" data-tip="Next ${unit}"${off(nextOk)}>${icon('chev-right')}</button></div>
      <div class="cal-body">${body}</div>
      <div class="cal-foot"><button type="button" class="btn quiet" data-today aria-label="Today" data-tip="${dayOk(today) ? 'Today: ' + fmtLong.format(today) : 'Today: not available'}"${off(dayOk(today))}>${icon('today')}</button></div>`;
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

/* ---------- Tree view ---------- */
/* RULE (Frasquito, 2026-10-25, points T1-T12 of the tree proposal):
   - A tree only browses unless the page switches editing on, one feature at a time: data-edit="move insert delete
     rename hide". data-lock on an item stops moving, deleting and renaming it; aria-readonly on the tree stops everything.
   - Optional root: one top item with data-root. It opens and closes, but is never moved, deleted or hidden.
   - Any item can hold children, except the ones marked data-leaf (a drop or insert on a leaf goes after it).
   - data-hidden items are not shown and the keyboard skips them. With data-show-hidden on the tree they show muted and
     in italics, and work as usual.
   - Selection like the lists: single by default (it follows the focus), aria-multiselectable for the check squares,
     Shift ranges and Ctrl+A. Type-ahead, Page Up/Down, * opens every folder at the same level. A folder opens and
     closes with its triangle, a double-click, Enter, or Right and Left; a double-click or Enter on a leaf fires ayni:open.
   - Moving: drag (a line between rows means before/after, an outlined row means inside; 0.7 s over a closed folder
     opens it; Esc cancels; dragging only moves). Ctrl+Shift+arrows (⌘ on Mac) move one step; Ctrl+X / C / V cut or
     copy and paste. On touch, hold until the ring is full: lift for the pop-up menu, or move to drag.
   - Insert (Insert key, menu, toolbar) puts a new item inside the focused folder or after the focused leaf and starts
     renaming it; Esc removes it. Delete has no confirmation: an Undo notification. F2 renames in place; an empty name,
     or with data-unique a name a sibling already has, shows the usual red "!".
   - data-lazy on an item loads its children the first time it opens: ayni:load with { item, done(items), fail(text) }.
   Every change fires a cancelable event first (ayni:move, ayni:insert, ayni:delete, ayni:rename, ayni:hide); calling
   preventDefault() stops it. Ayni.tree(el, { root, items }) builds a tree from data and returns its controller. */
const ask = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, cancelable: true }));
const TW = () => icon('chev-right', 'tw');
const trees = new WeakMap();
let treeClip = null, treeMenuOwner = null, treeMenus = 0; // Cut / Copy keep { tree, items, cut } here until Paste
const nameOf = (it) => ($(':scope > .ti > .tn', it) || $(':scope > .ti', it)).textContent.trim();
/* One tree item from data: { name, id, icon (false for none), leaf, hidden, lock, disabled, open, lazy, root, children } */
const treeItem = (d, icons = true) => {
  const name = d.icon ?? (icons ? (d.leaf ? 'file' : 'folder') : false);
  const li = document.createElement('li'), ic = name ? icon(name) : '';
  li.setAttribute('role', 'treeitem');
  li.innerHTML = `<div class="ti">${TW()}${ic}<span class="tn"></span></div>`;
  $('.tn', li).textContent = d.name;
  if (d.id != null) li.dataset.id = d.id;
  [['leaf', 'data-leaf'], ['hidden', 'data-hidden'], ['lock', 'data-lock'], ['lazy', 'data-lazy'], ['root', 'data-root']].forEach(([k, a]) => d[k] && li.setAttribute(a, ''));
  if (d.disabled) li.setAttribute('aria-disabled', 'true');
  if (d.children?.length) { const g = document.createElement('ul'); g.setAttribute('role', 'group'); g.append(...d.children.map((c) => treeItem(c, icons))); li.append(g); }
  if (d.children?.length || d.lazy) li.setAttribute('aria-expanded', d.open && !d.lazy ? 'true' : 'false');
  return li;
};
const treeData = (li, icons = true) => {
  const d = { name: nameOf(li) }, ic = $(':scope > .ti > .icon:not(.tw)', li), nm = ic ? iconName(ic) : false;
  if (li.dataset.id) d.id = li.dataset.id;
  if (nm !== (icons ? (li.hasAttribute('data-leaf') ? 'file' : 'folder') : false)) d.icon = nm; // only when it is not the usual one
  [['leaf', 'data-leaf'], ['hidden', 'data-hidden'], ['lock', 'data-lock'], ['lazy', 'data-lazy']].forEach(([k, a]) => { if (li.hasAttribute(a)) d[k] = true; });
  if (li.getAttribute('aria-disabled') === 'true') d.disabled = true;
  if (li.getAttribute('aria-expanded') === 'true') d.open = true;
  const kids = $$(':scope > [role="group"] > [role="treeitem"]', li); if (kids.length) d.children = kids.map((k) => treeData(k, icons));
  return d;
};
/* { root, items, icons }: icons false leaves out the usual folder and file icons */
const treeNodes = ({ root, items = [], icons = true }) => root
  ? [treeItem({ open: true, ...(typeof root === 'string' ? { name: root } : root), root: true, children: items }, icons)]
  : items.map((d) => treeItem(d, icons));
/* Markup trees: the triangle and the name span are added when missing */
const normaliseItem = (li) => {
  const ti = $(':scope > .ti', li);
  if (!$(':scope > .tw', ti)) ti.insertAdjacentHTML('afterbegin', TW());
  if (!$(':scope > .tn', ti)) {
    const tn = document.createElement('span'); tn.className = 'tn';
    [...ti.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('.icon'))).forEach((n) => tn.append(n));
    tn.textContent = tn.textContent.trim(); ti.append(tn);
  }
  const g = $(':scope > [role="group"]', li);
  if (g?.children.length || li.hasAttribute('data-lazy')) { if (!li.hasAttribute('aria-expanded')) li.setAttribute('aria-expanded', 'false'); }
  else { g?.remove(); li.removeAttribute('aria-expanded'); }
};

const initTree = (tree) => {
  const multi = () => tree.getAttribute('aria-multiselectable') === 'true';
  const can = (f) => !isRO(tree) && (tree.dataset.edit || '').split(/\s+/).includes(f);
  const all = () => $$('[role="treeitem"]', tree);
  const rowOf = (it) => $(':scope > .ti', it);
  const parentOf = (it) => { const p = it.parentElement.closest('[role="treeitem"], [role="tree"]'); return p?.matches('[role="treeitem"]') ? p : null; };
  const groupOf = (p, make) => {
    if (!p) return tree;
    let g = $(':scope > [role="group"]', p);
    if (!g && make) { g = document.createElement('ul'); g.setAttribute('role', 'group'); p.append(g); }
    return g;
  };
  const kids = (p) => { const g = groupOf(p); return g ? $$(':scope > [role="treeitem"]', g) : []; };
  const putIn = (p, it, ref) => {
    const g = groupOf(p, true); g.insertBefore(it, ref?.parentElement === g ? ref : null);
    if (p && !p.hasAttribute('aria-expanded')) p.setAttribute('aria-expanded', 'true');
  };
  /* A folder whose last child went away loses its triangle */
  const tidy = (p) => { const g = p && groupOf(p); if (g && !g.children.length) { g.remove(); if (!p.hasAttribute('data-lazy')) p.removeAttribute('aria-expanded'); } };
  const rootItem = () => $(':scope > [role="treeitem"][data-root]', tree);
  const isRoot = (it) => it.hasAttribute('data-root'), locked = (it) => it.hasAttribute('data-lock');
  const off = (it) => it.getAttribute('aria-disabled') === 'true';
  const shown = (it) => rowOf(it).getClientRects().length > 0;
  const nav = () => all().filter((it) => shown(it) && !off(it));
  const pathOf = (it) => { const p = []; for (let n = it; n; n = parentOf(n)) p.unshift(nameOf(n)); return p; };
  const topMost = (its) => its.filter((x) => !its.some((y) => y !== x && y.contains(x)));
  const isOpen = (it) => it.getAttribute('aria-expanded') === 'true';
  const label = () => tree.getAttribute('aria-label') || document.getElementById(tree.getAttribute('aria-labelledby'))?.textContent.trim() || 'Tree';

  /* ---- Focus and selection ---- */
  let current = null, anchor = null;
  const selected = () => all().filter((x) => x.getAttribute('aria-selected') === 'true');
  const report = () => { fire(tree, 'ayni:select', { item: current, items: selected(), path: current ? pathOf(current) : [] }); syncBars(); };
  const ensureStop = () => {
    const n = nav();
    if (!current?.isConnected || !n.includes(current)) current = n.find((x) => x.getAttribute('aria-selected') === 'true') || n[0] || null;
    all().forEach((x) => (x.tabIndex = x === current ? 0 : -1));
    if (!current && tree.dataset.edit) tree.tabIndex = 0; else tree.removeAttribute('tabindex');
  };
  const setCurrent = (it, focus = true) => {
    if (!it) return;
    current = it; ensureStop();
    if (focus) it.focus({ preventScroll: true });
    rowOf(it).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    syncBars();
  };
  const selectOnly = (it) => {
    if (isRO(tree)) return;
    const before = selected();
    all().forEach((x) => x.setAttribute('aria-selected', x === it));
    if (before.length !== 1 || before[0] !== it) report();
  };
  const ms = multiSelect({ box: tree, items: nav, set: (o, on) => !isRO(tree) && o.setAttribute('aria-selected', on), done: report });
  const range = (to) => { const n = nav(); ms.range(Math.max(0, n.indexOf(anchor ?? to)), n.indexOf(to)); };
  /* Moves the focus; a single-selection tree selects what has the focus, Shift extends a multiple selection */
  const go = (it, e) => {
    if (!it) return;
    setCurrent(it);
    if (!multi()) selectOnly(it); else if (e?.shiftKey) range(it); else anchor = it;
  };
  const flip = (it) => { if (isRO(tree)) return; it.setAttribute('aria-selected', it.getAttribute('aria-selected') !== 'true'); anchor = it; report(); };
  /* What an action works on: the selection when the item is part of it, otherwise the item alone */
  const targetsFor = (it) => (!it ? [] : multi() && it.getAttribute('aria-selected') === 'true' ? topMost(selected()) : [it]);

  /* ---- Opening, closing and loading ---- */
  const expand = (it) => {
    if (it.getAttribute('aria-expanded') !== 'false') return;
    it.setAttribute('aria-expanded', 'true');
    if (it.hasAttribute('data-lazy') && !kids(it).length) load(it);
  };
  const collapse = (it) => {
    if (!isOpen(it)) return;
    it.setAttribute('aria-expanded', 'false');
    if (current && current !== it && it.contains(current)) go(it); else ensureStop();
  };
  const toggle = (it) => (isOpen(it) ? collapse(it) : expand(it));
  const reveal = (it) => { for (let p = parentOf(it); p; p = parentOf(p)) if (p.getAttribute('aria-expanded') === 'false') expand(p); };
  /* Children loaded on demand: a spinner row until the page calls done(items) or fail(text) */
  const load = (it) => {
    const g = groupOf(it, true); let settled = false;
    g.innerHTML = '<li role="none" class="state-msg"><span class="busy" aria-hidden="true"></span>Loading…</li>';
    it.setAttribute('aria-busy', 'true');
    const done = (items = []) => {
      if (settled) return; settled = true;
      it.removeAttribute('aria-busy'); it.removeAttribute('data-lazy');
      $(':scope > .state-msg', g)?.remove(); g.prepend(...items.map((d) => treeItem(d, !!$('.ti > .icon:not(.tw)', tree)))); tidy(it); ensureStop(); syncBars();
    };
    const fail = (text = 'Could not load. Close and open it again to retry.') => {
      if (settled) return; settled = true;
      it.removeAttribute('aria-busy'); const m = $(':scope > .state-msg', g); if (m) m.textContent = text;
    };
    fire(tree, 'ayni:load', { item: it, id: it.dataset.id, path: pathOf(it), done, fail });
  };

  /* ---- Why an action cannot run now ('' when it can); the toolbar shows it in the tooltip ---- */
  const NEED = { new: 'insert', rename: 'rename', hide: 'hide', showhidden: 'hide', delete: 'delete', cut: 'move', up: 'move', down: 'move', copy: 'insert' };
  const reason = (act, its) => {
    if (isRO(tree)) return 'the tree is read-only';
    if (act === 'paste') {
      const c = treeClip;
      if (!c || c.tree !== tree || !c.items.some((x) => x.isConnected)) return 'nothing to paste';
      return can(c.cut ? 'move' : 'insert') ? '' : 'not allowed here';
    }
    if (!can(NEED[act])) return 'not allowed here';
    if (act === 'new' || act === 'showhidden') return '';
    if (!its.length) return 'pick an item first';
    if ((act === 'rename' || act === 'up' || act === 'down') && its.length > 1) return 'pick only one item';
    if (act !== 'rename' && its.some(isRoot)) return 'the top item stays in place';
    const l = its.find(locked); if (l && act !== 'hide' && act !== 'copy') return `${nameOf(l)} is locked`;
    if ((act === 'up' || act === 'down') && !stepRef(its[0], act)) return act === 'up' ? 'already at the top' : 'already at the bottom';
    return '';
  };
  /* Where a dragged or pasted item may go: not inside itself, not into a leaf or a disabled item, not beside the root */
  const canDrop = (its, p) => (p ? !its.some((x) => x.contains(p)) && !p.hasAttribute('data-leaf') && !off(p) : !rootItem());

  /* ---- Changes: each one asks the page first ---- */
  const moveTo = (its, p, ref) => {
    const sibs = kids(p).filter((x) => !its.includes(x)), index = ref ? sibs.indexOf(ref) : sibs.length;
    if (!ask(tree, 'ayni:move', { items: its, parent: p, index })) return false;
    const from = its.map(parentOf);
    its.forEach((it) => putIn(p, it, ref)); from.forEach(tidy);
    reveal(its[0]); setCurrent(its[0]);
    return true;
  };
  /* Ctrl+Shift+arrows: one step among the siblings, out of the folder, or into the folder above */
  const siblingsShown = (it) => kids(parentOf(it)).filter((x) => x === it || shown(x));
  const stepRef = (it, dir) => {
    const s = siblingsShown(it), i = s.indexOf(it);
    if (dir === 'up') return s[i - 1] ? { p: parentOf(it), ref: s[i - 1] } : null;
    if (dir === 'down') return s[i + 1] ? { p: parentOf(it), ref: s[i + 1].nextElementSibling } : null;
    const p = parentOf(it);
    if (dir === 'out') return p && !isRoot(p) ? { p: parentOf(p), ref: p.nextElementSibling } : null;
    const above = s[i - 1]; return above && canDrop([it], above) ? { p: above, ref: null } : null;
  };
  const step = (it, dir) => {
    if (reason('cut', [it])) return;
    const t = stepRef(it, dir); if (t) moveTo([it], t.p, t.ref);
  };
  const insertAt = (at) => {
    if (!at) return { p: rootItem(), ref: null };
    return at.hasAttribute('data-leaf') ? { p: parentOf(at), ref: at.nextElementSibling } : { p: at, ref: null };
  };
  const insertNew = (at) => {
    if (reason('new', [])) return;
    const { p, ref } = insertAt(at), icons = !!$('.ti > .icon:not(.tw)', tree);
    const it = treeItem({ name: tree.dataset.newName || 'New item', icon: icons ? tree.dataset.newIcon || 'folder' : false });
    if (p) expand(p);
    putIn(p, it, ref); if (p) p.setAttribute('aria-expanded', 'true');
    reveal(it); setCurrent(it); rename(it, true);
  };
  let editing = null;
  const rename = (it, isNew = false) => {
    if (editing || (!isNew && reason('rename', [it]))) return;
    const tn = $(':scope > .ti > .tn', it), old = tn.textContent;
    const inp = document.createElement('input'), err = document.createElement('span');
    Object.assign(inp, { className: 'input tree-edit', value: old, spellcheck: false, autocomplete: 'off' });
    err.className = 'error'; err.hidden = true; err.id = `ayni-tree-err-${++treeMenus}`;
    inp.setAttribute('aria-label', 'Name'); inp.setAttribute('aria-describedby', err.id);
    tn.hidden = true; tn.after(inp, err);
    initError(inp); setCurrent(it, false); inp.focus(); inp.select();
    const check = () => {
      const v = inp.value.trim();
      const msg = !v ? 'Type a name.'
        : tree.hasAttribute('data-unique') && kids(parentOf(it)).some((x) => x !== it && fold(nameOf(x)) === fold(v)) ? `"${v}" is already used here.` : '';
      err.textContent = msg; err.hidden = !msg; inp.setAttribute('aria-invalid', !!msg);
      return !msg;
    };
    /* Enter or leaving the field saves; a wrong name keeps the field open with its "!"; Esc cancels (a new item goes away) */
    const finish = (save, refocus = true) => {
      if (save && !check()) { if (refocus) inp.focus(); return; }
      const v = inp.value.trim();
      errMarks.delete(inp); if (errFor === inp) hideErr();
      inp.closest('.err-wrap').remove(); err.remove(); tn.hidden = false; editing = null;
      if (isNew) {
        tn.textContent = v || old;
        if (!save || !ask(tree, 'ayni:insert', { items: [it], parent: parentOf(it), index: kids(parentOf(it)).indexOf(it), name: v })) {
          const next = neighbour([it]), p = parentOf(it); it.remove(); tidy(p); current = null; if (next) go(next); else ensureStop();
          if (!next && refocus) tree.focus();
          return;
        }
      } else if (save && v !== old && ask(tree, 'ayni:rename', { item: it, from: old, to: v })) tn.textContent = v;
      if (refocus) setCurrent(it);
      syncBars();
    };
    editing = { it, finish };
    inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid') === 'true') check(); });
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (editing?.it === it && document.activeElement !== inp) finish(true, false); }));
    ['click', 'dblclick', 'pointerdown'].forEach((t) => inp.addEventListener(t, (e) => e.stopPropagation()));
  };
  /* After a delete or hide the focus goes to the next sibling, else the previous one, else the parent */
  const neighbour = (its) => {
    const gone = (x) => its.some((y) => y.contains(x)), first = its[0], s = kids(parentOf(first)), i = s.indexOf(first);
    const ok = (x) => !gone(x) && shown(x) && !off(x);
    return s.slice(i + 1).find(ok) || s.slice(0, i).reverse().find(ok) || parentOf(first) || nav().find(ok) || null;
  };
  const del = (its) => {
    its = topMost(its); if (reason('delete', its) || !ask(tree, 'ayni:delete', { items: its })) return;
    const next = neighbour(its), spots = its.map((it) => ({ it, p: parentOf(it), next: it.nextElementSibling }));
    its.forEach((it) => it.remove()); spots.forEach((s) => tidy(s.p));
    current = null; if (next) go(next); else { ensureStop(); tree.focus(); }
    if (multi()) report();
    const what = its.length === 1 ? nameOf(its[0]) : `${its.length} items`;
    toast('ok', `Deleted ${what}.`, { action: { label: 'Undo', icon: 'undo', run: () => restore(spots) } });
  };
  const restore = (spots) => {
    const its = spots.map((s) => s.it);
    if (!ask(tree, 'ayni:insert', { items: its, undo: true })) return;
    [...spots].reverse().forEach(({ it, p, next }) => { if (!p || tree.contains(p)) putIn(p, it, next); });
    reveal(its[0]); go(its[0]);
  };
  const hide = (its, on) => {
    its = topMost(its); if (reason('hide', its) || !ask(tree, 'ayni:hide', { items: its, hidden: on })) return;
    const next = on && !tree.hasAttribute('data-show-hidden') ? neighbour(its) : null;
    its.forEach((it) => it.toggleAttribute('data-hidden', on));
    if (next) go(next); else ensureStop();
    syncBars();
  };
  const showHidden = (on) => { tree.toggleAttribute('data-show-hidden', on); fire(tree, 'ayni:showhidden', { on }); ensureStop(); syncBars(); };
  const clip = (its, cut) => {
    its = topMost(its); if (reason(cut ? 'cut' : 'copy', its)) return;
    $$('.cut').forEach((x) => x.classList.remove('cut'));
    treeClip = { tree, items: its, cut };
    if (cut) its.forEach((x) => x.classList.add('cut'));
    syncBars();
  };
  const unclip = () => { $$('.cut').forEach((x) => x.classList.remove('cut')); treeClip = null; syncBars(); };
  const paste = (at) => {
    if (reason('paste', [])) return;
    const its = treeClip.items.filter((x) => x.isConnected);
    let { p, ref } = insertAt(at);
    if (!canDrop(its, p)) return;
    while (ref && its.includes(ref)) ref = ref.nextElementSibling;
    if (treeClip.cut) { if (moveTo(its, p, ref)) unclip(); return; }
    const copies = its.map((x) => {
      const c = x.cloneNode(true);
      [c, ...$$('[role="treeitem"]', c)].forEach((y) => { y.removeAttribute('data-id'); y.removeAttribute('data-root'); y.setAttribute('aria-selected', 'false'); y.tabIndex = -1; y.classList.remove('cut', 'dragged'); });
      return c;
    });
    const sibs = kids(p), index = ref ? sibs.indexOf(ref) : sibs.length;
    if (!ask(tree, 'ayni:insert', { items: copies, parent: p, index, copy: true, from: its })) return;
    copies.forEach((c) => putIn(p, c, ref)); reveal(copies[0]); go(copies[0]);
  };
  const run = (act, at) => {
    const its = targetsFor(at);
    if (reason(act, its)) return;
    ({
      new: () => insertNew(at), rename: () => rename(its[0]), delete: () => del(its), cut: () => clip(its, true), copy: () => clip(its, false),
      paste: () => paste(at), up: () => step(at, 'up'), down: () => step(at, 'down'),
      hide: () => hide(its, !its.every((x) => x.hasAttribute('data-hidden'))), showhidden: () => showHidden(!tree.hasAttribute('data-show-hidden')),
    })[act]?.();
  };

  /* ---- Drag and drop (mouse and pen at once; touch after a long tap) ---- */
  let drag = null, justDropped = false;
  const dropAt = (x, y) => {
    const ti = document.elementFromPoint(x, y)?.closest('.ti'), it = ti?.parentElement;
    if (!it || !tree.contains(it) || drag.its.some((d) => d.contains(it))) return null;
    const r = ti.getBoundingClientRect(), f = (y - r.top) / r.height, leaf = it.hasAttribute('data-leaf') || off(it);
    const zone = isRoot(it) ? 'in' : leaf ? (f < 0.5 ? 'before' : 'after') : f < 0.25 ? 'before' : f > 0.75 ? 'after' : 'in';
    if (zone === 'in') return { p: it, ref: null, row: it, zone };
    if (zone === 'before') return { p: parentOf(it), ref: it, row: it, zone };
    const inner = isOpen(it) && kids(it).find((k) => !drag.its.includes(k));
    if (inner) return { p: it, ref: inner, row: it, zone, indent: rowOf(inner).getBoundingClientRect().left };
    let ref = it.nextElementSibling; while (ref && drag.its.includes(ref)) ref = ref.nextElementSibling;
    return { p: parentOf(it), ref, row: it, zone };
  };
  const mark = (t) => {
    $$('.drop-in', tree).forEach((x) => x.classList.remove('drop-in')); drag.line.hidden = true;
    if (!t) return;
    if (t.zone === 'in') { rowOf(t.row).classList.add('drop-in'); return; }
    const r = rowOf(t.row).getBoundingClientRect(), tr = tree.getBoundingClientRect(), left = t.indent ?? r.left;
    const y = Math.max(tr.top + 1, Math.min(tr.bottom - 1, t.zone === 'before' ? r.top : r.bottom));
    Object.assign(drag.line.style, { left: left + 'px', top: y - 1 + 'px', width: Math.max(24, tr.right - left - 6) + 'px' });
    drag.line.hidden = false;
  };
  const dragUpdate = () => {
    let t = dropAt(drag.x, drag.y); if (t && !canDrop(drag.its, t.p)) t = null;
    drag.target = t; mark(t);
    const wait = t?.zone === 'in' && t.row.getAttribute('aria-expanded') === 'false' ? t.row : null;
    if (wait !== drag.wait) { clearTimeout(drag.timer); drag.wait = wait; if (wait) drag.timer = setTimeout(() => { expand(wait); drag && dragUpdate(); }, 700); }
  };
  const dragMove = (e) => {
    drag.x = e.clientX; drag.y = e.clientY;
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    dragUpdate();
  };
  /* Near the top or bottom edge the tree scrolls by itself */
  const autoScroll = () => {
    if (!drag) return;
    const r = tree.getBoundingClientRect(), dy = drag.y < r.top + 24 ? -8 : drag.y > r.bottom - 24 ? 8 : 0;
    if (dy && drag.x > r.left && drag.x < r.right) { const before = tree.scrollTop; tree.scrollTop += dy; if (tree.scrollTop !== before) dragUpdate(); }
    drag.raf = requestAnimationFrame(autoScroll);
  };
  const dragEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endDrag(); } };
  const endDrag = () => {
    if (!drag) return;
    clearTimeout(drag.timer); cancelAnimationFrame(drag.raf);
    drag.ghost.remove(); drag.line.remove(); $$('.drop-in', tree).forEach((x) => x.classList.remove('drop-in'));
    drag.its.forEach((x) => x.classList.remove('dragged')); tree.classList.remove('dragging');
    removeEventListener('pointermove', dragMove); removeEventListener('pointerup', dragDrop); removeEventListener('pointercancel', endDrag);
    removeEventListener('keydown', dragEsc, true);
    drag = null; justDropped = true; setTimeout(() => { justDropped = false; });
  };
  const dragDrop = () => { const d = drag; endDrag(); if (d.target) moveTo(d.its, d.target.p, d.target.ref); };
  const startDrag = (it, e) => {
    if (editing || drag || off(it)) return;
    const its = multi() && it.getAttribute('aria-selected') === 'true' ? topMost(selected()) : [it];
    if (reason('cut', its)) return;
    const ghost = document.createElement('div'), line = document.createElement('div');
    ghost.className = 'tree-ghost'; ghost.textContent = its.length > 1 ? `${its.length} items` : nameOf(its[0]);
    line.className = 'tree-drop'; line.hidden = true;
    document.body.append(ghost, line);
    its.forEach((x) => x.classList.add('dragged')); tree.classList.add('dragging');
    drag = { its, ghost, line, target: null, wait: null, timer: 0, x: e.clientX, y: e.clientY };
    addEventListener('pointermove', dragMove); addEventListener('pointerup', dragDrop); addEventListener('pointercancel', endDrag);
    addEventListener('keydown', dragEsc, true);
    dragMove(e); drag.raf = requestAnimationFrame(autoScroll);
  };
  tree.addEventListener('pointerdown', (e) => {
    const ti = e.target.closest('.ti');
    if (!ti || e.button !== 0 || e.target.closest('.tw') || !(e.pointerType === 'pen' || (e.pointerType === 'mouse' && !isTouch()))) return;
    const it = ti.parentElement, sx = e.clientX, sy = e.clientY;
    const watch = (ev) => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) { stop(); startDrag(it, ev); } };
    const stop = () => { removeEventListener('pointermove', watch); removeEventListener('pointerup', stop); };
    addEventListener('pointermove', watch); addEventListener('pointerup', stop);
  });
  tree.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

  /* ---- Pointer and keyboard ---- */
  tree.addEventListener('click', (e) => {
    const ti = e.target.closest('.ti'); if (justDropped || !ti) return;
    const it = ti.parentElement; if (off(it)) return;
    const tw = $(':scope > .tw', ti), folder = it.hasAttribute('aria-expanded');
    /* The triangle opens and closes; on touch the area around it counts too */
    if (folder && (e.target.closest('.tw') || (isTouch() && e.clientX <= tw.getBoundingClientRect().right + 14))) { toggle(it); setCurrent(it); return; }
    if (!multi()) go(it);
    else { if (e.shiftKey) range(it); else flip(it); setCurrent(it); }
  });
  tree.addEventListener('dblclick', (e) => {
    const ti = e.target.closest('.ti'); if (!ti || e.target.closest('.tw')) return;
    const it = ti.parentElement; if (off(it)) return;
    if (it.hasAttribute('aria-expanded')) toggle(it); else fire(tree, 'ayni:open', { item: it, path: pathOf(it) });
  });
  const ta = makeTypeAhead(nameOf);
  tree.addEventListener('keydown', (e) => {
    if (e.target.closest('.tree-edit') || drag) return;
    const it = e.target.closest('[role="treeitem"]'), k = e.key, mod = isMac ? e.metaKey : e.ctrlKey;
    if (!it) { // an empty editable tree has the focus itself
      if (k === 'Insert') { e.preventDefault(); insertNew(null); } else if (mod && k.toLowerCase() === 'v') { e.preventDefault(); paste(null); }
      return;
    }
    if (mod && e.shiftKey && !e.altKey && k.startsWith('Arrow')) { e.preventDefault(); step(it, { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'out', ArrowRight: 'in' }[k]); return; }
    if (mod && !e.shiftKey && !e.altKey) {
      const c = k.toLowerCase(), act = { x: () => clip(targetsFor(it), true), c: () => clip(targetsFor(it), false), v: () => paste(it), a: () => multi() && ms.all() }[c];
      if (act) { e.preventDefault(); act(); }
      return;
    }
    const n = nav(), i = n.indexOf(it);
    const page = (dir) => { const rows = Math.max(1, Math.floor(tree.clientHeight / rowOf(it).offsetHeight) - 1); return n[Math.max(0, Math.min(n.length - 1, i + dir * rows))]; };
    switch (k) {
      case 'ArrowDown': go(n[i + 1], e); break;
      case 'ArrowUp': go(n[i - 1], e); break;
      case 'Home': go(n[0], e); break;
      case 'End': go(n[n.length - 1], e); break;
      case 'PageDown': go(page(1), e); break;
      case 'PageUp': go(page(-1), e); break;
      case 'ArrowRight': if (it.getAttribute('aria-expanded') === 'false') expand(it); else if (isOpen(it)) go(kids(it).find((x) => shown(x) && !off(x))); break;
      case 'ArrowLeft': if (isOpen(it)) collapse(it); else if (parentOf(it)) go(parentOf(it)); break;
      case 'Enter': if (it.hasAttribute('aria-expanded')) toggle(it); else fire(tree, 'ayni:open', { item: it, path: pathOf(it) }); break;
      case ' ': if (ta.busy()) go(ta.find(' ', n, it)); else if (multi()) flip(it); else go(it); break;
      case '*': kids(parentOf(it)).forEach((x) => !off(x) && expand(x)); break;
      case 'F2': run('rename', it); break;
      case 'Delete': run('delete', it); break;
      case 'Insert': run('new', it); break;
      case 'Escape': if (treeClip?.tree === tree && treeClip.cut) unclip(); else return; break;
      default:
        if (plainKey(e)) { const hit = ta.find(k, n, it); if (hit) { e.preventDefault(); go(hit); } }
        return;
    }
    e.preventDefault();
  });
  tree.addEventListener('focusin', (e) => { const it = e.target.closest('[role="treeitem"]'); if (it && it !== current && e.target === it) setCurrent(it, false); });

  /* ---- Pop-up menu: the page's (data-menu="id") or, on an editable tree, one built here ---- */
  const own = !tree.dataset.menu && !!tree.dataset.edit;
  const menu = own ? document.createElement('div') : tree.dataset.menu && document.getElementById(tree.dataset.menu);
  let pending = null, menuFor = null;
  const fillMenu = () => {
    const allowed = (act) => (act === 'paste' ? can('move') || can('insert') : can(NEED[act]));
    const key = isMac ? '⌘' : 'Ctrl+', row = (act, ic, text, kbd) => (!allowed(act) ? ''
      : `<button role="menuitem" data-tree-act="${act}" data-act="${text}">${icon(ic)}${text}${kbd ? `<kbd>${kbd}</kbd>` : ''}</button>`);
    const its = targetsFor(menuFor), shownNow = its.length && its.every((x) => x.hasAttribute('data-hidden'));
    const groups = [
      [row('new', 'plus', 'New', 'Ins'), row('rename', 'edit', 'Rename', 'F2'), row('hide', shownNow ? 'eye' : 'eye-off', shownNow ? 'Show' : 'Hide')],
      [row('cut', 'cut', 'Cut', key + 'X'), row('copy', 'copy', 'Copy', key + 'C'), row('paste', 'paste', 'Paste', key + 'V')],
      [row('up', 'arrow-up', 'Move up', key + '⇧↑'), row('down', 'arrow-down', 'Move down', key + '⇧↓')],
      [can('hide') ? `<button role="menuitemcheckbox" aria-checked="${tree.hasAttribute('data-show-hidden')}" data-tree-act="showhidden" data-act="Show hidden items">${tree.hasAttribute('data-show-hidden') ? icon('check') : ''}Show hidden items</button>` : ''],
      [row('delete', 'trash', 'Delete', 'Del')],
    ].map((g) => g.join('')).filter(Boolean);
    menu.innerHTML = groups.join('<div role="separator"></div>');
  };
  if (menu) {
    if (own) {
      Object.assign(menu, { className: 'panel menu', id: `ayni-tree-menu-${++treeMenus}` });
      menu.setAttribute('popover', ''); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', label() + ' actions');
      document.body.append(menu); if (once('menu', menu)) initMenu(menu);
    }
    const target = (e) => {
      if (editing || drag) return null;
      const ti = e.target.closest('.ti'), it = ti?.parentElement;
      treeMenuOwner = tree;
      if (it) { if (off(it)) return null; pending = it; return { name: nameOf(it), back: it, at: ti }; }
      if (!tree.dataset.edit) return null;
      pending = null; return { name: label(), back: current || tree };
    };
    const keyTarget = (e) => {
      const it = e.target.closest('[role="treeitem"]');
      treeMenuOwner = tree;
      if (it) { pending = it; return { name: nameOf(it), back: it, at: rowOf(it) }; }
      if (e.target === tree && tree.dataset.edit) { pending = null; return { name: label(), back: tree }; }
      return null;
    };
    contextMenu(tree, { menu, target, keyTarget, onDrag: (f, e) => f.back.matches?.('[role="treeitem"]') && startDrag(f.back, e) });
    menu.addEventListener('beforetoggle', (e) => {
      if (e.newState !== 'open' || treeMenuOwner !== tree) return;
      menuFor = pending;
      /* The menu acts on the item it was opened on: it joins the selection, or becomes it */
      if (menuFor && menuFor.getAttribute('aria-selected') !== 'true') { if (multi() && !isRO(tree)) { all().forEach((x) => x.setAttribute('aria-selected', x === menuFor)); anchor = menuFor; report(); } else selectOnly(menuFor); }
      if (menuFor) setCurrent(menuFor, false);
      if (own) fillMenu();
      $$('[data-tree-act]', menu).forEach((b) => { if (reason(b.dataset.treeAct, targetsFor(menuFor))) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tree-act]'); if (!b || treeMenuOwner !== tree) return;
      /* After the menu has closed and given the focus back, so that a rename keeps its field focused */
      const act = b.dataset.treeAct, at = menuFor;
      menu.addEventListener('toggle', () => run(act, at), { once: true });
    });
  }

  /* ---- Toolbar: [role="toolbar"][data-tree="tree id"] with buttons data-tree-act="new | rename | hide | delete | ..." ----
     Buttons that cannot act now are disabled, and their tooltip says why */
  const bars = tree.id ? $$(`[role="toolbar"][data-tree="${tree.id}"]`) : [];
  function syncBars() {
    bars.forEach((bar) => $$('[data-tree-act]', bar).forEach((b) => {
      const act = b.dataset.treeAct, its = targetsFor(current), r = reason(act, its);
      b.dataset.baseTip ??= b.dataset.tip || b.getAttribute('aria-label');
      let base = b.dataset.baseTip;
      if (act === 'hide') {
        const show = its.length > 0 && its.every((x) => x.hasAttribute('data-hidden'));
        base = show ? 'Show' : 'Hide'; b.setAttribute('aria-label', base); setIcon(b, show ? 'eye' : 'eye-off');
      }
      if (r) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      b.dataset.tip = r ? `${base}: ${r}` : base;
      if (tipEl === b) showTip(b);
    }));
  }
  bars.forEach((bar) => {
    if (once('toolbar', bar)) initToolbar(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tree-act]'); if (!b) return;
      run(b.dataset.treeAct, current);
      if (!editing && current?.isConnected && !document.activeElement?.closest('.toasts')) current.focus();
    });
  });
  new MutationObserver(() => syncBars()).observe(tree, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected', 'data-hidden', 'class', 'data-lock'] });

  /* ---- Controller: Ayni.tree(el) returns it; its calls change the tree without asking the page ---- */
  const refresh = () => { all().forEach(normaliseItem); all().forEach((x) => x.hasAttribute('aria-selected') || x.setAttribute('aria-selected', 'false')); current = null; ensureStop(); syncBars(); };
  trees.set(tree, {
    element: tree, refresh,
    build: (opts) => { if (editing) editing.finish(false, false); tree.replaceChildren(...treeNodes(opts)); refresh(); },
    data: () => {
      const icons = !!$('.ti > .icon:not(.tw)', tree), r = rootItem(), out = (d) => ({ ...(icons ? {} : { icons: false }), ...d });
      if (!r) return out({ root: null, items: kids(null).map((k) => treeData(k, icons)) });
      const { children = [], ...root } = treeData(r, icons); return out({ root, items: children });
    },
    add: (parent, d, index) => { const it = treeItem(d, !!$('.ti > .icon:not(.tw)', tree) || !all().length); putIn(parent || rootItem(), it, kids(parent || rootItem())[index] || null); normaliseItem(it); ensureStop(); return it; },
    remove: (it) => { const p = parentOf(it); it.remove(); tidy(p); ensureStop(); },
    rename: (it, name) => { $(':scope > .ti > .tn', it).textContent = name; },
    move: (it, parent, index) => { const p = parentOf(it), ref = kids(parent).filter((x) => x !== it)[index] || null; putIn(parent, it, ref); tidy(p); ensureStop(); },
    hide: (it, on = true) => { it.toggleAttribute('data-hidden', on); ensureStop(); },
    showHidden, expand, collapse, reveal,
    select: (it) => { if (multi()) { it.setAttribute('aria-selected', 'true'); report(); } else selectOnly(it); setCurrent(it, false); },
    selected, path: pathOf, current: () => current,
  });
  refresh();
};
/* Ayni.tree(el, { root, items }): builds the tree from data (or wires a markup tree) and returns its controller */
const tree = (el, opts) => {
  if (opts && !wired.get(el)?.has('tree')) el.replaceChildren(...treeNodes(opts));
  if (once('tree', el)) initTree(el); else if (opts) trees.get(el).build(opts);
  return trees.get(el);
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
  const ic = $('.icon:not(.tw)', el); if (ic) ico.append(ic.cloneNode(true));
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
  t.innerHTML = `${icon({ info: 'info', ok: 'ok', warn: 'warn', err: 'error' }[kind])}<p></p>`
    + (action ? `<button class="btn quiet act">${icon(action.icon)}</button>` : '')
    + `<button class="btn quiet icon-btn" aria-label="Dismiss" data-tip="Dismiss">${icon('close')}</button>`;
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
  const m = errMarks.get(c); if (!m) return; // the field has gone (a tree item's name editor)
  const bad = errBad(c); m.hidden = !bad;
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
  ['click', 'mousedown'].forEach((t) => addEventListener(t, (e) => { if (performance.now() < swallowUntil && swallowIn.some((el) => el.contains(e.target))) { e.stopPropagation(); e.preventDefault(); } }, true));

  /* Tooltips: after half a second of hover, at once on keyboard focus; Esc hides them; none on touch */
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-tip]'); if (el === tipEl) return;
    hideTip(); if (e.pointerType === 'touch' || document.documentElement.classList.contains('touch')) return; // touch: the Help dialog replaces tooltips
    if (el) { tipEl = el; tipTimer = setTimeout(() => showTip(el), 500); }
  });
  /* Shown a moment later: the focus may come back while a popup is still closing, when no other popup can open */
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('[data-tip]'); hideTip();
    if (el && el.matches(':focus-visible')) { tipEl = el; setTimeout(() => { if (tipEl === el && document.activeElement === el) showTip(el); }); }
  });
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
    edgeMenu = layer('ayni-edge', `<div class="panel menu" popover id="ayni-edge" aria-label="Taskbar position">${EDGES.map((e) =>
      `<button role="menuitemradio" aria-checked="false" data-edge="${e}">Taskbar at the ${e}</button>`).join('')}</div>`);
    initMenu(edgeMenu); once('menu', edgeMenu);
    edgeMenu.addEventListener('ayni:choose', (e) => edgeDesk && setEdge(edgeDesk, e.detail.dataset.edge));
  }
  let saved = null; try { saved = localStorage.getItem('ayni-taskbar-edge'); } catch {}
  setEdge(desk, [saved, desk.dataset.edge].find((x) => EDGES.includes(x)) || 'bottom', false);
  const t = () => { edgeDesk = desk; return { name: 'Taskbar', back: bar }; };
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
  winState(w, 'select');
};
const frontWin = (desk) => winsOf(desk).filter((x) => !x.classList.contains('min')).sort((a, b) => b.style.zIndex - a.style.zIndex)[0] || null;
const minimiseWin = (w) => {
  const desk = w.closest('.desktop'); w.classList.add('min'); chipOf.get(w)?.classList.add('min');
  winState(w, 'minimise'); selectWin(desk, frontWin(desk));
};
const maximiseWin = (w, on = !w.classList.contains('max')) => {
  w.classList.toggle('max', on);
  const b = $('[data-win="max"]', chipOf.get(w)), label = on ? 'Restore' : 'Maximise';
  if (b) { b.setAttribute('aria-label', label); b.dataset.tip = label; setIcon(b, on ? 'restore' : 'maximise'); if (tipEl === b) showTip(b); }
  winState(w, on ? 'maximise' : 'restore');
};
const closeWin = (w) => {
  if (!ask(w, 'ayni:close', { window: w })) return;
  const desk = w.closest('.desktop'); chipOf.get(w)?.remove(); w.remove();
  winState(w, 'close'); selectWin(desk, frontWin(desk));
};
const initWindow = (w) => {
  const desk = w.closest('.desktop'), area = w.parentElement, head = $(':scope > header', w);
  if (!desk || !head) return;
  const name = $('h2', head)?.textContent.trim() || 'Window', appIcon = $('.app .icon', head);
  const chip = document.createElement('div');
  chip.className = 'chip'; chip.setAttribute('role', 'group'); chip.setAttribute('aria-label', name);
  const ctl = (k, label, ic) => `<button class="btn quiet" data-win="${k}" aria-label="${label}" data-tip="${label}">${icon(ic)}</button>`;
  chip.innerHTML = `<button class="chip-main">${icon(appIcon ? iconName(appIcon) : 'file')}<span></span></button>`
    + `<span class="chip-ctl">${ctl('min', 'Minimise', 'minimise')}${ctl('max', 'Maximise', 'maximise')}${ctl('close', 'Close', 'close')}</span>`;
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
  /* The title row moves the window (not its tools); the title row always stays inside the area */
  head.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button, input, a') || w.classList.contains('max')) return;
    const r = w.getBoundingClientRect(), a = area.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const move = (m) => {
      w.style.left = Math.min(Math.max(m.clientX - dx - a.left, 0), Math.max(0, a.width - r.width)) + 'px';
      w.style.top = Math.min(Math.max(m.clientY - dy - a.top, 0), a.height - head.offsetHeight) + 'px';
    };
    const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); };
    head.addEventListener('pointermove', move); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
  });
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
  bar.insertAdjacentHTML('beforeend', `<button class="btn quiet more" popovertarget="${id}" aria-haspopup="menu" aria-label="More tools" data-tip="More tools" hidden>${icon('more')}</button>`);
  const more = $(':scope > .more', bar);
  const menu = layer(id, `<div class="panel menu" popover id="${id}" role="menu" aria-label="More tools"></div>`);
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
    const q = fold(inp?.value.trim() || '');
    items().forEach((b) => (b.hidden = !!q && !fold(b.textContent).includes(q)));
    if (empty) empty.hidden = shown().length > 0;
  };
  pop.addEventListener('toggle', (e) => {
    if (e.newState !== 'open') { invoker?.focus(); return; }
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
    invoker?.focus(); pop.hidePopover(); fire(pop, 'ayni:launch', { app: b.dataset.app, item: b });
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
  drawIcons(root);
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
  each(root, 'textarea[data-autogrow]', 'grow', initGrow);
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
  each(root, '.desktop', 'desktop', initDesktop);
  each(root, '.desktop > .area > .panel.window', 'window', initWindow);
  each(root, '.panel.popup.launcher', 'launcher', initLauncher);
  each(root, '.widget.clock', 'clock', initClock);
};

window.Ayni = {
  version: '0.1.0', init, $, $$, status, toast, setBusy, place, icon, setIcon, contextMenu, fillHelp, focusFirstError,
  isTouch, setTouchPreview, isDark, setTheme, isMac, fold, makeTypeAhead, tree,
  toolbar: (el) => { if (once('toolbar', el)) initToolbar(el); }, calendar: makeCalendar, dateField, dateTimeField,
  windows: { select: (w) => selectWin(w.closest('.desktop'), w), minimise: minimiseWin, maximise: (w) => maximiseWin(w, true),
    restore: (w) => maximiseWin(w, false), close: closeWin },
  setTaskbarEdge: (desk, edge) => setEdge(desk, edge), isDesktop,
  icons: { use: useIcons, names: ICONS, get set() { return iconSet; } },
  dates: { pad, iso, parseIso, formatLong: (d) => fmtLong.format(d), formatDateTime: fmtDT, parseDateTime: parseDT },
};
const start = () => { setup(); init(document); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
