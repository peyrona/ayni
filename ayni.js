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
const { fire, wired, once, each, tx, txf, LOCALE, iconName, drawIcons, isRO, layer, isTouch, HOLD_MS, DBL_MS, retip, fold } = Ayni.core;
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
let errPop;


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
/* Password: a button with data-reveal inside the field shows and hides the text */
const initReveal = (b) => b.addEventListener('click', () => {
  const show = b.getAttribute('aria-pressed') !== 'true', pw = $('input', b.closest('.input-group'));
  pw.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show);
  const label = tx(show ? 'password.hide' : 'password.show'); b.setAttribute('aria-label', label); b.dataset.tip = label;
  setIcon(b, show ? 'eye-off' : 'eye'); retip(b);
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

/* ---------- Calendar (shared by inline calendars and the date popups) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim()); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return iso(d) === s.trim() ? d : null; };
const sameDay = (a, b) => a && b && iso(a) === iso(b);
const fmtLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonShort = new Intl.DateTimeFormat(LOCALE, { month: 'short' });
const fmtMonLong = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
/* Two-letter day names, Monday first: "Mo", "Lu"... */
const dayHeads = () => Array.from({ length: 7 }, (_, i) => {
  const n = window.Ayni?.i18n?.weekday(i + 1, 'short') || ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][i];
  return n.slice(0, 2);
});
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
          rows += `<td><button type="button" data-d="${iso(day)}" class="${cls}" tabindex="${sameDay(day, cur) ? 0 : -1}" aria-selected="${sameDay(day, sel)}" aria-label="${dayOk(day) ? fmtLong.format(day) : txf('cal.dayOff', { date: fmtLong.format(day) })}"${off(dayOk(day))}>${day.getDate()}</button></td>`;
        }
        rows += '</tr>';
      }
      title = fmtMonLong.format(cur); unit = 'month';
      prevOk = monthOk(y, m - 1); nextOk = monthOk(y, m + 1);
      body = `<table role="grid" aria-label="${title}"><thead><tr>${dayHeads().map((x) => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    } else if (view === 'months') {
      title = String(y); unit = 'year';
      prevOk = yearOk(y - 1); nextOk = yearOk(y + 1);
      body = `<div class="cal-grid" role="grid" aria-label="${txf('cal.monthsOf', { year: y })}">${Array.from({ length: 12 }, (_, i) => {
        const cls = y === today.getFullYear() && i === today.getMonth() ? 'today' : '';
        return `<button type="button" data-mo="${i}" class="${cls}" tabindex="${i === m ? 0 : -1}" aria-selected="${y === sel.getFullYear() && i === sel.getMonth()}" aria-label="${fmtMonLong.format(new Date(y, i, 1))}"${off(monthOk(y, i))}>${fmtMonShort.format(new Date(y, i, 1))}</button>`;
      }).join('')}</div>`;
    } else {
      title = txf('cal.yearSpan', { from: base, to: base + 11 }); unit = 'years';
      prevOk = yearOk(base - 1); nextOk = yearOk(base + 12);
      body = `<div class="cal-grid" role="grid" aria-label="${txf('cal.years', { span: title })}">${Array.from({ length: 12 }, (_, i) => {
        const yy = base + i;
        return `<button type="button" data-yr="${yy}" class="${yy === today.getFullYear() ? 'today' : ''}" tabindex="${yy === y ? 0 : -1}" aria-selected="${yy === sel.getFullYear()}"${off(yearOk(yy))}>${yy}</button>`;
      }).join('')}</div>`;
    }
    const titleEl = view === 'years' ? `<span class="cal-title" aria-live="polite">${title}</span>`
      : `<button type="button" class="cal-title" data-view aria-live="polite" data-tip="${tx(view === 'days' ? 'cal.chooseMonth' : 'cal.chooseYear')}">${title}${icon('chev-down')}</button>`;
    root.innerHTML = `<div class="cal-head">
      <button type="button" class="btn icon-btn" data-nav="-1" aria-label="${tx('cal.prev.' + unit)}" data-tip="${tx('cal.prev.' + unit)}"${off(prevOk)}>${icon('chev-right', 'flip')}</button>
      ${titleEl}
      <button type="button" class="btn icon-btn" data-nav="1" aria-label="${tx('cal.next.' + unit)}" data-tip="${tx('cal.next.' + unit)}"${off(nextOk)}>${icon('chev-right')}</button></div>
      <div class="cal-body">${body}</div>
      <div class="cal-foot"><button type="button" class="btn" data-today aria-label="${tx('cal.today')}" data-tip="${dayOk(today) ? txf('cal.todayIs', { date: fmtLong.format(today) }) : tx('cal.todayOff')}"${off(dayOk(today))}>${icon('today')}</button></div>`;
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
    else invoker()?.focus();
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
    else invoker()?.focus();
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
/* The tree's rename field (ayni-lists.js) uses the same "!" */
Ayni.core.errors = { init: initError, forget: (c) => { errMarks.delete(c); if (errFor === c) hideErr(); } };
/* Ayni.focusFirstError(root): on sending a form with errors, the focus goes to the first wrong field, so its message shows */
const focusFirstError = (root = document) => {
  const c = [...errMarks.keys()].find((k) => root.contains(k) && errBad(k)); if (!c) return false;
  (errGroup(c) ? $('input:not([disabled]), [tabindex="0"], [role="option"]', c) || c : c).focus(); return true;
};

/* ---------- Page-wide behaviour, set up once ---------- */
const setup = () => {
  errPop = layer('ayni-err', '<div class="panel popup err-pop" popover="manual" id="ayni-err" aria-hidden="true"></div>');

  /* Read-only radios and sliders show their value but cannot change (check boxes and switches: ayni-buttons.js) */
  addEventListener('keydown', (e) => { if (isRO(e.target) && /radio|range/.test(e.target.type) && /^(Arrow|Page|Home|End)/.test(e.key)) e.preventDefault(); }, true);
  addEventListener('pointerdown', (e) => { if (isRO(e.target) && e.target.type === 'range') e.preventDefault(); }, true);

  addEventListener('click', (e) => { const l = e.target.closest('label[for]'); if (l && !l.control) { const c = document.getElementById(l.htmlFor); if (c) focusCtl(c); } });


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
  each(root, '.ta-wrap', 'count', initCount);
  each(root, 'textarea[data-autogrow]', 'grow', initGrow);
  each(root, '[data-reveal]', 'reveal', initReveal);
  each(root, '.spin', 'spin', initSpin);
  each(root, '.date-field', 'datekeys', initDateKeys);
  each(root, '.picker', 'picker', initPicker);
  each(root, '.split', 'split', initSplit);
  each(root, '[aria-describedby]', 'error', initError);
  each(root, '.desktop', 'desktop', initDesktop);
  each(root, '.desktop > .area > .panel.window', 'window', initWindow);
  each(root, '.panel.popup.launcher', 'launcher', initLauncher);
  each(root, '.widget.clock', 'clock', initClock);
  each(root, 'dialog.panel', 'owned', (d) => new MutationObserver(() => { if (d.open) adoptDialog(d); else d.hidden = false; }).observe(d, { attributes: true, attributeFilter: ['open'] }));
};

Object.assign(Ayni, {
  status, focusFirstError,
  calendar: makeCalendar, dateField, dateTimeField,
  windows: { select: (w) => selectWin(w.closest('.desktop'), w), minimise: minimiseWin, maximise: (w) => maximiseWin(w, true),
    restore: (w) => maximiseWin(w, false), close: closeWin },
  setTaskbarEdge: (desk, edge) => setEdge(desk, edge), isDesktop,
  dates: { pad, iso, parseIso, formatLong: (d) => fmtLong.format(d), formatDateTime: fmtDT, parseDateTime: parseDT },
});
Ayni.core.family({ setup, init });
})();
