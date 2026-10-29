/* Ayni tests: load the gallery in a headless Chromium and check the foundations (colours, light and dark, Sun mode,
   schemes, languages, icons). No dependencies: Node 22+ (its own WebSocket and fetch) and a Chromium.
     node tests/run.mjs
   Ends with "ALL GREEN" or the list of failed checks, and exits 1 on any failure. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ---------- A static server over the repository ---------- */
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const GALLERY = BASE + '/gallery/index.html';

/* ---------- Headless Chromium over the DevTools protocol ---------- */
const bin = CHROME.find((p) => fs.existsSync(p));
if (!bin) { console.error('No Chromium found'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ayni-test-'));
const chrome = spawn(bin, ['--headless=new', '--remote-debugging-port=0', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  let buf = ''; const t = setTimeout(() => reject(new Error('no DevTools port: ' + buf)), 20000);
  chrome.stderr.on('data', (d) => { buf += d; const m = /ws:\/\/127\.0\.0\.1:(\d+)\//.exec(buf); if (m) { clearTimeout(t); resolve(+m[1]); } });
});
const quit = async (code) => {
  server.close();
  await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once('exit', r); chrome.kill(); });
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(code);
};

const tab = async () => {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const waiting = new Map(), logs = [], loaded = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/\/favicon\.ico$/.test(m.params.entry.url || '')) logs.push('error: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Page.loadEventFired') loaded.splice(0).forEach((f) => f());
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });   // a background tab is focused too (:focus, :focus-visible)
  const evaluate = async (expression, ms = 15000) => {
    const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
      new Promise((_, j) => setTimeout(() => j(new Error('timed out: ' + expression.slice(0, 200))), ms))]);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  /* Load a page and wait until Ayni has started */
  const open = async (url = GALLERY) => {
    const done = new Promise((r) => loaded.push(r));
    await send('Page.navigate', { url }); await done;
    await evaluate('new Promise((r) => { const t = () => (window.Ayni?.ready ? Ayni.ready.then(() => r(true)) : setTimeout(t, 20)); t(); })');
  };
  const close = () => fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  return { send, evaluate, open, close, logs };
};

/* ---------- Checks ---------- */
const failed = []; let passed = 0;
const check = (name, ok, got) => { if (ok) passed++; else { failed.push(name + (got !== undefined ? ' — got ' + JSON.stringify(got) : '')); } console.log((ok ? '  ok   ' : '  FAIL ') + name); };
const section = (s) => console.log('\n' + s);

const LIGHT = { '--bg': '#D8D0C0', '--card': '#E3DCCC', '--card2': '#F2ECDF', '--line': '#86714B', '--text': '#242732', '--text-dim': '#484C5B', '--text-faint': '#5E6472', '--accent': '#61410A', '--on-accent': '#F9F9FB', '--danger': '#9C4150', '--ok': '#2E6B4E', '--warn': '#8A5A0B', '--busy': '#1C5FA6', '--link': '#1A4F9E' };
const DARK = { '--bg': '#1E1F23', '--card': '#25272B', '--card2': '#2F3034', '--line': '#424349', '--text': '#E7E7E9', '--text-dim': '#9597A1', '--text-faint': '#6B6E77', '--accent': '#1F80B1', '--on-accent': '#0D0F17', '--danger': '#D9707D', '--ok': '#7BA88F', '--warn': '#E0A21E', '--busy': '#2179CF', '--link': '#5B9DF9' };

/* In the page: a colour token as #RRGGBB, worked out by painting it (derived colours are color-mix() expressions) */
const RGB = `((name) => { const p = document.createElement('i'); p.style.color = 'var(' + name + ')'; document.body.append(p);
  const c = getComputedStyle(p).color; p.remove(); const x = document.createElement('canvas').getContext('2d');
  x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data;
  return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(); })`;
const tokens = (t, names) => t.evaluate(`(${JSON.stringify(names)}).map((n) => [n, ${RGB}(n)])`).then(Object.fromEntries);
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/* Texts that are keys nobody translated: "ayni.something" anywhere in the page, text or attribute */
const RAW_KEYS = `(() => { const out = new Set(), re = /\\bayni\\.[a-z][\\w.]*/g;
  for (const m of document.body.innerText.matchAll(re)) out.add(m[0]);
  document.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { if (a.name !== 'class' && a.name !== 'id' && a.name !== 'src' && a.name !== 'href') for (const m of a.value.matchAll(re)) out.add(m[0] + ' @' + a.name); }));
  document.querySelectorAll('[popover], dialog').forEach((el) => { for (const m of el.innerHTML.matchAll(re)) out.add(m[0]); });
  return [...out]; })()`;
const scheme = (t, value) => t.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
const clearStore = (t) => t.evaluate('localStorage.clear(), true');
/* Fix the page's clock to a moment (ms since 1970), for the sun */
const fakeClock = async (t, ms) => (await t.send('Page.addScriptToEvaluateOnNewDocument', { source:
  `(() => { const T = ${ms}, R = Date; class D extends R { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } } window.Date = D; })();` })).result.identifier;

let t;
try {
  t = await tab();
  await scheme(t, 'light');
  await t.open(); await clearStore(t); await t.open();

  section('Start-up');
  check('no errors or warnings on load (English, light)', t.logs.length === 0, t.logs.slice());
  check('Ayni.supported() is true in this browser', await t.evaluate('Ayni.supported()'));
  check('the page language is English', (await t.evaluate('document.documentElement.lang')) === 'en');
  check('no untranslated keys (English)', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
  check('the page is visible (the language script let it show)', (await t.evaluate('getComputedStyle(document.documentElement).visibility')) === 'visible');
  check('no font is loaded from the network', (await t.evaluate(`performance.getEntriesByType('resource').filter((r) => !r.name.startsWith(location.origin)).map((r) => r.name)`)).length === 0);

  section('Colours');
  let got = await tokens(t, Object.keys(LIGHT));
  check('System mode on a light device: every colour is Nayive\'s light value', Object.keys(LIGHT).every((k) => got[k] === LIGHT[k]), got);
  check('System mode on a light device: data-theme says light', (await t.evaluate('document.documentElement.dataset.theme')) === 'light');
  check('the browser bar takes --bg (light)', (await t.evaluate(`document.querySelector('meta[name="theme-color"]')?.content`)) === LIGHT['--bg']);
  const dTok = ['--text', '--text-dim', '--card', '--card2', '--field-line', '--accent', '--line'];
  const cl = await tokens(t, dTok);
  await scheme(t, 'dark');
  await t.evaluate('new Promise((r) => setTimeout(r, 50))');
  check('…and turns to dark with the device', (await t.evaluate('document.documentElement.dataset.theme')) === 'dark');
  got = await tokens(t, Object.keys(DARK));
  check('System mode follows the device to dark at once', Object.keys(DARK).every((k) => got[k] === DARK[k]), got);
  check('the browser bar takes --bg (dark)', (await t.evaluate(`document.querySelector('meta[name="theme-color"]')?.content`)) === DARK['--bg']);
  const cd = await tokens(t, dTok);
  for (const [name, c] of [['light', cl], ['dark', cd]]) {
    check(`contrast ${name}: text on card ≥ 4.5`, contrast(c['--text'], c['--card']) >= 4.5, contrast(c['--text'], c['--card']).toFixed(2));
    check(`contrast ${name}: text dim (placeholders) on card 2 ≥ 4.5`, contrast(c['--text-dim'], c['--card2']) >= 4.5, contrast(c['--text-dim'], c['--card2']).toFixed(2));
    check(`contrast ${name}: field border on card 2 ≥ 3`, contrast(c['--field-line'], c['--card2']) >= 3, contrast(c['--field-line'], c['--card2']).toFixed(2));
    check(`contrast ${name}: focus ring (accent) on card ≥ 3`, contrast(c['--accent'], c['--card']) >= 3, contrast(c['--accent'], c['--card']).toFixed(2));
  }
  check('placeholders use text dim', (await t.evaluate(`getComputedStyle(document.querySelector('input.input[placeholder]'), '::placeholder').color`)) === (await t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = 'var(--text-dim)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
  check('fields sit on card 2', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).backgroundColor`)) === (await t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = 'var(--card2)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
  check('the focus ring is accent', (await t.evaluate(`(() => { const b = document.querySelector('#theme-btn'); document.activeElement?.blur(); b.focus({ focusVisible: true }); const o = getComputedStyle(b).outlineColor; const p = document.createElement('i'); p.style.color = 'var(--accent)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return o === c ? true : o + ' vs ' + c; })()`)) === true, await t.evaluate(`(() => { const b = document.querySelector('#theme-btn'); return [document.activeElement?.id, b.matches(':focus'), b.matches(':focus-visible'), getComputedStyle(b).outline, getComputedStyle(b).display, b.getClientRects().length].join(' | '); })()`));
  check('corners: fields 8 px, panels 16 px', (await t.evaluate(`[getComputedStyle(document.querySelector('input.input')).borderTopLeftRadius, getComputedStyle(document.querySelector('.panel')).borderTopLeftRadius].join()`)) === '8px,16px');
  check('the system font is used', /BlinkMacSystemFont|-apple-system/.test(await t.evaluate('getComputedStyle(document.body).fontFamily')));

  section('Light and dark by hand');
  await t.evaluate(`window.__themes = []; document.addEventListener('ayni:theme', (e) => __themes.push(e.detail.theme)); true`);
  check('the toggle shows a sun while dark is on', (await t.evaluate(`document.querySelector('#theme-btn .icon').dataset.icon`)) === 'sun');
  await t.evaluate(`document.querySelector('#theme-btn').click(), true`);
  check('pressing it gives light, kept as ayni-theme', (await t.evaluate(`[document.documentElement.dataset.theme, localStorage.getItem('ayni-theme')].join()`)) === 'light,light');
  check('…and a moon on the toggle', (await t.evaluate(`document.querySelector('#theme-btn .icon').dataset.icon`)) === 'moon');
  check('…and its tooltip says what it will do', (await t.evaluate(`document.querySelector('#theme-btn').dataset.tip`)) === 'Dark mode');
  check('ayni:theme fired once, on document', JSON.stringify(await t.evaluate('__themes')) === '["light"]', await t.evaluate('__themes'));
  got = await tokens(t, Object.keys(LIGHT));
  check('the colours are light although the device is dark', Object.keys(LIGHT).every((k) => got[k] === LIGHT[k]), got);
  await t.evaluate(`Ayni.setTheme('light'), true`);
  check('no event when nothing changed', (await t.evaluate('__themes.length')) === 1);

  const t2 = await tab(); await scheme(t2, 'dark'); await t2.open();
  check('a second tab opens in the chosen mode', (await t2.evaluate('document.documentElement.dataset.theme')) === 'light');
  await t.evaluate(`Ayni.setTheme('dark'), true`);
  await t2.evaluate('new Promise((r) => setTimeout(r, 150))');
  check('a change in one tab reaches the other at once', (await t2.evaluate('document.documentElement.dataset.theme')) === 'dark');
  await t.evaluate(`Ayni.setTheme(null), true`);
  check('setTheme(null) goes back to System (dark device: data-theme dark)', (await t.evaluate(`[document.documentElement.dataset.theme ?? '-', localStorage.getItem('ayni-theme') ?? '-', Ayni.theme.mode() ?? '-'].join()`)) === 'dark,-,-');
  await t.open();
  await t.evaluate(`localStorage.setItem('ayni-theme', 'light'), true`);
  await t.open();
  check('a saved choice wins on the next load: light on a dark device', (await t.evaluate('document.documentElement.dataset.theme')) === 'light');
  await t.evaluate(`Ayni.setTheme(null), true`);

  section('Own schemes');
  await t.evaluate(`Ayni.theme.schemes = { schemes: [{ id: 'sea', tokens: { '--accent': '#123456', '--bg': '#0A1B2C' } }], activeDark: 'sea' }, true`);
  got = await tokens(t, ['--accent', '--bg', '--card']);
  check('the active dark scheme sets its colours', got['--accent'] === '#123456' && got['--bg'] === '#0A1B2C', got);
  check('…and leaves the others built-in', got['--card'] === DARK['--card'], got);
  check('…and the browser bar follows it', (await t.evaluate(`document.querySelector('meta[name="theme-color"]').content`)) === '#0A1B2C');
  await t.evaluate(`Ayni.setTheme('light'), true`);
  check('in light the scheme (dark only) is off', (await tokens(t, ['--accent']))['--accent'] === LIGHT['--accent']);
  await t.evaluate(`Ayni.theme.schemes = null, Ayni.setTheme(null), true`);
  check('no scheme: the built-in colours come back', (await tokens(t, ['--accent']))['--accent'] === DARK['--accent']);
  await t2.close();   // its clock is the real one: in Sun mode it would answer every change below with its own

  section('Sun mode');
  /* 2026-10-28 in London: 12:00 UTC is day, 00:30 UTC is night; just after sunrise (~06:55 UTC) it is still dark */
  const sunCase = async (label, when, expect, { place, zone } = {}) => {
    const id = await fakeClock(t, Date.parse(when));
    if (zone) await t.send('Emulation.setTimezoneOverride', { timezoneId: zone });
    await t.open();
    const clock = await t.evaluate('new Date().toISOString()');
    if (clock !== new Date(Date.parse(when)).toISOString()) console.log('      page clock: ' + clock);
    await t.evaluate(`localStorage.clear(); ${place ? `localStorage.setItem('ayni-place', '${JSON.stringify(place)}');` : ''} Ayni.setTheme('sun'); true`);
    await t.evaluate(`new Promise((r) => { const end = performance.now() + 3000, w = () => (localStorage.getItem('ayni-theme') || performance.now() > end ? r() : setTimeout(w, 20)); w(); })`);
    const m = await t.evaluate(`[document.documentElement.dataset.theme, localStorage.getItem('ayni-theme'), Ayni.theme.mode()].join()`);
    check(label, m === `${expect},${expect},sun`, m);
    await t.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
    if (zone) await t.send('Emulation.setTimezoneOverride', { timezoneId: '' });
  };
  await sunCase('London at noon is light', '2026-10-28T12:00:00Z', 'light', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('London at 00:30 is dark', '2026-10-28T00:30:00Z', 'dark', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('London just after sunrise is still dark', '2026-10-28T07:00:00Z', 'dark', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('no place: Madrid\'s time zone at 13:00 local is light', '2026-10-28T12:00:00Z', 'light', { zone: 'Europe/Madrid' });
  await sunCase('no place: Madrid\'s time zone at 07:30 local is dark (its sun rises late)', '2026-10-28T06:30:00Z', 'dark', { zone: 'Europe/Madrid' });
  await t.evaluate('localStorage.clear(), true');
  await t.open();
  await t.evaluate(`Ayni.theme.setPlace(40.4168, -3.7038), true`);
  check('setPlace keeps the place rounded to ~10 km', (await t.evaluate(`localStorage.getItem('ayni-place')`)) === '{"lat":40.4,"lon":-3.7}');
  await t.evaluate(`Ayni.setTheme('sun'), document.querySelector('#theme-btn').click(), true`);
  check('the toggle ends Sun mode', (await t.evaluate(`[localStorage.getItem('ayni-theme-sun') ?? '-', Ayni.theme.mode()].join()`)).startsWith('-,'));
  await t.evaluate('localStorage.clear(), true');

  section('Languages');
  for (const lang of ['es', 'pt', 'fr', 'de', 'en']) {
    await t.evaluate(`localStorage.setItem('ayni-lang', '${lang}'), true`);
    t.logs.length = 0;
    await t.open();
    check(`${lang}: the page language is ${lang}`, (await t.evaluate('document.documentElement.lang')) === lang);
    const raw = await t.evaluate(RAW_KEYS);
    check(`${lang}: no untranslated keys`, raw.length === 0, raw);
    check(`${lang}: no errors or warnings`, t.logs.length === 0, t.logs.slice());
  }
  await t.evaluate(`localStorage.setItem('ayni-lang', 'es'), true`); await t.open();
  check('es: the password button says "Mostrar contraseña"', (await t.evaluate(`(() => { const b = document.querySelector('#pw-toggle'); b.click(); b.click(); return b.dataset.tip; })()`)) === 'Mostrar contraseña');
  check('es: calendar days start "Lu"', (await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`)) === 'lu' || (await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`)) === 'Lu', await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`));
  check('es: the calendar title is in Spanish', (await t.evaluate(`document.querySelector('#cal-inline .cal-title').textContent.trim()`)) === (await t.evaluate(`new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date())`)));
  check('es: the theme button says "Tema claro" / "Tema oscuro"', ['Tema claro', 'Tema oscuro'].includes(await t.evaluate(`document.querySelector('#theme-btn').dataset.tip`)));
  check('es: Ayni.t reads a key', (await t.evaluate(`Ayni.t('ayni.undo')`)) === 'Deshacer');
  check('es: Ayni.tf fills its places', (await t.evaluate(`Ayni.tf('ayni.tree.nItems', { n: 3 })`)) === '3 elementos');
  check('a key no file has comes back as itself', (await t.evaluate(`Ayni.t('no.such.key')`)) === 'no.such.key');
  check('setLang to the same language does nothing', (await t.evaluate(`Ayni.i18n.setLang('es')`)) === false);
  check('setLang(null) does nothing', (await t.evaluate(`Ayni.i18n.setLang(null)`)) === false);
  check('setLang to a language not offered does nothing', (await t.evaluate(`Ayni.i18n.setLang('xx')`)) === false);
  await t.evaluate(`Ayni.i18n.setLang('fr'), true`).catch(() => {});
  await t.evaluate('new Promise((r) => setTimeout(r, 400))').catch(() => {});
  await t.open();
  check('setLang("fr") reloads the page in French', (await t.evaluate('document.documentElement.lang')) === 'fr');
  await t.evaluate(`Ayni.i18n.setLang(''), true`).catch(() => {});
  await t.evaluate('new Promise((r) => setTimeout(r, 400))').catch(() => {});
  await t.open();
  check('setLang("") follows the browser again', (await t.evaluate(`[localStorage.getItem('ayni-lang') ?? '-', document.documentElement.lang].join()`)) === '-,en');

  section('Icons');
  const icons = await t.evaluate(`[...document.querySelectorAll('.icon[data-icon]')].filter((el) => el.getClientRects().length).map((el) => [el.dataset.icon, !!el.querySelector('svg, i, img')])`);
  const blank = icons.filter(([, ok]) => !ok).map(([n]) => n);
  check(`every icon on the page is drawn (${icons.length})`, blank.length === 0, [...new Set(blank)]);
  check('every control icon has a drawing', (await t.evaluate(`Ayni.icons.names.filter((n) => !document.getElementById('i-' + n))`)).length === 0, await t.evaluate(`Ayni.icons.names.filter((n) => !document.getElementById('i-' + n))`));
  check('"more" is the vertical ⋮ (three dots one above the other)', (await t.evaluate(`[...document.querySelectorAll('#i-more circle')].map((c) => c.getAttribute('cx')).join()`)) === '12,12,12');
  check('an icon with its own stroke keeps it (check: 2.6)', (await t.evaluate(`document.querySelector('#i-check g')?.getAttribute('stroke-width')`)) === '2.6');
  await t.evaluate(`(() => { const s = document.createElement('span'); s.className = 'icon'; s.dataset.icon = 'test-logo'; s.id = 'probe'; document.body.append(s); Ayni.init(s); return true; })()`);
  await t.evaluate(`Ayni.icons.add({ 'test-logo': '<svg viewBox="0 0 512 512" fill="currentColor"><rect width="512" height="256"/></svg>', 'test-line': '<path d="M4 4h16"/>' }), true`);
  check('icons.add: a whole svg keeps its grid and fill', (await t.evaluate(`[document.getElementById('i-test-logo').getAttribute('viewBox'), document.querySelector('#i-test-logo > g').getAttribute('fill')].join()`)) === '0 0 512 512,currentColor');
  check('icons.add: a line drawing gets the 24 grid', (await t.evaluate(`document.getElementById('i-test-line').getAttribute('viewBox')`)) === '0 0 24 24');
  check('icons.add: an icon already on the page is redrawn', await t.evaluate(`!!document.querySelector('#probe svg use')`));
  check('a copy of an icon\'s svg, out of its span, still draws with lines', await t.evaluate(`(() => { const c = document.querySelector('.icon[data-icon="search"] svg').cloneNode(true); document.body.append(c); const ok = getComputedStyle(c).fill === 'none' && getComputedStyle(c).stroke !== 'none'; c.remove(); return ok; })()`));
  check('Ayni.icon() writes the span markup', /^<span class="icon" data-icon="close"/.test(await t.evaluate(`Ayni.icon('close')`)));

  section('Touch and text size');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  await t.evaluate(`Ayni.setTouchPreview(true), true`);
  check('phone, touch: fields type in 16 px', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`)) === '16px', await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`));
  await t.evaluate(`Ayni.setTouchPreview(false), true`);
  await t.send('Emulation.clearDeviceMetricsOverride');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  check('desktop: fields type in .77 rem', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`)) === '12.32px', await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`));
  check('body text is .9 rem', (await t.evaluate('getComputedStyle(document.body).fontSize')) === '14.4px');

  section('Base only (no controls)');
  t.logs.length = 0;
  await t.open(BASE + '/tests/base-only.html');
  check('a page with only the base starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  check('…its icons are drawn', await t.evaluate(`!!document.querySelector('#ic svg use')`));
  check('…its texts are translated', (await t.evaluate(`document.getElementById('msg').textContent`)) === 'Undo');
  check('…and the controls are not there', (await t.evaluate('typeof Ayni.toast')) === 'undefined');
  await t.evaluate(`document.getElementById('theme').click(), true`);
  check('…and its theme button works', !!(await t.evaluate('document.documentElement.dataset.theme')));
  await t.evaluate(`Ayni.setTheme(null), true`);

  section('Buttons family (base + buttons, no other controls)');
  t.logs.length = 0;
  await t.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await t.open(BASE + '/tests/buttons-only.html');
  check('a page with the base and the buttons family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  const cs = (id, prop, pseudo) => t.evaluate(`getComputedStyle(document.getElementById('${id}')${pseudo ? `, '${pseudo}'` : ''}).${prop}`);
  const colourOf = (v) => t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = '${v}'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
  check('at rest: no fill and no border', (await cs('plain', 'backgroundColor')) === 'rgba(0, 0, 0, 0)' && (await cs('plain', 'borderTopColor')) === 'rgba(0, 0, 0, 0)');
  check('at rest: the icon is Text dim', (await cs('plain', 'color')) === (await colourOf('var(--text-dim)')));
  const r = await t.evaluate(`(() => { const b = document.getElementById('plain').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] });
  await t.evaluate('new Promise((r) => setTimeout(r, 250))');
  check('on hover: a grey tint, never Accent', (await cs('plain', 'backgroundColor')) !== 'rgba(0, 0, 0, 0)' && !(await cs('plain', 'backgroundColor')).includes((await colourOf('var(--accent)')).slice(4, -1)));
  check('on hover: the icon takes the full Text colour', (await cs('plain', 'color')) === (await colourOf('var(--text)')));
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  check('.bordered: a Card disc with a border', (await cs('bordered', 'backgroundColor')) === (await colourOf('var(--card)')) && (await cs('bordered', 'borderTopColor')) === (await colourOf('var(--line)')));
  check('.sm: 30 px', (await cs('small', 'width')) === '30px');
  check('normal: 36 px', (await cs('plain', 'width')) === '36px');
  check('the default button is the only filled one (Accent)', (await cs('primary', 'backgroundColor')) === (await colourOf('var(--accent)')));
  check('danger colours only the icon', (await cs('danger', 'color')) === (await colourOf('var(--danger)')) && (await cs('danger', 'backgroundColor')) === 'rgba(0, 0, 0, 0)');
  check('a toggle that is on: soft tint and an Accent icon, no fill', (await cs('toggle', 'backgroundColor')) === (await colourOf('var(--accent-soft)')) && (await cs('toggle', 'color')) === (await colourOf('var(--accent)')));
  await t.evaluate(`document.getElementById('toggle').click(), true`);
  check('a toggle flips its aria-pressed', (await t.evaluate(`document.getElementById('toggle').getAttribute('aria-pressed')`)) === 'false');
  check('a menu button shows the triangle', (await cs('popup', 'content', '::after')) === '""');
  check('the ⋮ "more" button does not', (await cs('more', 'content', '::after')) === 'none');
  check('a second action shows its dot', (await cs('alt', 'content', '::after')) === '""');
  check('its tooltip names both actions', /Print · .*Print with the last settings/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));
  check('a round button gets its aria-label from its tooltip', (await t.evaluate(`document.getElementById('plain').getAttribute('aria-label')`)) === 'Search');
  check('a disabled button is faded to 45%', (await cs('off', 'opacity')) === '0.45');
  check('…and ignores clicks', await t.evaluate(`(() => { let hit = false; const b = document.getElementById('off'); b.addEventListener('click', () => { hit = true; }); b.click(); return !hit; })()`));
  await t.evaluate(`Ayni.setBusy(document.getElementById('plain'), 'Saving…'), true`);
  check('setBusy: a spinner instead of the icon, the tooltip says what runs', (await t.evaluate(`[!!document.querySelector('#plain .btn-spin'), getComputedStyle(document.querySelector('#plain .icon')).display, document.getElementById('plain').dataset.tip].join()`)) === 'true,none,Saving…');
  await t.evaluate(`Ayni.setBusy(document.getElementById('plain'), false), true`);
  check('…and back', (await t.evaluate(`[!!document.querySelector('#plain .btn-spin'), document.getElementById('plain').dataset.tip].join()`)) === 'false,Search');
  await t.evaluate(`Ayni.setTip(document.getElementById('plain'), 'Pause'), true`);
  check('setTip: the tooltip and the round button\'s name change together', (await t.evaluate(`[document.getElementById('plain').dataset.tip, document.getElementById('plain').getAttribute('aria-label')].join()`)) === 'Pause,Pause');
  await t.evaluate(`Ayni.setTip(document.getElementById('plain'), 'Search'), true`);
  check('a round tab button that is chosen looks like a toggle that is on', await t.evaluate(`(() => { const b = document.createElement('button'); b.className = 'btn'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'true'); document.body.append(b); const r = getComputedStyle(b).color === getComputedStyle(document.body).getPropertyValue('--accent') || getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)'; b.remove(); return r; })()`));
  check('setBusy on a button with no tooltip: none again afterwards', await t.evaluate(`(() => { const b = document.createElement('button'); b.className = 'btn text'; document.body.append(b); Ayni.setBusy(b, 'Saving…'); const busy = b.dataset.tip; Ayni.setBusy(b, false); const r = busy === 'Saving…' && !('tip' in b.dataset) && !('idleTip' in b.dataset); b.remove(); return r; })()`));
  check('over a picture: a dark glass disc with a white icon', (await cs('media', 'color')) === 'rgb(255, 255, 255)' && (await cs('media', 'backgroundColor')).startsWith('rgba(0, 0, 0'));
  check('a text button is a pill with its label', (await t.evaluate(`[document.getElementById('text').textContent.trim(), getComputedStyle(document.getElementById('text')).borderTopLeftRadius].join()`)) === 'Extract here,999px');
  check('…and keeps no aria-label of its own (its label is the name)', (await t.evaluate(`document.getElementById('text').hasAttribute('aria-label')`)) === false);
  check('a dashed text button has a dashed border', (await cs('dashed', 'borderTopStyle')) === 'dashed');
  check('switch.end: the switch sits at the end of its row', await t.evaluate(`(() => { const l = document.getElementById('sw').getBoundingClientRect(), i = document.querySelector('#sw input').getBoundingClientRect(); return Math.abs(l.right - i.right) < 2; })()`));
  check('a tall toolbar has 36 px buttons', (await t.evaluate(`getComputedStyle(document.querySelector('#tb .btn')).width`)) === '36px');
  await t.evaluate(`Ayni.setTouchPreview(true), true`);
  check('touch: a button keeps its drawn size', (await cs('plain', 'width')) === '36px');
  check('touch: a finger 3 px outside the drawn circle still hits it (44 px area)', await t.evaluate(`(() => { const b = document.getElementById('plain').getBoundingClientRect(); const e = document.elementFromPoint(b.left - 3, b.top + b.height / 2); return e === document.getElementById('plain'); })()`));
  check('touch: a dialog\'s bottom row is drawn at 44 px', (await t.evaluate(`getComputedStyle(document.querySelector('#foot .btn')).width`)) === '44px');
  check('touch: the second action\'s tooltip says "Hold"', /Hold/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));
  await t.evaluate(`Ayni.setTouchPreview(false), true`);
  check('back to mouse: "Double-click or Shift+Enter"', /Double-click/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));

  section('Notifications family (base + buttons + notifications)');
  t.logs.length = 0;
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await t.open(BASE + '/tests/toasts-only.html#early');
  check('a page with the notifications family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  const ev = (js) => t.evaluate(js);
  const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
  const ctrlZ = async () => { for (const type of ['keyDown', 'keyUp']) await t.send('Input.dispatchKeyEvent', { type, key: 'z', code: 'KeyZ', modifiers: 2, windowsVirtualKeyCode: 90 }); };
  const shown = () => ev(`[...document.querySelectorAll('#ayni-toasts > .toast')].map((x) => x.querySelector('p').firstChild.textContent)`);
  const reset = () => ev(`(() => { Ayni.settleUndo(); document.querySelectorAll('#ayni-toasts > .toast').forEach((x) => x.remove()); window.L = []; return true; })()`);
  /* Undo helpers: each logs what ran */
  const undoToast = (name, extra = '') => ev(`(Ayni.toast('ok', '${name}', { undo: () => L.push('undo ${name}'), final: () => L.push('final ${name}')${extra} }), true)`);
  const L = () => ev('L.join()');

  check('a notification shown before Ayni has started works', (await ev(`[...document.querySelectorAll('#ayni-toasts .toast p')].map((p) => p.textContent).join()`)) === 'Early', t.logs.slice());
  check('…and its stack gets its translated name once Ayni starts', (await ev(`document.getElementById('ayni-toasts').getAttribute('aria-label')`)) === 'Notifications');
  await reset();
  check('the stack is made by Ayni (no element in the page)', await ev(`!!document.getElementById('ayni-toasts')`));
  await ev(`(Ayni.toast('ok', 'Saved.'), true)`);
  check('a notification shows in the open stack', await ev(`document.getElementById('ayni-toasts').matches(':popover-open') && !!document.querySelector('#ayni-toasts .toast.ok')`));
  check('…with its kind\'s icon and a close button', await ev(`!!document.querySelector('.toast.ok > .icon[data-icon="ok"]') && !!document.querySelector('.toast.ok .dismiss')`));
  check('…and role="status"; an error has role="alert"', await ev(`(Ayni.toast('err', 'Failed.'), document.querySelector('.toast.ok').getAttribute('role') === 'status' && document.querySelector('.toast.err').getAttribute('role') === 'alert')`));
  check('every kind has its icon colour', await ev(`(() => { Ayni.toast('info', 'i'); Ayni.toast('warn', 'w'); const c = (k) => getComputedStyle(document.querySelector('.toast.' + k + ' > .icon')).color, v = (n) => { const p = document.createElement('i'); p.style.color = 'var(' + n + ')'; document.body.append(p); const r = getComputedStyle(p).color; p.remove(); return r; }; return c('warn') === v('--warn') && c('err') === v('--danger') && c('info') === v('--accent'); })()`));
  check('no untranslated keys in the notifications', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
  await ev(`document.querySelectorAll('#ayni-toasts .dismiss').forEach((b) => b.click()), true`);
  check('closing the last one hides the stack', await ev(`!document.getElementById('ayni-toasts').matches(':popover-open') && !document.querySelector('#ayni-toasts .toast')`));
  check('Ayni.toast returns close()', await ev(`(() => { const h = Ayni.toast('info', 'x'); h.close(); return !document.querySelector('#ayni-toasts .toast'); })()`));

  /* Undo */
  await reset(); await undoToast('A');
  check('Undo: the icon and the word "Undo", in Accent', await ev(`(() => { const b = document.querySelector('.toast.undo .act'), p = document.createElement('i'); p.style.color = 'var(--accent)'; document.body.append(p); const acc = getComputedStyle(p).color; p.remove(); return b.matches('.btn.text') && !!b.querySelector('.icon[data-icon="undo"] svg') && b.textContent.trim() === 'Undo' && getComputedStyle(b).color === acc; })()`));
  check('Undo: the hint "Ctrl+Z also undoes" shows with a mouse', await ev(`getComputedStyle(document.querySelector('.toast.undo .undo-key')).display !== 'none' && document.querySelector('.undo-key').textContent === 'Ctrl+Z also undoes'`));
  await ev(`Ayni.setTouchPreview(true), true`);
  check('…and hides on touch', await ev(`getComputedStyle(document.querySelector('.toast.undo .undo-key')).display === 'none'`));
  await ev(`Ayni.setTouchPreview(false), true`);
  await ev(`document.querySelector('.toast.undo .act').click(), true`);
  check('pressing Undo runs it, and `final` never runs', (await L()) === 'undo A' && !(await ev(`!!document.querySelector('.toast.undo')`)), await L());

  await reset(); await undoToast('B');
  await ev(`document.querySelector('.toast.undo .dismiss').click(), true`);
  check('closing an Undo makes it final: `final` runs once', (await L()) === 'final B', await L());

  await reset(); await undoToast('C'); await undoToast('D');
  check('one Undo at a time: a newer Undo makes the older one final', (await L()) === 'final C' && (await shown()).join() === 'D', [await L(), await shown()]);
  await ev(`(Ayni.toast('info', 'News'), true)`);
  check('news never makes an Undo final', (await L()) === 'final C' && (await shown()).join() === 'D,News', [await L(), await shown()]);
  await ev(`Ayni.settleUndo(), true`);
  check('settleUndo(): the Undo is final now and leaves', (await L()) === 'final C,final D' && (await shown()).join() === 'News', [await L(), await shown()]);
  await ev(`Ayni.settleUndo(), true`);
  check('…and a second settleUndo() does nothing', (await L()) === 'final C,final D');

  /* Ctrl+Z */
  await reset(); await undoToast('E'); await ev('document.activeElement.blur(), true');
  await ctrlZ();
  check('Ctrl+Z runs the Undo on show', (await L()) === 'undo E' && !(await ev(`!!document.querySelector('.toast.undo')`)), await L());
  await ctrlZ();
  check('…and does nothing once it has gone', (await L()) === 'undo E', await L());
  await reset(); await undoToast('F'); await ev(`document.getElementById('field').focus(), true`);
  await ctrlZ();
  check('Ctrl+Z in a text field is the field\'s own', (await L()) === '', await L());
  await ev(`(document.activeElement.blur(), window.addEventListener('keydown', window.own = (e) => e.preventDefault(), true), true)`);
  await ctrlZ();
  check('Ctrl+Z the page handled itself does not undo', (await L()) === '', await L());
  await ev(`(window.removeEventListener('keydown', window.own, true), true)`);

  /* A closing page */
  await reset(); await ev(`(() => { window.sent = []; window.realFetch = window.fetch; window.fetch = (u, o) => { sent.push(!!o?.keepalive); return Promise.resolve(new Response('')); }; return true; })()`);
  await ev(`(Ayni.toast('ok', 'G', { undo: () => {}, final: () => { L.push('final G'); fetch('/x', { method: 'POST', body: 'y' }); } }), true)`);
  await ev(`(dispatchEvent(new Event('pagehide')), true)`);
  check('a closing page makes the Undo final, its fetch with keepalive', (await L()) === 'final G' && (await ev('sent.join()')) === 'true', [await L(), await ev('sent.join()')]);
  await reset(); await undoToast('H', ', keepOnLeave: true');
  await ev(`(dispatchEvent(new Event('pagehide')), true)`);
  check('keepOnLeave: a closing page does not run `final`', (await L()) === '', await L());
  await ev(`(window.fetch = window.realFetch, true)`);

  /* At most 3 */
  await reset();
  await undoToast('U'); await ev(`(Ayni.toast('err', 'E1'), Ayni.toast('info', 'I1'), Ayni.toast('info', 'I2'), Ayni.toast('info', 'I3'), true)`);
  check('at most 3 show; the oldest leaves, errors and the Undo last', (await shown()).join() === 'U,E1,I3', await shown());
  check('…and the Undo kept its way back', (await L()) === '', await L());
  await ev(`(Ayni.toast('err', 'E2'), Ayni.toast('err', 'E3'), true)`);
  check('with only errors and the Undo, the oldest error goes', (await shown()).join() === 'U,E2,E3', await shown());

  /* Time on screen */
  await reset();
  await undoToast('T'); await ev(`(Ayni.toast('info', 'Plain'), Ayni.toast('err', 'Error'), true)`);
  await wait(6300);
  check('after 6 s: a plain one has gone, an error stays', (await shown()).join() === 'Error', await shown());
  check('…and the Undo has gone, final', (await L()) === 'final T', await L());
  await reset();
  await ev(`(Ayni.toast('info', 'Focused'), document.querySelector('#ayni-toasts .dismiss').focus(), true)`);
  await ev(`(Ayni.toast('info', 'Hovered'), true)`);
  const hb = await ev(`(() => { const b = [...document.querySelectorAll('#ayni-toasts .toast')].at(-1).getBoundingClientRect(); return [b.left + 20, b.top + b.height / 2]; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hb[0], y: hb[1] });
  await wait(6300);
  check('the time stops while the focus is inside or the pointer is on it', (await shown()).join() === 'Focused,Hovered', await shown());
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });

  /* Where */
  await reset(); await ev(`(Ayni.toast('info', 'Where'), true)`);
  const box = () => ev(`(() => { const r = document.getElementById('ayni-toasts').getBoundingClientRect(); return [Math.round(r.left), Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom), Math.round(r.width)]; })()`);
  let b = await box();
  check('wide screen: bottom right, 16 px in, 360 px wide', b[1] === 16 && b[2] === 16 && b[3] === 360, b);
  await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  b = await box();
  check('phone: bottom centre, full width less 16 px each side', b[0] === 16 && b[1] === 16 && b[2] === 16, b);
  await ev(`(document.documentElement.style.setProperty('--toasts-lift', '64px'), true)`);
  b = await box();
  check('phone: --toasts-lift raises it above a bottom bar', b[2] === 80, b);
  await ev(`(document.documentElement.style.removeProperty('--toasts-lift'), true)`);
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  /* Progress */
  await reset();
  await ev(`(window.stops = 0, window.job = Ayni.progress('Uploading 0%', { pct: 0, onStop: () => stops++ }), true)`);
  await wait(300);
  check('progress: nothing shows in the first 600 ms', !(await ev(`!!document.querySelector('.toast.progress')`)));
  await wait(450);
  check('progress: then it shows, as a progress bar', await ev(`document.querySelector('.toast.progress')?.getAttribute('role') === 'progressbar'`));
  await ev(`(job.set('Uploading 50%', 50), true)`);
  check('set(text, 50): the text, aria-valuenow and a half-full bar', await ev(`(() => { const p = document.querySelector('.toast.progress'); const f = p.querySelector('.toast-fill'), tr = p.querySelector('.toast-track'); return p.querySelector('p').textContent === 'Uploading 50%' && p.getAttribute('aria-valuenow') === '50' && Math.abs(f.getBoundingClientRect().width - tr.getBoundingClientRect().width / 2) < 2 || f.style.width === '50%'; })()`));
  await ev(`(job.set('Working…', null), true)`);
  check('set(text, null): the fill slides, no value', await ev(`document.querySelector('.toast.progress').classList.contains('sliding') && !document.querySelector('.toast.progress').hasAttribute('aria-valuenow')`));
  await ev(`(Ayni.toast('info', '1'), Ayni.toast('info', '2'), Ayni.toast('info', '3'), true)`);
  check('progress does not count towards the 3', (await shown()).join() === 'Working…,1,2,3', await shown());
  await ev(`(document.querySelector('.toast.progress .stop').click(), document.querySelector('.toast.progress .stop').click(), true)`);
  check('Stop calls onStop once', (await ev('stops')) === 1, await ev('stops'));
  await ev(`(job.end(), true)`);
  check('end() takes it away', !(await ev(`!!document.querySelector('.toast.progress')`)));
  await ev(`(window.j2 = Ayni.progress('Quick'), j2.end(), true)`);
  await wait(700);
  check('a job that ends within 600 ms never shows', !(await ev(`!!document.querySelector('.toast.progress')`)));
  check('no errors or warnings in the notifications family', t.logs.length === 0, t.logs.slice());
  await reset();

  section('Dialogs family (base + buttons + notifications + dialogs)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/dialogs-only.html');
    check('a page with the dialogs family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const key = async (k, mods = 0) => {
      const code = { Escape: 27, Enter: 13 }[k] || 0;
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods });
      await wait(60);
    };
    const mouse = async (type, x, y) => t.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const click = async (x, y) => { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(60); };
    const clickEl = async (sel) => { const [x, y] = await ev(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`); await click(x, y); };
    const open = (id) => ev(`(document.getElementById('${id}').showModal(), new Promise((r) => setTimeout(() => r(true), 30)))`);
    const isOpen = (id) => ev(`document.getElementById('${id}').open`);
    const focused = () => ev(`document.activeElement.id || document.activeElement.tagName`);
    const closeAll = () => ev(`(document.querySelectorAll('dialog[open]').forEach((d) => d.close()), document.querySelectorAll('body > dialog.panel:not([id])').forEach((d) => d.remove()), L.length = 0, true)`);
    const built = (sel = '') => `document.querySelector('body > dialog.panel:not([id])[open] ${sel}')`;
    const SMALL = { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false };
    const size = (w, h = 900) => t.send('Emulation.setDeviceMetricsOverride', { ...SMALL, width: w, height: h });

    /* Opening and the first field */
    await clickEl('#opener'); await wait(60);
    check('data-open-dialog opens the dialog as modal', await ev(`document.getElementById('d-form').matches(':modal')`));
    check('the caret starts in the first field (the title row switch is skipped)', (await focused()) === 'form-name', await focused());
    check('…after the text it holds', await ev(`(() => { const i = document.getElementById('form-name'); return i.selectionStart === i.value.length && i.selectionEnd === i.value.length; })()`));
    await closeAll();
    await open('d-msg');
    check('a dialog with no field takes the focus itself, not a button', (await focused()) === 'd-msg', await focused());
    await closeAll();
    await open('d-auto');
    check('an element marked autofocus keeps the focus', (await focused()) === 'auto-2', await focused());
    await closeAll();
    await ev(`(document.getElementById('d-form').showModal(), document.getElementById('form-note').focus(), true)`); await wait(30);
    check('a focus the page set right after opening is kept', (await focused()) === 'form-note', await focused());
    await closeAll();
    await open('d-late');
    await ev(`(setTimeout(() => { document.getElementById('late-body').innerHTML = '<input class="input" id="late-in" aria-label="Late">'; }, 200), true)`); await wait(320);
    check('a field that comes after loading takes the focus when it shows up', (await focused()) === 'late-in', await focused());
    await closeAll();

    /* Closing */
    await open('d-form');
    await key('Escape');
    check('Esc presses the dialog\'s Close button (the page\'s handler runs) and closes it', (await ev('L.join()')) === 'form x' && !(await isOpen('d-form')), await ev('L.join()'));
    await closeAll(); await open('d-msg');
    await clickEl('#msg-x'); await wait(30);
    check('a click on Close closes the dialog', !(await isOpen('d-msg')));
    await open('d-msg');
    await ev(`(document.getElementById('msg-x').addEventListener('click', (e) => e.preventDefault(), { once: true }), true)`);
    await clickEl('#msg-x'); await wait(30);
    check('…unless its handler calls preventDefault()', await isOpen('d-msg'));
    await closeAll(); await open('d-msg');
    await ev(`(document.getElementById('msg-x').addEventListener('click', () => { const d = document.getElementById('d-msg'); d.close(); d.showModal(); }, { once: true }), true)`);
    await clickEl('#msg-x'); await wait(60);
    check('…and a page that closed it and opened it again keeps it open', await isOpen('d-msg'));
    await closeAll(); await open('d-bare');
    await key('Escape');
    check('Esc closes a dialog that has no Close button', !(await isOpen('d-bare')));
    await open('d-form'); await ev(`(document.getElementById('handled').focus(), true)`);
    await key('Escape');
    check('an Esc the page handled does not close the dialog', await isOpen('d-form'));
    await ev(`(document.getElementById('form-name').focus(), document.getElementById('form-pop').showPopover(), true)`); await wait(30);
    await key('Escape');
    check('an open popup takes the Esc first; the dialog stays', (await isOpen('d-form')) && !(await ev(`document.getElementById('form-pop').matches(':popover-open')`)));
    await open('d-msg');
    await key('Escape');
    check('nested: Esc closes only the innermost dialog', !(await isOpen('d-msg')) && (await isOpen('d-form')));
    await click(10, 10);
    check('a click on the dimmed page does not close the dialog', await isOpen('d-form'));
    await closeAll();

    /* Enter */
    await open('d-form');
    await key('Enter');
    check('Enter in a field runs the default button', (await ev('L.join()')) === 'form ok', await ev('L.join()'));
    await ev(`(L.length = 0, document.getElementById('form-note').focus(), true)`);
    await key('Enter');
    check('Enter in a text area does not', (await ev('L.join()')) === '');
    await closeAll();

    /* Built in code */
    await ev(`(window.R = 'pending', Ayni.confirm({ title: 'Go on?', body: 'a\\nb' }).then((v) => R = v), true)`); await wait(60);
    check('confirm: the text keeps its line break', await ev(`getComputedStyle(${built('.body > p.text')}).whiteSpace === 'pre-wrap'`));
    check('confirm: Cancel (data-close) then the default ✓ in the bottom row', await ev(`[...${built('footer')}.children].map((b) => (b.hasAttribute('data-close') ? 'x' : b.className)).join() === 'x,btn primary'`));
    await key('Enter');
    check('confirm: Enter answers true and the dialog leaves the page', (await ev('R')) === true && !(await ev(`!!document.querySelector('body > dialog.panel:not([id])')`)), await ev('R'));
    await ev(`(R = 'pending', Ayni.confirm({ title: 'Delete?', danger: true }).then((v) => R = v), true)`); await wait(60);
    check('confirm, danger: the focus starts on Cancel; Delete is no default', await ev(`document.activeElement.hasAttribute('data-close') && !${built('.btn.primary')}`));
    await key('Escape');
    check('confirm: Esc answers false', (await ev('R')) === false, await ev('R'));
    await ev(`(R = 'pending', Ayni.confirm({ title: 'Save?', other: 'Don\\'t save', otherIcon: 'trash' }).then((v) => R = v), true)`); await wait(60);
    await ev(`(${built('footer')}.children[1].click(), true)`); await wait(30);
    check('confirm: the third choice answers \'other\'', (await ev('R')) === 'other', await ev('R'));
    await ev(`(R = 'pending', Ayni.alert({ title: 'Done', body: 'Saved.' }).then(() => R = 'closed'), true)`); await wait(60);
    check('alert: a lone Close in the title row, no bottom row', await ev(`!!${built('> header > [data-close]')} && !${built('> footer')}`));
    await key('Escape');
    check('alert: Esc closes it', (await ev('R')) === 'closed');
    await ev(`(R = 'pending', Ayni.ask({ title: 'Rename', label: 'Name', value: 'old', check: (v) => (v === 'bad' ? false : v.toUpperCase()) }).then((v) => R = v), true)`); await wait(60);
    check('ask: the field starts focused with its text selected', await ev(`(() => { const i = document.activeElement; return i.tagName === 'INPUT' && i.selectionStart === 0 && i.selectionEnd === 3; })()`));
    check('ask: the label names the field', await ev(`document.activeElement.labels[0].textContent === 'Name'`));
    await ev(`(document.activeElement.value = '', document.activeElement.dispatchEvent(new Event('input')), true)`);
    check('ask: Accept is faded while the field is empty, and says why', await ev(`${built('.btn.primary')}.getAttribute('aria-disabled') === 'true' && ${built('.btn.primary')}.dataset.tip === 'OK: type something first'`), await ev(`${built('.btn.primary')}.dataset.tip`));
    await key('Enter');
    check('ask: Enter on an empty field does nothing', (await ev('R')) === 'pending');
    await t.send('Input.insertText', { text: 'bad' });
    await key('Enter');
    check('ask: check() false keeps it open, with the text selected', (await ev('R')) === 'pending' && await ev(`document.activeElement.selectionEnd - document.activeElement.selectionStart === 3`));
    await t.send('Input.insertText', { text: 'good' });
    check('ask: Accept is on once there is text', await ev(`${built('.btn.primary')}.getAttribute('aria-disabled') === 'false' && ${built('.btn.primary')}.dataset.tip === 'OK'`));
    await key('Enter');
    check('ask: Enter answers what check() returns', (await ev('R')) === 'GOOD', await ev('R'));
    await ev(`(R = 'pending', Ayni.ask({ title: 'x' }).then((v) => R = v), true)`); await wait(60);
    await key('Escape');
    check('ask: Esc answers null', (await ev('R')) === null);
    check('dialogButton: roles, icons and names', await ev(`(() => {
      const x = Ayni.dialogButton('close', 'Cancel'), p = Ayni.dialogButton('primary', 'Save'), d = Ayni.dialogButton('danger', 'Delete'), o = Ayni.dialogButton('', 'Copy', 'copy');
      return x.hasAttribute('data-close') && x.className === 'btn' && p.className === 'btn primary' && d.className === 'btn danger' && o.className === 'btn'
        && x.querySelector('[data-icon="close"]') && p.querySelector('[data-icon="check"]') && d.querySelector('[data-icon="trash"]') && o.querySelector('[data-icon="copy"]')
        && p.getAttribute('aria-label') === 'Save' && p.dataset.tip === 'Save' && x.type === 'button'; })()`));

    /* autoSave */
    await ev(`(() => { window.S = []; window.fail = false;
      const b = document.createElement('div'); b.id = 'as'; b.innerHTML = '<input type="checkbox" id="as-box"><input id="as-text"><p id="as-msg" hidden></p>'; document.body.append(b);
      window.box = Ayni.autoSave(document.getElementById('as-box'), (v) => (S.push('box ' + v), fail ? Promise.reject() : Promise.resolve()), { msg: document.getElementById('as-msg') });
      Ayni.autoSave(document.getElementById('as-text'), (v) => (S.push('text ' + v), Promise.resolve()), { wait: 200 });
      return true; })()`);
    await ev(`(document.getElementById('as-box').click(), true)`); await wait(30);
    check('autoSave: a switch saves on change', (await ev('S.join()')) === 'box true', await ev('S.join()'));
    await ev(`(fail = true, document.getElementById('as-box').click(), true)`); await wait(30);
    check('autoSave: a failed save puts the value back and says so', await ev(`document.getElementById('as-box').checked === true && !document.getElementById('as-msg').hidden && document.getElementById('as-msg').textContent === 'Could not save.'`));
    await ev(`(() => { const i = document.getElementById('as-text'); i.value = 'a'; i.dispatchEvent(new Event('input')); i.value = 'ab'; i.dispatchEvent(new Event('input')); return true; })()`);
    await wait(80);
    check('autoSave: typing waits', !(await ev(`S.some((x) => x.startsWith('text'))`)));
    await wait(250);
    check('autoSave: …then saves once, the last text', (await ev(`S.filter((x) => x.startsWith('text')).join()`)) === 'text ab', await ev('S.join()'));
    await ev(`(document.getElementById('as').remove(), true)`);

    /* Size and look */
    const box = (id) => ev(`(() => { const d = document.getElementById('${id}'); d.showModal(); const r = d.getBoundingClientRect(); const h = getComputedStyle(d.querySelector('header')).backgroundColor; d.close(); return { w: Math.round(r.width), h: Math.round(r.height), head: h }; })()`);
    let b = await box('d-msg');
    check('a small dialog is as wide as its content, 300 to 460 px', b.w >= 300 && b.w < 460, b);
    check('a floating dialog\'s title row is plain', b.head === 'rgba(0, 0, 0, 0)', b);
    b = await box('d-long');
    check('a long text stops a small dialog at 460 px', b.w === 460, b);
    b = await box('d-big');
    check('a big dialog is 880 x 640 from 1024 px', b.w === 880 && b.h === 640, b);
    await size(800);
    b = await box('d-big');
    check('a big dialog fills the screen below 1024 px, its title row a strip', b.w >= 780 && b.h === 900 && b.head !== 'rgba(0, 0, 0, 0)', b);
    b = await box('d-msg');
    check('a small dialog still floats below 1024 px', b.w < 460, b);
    await size(390, 700);
    b = await box('d-msg');
    check('on a phone a small dialog floats, the width less the margins at most', b.w <= 358 && b.h < 700, b);
    check('on a phone a line marks the bottom row', await ev(`(() => { const d = document.getElementById('d-form'); d.showModal(); const w = getComputedStyle(d.querySelector('footer')).borderTopWidth; d.close(); return w === '1px'; })()`));
    await size(1280);

    /* Moving */
    const head = async (id) => ev(`(() => { const r = document.querySelector('#${id} h2').getBoundingClientRect(); return [r.left + 4, r.top + r.height / 2]; })()`);
    const left = (id) => ev(`Math.round(document.getElementById('${id}').getBoundingClientRect().left)`);
    const dragFrom = async ([x, y], dx, dy) => { await mouse('mousePressed', x, y); for (let i = 1; i <= 5; i++) await mouse('mouseMoved', x + dx * i / 5, y + dy * i / 5); await mouse('mouseReleased', x + dx, y + dy); await wait(30); };
    await open('d-msg');
    let l0 = await left('d-msg');
    await dragFrom(await head('d-msg'), 100, 40);
    check('a floating dialog moves by its title row', (await left('d-msg')) - l0 === 100, (await left('d-msg')) - l0);
    l0 = await left('d-msg');
    await dragFrom(await ev(`(() => { const r = document.getElementById('msg-p').getBoundingClientRect(); return [r.left + 4, r.top + 4]; })()`), 80, 0);
    check('…not by its body', (await left('d-msg')) === l0);
    await dragFrom(await head('d-msg'), -3000, 0);
    check('…and stays inside the window', (await left('d-msg')) === 8, await left('d-msg'));
    await closeAll(); await open('d-msg');
    check('it opens centred again', Math.abs((await ev(`(() => { const r = document.getElementById('d-msg').getBoundingClientRect(); return r.left + r.width / 2 - document.documentElement.clientWidth / 2; })()`))) < 2);
    await closeAll();
    await size(600, 800); await open('d-msg');
    l0 = await left('d-msg');
    await dragFrom(await head('d-msg'), 60, 0);
    check('on a phone a dialog does not move', (await left('d-msg')) === l0);
    await closeAll(); await size(1280);

    /* What stays above a dialog */
    await ev(`(window.lifts = 0, Ayni.toast('info', 'News', { persist: true }), document.getElementById('ayni-toasts').addEventListener('toggle', (e) => { if (e.newState === 'open') lifts++; }), true)`); await wait(60);
    await open('d-msg'); await wait(60);
    check('the notifications are shown again over a dialog opened after them', (await ev('lifts')) >= 1 && await ev(`document.getElementById('ayni-toasts').matches(':popover-open')`), await ev('lifts'));
    await closeAll();
    await ev(`(() => { const l = document.createElement('dialog'); l.className = 'panel lock'; l.id = 'lock'; l.style.cssText = 'width: 100vw; max-width: none; height: 100vh; max-height: none';
      l.innerHTML = '<div class="body"><input class="input" id="lock-pw" aria-label="Password"></div>'; document.body.append(l); window.lockCloses = 0; l.addEventListener('close', () => lockCloses++); l.showModal(); return true; })()`); await wait(60);
    await open('d-msg'); await wait(60);
    const hit = (x, y) => ev(`!!document.elementFromPoint(${x}, ${y})?.closest('#lock')`);
    check('a lock screen stays above a dialog opened later', await hit(640, 450));
    await ev(`(Ayni.toast('info', 'While locked', { persist: true }), true)`); await wait(80);
    const tb = await ev(`(() => { const r = [...document.querySelectorAll('#ayni-toasts .toast')].at(-1).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    check('…and above a notification shown while locked', await hit(tb[0], tb[1]));
    await wait(60);
    check('…and the page never hears those re-shows as a close', (await ev('lockCloses')) === 0, await ev('lockCloses'));
    await ev(`(document.getElementById('lock').close(), document.getElementById('lock').remove(), Ayni.settleUndo(), document.querySelectorAll('#ayni-toasts > .toast').forEach((x) => x.remove()), true)`);
    await closeAll();

    /* Modeless */
    await ev(`(document.getElementById('d-modeless').show(), true)`); await wait(30);
    check('a modeless dialog opens with the caret in its field', (await focused()) === 'modeless-q');
    await key('Escape');
    check('Esc closes a modeless dialog too', !(await isOpen('d-modeless')));
    check('no errors or warnings in the dialogs family', t.logs.length === 0, t.logs.slice());
  }

  section('Menus family (base + buttons + notifications + dialogs + menus)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/menus-only.html');
    check('a page with the menus family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35, F10: 121 };
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods });
      await wait(60);
    };
    const mouse = (type, x, y, button = 'left') => t.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : button,
      buttons: type === 'mousePressed' ? (button === 'right' ? 2 : 1) : 0, clickCount: 1 });
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel, button = 'left') => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, button); await mouse('mouseReleased', x, y, button); await wait(80); };
    const hover = async (sel) => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await wait(120); };
    const isOpen = (id) => ev(`document.getElementById('${id}').matches(':popover-open')`);
    const focused = () => ev(`document.activeElement.id || document.activeElement.dataset.act || document.activeElement.tagName`);
    const log = () => ev(`L.join()`);
    const reset = () => ev(`(document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, document.getElementById('fld').focus(), true)`);
    const color = (v) => ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(${v})'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
    await reset();

    /* A menu in the page: opening with the mouse leaves the focus alone */
    check('a submenu moves inside its menu', (await ev(`document.getElementById('ms').parentElement.id`)) === 'mm');
    check('its item says it opens a menu', (await ev(`document.querySelector('#mm [data-act="more"]').getAttribute('aria-haspopup')`)) === 'menu');
    await click('#mb');
    check('a click on the button opens the menu', await isOpen('mm'));
    check('…and the focus stays in the field', (await focused()) === 'fld', await focused());
    check('every row gets the tick column (the menu has check items)', await ev(`[...document.querySelectorAll('#mm > [role^="menuitem"]')].every((b) => b.firstElementChild.classList.contains('tick'))`));
    check('a row without an icon keeps an empty slot after its tick', await ev(`!!document.querySelector('#mm [data-act="chk"] > .tick + .icon.none')`));
    check('the tick shows only on checked rows', (await ev(`[...document.querySelectorAll('#mm .tick')].filter((x) => getComputedStyle(x).visibility === 'visible').length`)) === 1);
    check('the submenu row shows its arrow', (await ev(`getComputedStyle(document.querySelector('#mm [data-act="more"]'), '::after').content`)) === '"›"');
    check('a disabled row still takes the pointer, so its tooltip says why', (await ev(`getComputedStyle(document.querySelector('#mm [data-act="nope"]')).pointerEvents`)) !== 'none');
    check('rows are compact with a mouse', (await ev(`document.querySelector('#mm [data-act="a"]').getBoundingClientRect().height`)) < 40);
    await hover('#mm [data-act="a"]');
    const bg = await ev(`getComputedStyle(document.querySelector('#mm [data-act="a"]')).backgroundColor`), acc = await color('--accent');
    check('hover is a grey tint, never Accent', bg !== 'rgba(0, 0, 0, 0)' && !bg.includes(acc.slice(4, -1)), bg);
    await click('#mm [data-act="nope"]');
    check('a click on a disabled row does nothing', (await isOpen('mm')) && (await log()) === '');
    await click('#mm [data-act="chk"]');
    check('a check item flips and reports', (await ev(`document.querySelector('#mm [data-act="chk"]').getAttribute('aria-checked')`)) === 'true' && (await log()) === 'action chk @Main menu', await log());
    check('…and the menu closes; the focus is still in the field', !(await isOpen('mm')) && (await focused()) === 'fld');
    await ev('(L.length = 0, true)');
    await click('#mb'); await click('#mm [data-act="r2"]');
    check('a radio item moves the choice and fires ayni:choose', (await ev(`[...document.querySelectorAll('#mm [role="menuitemradio"]')].map((b) => b.getAttribute('aria-checked')).join()`)) === 'false,true' && (await log()).startsWith('choose r2'), await log());
    await reset();

    /* Submenus */
    await click('#mb'); await hover('#mm [data-act="more"]');
    check('resting on a submenu item opens it; its menu stays open', (await isOpen('ms')) && (await isOpen('mm')));
    check('the submenu sits at the right of its row', await ev(`document.getElementById('ms').getBoundingClientRect().left >= document.querySelector('#mm [data-act="more"]').getBoundingClientRect().right - 4`));
    check('its row says it is expanded', (await ev(`document.querySelector('#mm [data-act="more"]').getAttribute('aria-expanded')`)) === 'true');
    await hover('#mm [data-act="a"]');
    check('resting on another item closes it', !(await isOpen('ms')) && (await isOpen('mm')));
    await click('#mm [data-act="more"]');
    check('a click on the item opens it too', await isOpen('ms'));
    await click('#ms [data-act="s2"]');
    check('a pick in the submenu reports once, with the submenu\'s name', (await log()) === 'action s2 @Sub menu', await log());
    check('…and both close', !(await isOpen('mm')) && !(await isOpen('ms')));
    await reset();

    /* The keyboard */
    await ev(`document.getElementById('mb').focus(), true`); await key('Enter'); await wait(60);
    check('opened from the keyboard, the first item takes the focus', (await focused()) === 'a', await focused());
    await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown');
    check('the arrows skip a disabled item', (await focused()) === 'more', await focused());
    await key('ArrowRight'); await wait(60);
    check('Right opens the submenu, its first item focused', (await isOpen('ms')) && (await focused()) === 's1');
    await key('ArrowLeft'); await wait(60);
    check('Left closes it, the focus back on its item', !(await isOpen('ms')) && (await focused()) === 'more');
    await key('ArrowRight'); await key('Escape'); await wait(60);
    check('Esc closes only the submenu', !(await isOpen('ms')) && (await isOpen('mm')));
    await key('Home');
    check('Home goes to the first item', (await focused()) === 'a');
    await key('ArrowUp');
    check('Up from the first wraps to the last', (await focused()) === 'more');
    await key('Tab'); await wait(60);
    check('Tab closes the menu; the focus goes back to its button', !(await isOpen('mm')) && (await focused()) === 'mb', await focused());
    await reset();
    await click('#mb'); await key('ArrowDown');
    check('Down moves into a menu the mouse opened', (await focused()) === 'a', await focused());
    await reset();

    /* The menu bar */
    await key('F10');
    check('F10 focuses the menu bar', (await ev(`document.activeElement.textContent`)) === 'File');
    await key('ArrowRight');
    check('Right moves along the bar', (await ev(`document.activeElement.textContent`)) === 'View');
    await key('ArrowDown'); await wait(60);
    check('Down opens its menu, first item focused', (await isOpen('m-view')) && (await focused()) === 'zoom');
    await key('ArrowLeft'); await wait(60);
    check('Left switches to the menu before it', (await isOpen('m-file')) && !(await isOpen('m-view')));
    await reset();
    await click('#bar [popovertarget="m-file"]');
    check('a click on the bar opens a menu; the focus stays in the field', (await isOpen('m-file')) && (await focused()) === 'fld');
    await hover('#bar [popovertarget="m-view"]');
    check('moving along the bar switches the open menu', (await isOpen('m-view')) && !(await isOpen('m-file')));
    await reset();

    /* Menus built in code */
    await ev(`(window.closes = 0, Ayni.menuAt(items(), { anchor: document.getElementById('anc'), onClose: () => closes++ }), true)`); await wait(60);
    const rows = await ev(`[...document.querySelectorAll('#ayni-menu > *')].map((e) => e.getAttribute('role') || e.className).join()`);
    check('Ayni.menuAt builds rows, separators and captions, and drops a separator at the end', rows === 'menuitem,separator,caption,menuitemcheckbox,menuitem,menuitem,menuitem,menu', rows);
    check('…the shortcut, in words', (await ev(`document.querySelector('#ayni-menu kbd').textContent`)) === 'Ctrl+X');
    check('…a disabled row with its why as tooltip', (await ev(`(() => { const b = document.querySelector('#ayni-menu [data-act="off"]'); return b.getAttribute('aria-disabled') + '|' + b.dataset.tip; })()`)) === 'true|Off: not now');
    check('…a danger row in the Danger colour', (await ev(`getComputedStyle(document.querySelector('#ayni-menu [data-act="del"]')).color`)) === (await color('--danger')));
    check('…the button says its menu is open', (await ev(`document.getElementById('anc').getAttribute('aria-expanded')`)) === 'true');
    check('…and the focus stays in the field', (await focused()) === 'fld');
    await click('#ayni-menu [data-act="font"]');
    check('a submenu from a function, filled when it opens', (await ev(`[...document.querySelectorAll('#ayni-menu-sub [role^="menuitem"]')].map((b) => b.textContent).join()`)) === 'Serif,Sans');
    await click('#ayni-menu-sub [data-act="sans"]'); await wait(60);
    check('an item runs after the menu has closed', (await log()).endsWith('sans') && !(await isOpen('ayni-menu')), await log());
    check('…onClose ran and the button says closed', (await ev(`closes + '|' + document.getElementById('anc').getAttribute('aria-expanded')`)) === '1|false');
    await reset();
    await ev(`(Ayni.menuAt(items(), { x: 300, y: 200 }), true)`); await wait(60);
    check('Ayni.menuAt at a point', (await ev(`(() => { const r = document.getElementById('ayni-menu').getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); })()`)) === '300,200');
    await ev(`(dispatchEvent(new Event('blur')), true)`); await wait(60);
    check('the window losing the focus closes it', !(await isOpen('ayni-menu')));
    await ev(`(Ayni.menuAt(items(), { x: 300, y: 200 }), true)`); await wait(400);
    await ev(`scrollBy(0, 40)`); await wait(100);
    check('a page scroll closes it', !(await isOpen('ayni-menu')));
    await ev(`scrollTo(0, 0)`); await reset();
    await ev(`(() => { const b = document.getElementById('anc'); b.style.cssText = 'position: fixed; right: 20px; top: 20px'; return true; })()`);
    await ev(`(Ayni.menuAt(items(), { anchor: document.getElementById('anc') }), true)`); await wait(60);
    check('under a button in the right half, the menu ends where the button ends', await ev(`Math.abs(document.getElementById('ayni-menu').getBoundingClientRect().right - document.getElementById('anc').getBoundingClientRect().right) < 1.5`));
    await ev(`(document.getElementById('anc').style.cssText = '', true)`); await reset();
    check('Ayni.keyLabel', (await ev(`[Ayni.keyLabel('Ctrl+C'), Ayni.keyLabel(['Shift+Del', 'x']), Ayni.keyLabel('F2'), Ayni.keyLabel('Esc')].join('|')`)) === (await ev('Ayni.isMac')) ? '⌘C|⇧Del|F2|Esc' : 'Ctrl+C|Shift+Del|F2|Esc');
    await ev(`Ayni.i18n.setLang('de')`); await wait(150);
    check('…in the page\'s language', (await ev(`Ayni.keyLabel('Ctrl+Del')`)) === (await ev('Ayni.isMac') ? '⌘Entf' : 'Strg+Entf'), await ev(`Ayni.keyLabel('Ctrl+Del')`));
    await ev(`Ayni.i18n.setLang('en')`); await wait(150);

    /* Pop-up menu and long tap */
    await click('#ctx', 'right'); await wait(60);
    check('a right-click opens the pop-up menu at the pointer', (await isOpen('mctx')) && await ev(`(() => { const m = document.getElementById('mctx').getBoundingClientRect(), a = document.getElementById('ctx').getBoundingClientRect(); return Math.abs(m.left - (a.left + a.width / 2)) < 2; })()`));
    await click('#mctx [data-act="copy"]');
    check('…and names the thing it was opened on', (await log()) === 'action copy @Area', await log());
    await reset();
    await ev(`document.getElementById('ctx').focus(), true`); await key('F10', 8); await wait(60);
    check('Shift+F10 opens it from the keyboard, first item focused', (await isOpen('mctx')) && (await focused()) === 'copy');
    await reset();
    await ev(`(Ayni.setTouchPreview(true), true)`);
    const [lx, ly] = await mid('#lt .row');
    await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lx, y: ly }] }); await wait(250);
    check('long tap: nothing before the hold time; the ring fills', (await log()) === '' && await ev(`!!document.querySelector('.hold-ring')`));
    await wait(400);
    check('long tap: it acts while the finger is still down', (await log()) === 'hold One', await log());
    await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(100);
    check('long tap: the click its release leaves is swallowed', (await log()) === 'hold One', await log());
    await ev('(L.length = 0, true)');
    await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lx, y: ly }] }); await wait(150);
    await t.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: lx, y: ly + 30 }] }); await wait(500);
    await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(80);
    check('long tap: moving the finger cancels it', !(await log()).includes('hold'), await log());
    await ev(`(Ayni.menuAt(items(), { x: 100, y: 100 }), true)`); await wait(60);
    check('touch: menu rows are 44 px high and hide their shortcuts', await ev(`document.querySelector('#ayni-menu [data-act="cut"]').getBoundingClientRect().height >= 44 && getComputedStyle(document.querySelector('#ayni-menu kbd')).display === 'none'`));
    await reset();
    await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: false });
    await ev(`(Ayni.menuAt(items(), { anchor: document.getElementById('anc') }), true)`); await wait(60);
    await click('#ayni-menu [data-act="font"]');
    check('on a phone a submenu opens below its item, which stays in sight', await ev(`(() => { const s = document.getElementById('ayni-menu-sub').getBoundingClientRect(), r = document.querySelector('#ayni-menu [data-act="font"]').getBoundingClientRect(); return s.top >= r.bottom - 1 && s.right <= innerWidth; })()`));
    await reset(); await ev(`(Ayni.setTouchPreview(false), true)`);
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    /* Tool group and popup with controls */
    check('a tool group button is off while its toggle is off', (await ev(`document.getElementById('gb').getAttribute('aria-pressed')`)) === 'false');
    await ev(`(document.getElementById('w1').setAttribute('aria-pressed', 'true'), true)`); await wait(30);
    check('…and lights up when the toggle inside is on (data-lit-by)', (await ev(`document.getElementById('gb').getAttribute('aria-pressed')`)) === 'true');
    await click('#gb');
    check('the tool group opens; the focus stays in the field', (await isOpen('gp')) && (await focused()) === 'fld');
    check('…its button says it is expanded', (await ev(`document.getElementById('gb').getAttribute('aria-expanded')`)) === 'true');
    await click('#w2');
    check('a tool press closes the group; the focus is still in the field', !(await isOpen('gp')) && (await focused()) === 'fld');
    await click('#cb');
    check('a popup with controls puts the focus in its first control', (await isOpen('cp')) && (await focused()) === 'cp-in');
    await key('Escape');
    check('Esc closes it, the focus back on its button', !(await isOpen('cp')) && (await focused()) === 'cb');
    await reset();

    /* Toolbars */
    check('every toolbar is one Tab stop (a field inside keeps its own)', (await ev(`[...document.querySelectorAll('#rt button')].map((b) => b.tabIndex).join()`)) === '0,-1,-1,0');
    await ev(`(document.querySelector('#rt .tb-group').insertAdjacentHTML('beforeend', '<button class="btn" id="r0">0</button>'), true)`); await wait(30);
    check('a tool added later is not a Tab stop', (await ev(`document.getElementById('r0').tabIndex`)) === -1);
    await ev(`(document.getElementById('r1').hidden = true, true)`); await wait(30);
    check('the Tab stop moves off a hidden tool', (await ev(`document.getElementById('r2').tabIndex`)) === 0);
    await ev(`(document.getElementById('r2').focus(), true)`); await key('ArrowRight');
    check('Right moves to the next tool, which becomes the Tab stop', (await focused()) === 'r0' && (await ev(`document.getElementById('r2').tabIndex`)) === -1);
    await key('End');
    check('End goes to the last tool, past the field', (await focused()) === 'r3');
    await ev(`(document.getElementById('r1').hidden = false, document.getElementById('r0').remove(), true)`);
    check('a line is drawn between two groups', (await ev(`getComputedStyle(document.querySelector('#rt .tb-group:last-child'), '::before').width`)) === '1px');
    check('a toolbar on its own is a strip; in a title row it sits plain', (await ev(`getComputedStyle(document.getElementById('rt')).borderTopStyle`)) !== 'none'
      && (await ev(`getComputedStyle(document.querySelector('#hd [role="toolbar"]')).borderTopStyle`)) === 'none');

    /* A title row that fits */
    check('a wide title row: every tool shows; More only for the app\'s own items', (await ev(`document.querySelectorAll('#hd .fit-out').length + '|' + !fb.button.hidden`)) === '0|true');
    check('More is made at the start of the system group', await ev(`fb.button.parentElement.matches('.tb-group.tb-sys') && fb.button === fb.button.parentElement.firstElementChild`));
    /* Narrow the row until Alpha (rank 22) has left */
    await ev(`new Promise((r) => { const h = document.getElementById('hd'); let w = 700; const step = () => { if (document.getElementById('h-a').classList.contains('fit-out') || w < 200) return r(w); h.style.width = (w -= 10) + 'px'; requestAnimationFrame(() => requestAnimationFrame(step)); }; step(); })`); await wait(100);
    const outs = await ev(`[...document.querySelectorAll('#hd .fit-out')].map((e) => e.id).join()`);
    check('a narrow row: the highest ranks leave first; search stays', outs === 'h-a,h-b,h-c', outs);
    const its = await ev(`fb.items().map((i) => i.sep ? '-' : i.label + (i.checked ? '*' : '')).join()`);
    check('More lists them in toolbar order (a toggle as a check item), then the app\'s own', its === 'Alpha,Beta,Gamma*,-,Own item', its);
    await click('#hd .fit-more');
    check('More opens its menu', await isOpen('ayni-menu'));
    await click('#hd .fit-more'); await wait(60);
    check('a second press on More closes it (it does not open again)', !(await isOpen('ayni-menu')));
    await click('#hd .fit-more'); await click('#ayni-menu [data-act="h-a"]'); await wait(60);
    check('a tool run from More comes back to the row while in use', !(await ev(`document.getElementById('h-a').classList.contains('fit-out')`)));
    await click('#fld'); await wait(80);
    check('…and leaves again on the next press elsewhere', await ev(`document.getElementById('h-a').classList.contains('fit-out')`));
    await ev(`(document.getElementById('hd').style.width = '230px', document.getElementById('hd').classList.add('has-selection'), true)`); await wait(150);
    check('while picking, search may leave too', await ev(`document.getElementById('h-search').classList.contains('fit-out')`));
    await ev(`(document.getElementById('hd').style.width = '700px', document.getElementById('hd').classList.remove('has-selection'), true)`); await wait(150);
    check('a wide row again: all come back', (await ev(`document.querySelectorAll('#hd .fit-out').length`)) === 0);
    await reset();

    /* Above dialogs */
    await click('#open-dlg'); await click('#dlg-menu');
    check('a menu opened from inside a modal dialog shows above it', (await isOpen('ayni-menu')) && await ev(`(() => { const r = document.querySelector('#ayni-menu [data-act="cut"]').getBoundingClientRect(); return document.elementFromPoint(r.left + 20, r.top + r.height / 2)?.closest('[data-act]')?.dataset.act === 'cut'; })()`));
    await click('#ayni-menu [data-act="cut"]'); await wait(60);
    check('…and its items can be picked; the dialog stays open', (await log()).endsWith('cut') && await ev(`document.getElementById('dlg').open`), await log());
    await reset();
    check('…and back in the page once no dialog is open', await ev(`(Ayni.menuAt(items(), { x: 100, y: 100 }), document.getElementById('ayni-menu').parentElement === document.body)`));
    await reset();
    await click('#mb');
    await ev(`(() => { const l = document.createElement('dialog'); l.className = 'panel lock'; l.id = 'lock'; l.innerHTML = '<div class="body">Locked</div>'; document.body.append(l); l.showModal(); return true; })()`); await wait(60);
    check('an open menu closes when a lock screen shows', !(await isOpen('mm')));
    await ev(`(document.getElementById('lock').close(), document.getElementById('lock').remove(), true)`); await reset();
    check('no untranslated keys in the menus family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the menus family', t.logs.length === 0, t.logs.slice());
  }

  section('Desktop page');
  t.logs.length = 0;
  await t.open(BASE + '/gallery/desktop.html');
  check('desktop.html loads with no errors or warnings', t.logs.length === 0, t.logs.slice());
  check('desktop.html: no untranslated keys', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
} catch (e) {
  failed.push('the run stopped: ' + e.message);
  console.error(e);
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) { console.log('\nFAILED:\n- ' + failed.join('\n- ')); await quit(1); }
console.log('ALL GREEN');
await quit(0);
